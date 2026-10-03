const { createCliContext, handleCliError } = require('./_cli');
const { apiRequest } = require('./_api');

function mainFunction(query, requestConfig) {
  return apiRequest({
    ...requestConfig,
    method: 'GET',
    path: '/posts',
    query,
  });
}

const cli = createCliContext({
  argv: process.argv.slice(2),
  description: 'List posts for the authenticated API context.',
  examples: [
    'node artifacts/scripts/list-posts.js --limit 20 --status draft,scheduled',
  ],
  scriptName: 'list-posts.js',
  usage: 'node artifacts/scripts/list-posts.js [--limit <number>] [--cursor <cursor>] [--status <csv>] [--labels <csv>] [--socials <csv>] [--api-key <key>] [--base-url <url>]',
});

cli.ensureNoUnknownOptions(['cursor', 'labels', 'limit', 'socials', 'status']);
cli.assertNoExtraPositionals(0);

const query = {
  cursor: cli.getOptionalStringOption('cursor'),
  labels: cli.getOptionalStringOption('labels'),
  limit: cli.getOptionalIntegerOption('limit'),
  socials: cli.getOptionalStringOption('socials'),
  status: cli.getOptionalStringOption('status'),
};

mainFunction(query, cli.getRequestConfig())
  .then((result) => cli.printOutput(result))
  .catch(handleCliError);