const { createCliContext, handleCliError } = require('./_cli');
const { apiRequest } = require('./_api');

function mainFunction(body, requestConfig) {
  return apiRequest({
    ...requestConfig,
    body,
    method: 'POST',
    path: '/media/uploads',
  });
}

const cli = createCliContext({
  argv: process.argv.slice(2),
  description: 'Create a media upload session using POST /media/uploads.',
  examples: [
    'node artifacts/scripts/create-media-upload.js --body "{\"filename\":\"image.jpg\",\"content_type\":\"image/jpeg\"}"',
  ],
  scriptName: 'create-media-upload.js',
  usage: 'node artifacts/scripts/create-media-upload.js --body <json>|--body-file <path> [--api-key <key>] [--base-url <url>]',
});

cli.ensureNoUnknownOptions([]);
cli.assertNoExtraPositionals(0);

const body = cli.getJsonBody({ mustBeObject: true, required: true });

mainFunction(body, cli.getRequestConfig())
  .then((result) => cli.printOutput(result))
  .catch(handleCliError);