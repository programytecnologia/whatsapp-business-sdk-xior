import xior, { type XiorError, type XiorRequestConfig, type XiorResponse } from "xior";

interface RestClientParams {
  baseURL?: string;
  apiToken?: string;
  errorHandler?: (error: XiorError) => unknown;
}

export const createRestClient = ({ baseURL, apiToken, errorHandler }: RestClientParams) => {
  const config = {
    headers: {
      authorization: `Bearer ${apiToken}`,
    },
    baseURL,
  };
  const fetch = xior.create(config);
  fetch.interceptors.response.use(
    (response: XiorResponse<unknown>) => response,
    async (error: XiorError) => errorHandler?.(error),
  );

  return {
    fetch,
    config, // Expose config for testing
    get: async <Response = unknown, Params extends Record<string, unknown> | undefined = undefined>(
      endpoint: string,
      params?: Params,
      config?: XiorRequestConfig,
    ) => (await fetch.get<Response>(endpoint, { params, ...config }))?.data,
    post: async <Response = unknown, Payload = Record<string, unknown>>(
      endpoint: string,
      payload?: Payload,
      config?: XiorRequestConfig,
    ) => (await fetch.post<Response>(endpoint, payload, config))?.data,
    put: async <Response = unknown, Payload = Record<string, unknown>>(
      endpoint: string,
      payload?: Payload,
      config?: XiorRequestConfig,
    ) => (await fetch.put<Response>(endpoint, payload, config))?.data,
    delete: async <
      Response = unknown,
      Params extends Record<string, unknown> | undefined = undefined,
    >(
      endpoint: string,
      params?: Params,
      config?: XiorRequestConfig,
    ) => (await fetch.delete<Response>(endpoint, { params, ...config }))?.data,
  };
};
