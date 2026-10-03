const { createCliContext, handleCliError } = require('./_cli');
const { apiRequest, encodePathSegment } = require('./_api');

function mainFunction(mediaId, requestConfig) {
  return apiRequest({
    ...requestConfig,
    method: 'DELETE',
    path: `/media/${encodePathSegment(mediaId)}`,
  });
}

const cli = createCliContext({
  argv: process.argv.slice(2),
  description: 'Delete a media item by ID.',
  examples: ['node artifacts/scripts/delete-media.js med_abc123'],
  scriptName: 'delete-media.js',
  usage: 'node artifacts/scripts/delete-media.js <media-id> [--api-key <key>] [--base-url <url>]',
});

cli.ensureNoUnknownOptions([]);

const mediaId = cli.requirePositional(0, 'media-id');

cli.assertNoExtraPositionals(1);

mainFunction(mediaId, cli.getRequestConfig())
  .then((result) => cli.printOutput(result))
  .catch(handleCliError);