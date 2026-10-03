const { createCliContext, handleCliError } = require('./_cli');
const { apiRequest, encodePathSegment } = require('./_api');

function mainFunction(slotId, body, requestConfig) {
  return apiRequest({
    ...requestConfig,
    body,
    method: 'PATCH',
    path: `/plan/slots/${encodePathSegment(slotId)}`,
  });
}

const cli = createCliContext({
  argv: process.argv.slice(2),
  description: 'Update a plan slot by ID using the documented PATCH /plan/slots/:id body.',
  examples: [
    'node artifacts/scripts/update-plan-slot.js slot_123 --body-file ./plan-slot-update.json',
  ],
  scriptName: 'update-plan-slot.js',
  usage: 'node artifacts/scripts/update-plan-slot.js <slot-id> --body <json>|--body-file <path> [--api-key <key>] [--base-url <url>]',
});

cli.ensureNoUnknownOptions([]);

const slotId = cli.requirePositional(0, 'slot-id');
const body = cli.getJsonBody({ mustBeObject: true, required: true });

cli.assertNoExtraPositionals(1);

mainFunction(slotId, body, cli.getRequestConfig())
  .then((result) => cli.printOutput(result))
  .catch(handleCliError);