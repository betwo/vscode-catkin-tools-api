import * as vscode from 'vscode';
import * as fs from 'fs';
import { SourceFileConfiguration } from 'vscode-cpptools';
import { TestSuiteInfo, TestInfo } from 'vscode-test-adapter-api';

export const vscodeCatkinToolsExtensionId = 'betwo.catkin-tools';

export const VERSION = "1.1.0";

export interface API {
    reload(): Promise<void>;

    registerWorkspace(context: vscode.ExtensionContext,
        root: vscode.WorkspaceFolder,
        output_channel: vscode.OutputChannel): Promise<void>;
    unregisterWorkspace(context: vscode.ExtensionContext,
        root: vscode.WorkspaceFolder): Promise<void>;

    getWorkspace(workspace_folder: vscode.WorkspaceFolder): IWorkspace;
    getWorkspaceManager(): IWorkspaceManager;
    getWorkspaces(): Map<vscode.WorkspaceFolder, IWorkspace>;

    registerTestParser(parser: ITestParser): vscode.Disposable;
    unregisterTestParser(parser: ITestParser): void;
}

export interface IWorkspace {
    system_include_browse_paths: string[];
    default_system_include_paths: string[];

    workspace_provider: WorkspaceProvider;

    packages: Map<string, IPackage>;


    onWorkspaceInitialized: vscode.EventEmitter<boolean>;
    onTestsSetChanged: vscode.EventEmitter<boolean>;

    isInitialized(): boolean;
    reload(): Promise<IWorkspace>;
    loadPackage(package_xml: fs.PathLike): void;
    loadPackageTests(workspace_package: IPackage,
        outline_only: boolean,
        build_dir?: String,
        devel_dir?: String):
        Promise<WorkspaceTestSuite>
    locatePackageXML(package_name: String): void;
    buildDependencyGraph(): void;
    iteratePossibleSourceFiles(
        file: vscode.Uri,
        async_filter: (uri: vscode.Uri) => Promise<boolean>
    ): void
    iterateDependentPackages(
        workspace_package: IPackage,
        resursive_search: boolean,
        async_filter: (workspace_package: IPackage) => Promise<boolean>
    ): Promise<boolean>;
    getSourceFileConfiguration(commands): SourceFileConfiguration;
    getPackageContaining(file: vscode.Uri): IPackage;
    collectCompileCommands(): void;

    getRootPath(): Promise<fs.PathLike>;
    getBuildDir(): Promise<fs.PathLike>;
    getDevelDir(): Promise<fs.PathLike>;
    getInstallDir(): Promise<fs.PathLike>;

    getName(): Promise<string>;
    getSetupShell(): Promise<string>;
    makeCommand(payload: string): Promise<string>;

    runTest(id: string): Promise<TestRunResult>;
}

export type TestType = "unknown" | "gtest" | "generic" | "suite";

export class TestRunReloadRequest {
    test: WorkspaceTestSuite;
    dom?;
    output?: string;
}
export class TestRunResult {
    constructor(public success: boolean,
        public repeat_tests?: vscode.TestItem[],
        public reload_packages?: TestRunReloadRequest[]
    ) {
        if (this.repeat_tests === undefined) {
            this.repeat_tests = [];
        }
        if (this.reload_packages === undefined) {
            this.reload_packages = [];
        }
    }

    public merge(other: TestRunResult) {
        this.repeat_tests = this.repeat_tests.concat(other.repeat_tests);
        this.reload_packages = this.reload_packages.concat(other.reload_packages);
    }
}

export interface IPackage {
    package_xml_path: fs.PathLike;
    workspace: IWorkspace;
    build_space?: fs.PathLike;
    name: string;
    dependencies: string[];
    dependees: string[];
    package_xml: any;
    has_tests: boolean;
    tests_loaded: boolean;
    path: string;
    relative_path: fs.PathLike;
    absolute_path: fs.PathLike;
    cmakelists_path: string;

    package_test_suite: WorkspaceTestSuite;

    getName(): string;
    getAbsolutePath(): fs.PathLike;
    getRelativePath(): Promise<fs.PathLike>;
    getWorkspacePath(src_dir: string): Promise<string[]>;
    containsFile(file: vscode.Uri): boolean;
    isBuilt(build_dir: string): boolean;
    iteratePossibleSourceFiles(
        header_file: vscode.Uri,
        async_filter: (uri: vscode.Uri) => Promise<boolean>)
        : Promise<boolean>;
    loadTests(build_dir: String, devel_dir: String, outline_only: boolean): Promise<WorkspaceTestSuite>;

}

export interface IWorkspaceManager {
    onWorkspacesChanged: vscode.EventEmitter<void>;

    initialize(): Promise<void>;

    getWorkspace(workspace_folder: vscode.WorkspaceFolder): IWorkspace;
    reloadCompileCommands(): void;
    reloadAllWorkspaces(): void;
    selectWorkspace(): Promise<IWorkspace>;
    switchProfile(): void;

    registerWorkspace(context: vscode.ExtensionContext,
        root: vscode.WorkspaceFolder,
        output_channel: vscode.OutputChannel): Promise<void>;
    unregisterWorkspace(context: vscode.ExtensionContext,
        root: vscode.WorkspaceFolder): Promise<void>;

}

export interface WorkspaceProvider {
    getWorkspaceType(): string;

    getCodeWorkspace(): vscode.WorkspaceFolder;

    getRootPath(): Promise<fs.PathLike>;

    getSrcDir(): Promise<string>;
    getBuildDir(): Promise<string>;
    getDevelDir(): Promise<string>;
    getInstallDir(): Promise<string>;

