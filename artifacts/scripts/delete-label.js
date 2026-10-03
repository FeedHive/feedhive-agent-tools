const { createCliContext, handleCliError } = require('./_cli');
const { apiRequest, encodePathSegment } = require('./_api');

function mainFunction(labelId, requestConfig) {
  return apiRequest({
    ...requestConfig,
    method: 'DELETE',
    path: `/labels/${encodePathSegment(labelId)}`,
  });
}

const cli = createCliContext({
  argv: process.argv.slice(2),
  description: 'Delete a label by ID.',
  examples: ['node artifacts/scripts/delete-label.js lbl_abc'],
  scriptName: 'delete-label.js',
  usage: 'node artifacts/scripts/delete-label.js <label-id> [--api-key <key>] [--base-url <url>]',
});

cli.ensureNoUnknownOptions([]);

const labelId = cli.requirePositional(0, 'label-id');

cli.assertNoExtraPositionals(1);

mainFunction(labelId, cli.getRequestConfig())
  .then((result) => cli.printOutput(result))
  .catch(handleCliError);