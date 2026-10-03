const { createCliContext, handleCliError } = require('./_cli');
const { apiRequest, encodePathSegment } = require('./_api');

function mainFunction(mediaId, requestConfig) {
  return apiRequest({
    ...requestConfig,
    method: 'GET',
    path: `/media/${encodePathSegment(mediaId)}`,
  });
}

const cli = createCliContext({
  argv: process.argv.slice(2),
  description: 'Fetch a single media item by ID.',
  examples: ['node artifacts/scripts/get-media.js med_abc123'],
  scriptName: 'get-media.js',
  usage: 'node artifacts/scripts/get-media.js <media-id> [--api-key <key>] [--base-url <url>]',
});

cli.ensureNoUnknownOptions([]);

const mediaId = cli.requirePositional(0, 'media-id');

cli.assertNoExtraPositionals(1);

mainFunction(mediaId, cli.getRequestConfig())
  .then((result) => cli.printOutput(result))
  .catch(handleCliError);