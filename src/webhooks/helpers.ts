import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { NextFunction, Request, Response } from "express";
import type {
  MessagingWebhookValue,
  Webhook,
  WebhookAccountAlert,
  WebhookAccountReviewUpdate,
  WebhookBusinessCapabilityUpdate,
  WebhookBusinessUsernameUpdate,
  WebhookCallConnect,
  WebhookCallTerminate,
  WebhookEvents,
  WebhookFlow,
  WebhookPhoneNumberNameUpdate,
  WebhookPhoneNumberQualityUpdate,
  WebhookSecurity,
  WebhookTemplateCategoryUpdate,
  WebhookTemplateQualityUpdate,
  WebhookTemplateStatusUpdate,
} from "../types";

export const webhookHandler = (
  body: Webhook,
  {
    onError,
    onMessageReceived,
    onStatusReceived,
    onTextMessageReceived,
    onCallConnected,
    onCallTerminated,
    onMessageEcho,
    onAccountUpdate,
    onHistorySync,
    onStateSync,
    onTemplateStatusUpdate,
    onTemplateQualityUpdate,
    onTemplateCategoryUpdate,
    onPhoneNumberQualityUpdate,
    onPhoneNumberNameUpdate,
    onFlowUpdate,
    onSecurityAlert,
    onBusinessCapabilityUpdate,
    onAccountReviewUpdate,
    onAccountAlert,
    onBusinessUsernameUpdate,
  }: Omit<WebhookEvents, "onStartListening">,
) => {
  body.entry?.forEach((entry) => {
    entry?.changes?.forEach((change) => {
      //Dispatch admin webhooks by field name — each has its own value shape
      if (change.field === "message_template_status_update") {
        onTemplateStatusUpdate?.(change.value as WebhookTemplateStatusUpdate);
        return;
      }
      if (change.field === "message_template_quality_update") {
        onTemplateQualityUpdate?.(change.value as WebhookTemplateQualityUpdate);
        return;
      }
      if (change.field === "message_template_category_update") {
        onTemplateCategoryUpdate?.(change.value as WebhookTemplateCategoryUpdate);
        return;
      }
      if (change.field === "phone_number_quality_update") {
        onPhoneNumberQualityUpdate?.(change.value as WebhookPhoneNumberQualityUpdate);
        return;
      }
      if (change.field === "phone_number_name_update") {
        onPhoneNumberNameUpdate?.(change.value as WebhookPhoneNumberNameUpdate);
        return;
      }
      if (change.field === "flows") {
        onFlowUpdate?.(change.value as WebhookFlow);
        return;
      }
      if (change.field === "security") {
        onSecurityAlert?.(change.value as WebhookSecurity);
        return;
      }
      if (change.field === "business_capability_update") {
        onBusinessCapabilityUpdate?.(change.value as WebhookBusinessCapabilityUpdate);
        return;
      }
      if (change.field === "account_review_update") {
        onAccountReviewUpdate?.(change.value as WebhookAccountReviewUpdate);
        return;
      }
      if (change.field === "account_alerts") {
        onAccountAlert?.(change.value as WebhookAccountAlert);
        return;
      }
      if (change.field === "business_username_update") {
        onBusinessUsernameUpdate?.(change.value as WebhookBusinessUsernameUpdate);
        return;
      }
      //Messaging-style webhook fields (messages, statuses, calls, echoes, etc.)
      //After the admin checks TypeScript narrows change.value to MessagingWebhookValue
      const msgValue = change.value as MessagingWebhookValue;
      //Generally, if not always, the message is just the index 0
      //But, since the docs don't say anything, we do it through a loop
      msgValue.messages?.forEach((message) => {
        //The contact is always the 0 and it is only received when there the messages field is present
        const contact = msgValue.contacts[0];
        //Call message event
        onMessageReceived?.(message, contact, msgValue.metadata);
        //If the message is type of text, then call the respective event
        if (message.type === "text" && message.text)
          onTextMessageReceived?.(
            {
              id: message.id,
              type: message.type,
              text: message.text,
              from: message.from,
              timestamp: message.timestamp,
            },
            contact,
            msgValue.metadata,
          );
      });
      //Call status event
      msgValue.statuses?.forEach((status) => {
        onStatusReceived?.(status, msgValue.metadata);
      });
      //Call connect/terminate events
      msgValue.calls?.forEach((call) => {
        if (call.event === "connect")
          onCallConnected?.(call as WebhookCallConnect, msgValue.metadata);
        else if (call.event === "terminate")
          onCallTerminated?.(call as WebhookCallTerminate, msgValue.metadata);
      });
      //Call message echo events (smb_message_echoes — WBA app outbound messages)
      msgValue.message_echoes?.forEach((echo) => {
        onMessageEcho?.(echo, msgValue.metadata);
      });
      //Call state sync events (smb_app_state_sync — contact add/edit/remove)
      msgValue.state_sync?.forEach((sync) => {
        onStateSync?.(sync, msgValue.metadata);
      });
      //Call history sync events (history — chat history chunks)
      msgValue.history?.forEach((history) => {
        onHistorySync?.(history, msgValue.metadata);
      });
      //Call account update event (account_update — WABA lifecycle)
      if (msgValue.account_update) {
        onAccountUpdate?.(msgValue.account_update);
      }
      //Call error event
      msgValue.errors?.forEach((err) => {
        onError?.(err);
      });
    });
  });
};

