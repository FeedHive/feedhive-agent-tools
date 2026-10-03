import fs from 'fs';
import os from 'os';
import path from 'path';

type FetchLike = typeof fetch;

type CliIo = {
  stderr?: (text: string) => void;
  stdout?: (text: string) => void;
};

type ParsedArgs = {
  options: Record<string, string | true>;
  positionals: string[];
};

type CommandSpec = {
  action: string;
  bodyRequired?: boolean;
  description: string;
  method: 'DELETE' | 'GET' | 'PATCH' | 'POST';
  path: (positionals: string[]) => string;
  positionalNames?: string[];
  queryOptions?: string[];
};

type ResourceSpec = {
  commands: CommandSpec[];
  description: string;
};

class CliInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliInputError';
  }
}

class ApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const commonOptions = ['api-key', 'base-url', 'body', 'body-file', 'help', 'pretty'] as const;

const encodePathSegment = (value: string): string => encodeURIComponent(value);

const resources: Record<string, ResourceSpec> = {
  posts: {
    description: 'Create, list, inspect, update, and delete posts.',
    commands: [
      {
        action: 'list',
        description: 'List posts.',
        method: 'GET',
        path: () => '/posts',
        queryOptions: ['cursor', 'labels', 'limit', 'socials', 'status'],
      },
      {
        action: 'get',
        description: 'Get one post.',
        method: 'GET',
        path: ([id]) => `/posts/${encodePathSegment(id)}`,
        positionalNames: ['post-id'],
      },
      {
        action: 'create',
        bodyRequired: true,
        description: 'Create a post.',
        method: 'POST',
        path: () => '/posts',
      },
      {
        action: 'update',
        bodyRequired: true,
        description: 'Update a post.',
        method: 'PATCH',
        path: ([id]) => `/posts/${encodePathSegment(id)}`,
        positionalNames: ['post-id'],
      },
      {
        action: 'delete',
        description: 'Delete a post.',
        method: 'DELETE',
        path: ([id]) => `/posts/${encodePathSegment(id)}`,
        positionalNames: ['post-id'],
      },
    ],
  },
  labels: {
    description: 'Create, list, inspect, update, and delete labels.',
    commands: [
      {
        action: 'list',
        description: 'List labels.',
        method: 'GET',
        path: () => '/labels',
        queryOptions: ['cursor', 'limit'],
      },
      {
        action: 'get',
        description: 'Get one label.',
        method: 'GET',
        path: ([id]) => `/labels/${encodePathSegment(id)}`,
        positionalNames: ['label-id'],
      },
      {
        action: 'create',
        bodyRequired: true,
        description: 'Create a label.',
        method: 'POST',
        path: () => '/labels',
      },
      {
        action: 'update',
        bodyRequired: true,
        description: 'Update a label.',
        method: 'PATCH',
        path: ([id]) => `/labels/${encodePathSegment(id)}`,
        positionalNames: ['label-id'],
      },
      {
        action: 'delete',
        description: 'Delete a label.',
        method: 'DELETE',
        path: ([id]) => `/labels/${encodePathSegment(id)}`,
        positionalNames: ['label-id'],
      },
    ],
  },
  media: {
    description: 'Manage media library items and upload sessions.',
    commands: [
      {
        action: 'list',
        description: 'List media items.',
        method: 'GET',
        path: () => '/media',
        queryOptions: ['cursor', 'limit', 'type'],
      },
      {
        action: 'get',
        description: 'Get one media item.',
        method: 'GET',
        path: ([id]) => `/media/${encodePathSegment(id)}`,
        positionalNames: ['media-id'],
      },
      {
        action: 'delete',
        description: 'Delete a media item.',
        method: 'DELETE',
        path: ([id]) => `/media/${encodePathSegment(id)}`,
        positionalNames: ['media-id'],
      },
      {
        action: 'create-upload',
        bodyRequired: true,
        description: 'Create a media upload session.',
        method: 'POST',
        path: () => '/media/uploads',
      },
      {
        action: 'complete-upload',
        description: 'Complete a media upload session.',
        method: 'POST',
        path: ([id]) => `/media/uploads/${encodePathSegment(id)}/complete`,
        positionalNames: ['upload-id'],
      },
    ],
  },
  socials: {
    description: 'List and inspect connected social accounts.',
    commands: [
      {
        action: 'list',
        description: 'List connected social accounts.',
        method: 'GET',
        path: () => '/socials',
        queryOptions: ['cursor', 'limit', 'platform'],
      },
      {
        action: 'get',
        description: 'Get one social account.',
        method: 'GET',
        path: ([id]) => `/socials/${encodePathSegment(id)}`,
        positionalNames: ['social-id'],
      },
    ],
  },
  analytics: {
    description: 'Read normalized post and social account analytics.',
    commands: [
      {
        action: 'post',
        description: 'Get analytics for every social publication attached to a post.',
        method: 'GET',
        path: ([id]) => `/analytics/posts/${encodePathSegment(id)}`,
        positionalNames: ['post-id'],
      },
      {
        action: 'social',
        description: 'Get the latest analytics for a connected social account.',
        method: 'GET',
        path: ([id]) => `/analytics/socials/${encodePathSegment(id)}`,
        positionalNames: ['social-id'],
      },
    ],
  },
  'plan-slots': {
    description: 'Manage plan slots and assign drafts to future slots.',
    commands: [
      {
        action: 'list',
        description: 'List plan slots.',
        method: 'GET',
        path: () => '/plan/slots',
        queryOptions: ['cursor', 'limit'],
      },
      {
        action: 'get',
        description: 'Get one plan slot.',
        method: 'GET',
        path: ([id]) => `/plan/slots/${encodePathSegment(id)}`,
        positionalNames: ['slot-id'],
      },
      {
        action: 'create',
        bodyRequired: true,
        description: 'Create a plan slot.',
        method: 'POST',
        path: () => '/plan/slots',
      },
      {
        action: 'update',
        bodyRequired: true,
        description: 'Update a plan slot.',
        method: 'PATCH',
        path: ([id]) => `/plan/slots/${encodePathSegment(id)}`,
        positionalNames: ['slot-id'],
      },
      {
        action: 'delete',
        description: 'Delete a plan slot.',
        method: 'DELETE',
        path: ([id]) => `/plan/slots/${encodePathSegment(id)}`,
        positionalNames: ['slot-id'],
      },
      {
        action: 'assign-next',
        bodyRequired: true,
        description: 'Assign draft posts to the next eligible plan slot occurrences.',
        method: 'POST',
        path: () => '/plan/assign-next',
      },
    ],
  },
};

