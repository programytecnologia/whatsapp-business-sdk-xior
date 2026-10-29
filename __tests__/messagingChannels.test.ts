import { InstagramClient } from "../src/instagram_client";
import { MessengerClient } from "../src/messenger_client";
import {
  isOutsideMessagingWindowError,
  isRecipientUnavailableError,
  MESSENGER_ERROR_SUBCODES,
} from "../src/types/messenger/error";
import { DEFAULT_GRAPH_API_VERSION, graphApiBaseUrl } from "../src/utils/graphApi";
import { MessengerErrorHandler } from "../src/utils/messengerErrorHandler";
import { WABAClient } from "../src/WABA_client";

const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockImplementation(
    async () =>
      new Response(JSON.stringify({ recipient_id: "1", message_id: "m_1" }), { status: 200 }),
  );
  globalThis.fetch = mockFetch as unknown as typeof fetch;
});

const lastCall = () => {
  const [url, init] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1] as [
    string,
    RequestInit,
  ];
  return {
    url: new URL(url),
    method: init.method,
    body: init.body ? JSON.parse(init.body as string) : undefined,
  };
};

describe("Graph API version", () => {
  it("defaults every client to the same version", () => {
    const expected = `https://graph.facebook.com/${DEFAULT_GRAPH_API_VERSION}`;
    expect(new MessengerClient({ apiToken: "t", pageId: "1" }).restClient.config.baseURL).toBe(
      expected,
    );
    expect(new InstagramClient({ apiToken: "t", igUserId: "2" }).restClient.config.baseURL).toBe(
      expected,
    );
    expect(
      new WABAClient({ apiToken: "t", phoneId: "3", accountId: "4" }).restClient.config.baseURL,
    ).toBe(expected);
  });

  it("uses the version passed to the client", async () => {
    const client = new MessengerClient({ apiToken: "t", pageId: "1", graphApiVersion: "v26.0" });
    await client.sendText("psid", "oi");
    expect(lastCall().url.pathname).toBe("/v26.0/1/messages");
  });

  it.each([
    "26.0",
    "v26",
    "v26.0/../../evil",
    "v26.0?access_token=x",
    "",
    "v26.0/",
  ])("refuses the version %p", (version) => {
    expect(() => graphApiBaseUrl(version)).toThrow(/Invalid Graph API version/);
    expect(
      () => new InstagramClient({ apiToken: "t", igUserId: "2", graphApiVersion: version }),
    ).toThrow();
  });
});

