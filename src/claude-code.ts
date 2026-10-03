import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { validateApiToken } from './token';

type PathState = 'directory' | 'missing' | 'other';

export type ClaudeCodePluginInstallation = {
  artifactsDirectoryPath: string;
  createdPluginDirectory: boolean;
  pluginDirectoryPath: string;
  replacedExistingPluginDirectory: boolean;
};

export type FeedHiveGlobalApiKeyStorage = {
  createdConfigDirectory: boolean;
  createdEnvFile: boolean;
  envFilePath: string;
  updatedExistingApiKey: boolean;
};

const claudeCodePluginDirectoryName = 'feedhive';
const envFileName = 'agent-tools.env';
const feedHiveApiKeyEnvironmentVariableName = 'FEEDHIVE_API_KEY';

const bundledClaudeCodeArtifactsDirectoryCandidates = [
  path.resolve(__dirname, 'artifacts'),
  path.resolve(__dirname, '../claude-code-artifacts'),
  path.resolve(process.cwd(), 'claude-code-artifacts'),
];

const getPathState = async (targetPath: string): Promise<PathState> => {
  try {
    const stats = await fs.stat(targetPath);

    return stats.isDirectory() ? 'directory' : 'other';
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 'missing';
    }

    throw error;
  }
};

const pathExists = async (targetPath: string): Promise<boolean> => {
  try {
    await fs.access(targetPath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }

    throw error;
  }
};

export const getClaudeCodePluginDirectoryPath = (): string =>
  path.join(os.homedir(), '.claude', 'skills', claudeCodePluginDirectoryName);

export const getFeedHiveGlobalEnvFilePath = (): string =>
  path.join(os.homedir(), '.feedhive', envFileName);

export const resolveBundledClaudeCodeArtifactsDirectory = async (): Promise<string> => {
  for (const candidatePath of bundledClaudeCodeArtifactsDirectoryCandidates) {
    if ((await getPathState(candidatePath)) !== 'directory') {
      continue;
    }

    const hasPluginManifest = await pathExists(path.join(candidatePath, '.claude-plugin', 'plugin.json'));
    const hasSocialSkill = await pathExists(path.join(candidatePath, 'skills', 'social', 'SKILL.md'));

    if (hasPluginManifest && hasSocialSkill) {
      return candidatePath;
    }
  }

  throw new Error('Unable to locate the bundled FeedHive Claude Code plugin artifacts.');
};

const upsertEnvironmentVariable = (
  currentContents: string,
  variableName: string,
  variableValue: string
): { nextContents: string; updatedExistingValue: boolean } => {
  const envLine = `${variableName}=${variableValue}`;
  const lineSeparator = currentContents.includes('\r\n') ? '\r\n' : '\n';
  const variableMatcher = new RegExp(`^(?:\\s*export\\s+)?${variableName}\\s*=`, 'm');
  const rawLines = currentContents ? currentContents.split(/\r?\n/) : [];
  const lines = rawLines[rawLines.length - 1] === '' ? rawLines.slice(0, -1) : rawLines;
  const nextLines: string[] = [];
  let insertedEnvironmentVariable = false;
  let updatedExistingValue = false;

  for (const line of lines) {
    if (variableMatcher.test(line)) {
      if (!insertedEnvironmentVariable) {
        nextLines.push(envLine);
        insertedEnvironmentVariable = true;
        updatedExistingValue = true;
      }

      continue;
    }

    nextLines.push(line);
  }

  if (!insertedEnvironmentVariable) {
    nextLines.push(envLine);
  }

  return {
    nextContents: `${nextLines.join(lineSeparator)}${lineSeparator}`,
    updatedExistingValue,
  };
};

