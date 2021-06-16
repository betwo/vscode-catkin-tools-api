import * as vscode from 'vscode';
import * as fs from 'fs';
import { SourceFileConfiguration } from 'vscode-cpptools';
import { TestSuiteInfo, TestInfo } from 'vscode-test-adapter-api';

export const vscodeCatkinToolsExtensionId = 'betwo.catkin-tools';

export interface API {
    registerWorkspace(context: vscode.ExtensionContext,
        root: vscode.WorkspaceFolder,
        output_channel: vscode.OutputChannel): Promise<void>;
    unregisterWorkspace(context: vscode.ExtensionContext,
        root: vscode.WorkspaceFolder): Promise<void>;

    getWorkspace(workspace_folder: vscode.WorkspaceFolder): IWorkspace;
    getWorkspaceManager(): IWorkspaceManager;
    getWorkspaces(): Map<vscode.WorkspaceFolder, IWorkspace>;
}

export interface IWorkspace {
    system_include_browse_paths: string[];
    default_system_include_paths: string[];

    workspace_provider: WorkspaceProvider;

    isInitialized(): boolean;
    reload(): Promise<IWorkspace>;
    loadPackage(package_xml: fs.PathLike): void;
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
}

export type TestType = "unknown" | "gtest" | "generic" | "suite";

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

    getCmakeArguments(): Promise<string>;

    checkProfile(): Promise<void>;
    getProfiles(): Promise<string[]>;
    getActiveProfile(): Promise<string>;
    switchProfile(profile: string): Promise<boolean>;

    getBuildTask(): Promise<vscode.Task>;

    reload(): any;
    enableCompileCommandsGeneration(): any;

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