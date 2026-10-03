const { createCliContext, handleCliError } = require('./_cli');
const { apiRequest, encodePathSegment } = require('./_api');

function mainFunction(postId, body, requestConfig) {
  return apiRequest({
    ...requestConfig,
    body,
    method: 'PATCH',
    path: `/posts/${encodePathSegment(postId)}`,
  });
}

const cli = createCliContext({
  argv: process.argv.slice(2),
  description: 'Update a post by ID using the documented PATCH /posts/:id body.',
  examples: [
    'node artifacts/scripts/update-post.js post_123 --body-file ./post-update.json',
    'node artifacts/scripts/update-post.js post_123 --body \'{"thumbnail_media_id":"med_thumbnail"}\'',
  ],
  scriptName: 'update-post.js',
  usage: 'node artifacts/scripts/update-post.js <post-id> --body <json>|--body-file <path> [--api-key <key>] [--base-url <url>]',
});

cli.ensureNoUnknownOptions([]);

const postId = cli.requirePositional(0, 'post-id');
const body = cli.getJsonBody({ mustBeObject: true, required: true });

cli.assertNoExtraPositionals(1);

mainFunction(postId, body, cli.getRequestConfig())
  .then((result) => cli.printOutput(result))
  .catch(handleCliError);
