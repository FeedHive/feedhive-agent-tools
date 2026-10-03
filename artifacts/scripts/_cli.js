const fs = require('fs');
const path = require('path');

class CliInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CliInputError';
  }
}

function parseArgs(argv) {
  const options = {};
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--') {
      positionals.push(...argv.slice(index + 1));
      break;
    }

    if (token.startsWith('--')) {
      const optionToken = token.slice(2);

      if (!optionToken) {
        throw new CliInputError('Received an empty option name.');
      }

      const equalsIndex = optionToken.indexOf('=');
      let name = optionToken;
      let value = true;

      if (equalsIndex >= 0) {
        name = optionToken.slice(0, equalsIndex);
        value = optionToken.slice(equalsIndex + 1);
      } else {
        const nextToken = argv[index + 1];

        if (nextToken !== undefined && !nextToken.startsWith('-')) {
          value = nextToken;
          index += 1;
        }
      }

      if (Object.prototype.hasOwnProperty.call(options, name)) {
        throw new CliInputError(`Option "--${name}" was provided more than once.`);
      }

      options[name] = value;
      continue;
    }

    if (token.startsWith('-') && token !== '-') {
      throw new CliInputError(`Short options are not supported: "${token}".`);
    }

    positionals.push(token);
  }

  return { options, positionals };
}

function formatUsage({ scriptName, description, usage, examples }) {
  const lines = [];

  if (description) {
    lines.push(description);
    lines.push('');
  }

  lines.push('Usage:');
  lines.push(`  ${usage || `node artifacts/scripts/${scriptName}`}`);

  if (examples && examples.length > 0) {
    lines.push('');
    lines.push('Examples:');

    examples.forEach((example) => {
      lines.push(`  ${example}`);
    });
  }

  lines.push('');
  lines.push('Common options:');
  lines.push('  --api-key <key>         FeedHive API key, or set FEEDHIVE_API_KEY');
  lines.push('  --base-url <url>        Override API base URL, default https://api.feedhive.com');
  lines.push('  --body <json>           Inline JSON request body');
  lines.push('  --body-file <path>      Path to a JSON file for the request body');
  lines.push('  --pretty <true|false>   Pretty-print JSON output, default true');
  lines.push('  --help                  Show this help message');

  return lines.join('\n');
}

function readEnvFileValue(filePath, variableName) {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  let contents;

  try {
    contents = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return undefined;
  }

  const variableMatcher = new RegExp(`^\\s*(?:export\\s+)?${variableName}\\s*=\\s*(.*)\\s*$`, 'm');
  const match = contents.match(variableMatcher);

  if (!match) {
    return undefined;
  }

  return match[1].replace(/^['"]|['"]$/g, '').trim() || undefined;
}

function resolveApiKeyFromEnvironment() {
  return process.env.FEEDHIVE_API_KEY
    || readEnvFileValue(path.join(process.env.HOME || '', '.feedhive', 'agent-tools.env'), 'FEEDHIVE_API_KEY')
    || readEnvFileValue(path.join(process.cwd(), '.env.local'), 'FEEDHIVE_API_KEY');
}

function normalizeBaseUrl(value) {
  const baseUrl = value || process.env.FEEDHIVE_BASE_URL || 'https://api.feedhive.com';

  if (typeof baseUrl !== 'string' || !baseUrl.trim()) {
    throw new CliInputError('Base URL must be a non-empty string.');
  }

  const trimmed = baseUrl.trim();

  try {
    return new URL(trimmed.endsWith('/') ? trimmed : `${trimmed}/`).toString().replace(/\/$/, '');
  } catch (error) {
    throw new CliInputError(`Invalid base URL: ${trimmed}`);
  }
}

function parseBooleanValue(name, value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === undefined) {
    return false;
  }

  const normalized = String(value).trim().toLowerCase();

  if (['true', '1', 'yes', 'y'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'n'].includes(normalized)) {
    return false;
  }

  throw new CliInputError(`Option "--${name}" must be a boolean value.`);
}

function parseIntegerValue(name, value) {
  if (value === undefined) {
    return undefined;
  }

  const normalized = String(value).trim();

  if (!/^\d+$/.test(normalized)) {
    throw new CliInputError(`Option "--${name}" must be a positive integer.`);
  }

  const parsed = Number(normalized);

  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new CliInputError(`Option "--${name}" must be a positive integer.`);
  }

  return parsed;
}

function parseJsonValue(label, rawValue) {
  try {
    return JSON.parse(rawValue);
  } catch (error) {
    throw new CliInputError(`${label} must contain valid JSON. ${error.message}`);
  }
}

function readJsonFile(filePath) {
  const resolvedPath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new CliInputError(`JSON file not found: ${resolvedPath}`);
  }

  let fileContents;

  try {
    fileContents = fs.readFileSync(resolvedPath, 'utf8');
  } catch (error) {
    throw new CliInputError(`Unable to read JSON file ${resolvedPath}. ${error.message}`);
  }

  return parseJsonValue(`File ${resolvedPath}`, fileContents);
}