export const storeFeedHiveApiKeyGlobally = async (apiToken: string): Promise<FeedHiveGlobalApiKeyStorage> => {
  const normalizedApiToken = apiToken.trim();
  const envFilePath = getFeedHiveGlobalEnvFilePath();
  const envDirectoryPath = path.dirname(envFilePath);
  const envDirectoryState = await getPathState(envDirectoryPath);
  let currentContents: string | undefined;

  if (!normalizedApiToken) {
    throw new Error('Missing FeedHive API token.');
  }

  if (envDirectoryState === 'other') {
    throw new Error(`Cannot create FeedHive config directory at ${envDirectoryPath} because a non-directory entry already exists.`);
  }

  if (envDirectoryState === 'missing') {
    await fs.mkdir(envDirectoryPath, { recursive: true, mode: 0o700 });
  }

  try {
    const fileStats = await fs.lstat(envFilePath);
    if (fileStats.isDirectory()) {
      throw new Error(`Cannot store the FeedHive API key in ${envFilePath} because the path is a directory.`);
    }
    if (!fileStats.isFile() || fileStats.isSymbolicLink()) {
      throw new Error(`Refusing to write FeedHive API key to non-regular file ${envFilePath}.`);
    }
    currentContents = await fs.readFile(envFilePath, 'utf8');
  } catch (error) {
    const errorCode = (error as NodeJS.ErrnoException).code;

    if (errorCode === 'ENOENT') {
      currentContents = undefined;
    } else if (errorCode === 'EISDIR') {
      throw new Error(`Cannot store the FeedHive API key in ${envFilePath} because the path is a directory.`);
    } else {
      throw error;
    }
  }

  const { nextContents, updatedExistingValue } = upsertEnvironmentVariable(
    currentContents ?? '',
    feedHiveApiKeyEnvironmentVariableName,
    normalizedApiToken
  );

  if (currentContents !== undefined) await fs.chmod(envFilePath, 0o600);
  await fs.writeFile(envFilePath, nextContents, { encoding: 'utf8', mode: 0o600 });

  return {
    createdConfigDirectory: envDirectoryState === 'missing',
    createdEnvFile: currentContents === undefined,
    envFilePath,
    updatedExistingApiKey: updatedExistingValue,
  };
};

const installDirectoryAtomically = async (sourceDirectoryPath: string, targetDirectoryPath: string): Promise<void> => {
  const targetDirectoryParentPath = path.dirname(targetDirectoryPath);
  const stagingRootPath = await fs.mkdtemp(path.join(targetDirectoryParentPath, `.${claudeCodePluginDirectoryName}-install-`));
  const stagedDirectoryPath = path.join(stagingRootPath, path.basename(targetDirectoryPath));
  const backupDirectoryPath = path.join(
    targetDirectoryParentPath,
    `.${path.basename(targetDirectoryPath)}-backup-${Date.now()}-${process.pid}`
  );
  const targetDirectoryState = await getPathState(targetDirectoryPath);
  let movedExistingDirectoryToBackup = false;
  let movedStagedDirectoryIntoPlace = false;

  if (targetDirectoryState === 'other') {
    throw new Error(`Cannot install the FeedHive Claude Code plugin at ${targetDirectoryPath} because a non-directory entry already exists.`);
  }

  try {
    await fs.cp(sourceDirectoryPath, stagedDirectoryPath, { force: true, recursive: true });

    if (targetDirectoryState === 'directory') {
      await fs.rename(targetDirectoryPath, backupDirectoryPath);
      movedExistingDirectoryToBackup = true;
    }

    await fs.rename(stagedDirectoryPath, targetDirectoryPath);
    movedStagedDirectoryIntoPlace = true;

    if (movedExistingDirectoryToBackup) {
      await fs.rm(backupDirectoryPath, { force: true, recursive: true }).catch(() => undefined);
    }
  } catch (error) {
    if (!movedStagedDirectoryIntoPlace && movedExistingDirectoryToBackup) {
      await fs.rename(backupDirectoryPath, targetDirectoryPath).catch(() => undefined);
    }

    throw error;
  } finally {
    await fs.rm(stagingRootPath, { force: true, recursive: true }).catch(() => undefined);
  }
};

export const installFeedHiveClaudeCodePlugin = async (): Promise<ClaudeCodePluginInstallation> => {
  const artifactsDirectoryPath = await resolveBundledClaudeCodeArtifactsDirectory();
  const pluginDirectoryPath = getClaudeCodePluginDirectoryPath();
  const pluginDirectoryParentPath = path.dirname(pluginDirectoryPath);
  const parentState = await getPathState(pluginDirectoryParentPath);
  const pluginState = await getPathState(pluginDirectoryPath);

  if (parentState === 'other') {
    throw new Error(`Cannot create Claude Code skills directory at ${pluginDirectoryParentPath} because a non-directory entry already exists.`);
  }

  if (parentState === 'missing') {
    await fs.mkdir(pluginDirectoryParentPath, { recursive: true });
  }

  await installDirectoryAtomically(artifactsDirectoryPath, pluginDirectoryPath);

  return {
    artifactsDirectoryPath,
    createdPluginDirectory: pluginState !== 'directory',
    pluginDirectoryPath,
    replacedExistingPluginDirectory: pluginState === 'directory',
  };
};

export const installClaudeCodeWithApiToken = async (apiToken: string) => {
  const validation = await validateApiToken(apiToken, 'claude_code');

  const installation = await installFeedHiveClaudeCodePlugin();
  const apiKeyStorage = await storeFeedHiveApiKeyGlobally(apiToken);

  return {
    ...installation,
    ...apiKeyStorage,
    validationWarning: validation.warning,
  };
};