const parseArgs = (argv: string[]): ParsedArgs => {
  const options: ParsedArgs['options'] = {};
  const positionals: string[] = [];

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
      let value: string | true = true;

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
};

const readEnvFileValue = (filePath: string, variableName: string): string | undefined => {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  let contents: string;

  try {
    contents = fs.readFileSync(filePath, 'utf8');
  } catch {
    return undefined;
  }

  const variableMatcher = new RegExp(`^\\s*(?:export\\s+)?${variableName}\\s*=\\s*(.*)\\s*$`, 'm');
  const match = contents.match(variableMatcher);

  return match?.[1]?.replace(/^['"]|['"]$/g, '').trim() || undefined;
};

const resolveApiKey = (options: ParsedArgs['options'], env: NodeJS.ProcessEnv): string => {
  const optionApiKey = options['api-key'];
  const apiKey =
    (typeof optionApiKey === 'string' ? optionApiKey : undefined) ||
    env.FEEDHIVE_API_KEY ||
    readEnvFileValue(path.join(os.homedir(), '.feedhive', 'agent-tools.env'), 'FEEDHIVE_API_KEY') ||
    readEnvFileValue(path.join(process.cwd(), '.env.local'), 'FEEDHIVE_API_KEY');

  if (!apiKey?.trim()) {
    throw new CliInputError('Missing API key. Pass --api-key <key>, set FEEDHIVE_API_KEY, or run a FeedHive setup package.');
  }

  return apiKey.trim();
};

const normalizeBaseUrl = (value: string | true | undefined, env: NodeJS.ProcessEnv): string => {
  const rawValue = typeof value === 'string' ? value : env.FEEDHIVE_BASE_URL || 'https://api.feedhive.com';

  try {
    return new URL(rawValue.endsWith('/') ? rawValue : `${rawValue}/`).toString().replace(/\/$/, '');
  } catch {
    throw new CliInputError(`Invalid base URL: ${rawValue}`);
  }
};

const parseJsonValue = (label: string, rawValue: string): unknown => {
  try {
    return JSON.parse(rawValue);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    throw new CliInputError(`${label} must contain valid JSON. ${message}`);
  }
};

const readJsonFile = (filePath: string): unknown => {
  const resolvedPath = path.resolve(process.cwd(), filePath);

  if (!fs.existsSync(resolvedPath)) {
    throw new CliInputError(`JSON file not found: ${resolvedPath}`);
  }

  return parseJsonValue(`File ${resolvedPath}`, fs.readFileSync(resolvedPath, 'utf8'));
};

const getJsonBody = (options: ParsedArgs['options'], required: boolean): unknown => {
  const body = options.body;
  const bodyFile = options['body-file'];

  if (body !== undefined && bodyFile !== undefined) {
    throw new CliInputError('Use either --body or --body-file, not both.');
  }

  if (typeof body === 'string') {
    return parseJsonValue('--body', body);
  }

  if (typeof bodyFile === 'string') {
    return readJsonFile(bodyFile);
  }

  if (required) {
    throw new CliInputError('This command requires --body <json> or --body-file <path>.');
  }

  return undefined;
};

const parsePretty = (value: string | true | undefined): boolean => {
  if (value === undefined || value === true) {
    return true;
  }

  const normalized = value.trim().toLowerCase();

  if (['1', 'true', 'yes', 'y'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'n'].includes(normalized)) {
    return false;
  }

  throw new CliInputError('Option "--pretty" must be true or false.');
};

const buildHelp = (): string => {
  const lines = [
    'FeedHive CLI',
    '',
    'Usage:',
    '  feedhive <resource> <action> [args] [options]',
    '',
    'Resources:',
  ];

  Object.entries(resources).forEach(([resourceName, resource]) => {
    lines.push(`  ${resourceName.padEnd(11)} ${resource.description}`);
    lines.push(`              actions: ${resource.commands.map((command) => command.action).join(', ')}`);
  });

  lines.push('', 'Common options:');
  lines.push('  --api-key <key>       FeedHive API key, or set FEEDHIVE_API_KEY');
  lines.push('  --base-url <url>      Override API base URL, default https://api.feedhive.com');
  lines.push('  --body <json>         Inline JSON request body');
  lines.push('  --body-file <path>    JSON request body from file');
  lines.push('  --pretty <bool>       Pretty-print JSON output, default true');
  lines.push('  --help                Show help');
  lines.push('', 'Examples:');
  lines.push('  feedhive posts list --limit 20');
  lines.push('  feedhive posts create --body-file ./post.json');
  lines.push('  feedhive socials list');
  lines.push('  feedhive analytics post post_123');
  lines.push('  feedhive analytics social social_123');

  return lines.join('\n');
};

const getAllowedOptions = (command: CommandSpec): Set<string> =>
  new Set([...commonOptions, ...(command.queryOptions || [])]);

const buildQuery = (options: ParsedArgs['options'], command: CommandSpec): Record<string, string> => {
  const query: Record<string, string> = {};

  (command.queryOptions || []).forEach((optionName) => {
    const value = options[optionName];

    if (typeof value === 'string' && value.trim()) {
      query[optionName] = value.trim();
    }
  });

  return query;
};

const buildUrl = (baseUrl: string, endpointPath: string, query: Record<string, string>): URL => {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = new URL(endpointPath.startsWith('/') ? endpointPath.slice(1) : endpointPath, normalizedBaseUrl);

  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  return url;
};

const parseResponse = async (response: Response): Promise<unknown> => {
  const rawText = await response.text();

  if (!rawText) {
    return undefined;
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return rawText;
  }
};

const assertKnownOptions = (options: ParsedArgs['options'], command: CommandSpec): void => {
  const allowedOptions = getAllowedOptions(command);

  Object.keys(options).forEach((optionName) => {
    if (!allowedOptions.has(optionName)) {
      throw new CliInputError(`Unknown option "--${optionName}" for ${command.action}.`);
    }
  });
};

const resolveCommand = (resourceName: string | undefined, action: string | undefined): [string, CommandSpec] => {
  if (!resourceName || !action) {
    throw new CliInputError('Missing resource or action. Run `feedhive --help`.');
  }

  const resource = resources[resourceName];

  if (!resource) {
    throw new CliInputError(`Unknown resource "${resourceName}". Run \`feedhive --help\`.`);
  }

  const command = resource.commands.find((candidate) => candidate.action === action);

  if (!command) {
    throw new CliInputError(`Unknown action "${action}" for ${resourceName}. Run \`feedhive --help\`.`);
  }

  return [resourceName, command];
};

const runApiCommand = async ({
  argv,
  env,
  fetchImpl,
}: {
  argv: string[];
  env: NodeJS.ProcessEnv;
  fetchImpl: FetchLike;
}): Promise<unknown> => {
  const parsed = parseArgs(argv);

  if (parsed.options.help || parsed.positionals.length === 0) {
    return buildHelp();
  }

  const [, command] = resolveCommand(parsed.positionals[0], parsed.positionals[1]);
  const commandPositionals = parsed.positionals.slice(2);
  const requiredPositionals = command.positionalNames || [];

  assertKnownOptions(parsed.options, command);

  if (commandPositionals.length < requiredPositionals.length) {
    throw new CliInputError(`Missing ${requiredPositionals[commandPositionals.length]}.`);
  }

  if (commandPositionals.length > requiredPositionals.length) {
    throw new CliInputError(`Unexpected positional arguments: ${commandPositionals.slice(requiredPositionals.length).join(', ')}.`);
  }

  const apiKey = resolveApiKey(parsed.options, env);
  const baseUrl = normalizeBaseUrl(parsed.options['base-url'], env);
  const url = buildUrl(baseUrl, command.path(commandPositionals), buildQuery(parsed.options, command));
  const body = getJsonBody(parsed.options, command.bodyRequired === true);
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  const init: RequestInit = {
    headers,
    method: command.method,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body);
  }

  let response: Response;

  try {
    response = await fetchImpl(url, init);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new ApiError(`Unable to reach ${url.toString()}. ${message}`);
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    const payloadMessage = payload && typeof payload === 'object' && 'message' in payload ? String(payload.message) : undefined;
    const payloadCode = payload && typeof payload === 'object' && 'code' in payload ? String(payload.code) : undefined;
    const message = payloadCode === onboardingPlanRequiredCode && payloadMessage
      ? payloadMessage
      : `${command.method} ${url.pathname}${url.search} failed with ${response.status} ${response.statusText}: ${payloadMessage || response.statusText || 'Request failed'}`;

    throw new ApiError(message, response.status);
  }

  if (payload && typeof payload === 'object' && 'success' in payload && payload.success === false) {
    const payloadMessage = 'message' in payload ? String(payload.message) : 'success=false';
    throw new ApiError(payloadMessage, response.status);
  }

  return payload;
};

const onboardingPlanRequiredCode = 'ONBOARDING_PLAN_REQUIRED';

const formatOutput = (result: unknown, pretty: boolean): string => {
  if (typeof result === 'string') {
    return result;
  }

  if (result === undefined) {
    return '';
  }

  return JSON.stringify(result, null, pretty ? 2 : 0);
};

export const executeFeedHiveCli = async ({
  argv,
  env = process.env,
  fetchImpl = fetch,
  stderr = (text: string) => console.error(text),
  stdout = (text: string) => console.log(text),
}: {
  argv: string[];
  env?: NodeJS.ProcessEnv;
  fetchImpl?: FetchLike;
} & CliIo): Promise<number> => {
  try {
    const parsed = parseArgs(argv);
    const result = await runApiCommand({ argv, env, fetchImpl });
    const output = formatOutput(result, parsePretty(parsed.options.pretty));

    if (output) {
      stdout(output);
    }

    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    stderr(`Error: ${message}`);
    return error instanceof CliInputError ? 2 : 1;
  }
};

export const feedHiveCliInternals = {
  buildHelp,
  parseArgs,
  resources,
};
