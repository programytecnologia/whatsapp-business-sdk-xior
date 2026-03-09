import type {
  MessengerMessaging,
  MessengerWebhook,
  MessengerWebhookEvents,
  MessengerWebhookMessage,
} from "../src/types/messenger";
import { messengerWebhookHandler } from "../src/webhooks/messenger/helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sender = { id: "user-1" };
const recipient = { id: "page-123" };

/** Build a MessengerWebhook body with a single messaging entry. */
const makeBody = (messaging: Partial<MessengerMessaging>): MessengerWebhook => ({
  object: "page",
  entry: [
    {
      id: "page-123",
      time: 1739321000,
      messaging: [{ sender, recipient, timestamp: 1739321000, ...messaging }],
    },
  ],
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const textMessage: MessengerWebhookMessage = {
  mid: "mid.001",
  text: "Hello from user",
};

const attachmentMessage: MessengerWebhookMessage = {
  mid: "mid.002",
  attachments: [{ type: "image", payload: { url: "https://example.com/img.jpg" } }],
};

const echoMessage: MessengerWebhookMessage = {
  mid: "mid.003",
  text: "Sent by page",
  is_echo: true,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("messengerWebhookHandler", () => {
  let events: Omit<MessengerWebhookEvents, "onStartListening">;

  beforeEach(() => {
    events = {
      onMessageReceived: jest.fn(),
      onTextMessageReceived: jest.fn(),
      onAttachmentReceived: jest.fn(),
      onPostbackReceived: jest.fn(),
      onReferralReceived: jest.fn(),
      onOptinReceived: jest.fn(),
      onReadReceived: jest.fn(),
      onDeliveryReceived: jest.fn(),
      onReactionReceived: jest.fn(),
      onHandoverReceived: jest.fn(),
      onThreadControlRequested: jest.fn(),
      onEchoReceived: jest.fn(),
    };
  });

  // ── Text messages ───────────────────────────────────────────────────────────

  describe("text messages", () => {
    it("fires onMessageReceived and onTextMessageReceived for a text message", () => {
      messengerWebhookHandler(makeBody({ message: textMessage }), events);

      expect(events.onMessageReceived).toHaveBeenCalledTimes(1);
      expect(events.onTextMessageReceived).toHaveBeenCalledTimes(1);
      expect(events.onTextMessageReceived).toHaveBeenCalledWith(
        expect.objectContaining({ sender }),
        "Hello from user",
      );
    });

    it("does NOT fire onEchoReceived for a non-echo message", () => {
      messengerWebhookHandler(makeBody({ message: textMessage }), events);

      expect(events.onEchoReceived).not.toHaveBeenCalled();
    });
  });

  // ── Attachment messages ─────────────────────────────────────────────────────

  describe("attachment messages", () => {
    it("fires onMessageReceived and onAttachmentReceived", () => {
      messengerWebhookHandler(makeBody({ message: attachmentMessage }), events);

      expect(events.onMessageReceived).toHaveBeenCalledTimes(1);
      expect(events.onAttachmentReceived).toHaveBeenCalledTimes(1);
      expect(events.onAttachmentReceived).toHaveBeenCalledWith(
        expect.objectContaining({ sender }),
        attachmentMessage.attachments,
      );
    });

    it("does NOT fire onTextMessageReceived for an attachment-only message", () => {
      messengerWebhookHandler(makeBody({ message: attachmentMessage }), events);

      expect(events.onTextMessageReceived).not.toHaveBeenCalled();
    });
  });

  // ── Echo messages ───────────────────────────────────────────────────────────

  describe("echo messages", () => {
    it("fires onEchoReceived and nothing else for an echo", () => {
      messengerWebhookHandler(makeBody({ message: echoMessage }), events);

      expect(events.onEchoReceived).toHaveBeenCalledTimes(1);
      expect(events.onMessageReceived).not.toHaveBeenCalled();
      expect(events.onTextMessageReceived).not.toHaveBeenCalled();
    });
  });

  // ── Postback ────────────────────────────────────────────────────────────────

  describe("postback", () => {
    it("fires onPostbackReceived with postback payload", () => {
      const postback = { title: "Get Started", payload: "GET_STARTED" };
      messengerWebhookHandler(makeBody({ postback }), events);

      expect(events.onPostbackReceived).toHaveBeenCalledTimes(1);
      expect(events.onPostbackReceived).toHaveBeenCalledWith(
        expect.objectContaining({ sender }),
        postback,
      );
    });
  });

  // ── Referral ────────────────────────────────────────────────────────────────

  describe("referral", () => {
    it("fires onReferralReceived", () => {
      const referral = { ref: "my-ref", source: "SHORTLINK", type: "OPEN_THREAD" };
      messengerWebhookHandler(makeBody({ referral }), events);

      expect(events.onReferralReceived).toHaveBeenCalledWith(
        expect.objectContaining({ sender }),
        referral,
      );
    });
  });

  // ── Optin ───────────────────────────────────────────────────────────────────

  describe("optin (OTN)", () => {
    it("fires onOptinReceived including the OTN token", () => {
      const optin = {
        type: "one_time_notif_req",
        one_time_notif_token: "otn-xyz",
        payload: "NOTIFY_ME",
      };
      messengerWebhookHandler(makeBody({ optin }), events);

      expect(events.onOptinReceived).toHaveBeenCalledWith(
        expect.objectContaining({ sender }),
        optin,
      );
    });
  });

  // ── Read / Delivery ─────────────────────────────────────────────────────────

  describe("read receipt", () => {
    it("fires onReadReceived with watermark", () => {
      const read = { watermark: 1739321050 };
      messengerWebhookHandler(makeBody({ read }), events);

      expect(events.onReadReceived).toHaveBeenCalledWith(expect.objectContaining({ sender }), read);
    });
  });

  describe("delivery", () => {
    it("fires onDeliveryReceived with watermark", () => {
      const delivery = { watermark: 1739321045, mids: ["mid.001"] };
      messengerWebhookHandler(makeBody({ delivery }), events);

      expect(events.onDeliveryReceived).toHaveBeenCalledWith(
        expect.objectContaining({ sender }),
        delivery,
      );
    });
  });

  // ── Reaction ─────────────────────────────────────────────────────────────────

  describe("reaction", () => {
    it("fires onReactionReceived", () => {
      const reaction = {
        mid: "mid.001",
        action: "react" as const,
        reaction: "love",
        emoji: "❤️",
      };
      messengerWebhookHandler(makeBody({ reaction }), events);

      expect(events.onReactionReceived).toHaveBeenCalledWith(
        expect.objectContaining({ sender }),
        reaction,
      );
    });

    it("fires for unreact actions too", () => {
      const reaction = { mid: "mid.001", action: "unreact" as const };
      messengerWebhookHandler(makeBody({ reaction }), events);

      expect(events.onReactionReceived).toHaveBeenCalledWith(
        expect.objectContaining({ sender }),
        reaction,
      );
    });
  });

  // ── Handover protocol ────────────────────────────────────────────────────────

  describe("handover — pass_thread_control", () => {
    it("fires onHandoverReceived for pass_thread_control", () => {
      const pass_thread_control = { new_owner_app_id: "app-999", metadata: "route-to-human" };
      messengerWebhookHandler(makeBody({ pass_thread_control }), events);

      expect(events.onHandoverReceived).toHaveBeenCalledTimes(1);
      expect(events.onHandoverReceived).toHaveBeenCalledWith(
        expect.objectContaining({ sender }),
        pass_thread_control,
      );
    });

    it("fires onHandoverReceived for take_thread_control", () => {
      const take_thread_control = { new_owner_app_id: "app-primary" };
      messengerWebhookHandler(makeBody({ take_thread_control }), events);

      expect(events.onHandoverReceived).toHaveBeenCalledTimes(1);
    });
  });

  // ── Handover — request_thread_control ────────────────────────────────────────

  describe("handover — request_thread_control", () => {
    it("fires onThreadControlRequested (NOT onHandoverReceived) for request_thread_control", () => {
      const request_thread_control = {
        requested_owner_app_id: "secondary-app-id",
        metadata: "transfer-request",
      };
      messengerWebhookHandler(makeBody({ request_thread_control }), events);

      expect(events.onThreadControlRequested).toHaveBeenCalledTimes(1);
      expect(events.onThreadControlRequested).toHaveBeenCalledWith(
        expect.objectContaining({ sender }),
        request_thread_control,
      );
      expect(events.onHandoverReceived).not.toHaveBeenCalled();
    });

    it("works without metadata", () => {
      const request_thread_control = { requested_owner_app_id: "secondary-app-id" };
      messengerWebhookHandler(makeBody({ request_thread_control }), events);

      expect(events.onThreadControlRequested).toHaveBeenCalledTimes(1);
    });
  });

  // ── Multiple entries ─────────────────────────────────────────────────────────

  describe("multiple entries", () => {
    it("processes all messaging items across multiple entries", () => {
      const body: MessengerWebhook = {
        object: "page",
        entry: [
          {
            id: "page-1",
            time: 1739321000,
            messaging: [
              { sender, recipient, timestamp: 1739321000, message: textMessage },
              {
                sender,
                recipient,
                timestamp: 1739321001,
                message: attachmentMessage,
              },
            ],
          },
        ],
      };
      messengerWebhookHandler(body, events);

      expect(events.onMessageReceived).toHaveBeenCalledTimes(2);
    });
  });

  // ── No-op for empty events ────────────────────────────────────────────────────

  describe("graceful no-ops", () => {
    it("does not throw when no event handlers are registered", () => {
      expect(() => messengerWebhookHandler(makeBody({ message: textMessage }), {})).not.toThrow();
    });
  });
});
