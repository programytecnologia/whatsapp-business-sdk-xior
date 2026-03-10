import { createRestClient } from "../../src/utils/restClient";

const mockFetch = jest.fn();
const originalFetch = globalThis.fetch;

describe("create rest client", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    globalThis.fetch = mockFetch;
    mockFetch.mockReset();
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it("should return CRUD methods and be callable", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve("{}"),
    });
    const restClient = createRestClient({ baseURL: "https://example.com" });
    jest.spyOn(restClient, "get");
    jest.spyOn(restClient, "post");
    jest.spyOn(restClient, "put");
    jest.spyOn(restClient, "delete");

    // Call each method explicitly to avoid TypeScript union issues
    restClient.get("hello", { foo: "bar" }, { headers: { "Content-Type": "multipart/form-data" } });
    expect(restClient.get).toHaveBeenCalledWith(
      "hello",
      { foo: "bar" },
      { headers: { "Content-Type": "multipart/form-data" } },
    );

    restClient.delete(
      "hello",
      { foo: "bar" },
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    expect(restClient.delete).toHaveBeenCalledWith(
      "hello",
      { foo: "bar" },
      { headers: { "Content-Type": "multipart/form-data" } },
    );

    restClient.post("hello", { data: {} }, { headers: { "Content-Type": "multipart/form-data" } });
    expect(restClient.post).toHaveBeenCalledWith(
      "hello",
      { data: {} },
      { headers: { "Content-Type": "multipart/form-data" } },
    );

    restClient.put("hello", { data: {} }, { headers: { "Content-Type": "multipart/form-data" } });
    expect(restClient.put).toHaveBeenCalledWith(
      "hello",
      { data: {} },
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  });

  it("should use error handler", async () => {
    const errorReturn = { request: {}, response: {} };
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: { message: "Bad Request" } }),
      text: () => Promise.resolve('{"error":{"message":"Bad Request"}}'),
    });
    const restClient = createRestClient({
      baseURL: "https://example.com",
      errorHandler: () => Promise.reject(errorReturn),
    });
    try {
      await restClient.get("");
    } catch (err) {
      expect(err).toEqual(errorReturn);
    }
  });

  it("should use API Token and Base URL", () => {
    const args = {
      apiToken: "123456",
      baseURL: "hola",
    };
    const restClient = createRestClient(args);
    expect(restClient.config.headers.authorization).toBe("Bearer 123456");
    expect(restClient.config.baseURL).toBe("hola");
  });
});
