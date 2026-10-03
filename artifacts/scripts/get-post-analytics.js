const { createCliContext, handleCliError } = require('./_cli');
const { apiRequest, encodePathSegment } = require('./_api');

function mainFunction(postId, requestConfig) {
  return apiRequest({
    ...requestConfig,
    method: 'GET',
    path: `/analytics/posts/${encodePathSegment(postId)}`,
  });
}

const cli = createCliContext({
  argv: process.argv.slice(2),
  description: 'Fetch normalized analytics for every social publication attached to a FeedHive post.',
  examples: ['node artifacts/scripts/get-post-analytics.js post_123'],
  scriptName: 'get-post-analytics.js',
  usage: 'node artifacts/scripts/get-post-analytics.js <post-id> [--api-key <key>] [--base-url <url>]',
});

cli.ensureNoUnknownOptions([]);
const postId = cli.requirePositional(0, 'post-id');
cli.assertNoExtraPositionals(1);

mainFunction(postId, cli.getRequestConfig())
  .then((result) => cli.printOutput(result))
  .catch(handleCliError);
