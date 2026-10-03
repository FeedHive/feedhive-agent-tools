const { createCliContext, handleCliError } = require('./_cli');
const { apiRequest } = require('./_api');

function mainFunction(requestConfig) {
  return apiRequest({
    ...requestConfig,
    method: 'GET',
    path: '/socials',
  });
}

const cli = createCliContext({
  argv: process.argv.slice(2),
  description: 'List social accounts for the authenticated API context.',
  examples: ['node artifacts/scripts/list-socials.js'],
  scriptName: 'list-socials.js',
  usage: 'node artifacts/scripts/list-socials.js [--api-key <key>] [--base-url <url>]',
});

cli.ensureNoUnknownOptions([]);
cli.assertNoExtraPositionals(0);

mainFunction(cli.getRequestConfig())
  .then((result) => cli.printOutput(result))
  .catch(handleCliError);