    getDefaultRosWorkspace(): Promise<string>;

    getCmakeArguments(): Promise<string>;

    checkProfile(): Promise<void>;
    getProfiles(): Promise<string[]>;
    getActiveProfile(): Promise<string>;
    switchProfile(profile: string): Promise<boolean>;

    getBuildTask(): Promise<vscode.Task>;
    getBuildTestsTask(): Promise<vscode.Task>;
    getCleanTask(): Promise<vscode.Task>;

    reload(): Promise<void>;

    isInitialized(): Promise<boolean>;
    initialize(extending: fs.PathLike[]): Promise<boolean>;
    enableCompileCommandsGeneration(): Promise<boolean>;

    getDefaultRunTestTarget(): string;
    makePackageBuildCommand(package_name: string): string;
    makeRosSourcecommand(): string;
}

export interface IBuildTarget {
    cmake_target: string;
    exec_path: string;
    type: TestType;
}


export class WorkspaceTestInterface {
    public package: IPackage;

    public type: TestType;
    public filter: String;
    public executable?: fs.PathLike;

    public build_space: fs.PathLike;
    public build_target: String;
    public global_build_dir: String;
    public global_devel_dir: String;

    public info: TestInfo | TestSuiteInfo;
}

export class WorkspaceTestCase extends WorkspaceTestInterface {
    public info: TestInfo;
}

export class WorkspaceTestFixture extends WorkspaceTestInterface {
    public cases: WorkspaceTestCase[];
    public info: TestSuiteInfo;
}
export class WorkspaceTestExecutable extends WorkspaceTestInterface {
    public fixtures: WorkspaceTestFixture[];
    public info: TestSuiteInfo;
}

export class WorkspaceTestSuite extends WorkspaceTestInterface {
    public executables: WorkspaceTestExecutable[];
    public info: TestSuiteInfo | TestInfo;

    public test_build_targets: IBuildTarget[];
}


export class TestFixture {
    constructor(
        public name: string,
        public line: number,
        public test_cases: TestCase[] = [],
    ) { }

    public getTestCase(name: string): TestCase {
        for (const test_case of this.test_cases) {
            if (test_case.name === name) {
                return test_case;
            }
        }
    }
}

export class TestCase {
    constructor(
        public name: string,
        public line: number,
    ) { }
}

export class TestSource {
    constructor(
        public package_relative_file_path: fs.PathLike,
        public test_fixtures: TestFixture[] = [],
    ) { }

    public getFixture(name: string): TestFixture {
        for (const test_fixture of this.test_fixtures) {
            if (test_fixture.name === name) {
                return test_fixture;
            }
        }
    }

    public getFixtures(): TestFixture[] {
        return this.test_fixtures;
    }

    public getTestCase(fixture_name: string, test_case_name: string): [TestCase, TestFixture] {
        for (const test_fixture of this.test_fixtures) {
            if (test_fixture.name === fixture_name) {
                return [test_fixture.getTestCase(test_case_name), test_fixture];
            }
        }

        return [undefined, undefined];
    }
}

export class TestSuite {
    constructor(
        public targets: TestBuildTarget[],
    ) { }

    public getBuildTarget(name: string): TestBuildTarget {
        for (const gtest_build_target of this.targets) {
            if (gtest_build_target.name === name) {
                return gtest_build_target;
            }
        }

    }

    public getFixture(name: string): [TestFixture, TestSource, TestBuildTarget] {
        for (const gtest_build_target of this.targets) {
            const [fixture, test_source] = gtest_build_target.getFixture(name);
            if (fixture) {
                return [fixture, test_source, gtest_build_target];
            }
        }

        return [undefined, undefined, undefined];
    }

    public getFixtures(): TestFixture[] {
        let fixtures = [];
        for (const gtest_build_target of this.targets) {
            fixtures = fixtures.concat(gtest_build_target.getFixtures());
        }
        return fixtures;
    }

    public getTestCase(fixture_name: string, test_case_name: string): [TestCase, TestFixture, TestSource, TestBuildTarget] {
        for (const gtest_build_target of this.targets) {
            const [test_case, fixture, test_source] = gtest_build_target.getTestCase(fixture_name, test_case_name);
            if (test_case) {
                return [test_case, fixture, test_source, gtest_build_target];
            }
        }

        return [undefined, undefined, undefined, undefined];
    }
}
export class TestBuildTarget {
    constructor(
        public name: string,
        public package_relative_file_path: fs.PathLike,
        public line: number,
        public test_sources: TestSource[] = [],
    ) { }

    public getFixture(name: string): [TestFixture, TestSource] {
        for (const test_source of this.test_sources) {
            const fixture = test_source.getFixture(name);
            if (fixture) {
                return [fixture, test_source];
            }
        }

        return [undefined, undefined];
    }

    public getFixtures(): TestFixture[] {
        let fixtures = [];
        for (const test_source of this.test_sources) {
            fixtures = fixtures.concat(test_source.getFixtures());
        }
        return fixtures;
    }

    public getTestCase(fixture_name: string, test_case_name: string): [TestCase, TestFixture, TestSource] {
        for (const test_source of this.test_sources) {
            const [test_case, fixture] = test_source.getTestCase(fixture_name, test_case_name);
            if (test_case) {
                return [test_case, fixture, test_source];
            }
        }

        return [undefined, undefined, undefined];
    }
}

export interface ITestParser {
    matches(json_object: any): boolean;
    analyzeSourceFile(source_file: fs.PathLike): Promise<TestFixture[]>;
}