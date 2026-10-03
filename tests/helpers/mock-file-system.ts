import path from 'path';
import { vi } from 'vitest';

type FileNode = {
  content: string;
  type: 'file';
};

type DirectoryNode = {
  type: 'directory';
};

type Node = DirectoryNode | FileNode;

export type MockFileSystemShape = {
  [name: string]: MockFileSystemShape | string;
};

type FsPromisesModule = {
  access: ReturnType<typeof vi.fn>;
  cp: ReturnType<typeof vi.fn>;
  chmod: ReturnType<typeof vi.fn>;
  lstat: ReturnType<typeof vi.fn>;
  mkdir: ReturnType<typeof vi.fn>;
  mkdtemp: ReturnType<typeof vi.fn>;
  readFile: ReturnType<typeof vi.fn>;
  rename: ReturnType<typeof vi.fn>;
  rm: ReturnType<typeof vi.fn>;
  stat: ReturnType<typeof vi.fn>;
  writeFile: ReturnType<typeof vi.fn>;
};

const buildError = (code: string, syscall: string, targetPath: string): NodeJS.ErrnoException => {
  const error = new Error(`${code}: ${syscall} ${targetPath}`) as NodeJS.ErrnoException;
  error.code = code;
  error.errno = -1;
  error.path = targetPath;
  error.syscall = syscall;
  return error;
};

const isDirectoryShape = (value: MockFileSystemShape | string): value is MockFileSystemShape =>
  typeof value !== 'string';

export class MockFileSystem {
  private nodes = new Map<string, Node>();

  private tempDirectoryCounter = 0;

  public reset(structure: Record<string, MockFileSystemShape | string> = {}): void {
    this.nodes.clear();
    this.tempDirectoryCounter = 0;
    this.nodes.set(path.sep, { type: 'directory' });

    Object.entries(structure).forEach(([targetPath, shape]) => {
      this.addShape(targetPath, shape);
    });
  }

  public exists(targetPath: string): boolean {
    return this.nodes.has(this.normalize(targetPath));
  }

  public isDirectory(targetPath: string): boolean {
    const node = this.getNode(targetPath);
    return node?.type === 'directory';
  }

  public listPaths(): string[] {
    return Array.from(this.nodes.keys()).sort((leftPath, rightPath) => leftPath.localeCompare(rightPath));
  }

  public readFile(targetPath: string): string {
    const node = this.getRequiredNode(targetPath, 'open');

    if (node.type !== 'file') {
      throw buildError('EISDIR', 'open', this.normalize(targetPath));
    }

    return node.content;
  }

  public async access(targetPath: string): Promise<void> {
    if (!this.exists(targetPath)) {
      throw buildError('ENOENT', 'access', this.normalize(targetPath));
    }
  }

  public async cp(
    sourcePath: string,
    destinationPath: string,
    options?: { force?: boolean; recursive?: boolean }
  ): Promise<void> {
    const normalizedSourcePath = this.normalize(sourcePath);
    const normalizedDestinationPath = this.normalize(destinationPath);
    const sourceNode = this.getRequiredNode(normalizedSourcePath, 'cp');

    if (sourceNode.type === 'directory' && !options?.recursive) {
      throw buildError('ERR_FS_EISDIR', 'cp', normalizedSourcePath);
    }

    if (options?.force && this.exists(normalizedDestinationPath)) {
      await this.rm(normalizedDestinationPath, { force: true, recursive: true });
    }

    this.ensureParentDirectory(normalizedDestinationPath);
    this.copyNode(normalizedSourcePath, normalizedDestinationPath);
  }

  public async mkdir(targetPath: string, options?: { recursive?: boolean }): Promise<void> {
    const normalizedTargetPath = this.normalize(targetPath);

    if (this.exists(normalizedTargetPath)) {
      const existingNode = this.getRequiredNode(normalizedTargetPath, 'mkdir');

      if (existingNode.type !== 'directory') {
        throw buildError('EEXIST', 'mkdir', normalizedTargetPath);
      }

      return;
    }

    if (!options?.recursive) {
      const parentPath = path.dirname(normalizedTargetPath);

      if (!this.isDirectory(parentPath)) {
        throw buildError('ENOENT', 'mkdir', normalizedTargetPath);
      }
    }

    this.ensureDirectory(normalizedTargetPath);
  }

