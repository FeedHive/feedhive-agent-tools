const { createCliContext, handleCliError } = require('./_cli');
const { apiRequest, encodePathSegment } = require('./_api');

function mainFunction(slotId, requestConfig) {
  return apiRequest({
    ...requestConfig,
    method: 'DELETE',
    path: `/plan/slots/${encodePathSegment(slotId)}`,
  });
}

const cli = createCliContext({
  argv: process.argv.slice(2),
  description: 'Delete a plan slot by ID.',
  examples: ['node artifacts/scripts/delete-plan-slot.js slot_123'],
  scriptName: 'delete-plan-slot.js',
  usage: 'node artifacts/scripts/delete-plan-slot.js <slot-id> [--api-key <key>] [--base-url <url>]',
});

cli.ensureNoUnknownOptions([]);

const slotId = cli.requirePositional(0, 'slot-id');

cli.assertNoExtraPositionals(1);

mainFunction(slotId, cli.getRequestConfig())
  .then((result) => cli.printOutput(result))
  .catch(handleCliError);