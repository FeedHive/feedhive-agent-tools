const { createCliContext, handleCliError } = require('./_cli');
const { apiRequest } = require('./_api');

function mainFunction(body, requestConfig) {
  return apiRequest({
    ...requestConfig,
    body,
    method: 'POST',
    path: '/posts',
  });
}

const cli = createCliContext({
  argv: process.argv.slice(2),
  description: 'Create a post using the documented POST /posts request body.',
  examples: [
    'node artifacts/scripts/create-post.js --body-file ./post.json',
    'node artifacts/scripts/create-post.js --body \'{"text":"Watch this","media":["med_video"],"thumbnail_media_id":"med_thumbnail","accounts":["youtube_account"],"publish_type":"short"}\'',
  ],
  scriptName: 'create-post.js',
  usage: 'node artifacts/scripts/create-post.js --body <json>|--body-file <path> [--api-key <key>] [--base-url <url>]',
});

cli.ensureNoUnknownOptions([]);
cli.assertNoExtraPositionals(0);

const body = cli.getJsonBody({ mustBeObject: true, required: true });

mainFunction(body, cli.getRequestConfig())
  .then((result) => cli.printOutput(result))
  .catch(handleCliError);
