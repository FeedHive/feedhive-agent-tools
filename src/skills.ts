import fs from 'fs/promises';
import os from 'os';
import path from 'path';

export type SkillsDirectoryLocation = 'workspace' | 'project-agent' | 'personal-agent' | 'managed-local';

type SkillsDirectoryCandidate = {
  directoryPath: string;
  location: SkillsDirectoryLocation;
};

type SkillDirectoryCandidate = SkillsDirectoryCandidate & {
  skillDirectoryPath: string;
};

type PathState = 'directory' | 'missing' | 'other';

export type SkillsDirectoryResolution = {
  created: boolean;
  directoryPath: string;
  location: SkillsDirectoryLocation;
};

export type FeedHiveSkillInstallation = SkillsDirectoryResolution & {
  artifactsDirectoryPath: string;
  createdSkillDirectory: boolean;
  replacedExistingSkillDirectory: boolean;
  skillDirectoryPath: string;
  skillName: 'feedhive';
  shadowedSkillDirectoryPaths: string[];
};

export type FeedHiveApiKeyStorage = {
  createdEnvFile: boolean;
  envFilePath: string;
  updatedExistingApiKey: boolean;
};

const bundledArtifactsDirectoryCandidates = [
  path.resolve(__dirname, 'artifacts'),
  path.resolve(__dirname, '../artifacts'),
];
const envLocalFileName = '.env.local';
const feedHiveApiKeyEnvironmentVariableName = 'FEEDHIVE_API_KEY';
const feedHiveSkillDirectoryName = 'feedhive';

const getSkillsDirectoryCandidates = (workspaceDirectory: string): SkillsDirectoryCandidate[] => [
  {
    directoryPath: path.join(workspaceDirectory, 'skills'),
    location: 'workspace',
  },
  {
    directoryPath: path.join(workspaceDirectory, '.agents', 'skills'),
    location: 'project-agent',
  },
  {
    directoryPath: path.join(os.homedir(), '.agents', 'skills'),
    location: 'personal-agent',
  },
  {
    directoryPath: path.join(os.homedir(), '.openclaw', 'skills'),
    location: 'managed-local',
  },
];

const getSkillDirectoryCandidates = (workspaceDirectory: string): SkillDirectoryCandidate[] =>
  getSkillsDirectoryCandidates(workspaceDirectory).map((candidate) => ({
    ...candidate,
    skillDirectoryPath: path.join(candidate.directoryPath, feedHiveSkillDirectoryName),
  }));

const getPathState = async (directoryPath: string): Promise<PathState> => {
  try {
    const stats = await fs.stat(directoryPath);

    return stats.isDirectory() ? 'directory' : 'other';
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return 'missing';
    }

    throw error;
  }
};

export const resolveSkillsDirectory = async (
  workspaceDirectory: string = process.cwd()
): Promise<SkillsDirectoryResolution> => {
  const normalizedWorkspaceDirectory = path.resolve(workspaceDirectory);
  const candidates = getSkillsDirectoryCandidates(normalizedWorkspaceDirectory);

  for (const candidate of candidates) {
    if ((await getPathState(candidate.directoryPath)) === 'directory') {
      return {
        created: false,
        directoryPath: candidate.directoryPath,
        location: candidate.location,
      };
    }
  }

  const highestPriorityCandidate = candidates[0];
  const highestPriorityState = await getPathState(highestPriorityCandidate.directoryPath);

  if (highestPriorityState === 'other') {
    throw new Error(
      // eslint-disable-next-line max-len
      `Cannot create a skills directory at ${highestPriorityCandidate.directoryPath} because a non-directory entry already exists.`
    );
  }

  await fs.mkdir(highestPriorityCandidate.directoryPath, { recursive: true });

  return {
    created: true,
    directoryPath: highestPriorityCandidate.directoryPath,
    location: highestPriorityCandidate.location,
  };
};

