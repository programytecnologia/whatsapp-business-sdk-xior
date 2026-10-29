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

  it("should keep the base path for endpoints with a leading slash", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve("{}") });
    const restClient = createRestClient({ baseURL: "https://graph.facebook.com/v25.0" });

    await restClient.post("/123/verify_code", { code: "000000" });
    await restClient.get("456");

    expect(mockFetch.mock.calls[0][0]).toBe("https://graph.facebook.com/v25.0/123/verify_code");
    expect(mockFetch.mock.calls[1][0]).toBe("https://graph.facebook.com/v25.0/456");
  });

  it("should leave absolute endpoints untouched", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve("{}") });
    const restClient = createRestClient({ baseURL: "https://graph.facebook.com/v25.0" });

    await restClient.get("https://graph.facebook.com/v25.0/123/insights?after=abc");

    expect(mockFetch.mock.calls[0][0]).toBe(
      "https://graph.facebook.com/v25.0/123/insights?after=abc",
    );
  });

  it("should serialize object and array params", async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve("{}") });
    const restClient = createRestClient({ baseURL: "https://graph.facebook.com/v25.0" });

    await restClient.get("act_1/insights", undefined, {
      params: {
        fields: ["spend", "impressions"],
        time_range: { since: "2026-10-01", until: "2026-10-28" },
        filtering: [{ field: "ad.effective_status", operator: "IN", value: ["ACTIVE"] }],
        limit: 50,
      },
    });

    const url = new URL(mockFetch.mock.calls[0][0]);
    expect(url.searchParams.get("fields")).toBe("spend,impressions");
    expect(JSON.parse(url.searchParams.get("time_range") ?? "")).toEqual({
      since: "2026-10-01",
      until: "2026-10-28",
    });
    expect(JSON.parse(url.searchParams.get("filtering") ?? "")).toEqual([
      { field: "ad.effective_status", operator: "IN", value: ["ACTIVE"] },
    ]);
    expect(url.searchParams.get("limit")).toBe("50");
  });
});
