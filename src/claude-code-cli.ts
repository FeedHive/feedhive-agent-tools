import { installClaudeCodeWithApiToken } from './claude-code';

if (process.argv.length > 2) {
  console.error('Do not pass an API key on the command line. Set FEEDHIVE_API_KEY in your environment.');
  process.exit(1);
}

const apiToken = process.env.FEEDHIVE_API_KEY ?? '';

installClaudeCodeWithApiToken(apiToken)
  .then((installation) => {
    console.log(`FeedHive Claude Code plugin installed to ${installation.pluginDirectoryPath}`);
    console.log(`FeedHive API key stored in ${installation.envFilePath}`);

    if (installation.validationWarning) {
      console.warn(`Warning: ${installation.validationWarning.message}`);
    }
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Error: ${message}`);
    process.exitCode = 1;
  });