type FeedHiveSkillTargetResolution = SkillsDirectoryResolution & {
  createdSkillDirectory: boolean;
  replacedExistingSkillDirectory: boolean;
  shadowedSkillDirectoryPaths: string[];
  skillDirectoryPath: string;
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

export const resolveBundledArtifactsDirectory = async (): Promise<string> => {
  for (const candidatePath of bundledArtifactsDirectoryCandidates) {
    if ((await getPathState(candidatePath)) !== 'directory') {
      continue;
    }

    if (await pathExists(path.join(candidatePath, 'SKILL.md'))) {
      return candidatePath;
    }
  }

  throw new Error('Unable to locate the bundled FeedHive skill artifacts.');
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

export const storeFeedHiveApiKeyInWorkspace = async (
  apiToken: string,
  workspaceDirectory: string = process.cwd()
): Promise<FeedHiveApiKeyStorage> => {
  const normalizedApiToken = apiToken.trim();
  const normalizedWorkspaceDirectory = path.resolve(workspaceDirectory);
  const envFilePath = path.join(normalizedWorkspaceDirectory, envLocalFileName);
  let currentContents: string | undefined;

  if (!normalizedApiToken) {
    throw new Error('Missing FeedHive API token.');
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

  // Restrict an existing file before replacing its contents; new files are private from creation.
  if (currentContents !== undefined) await fs.chmod(envFilePath, 0o600);
  await fs.writeFile(envFilePath, nextContents, { encoding: 'utf8', mode: 0o600 });

  return {
    createdEnvFile: currentContents === undefined,
    envFilePath,
    updatedExistingApiKey: updatedExistingValue,
  };
};

const resolveFeedHiveSkillTarget = async (
  workspaceDirectory: string = process.cwd()
): Promise<FeedHiveSkillTargetResolution> => {
  const normalizedWorkspaceDirectory = path.resolve(workspaceDirectory);
  const candidates = getSkillDirectoryCandidates(normalizedWorkspaceDirectory);
  const existingCandidates: SkillDirectoryCandidate[] = [];

  for (const candidate of candidates) {
    if ((await getPathState(candidate.skillDirectoryPath)) === 'directory') {
      existingCandidates.push(candidate);
    }
  }

  if (existingCandidates.length > 0) {
    const [selectedCandidate, ...shadowedCandidates] = existingCandidates;

    return {
      created: false,
      createdSkillDirectory: false,
      directoryPath: selectedCandidate.directoryPath,
      location: selectedCandidate.location,
      replacedExistingSkillDirectory: true,
      shadowedSkillDirectoryPaths: shadowedCandidates.map((candidate) => candidate.skillDirectoryPath),
      skillDirectoryPath: selectedCandidate.skillDirectoryPath,
    };
  }

  const defaultCandidate = candidates[0];
  const skillsDirectoryState = await getPathState(defaultCandidate.directoryPath);
  const skillDirectoryState = await getPathState(defaultCandidate.skillDirectoryPath);

  if (skillsDirectoryState === 'other') {
    throw new Error(
      // eslint-disable-next-line max-len
      `Cannot create a skills directory at ${defaultCandidate.directoryPath} because a non-directory entry already exists.`
    );
  }

  if (skillDirectoryState === 'other') {
    throw new Error(
      // eslint-disable-next-line max-len
      `Cannot install the FeedHive skill at ${defaultCandidate.skillDirectoryPath} because a non-directory entry already exists.`
    );
  }

  if (skillsDirectoryState === 'missing') {
    await fs.mkdir(defaultCandidate.directoryPath, { recursive: true });
  }

  return {
    created: skillsDirectoryState === 'missing',
    createdSkillDirectory: skillDirectoryState !== 'directory',
    directoryPath: defaultCandidate.directoryPath,
    location: defaultCandidate.location,
    replacedExistingSkillDirectory: false,
    shadowedSkillDirectoryPaths: [],
    skillDirectoryPath: defaultCandidate.skillDirectoryPath,
  };
};

const installDirectoryAtomically = async (sourceDirectoryPath: string, targetDirectoryPath: string): Promise<void> => {
  const targetDirectoryParentPath = path.dirname(targetDirectoryPath);
  const stagingRootPath = await fs.mkdtemp(
    path.join(targetDirectoryParentPath, `.${feedHiveSkillDirectoryName}-install-`)
  );
  const stagedDirectoryPath = path.join(stagingRootPath, path.basename(targetDirectoryPath));
  const backupDirectoryPath = path.join(
    targetDirectoryParentPath,
    `.${path.basename(targetDirectoryPath)}-backup-${Date.now()}-${process.pid}`
  );
  const targetDirectoryState = await getPathState(targetDirectoryPath);
  let movedExistingDirectoryToBackup = false;
  let movedStagedDirectoryIntoPlace = false;

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

export const installFeedHiveSkill = async (
  workspaceDirectory: string = process.cwd()
): Promise<FeedHiveSkillInstallation> => {
  const skillsDirectory = await resolveFeedHiveSkillTarget(workspaceDirectory);
  const artifactsDirectoryPath = await resolveBundledArtifactsDirectory();

  await installDirectoryAtomically(artifactsDirectoryPath, skillsDirectory.skillDirectoryPath);

  return {
    ...skillsDirectory,
    artifactsDirectoryPath,
    skillName: 'feedhive',
  };
};