  public async mkdtemp(prefix: string): Promise<string> {
    const normalizedPrefix = this.normalize(prefix);
    const parentPath = path.dirname(normalizedPrefix);

    if (!this.isDirectory(parentPath)) {
      throw buildError('ENOENT', 'mkdtemp', normalizedPrefix);
    }

    const targetPath = `${normalizedPrefix}${String(this.tempDirectoryCounter).padStart(6, '0')}`;
    this.tempDirectoryCounter += 1;
    this.ensureDirectory(targetPath);
    return targetPath;
  }

  public async readFileContents(targetPath: string): Promise<string> {
    return this.readFile(targetPath);
  }

  public async rename(sourcePath: string, destinationPath: string): Promise<void> {
    const normalizedSourcePath = this.normalize(sourcePath);
    const normalizedDestinationPath = this.normalize(destinationPath);
    const sourceNode = this.getRequiredNode(normalizedSourcePath, 'rename');
    const descendants = this.getDescendantEntries(normalizedSourcePath);

    this.ensureParentDirectory(normalizedDestinationPath);

    if (this.exists(normalizedDestinationPath)) {
      await this.rm(normalizedDestinationPath, { force: true, recursive: true });
    }

    this.deleteNodeAndDescendants(normalizedSourcePath);
    this.nodes.set(normalizedDestinationPath, this.cloneNode(sourceNode));

    descendants.forEach(([entryPath, node]) => {
      const relativePath = path.relative(normalizedSourcePath, entryPath);
      const targetPath = path.join(normalizedDestinationPath, relativePath);
      this.nodes.set(targetPath, this.cloneNode(node));
    });
  }

  public async rm(targetPath: string, options?: { force?: boolean; recursive?: boolean }): Promise<void> {
    const normalizedTargetPath = this.normalize(targetPath);
    const node = this.getNode(normalizedTargetPath);

    if (!node) {
      if (options?.force) {
        return;
      }

      throw buildError('ENOENT', 'rm', normalizedTargetPath);
    }

    if (node.type === 'directory' && !options?.recursive) {
      throw buildError('ERR_FS_EISDIR', 'rm', normalizedTargetPath);
    }

    this.deleteNodeAndDescendants(normalizedTargetPath);
  }

  public async stat(targetPath: string): Promise<{ isDirectory: () => boolean; isFile: () => boolean }> {
    const node = this.getRequiredNode(targetPath, 'stat');

    return {
      isDirectory: () => node.type === 'directory',
      isFile: () => node.type === 'file',
    };
  }

  public async writeFileContents(targetPath: string, contents: string): Promise<void> {
    const normalizedTargetPath = this.normalize(targetPath);
    const existingNode = this.getNode(normalizedTargetPath);

    if (existingNode?.type === 'directory') {
      throw buildError('EISDIR', 'write', normalizedTargetPath);
    }

    this.ensureParentDirectory(normalizedTargetPath);
    this.nodes.set(normalizedTargetPath, {
      content: contents,
      type: 'file',
    });
  }

  public createFsPromisesModule(): { default: FsPromisesModule } & FsPromisesModule {
    const module = {
      access: vi.fn((targetPath: string) => this.access(targetPath)),
      chmod: vi.fn(async (targetPath: string) => { this.getRequiredNode(targetPath, 'chmod'); }),
      lstat: vi.fn(async (targetPath: string) => ({
        ...(await this.stat(targetPath)),
        isSymbolicLink: () => false,
      })),
      cp: vi.fn((sourcePath: string, destinationPath: string, options?: { force?: boolean; recursive?: boolean }) =>
        this.cp(sourcePath, destinationPath, options)
      ),
      mkdir: vi.fn((targetPath: string, options?: { recursive?: boolean }) => this.mkdir(targetPath, options)),
      mkdtemp: vi.fn((prefix: string) => this.mkdtemp(prefix)),
      readFile: vi.fn((targetPath: string) => this.readFileContents(targetPath)),
      rename: vi.fn((sourcePath: string, destinationPath: string) => this.rename(sourcePath, destinationPath)),
      rm: vi.fn((targetPath: string, options?: { force?: boolean; recursive?: boolean }) =>
        this.rm(targetPath, options)
      ),
      stat: vi.fn((targetPath: string) => this.stat(targetPath)),
      writeFile: vi.fn((targetPath: string, contents: string) => this.writeFileContents(targetPath, contents)),
    };

    return {
      default: module,
      ...module,
    };
  }

