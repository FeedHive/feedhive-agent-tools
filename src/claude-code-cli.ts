import { installClaudeCodeWithApiToken } from './claude-code';

// The key can be passed as the first argument (as shown in FeedHive onboarding) or via FEEDHIVE_API_KEY.
const [, , apiToken = process.env.FEEDHIVE_API_KEY ?? ''] = process.argv;

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
