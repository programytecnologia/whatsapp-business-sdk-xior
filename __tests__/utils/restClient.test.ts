import { createRestClient } from "../../src/utils/restClient";

describe("create rest client", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it("should return CRUD methods and be callable", () => {
    const restClient = createRestClient({});
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
    const restClient = createRestClient({ errorHandler: () => Promise.reject(errorReturn) });
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
