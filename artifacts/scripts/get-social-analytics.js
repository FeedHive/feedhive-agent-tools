const { createCliContext, handleCliError } = require('./_cli');
const { apiRequest, encodePathSegment } = require('./_api');

function mainFunction(socialId, requestConfig) {
  return apiRequest({
    ...requestConfig,
    method: 'GET',
    path: `/analytics/socials/${encodePathSegment(socialId)}`,
  });
}

const cli = createCliContext({
  argv: process.argv.slice(2),
  description: 'Fetch the latest normalized analytics for a connected social account.',
  examples: ['node artifacts/scripts/get-social-analytics.js social_123'],
  scriptName: 'get-social-analytics.js',
  usage: 'node artifacts/scripts/get-social-analytics.js <social-id> [--api-key <key>] [--base-url <url>]',
});

cli.ensureNoUnknownOptions([]);
const socialId = cli.requirePositional(0, 'social-id');
cli.assertNoExtraPositionals(1);

mainFunction(socialId, cli.getRequestConfig())
  .then((result) => cli.printOutput(result))
  .catch(handleCliError);