  private addShape(targetPath: string, shape: MockFileSystemShape | string): void {
    const normalizedTargetPath = this.normalize(targetPath);

    if (isDirectoryShape(shape)) {
      this.ensureDirectory(normalizedTargetPath);

      Object.entries(shape).forEach(([name, value]) => {
        this.addShape(path.join(normalizedTargetPath, name), value);
      });

      return;
    }

    this.ensureParentDirectory(normalizedTargetPath);
    this.nodes.set(normalizedTargetPath, {
      content: shape,
      type: 'file',
    });
  }

  private cloneNode(node: Node): Node {
    if (node.type === 'directory') {
      return { type: 'directory' };
    }

    return {
      content: node.content,
      type: 'file',
    };
  }

  private copyNode(sourcePath: string, destinationPath: string): void {
    const node = this.getRequiredNode(sourcePath, 'cp');
    this.nodes.set(destinationPath, this.cloneNode(node));

    if (node.type !== 'directory') {
      return;
    }

    this.getDescendantEntries(sourcePath).forEach(([entryPath, entryNode]) => {
      const relativePath = path.relative(sourcePath, entryPath);
      const targetPath = path.join(destinationPath, relativePath);
      this.nodes.set(targetPath, this.cloneNode(entryNode));
    });
  }

  private deleteNodeAndDescendants(targetPath: string): void {
    const normalizedTargetPath = this.normalize(targetPath);
    const descendantPaths = this.getDescendantEntries(normalizedTargetPath).map(([entryPath]) => entryPath);

    descendantPaths.forEach((entryPath) => {
      this.nodes.delete(entryPath);
    });

    this.nodes.delete(normalizedTargetPath);
  }

  private ensureDirectory(targetPath: string): void {
    const normalizedTargetPath = this.normalize(targetPath);

    if (normalizedTargetPath === path.sep) {
      this.nodes.set(path.sep, { type: 'directory' });
      return;
    }

    const parentPath = path.dirname(normalizedTargetPath);
    const parentNode = this.getNode(parentPath);

    if (!parentNode) {
      this.ensureDirectory(parentPath);
    } else if (parentNode.type !== 'directory') {
      throw buildError('ENOTDIR', 'mkdir', normalizedTargetPath);
    }

    const currentNode = this.getNode(normalizedTargetPath);

    if (currentNode && currentNode.type !== 'directory') {
      throw buildError('EEXIST', 'mkdir', normalizedTargetPath);
    }

    this.nodes.set(normalizedTargetPath, { type: 'directory' });
  }

  private ensureParentDirectory(targetPath: string): void {
    const parentPath = path.dirname(this.normalize(targetPath));

    if (!this.isDirectory(parentPath)) {
      throw buildError('ENOENT', 'mkdir', parentPath);
    }
  }

  private getDescendantEntries(targetPath: string): Array<[string, Node]> {
    const normalizedTargetPath = this.normalize(targetPath);
    const descendants: Array<[string, Node]> = [];
    const prefix = `${normalizedTargetPath}${path.sep}`;

    this.nodes.forEach((node, entryPath) => {
      if (entryPath.startsWith(prefix)) {
        descendants.push([entryPath, node]);
      }
    });

    descendants.sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath));
    return descendants;
  }

  private getNode(targetPath: string): Node | undefined {
    return this.nodes.get(this.normalize(targetPath));
  }

  private getRequiredNode(targetPath: string, syscall: string): Node {
    const normalizedTargetPath = this.normalize(targetPath);
    const node = this.nodes.get(normalizedTargetPath);

    if (!node) {
      throw buildError('ENOENT', syscall, normalizedTargetPath);
    }

    return node;
  }

  private normalize(targetPath: string): string {
    return path.resolve(path.sep, targetPath);
  }
}

export const mockFileSystem = new MockFileSystem();

export const createMockFsPromisesModule = (): { default: FsPromisesModule } & FsPromisesModule =>
  mockFileSystem.createFsPromisesModule();
