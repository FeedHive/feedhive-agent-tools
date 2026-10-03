const { createCliContext, handleCliError } = require('./_cli');
const { apiRequest } = require('./_api');

function mainFunction(query, requestConfig) {
  return apiRequest({
    ...requestConfig,
    method: 'GET',
    path: '/labels',
    query,
  });
}

const cli = createCliContext({
  argv: process.argv.slice(2),
  description: 'List labels for the authenticated API context.',
  examples: ['node artifacts/scripts/list-labels.js --limit 50'],
  scriptName: 'list-labels.js',
  usage: 'node artifacts/scripts/list-labels.js [--limit <number>] [--cursor <cursor>] [--api-key <key>] [--base-url <url>]',
});

cli.ensureNoUnknownOptions(['cursor', 'limit']);
cli.assertNoExtraPositionals(0);

const query = {
  cursor: cli.getOptionalStringOption('cursor'),
  limit: cli.getOptionalIntegerOption('limit'),
};

mainFunction(query, cli.getRequestConfig())
  .then((result) => cli.printOutput(result))
  .catch(handleCliError);