const { createCliContext, handleCliError } = require('./_cli');
const { apiRequest, encodePathSegment } = require('./_api');

function mainFunction(postId, requestConfig) {
  return apiRequest({
    ...requestConfig,
    method: 'GET',
    path: `/posts/${encodePathSegment(postId)}`,
  });
}

const cli = createCliContext({
  argv: process.argv.slice(2),
  description: 'Fetch a single post by ID.',
  examples: ['node artifacts/scripts/get-post.js post_123'],
  scriptName: 'get-post.js',
  usage: 'node artifacts/scripts/get-post.js <post-id> [--api-key <key>] [--base-url <url>]',
});

cli.ensureNoUnknownOptions([]);

const postId = cli.requirePositional(0, 'post-id');

cli.assertNoExtraPositionals(1);

mainFunction(postId, cli.getRequestConfig())
  .then((result) => cli.printOutput(result))
  .catch(handleCliError);