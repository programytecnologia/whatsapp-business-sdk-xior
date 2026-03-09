import type { Request, Response } from "express";
import type { InstagramWebhook, InstagramWebhookEvents } from "../../types/instagram";

export const instagramWebhookHandler = (
  body: InstagramWebhook,
  {
    onMessageReceived,
    onTextMessageReceived,
    onAttachmentReceived,
    onStoryMentionReceived,
    onReactionReceived,
    onReadReceived,
    onReferralReceived,
    onPostbackReceived,
    onEchoReceived,
  }: Omit<InstagramWebhookEvents, "onStartListening">,
) => {
  body.entry?.forEach((entry) => {
    entry?.messaging?.forEach((messaging) => {
      // Echo messages
      if (messaging.message?.is_echo) {
        onEchoReceived?.(messaging, messaging.message);
        return;
      }

      // Inbound messages
      if (messaging.message) {
        onMessageReceived?.(messaging, messaging.message);

        if (messaging.message.text) {
          onTextMessageReceived?.(messaging, messaging.message.text);
        }

        if (messaging.message.attachments?.length) {
          // Story mentions are an attachment with type "story_mention"
          const storyMention = messaging.message.attachments.find(
            (a) => a.type === "story_mention",
          );
          if (storyMention) {
            onStoryMentionReceived?.(messaging, storyMention);
          } else {
            onAttachmentReceived?.(messaging, messaging.message.attachments);
          }
        }
      }

      if (messaging.reaction) {
        onReactionReceived?.(messaging, messaging.reaction);
      }

      if (messaging.read) {
        onReadReceived?.(messaging, messaging.read);
      }

      if (messaging.referral) {
        onReferralReceived?.(messaging, messaging.referral);
      }

      if (messaging.postback) {
        onPostbackReceived?.(messaging, messaging.postback);
      }
    });
  });
};

export const postInstagramWebhookController =
  (events: InstagramWebhookEvents) => (req: Request, res: Response) => {
    instagramWebhookHandler(req.body, events);
    return res.send("success");
  };