describe("node ids can't change the request path", () => {
  it.each([
    "../me",
    "1/messages",
    "1?x=1",
    "1#frag",
    "",
    "..",
    " 1",
    "1\n",
  ])("refuses the page id %p", (pageId) => {
    expect(() => new MessengerClient({ apiToken: "t", pageId })).toThrow(/Invalid pageId/);
  });

  it("refuses a scoped user id that would traverse paths", () => {
    const messenger = new MessengerClient({ apiToken: "t", pageId: "1" });
    const instagram = new InstagramClient({ apiToken: "t", igUserId: "2" });
    expect(() => messenger.getUserProfile("../1/messages")).toThrow(/Invalid psid/);
    expect(() => instagram.getUserProfile("2/subscribed_apps")).toThrow(/Invalid igsid/);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("MessengerClient", () => {
  const client = () => new MessengerClient({ apiToken: "page-token", pageId: "111" });

  it("sends on the Page node, so a system user token works too", async () => {
    await client().sendText("psid-1", "Olá");
    const call = lastCall();
    expect(call.url.pathname).toBe(`/${DEFAULT_GRAPH_API_VERSION}/111/messages`);
    expect(call.body).toEqual({
      recipient: { id: "psid-1" },
      message: { text: "Olá" },
      messaging_type: "RESPONSE",
    });
  });

  it("switches to MESSAGE_TAG when a tag is passed, even if a messaging type is too", async () => {
    await client().sendText("psid-1", "Oi", { messagingType: "UPDATE", tag: "HUMAN_AGENT" });
    expect(lastCall().body).toMatchObject({ messaging_type: "MESSAGE_TAG", tag: "HUMAN_AGENT" });
  });

  it("quotes a message with reply_to at the top level", async () => {
    await client().sendText("psid-1", "Sim", { replyTo: "m_abc" });
    expect(lastCall().body.reply_to).toEqual({ mid: "m_abc" });
    expect(lastCall().body.message.reply_to).toBeUndefined();
  });

  it("reacts and unreacts with the message id in the payload", async () => {
    await client().sendReaction("psid-1", "m_abc", "👍");
    expect(lastCall().body).toEqual({
      recipient: { id: "psid-1" },
      sender_action: "react",
      payload: { message_id: "m_abc", reaction: "👍" },
    });
    await client().removeReaction("psid-1", "m_abc");
    expect(lastCall().body).toEqual({
      recipient: { id: "psid-1" },
      sender_action: "unreact",
      payload: { message_id: "m_abc" },
    });
  });

  it("sends typing indicators with only the recipient and the action", async () => {
    await client().sendSenderAction("psid-1", "typing_on");
    expect(lastCall().body).toEqual({ recipient: { id: "psid-1" }, sender_action: "typing_on" });
  });

  it("subscribes the Page with comma-joined fields", async () => {
    await client().subscribeApp(["messages", "message_echoes", "messaging_referrals"]);
    const call = lastCall();
    expect(call.method).toBe("POST");
    expect(call.url.pathname).toBe(`/${DEFAULT_GRAPH_API_VERSION}/111/subscribed_apps`);
    expect(call.url.searchParams.get("subscribed_fields")).toBe(
      "messages,message_echoes,messaging_referrals",
    );
    expect(call.body).toBeUndefined();
  });

  it("refuses to subscribe with no fields (Meta would unsubscribe everything)", () => {
    expect(() => client().subscribeApp([])).toThrow(/at least one field/);
  });

  it("reads and removes the subscription", async () => {
    await client().getSubscribedApps();
    expect(lastCall().method).toBe("GET");
    await client().unsubscribeApp();
    expect(lastCall().method).toBe("DELETE");
    expect(lastCall().url.pathname).toMatch(/\/111\/subscribed_apps$/);
  });

  it("does not leak the token into the URL", async () => {
    await client().sendText("psid-1", "x");
    expect(lastCall().url.search).not.toContain("page-token");
    const init = mockFetch.mock.calls[mockFetch.mock.calls.length - 1][1] as RequestInit;
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer page-token");
  });
});

describe("InstagramClient", () => {
  const client = () => new InstagramClient({ apiToken: "bisu", igUserId: "1784" });

  it("sends quick replies inside the message", async () => {
    await client().sendQuickReplies("igsid-1", "Escolha", [
      { content_type: "text", title: "Sim", payload: "YES" },
    ]);
    expect(lastCall().body).toEqual({
      recipient: { id: "igsid-1" },
      message: {
        text: "Escolha",
        quick_replies: [{ content_type: "text", title: "Sim", payload: "YES" }],
      },
      messaging_type: "RESPONSE",
    });
  });

  it("only reacts with love", async () => {
    await client().sendReaction("igsid-1", "m_1");
    expect(lastCall().body.payload).toEqual({ message_id: "m_1", reaction: "love" });
  });

  it("uses HUMAN_AGENT as a message tag", async () => {
    await client().sendText("igsid-1", "Atendente aqui", { tag: "HUMAN_AGENT" });
    expect(lastCall().body).toMatchObject({ tag: "HUMAN_AGENT", messaging_type: "MESSAGE_TAG" });
  });

  it("reads a user's profile with the requested fields", async () => {
    await client().getUserProfile("igsid-1", ["username", "name"]);
    const call = lastCall();
    expect(call.url.pathname).toBe(`/${DEFAULT_GRAPH_API_VERSION}/igsid-1`);
    expect(call.url.searchParams.get("fields")).toBe("username,name");
  });

  it("subscribes the account to messaging fields", async () => {
    await client().subscribeApp(["messages", "messaging_postbacks"]);
    expect(lastCall().url.pathname).toMatch(/\/1784\/subscribed_apps$/);
    expect(lastCall().url.searchParams.get("subscribed_fields")).toBe(
      "messages,messaging_postbacks",
    );
  });
});

describe("Send API errors", () => {
  it("keeps Meta's message next to the generic label", async () => {
    await expect(
      MessengerErrorHandler({
        error: {
          code: 10,
          error_subcode: 2018278,
          message: "(#10) This message is sent outside of allowed window.",
          type: "OAuthException",
          fbtrace_id: "x",
        },
      }),
    ).rejects.toMatchObject({
      code: 10,
      error_subcode: 2018278,
      message: "API Permission Denied: (#10) This message is sent outside of allowed window.",
    });
  });

  it("keeps the original message for codes it doesn't know", async () => {
    await expect(
      MessengerErrorHandler({
        error: {
          code: 9999 as never,
          message: "Something new",
          type: "x",
          fbtrace_id: "x",
        },
      }),
    ).rejects.toMatchObject({ message: "Something new" });
  });

  it("recognizes a closed window on both channels, and nothing else", () => {
    expect(
      isOutsideMessagingWindowError({
        code: 10,
        error_subcode: MESSENGER_ERROR_SUBCODES.OUTSIDE_WINDOW,
      }),
    ).toBe(true);
    expect(
      isOutsideMessagingWindowError({
        code: 10,
        error_subcode: MESSENGER_ERROR_SUBCODES.IG_OUTSIDE_WINDOW,
      }),
    ).toBe(true);
    expect(isOutsideMessagingWindowError({ code: 10 })).toBe(false);
    expect(isOutsideMessagingWindowError({ code: 100, error_subcode: 2018278 })).toBe(false);
  });

  it("recognizes a recipient that can't be messaged", () => {
    expect(isRecipientUnavailableError({ code: 551 })).toBe(true);
    expect(isRecipientUnavailableError({ code: 200, error_subcode: 1545041 })).toBe(true);
    expect(isRecipientUnavailableError({ code: 100, error_subcode: 2018001 })).toBe(true);
    expect(isRecipientUnavailableError({ code: 4 })).toBe(false);
  });
});
