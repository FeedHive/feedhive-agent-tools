const { createCliContext, handleCliError } = require('./_cli');
const { apiRequest, encodePathSegment } = require('./_api');

function mainFunction(uploadId, requestConfig) {
  return apiRequest({
    ...requestConfig,
    method: 'POST',
    path: `/media/uploads/${encodePathSegment(uploadId)}/complete`,
  });
}

const cli = createCliContext({
  argv: process.argv.slice(2),
  description: 'Complete a media upload session using POST /media/uploads/:id/complete.',
  examples: ['node artifacts/scripts/complete-media-upload.js upl_xyz'],
  scriptName: 'complete-media-upload.js',
  usage: 'node artifacts/scripts/complete-media-upload.js <upload-id> [--api-key <key>] [--base-url <url>]',
});

cli.ensureNoUnknownOptions([]);

const uploadId = cli.requirePositional(0, 'upload-id');

cli.assertNoExtraPositionals(1);

mainFunction(uploadId, cli.getRequestConfig())
  .then((result) => cli.printOutput(result))
  .catch(handleCliError);