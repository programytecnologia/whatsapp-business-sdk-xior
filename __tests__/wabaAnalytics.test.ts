/**
 * Unit tests for WABAClient — Analytics API methods.
 */

import type { GetAnalyticsParams, GetConversationAnalyticsParams } from "../src/types";
import { WABAClient } from "../src/WABA_client";

const PHONE_ID = "phone-123";
const ACCOUNT_ID = "waba-456";

const makeClient = () => {
  const client = new WABAClient({
    apiToken: "test-token",
    phoneId: PHONE_ID,
    accountId: ACCOUNT_ID,
  });
  jest.spyOn(client.restClient, "get").mockImplementation(() => Promise.resolve(undefined));
  jest.spyOn(client.restClient, "post").mockImplementation(() => Promise.resolve(undefined));
  return client;
};

const callEndpoint = (spy: jest.Mock, n = 0): string => spy.mock.calls[n][0] as string;
const callConfig = (spy: jest.Mock, n = 0): { params?: Record<string, unknown> } =>
  spy.mock.calls[n][2] as unknown as { params?: Record<string, unknown> };

describe("WABAClient — Analytics API", () => {
  let client: ReturnType<typeof makeClient>;

  beforeEach(() => {
    client = makeClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getMessageAnalytics()", () => {
    it("calls GET {accountId} with fields=analytics and required params", async () => {
      const params: GetAnalyticsParams = {
        start: 1700000000,
        end: 1700086400,
        granularity: "DAY",
      };
      await client.getMessageAnalytics(params);
      expect(client.restClient.get).toHaveBeenCalledTimes(1);
      expect(callEndpoint(client.restClient.get as jest.Mock)).toBe(ACCOUNT_ID);
      const config = callConfig(client.restClient.get as jest.Mock);
      expect(config.params).toMatchObject({
        fields: "analytics",
        start: 1700000000,
        end: 1700086400,
        granularity: "DAY",
      });
    });

    it("passes optional phone_numbers and country_codes", async () => {
      const params: GetAnalyticsParams = {
        start: 1700000000,
        end: 1700086400,
        granularity: "MONTH",
        phone_numbers: ["+1234567890"],
        country_codes: ["US"],
      };
      await client.getMessageAnalytics(params);
      const config = callConfig(client.restClient.get as jest.Mock);
      expect(config.params).toMatchObject({
        phone_numbers: ["+1234567890"],
        country_codes: ["US"],
      });
    });
  });

  describe("getConversationAnalytics()", () => {
    it("calls GET {accountId} with fields=conversation_analytics and required params", async () => {
      const params: GetConversationAnalyticsParams = {
        start: 1700000000,
        end: 1700086400,
        granularity: "DAY",
      };
      await client.getConversationAnalytics(params);
      expect(client.restClient.get).toHaveBeenCalledTimes(1);
      expect(callEndpoint(client.restClient.get as jest.Mock)).toBe(ACCOUNT_ID);
      const config = callConfig(client.restClient.get as jest.Mock);
      expect(config.params).toMatchObject({
        fields: "conversation_analytics",
        start: 1700000000,
        end: 1700086400,
        granularity: "DAY",
      });
    });

    it("passes optional dimensions and conversation_types", async () => {
      const params: GetConversationAnalyticsParams = {
        start: 1700000000,
        end: 1700086400,
        granularity: "MONTH",
        dimensions: ["COUNTRY", "CONVERSATION_CATEGORY"],
        conversation_types: ["REGULAR"],
      };
      await client.getConversationAnalytics(params);
      const config = callConfig(client.restClient.get as jest.Mock);
      expect(config.params).toMatchObject({
        dimensions: ["COUNTRY", "CONVERSATION_CATEGORY"],
        conversation_types: ["REGULAR"],
      });
    });
  });
});
