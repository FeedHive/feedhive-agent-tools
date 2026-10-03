const { createCliContext, handleCliError } = require('./_cli');
const { apiRequest, encodePathSegment } = require('./_api');

function mainFunction(labelId, body, requestConfig) {
  return apiRequest({
    ...requestConfig,
    body,
    method: 'PATCH',
    path: `/labels/${encodePathSegment(labelId)}`,
  });
}

const cli = createCliContext({
  argv: process.argv.slice(2),
  description: 'Update a label by ID using the documented PATCH /labels/:id body.',
  examples: [
    'node artifacts/scripts/update-label.js lbl_abc --body "{\"title\":\"Campaign Q1\"}"',
  ],
  scriptName: 'update-label.js',
  usage: 'node artifacts/scripts/update-label.js <label-id> --body <json>|--body-file <path> [--api-key <key>] [--base-url <url>]',
});

cli.ensureNoUnknownOptions([]);

const labelId = cli.requirePositional(0, 'label-id');
const body = cli.getJsonBody({ mustBeObject: true, required: true });

cli.assertNoExtraPositionals(1);

mainFunction(labelId, body, cli.getRequestConfig())
  .then((result) => cli.printOutput(result))
  .catch(handleCliError);