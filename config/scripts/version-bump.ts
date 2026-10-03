/* eslint-disable no-console */
import { execFileSync } from 'child_process';
import fs from 'fs';

const args = process.argv.slice(2);

const getArgValue = (name: string, fallback: string): string => {
  const index = args.indexOf(name);

  if (index < 0) {
    return fallback;
  }

  const value = args[index + 1];

  if (!value) {
    throw new Error(`Missing value for ${name}`);
  }

  return value;
};

const packageName = getArgValue('--package', '@feedhive/setup-openclaw');
const publishPackagePath = getArgValue('--package-path', 'dist/openclaw/package.json');
let npmVersion = '0.0.0';
const publishPackageJSON = JSON.parse(fs.readFileSync(publishPackagePath, { encoding: 'utf-8' }));

try {
  npmVersion = execFileSync('npm', ['view', packageName, 'version'], {
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
} catch {
  npmVersion = '0.0.0';
}

const [currentMajor, currentMinor] = publishPackageJSON.version.split('.');
const [newMajor, newMinor, newPatch] = npmVersion.split('.');

if (newMajor === currentMajor && newMinor === currentMinor) {
  const increasedPatch = Number(newPatch) + 1;
  publishPackageJSON.version = `${newMajor}.${newMinor}.${increasedPatch}`;
}

fs.writeFileSync(publishPackagePath, JSON.stringify(publishPackageJSON, null, 2));
console.log(`Prepared ${packageName} version ${publishPackageJSON.version}`);
