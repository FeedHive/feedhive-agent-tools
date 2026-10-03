import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { installFeedHiveSkill } = vi.hoisted(() => ({
  installFeedHiveSkill: vi.fn(),
}));
const { storeFeedHiveApiKeyInWorkspace } = vi.hoisted(() => ({
  storeFeedHiveApiKeyInWorkspace: vi.fn(),
}));

vi.mock('../src/skills', () => ({
  installFeedHiveSkill,
  resolveSkillsDirectory: vi.fn(),
  storeFeedHiveApiKeyInWorkspace,
}));

import { installWithApiToken } from '../src/index';

const originalFetch = global.fetch;

describe('installWithApiToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    installFeedHiveSkill.mockResolvedValue({
      artifactsDirectoryPath: '/artifacts',
      created: true,
      createdSkillDirectory: true,
      directoryPath: '/workspace/skills',
      location: 'workspace',
      replacedExistingSkillDirectory: false,
      shadowedSkillDirectoryPaths: [],
      skillDirectoryPath: '/workspace/skills/feedhive',
      skillName: 'feedhive',
    });
    storeFeedHiveApiKeyInWorkspace.mockResolvedValue({
      createdEnvFile: true,
      envFilePath: '/workspace/.env.local',
      updatedExistingApiKey: false,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('rejects when the API token is missing', async () => {
    await expect(installWithApiToken('')).rejects.toThrow('Missing FeedHive API token.');
    expect(installFeedHiveSkill).not.toHaveBeenCalled();
    expect(storeFeedHiveApiKeyInWorkspace).not.toHaveBeenCalled();
  });

  it('rejects when the API cannot be reached', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('network down')) as typeof fetch;

    await expect(installWithApiToken('fh_token')).rejects.toThrow(
      'Unable to reach https://api.feedhive.com/status?install_source=openclaw. network down'
    );
    expect(installFeedHiveSkill).not.toHaveBeenCalled();
    expect(storeFeedHiveApiKeyInWorkspace).not.toHaveBeenCalled();
  });

  it('rejects when the API returns a non-success response payload', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ message: 'invalid token', success: false }),
    }) as typeof fetch;

    await expect(installWithApiToken('fh_token')).rejects.toThrow('invalid token');
    expect(installFeedHiveSkill).not.toHaveBeenCalled();
    expect(storeFeedHiveApiKeyInWorkspace).not.toHaveBeenCalled();
  });

  it('rejects when the API returns a non-2xx response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Unauthorized',
      text: async () => JSON.stringify({ message: 'invalid token' }),
    }) as typeof fetch;

    await expect(installWithApiToken('fh_token')).rejects.toThrow('invalid token');
    expect(installFeedHiveSkill).not.toHaveBeenCalled();
    expect(storeFeedHiveApiKeyInWorkspace).not.toHaveBeenCalled();
  });

  it('installs the FeedHive skill and stores the API key with a backend onboarding warning', async () => {
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

    const result = await installWithApiToken('fh_token');

    expect(installFeedHiveSkill).toHaveBeenCalledWith();
    expect(storeFeedHiveApiKeyInWorkspace).toHaveBeenCalledWith('fh_token');
    expect(result.validationWarning?.code).toBe('ONBOARDING_PLAN_REQUIRED');
    expect(result.validationWarning?.message).toContain('Finish onboarding');
  });

  it('installs the FeedHive skill and stores the API key after a successful validation', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ success: true }),
    }) as typeof fetch;

    const result = await installWithApiToken('fh_token');

    expect(global.fetch).toHaveBeenCalledWith('https://api.feedhive.com/status?install_source=openclaw', {
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer fh_token',
      },
      method: 'GET',
    });
    expect(installFeedHiveSkill).toHaveBeenCalledWith();
    expect(storeFeedHiveApiKeyInWorkspace).toHaveBeenCalledWith('fh_token');
    expect(result.envFilePath).toBe('/workspace/.env.local');
    expect(result.skillDirectoryPath).toBe('/workspace/skills/feedhive');
  });

  it('propagates API key storage failures after validation succeeds', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ success: true }),
    }) as typeof fetch;
    storeFeedHiveApiKeyInWorkspace.mockRejectedValue(new Error('Unable to write .env.local'));

    await expect(installWithApiToken('fh_token')).rejects.toThrow('Unable to write .env.local');
    expect(installFeedHiveSkill).toHaveBeenCalledWith();
    expect(storeFeedHiveApiKeyInWorkspace).toHaveBeenCalledWith('fh_token');
  });
});
