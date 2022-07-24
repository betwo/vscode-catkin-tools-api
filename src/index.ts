import * as vscode from 'vscode';
import * as fs from 'fs';
import { SourceFileConfiguration } from 'vscode-cpptools';

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
        build_dir?: fs.PathLike,
        devel_dir?: fs.PathLike):
        Promise<void>;
    locatePackageXML(package_name: String): void;
    buildDependencyGraph(): void;
    iteratePossibleSourceFiles(
        file: vscode.Uri,
        async_filter: (uri: vscode.Uri) => Promise<boolean>
    ): void;
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

    runTest(id: string, test_run: vscode.TestRun): Promise<WorkspaceTestReport>;
}

export type TestType = "unknown" | "gtest" | "generic" | "suite";

export enum WorkspaceTestRunReportKind {
    BuildFailed,
    TestFailed,
    TestSucceeded
}
export class WorkspaceTestRunReport {
    public constructor(
        public state: WorkspaceTestRunReportKind,
        public message?: vscode.TestMessage,
        public error?: Error) {
        if (message === undefined) {
            this.message = new vscode.TestMessage("");
        }
    }

    public succeeded(): boolean {
        return this.state === WorkspaceTestRunReportKind.TestSucceeded;
    }
}

export class WorkspaceTestReport {
    public entries = new Map<vscode.TestItem, WorkspaceTestRunReport>();
    constructor(public success: boolean) {
    }

    public succeeded(): boolean {
        for (const entry of this.entries) {
            if (!entry[1].succeeded()) {
                return false;
            }
        }
        return true;
    }
}

export interface IPackage {
    package_xml_path: fs.PathLike;
    workspace: IWorkspace;
    current_build_space?: fs.PathLike;
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

    package_test_suite: WorkspaceTestInterface;

    onTestSuiteModified: vscode.EventEmitter<void>;
    // onTestAdded: vscode.EventEmitter<WorkspaceTestInterface>;
    // onTestRemoved: vscode.EventEmitter<WorkspaceTestInterface>;

    getName(): string;
    getAbsolutePath(): fs.PathLike;
    getRelativePath(): Promise<fs.PathLike>;
    getWorkspacePath(src_dir: string): Promise<string[]>;
    containsFile(file: vscode.Uri): boolean;
    isBuilt(build_dir: fs.PathLike): boolean;
    iteratePossibleSourceFiles(
        header_file: vscode.Uri,
        async_filter: (uri: vscode.Uri) => Promise<boolean>)
        : Promise<boolean>;
    loadTests(build_dir: fs.PathLike, devel_dir: fs.PathLike, query_for_cases: boolean): Promise<WorkspaceTestInterface[]>;
}

export interface IWorkspaceManager {
    onWorkspacesChanged: vscode.EventEmitter<void>;

    initialize(): Promise<void>;

    getWorkspace(workspace_folder: vscode.WorkspaceFolder): IWorkspace;
    reloadCompileCommands(): void;
    reloadAllWorkspaces(): void;
    selectWorkspace(): Promise<IWorkspace>;
    switchProfile(): void;
    buildTestItem(test_item: vscode.TestItem): Promise<boolean>;
    reloadTestItem(test_item: vscode.TestItem): Promise<boolean>;

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

    getDefaultRunTestTargetName(): string;
    makePackageBuildCommand(package_name: string): string;
    makeRosSourcecommand(): string;
}

export interface IBuildTarget {
    cmake_target: string;
    label: string;
    exec_path: string;
    type: TestType;
}

export class WorkspaceTestIdentifierTemplate {
    public constructor(
        public prefix: string,
        public fixture?: string,
        public test?: string
    ) { }

    public evaluate(params: WorkspaceTestParameters): string {
        let full_id = this.prefix;
        if (this.fixture !== undefined) {
            let fixture_str = this.fixture;
            if (params?.fixture?.instance !== undefined) {
                fixture_str = `${params?.fixture?.instance}/${fixture_str}`;
            }
            if (params?.fixture?.generator !== undefined) {
                fixture_str = `${fixture_str}/${params?.fixture?.generator}`;
            }
            full_id = `${full_id}_${fixture_str}`;
        }
        if (this.test !== undefined) {
            let test_str = this.test;
            if (params?.generator !== undefined) {
                test_str = `${test_str}/${params?.generator}`;
            }
            full_id = `${full_id}_${test_str}`;
        }
        return full_id;
    }
}


