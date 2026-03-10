/**
 * Unit tests for WABAClient — WhatsApp Flows API methods.
 */

import FormData from "form-data";
import type {
  CreateFlowPayload,
  MigrateFlowsPayload,
  UpdateFlowMetadataPayload,
} from "../src/types";
import { WABAClient } from "../src/WABA_client";

const PHONE_ID = "phone-123";
const ACCOUNT_ID = "waba-456";
const FLOW_ID = "flow-789";
const DEST_WABA_ID = "waba-999";

const makeClient = () => {
  const client = new WABAClient({
    apiToken: "test-token",
    phoneId: PHONE_ID,
    accountId: ACCOUNT_ID,
  });
  jest.spyOn(client.restClient, "get").mockImplementation(() => Promise.resolve(undefined));
  jest.spyOn(client.restClient, "post").mockImplementation(() => Promise.resolve(undefined));
  jest.spyOn(client.restClient, "delete").mockImplementation(() => Promise.resolve(undefined));
  return client;
};

const callEndpoint = (spy: jest.Mock, n = 0): string => spy.mock.calls[n][0] as string;
const callBody = <T = Record<string, unknown>>(spy: jest.Mock, n = 0): T =>
  spy.mock.calls[n][1] as unknown as T;
const callConfig = (spy: jest.Mock, n = 0): { params?: Record<string, unknown> } =>
  spy.mock.calls[n][2] as unknown as { params?: Record<string, unknown> };

describe("WABAClient — Flows API", () => {
  let client: ReturnType<typeof makeClient>;

  beforeEach(() => {
    client = makeClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("listFlows()", () => {
    it("calls GET {accountId}/flows", async () => {
      await client.listFlows();
      expect(client.restClient.get).toHaveBeenCalledTimes(1);
      expect(callEndpoint(client.restClient.get as jest.Mock)).toBe(`${ACCOUNT_ID}/flows`);
    });
  });

  describe("createFlow()", () => {
    it("calls POST {accountId}/flows with the payload", async () => {
      const payload: CreateFlowPayload = {
        name: "My Flow",
        categories: ["LEAD_GENERATION"],
      };
      await client.createFlow(payload);
      expect(client.restClient.post).toHaveBeenCalledTimes(1);
      expect(callEndpoint(client.restClient.post as jest.Mock)).toBe(`${ACCOUNT_ID}/flows`);
      expect(callBody(client.restClient.post as jest.Mock)).toEqual(payload);
    });

    it("supports optional clone_flow_id and publish", async () => {
      const payload: CreateFlowPayload = {
        name: "Cloned Flow",
        categories: ["SURVEY"],
        clone_flow_id: "existing-flow-id",
        publish: true,
      };
      await client.createFlow(payload);
      const body = callBody<CreateFlowPayload>(client.restClient.post as jest.Mock);
      expect(body.clone_flow_id).toBe("existing-flow-id");
      expect(body.publish).toBe(true);
    });
  });

  describe("getFlow()", () => {
    it("calls GET {flowId} without fields by default", async () => {
      await client.getFlow(FLOW_ID);
      expect(callEndpoint(client.restClient.get as jest.Mock)).toBe(FLOW_ID);
      expect(callConfig(client.restClient.get as jest.Mock)).toEqual({ params: undefined });
    });

    it("includes fields param when provided", async () => {
      await client.getFlow(FLOW_ID, "id,name,status,categories");
      const config = callConfig(client.restClient.get as jest.Mock);
      expect(config.params).toEqual({ fields: "id,name,status,categories" });
    });
  });

  describe("updateFlowMetadata()", () => {
    it("calls POST {flowId} with name/categories payload", async () => {
      const payload: UpdateFlowMetadataPayload = { name: "Renamed Flow" };
      await client.updateFlowMetadata(FLOW_ID, payload);
      expect(callEndpoint(client.restClient.post as jest.Mock)).toBe(FLOW_ID);
      expect(callBody(client.restClient.post as jest.Mock)).toEqual(payload);
    });
  });

  describe("updateFlowJson()", () => {
    it("calls POST {flowId}/assets with FormData", async () => {
      const formData = new FormData();
      formData.append("name", "flow.json");
      formData.append("asset_type", "FLOW_JSON");
      await client.updateFlowJson(FLOW_ID, formData);
      expect(callEndpoint(client.restClient.post as jest.Mock)).toBe(`${FLOW_ID}/assets`);
      expect(callBody(client.restClient.post as jest.Mock)).toBe(formData);
    });
  });

  describe("getFlowAssets()", () => {
    it("calls GET {flowId}/assets", async () => {
      await client.getFlowAssets(FLOW_ID);
      expect(callEndpoint(client.restClient.get as jest.Mock)).toBe(`${FLOW_ID}/assets`);
    });
  });

  describe("getFlowPreview()", () => {
    it("calls GET {flowId} with preview.invalidate(false) by default", async () => {
      await client.getFlowPreview(FLOW_ID);
      expect(callEndpoint(client.restClient.get as jest.Mock)).toBe(FLOW_ID);
      const config = callConfig(client.restClient.get as jest.Mock);
      expect(config.params).toEqual({ fields: "preview.invalidate(false)" });
    });

    it("uses preview.invalidate(true) when invalidate=true", async () => {
      await client.getFlowPreview(FLOW_ID, true);
      const config = callConfig(client.restClient.get as jest.Mock);
      expect(config.params).toEqual({ fields: "preview.invalidate(true)" });
    });
  });

  describe("publishFlow()", () => {
    it("calls POST {flowId}/publish", async () => {
      await client.publishFlow(FLOW_ID);
      expect(callEndpoint(client.restClient.post as jest.Mock)).toBe(`${FLOW_ID}/publish`);
    });
  });

  describe("deprecateFlow()", () => {
    it("calls POST {flowId}/deprecate", async () => {
      await client.deprecateFlow(FLOW_ID);
      expect(callEndpoint(client.restClient.post as jest.Mock)).toBe(`${FLOW_ID}/deprecate`);
    });
  });

  describe("deleteFlow()", () => {
    it("calls DELETE {flowId}", async () => {
      await client.deleteFlow(FLOW_ID);
      expect(callEndpoint(client.restClient.delete as jest.Mock)).toBe(FLOW_ID);
    });
  });

  describe("migrateFlows()", () => {
    it("calls POST {destWabaId}/migrate_flows with source details", async () => {
      const payload: MigrateFlowsPayload = {
        source_waba_id: "source-waba-123",
        source_flow_names: ["Flow A", "Flow B"],
      };
      await client.migrateFlows(DEST_WABA_ID, payload);
      expect(callEndpoint(client.restClient.post as jest.Mock)).toBe(
        `${DEST_WABA_ID}/migrate_flows`,
      );
      expect(callBody(client.restClient.post as jest.Mock)).toEqual(payload);
    });
  });
});