function ensureJsonBody(value, { label, mustBeObject }) {
  if (mustBeObject) {
    const isObject = value !== null && typeof value === 'object' && !Array.isArray(value);

    if (!isObject) {
      throw new CliInputError(`${label} must be a JSON object.`);
    }
  }

  return value;
}

function createCliContext({ argv, scriptName, description, usage, examples }) {
  const parsed = parseArgs(argv);

  const context = {
    description,
    examples,
    options: parsed.options,
    positionals: parsed.positionals,
    scriptName,
    usage,
    assertNoExtraPositionals(expectedCount) {
      if (this.positionals.length > expectedCount) {
        const extras = this.positionals.slice(expectedCount).join(', ');
        throw new CliInputError(`Unexpected positional arguments: ${extras}`);
      }
    },
    ensureNoUnknownOptions(allowedOptionNames) {
      const allowed = new Set([
        'api-key',
        'base-url',
        'body',
        'body-file',
        'help',
        'pretty',
        ...allowedOptionNames,
      ]);

      Object.keys(this.options).forEach((name) => {
        if (!allowed.has(name)) {
          throw new CliInputError(`Unknown option "--${name}".`);
        }
      });
    },
    getApiKey() {
      const apiKey = this.options['api-key'] || resolveApiKeyFromEnvironment();

      if (typeof apiKey !== 'string' || !apiKey.trim()) {
        throw new CliInputError(
          'Missing API key. Pass --api-key <key>, set FEEDHIVE_API_KEY, or run the FeedHive setup package.'
        );
      }

      return apiKey.trim();
    },
    getBaseUrl() {
      return normalizeBaseUrl(this.options['base-url']);
    },
    getJsonBody({ required = false, mustBeObject = true } = {}) {
      const inlineBody = this.options.body;
      const bodyFile = this.options['body-file'];

      if (inlineBody !== undefined && bodyFile !== undefined) {
        throw new CliInputError('Use either --body or --body-file, not both.');
      }

      if (inlineBody === undefined && bodyFile === undefined) {
        if (required) {
          throw new CliInputError('Missing request body. Pass --body <json> or --body-file <path>.');
        }

        return undefined;
      }

      if (inlineBody !== undefined) {
        return ensureJsonBody(parseJsonValue('Option --body', String(inlineBody)), {
          label: 'Option --body',
          mustBeObject,
        });
      }

      return ensureJsonBody(readJsonFile(String(bodyFile)), {
        label: `File ${path.resolve(process.cwd(), String(bodyFile))}`,
        mustBeObject,
      });
    },
    getOptionalBooleanOption(name, defaultValue = undefined) {
      const value = this.options[name];

      if (value === undefined) {
        return defaultValue;
      }

      return parseBooleanValue(name, value);
    },
    getOptionalIntegerOption(name) {
      return parseIntegerValue(name, this.options[name]);
    },
    getOptionalStringOption(name) {
      const value = this.options[name];

      if (value === undefined) {
        return undefined;
      }

      const normalized = String(value).trim();

      if (!normalized) {
        throw new CliInputError(`Option "--${name}" must be a non-empty string.`);
      }

      return normalized;
    },
    getOutputOptions() {
      return {
        pretty: this.getOptionalBooleanOption('pretty', true),
      };
    },
    getRequestConfig() {
      return {
        apiKey: this.getApiKey(),
        baseUrl: this.getBaseUrl(),
      };
    },
    printHelp() {
      console.log(formatUsage({
        scriptName: this.scriptName,
        description: this.description,
        usage: this.usage,
        examples: this.examples,
      }));
    },
    printOutput(value) {
      const { pretty } = this.getOutputOptions();

      if (typeof value === 'string') {
        console.log(value);
        return;
      }

      if (value === undefined) {
        return;
      }

      console.log(JSON.stringify(value, null, pretty ? 2 : 0));
    },
    requirePositional(index, label) {
      const value = this.positionals[index];

      if (value === undefined || String(value).trim() === '') {
        throw new CliInputError(`Missing required positional argument: ${label}.`);
      }

      return String(value).trim();
    },
  };

  if (context.options.help) {
    context.printHelp();
    process.exit(0);
  }

  return context;
}

function handleCliError(error) {
  if (error instanceof CliInputError) {
    console.error(`Input error: ${error.message}`);
    console.error('Run with --help for usage details.');
    process.exit(1);
  }

  const message = error && error.message ? error.message : 'Unknown error';
  console.error(`Error: ${message}`);

  if (error && error.responseBody !== undefined) {
    try {
      console.error(JSON.stringify(error.responseBody, null, 2));
    } catch (serializationError) {
      console.error(String(error.responseBody));
    }
  }

  process.exit(1);
}

module.exports = {
  CliInputError,
  createCliContext,
  handleCliError,
};