export class WorkspaceTestParameters {
    fixture?: WorkspaceFixtureParameters;
    instance?: string;
    generator?: string;
    description?: string;
}
export class WorkspaceFixtureParameters {
    instance?: string;
    generator?: string;
    description?: string;
}

export function isTemplateEqual(lhs: WorkspaceTestIdentifierTemplate, rhs: WorkspaceTestIdentifierTemplate): boolean {
    if (lhs.prefix !== rhs.prefix) {
        return false;
    }

    if (lhs.fixture === undefined) {
        if (rhs.fixture !== undefined) {
            return false;
        }
    } else {
        if (lhs.fixture !== rhs.fixture) {
            return false;
        }
    }

    if (lhs.test === undefined) {
        if (rhs.test !== undefined) {
            return false;
        }
    } else {
        if (lhs.test !== rhs.test) {
            return false;
        }
    }

    return true;
}

export function areFixtureParametersEqual(lhs: WorkspaceFixtureParameters, rhs: WorkspaceFixtureParameters): boolean {
    if (lhs.instance === undefined) {
        if (rhs.instance !== undefined) {
            return false;
        }
    } else {
        if (lhs.instance !== rhs.instance) {
            return false;
        }
    }
    if (lhs.generator === undefined) {
        if (rhs.generator !== undefined) {
            return false;
        }
    } else {
        if (lhs.generator !== rhs.generator) {
            return false;
        }
    }
    return true;
}


export function areTestParametersEqual(lhs: WorkspaceTestParameters, rhs: WorkspaceTestParameters): boolean {
    if (lhs.instance === undefined) {
        if (rhs.instance !== undefined) {
            return false;
        }
    } else {
        if (lhs.instance !== rhs.instance) {
            return false;
        }
    }
    if (lhs.generator === undefined) {
        if (rhs.generator !== undefined) {
            return false;
        }
    } else {
        if (lhs.generator !== rhs.generator) {
            return false;
        }
    }
    return areFixtureParametersEqual(lhs.fixture, rhs.fixture);
}

export class WorkspaceTestInterface {
    public id: WorkspaceTestIdentifierTemplate;
    public type: TestType;
    public children: (WorkspaceTestInterface)[];

    public is_parameterized: boolean;
    public instances?: WorkspaceTestParameters[];

    public executable?: fs.PathLike;

    public build_space?: fs.PathLike;
    public build_target?: IBuildTarget;

    public package?: IPackage;
    public resolvable?: boolean;

    public file?: string;
    public line?: number;
    public debuggable?: boolean;
}

export interface WorkspaceTestHandler {
    test(): WorkspaceTestInterface;
    instance(): WorkspaceTestInstance;
    item(): vscode.TestItem;

    enqueue(test_run: vscode.TestRun): Promise<void>;

    compile(
        test_run: vscode.TestRun,
        token: vscode.CancellationToken,
        diagnostics: vscode.DiagnosticCollection,
        cwd: fs.PathLike
    ): Promise<WorkspaceTestRunReport>;

    run(test_run: vscode.TestRun,
        token: vscode.CancellationToken,
        diagnostics: vscode.DiagnosticCollection,
        environment: [string, string][],
        cwd: fs.PathLike
    ): Promise<WorkspaceTestReport>;

    debug(test_run: vscode.TestRun,
        token: vscode.CancellationToken,
        diagnostics: vscode.DiagnosticCollection,
        environment: [string, string][],
        cwd: fs.PathLike
    ): Promise<void>;

    skip(test_run: vscode.TestRun): Promise<void>;

    enumerateTests(run_tests_individually: boolean, tests: WorkspaceTestInstance[]): void;
    enumeratePackages(packages: IPackage[]): void;

    addChild(child: WorkspaceTestHandler): void;
    removeChild(child: WorkspaceTestHandler): void;

    reload(): Promise<void>;
    updateTestItem(): void;
    loadTests(build_dir: fs.PathLike, devel_dir: fs.PathLike, query_for_cases: boolean): Promise<void>;
    dispose(): void;
}
export class WorkspaceTestInstance {
    public test: WorkspaceTestInterface;
    public parameters: WorkspaceTestParameters;
    public item: vscode.TestItem;
    public handler?: WorkspaceTestHandler;
}

export interface ITestParser {
    matches(json_object: any): boolean;
    analyzeSourceFile(suite_name: string, source_file: fs.PathLike): Promise<WorkspaceTestInterface[]>;
}