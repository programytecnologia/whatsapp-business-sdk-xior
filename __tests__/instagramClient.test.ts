import { InstagramClient } from "../src/instagram_client";

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

const IG_USER_ID = "ig-user-456";

const makeClient = () => {
  const client = new InstagramClient({ apiToken: "test-token", igUserId: IG_USER_ID });
  jest.spyOn(client.restClient, "get").mockImplementation(() => Promise.resolve(undefined));
  jest.spyOn(client.restClient, "post").mockImplementation(() => Promise.resolve(undefined));
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

describe("InstagramClient", () => {
  let client: ReturnType<typeof makeClient>;

  beforeEach(() => {
    client = makeClient();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ── Config ──────────────────────────────────────────────────────────────────

  describe("config", () => {
    it("uses Graph API v25.0 as the base URL", () => {
      expect(client.restClient.config.baseURL).toBe("https://graph.facebook.com/v25.0");
    });

    it("stores the igUserId", () => {
      expect(client.igUserId).toBe(IG_USER_ID);
    });
  });

  // ── Send API ────────────────────────────────────────────────────────────────

  describe("sendMessage()", () => {
    it("calls POST /{igUserId}/messages with full payload", async () => {
      const payload = {
        recipient: { id: "user-1" },
        message: { text: "Hello from IG!" },
      };
      await client.sendMessage(payload);

      expect(client.restClient.post).toHaveBeenCalledWith(`${IG_USER_ID}/messages`, payload);
    });
  });

  describe("sendText()", () => {
    it("calls POST /{igUserId}/messages with text", async () => {
      await client.sendText("user-1", "Hi!");

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      const body = callBody(client.restClient.post as jest.Mock);
      expect(endpoint).toBe(`${IG_USER_ID}/messages`);
      expect(body.recipient).toEqual({ id: "user-1" });
      expect((body as { message: { text: string } }).message.text).toBe("Hi!");
    });

    it("defaults messaging_type to RESPONSE", async () => {
      await client.sendText("user-1", "Hi!");

      const body = callBody(client.restClient.post as jest.Mock);
      expect(body.messaging_type).toBe("RESPONSE");
    });

    it("accepts a custom tag", async () => {
      await client.sendText("user-1", "Update", {
        messagingType: "MESSAGE_TAG",
        tag: "HUMAN_AGENT",
      });

      const body = callBody(client.restClient.post as jest.Mock);
      expect(body.tag).toBe("HUMAN_AGENT");
    });
  });

  describe("sendAttachment()", () => {
    it("calls POST /{igUserId}/messages with attachment", async () => {
      await client.sendAttachment("user-1", {
        type: "image",
        payload: { url: "https://example.com/img.jpg" },
      });

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      const body = callBody<{ message: { attachment: { type: string } } }>(
        client.restClient.post as jest.Mock,
      );
      expect(endpoint).toBe(`${IG_USER_ID}/messages`);
      expect(body.message.attachment.type).toBe("image");
    });
  });

  // ── Comment interactions ────────────────────────────────────────────────────

  describe("sendPrivateCommentReply()", () => {
    it("calls POST /{igUserId}/messages with recipient.comment_id", async () => {
      await client.sendPrivateCommentReply("comment-abc", "Thanks for the comment!");

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      const body = callBody<{ recipient: { comment_id: string }; message: { text: string } }>(
        client.restClient.post as jest.Mock,
      );
      expect(endpoint).toBe(`${IG_USER_ID}/messages`);
      expect(body.recipient).toEqual({ comment_id: "comment-abc" });
      expect(body.message.text).toBe("Thanks for the comment!");
    });

    it("does NOT use recipient.id — that would send to the wrong endpoint", async () => {
      await client.sendPrivateCommentReply("comment-abc", "Hello");

      const body = callBody(client.restClient.post as jest.Mock);
      expect(body.recipient).not.toHaveProperty("id");
    });
  });

  describe("replyToComment()", () => {
    it("calls POST /{commentId}/replies for public thread replies", async () => {
      await client.replyToComment("comment-abc", "Great post!");

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      const body = callBody(client.restClient.post as jest.Mock);
      // Must use /{commentId}/replies, NOT /{igUserId}/messages
      expect(endpoint).toBe("comment-abc/replies");
      expect(body.message).toBe("Great post!");
    });
  });

  describe("getComments()", () => {
    it("calls GET /{mediaId}/comments", async () => {
      await client.getComments("media-xyz");

      const endpoint = callEndpoint(client.restClient.get as jest.Mock);
      expect(endpoint).toBe("media-xyz/comments");
    });

    it("passes fields as a comma-separated param when provided", async () => {
      await client.getComments("media-xyz", ["id", "text", "timestamp"]);

      const config = callConfig(client.restClient.get as jest.Mock);
      expect(config.params?.fields).toBe("id,text,timestamp");
    });

    it("passes no fields param when fields are omitted", async () => {
      await client.getComments("media-xyz");

      const config = callConfig(client.restClient.get as jest.Mock);
      expect(config.params).toBeUndefined();
    });
  });

  // ── IG Messaging Profile ────────────────────────────────────────────────────

  describe("getProfile()", () => {
    it("calls GET /{igUserId}/messenger_profile with joined fields", async () => {
      await client.getProfile(["ice_breakers", "greeting"]);

      const endpoint = callEndpoint(client.restClient.get as jest.Mock);
      const config = callConfig(client.restClient.get as jest.Mock);
      expect(endpoint).toBe(`${IG_USER_ID}/messenger_profile`);
      expect(config.params?.fields).toBe("ice_breakers,greeting");
    });
  });

  describe("setProfile()", () => {
    it("calls POST /{igUserId}/messenger_profile with payload", async () => {
      const payload = {
        ice_breakers: [{ call_to_action_title: "FAQ", call_to_action_payload: "FAQ" }],
      };
      await client.setProfile(payload);

      expect(client.restClient.post).toHaveBeenCalledWith(
        `${IG_USER_ID}/messenger_profile`,
        payload,
      );
    });
  });

  // ── Attachment Upload API ─────────────────────────────────────────────────────────

  describe("uploadAttachment()", () => {
    it("calls POST /{igUserId}/message_attachments with attachment in message envelope", async () => {
      await client.uploadAttachment({
        type: "image",
        payload: { url: "https://example.com/photo.jpg" },
      });

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      const body = callBody<{ message: { attachment: { type: string } } }>(
        client.restClient.post as jest.Mock,
      );
      expect(endpoint).toBe(`${IG_USER_ID}/message_attachments`);
      expect(body.message.attachment.type).toBe("image");
    });

    it("passes through video type", async () => {
      await client.uploadAttachment({
        type: "video",
        payload: { url: "https://example.com/reel.mp4" },
      });

      const body = callBody<{ message: { attachment: { type: string } } }>(
        client.restClient.post as jest.Mock,
      );
      expect(body.message.attachment.type).toBe("video");
    });
  });
});
