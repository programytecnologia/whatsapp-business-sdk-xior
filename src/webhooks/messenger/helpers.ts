import type { Request, Response } from "express";
import type {
  MessengerHandover,
  MessengerWebhook,
  MessengerWebhookEvents,
} from "../../types/messenger";

export const messengerWebhookHandler = (
  body: MessengerWebhook,
  {
    onMessageReceived,
    onTextMessageReceived,
    onAttachmentReceived,
    onPostbackReceived,
    onReferralReceived,
    onOptinReceived,
    onReadReceived,
    onDeliveryReceived,
    onReactionReceived,
    onHandoverReceived,
    onEchoReceived,
  }: Omit<MessengerWebhookEvents, "onStartListening">,
) => {
  body.entry?.forEach((entry) => {
    entry?.messaging?.forEach((messaging) => {
      // Echo messages (outbound messages sent by the page)
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
          onAttachmentReceived?.(messaging, messaging.message.attachments);
        }
      }

      if (messaging.postback) {
        onPostbackReceived?.(messaging, messaging.postback);
      }

      if (messaging.referral) {
        onReferralReceived?.(messaging, messaging.referral);
      }

      if (messaging.optin) {
        onOptinReceived?.(messaging, messaging.optin);
      }

      if (messaging.read) {
        onReadReceived?.(messaging, messaging.read);
      }

      if (messaging.delivery) {
        onDeliveryReceived?.(messaging, messaging.delivery);
      }

      if (messaging.reaction) {
        onReactionReceived?.(messaging, messaging.reaction);
      }

      // Handover protocol events
      const handover = messaging.pass_thread_control || messaging.take_thread_control;
      if (handover) {
        onHandoverReceived?.(messaging, handover as MessengerHandover);
      }
    });
  });
};

export const postMessengerWebhookController =
  (events: MessengerWebhookEvents) => (req: Request, res: Response) => {
    messengerWebhookHandler(req.body, events);
    return res.send("success");
  };
