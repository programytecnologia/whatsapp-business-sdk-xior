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
    it("calls POST {pageId}/messages with the full payload", async () => {
      const payload = {
        recipient: { id: "user-1" },
        message: { text: "Hello!" },
        messaging_type: "RESPONSE" as const,
      };
      await client.send(payload);
      expect(client.restClient.post).toHaveBeenCalledWith("page-123/messages", payload);
    });
  });

  describe("sendText()", () => {
    it("calls POST {pageId}/messages with text and defaults to RESPONSE messaging type", async () => {
      await client.sendText("user-1", "Hi there");

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      const body = callBody(client.restClient.post as jest.Mock);
      expect(endpoint).toBe("page-123/messages");
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
    it("calls POST {pageId}/messages with an image attachment", async () => {
      await client.sendAttachment("user-1", {
        type: "image",
        payload: { url: "https://example.com/img.jpg" },
      });

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      const body = callBody<{ message: { attachment: { type: string } } }>(
        client.restClient.post as jest.Mock,
      );
      expect(endpoint).toBe("page-123/messages");
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
    it("calls GET {pageId}/messenger_profile with joined fields param", async () => {
      await client.getProfile(["get_started", "greeting"]);

      const endpoint = callEndpoint(client.restClient.get as jest.Mock);
      const config = callConfig(client.restClient.get as jest.Mock);
      expect(endpoint).toBe("page-123/messenger_profile");
      expect(config.params?.fields).toBe("get_started,greeting");
    });
  });

  describe("setProfile()", () => {
    it("calls POST {pageId}/messenger_profile with payload", async () => {
      const payload = { get_started: { payload: "GET_STARTED" } };
      await client.setProfile(payload);

      expect(client.restClient.post).toHaveBeenCalledWith("page-123/messenger_profile", payload);
    });
  });

  describe("deleteProfile()", () => {
    it("calls DELETE {pageId}/messenger_profile with fields in the request body", async () => {
      await client.deleteProfile(["get_started"]);

      expect(client.restClient.delete).toHaveBeenCalledWith(
        "page-123/messenger_profile",
        undefined,
        {
          data: { fields: ["get_started"] },
        },
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
    ];

    it("setIceBreakers posts the localized list to {pageId}/messenger_profile", async () => {
      await client.setIceBreakers(iceBreakers);

      expect(client.restClient.post).toHaveBeenCalledWith("page-123/messenger_profile", {
        ice_breakers: iceBreakers,
      });
    });

    it("setIceBreakers refuses a list without the default locale", () => {
      expect(() =>
        client.setIceBreakers([
          { locale: "pt_BR", call_to_actions: iceBreakers[0].call_to_actions },
        ]),
      ).toThrow('setIceBreakers needs an entry with locale "default"');
      expect(client.restClient.post).not.toHaveBeenCalled();
    });

    it("setIceBreakers refuses 5 questions in a locale", () => {
      const call_to_actions = Array.from({ length: 5 }, (_, i) => ({
        question: `Q${i}?`,
        payload: `Q${i}`,
      }));
      expect(() => client.setIceBreakers([{ locale: "default", call_to_actions }])).toThrow(
        'setIceBreakers: locale "default" needs 1 to 4 questions, got 5',
      );
    });

    it("setIceBreakers refuses a locale without questions", () => {
      expect(() => client.setIceBreakers([{ locale: "default", call_to_actions: [] }])).toThrow(
        "got 0",
      );
    });

    it("getIceBreakers reads the ice_breakers field", async () => {
      (client.restClient.get as jest.Mock).mockResolvedValueOnce({
        data: [{ ice_breakers: iceBreakers }],
      });

      await expect(client.getIceBreakers()).resolves.toEqual(iceBreakers);
      expect(callEndpoint(client.restClient.get as jest.Mock)).toBe("page-123/messenger_profile");
      expect(callConfig(client.restClient.get as jest.Mock).params).toEqual({
        fields: "ice_breakers",
      });
    });

    it.each([
      { data: [] },
      { data: [{}] },
      undefined,
    ])("getIceBreakers returns [] when Graph returns %p", async (response) => {
      (client.restClient.get as jest.Mock).mockResolvedValueOnce(response);

      await expect(client.getIceBreakers()).resolves.toEqual([]);
    });

    it("deleteIceBreakers deletes the ice_breakers field", async () => {
      await client.deleteIceBreakers();

      expect(client.restClient.delete).toHaveBeenCalledWith(
        "page-123/messenger_profile",
        undefined,
        { data: { fields: ["ice_breakers"] } },
      );
    });
  });

  describe("get started", () => {
    it("setGetStarted posts the payload", async () => {
      await client.setGetStarted("GET_STARTED");

      expect(client.restClient.post).toHaveBeenCalledWith("page-123/messenger_profile", {
        get_started: { payload: "GET_STARTED" },
      });
    });

    it("getGetStarted reads the get_started field", async () => {
      (client.restClient.get as jest.Mock).mockResolvedValueOnce({
        data: [{ get_started: { payload: "GET_STARTED" } }],
      });

      await expect(client.getGetStarted()).resolves.toEqual({ payload: "GET_STARTED" });
      expect(callConfig(client.restClient.get as jest.Mock).params).toEqual({
        fields: "get_started",
      });
    });

    it.each([
      { data: [] },
      { data: [{}] },
    ])("getGetStarted returns null when Graph returns %p", async (response) => {
      (client.restClient.get as jest.Mock).mockResolvedValueOnce(response);

      await expect(client.getGetStarted()).resolves.toBeNull();
    });
  });

  describe("persistent menu", () => {
    const menu = [
      {
        locale: "default",
        composer_input_disabled: false,
        call_to_actions: [
          { type: "postback" as const, title: "Talk to us", payload: "AGENT" },
          { type: "web_url" as const, title: "Site", url: "https://example.com" },
        ],
      },
    ];

    it("setPersistentMenu posts the menu", async () => {
      await client.setPersistentMenu(menu);

      expect(client.restClient.post).toHaveBeenCalledWith("page-123/messenger_profile", {
        persistent_menu: menu,
      });
    });

    it("setPersistentMenu refuses a menu without the default locale", () => {
      expect(() =>
        client.setPersistentMenu([{ locale: "pt_BR", call_to_actions: menu[0].call_to_actions }]),
      ).toThrow('setPersistentMenu needs an entry with locale "default"');
      expect(client.restClient.post).not.toHaveBeenCalled();
    });

    it("getPersistentMenu reads the persistent_menu field", async () => {
      (client.restClient.get as jest.Mock).mockResolvedValueOnce({
        data: [{ persistent_menu: menu }],
      });

      await expect(client.getPersistentMenu()).resolves.toEqual(menu);
      expect(callConfig(client.restClient.get as jest.Mock).params).toEqual({
        fields: "persistent_menu",
      });
    });

    it.each([
      { data: [] },
      { data: [{}] },
    ])("getPersistentMenu returns [] when Graph returns %p", async (response) => {
      (client.restClient.get as jest.Mock).mockResolvedValueOnce(response);

      await expect(client.getPersistentMenu()).resolves.toEqual([]);
    });

    it("deletePersistentMenu deletes the persistent_menu field", async () => {
      await client.deletePersistentMenu();

      expect(client.restClient.delete).toHaveBeenCalledWith(
        "page-123/messenger_profile",
        undefined,
        { data: { fields: ["persistent_menu"] } },
      );
    });
  });

  // ── Templates ───────────────────────────────────────────────────────────────

  describe("sendGenericTemplate()", () => {
    const element = {
      title: "Plano Essencial",
      subtitle: "A partir de R$ 199",
      image_url: "https://example.com/a.jpg",
      buttons: [
        { type: "postback" as const, title: "Quero", payload: "PLAN_A" },
        { type: "web_url" as const, title: "Detalhes", url: "https://example.com/a" },
      ],
    };

    it("calls POST {pageId}/messages with a generic template attachment", async () => {
      await client.sendGenericTemplate("psid-1", [element]);

      expect(client.restClient.post).toHaveBeenCalledWith("page-123/messages", {
        recipient: { id: "psid-1" },
        message: {
          attachment: {
            type: "template",
            payload: { template_type: "generic", elements: [element] },
          },
        },
        messaging_type: "RESPONSE",
      });
    });

    it("adds image_aspect_ratio and the send options", async () => {
      await client.sendGenericTemplate("psid-1", [element], {
        imageAspectRatio: "square",
        tag: "HUMAN_AGENT",
        replyTo: "m_1",
      });

      const body = callBody<{
        message: { attachment: { payload: Record<string, unknown> } };
        messaging_type: string;
        tag: string;
        reply_to: unknown;
      }>(client.restClient.post as jest.Mock);
      expect(body.message.attachment.payload.image_aspect_ratio).toBe("square");
      expect(body.messaging_type).toBe("MESSAGE_TAG");
      expect(body.tag).toBe("HUMAN_AGENT");
      expect(body.reply_to).toEqual({ mid: "m_1" });
      expect(body).not.toHaveProperty("imageAspectRatio");
    });

    it("refuses 11 elements", () => {
      expect(() =>
        client.sendGenericTemplate(
          "psid-1",
          Array.from({ length: 11 }, () => element),
        ),
      ).toThrow("sendGenericTemplate needs 1 to 10 elements, got 11");
      expect(client.restClient.post).not.toHaveBeenCalled();
    });

    it("refuses 4 buttons on an element", () => {
      const buttons = Array.from({ length: 4 }, (_, i) => ({
        type: "postback" as const,
        title: `B${i}`,
        payload: `B${i}`,
      }));
      expect(() =>
        client.sendGenericTemplate("psid-1", [element, { title: "T", buttons }]),
      ).toThrow("sendGenericTemplate: element 1 has 4 buttons, the limit is 3");
    });
  });

  describe("sendButtonTemplate()", () => {
    const buttons = [
      { type: "postback" as const, title: "Track order", payload: "TRACK" },
      { type: "web_url" as const, title: "Site", url: "https://example.com" },
    ];

    it("calls POST {pageId}/messages with a button template attachment", async () => {
      await client.sendButtonTemplate("psid-1", "What now?", buttons, { messagingType: "UPDATE" });

      expect(client.restClient.post).toHaveBeenCalledWith("page-123/messages", {
        recipient: { id: "psid-1" },
        message: {
          attachment: {
            type: "template",
            payload: { template_type: "button", text: "What now?", buttons },
          },
        },
        messaging_type: "UPDATE",
      });
    });

    it("refuses 4 buttons or none", () => {
      expect(() =>
        client.sendButtonTemplate("psid-1", "Hi", [...buttons, ...buttons.slice(0, 2)]),
      ).toThrow("sendButtonTemplate needs 1 to 3 buttons, got 4");
      expect(() => client.sendButtonTemplate("psid-1", "Hi", [])).toThrow("got 0");
      expect(client.restClient.post).not.toHaveBeenCalled();
    });

    it("refuses text over 640 characters", () => {
      expect(() => client.sendButtonTemplate("psid-1", "x".repeat(641), buttons)).toThrow(
        "sendButtonTemplate: text is over 640 characters",
      );
    });
  });

  // ── Handover Protocol ───────────────────────────────────────────────────────

  describe("passThreadControl()", () => {
    it("calls POST {pageId}/pass_thread_control with recipient and target_app_id", async () => {
      await client.passThreadControl("user-1", "app-id-999");

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      const body = callBody(client.restClient.post as jest.Mock);
      expect(endpoint).toBe("page-123/pass_thread_control");
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
    it("calls POST {pageId}/take_thread_control", async () => {
      await client.takeThreadControl("user-1");

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      expect(endpoint).toBe("page-123/take_thread_control");
    });
  });

  describe("requestThreadControl()", () => {
    it("calls POST {pageId}/request_thread_control", async () => {
      await client.requestThreadControl("user-1");

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      expect(endpoint).toBe("page-123/request_thread_control");
    });
  });

  describe("getThreadOwner()", () => {
    it("calls GET {pageId}/thread_owner with recipient_id param", async () => {
      await client.getThreadOwner("user-1");

      const endpoint = callEndpoint(client.restClient.get as jest.Mock);
      const config = callConfig(client.restClient.get as jest.Mock);
      expect(endpoint).toBe("page-123/thread_owner");
      expect(config.params?.recipient_id).toBe("user-1");
    });
  });

  describe("getSecondaryReceivers()", () => {
    it("calls GET {pageId}/secondary_receivers with id,name fields", async () => {
      await client.getSecondaryReceivers();

      const endpoint = callEndpoint(client.restClient.get as jest.Mock);
      const config = callConfig(client.restClient.get as jest.Mock);
      expect(endpoint).toBe("page-123/secondary_receivers");
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
      expect(endpoint).toBe("page-123/messages");
      expect(body.recipient).toEqual({ one_time_notif_token: "otn-token-xyz" });
      expect((body as Record<string, { text: string }>).message.text).toBe("Here is your update!");
    });
  });

  // ── Attachment Upload API ────────────────────────────────────────────────────

  describe("uploadAttachment()", () => {
    it("calls POST {pageId}/message_attachments with the attachment wrapped in a message envelope", async () => {
      await client.uploadAttachment({
        type: "image",
        payload: { url: "https://example.com/banner.jpg" },
      });

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      const body = callBody<{ message: { attachment: { type: string } } }>(
        client.restClient.post as jest.Mock,
      );
      expect(endpoint).toBe("page-123/message_attachments");
      expect(body.message.attachment.type).toBe("image");
    });

    it("passes through video type attachments", async () => {
      await client.uploadAttachment({
        type: "video",
        payload: { url: "https://example.com/intro.mp4" },
      });

      const body = callBody<{ message: { attachment: { type: string } } }>(
        client.restClient.post as jest.Mock,
      );
      expect(body.message.attachment.type).toBe("video");
    });
  });

  // ── Persona API ───────────────────────────────────────────────────────────────

  describe("createPersona()", () => {
    it("calls POST {pageId}/personas with name and profile_picture_url", async () => {
      await client.createPersona({
        name: "Order Bot",
        profile_picture_url: "https://example.com/bot.jpg",
      });

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      const body = callBody(client.restClient.post as jest.Mock);
      expect(endpoint).toBe("page-123/personas");
      expect(body.name).toBe("Order Bot");
      expect(body.profile_picture_url).toBe("https://example.com/bot.jpg");
    });
  });

  describe("getPersona()", () => {
    it("calls GET /{personaId}", async () => {
      await client.getPersona("persona-abc");

      const endpoint = callEndpoint(client.restClient.get as jest.Mock);
      expect(endpoint).toBe("persona-abc");
    });
  });

  describe("deletePersona()", () => {
    it("calls DELETE /{personaId}", async () => {
      await client.deletePersona("persona-abc");

      const endpoint = callEndpoint(client.restClient.delete as jest.Mock);
      expect(endpoint).toBe("persona-abc");
    });
  });

  // ── User Profile API ────────────────────────────────────────────────────────

  describe("getUserProfile()", () => {
    it("calls GET /{psid} with default fields", async () => {
      await client.getUserProfile("user-psid-123");

      const endpoint = callEndpoint(client.restClient.get as jest.Mock);
      const config = callConfig(client.restClient.get as jest.Mock);
      expect(endpoint).toBe("user-psid-123");
      expect(config.params).toEqual({
        fields: "first_name,last_name,profile_pic,locale,timezone",
      });
    });

    it("calls GET /{psid} with custom fields", async () => {
      await client.getUserProfile("user-psid-123", ["first_name", "gender"]);

      const config = callConfig(client.restClient.get as jest.Mock);
      expect(config.params).toEqual({ fields: "first_name,gender" });
    });
  });

  // ── Conversations API ───────────────────────────────────────────────────────

  describe("getConversations()", () => {
    it("calls GET {pageId}/conversations with no extra params by default", async () => {
      await client.getConversations();

      const endpoint = callEndpoint(client.restClient.get as jest.Mock);
      const config = callConfig(client.restClient.get as jest.Mock);
      expect(endpoint).toBe("page-123/conversations");
      expect(config.params).toEqual({});
    });

    it("passes string fields param", async () => {
      await client.getConversations({ fields: "id,snippet,updated_time" });

      const config = callConfig(client.restClient.get as jest.Mock);
      expect(config.params).toEqual({ fields: "id,snippet,updated_time" });
    });

    it("joins array fields param into comma-separated string", async () => {
      await client.getConversations({ fields: ["id", "snippet", "updated_time"] });

      const config = callConfig(client.restClient.get as jest.Mock);
      expect(config.params).toEqual({ fields: "id,snippet,updated_time" });
    });

    it("passes additional params like limit and platform", async () => {
      await client.getConversations({ limit: 10, platform: "messenger" });

      const config = callConfig(client.restClient.get as jest.Mock);
      expect(config.params).toMatchObject({ limit: 10, platform: "messenger" });
    });
  });

  // ── Private Replies ─────────────────────────────────────────────────────────

  describe("sendPrivateReply()", () => {
    it("sends a private reply to a comment via POST {pageId}/messages", async () => {
      await client.sendPrivateReply({ comment_id: "comment-xyz" }, "Thanks for your comment!");

      const endpoint = callEndpoint(client.restClient.post as jest.Mock);
      const body = callBody(client.restClient.post as jest.Mock);
      expect(endpoint).toBe(`${PAGE_ID}/messages`);
      expect(body).toEqual({
        recipient: { comment_id: "comment-xyz" },
        message: { text: "Thanks for your comment!" },
      });
    });

    it("sends a private reply to a post via POST {pageId}/messages", async () => {
      await client.sendPrivateReply({ post_id: "post-abc" }, "We'll help you shortly!");

      const body = callBody(client.restClient.post as jest.Mock);
      expect(body).toEqual({
        recipient: { post_id: "post-abc" },
        message: { text: "We'll help you shortly!" },
      });
    });
  });
});
