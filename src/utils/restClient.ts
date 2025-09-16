import xior, { XiorRequestConfig } from "xior";

interface RestClientParams {
	baseURL?: string;
	apiToken?: string;
	errorHandler?: (error: any) => any;
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
		(response: any) => response,
		async (error: any) => errorHandler && errorHandler(error)
	);

	return {
		fetch,
		config, // Expose config for testing
		get: async <Response = any, Params extends Record<string, any> | undefined = undefined>(
			endpoint: string,
			params?: Params,
			config?: XiorRequestConfig
		) => (await fetch.get<Response>(endpoint, { params, ...config }))?.data,
		post: async <Response = any, Payload = Record<string, any>>(
			endpoint: string,
			payload?: Payload,
			config?: XiorRequestConfig
		) => (await fetch.post<Response>(endpoint, payload, config))?.data,
		put: async <Response = any, Payload = Record<string, any>>(
			endpoint: string,
			payload?: Payload,
			config?: XiorRequestConfig
		) => (await fetch.put<Response>(endpoint, payload, config))?.data,
		delete: async <Response = any, Params extends Record<string, any> | undefined = undefined>(
			endpoint: string,
			params?: Params,
			config?: XiorRequestConfig
		) => (await fetch.delete<Response>(endpoint, { params, ...config }))?.data,
	};
};
