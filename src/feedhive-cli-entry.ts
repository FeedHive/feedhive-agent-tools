import { executeFeedHiveCli } from './feedhive-cli';

executeFeedHiveCli({ argv: process.argv.slice(2) }).then((exitCode) => {
  process.exitCode = exitCode;
});
