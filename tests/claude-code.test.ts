import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('fs/promises', async () => {
  const { createMockFsPromisesModule } = await import('./helpers/mock-file-system');
  return createMockFsPromisesModule();
});

import {
  installFeedHiveClaudeCodePlugin,
  resolveBundledClaudeCodeArtifactsDirectory,
  installClaudeCodeWithApiToken,
  storeFeedHiveApiKeyGlobally,
} from '../src/claude-code';
import { MockFileSystemShape, mockFileSystem } from './helpers/mock-file-system';

const homeDirectory = '/mock-home';
const repositoryClaudeCodeArtifactsDirectory = path.join(process.cwd(), 'claude-code-artifacts');
const originalFetch = global.fetch;

const createClaudeCodeArtifactsTree = (label: string): MockFileSystemShape => ({
  '.claude-plugin': {
    'plugin.json': `plugin-${label}`,
  },
  skills: {
    social: {
      'SKILL.md': `skill-${label}`,
      docs: {
        'api.md': `docs-${label}`,
      },
      scripts: {
        'README.md': `scripts-${label}`,
      },
    },
  },
});

const seedFileSystem = (structure: Record<string, MockFileSystemShape | string> = {}): void => {
  mockFileSystem.reset(structure);
};

describe('Claude Code installer', () => {
  beforeEach(() => {
    seedFileSystem({
      [repositoryClaudeCodeArtifactsDirectory]: createClaudeCodeArtifactsTree('repository'),
    });
    vi.spyOn(os, 'homedir').mockReturnValue(homeDirectory);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('installs the FeedHive plugin into the Claude Code skills directory', async () => {
    const result = await installFeedHiveClaudeCodePlugin();
    const pluginDirectory = path.join(homeDirectory, '.claude', 'skills', 'feedhive');

    expect(result.createdPluginDirectory).toBe(true);
    expect(result.replacedExistingPluginDirectory).toBe(false);
    expect(result.pluginDirectoryPath).toBe(pluginDirectory);
    expect(mockFileSystem.readFile(path.join(pluginDirectory, '.claude-plugin', 'plugin.json'))).toBe(
      'plugin-repository'
    );
    expect(mockFileSystem.readFile(path.join(pluginDirectory, 'skills', 'social', 'SKILL.md'))).toBe(
      'skill-repository'
    );
  });

  it('replaces an existing FeedHive Claude Code plugin atomically', async () => {
    const pluginDirectory = path.join(homeDirectory, '.claude', 'skills', 'feedhive');

    seedFileSystem({
      [repositoryClaudeCodeArtifactsDirectory]: createClaudeCodeArtifactsTree('repository'),
      [pluginDirectory]: {
        'OLD.txt': 'outdated',
      },
    });

    const result = await installFeedHiveClaudeCodePlugin();

    expect(result.createdPluginDirectory).toBe(false);
    expect(result.replacedExistingPluginDirectory).toBe(true);
    expect(mockFileSystem.exists(path.join(pluginDirectory, 'OLD.txt'))).toBe(false);
    expect(mockFileSystem.readFile(path.join(pluginDirectory, 'skills', 'social', 'SKILL.md'))).toBe(
      'skill-repository'
    );
  });

  it('throws when the bundled Claude Code artifacts cannot be located', async () => {
    seedFileSystem();

    await expect(installFeedHiveClaudeCodePlugin()).rejects.toThrow(
      'Unable to locate the bundled FeedHive Claude Code plugin artifacts.'
    );
  });

  it('resolves the bundled Claude Code artifacts only when plugin manifest and skill exist', async () => {
    await expect(resolveBundledClaudeCodeArtifactsDirectory()).resolves.toBe(repositoryClaudeCodeArtifactsDirectory);
  });

  it('validates Claude Code installs with the claude_code install source', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ success: true }),
    }) as typeof fetch;

    const result = await installClaudeCodeWithApiToken('fh_token');

    expect(global.fetch).toHaveBeenCalledWith('https://api.feedhive.com/status?install_source=claude_code', {
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer fh_token',
      },
      method: 'GET',
    });
    expect(result.pluginDirectoryPath).toBe(path.join(homeDirectory, '.claude', 'skills', 'feedhive'));
    expect(result.envFilePath).toBe(path.join(homeDirectory, '.feedhive', 'agent-tools.env'));
  });

  it('installs Claude Code and stores the API key with a backend onboarding warning', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({
        success: true,
        warning: {
          code: 'ONBOARDING_PLAN_REQUIRED',
          message: 'FeedHive API key verified. Finish onboarding and pick a paid plan or start your trial to enable API calls.',
        },
      }),
    }) as typeof fetch;

    const result = await installClaudeCodeWithApiToken('fh_token');

    expect(result.pluginDirectoryPath).toBe(path.join(homeDirectory, '.claude', 'skills', 'feedhive'));
    expect(result.envFilePath).toBe(path.join(homeDirectory, '.feedhive', 'agent-tools.env'));
    expect(result.validationWarning?.code).toBe('ONBOARDING_PLAN_REQUIRED');
    expect(result.validationWarning?.message).toContain('Finish onboarding');
  });

  it('creates the global FeedHive env file for Claude Code auth', async () => {
    const result = await storeFeedHiveApiKeyGlobally('fh_token');
    const envFilePath = path.join(homeDirectory, '.feedhive', 'agent-tools.env');

    expect(result.createdConfigDirectory).toBe(true);
    expect(result.createdEnvFile).toBe(true);
    expect(result.updatedExistingApiKey).toBe(false);
    expect(result.envFilePath).toBe(envFilePath);
    expect(mockFileSystem.readFile(envFilePath)).toBe('FEEDHIVE_API_KEY=fh_token\n');
  });

  it('replaces existing global FeedHive API key entries and preserves other values', async () => {
    const envFilePath = path.join(homeDirectory, '.feedhive', 'agent-tools.env');

    seedFileSystem({
      [path.dirname(envFilePath)]: {
        'agent-tools.env': 'OTHER_KEY=other\nFEEDHIVE_API_KEY=old-one\nexport FEEDHIVE_API_KEY=old-two\n',
      },
    });

    const result = await storeFeedHiveApiKeyGlobally('fh_token');

    expect(result.createdConfigDirectory).toBe(false);
    expect(result.createdEnvFile).toBe(false);
    expect(result.updatedExistingApiKey).toBe(true);
    expect(fs.chmod).toHaveBeenCalledWith(envFilePath, 0o600);
    expect(mockFileSystem.readFile(envFilePath)).toBe('OTHER_KEY=other\nFEEDHIVE_API_KEY=fh_token\n');
  });
});
