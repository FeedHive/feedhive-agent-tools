import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('fs/promises', async () => {
  const { createMockFsPromisesModule } = await import('./helpers/mock-file-system');
  return createMockFsPromisesModule();
});

import fs from 'fs/promises';
import {
  installFeedHiveSkill,
  resolveBundledArtifactsDirectory,
  resolveSkillsDirectory,
  storeFeedHiveApiKeyInWorkspace,
} from '../src/skills';
import { MockFileSystemShape, mockFileSystem } from './helpers/mock-file-system';

const workspaceDirectory = '/workspace';
const homeDirectory = '/mock-home';
const packagedArtifactsDirectory = path.join(process.cwd(), 'src', 'artifacts');
const repositoryArtifactsDirectory = path.join(process.cwd(), 'artifacts');

const createArtifactsTree = (label: string): MockFileSystemShape => ({
  'SKILL.md': `skill-${label}`,
  docs: {
    'api-docs.md': `docs-${label}`,
  },
  scripts: {
    'README.md': `scripts-${label}`,
  },
});

const seedFileSystem = (structure: Record<string, MockFileSystemShape | string> = {}): void => {
  mockFileSystem.reset(structure);
};

describe('skills installer', () => {
  beforeEach(() => {
    seedFileSystem({
      [repositoryArtifactsDirectory]: createArtifactsTree('repository'),
    });
    vi.spyOn(os, 'homedir').mockReturnValue(homeDirectory);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates workspace skills on first install even if a lower-priority root already exists', async () => {
    seedFileSystem({
      [repositoryArtifactsDirectory]: createArtifactsTree('repository'),
      [path.join(workspaceDirectory, '.agents', 'skills')]: {
        other: {
          'SKILL.md': 'other-skill',
        },
      },
    });

    const result = await installFeedHiveSkill(workspaceDirectory);

    expect(result.created).toBe(true);
    expect(result.createdSkillDirectory).toBe(true);
    expect(result.replacedExistingSkillDirectory).toBe(false);
    expect(result.skillDirectoryPath).toBe(path.join(workspaceDirectory, 'skills', 'feedhive'));
    expect(mockFileSystem.isDirectory(path.join(workspaceDirectory, 'skills', 'feedhive'))).toBe(true);
    expect(mockFileSystem.readFile(path.join(workspaceDirectory, 'skills', 'feedhive', 'SKILL.md'))).toBe(
      'skill-repository'
    );
    expect(mockFileSystem.readFile(path.join(workspaceDirectory, '.agents', 'skills', 'other', 'SKILL.md'))).toBe(
      'other-skill'
    );
  });

  it('reinstalls into the highest-precedence existing feedhive directory instead of drifting to a different root', async () => {
    seedFileSystem({
      [repositoryArtifactsDirectory]: createArtifactsTree('repository'),
      [path.join(workspaceDirectory, '.agents', 'skills', 'feedhive')]: {
        'OLD.txt': 'outdated',
      },
    });

    const result = await installFeedHiveSkill(workspaceDirectory);

    expect(result.created).toBe(false);
    expect(result.createdSkillDirectory).toBe(false);
    expect(result.replacedExistingSkillDirectory).toBe(true);
    expect(result.skillDirectoryPath).toBe(path.join(workspaceDirectory, '.agents', 'skills', 'feedhive'));
    expect(mockFileSystem.exists(path.join(workspaceDirectory, '.agents', 'skills', 'feedhive', 'OLD.txt'))).toBe(
      false
    );
    expect(mockFileSystem.readFile(path.join(workspaceDirectory, '.agents', 'skills', 'feedhive', 'SKILL.md'))).toBe(
      'skill-repository'
    );
    expect(mockFileSystem.exists(path.join(workspaceDirectory, 'skills', 'feedhive'))).toBe(false);
  });

  it('keeps lower-precedence duplicate feedhive skills untouched and reports them as shadowed', async () => {
    seedFileSystem({
      [repositoryArtifactsDirectory]: createArtifactsTree('repository'),
      [path.join(workspaceDirectory, 'skills', 'feedhive')]: {
        'WORKSPACE.txt': 'workspace-copy',
      },
      [path.join(workspaceDirectory, '.agents', 'skills', 'feedhive')]: {
        'PROJECT.txt': 'project-copy',
      },
      [path.join(homeDirectory, '.agents', 'skills', 'feedhive')]: {
        'PERSONAL.txt': 'personal-copy',
      },
    });

    const result = await installFeedHiveSkill(workspaceDirectory);

    expect(result.skillDirectoryPath).toBe(path.join(workspaceDirectory, 'skills', 'feedhive'));
    expect(result.shadowedSkillDirectoryPaths).toEqual([
      path.join(workspaceDirectory, '.agents', 'skills', 'feedhive'),
      path.join(homeDirectory, '.agents', 'skills', 'feedhive'),
    ]);
    expect(mockFileSystem.exists(path.join(workspaceDirectory, 'skills', 'feedhive', 'WORKSPACE.txt'))).toBe(false);
    expect(mockFileSystem.readFile(path.join(workspaceDirectory, '.agents', 'skills', 'feedhive', 'PROJECT.txt'))).toBe(
      'project-copy'
    );
    expect(mockFileSystem.readFile(path.join(homeDirectory, '.agents', 'skills', 'feedhive', 'PERSONAL.txt'))).toBe(
      'personal-copy'
    );
  });

  it('does not touch unrelated skills that share the same parent directory', async () => {
    seedFileSystem({
      [repositoryArtifactsDirectory]: createArtifactsTree('repository'),
      [path.join(workspaceDirectory, 'skills')]: {
        analytics: {
          'SKILL.md': 'analytics-skill',
        },
        feedhive: {
          'OLD.txt': 'outdated',
        },
      },
    });

    await installFeedHiveSkill(workspaceDirectory);

    expect(mockFileSystem.readFile(path.join(workspaceDirectory, 'skills', 'analytics', 'SKILL.md'))).toBe(
      'analytics-skill'
    );
    expect(mockFileSystem.exists(path.join(workspaceDirectory, 'skills', 'feedhive', 'OLD.txt'))).toBe(false);
  });

  it('restores the previous feedhive directory if the staged swap fails', async () => {
    seedFileSystem({
      [repositoryArtifactsDirectory]: createArtifactsTree('repository'),
      [path.join(workspaceDirectory, 'skills', 'feedhive')]: {
        'OLD.txt': 'keep-me',
      },
    });

    const renameMock = vi.mocked(fs.rename);
    const originalRename = renameMock.getMockImplementation();
    let renameCallCount = 0;

    renameMock.mockImplementation(async (sourcePath, destinationPath) => {
      renameCallCount += 1;

      if (renameCallCount === 2) {
        throw new Error(`rename failed for ${destinationPath}`);
      }

      if (!originalRename) {
        throw new Error('Missing rename implementation.');
      }

      return originalRename(sourcePath, destinationPath);
    });

    await expect(installFeedHiveSkill(workspaceDirectory)).rejects.toThrow(
      `rename failed for ${path.join(workspaceDirectory, 'skills', 'feedhive')}`
    );
    expect(mockFileSystem.readFile(path.join(workspaceDirectory, 'skills', 'feedhive', 'OLD.txt'))).toBe('keep-me');
    expect(
      mockFileSystem.listPaths().some((targetPath) => path.basename(targetPath).startsWith('.feedhive-install-'))
    ).toBe(false);
    expect(
      mockFileSystem.listPaths().some((targetPath) => path.basename(targetPath).startsWith('.feedhive-backup-'))
    ).toBe(false);
  });

  it('throws when the default skills path is occupied by a file during a fresh install', async () => {
    seedFileSystem({
      [repositoryArtifactsDirectory]: createArtifactsTree('repository'),
      [workspaceDirectory]: {
        skills: 'not-a-directory',
      },
    });

    await expect(installFeedHiveSkill(workspaceDirectory)).rejects.toThrow(
      `Cannot create a skills directory at ${path.join(workspaceDirectory, 'skills')}`
    );
  });

  it('throws when the selected feedhive target path is occupied by a file', async () => {
    seedFileSystem({
      [repositoryArtifactsDirectory]: createArtifactsTree('repository'),
      [path.join(workspaceDirectory, 'skills')]: {
        feedhive: 'not-a-directory',
      },
    });

    await expect(installFeedHiveSkill(workspaceDirectory)).rejects.toThrow(
      `Cannot install the FeedHive skill at ${path.join(workspaceDirectory, 'skills', 'feedhive')}`
    );
  });

  it('throws when the bundled artifacts cannot be located', async () => {
    seedFileSystem();

    await expect(installFeedHiveSkill(workspaceDirectory)).rejects.toThrow(
      'Unable to locate the bundled FeedHive skill artifacts.'
    );
  });

  it('prefers the packaged artifacts directory over the repository artifacts directory when both exist', async () => {
    seedFileSystem({
      [packagedArtifactsDirectory]: createArtifactsTree('packaged'),
      [repositoryArtifactsDirectory]: createArtifactsTree('repository'),
    });

    await expect(resolveBundledArtifactsDirectory()).resolves.toBe(packagedArtifactsDirectory);
  });

  it('creates .env.local with FEEDHIVE_API_KEY when the file does not exist', async () => {
    seedFileSystem({
      [workspaceDirectory]: {},
    });

    const result = await storeFeedHiveApiKeyInWorkspace('fh_token', workspaceDirectory);

    expect(result.createdEnvFile).toBe(true);
    expect(result.updatedExistingApiKey).toBe(false);
    expect(result.envFilePath).toBe(path.join(workspaceDirectory, '.env.local'));
    expect(mockFileSystem.readFile(path.join(workspaceDirectory, '.env.local'))).toBe('FEEDHIVE_API_KEY=fh_token\n');
  });

  it('appends FEEDHIVE_API_KEY to an existing .env.local without changing other entries', async () => {
    seedFileSystem({
      [workspaceDirectory]: {
        '.env.local': 'OTHER_KEY=other\n# note\n',
      },
    });

    const result = await storeFeedHiveApiKeyInWorkspace('fh_token', workspaceDirectory);

    expect(result.createdEnvFile).toBe(false);
    expect(result.updatedExistingApiKey).toBe(false);
    expect(fs.chmod).toHaveBeenCalledWith(path.join(workspaceDirectory, '.env.local'), 0o600);
    expect(fs.writeFile).toHaveBeenCalledWith(
      path.join(workspaceDirectory, '.env.local'),
      expect.any(String),
      { encoding: 'utf8', mode: 0o600 }
    );
    expect(mockFileSystem.readFile(path.join(workspaceDirectory, '.env.local'))).toBe(
      'OTHER_KEY=other\n# note\nFEEDHIVE_API_KEY=fh_token\n'
    );
  });

  it('replaces existing FEEDHIVE_API_KEY entries and removes duplicates from .env.local', async () => {
    seedFileSystem({
      [workspaceDirectory]: {
        '.env.local': 'OTHER_KEY=other\nFEEDHIVE_API_KEY=old-one\nKEEP=keep\nexport FEEDHIVE_API_KEY=old-two\n',
      },
    });

    const result = await storeFeedHiveApiKeyInWorkspace('fh_token', workspaceDirectory);

    expect(result.createdEnvFile).toBe(false);
    expect(result.updatedExistingApiKey).toBe(true);
    expect(mockFileSystem.readFile(path.join(workspaceDirectory, '.env.local'))).toBe(
      'OTHER_KEY=other\nFEEDHIVE_API_KEY=fh_token\nKEEP=keep\n'
    );
  });

  it('throws when .env.local is a directory instead of a file', async () => {
    seedFileSystem({
      [workspaceDirectory]: {
        '.env.local': {},
      },
    });

    await expect(storeFeedHiveApiKeyInWorkspace('fh_token', workspaceDirectory)).rejects.toThrow(
      // eslint-disable-next-line max-len
      `Cannot store the FeedHive API key in ${path.join(workspaceDirectory, '.env.local')} because the path is a directory.`
    );
  });

  it('creates the workspace skills root when no skills directories exist yet', async () => {
    seedFileSystem();

    const result = await resolveSkillsDirectory(workspaceDirectory);

    expect(result.created).toBe(true);
    expect(result.directoryPath).toBe(path.join(workspaceDirectory, 'skills'));
    expect(result.location).toBe('workspace');
    expect(mockFileSystem.isDirectory(path.join(workspaceDirectory, 'skills'))).toBe(true);
  });

  it('reuses the highest-precedence existing skills root when resolving roots directly', async () => {
    seedFileSystem({
      [path.join(workspaceDirectory, '.agents', 'skills')]: {},
      [path.join(homeDirectory, '.agents', 'skills')]: {},
    });

    const result = await resolveSkillsDirectory(workspaceDirectory);

    expect(result.created).toBe(false);
    expect(result.directoryPath).toBe(path.join(workspaceDirectory, '.agents', 'skills'));
    expect(result.location).toBe('project-agent');
  });
});
