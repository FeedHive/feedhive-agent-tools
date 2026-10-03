const { createCliContext, handleCliError } = require('./_cli');
const { apiRequest } = require('./_api');

function mainFunction(body, requestConfig) {
  return apiRequest({
    ...requestConfig,
    body,
    method: 'POST',
    path: '/plan/slots',
  });
}

const cli = createCliContext({
  argv: process.argv.slice(2),
  description: 'Create a plan slot using the documented POST /plan/slots request body.',
  examples: [
    'node artifacts/scripts/create-plan-slot.js --body-file ./plan-slot.json',
  ],
  scriptName: 'create-plan-slot.js',
  usage: 'node artifacts/scripts/create-plan-slot.js --body <json>|--body-file <path> [--api-key <key>] [--base-url <url>]',
});

cli.ensureNoUnknownOptions([]);
cli.assertNoExtraPositionals(0);

const body = cli.getJsonBody({ mustBeObject: true, required: true });

mainFunction(body, cli.getRequestConfig())
  .then((result) => cli.printOutput(result))
  .catch(handleCliError);