const { createCliContext, handleCliError } = require('./_cli');
const { apiRequest } = require('./_api');

function mainFunction(body, requestConfig) {
  return apiRequest({
    ...requestConfig,
    body,
    method: 'POST',
    path: '/labels',
  });
}

const cli = createCliContext({
  argv: process.argv.slice(2),
  description: 'Create a label using the documented POST /labels request body.',
  examples: [
    'node artifacts/scripts/create-label.js --body "{\"title\":\"Campaign Q4\"}"',
  ],
  scriptName: 'create-label.js',
  usage: 'node artifacts/scripts/create-label.js --body <json>|--body-file <path> [--api-key <key>] [--base-url <url>]',
});

cli.ensureNoUnknownOptions([]);
cli.assertNoExtraPositionals(0);

const body = cli.getJsonBody({ mustBeObject: true, required: true });

mainFunction(body, cli.getRequestConfig())
  .then((result) => cli.printOutput(result))
  .catch(handleCliError);