export const postWebhookController = (events: WebhookEvents) => (req: Request, res: Response) => {
  webhookHandler(req.body, events);
  return res.send("success");
};

export const getWebhookController = (token: string) => (req: Request, res: Response) => {
  if (req.query["hub.mode"] === "subscribe" && req.query["hub.verify_token"] === token) {
    try {
      return res.send(req.query["hub.challenge"]);
    } catch (err) {
      console.error("Could not subscribe to the webhook", `err: ${JSON.stringify(err)}`);
    }
  }
  return res.sendStatus(400);
};

// ---------------------------------------------------------------------------
// Webhook payload signature verification (X-Hub-Signature-256)
// ---------------------------------------------------------------------------

/** Express Request extended with the raw body Buffer set by {@link captureRawBody}. */
export interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

/**
 * `verify` callback for `express.json()` that captures the raw body Buffer on `req.rawBody`.
 *
 * Usage: `app.use(express.json({ verify: captureRawBody }))`
 *
 * Required when using {@link verifyHubSignature} with a custom `expressApp`.
 */
export const captureRawBody: (
  req: IncomingMessage & { rawBody?: Buffer },
  res: ServerResponse,
  buf: Buffer,
) => void = (req, _res, buf) => {
  req.rawBody = buf;
};

/**
 * Express middleware that verifies the `X-Hub-Signature-256` header Meta attaches to every
 * webhook POST. Responds 403 if the header is absent, malformed, or does not match.
 *
 * The webhook clients apply this automatically when `appSecret` is provided.
 * For custom express apps, also add `express.json({ verify: captureRawBody })`.
 *
 * @param appSecret - Your Meta App Secret (App Dashboard → Settings → Basic → App Secret).
 */
export const verifyHubSignature =
  (appSecret: string) =>
  (req: RawBodyRequest, res: Response, next: NextFunction): void => {
    const sigHeader = req.headers["x-hub-signature-256"];
    const sig = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;
    if (!sig || !req.rawBody) {
      res.sendStatus(403);
      return;
    }
    const expected = `sha256=${createHmac("sha256", appSecret).update(req.rawBody).digest("hex")}`;
    const sigBuf = Buffer.from(sig, "utf8");
    const expectedBuf = Buffer.from(expected, "utf8");
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      res.sendStatus(403);
      return;
    }
    next();
  };
