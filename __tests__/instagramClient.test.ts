import { InstagramClient } from "../src/instagram_client";

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

const IG_USER_ID = "ig-user-456";

const makeClient = () => {
  const client = new InstagramClient({ apiToken: "test-token", igUserId: IG_USER_ID });
  jest.spyOn(client.restClient, "get").mockImplementation(() => Promise.resolve(undefined));
  jest.spyOn(client.restClient, "post").mockImplementation(() => Promise.resolve(undefined));
  jest.spyOn(client.restClient, "delete").mockImplementation(() => Promise.resolve(undefined));
  return client;
};

const callEndpoint = (spy: jest.SpyInstance, n = 0): string => spy.mock.calls[n][0] as string;
const callBody = <T = Record<string, unknown>>(spy: jest.SpyInstance, n = 0): T =>
  spy.mock.calls[n][1] as unknown as T;
const callConfig = (
  spy: jest.SpyInstance,
  n = 0,
): { params?: Record<string, unknown>; data?: unknown } =>
  spy.mock.calls[n][2] as unknown as { params?: Record<string, unknown>; data?: unknown };

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
    it("calls GET /{igUserId}/messenger_profile with joined fields and platform=instagram", async () => {
      await client.getProfile(["ice_breakers", "persistent_menu"]);

      const endpoint = callEndpoint(client.restClient.get as jest.Mock);
      const config = callConfig(client.restClient.get as jest.Mock);
      expect(endpoint).toBe(`${IG_USER_ID}/messenger_profile`);
      expect(config.params).toEqual({
        fields: "ice_breakers,persistent_menu",
        platform: "instagram",
      });
    });
  });

  describe("setProfile()", () => {
    it("calls POST /{igUserId}/messenger_profile with platform in the body and the query", async () => {
      const payload = {
        ice_breakers: [
          { locale: "default", call_to_actions: [{ question: "FAQ?", payload: "FAQ" }] },
        ],
      };
      await client.setProfile(payload);

      expect(client.restClient.post).toHaveBeenCalledWith(
        `${IG_USER_ID}/messenger_profile`,
        { ...payload, platform: "instagram" },
        { params: { platform: "instagram" } },
      );
    });
  });

  describe("deleteProfile()", () => {
    it("calls DELETE /{igUserId}/messenger_profile with fields in the body and platform=instagram", async () => {
      await client.deleteProfile(["ice_breakers"]);

      expect(client.restClient.delete).toHaveBeenCalledWith(
        `${IG_USER_ID}/messenger_profile`,
        undefined,
        { params: { platform: "instagram" }, data: { fields: ["ice_breakers"] } },
      );
    });
  });

  describe("ice breakers", () => {
    const iceBreakers = [
      {
        locale: "default",
        call_to_actions: [
          { question: "Where are you?", payload: "WHERE" },
          { question: "Opening hours?", payload: "HOURS" },
        ],
      },
      { locale: "en_US", call_to_actions: [{ question: "Prices?", payload: "PRICES" }] },
    ];

    it("setIceBreakers posts the localized list with platform=instagram", async () => {
      await client.setIceBreakers(iceBreakers);

      expect(client.restClient.post).toHaveBeenCalledWith(
        `${IG_USER_ID}/messenger_profile`,
        { ice_breakers: iceBreakers, platform: "instagram" },
        { params: { platform: "instagram" } },
      );
    });

    it("setIceBreakers refuses a list without the default locale", () => {
      expect(() =>
        client.setIceBreakers([
          { locale: "pt_BR", call_to_actions: [{ question: "Oi?", payload: "OI" }] },
        ]),
      ).toThrow('setIceBreakers needs an entry with locale "default"');
      expect(client.restClient.post).not.toHaveBeenCalled();
    });

    it("setIceBreakers refuses more than 4 questions in a locale", () => {
      const call_to_actions = Array.from({ length: 5 }, (_, i) => ({
        question: `Q${i}?`,
        payload: `Q${i}`,
      }));
      expect(() => client.setIceBreakers([{ locale: "default", call_to_actions }])).toThrow(
        'setIceBreakers: locale "default" needs 1 to 4 questions, got 5',
      );
      expect(client.restClient.post).not.toHaveBeenCalled();
    });

    it("getIceBreakers reads the ice_breakers field", async () => {
      (client.restClient.get as jest.Mock).mockResolvedValueOnce({
        data: [{ ice_breakers: iceBreakers }],
      });

      await expect(client.getIceBreakers()).resolves.toEqual(iceBreakers);
      expect(callConfig(client.restClient.get as jest.Mock).params).toEqual({
        fields: "ice_breakers",
        platform: "instagram",
      });
    });

    it("getIceBreakers reads locales listed directly in data", async () => {
      (client.restClient.get as jest.Mock).mockResolvedValueOnce({ data: iceBreakers });

      await expect(client.getIceBreakers()).resolves.toEqual(iceBreakers);
    });

    it.each([
      { data: [] },
      { data: [{}] },
      undefined,
    ])("getIceBreakers returns [] when Graph returns %p", async (response) => {
      (client.restClient.get as jest.Mock).mockResolvedValueOnce(response);

      await expect(client.getIceBreakers()).resolves.toEqual([]);
    });

    it("deleteIceBreakers deletes the ice_breakers field with platform=instagram", async () => {
      await client.deleteIceBreakers();

      expect(client.restClient.delete).toHaveBeenCalledWith(
        `${IG_USER_ID}/messenger_profile`,
        undefined,
        { params: { platform: "instagram" }, data: { fields: ["ice_breakers"] } },
      );
    });
  });

  describe("persistent menu", () => {
    const menu = [
      {
        locale: "default",
        call_to_actions: [
          { type: "postback" as const, title: "Talk to us", payload: "AGENT" },
          { type: "web_url" as const, title: "Shop", url: "https://example.com" },
        ],
      },
    ];

    it("setPersistentMenu posts the menu with platform=instagram", async () => {
      await client.setPersistentMenu(menu);

      expect(client.restClient.post).toHaveBeenCalledWith(
        `${IG_USER_ID}/messenger_profile`,
        { persistent_menu: menu, platform: "instagram" },
        { params: { platform: "instagram" } },
      );
    });

    it("setPersistentMenu refuses a menu without the default locale", () => {
      expect(() =>
        client.setPersistentMenu([{ locale: "pt_BR", call_to_actions: menu[0].call_to_actions }]),
      ).toThrow('setPersistentMenu needs an entry with locale "default"');
    });

    it("setPersistentMenu refuses more than 20 items in a locale", () => {
      const call_to_actions = Array.from({ length: 21 }, (_, i) => ({
        type: "postback" as const,
        title: `Item ${i}`,
        payload: `ITEM_${i}`,
      }));
      expect(() => client.setPersistentMenu([{ locale: "default", call_to_actions }])).toThrow(
        "the limit is 20",
      );
    });

    it("getPersistentMenu reads the persistent_menu field", async () => {
      (client.restClient.get as jest.Mock).mockResolvedValueOnce({
        data: [{ persistent_menu: menu }],
      });

      await expect(client.getPersistentMenu()).resolves.toEqual(menu);
      expect(callConfig(client.restClient.get as jest.Mock).params).toEqual({
        fields: "persistent_menu",
        platform: "instagram",
      });
    });

    it.each([
      { data: [] },
      { data: [{}] },
    ])("getPersistentMenu returns [] when Graph returns %p", async (response) => {
      (client.restClient.get as jest.Mock).mockResolvedValueOnce(response);

      await expect(client.getPersistentMenu()).resolves.toEqual([]);
    });

    it("deletePersistentMenu deletes the persistent_menu field with platform=instagram", async () => {
      await client.deletePersistentMenu();

      expect(client.restClient.delete).toHaveBeenCalledWith(
        `${IG_USER_ID}/messenger_profile`,
        undefined,
        { params: { platform: "instagram" }, data: { fields: ["persistent_menu"] } },
      );
    });
  });

  it("never calls the profile helpers on /me", async () => {
    await client.getIceBreakers();
    await client.getPersistentMenu();
    await client.setIceBreakers([
      { locale: "default", call_to_actions: [{ question: "Q?", payload: "Q" }] },
    ]);
    await client.setPersistentMenu([
      { locale: "default", call_to_actions: [{ type: "postback", title: "A", payload: "A" }] },
    ]);
    await client.deleteIceBreakers();
    await client.deletePersistentMenu();

    const endpoints = [
      ...(client.restClient.get as jest.Mock).mock.calls,
      ...(client.restClient.post as jest.Mock).mock.calls,
      ...(client.restClient.delete as jest.Mock).mock.calls,
    ].map(([endpoint]) => endpoint as string);
    expect(endpoints).toHaveLength(6);
    for (const endpoint of endpoints) {
      expect(endpoint).toBe(`${IG_USER_ID}/messenger_profile`);
      expect(endpoint).not.toMatch(/(^|\/)me(\/|$)/);
    }
  });

  // ── Generic template ────────────────────────────────────────────────────────

  describe("sendGenericTemplate()", () => {
    const element = {
      title: "Plano Essencial",
      subtitle: "A partir de R$ 199",
      image_url: "https://example.com/a.jpg",
      default_action: { type: "web_url" as const, url: "https://example.com/a" },
      buttons: [
        { type: "postback" as const, title: "Quero", payload: "PLAN_A" },
        { type: "web_url" as const, title: "Detalhes", url: "https://example.com/a" },
      ],
    };

    it("calls POST /{igUserId}/messages with a generic template attachment", async () => {
      await client.sendGenericTemplate("igsid-1", [element]);

      expect(client.restClient.post).toHaveBeenCalledWith(`${IG_USER_ID}/messages`, {
        recipient: { id: "igsid-1" },
        message: {
          attachment: {
            type: "template",
            payload: { template_type: "generic", elements: [element] },
          },
        },
        messaging_type: "RESPONSE",
      });
    });

    it("applies the send options", async () => {
      await client.sendGenericTemplate("igsid-1", [element], {
        tag: "HUMAN_AGENT",
        replyTo: "m_1",
      });

      const body = callBody(client.restClient.post as jest.Mock);
      expect(body.messaging_type).toBe("MESSAGE_TAG");
      expect(body.tag).toBe("HUMAN_AGENT");
      expect(body.reply_to).toEqual({ mid: "m_1" });
    });

    it("refuses 11 elements", () => {
      expect(() =>
        client.sendGenericTemplate(
          "igsid-1",
          Array.from({ length: 11 }, () => element),
        ),
      ).toThrow("sendGenericTemplate needs 1 to 10 elements, got 11");
      expect(client.restClient.post).not.toHaveBeenCalled();
    });

    it("refuses an empty carousel", () => {
      expect(() => client.sendGenericTemplate("igsid-1", [])).toThrow("got 0");
    });

    it("refuses 4 buttons on an element", () => {
      const buttons = Array.from({ length: 4 }, (_, i) => ({
        type: "postback" as const,
        title: `B${i}`,
        payload: `B${i}`,
      }));
      expect(() => client.sendGenericTemplate("igsid-1", [{ title: "T", buttons }])).toThrow(
        "sendGenericTemplate: element 0 has 4 buttons, the limit is 3",
      );
    });

    it("refuses a title or subtitle over 80 characters", () => {
      expect(() => client.sendGenericTemplate("igsid-1", [{ title: "x".repeat(81) }])).toThrow(
        "element 0 title is over 80 characters",
      );
      expect(() =>
        client.sendGenericTemplate("igsid-1", [element, { title: "T", subtitle: "y".repeat(81) }]),
      ).toThrow("element 1 subtitle is over 80 characters");
    });

    it("counts an emoji as one character", async () => {
      await client.sendGenericTemplate("igsid-1", [{ title: "😀".repeat(80) }]);
      expect(client.restClient.post).toHaveBeenCalled();
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

  // ── Conversations API ───────────────────────────────────────────────────────

  describe("getConversations()", () => {
    it("calls GET {igUserId}/conversations with no extra params by default", async () => {
      await client.getConversations();

      const endpoint = callEndpoint(client.restClient.get as jest.Mock);
      const config = callConfig(client.restClient.get as jest.Mock);
      expect(endpoint).toBe(`${IG_USER_ID}/conversations`);
      expect(config.params).toEqual({});
    });

    it("passes string fields param", async () => {
      await client.getConversations({ fields: "id,snippet" });

      const config = callConfig(client.restClient.get as jest.Mock);
      expect(config.params).toEqual({ fields: "id,snippet" });
    });

    it("joins array fields into comma-separated string", async () => {
      await client.getConversations({ fields: ["id", "snippet", "updated_time"] });

      const config = callConfig(client.restClient.get as jest.Mock);
      expect(config.params).toEqual({ fields: "id,snippet,updated_time" });
    });

    it("passes pagination params", async () => {
      await client.getConversations({ limit: 5, after: "cursor-abc" });

      const config = callConfig(client.restClient.get as jest.Mock);
      expect(config.params).toMatchObject({ limit: 5, after: "cursor-abc" });
    });
  });
});
