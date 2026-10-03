const { createCliContext, handleCliError } = require('./_cli');
const { apiRequest } = require('./_api');

function mainFunction(body, requestConfig) {
  return apiRequest({
    ...requestConfig,
    body,
    method: 'POST',
    path: '/plan/assign-next',
  });
}

const cli = createCliContext({
  argv: process.argv.slice(2),
  description: 'Assign draft posts to the next eligible plan slot occurrences.',
  examples: [
    'node artifacts/scripts/assign-next-posts.js --body "{\"post_ids\":[\"post_1\",\"post_2\"]}"',
  ],
  scriptName: 'assign-next-posts.js',
  usage: 'node artifacts/scripts/assign-next-posts.js --body <json>|--body-file <path> [--api-key <key>] [--base-url <url>]',
});

cli.ensureNoUnknownOptions([]);
cli.assertNoExtraPositionals(0);

const body = cli.getJsonBody({ mustBeObject: true, required: true });

mainFunction(body, cli.getRequestConfig())
  .then((result) => cli.printOutput(result))
  .catch(handleCliError);