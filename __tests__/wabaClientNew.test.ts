/**
 * Unit tests for the new WABAClient methods added in phases 2–5.
 *
 * All HTTP calls are mocked via jest.spyOn on the public `restClient` so we
 * exercise the payload-building logic without making real network requests.
 */

import type {
  CreateTemplatePayload,
  SendMarketingMessagePayload,
  UpdateCallSettingsPayload,
  UpdateTemplatePayload,
} from "../src/types";
import { WABAClient } from "../src/WABA_client";

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

const PHONE_ID = "phone-123";
const ACCOUNT_ID = "waba-456";
const TEMPLATE_ID = "tpl-789";

/** Factory: a fresh client with spied-on restClient methods. */
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

// ---------------------------------------------------------------------------
// Helpers: typed access to spy call arguments (avoids unconstrained `any`)
// ---------------------------------------------------------------------------

const callEndpoint = (spy: jest.SpyInstance, n = 0): string => spy.mock.calls[n][0] as string;
const callBody = <T = Record<string, unknown>>(spy: jest.SpyInstance, n = 0): T =>
  spy.mock.calls[n][1] as unknown as T;
const callConfig = (spy: jest.SpyInstance, n = 0): { params?: Record<string, unknown> } =>
  spy.mock.calls[n][2] as unknown as { params?: Record<string, unknown> };

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe("WABAClient — new methods", () => {
  let client: ReturnType<typeof makeClient>;

  beforeEach(() => {
    client = makeClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Graph API version
  // ──────────────────────────────────────────────────────────────────────────

  describe("API version", () => {
    it("uses Graph API v25.0 as the base URL", () => {
      expect(client.restClient.config.baseURL).toBe("https://graph.facebook.com/v25.0");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Template Management API
  // ──────────────────────────────────────────────────────────────────────────

  describe("Template API", () => {
    it("getTemplates — calls GET /{accountId}/message_templates", async () => {
      await client.getTemplates();

      expect(client.restClient.get).toHaveBeenCalledWith(
        `${ACCOUNT_ID}/message_templates`,
        undefined,
        { params: undefined },
      );
    });

    it("getTemplates — passes status filter", async () => {
      await client.getTemplates({ status: "APPROVED" });

      const endpoint = callEndpoint(client.restClient.get as jest.Mock);
      const config = callConfig(client.restClient.get as jest.Mock);
      expect(endpoint).toBe(`${ACCOUNT_ID}/message_templates`);
      expect(config.params).toMatchObject({ status: "APPROVED" });
    });

    it("getTemplates — passes category filter", async () => {
      await client.getTemplates({ category: "MARKETING" });

      const config = callConfig(client.restClient.get as jest.Mock);
      expect(config.params).toMatchObject({ category: "MARKETING" });
    });

    it("getTemplates — passes name and limit filters together", async () => {
      await client.getTemplates({ name: "order_update", limit: 10 });

      const config = callConfig(client.restClient.get as jest.Mock);
      expect(config.params).toMatchObject({ name: "order_update", limit: 10 });
    });

    it("getTemplates — no extra params when called with no args", async () => {
      await client.getTemplates();

      expect(client.restClient.get).toHaveBeenCalledTimes(1);
      const config = callConfig(client.restClient.get as jest.Mock);
      expect(config.params).toBeUndefined();
    });

    it("createTemplate — calls POST /{accountId}/message_templates with full payload", async () => {
      const payload: CreateTemplatePayload = {
        name: "order_confirmation",
        language: "en_US",
        category: "UTILITY",
        components: [
          { type: "HEADER", format: "TEXT", text: "Order {{1}}" },
          { type: "BODY", text: "Hi {{1}}, your order {{2}} has been confirmed." },
          { type: "FOOTER", text: "Thank you for shopping with us." },
        ],
      };

      await client.createTemplate(payload);

      expect(client.restClient.post).toHaveBeenCalledWith(
        `${ACCOUNT_ID}/message_templates`,
        payload,
      );
    });

    it("createTemplate — includes allow_category_change when provided", async () => {
      const payload: CreateTemplatePayload = {
        name: "promo_template",
        language: "pt_BR",
        category: "MARKETING",
        components: [],
        allow_category_change: false,
      };

      await client.createTemplate(payload);

      const body = callBody(client.restClient.post as jest.Mock);
      expect(body.allow_category_change).toBe(false);
    });

    it("updateTemplate — calls POST /{templateId}", async () => {
      const payload: UpdateTemplatePayload = {
        components: [{ type: "BODY", text: "Updated body {{1}}" }],
      };

      await client.updateTemplate(TEMPLATE_ID, payload);

      expect(client.restClient.post).toHaveBeenCalledWith(TEMPLATE_ID, payload);
    });

    it("updateTemplate — can update category only", async () => {
      const payload: UpdateTemplatePayload = { category: "UTILITY" };

      await client.updateTemplate(TEMPLATE_ID, payload);

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      const body = callBody(client.restClient.post as jest.Mock);
      expect(endpoint).toBe(TEMPLATE_ID);
      expect(body.category).toBe("UTILITY");
    });

    it("deleteTemplate — calls DELETE /{accountId}/message_templates with name param", async () => {
      await client.deleteTemplate("my_template");

      expect(client.restClient.delete).toHaveBeenCalledWith(
        `${ACCOUNT_ID}/message_templates`,
        undefined,
        { params: { name: "my_template" } },
      );
    });

    it("deleteTemplate — passes the exact template name provided", async () => {
      await client.deleteTemplate("order_confirmation_v2");

      const config = callConfig(client.restClient.delete as jest.Mock);
      expect(config.params?.name).toBe("order_confirmation_v2");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Calling API
  // ──────────────────────────────────────────────────────────────────────────

  describe("Calling API", () => {
    const sdpOffer = { sdp_type: "offer" as const, sdp: "v=0\r\no=- 0 0 IN IP4 0.0.0.0\r\n" };
    const callId = "call-abc-123";

    describe("initiateCall", () => {
      it("posts to /{phoneId}/calls with action=connect", async () => {
        await client.initiateCall({
          messaging_product: "whatsapp",
          to: "16505551234",
          session: sdpOffer,
        });

        expect(client.restClient.post).toHaveBeenCalledWith(
          `${PHONE_ID}/calls`,
          expect.objectContaining({
            action: "connect",
            to: "16505551234",
            session: sdpOffer,
          }),
        );
      });

      it("always injects action=connect regardless of caller input", async () => {
        await client.initiateCall({
          messaging_product: "whatsapp",
          to: "+1234567890",
          session: sdpOffer,
        });

        const body = callBody(client.restClient.post as jest.Mock);
        expect(body.action).toBe("connect");
      });

      it("includes optional biz_opaque_callback_data when provided", async () => {
        await client.initiateCall({
          messaging_product: "whatsapp",
          to: "16505551234",
          session: sdpOffer,
          biz_opaque_callback_data: "tracking-ref-42",
        });

        const body = callBody(client.restClient.post as jest.Mock);
        expect(body.biz_opaque_callback_data).toBe("tracking-ref-42");
      });

      it("does not include biz_opaque_callback_data when omitted", async () => {
        await client.initiateCall({
          messaging_product: "whatsapp",
          to: "16505551234",
          session: sdpOffer,
        });

        const body = callBody(client.restClient.post as jest.Mock);
        expect(body).not.toHaveProperty("biz_opaque_callback_data");
      });

      it("includes messaging_product=whatsapp", async () => {
        await client.initiateCall({
          messaging_product: "whatsapp",
          to: "16505551234",
          session: sdpOffer,
        });

        const body = callBody(client.restClient.post as jest.Mock);
        expect(body.messaging_product).toBe("whatsapp");
      });
    });

    describe("preAcceptCall", () => {
      it("posts action=pre_accept with call_id and session", async () => {
        await client.preAcceptCall(callId, sdpOffer);

        expect(client.restClient.post).toHaveBeenCalledWith(
          `${PHONE_ID}/calls`,
          expect.objectContaining({
            action: "pre_accept",
            call_id: callId,
            session: sdpOffer,
          }),
        );
      });
    });

    describe("acceptCall", () => {
      it("posts action=accept with call_id and session", async () => {
        await client.acceptCall(callId, sdpOffer);

        expect(client.restClient.post).toHaveBeenCalledWith(
          `${PHONE_ID}/calls`,
          expect.objectContaining({ action: "accept", call_id: callId }),
        );
      });

      it("includes biz_opaque_callback_data when provided", async () => {
        await client.acceptCall(callId, sdpOffer, "opaque-data");

        const body = callBody(client.restClient.post as jest.Mock);
        expect(body.biz_opaque_callback_data).toBe("opaque-data");
      });

      it("omits biz_opaque_callback_data when not provided", async () => {
        await client.acceptCall(callId, sdpOffer);

        const body = callBody(client.restClient.post as jest.Mock);
        expect(body).not.toHaveProperty("biz_opaque_callback_data");
      });

      it("omits biz_opaque_callback_data when an empty string is passed", async () => {
        await client.acceptCall(callId, sdpOffer, "");

        const body = callBody(client.restClient.post as jest.Mock);
        // empty string is falsy — the spread omits it
        expect(body).not.toHaveProperty("biz_opaque_callback_data");
      });
    });

    describe("rejectCall", () => {
      it("posts action=reject with call_id", async () => {
        await client.rejectCall(callId);

        expect(client.restClient.post).toHaveBeenCalledWith(
          `${PHONE_ID}/calls`,
          expect.objectContaining({ action: "reject", call_id: callId }),
        );
      });

      it("does not include a session in the reject payload", async () => {
        await client.rejectCall(callId);

        const body = callBody(client.restClient.post as jest.Mock);
        expect(body).not.toHaveProperty("session");
      });
    });

    describe("terminateCall", () => {
      it("posts action=terminate with call_id", async () => {
        await client.terminateCall(callId);

        expect(client.restClient.post).toHaveBeenCalledWith(
          `${PHONE_ID}/calls`,
          expect.objectContaining({ action: "terminate", call_id: callId }),
        );
      });

      it("posts to /{phoneId}/calls (not /calls without phoneId prefix)", async () => {
        await client.terminateCall(callId);

        const endpoint = callEndpoint(client.restClient.post as jest.Mock);
        expect(endpoint).toBe(`${PHONE_ID}/calls`);
        expect(endpoint).not.toBe("/calls");
      });
    });

    describe("all call actions post to /{phoneId}/calls", () => {
      it.each([
        [
          "initiateCall",
          () =>
            client.initiateCall({
              messaging_product: "whatsapp",
              to: "16505551234",
              session: sdpOffer,
            }),
        ],
        ["preAcceptCall", () => client.preAcceptCall(callId, sdpOffer)],
        ["acceptCall", () => client.acceptCall(callId, sdpOffer)],
        ["rejectCall", () => client.rejectCall(callId)],
        ["terminateCall", () => client.terminateCall(callId)],
      ])("%s posts to the /calls endpoint", async (_name, fn) => {
        await fn();
        const endpoint = callEndpoint(client.restClient.post as jest.Mock);
        expect(endpoint).toBe(`${PHONE_ID}/calls`);
        jest.clearAllMocks();
      });
    });

    describe("getCallSettings", () => {
      it("calls GET /{phoneId}/settings", async () => {
        await client.getCallSettings();

        expect(client.restClient.get).toHaveBeenCalledWith(`${PHONE_ID}/settings`);
      });
    });

    describe("updateCallSettings", () => {
      it("posts to /{phoneId}/settings with the full payload", async () => {
        const payload: UpdateCallSettingsPayload = {
          calling: {
            status: "ENABLED",
            call_icon_visibility: "DEFAULT",
            call_hours: {
              status: "ENABLED",
              timezone_id: "America/New_York",
              weekly_operating_hours: [
                { day_of_week: "MONDAY", open_time: "0900", close_time: "1700" },
              ],
            },
          },
        };

        await client.updateCallSettings(payload);

        expect(client.restClient.post).toHaveBeenCalledWith(`${PHONE_ID}/settings`, payload);
      });

      it("posts minimal payload (status only)", async () => {
        const payload: UpdateCallSettingsPayload = { calling: { status: "DISABLED" } };

        await client.updateCallSettings(payload);

        const body = callBody<{ calling: { status: string } }>(client.restClient.post as jest.Mock);
        expect(body.calling.status).toBe("DISABLED");
      });
    });

    describe("getCallPermissions", () => {
      it("calls GET /{phoneId}/call_permissions?user_wa_id=...", async () => {
        await client.getCallPermissions("16505551234");

        expect(client.restClient.get).toHaveBeenCalledWith(
          `${PHONE_ID}/call_permissions`,
          undefined,
          { params: { user_wa_id: "16505551234" } },
        );
      });

      it("passes the exact user_wa_id provided", async () => {
        await client.getCallPermissions("+14155551234");

        const config = callConfig(client.restClient.get as jest.Mock);
        expect(config.params?.user_wa_id).toBe("+14155551234");
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Marketing Messages API
  // ──────────────────────────────────────────────────────────────────────────

  describe("Marketing Messages API", () => {
    const baseMarketingPayload = {
      messaging_product: "whatsapp" as const,
      to: "16505551234",
      type: "template" as const,
      template: {
        name: "promo",
        language: { code: "en_US" as const, policy: "deterministic" as const },
      },
    } satisfies SendMarketingMessagePayload;

    it("posts to /{phoneId}/marketing_messages", async () => {
      await client.sendMarketingMessage(baseMarketingPayload);

      expect(client.restClient.post).toHaveBeenCalledWith(
        `${PHONE_ID}/marketing_messages`,
        baseMarketingPayload,
      );
    });

    it("includes product_policy=STRICT when set", async () => {
      await client.sendMarketingMessage({
        ...baseMarketingPayload,
        product_policy: "STRICT",
      });

      const body = callBody(client.restClient.post as jest.Mock);
      expect(body.product_policy).toBe("STRICT");
    });

    it("includes product_policy=CLOUD_API_FALLBACK when set", async () => {
      await client.sendMarketingMessage({
        ...baseMarketingPayload,
        product_policy: "CLOUD_API_FALLBACK",
      });

      const body = callBody(client.restClient.post as jest.Mock);
      expect(body.product_policy).toBe("CLOUD_API_FALLBACK");
    });

    it("includes message_activity_sharing when provided", async () => {
      await client.sendMarketingMessage({
        ...baseMarketingPayload,
        message_activity_sharing: true,
      });

      const body = callBody(client.restClient.post as jest.Mock);
      expect(body.message_activity_sharing).toBe(true);
    });

    it("forwards the full payload unchanged to restClient.post", async () => {
      const payload = {
        ...baseMarketingPayload,
        product_policy: "STRICT" as const,
        message_activity_sharing: false,
      };
      await client.sendMarketingMessage(payload);

      const body = callBody(client.restClient.post as jest.Mock);
      expect(body).toEqual(payload);
    });

    it("does not post to the regular /messages endpoint", async () => {
      await client.sendMarketingMessage(baseMarketingPayload);

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      expect(endpoint).not.toContain("/messages");
      expect(endpoint).toContain("marketing_messages");
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Coexistence — syncSmbAppData
  // ──────────────────────────────────────────────────────────────────────────

  describe("Coexistence — syncSmbAppData", () => {
    it("posts smb_app_state_sync to /{phoneId}/smb_app_data", async () => {
      await client.syncSmbAppData("smb_app_state_sync");

      expect(client.restClient.post).toHaveBeenCalledWith(`${PHONE_ID}/smb_app_data`, {
        messaging_product: "whatsapp",
        sync_type: "smb_app_state_sync",
      });
    });

    it("posts history sync to /{phoneId}/smb_app_data", async () => {
      await client.syncSmbAppData("history");

      expect(client.restClient.post).toHaveBeenCalledWith(`${PHONE_ID}/smb_app_data`, {
        messaging_product: "whatsapp",
        sync_type: "history",
      });
    });

    it("always includes messaging_product=whatsapp", async () => {
      await client.syncSmbAppData("history");

      const body = callBody(client.restClient.post as jest.Mock);
      expect(body.messaging_product).toBe("whatsapp");
    });

    it("uses the phone number ID, not the account ID, as the path prefix", async () => {
      await client.syncSmbAppData("smb_app_state_sync");

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      expect(endpoint).toMatch(new RegExp(`^${PHONE_ID}/`));
      expect(endpoint).not.toMatch(new RegExp(`^${ACCOUNT_ID}/`));
    });

    it("posts the correct sync_type for both allowed values", async () => {
      for (const syncType of ["smb_app_state_sync", "history"] as const) {
        jest.clearAllMocks();
        await client.syncSmbAppData(syncType);

        const body = callBody(client.restClient.post as jest.Mock);
        expect(body.sync_type).toBe(syncType);
      }
    });
  });
});
