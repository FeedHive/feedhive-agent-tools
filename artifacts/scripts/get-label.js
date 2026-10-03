const { createCliContext, handleCliError } = require('./_cli');
const { apiRequest, encodePathSegment } = require('./_api');

function mainFunction(labelId, requestConfig) {
  return apiRequest({
    ...requestConfig,
    method: 'GET',
    path: `/labels/${encodePathSegment(labelId)}`,
  });
}

const cli = createCliContext({
  argv: process.argv.slice(2),
  description: 'Fetch a single label by ID.',
  examples: ['node artifacts/scripts/get-label.js lbl_abc'],
  scriptName: 'get-label.js',
  usage: 'node artifacts/scripts/get-label.js <label-id> [--api-key <key>] [--base-url <url>]',
});

cli.ensureNoUnknownOptions([]);

const labelId = cli.requirePositional(0, 'label-id');

cli.assertNoExtraPositionals(1);

mainFunction(labelId, cli.getRequestConfig())
  .then((result) => cli.printOutput(result))
  .catch(handleCliError);