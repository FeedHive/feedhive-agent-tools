import { describe, expect, it, vi } from 'vitest';
import { executeFeedHiveCli } from '../src/feedhive-cli';

const createJsonResponse = (payload: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
    statusText: 'OK',
    ...init,
  });

describe('FeedHive CLI', () => {
  it('prints help without requiring an API key', async () => {
    const stdout = vi.fn();
    const stderr = vi.fn();

    const exitCode = await executeFeedHiveCli({
      argv: ['--help'],
      env: {},
      fetchImpl: vi.fn() as unknown as typeof fetch,
      stderr,
      stdout,
    });

    expect(exitCode).toBe(0);
    expect(stderr).not.toHaveBeenCalled();
    expect(stdout.mock.calls[0][0]).toContain('feedhive <resource> <action>');
    expect(stdout.mock.calls[0][0]).toContain('posts');
    expect(stdout.mock.calls[0][0]).toContain('plan-slots');
    expect(stdout.mock.calls[0][0]).toContain('analytics');
  });

  it('maps analytics post to GET /analytics/posts/:postId', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      createJsonResponse({ data: { post_id: 'post / 1', publications: [] }, success: true })
    );

    const exitCode = await executeFeedHiveCli({
      argv: ['analytics', 'post', 'post / 1'],
      env: { FEEDHIVE_API_KEY: 'fh_key' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      stdout: vi.fn(),
    });

    expect(exitCode).toBe(0);
    const [url, init] = fetchImpl.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('https://api.feedhive.com/analytics/posts/post%20%2F%201');
    expect(init.method).toBe('GET');
  });

  it('maps analytics social to GET /analytics/socials/:socialId', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      createJsonResponse({ data: { metrics: { followers: 12 }, social_provider_id: 'social_1' }, success: true })
    );

    const exitCode = await executeFeedHiveCli({
      argv: ['analytics', 'social', 'social_1'],
      env: { FEEDHIVE_API_KEY: 'fh_key' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      stdout: vi.fn(),
    });

    expect(exitCode).toBe(0);
    const [url, init] = fetchImpl.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('https://api.feedhive.com/analytics/socials/social_1');
    expect(init.method).toBe('GET');
  });

  it('maps posts list to GET /posts with query params', async () => {
    const stdout = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue(createJsonResponse({ data: { items: [] }, success: true }));

    const exitCode = await executeFeedHiveCli({
      argv: ['posts', 'list', '--limit', '20', '--status', 'draft,scheduled'],
      env: { FEEDHIVE_API_KEY: 'fh_key' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      stdout,
    });

    expect(exitCode).toBe(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('https://api.feedhive.com/posts?limit=20&status=draft%2Cscheduled');
    expect(init.method).toBe('GET');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer fh_key' });
    expect(stdout.mock.calls[0][0]).toContain('"success": true');
  });

  it('maps posts create to POST /posts with an inline JSON body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(createJsonResponse({ data: { id: 'post_1' }, success: true }));

    const exitCode = await executeFeedHiveCli({
      argv: ['posts', 'create', '--body', '{"text":"Hello"}', '--pretty', 'false'],
      env: { FEEDHIVE_API_KEY: 'fh_key' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      stdout: vi.fn(),
    });

    expect(exitCode).toBe(0);
    const [url, init] = fetchImpl.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('https://api.feedhive.com/posts');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"text":"Hello"}');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('passes a typed custom-thumbnail post update to PATCH /posts/:id', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(createJsonResponse({ data: { id: 'post_1' }, success: true }));

    const exitCode = await executeFeedHiveCli({
      argv: [
        'posts',
        'update',
        'post_1',
        '--body',
        '{"thumbnail_media_id":"med_thumbnail"}',
      ],
      env: { FEEDHIVE_API_KEY: 'fh_key' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      stdout: vi.fn(),
    });

    expect(exitCode).toBe(0);
    const [url, init] = fetchImpl.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('https://api.feedhive.com/posts/post_1');
    expect(init.method).toBe('PATCH');
    expect(init.body).toBe('{"thumbnail_media_id":"med_thumbnail"}');
  });

  it('maps media complete-upload to POST /media/uploads/:id/complete', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(createJsonResponse({ success: true }));

    const exitCode = await executeFeedHiveCli({
      argv: ['media', 'complete-upload', 'upl_123'],
      env: { FEEDHIVE_API_KEY: 'fh_key' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      stdout: vi.fn(),
    });

    expect(exitCode).toBe(0);
    const [url, init] = fetchImpl.mock.calls[0] as [URL, RequestInit];
    expect(url.toString()).toBe('https://api.feedhive.com/media/uploads/upl_123/complete');
    expect(init.method).toBe('POST');
  });

  it('returns input error code when a body is required but missing', async () => {
    const stderr = vi.fn();
    const fetchImpl = vi.fn();

    const exitCode = await executeFeedHiveCli({
      argv: ['labels', 'create'],
      env: { FEEDHIVE_API_KEY: 'fh_key' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      stderr,
      stdout: vi.fn(),
    });

    expect(exitCode).toBe(2);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(stderr.mock.calls[0][0]).toContain('requires --body');
  });

  it('returns the backend onboarding message when API access is not active yet', async () => {
    const stderr = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          code: 'ONBOARDING_PLAN_REQUIRED',
          message: 'FeedHive API key verified. Finish onboarding and pick a paid plan or start your trial to enable API calls.',
          success: false,
        },
        { status: 402, statusText: 'Payment Required' }
      )
    );

    const exitCode = await executeFeedHiveCli({
      argv: ['posts', 'list'],
      env: { FEEDHIVE_API_KEY: 'fh_key' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      stderr,
      stdout: vi.fn(),
    });

    expect(exitCode).toBe(1);
    expect(stderr.mock.calls[0][0]).toContain('Finish onboarding');
    expect(stderr.mock.calls[0][0]).toContain('start your trial');
  });

  it('returns API error code for non-2xx responses', async () => {
    const stderr = vi.fn();
    const fetchImpl = vi.fn().mockResolvedValue(
      createJsonResponse({ message: 'Nope', success: false }, { status: 401, statusText: 'Unauthorized' })
    );

    const exitCode = await executeFeedHiveCli({
      argv: ['socials', 'list'],
      env: { FEEDHIVE_API_KEY: 'fh_key' },
      fetchImpl: fetchImpl as unknown as typeof fetch,
      stderr,
      stdout: vi.fn(),
    });

    expect(exitCode).toBe(1);
    expect(stderr.mock.calls[0][0]).toContain('401 Unauthorized');
  });
});
