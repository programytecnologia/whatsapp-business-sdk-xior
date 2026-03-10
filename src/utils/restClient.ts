export interface RequestConfig {
  headers?: Record<string, string>;
  params?: Record<string, unknown>;
  baseURL?: string;
  responseType?: "stream" | "json";
  data?: unknown;
}

export interface HttpError {
  response?: { data?: unknown; status?: number };
  request?: { url?: string };
  message?: string;
}

interface RestClientParams {
  baseURL?: string;
  apiToken?: string;
  errorHandler?: (error: HttpError) => unknown;
}

const buildUrl = (
  defaultBaseURL: string | undefined,
  endpoint: string,
  params?: Record<string, unknown>,
  configBaseURL?: string,
): string => {
  const base = configBaseURL !== undefined ? configBaseURL : defaultBaseURL;
  let url: URL;
  if (!base) {
    url = new URL(endpoint);
  } else {
    url = new URL(endpoint, base.endsWith("/") ? base : `${base}/`);
  }
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
};

const isFormData = (body: unknown): boolean =>
  typeof body === "object" &&
  body !== null &&
  typeof (body as Record<string, unknown>).getBuffer === "function";

const doFetch = async <Response = unknown>(
  url: string,
  method: string,
  defaultHeaders: Record<string, string>,
  body?: unknown,
  config?: RequestConfig,
  errorHandler?: (error: HttpError) => unknown,
): Promise<Response> => {
  const headers: Record<string, string> = { ...defaultHeaders, ...config?.headers };

  let fetchBody: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (isFormData(body)) {
      // form-data (Node.js): pass the buffer and merge its headers
      const fd = body as {
        getBuffer: () => Buffer;
        getHeaders: () => Record<string, string>;
      };
      fetchBody = new Uint8Array(fd.getBuffer());
      Object.assign(headers, fd.getHeaders());
    } else {
      fetchBody = JSON.stringify(body);
      if (!headers["Content-Type"] && !headers["content-type"]) {
        headers["Content-Type"] = "application/json";
      }
    }
  }

  let res: globalThis.Response;
  try {
    res = await globalThis.fetch(url, { method, headers, body: fetchBody });
  } catch (networkError) {
    const httpError: HttpError = {
      message: networkError instanceof Error ? networkError.message : String(networkError),
      request: { url },
    };
    if (errorHandler) return errorHandler(httpError) as Response;
    throw httpError;
  }

  if (!res.ok) {
    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = await res.text().catch(() => undefined);
    }
    const httpError: HttpError = {
      response: { data, status: res.status },
      request: { url },
      message: `Request failed with status ${res.status}`,
    };
    if (errorHandler) return errorHandler(httpError) as Response;
    throw httpError;
  }

  if (config?.responseType === "stream") {
    // Return a Node.js Readable stream for compatibility with .pipe()
    const { Readable } = await import("node:stream");
    return Readable.fromWeb(res.body as import("node:stream/web").ReadableStream) as Response;
  }

  const text = await res.text();
  if (!text) return undefined as Response;
  try {
    return JSON.parse(text) as Response;
  } catch {
    return text as Response;
  }
};

export const createRestClient = ({ baseURL, apiToken, errorHandler }: RestClientParams) => {
  const defaultHeaders = { authorization: `Bearer ${apiToken}` };
  const config = {
    headers: defaultHeaders,
    baseURL,
  };

  return {
    config,
    get: async <Response = unknown, Params extends Record<string, unknown> | undefined = undefined>(
      endpoint: string,
      params?: Params,
      config?: RequestConfig,
    ) =>
      doFetch<Response>(
        buildUrl(baseURL, endpoint, { ...params, ...config?.params }, config?.baseURL),
        "GET",
        defaultHeaders,
        undefined,
        config,
        errorHandler,
      ),
    post: async <Response = unknown, Payload = Record<string, unknown>>(
      endpoint: string,
      payload?: Payload,
      config?: RequestConfig,
    ) =>
      doFetch<Response>(
        buildUrl(baseURL, endpoint, config?.params, config?.baseURL),
        "POST",
        defaultHeaders,
        payload,
        config,
        errorHandler,
      ),
    put: async <Response = unknown, Payload = Record<string, unknown>>(
      endpoint: string,
      payload?: Payload,
      config?: RequestConfig,
    ) =>
      doFetch<Response>(
        buildUrl(baseURL, endpoint, config?.params, config?.baseURL),
        "PUT",
        defaultHeaders,
        payload,
        config,
        errorHandler,
      ),
    delete: async <
      Response = unknown,
      Params extends Record<string, unknown> | undefined = undefined,
    >(
      endpoint: string,
      params?: Params,
      config?: RequestConfig,
    ) =>
      doFetch<Response>(
        buildUrl(baseURL, endpoint, { ...params, ...config?.params }, config?.baseURL),
        "DELETE",
        defaultHeaders,
        config?.data,
        config,
        errorHandler,
      ),
  };
};
