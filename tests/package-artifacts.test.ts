import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const repositoryRoot = process.cwd();
const distDirectory = path.join(repositoryRoot, 'dist');

describe('analytics package artifacts', () => {
  beforeAll(() => {
    fs.rmSync(distDirectory, { force: true, recursive: true });
    execFileSync(process.execPath, [require.resolve('ts-node/dist/bin.js'), 'config/scripts/prepare-package.ts', 'prod'], {
      cwd: repositoryRoot,
      stdio: 'pipe',
    });
  });

  afterAll(() => {
    fs.rmSync(distDirectory, { force: true, recursive: true });
  });

  it.each(['openclaw/artifacts', 'claude-code/artifacts/skills/social'])(
    'packages shared analytics scripts and API reference in %s',
    (artifactRoot) => {
      const root = path.join(distDirectory, artifactRoot);

      expect(fs.existsSync(path.join(root, 'scripts', 'get-post-analytics.js'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'scripts', 'get-social-analytics.js'))).toBe(true);
      expect(fs.readFileSync(path.join(root, 'docs', 'api.md'), 'utf8')).toContain('GET /analytics/posts/:postId');
    }
  );

  it('packages analytics commands and docs for the CLI', () => {
    expect(fs.readFileSync(path.join(distDirectory, 'feedhive-cli', 'CLI.md'), 'utf8')).toContain(
      'feedhive analytics post <post-id>'
    );
    expect(fs.readFileSync(path.join(distDirectory, 'feedhive-cli', 'docs', 'api.md'), 'utf8')).toContain(
      'GET /analytics/socials/:id'
    );
  });

  it.each([
    ['openclaw', '@feedhive/setup-openclaw', '# @feedhive/setup-openclaw'],
    ['claude-code', '@feedhive/setup-claude-code', '# @feedhive/setup-claude-code'],
    ['feedhive-cli', '@feedhive/cli', '# @feedhive/cli'],
  ])('packs its own README and GitHub metadata for %s', (directory, packageName, heading) => {
    const root = path.join(distDirectory, directory);
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
    const pack = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: root, encoding: 'utf8' }))[0];

    expect(manifest.name).toBe(packageName);
    expect(manifest.repository).toEqual({
      type: 'git',
      url: 'git+https://github.com/FeedHive/feedhive-agent-tools.git',
    });
    expect(manifest.homepage).toBe('https://github.com/FeedHive/feedhive-agent-tools#readme');
    expect(readme).toContain(heading);
    expect(readme).toContain(`npx ${packageName}`);
    expect(readme).toContain('https://github.com/FeedHive/feedhive-agent-tools');
    expect(pack.files.map((file: { path: string }) => file.path)).toEqual(
      expect.arrayContaining(['README.md', 'LICENSE'])
    );
    expect(pack.name).toBe(packageName);
  });
});
