class ApiError extends Error {
  constructor(message, { method, path, responseBody, status, statusText } = {}) {
    super(message);
    this.name = 'ApiError';
    this.method = method;
    this.path = path;
    this.responseBody = responseBody;
    this.status = status;
    this.statusText = statusText;
  }
}

function encodePathSegment(value) {
  return encodeURIComponent(String(value));
}

function buildUrl(baseUrl, endpointPath, query) {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedPath = endpointPath.startsWith('/') ? endpointPath.slice(1) : endpointPath;
  const url = new URL(normalizedPath, normalizedBaseUrl);

  if (query && typeof query === 'object') {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        return;
      }

      if (Array.isArray(value)) {
        if (value.length > 0) {
          url.searchParams.set(key, value.join(','));
        }
        return;
      }

      url.searchParams.set(key, String(value));
    });
  }

  return url;
}

function buildApiErrorMessage(method, url, response, payload) {
  const payloadMessage = payload && typeof payload === 'object' && 'message' in payload
    ? payload.message
    : undefined;
  const suffix = payloadMessage || response.statusText || 'Request failed';

  return `${method} ${url.pathname}${url.search} failed with ${response.status} ${response.statusText}: ${suffix}`;
}

async function parseResponse(response) {
  const rawText = await response.text();

  if (!rawText) {
    return undefined;
  }

  try {
    return JSON.parse(rawText);
  } catch (error) {
    return rawText;
  }
}

async function apiRequest({ apiKey, baseUrl, body, headers, method, path, query }) {
  const url = buildUrl(baseUrl, path, query);
  const requestHeaders = {
    Accept: 'application/json',
    Authorization: `Bearer ${apiKey}`,
    ...headers,
  };
  const requestInit = {
    headers: requestHeaders,
    method,
  };

  if (body !== undefined) {
    requestHeaders['Content-Type'] = 'application/json';
    requestInit.body = JSON.stringify(body);
  }

  let response;

  try {
    response = await fetch(url, requestInit);
  } catch (error) {
    throw new ApiError(`Unable to reach ${url.toString()}. ${error.message}`, {
      method,
      path,
    });
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new ApiError(buildApiErrorMessage(method, url, response, payload), {
      method,
      path,
      responseBody: payload,
      status: response.status,
      statusText: response.statusText,
    });
  }

  if (payload && typeof payload === 'object' && payload.success === false) {
    throw new ApiError(payload.message || `${method} ${url.pathname} returned success=false.`, {
      method,
      path,
      responseBody: payload,
      status: response.status,
      statusText: response.statusText,
    });
  }

  return payload;
}

module.exports = {
  ApiError,
  apiRequest,
  encodePathSegment,
};