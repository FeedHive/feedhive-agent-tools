export type InstallSource = 'openclaw' | 'claude_code' | 'feedhive_cli';

export type ApiTokenValidationWarning = {
  code: 'ONBOARDING_PLAN_REQUIRED';
  message: string;
};

export type ApiTokenValidationResult = {
  warning?: ApiTokenValidationWarning;
};

const statusEndpointBase = 'https://api.feedhive.com/status';

const buildStatusEndpoint = (installSource: InstallSource) => {
  const url = new URL(statusEndpointBase);
  url.searchParams.set('install_source', installSource);
  return url.toString();
};

type StatusResponse = {
  code?: string;
  message?: string;
  success?: boolean;
  warning?: ApiTokenValidationWarning;
};

const parseStatusResponse = async (response: Response): Promise<StatusResponse | string | undefined> => {
  const rawBody = await response.text();

  if (!rawBody) {
    return undefined;
  }

  try {
    return JSON.parse(rawBody) as StatusResponse;
  } catch {
    return rawBody;
  }
};

const getStatusErrorMessage = (response: Response, payload: StatusResponse | string | undefined): string => {
  if (payload && typeof payload === 'object' && typeof payload.message === 'string') {
    return payload.message;
  }

  if (typeof payload === 'string' && payload.trim()) {
    return payload;
  }

  return response.statusText || 'Request failed';
};

const onboardingPlanRequiredCode = 'ONBOARDING_PLAN_REQUIRED';

const getValidationWarning = (payload: StatusResponse | string | undefined): ApiTokenValidationWarning | undefined => {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }

  if (payload.warning?.code === onboardingPlanRequiredCode) {
    return payload.warning;
  }

  if (payload.code === onboardingPlanRequiredCode && typeof payload.message === 'string') {
    return {
      code: onboardingPlanRequiredCode,
      message: payload.message,
    };
  }

  return undefined;
};

export const validateApiToken = async (
  apiToken: string,
  installSource: InstallSource = 'openclaw'
): Promise<ApiTokenValidationResult> => {
  const normalizedApiToken = apiToken.trim();

  if (!normalizedApiToken) {
    throw new Error('Missing FeedHive API token.');
  }

  const statusEndpoint = buildStatusEndpoint(installSource);

  let response: Response;

  try {
    response = await fetch(statusEndpoint, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${normalizedApiToken}`,
      },
      method: 'GET',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Unable to reach ${statusEndpoint}. ${message}`);
  }

  const payload = await parseStatusResponse(response);

  const warning = getValidationWarning(payload);

  if (!response.ok) {
    if (warning) {
      return { warning };
    }

    throw new Error(getStatusErrorMessage(response, payload));
  }

  if (!payload || typeof payload !== 'object' || payload.success !== true) {
    const message =
      payload && typeof payload === 'object' && typeof payload.message === 'string'
        ? payload.message
        : 'FeedHive API token validation failed.';

    throw new Error(message);
  }

  return { warning };
};
