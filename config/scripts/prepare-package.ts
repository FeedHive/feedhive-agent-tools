import fs from 'fs';
import path from 'path';

const [, , buildenv] = process.argv;
const openClawArtifactsDirectory = 'artifacts';
const claudeCodeArtifactsDirectory = 'claude-code-artifacts';
const sharedDocsDirectory = path.join(openClawArtifactsDirectory, 'docs');
const sharedScriptsDirectory = path.join(openClawArtifactsDirectory, 'scripts');
const cliDocsFile = path.join('cli-docs', 'CLI.md');

if (!buildenv) {
  throw new Error('You must specify the build environment, e.g. "-- dev" or "-- prod"');
}

const rootPackageJSON = JSON.parse(fs.readFileSync('package.json', { encoding: 'utf-8' }));

const readTemplate = (templateName: string) =>
  JSON.parse(fs.readFileSync(path.join('config/templates', templateName), { encoding: 'utf-8' }));

const writePackageJSON = (packageDirectory: string, templateName: string) => {
  const publishPackageJSON = readTemplate(templateName);
  publishPackageJSON.version = rootPackageJSON.version;

  if (buildenv === 'dev' && process.env.FEEDHIVE_DEV_NPM_REGISTRY) {
    publishPackageJSON.publishConfig = {
      registry: process.env.FEEDHIVE_DEV_NPM_REGISTRY,
    };
  } else {
    delete publishPackageJSON.publishConfig;
  }

  fs.copyFileSync('LICENSE', path.join(packageDirectory, 'LICENSE'));
  fs.writeFileSync(path.join(packageDirectory, 'package.json'), JSON.stringify(publishPackageJSON, null, 2));
};

const copyIfExists = (sourcePath: string, targetPath: string) => {
  if (fs.existsSync(sourcePath)) {
    fs.cpSync(sourcePath, targetPath, { recursive: true });
  }
};

const prepareOpenClawPackage = () => {
  const packageDirectory = path.join('dist', 'openclaw');

  fs.mkdirSync(packageDirectory, { recursive: true });
  fs.copyFileSync(path.join('package-readmes', 'openclaw.md'), path.join(packageDirectory, 'README.md'));
  copyIfExists(openClawArtifactsDirectory, path.join(packageDirectory, 'artifacts'));
  writePackageJSON(packageDirectory, 'package.openclaw.json');
};

const prepareClaudeCodePackage = () => {
  const packageDirectory = path.join('dist', 'claude-code');
  const pluginArtifactsDirectory = path.join(packageDirectory, 'artifacts');
  const socialSkillDirectory = path.join(pluginArtifactsDirectory, 'skills', 'social');

  fs.mkdirSync(packageDirectory, { recursive: true });
  fs.copyFileSync(path.join('package-readmes', 'claude-code.md'), path.join(packageDirectory, 'README.md'));
  copyIfExists(claudeCodeArtifactsDirectory, pluginArtifactsDirectory);
  copyIfExists(sharedDocsDirectory, path.join(socialSkillDirectory, 'docs'));
  copyIfExists(sharedScriptsDirectory, path.join(socialSkillDirectory, 'scripts'));
  writePackageJSON(packageDirectory, 'package.claude-code.json');
};

const prepareFeedHiveCliPackage = () => {
  const packageDirectory = path.join('dist', 'feedhive-cli');

  fs.mkdirSync(packageDirectory, { recursive: true });
  fs.copyFileSync(path.join('package-readmes', 'cli.md'), path.join(packageDirectory, 'README.md'));
  fs.copyFileSync(cliDocsFile, path.join(packageDirectory, 'CLI.md'));
  copyIfExists(sharedDocsDirectory, path.join(packageDirectory, 'docs'));
  writePackageJSON(packageDirectory, 'package.feedhive-cli.json');
};

prepareOpenClawPackage();
prepareClaudeCodePackage();
prepareFeedHiveCliPackage();
