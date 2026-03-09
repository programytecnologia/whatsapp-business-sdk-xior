import type {
  IGMessaging,
  IGWebhookMessage,
  InstagramWebhook,
  InstagramWebhookEvents,
} from "../src/types/instagram";
import { instagramWebhookHandler } from "../src/webhooks/instagram/helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sender = { id: "user-1" };
const recipient = { id: "ig-user-456" };

/** Build an InstagramWebhook body with a single messaging entry. */
const makeBody = (messaging: Partial<IGMessaging>): InstagramWebhook => ({
  object: "instagram",
  entry: [
    {
      id: "ig-user-456",
      time: 1739321000,
      messaging: [{ sender, recipient, timestamp: 1739321000, ...messaging }],
    },
  ],
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const textMessage: IGWebhookMessage = {
  mid: "mid.ig.001",
  text: "Hey!",
};

const imageMessage: IGWebhookMessage = {
  mid: "mid.ig.002",
  attachments: [{ type: "image", payload: { url: "https://example.com/photo.jpg" } }],
};

const storyMentionMessage: IGWebhookMessage = {
  mid: "mid.ig.003",
  attachments: [
    {
      type: "story_mention",
      payload: { cdnUrl: "https://cdn.example.com/story.jpg" },
    },
  ],
};

const echoMessage: IGWebhookMessage = {
  mid: "mid.ig.004",
  text: "Sent by business account",
  is_echo: true,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("instagramWebhookHandler", () => {
  let events: Omit<InstagramWebhookEvents, "onStartListening">;

  beforeEach(() => {
    events = {
      onMessageReceived: jest.fn(),
      onTextMessageReceived: jest.fn(),
      onAttachmentReceived: jest.fn(),
      onStoryMentionReceived: jest.fn(),
      onReactionReceived: jest.fn(),
      onReadReceived: jest.fn(),
      onReferralReceived: jest.fn(),
      onPostbackReceived: jest.fn(),
      onEchoReceived: jest.fn(),
    };
  });

  // ── Text messages ───────────────────────────────────────────────────────────

  describe("text messages", () => {
    it("fires onMessageReceived and onTextMessageReceived", () => {
      instagramWebhookHandler(makeBody({ message: textMessage }), events);

      expect(events.onMessageReceived).toHaveBeenCalledTimes(1);
      expect(events.onTextMessageReceived).toHaveBeenCalledWith(
        expect.objectContaining({ sender }),
        "Hey!",
      );
    });

    it("does NOT fire onEchoReceived for a regular message", () => {
      instagramWebhookHandler(makeBody({ message: textMessage }), events);

      expect(events.onEchoReceived).not.toHaveBeenCalled();
    });
  });

  // ── Regular image attachment ────────────────────────────────────────────────

  describe("image/video attachment", () => {
    it("fires onAttachmentReceived (NOT onStoryMentionReceived) for a regular image attachment", () => {
      instagramWebhookHandler(makeBody({ message: imageMessage }), events);

      expect(events.onAttachmentReceived).toHaveBeenCalledTimes(1);
      expect(events.onStoryMentionReceived).not.toHaveBeenCalled();
    });

    it("passes the full attachments array to onAttachmentReceived", () => {
      instagramWebhookHandler(makeBody({ message: imageMessage }), events);

      expect(events.onAttachmentReceived).toHaveBeenCalledWith(
        expect.objectContaining({ sender }),
        imageMessage.attachments,
      );
    });
  });

  // ── Story mentions ──────────────────────────────────────────────────────────

  describe("story mention", () => {
    it("fires onStoryMentionReceived (NOT onAttachmentReceived) for a story_mention attachment", () => {
      instagramWebhookHandler(makeBody({ message: storyMentionMessage }), events);

      expect(events.onStoryMentionReceived).toHaveBeenCalledTimes(1);
      expect(events.onAttachmentReceived).not.toHaveBeenCalled();
    });

    it("passes the story_mention attachment to onStoryMentionReceived", () => {
      instagramWebhookHandler(makeBody({ message: storyMentionMessage }), events);

      const [, attachment] = (events.onStoryMentionReceived as jest.Mock).mock.calls[0];
      expect(attachment.type).toBe("story_mention");
    });

    it("still fires onMessageReceived for the parent message", () => {
      instagramWebhookHandler(makeBody({ message: storyMentionMessage }), events);

      expect(events.onMessageReceived).toHaveBeenCalledTimes(1);
    });
  });

  // ── Echo messages ───────────────────────────────────────────────────────────

  describe("echo messages", () => {
    it("fires onEchoReceived and skips all other message events", () => {
      instagramWebhookHandler(makeBody({ message: echoMessage }), events);

      expect(events.onEchoReceived).toHaveBeenCalledTimes(1);
      expect(events.onMessageReceived).not.toHaveBeenCalled();
      expect(events.onTextMessageReceived).not.toHaveBeenCalled();
    });
  });

  // ── Reaction ─────────────────────────────────────────────────────────────────

  describe("reaction", () => {
    it("fires onReactionReceived with the reaction object", () => {
      const reaction = {
        mid: "mid.ig.001",
        action: "react" as const,
        reaction: "heart",
        emoji: "❤️",
      };
      instagramWebhookHandler(makeBody({ reaction }), events);

      expect(events.onReactionReceived).toHaveBeenCalledWith(
        expect.objectContaining({ sender }),
        reaction,
      );
    });

    it("fires for unreact actions", () => {
      const reaction = { mid: "mid.ig.001", action: "unreact" as const };
      instagramWebhookHandler(makeBody({ reaction }), events);

      expect(events.onReactionReceived).toHaveBeenCalledTimes(1);
    });
  });

  // ── Read receipts ────────────────────────────────────────────────────────────

  describe("read", () => {
    it("fires onReadReceived", () => {
      const read = { mid: "mid.ig.001", watermark: 1739321050 };
      instagramWebhookHandler(makeBody({ read }), events);

      expect(events.onReadReceived).toHaveBeenCalledWith(expect.objectContaining({ sender }), read);
    });
  });

  // ── Referral ─────────────────────────────────────────────────────────────────

  describe("referral", () => {
    it("fires onReferralReceived with the referral object", () => {
      const referral = { ref: "my-ig-ref", source: "SHORTLINK", type: "OPEN_THREAD" };
      instagramWebhookHandler(makeBody({ referral }), events);

      expect(events.onReferralReceived).toHaveBeenCalledWith(
        expect.objectContaining({ sender }),
        referral,
      );
    });
  });

  // ── Postback ─────────────────────────────────────────────────────────────────

  describe("postback", () => {
    it("fires onPostbackReceived with the postback object", () => {
      const postback = { title: "FAQ", payload: "FAQ_PAYLOAD" };
      instagramWebhookHandler(makeBody({ postback }), events);

      expect(events.onPostbackReceived).toHaveBeenCalledTimes(1);
      expect(events.onPostbackReceived).toHaveBeenCalledWith(
        expect.objectContaining({ sender }),
        postback,
      );
    });

    it("does NOT fire any message events for a postback", () => {
      const postback = { title: "FAQ", payload: "FAQ_PAYLOAD" };
      instagramWebhookHandler(makeBody({ postback }), events);

      expect(events.onMessageReceived).not.toHaveBeenCalled();
      expect(events.onTextMessageReceived).not.toHaveBeenCalled();
    });
  });

  // ── Multiple entries ─────────────────────────────────────────────────────────

  describe("multiple entries", () => {
    it("processes all messaging items", () => {
      const body: InstagramWebhook = {
        object: "instagram",
        entry: [
          {
            id: "ig-user-456",
            time: 1739321000,
            messaging: [
              { sender, recipient, timestamp: 1739321000, message: textMessage },
              {
                sender: { id: "user-2" },
                recipient,
                timestamp: 1739321001,
                message: { mid: "mid.ig.005", text: "Second message" },
              },
            ],
          },
        ],
      };
      instagramWebhookHandler(body, events);

      expect(events.onMessageReceived).toHaveBeenCalledTimes(2);
      expect(events.onTextMessageReceived).toHaveBeenCalledTimes(2);
    });
  });

  // ── No-op for empty events ────────────────────────────────────────────────────

  describe("graceful no-ops", () => {
    it("does not throw when no event handlers are registered", () => {
      expect(() => instagramWebhookHandler(makeBody({ message: textMessage }), {})).not.toThrow();
    });
  });
});
