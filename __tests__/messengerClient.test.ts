import { MessengerClient } from "../src/messenger_client";

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

const PAGE_ID = "page-123";

const makeClient = () => {
  const client = new MessengerClient({ apiToken: "test-token", pageId: PAGE_ID });
  jest.spyOn(client.restClient, "get").mockImplementation(() => Promise.resolve(undefined));
  jest.spyOn(client.restClient, "post").mockImplementation(() => Promise.resolve(undefined));
  jest.spyOn(client.restClient, "delete").mockImplementation(() => Promise.resolve(undefined));
  return client;
};

const callEndpoint = (spy: jest.SpyInstance, n = 0): string => spy.mock.calls[n][0] as string;
const callBody = <T = Record<string, unknown>>(spy: jest.SpyInstance, n = 0): T =>
  spy.mock.calls[n][1] as unknown as T;
const callConfig = (spy: jest.SpyInstance, n = 0): { params?: Record<string, unknown> } =>
  spy.mock.calls[n][2] as unknown as { params?: Record<string, unknown> };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MessengerClient", () => {
  let client: ReturnType<typeof makeClient>;

  beforeEach(() => {
    client = makeClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Base URL ────────────────────────────────────────────────────────────────

  describe("config", () => {
    it("uses Graph API v25.0 as the base URL", () => {
      expect(client.restClient.config.baseURL).toBe("https://graph.facebook.com/v25.0");
    });

    it("stores the pageId", () => {
      expect(client.pageId).toBe(PAGE_ID);
    });
  });

  // ── Send API ────────────────────────────────────────────────────────────────

  describe("send()", () => {
    it("calls POST me/messages with the full payload", async () => {
      const payload = {
        recipient: { id: "user-1" },
        message: { text: "Hello!" },
        messaging_type: "RESPONSE" as const,
      };
      await client.send(payload);
      expect(client.restClient.post).toHaveBeenCalledWith("me/messages", payload);
    });
  });

  describe("sendText()", () => {
    it("calls POST me/messages with text and defaults to RESPONSE messaging type", async () => {
      await client.sendText("user-1", "Hi there");

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      const body = callBody(client.restClient.post as jest.Mock);
      expect(endpoint).toBe("me/messages");
      expect(body.recipient).toEqual({ id: "user-1" });
      expect(body.message).toEqual({ text: "Hi there" });
      expect(body.messaging_type).toBe("RESPONSE");
    });

    it("accepts a custom messaging type and tag", async () => {
      await client.sendText("user-1", "Update", {
        messagingType: "MESSAGE_TAG",
        tag: "HUMAN_AGENT",
      });

      const body = callBody(client.restClient.post as jest.Mock);
      expect(body.messaging_type).toBe("MESSAGE_TAG");
      expect(body.tag).toBe("HUMAN_AGENT");
    });
  });

  describe("sendAttachment()", () => {
    it("calls POST me/messages with an image attachment", async () => {
      await client.sendAttachment("user-1", {
        type: "image",
        payload: { url: "https://example.com/img.jpg" },
      });

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      const body = callBody<{ message: { attachment: { type: string } } }>(
        client.restClient.post as jest.Mock,
      );
      expect(endpoint).toBe("me/messages");
      expect(body.message.attachment.type).toBe("image");
    });
  });

  describe("sendQuickReplies()", () => {
    it("includes quick_replies array in message", async () => {
      await client.sendQuickReplies("user-1", "Choose an option:", [
        { content_type: "text", title: "Yes", payload: "YES" },
        { content_type: "text", title: "No", payload: "NO" },
      ]);

      const body = callBody<{ message: { quick_replies: unknown[] } }>(
        client.restClient.post as jest.Mock,
      );
      expect(body.message.quick_replies).toHaveLength(2);
    });
  });

  describe("sendSenderAction()", () => {
    it("sends typing_on action", async () => {
      await client.sendSenderAction("user-1", "typing_on");

      const body = callBody<{ sender_action: string; message?: unknown }>(
        client.restClient.post as jest.Mock,
      );
      expect(body.sender_action).toBe("typing_on");
      expect(body.message).toBeUndefined();
    });
  });

  // ── Messenger Profile API ───────────────────────────────────────────────────

  describe("getProfile()", () => {
    it("calls GET me/messenger_profile with joined fields param", async () => {
      await client.getProfile(["get_started", "greeting"]);

      const endpoint = callEndpoint(client.restClient.get as jest.Mock);
      const config = callConfig(client.restClient.get as jest.Mock);
      expect(endpoint).toBe("me/messenger_profile");
      expect(config.params?.fields).toBe("get_started,greeting");
    });
  });

  describe("setProfile()", () => {
    it("calls POST me/messenger_profile with payload", async () => {
      const payload = { get_started: { payload: "GET_STARTED" } };
      await client.setProfile(payload);

      expect(client.restClient.post).toHaveBeenCalledWith("me/messenger_profile", payload);
    });
  });

  describe("deleteProfile()", () => {
    it("calls DELETE me/messenger_profile with fields params", async () => {
      await client.deleteProfile(["get_started"]);

      const endpoint = callEndpoint(client.restClient.delete as jest.Mock);
      const config = callConfig(client.restClient.delete as jest.Mock);
      expect(endpoint).toBe("me/messenger_profile");
      expect(config.params?.fields).toEqual(["get_started"]);
    });
  });

  // ── Handover Protocol ───────────────────────────────────────────────────────

  describe("passThreadControl()", () => {
    it("calls POST me/pass_thread_control with recipient and target_app_id", async () => {
      await client.passThreadControl("user-1", "app-id-999");

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      const body = callBody(client.restClient.post as jest.Mock);
      expect(endpoint).toBe("me/pass_thread_control");
      expect(body.recipient).toEqual({ id: "user-1" });
      expect(body.target_app_id).toBe("app-id-999");
    });

    it("includes metadata when provided", async () => {
      await client.passThreadControl("user-1", "app-id-999", "some-meta");

      const body = callBody(client.restClient.post as jest.Mock);
      expect(body.metadata).toBe("some-meta");
    });

    it("omits metadata when not provided", async () => {
      await client.passThreadControl("user-1", "app-id-999");

      const body = callBody(client.restClient.post as jest.Mock);
      expect(body.metadata).toBeUndefined();
    });
  });

  describe("takeThreadControl()", () => {
    it("calls POST me/take_thread_control", async () => {
      await client.takeThreadControl("user-1");

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      expect(endpoint).toBe("me/take_thread_control");
    });
  });

  describe("requestThreadControl()", () => {
    it("calls POST me/request_thread_control", async () => {
      await client.requestThreadControl("user-1");

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      expect(endpoint).toBe("me/request_thread_control");
    });
  });

  describe("getThreadOwner()", () => {
    it("calls GET me/thread_owner with recipient_id param", async () => {
      await client.getThreadOwner("user-1");

      const endpoint = callEndpoint(client.restClient.get as jest.Mock);
      const config = callConfig(client.restClient.get as jest.Mock);
      expect(endpoint).toBe("me/thread_owner");
      expect(config.params?.recipient_id).toBe("user-1");
    });
  });

  describe("getSecondaryReceivers()", () => {
    it("calls GET me/secondary_receivers with id,name fields", async () => {
      await client.getSecondaryReceivers();

      const endpoint = callEndpoint(client.restClient.get as jest.Mock);
      const config = callConfig(client.restClient.get as jest.Mock);
      expect(endpoint).toBe("me/secondary_receivers");
      expect(config.params?.fields).toBe("id,name");
    });
  });

  // ── OTN ────────────────────────────────────────────────────────────────────

  describe("sendOtnRequest()", () => {
    it("sends a one_time_notif_req template", async () => {
      await client.sendOtnRequest("user-1", "Get notified", "NOTIFY_ME");

      const body = callBody<{
        message: {
          attachment: {
            payload: { template_type: string; title: string; payload: string };
          };
        };
      }>(client.restClient.post as jest.Mock);
      expect(body.message.attachment.payload.template_type).toBe("one_time_notif_req");
      expect(body.message.attachment.payload.title).toBe("Get notified");
      expect(body.message.attachment.payload.payload).toBe("NOTIFY_ME");
    });
  });

  describe("sendOtnMessage()", () => {
    it("sends a text message using the OTN token as recipient", async () => {
      await client.sendOtnMessage("otn-token-xyz", "Here is your update!");

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      const body = callBody(client.restClient.post as jest.Mock);
      expect(endpoint).toBe("me/messages");
      expect(body.recipient).toEqual({ one_time_notif_token: "otn-token-xyz" });
      expect((body as Record<string, { text: string }>).message.text).toBe("Here is your update!");
    });
  });
});
