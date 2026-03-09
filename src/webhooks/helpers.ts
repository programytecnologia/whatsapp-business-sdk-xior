import type { Request, Response } from "express";
import type { Webhook, WebhookCallConnect, WebhookCallTerminate, WebhookEvents } from "../types";

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
  }: Omit<WebhookEvents, "onStartListening">,
) => {
  body.entry?.forEach((entry) => {
    entry?.changes?.forEach((change) => {
      //Generally, if not always, the message is just the index 0
      //But, since the docs don't say anything, we do it through a loop
      change?.value?.messages?.forEach((message) => {
        //The contact is always the 0 and it is only received when there the messages field is present
        const contact = change?.value?.contacts[0];
        //Call message event
        onMessageReceived?.(message, contact, change?.value?.metadata);
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
            change?.value?.metadata,
          );
      });
      //Call status event
      change?.value?.statuses?.forEach((status) => {
        onStatusReceived?.(status, change?.value?.metadata);
      });
      //Call connect/terminate events
      change?.value?.calls?.forEach((call) => {
        if (call.event === "connect")
          onCallConnected?.(call as WebhookCallConnect, change?.value?.metadata);
        else if (call.event === "terminate")
          onCallTerminated?.(call as WebhookCallTerminate, change?.value?.metadata);
      });
      //Call message echo events (smb_message_echoes — WBA app outbound messages)
      change?.value?.message_echoes?.forEach((echo) => {
        onMessageEcho?.(echo, change?.value?.metadata);
      });
      //Call state sync events (smb_app_state_sync — contact add/edit/remove)
      change?.value?.state_sync?.forEach((sync) => {
        onStateSync?.(sync, change?.value?.metadata);
      });
      //Call history sync events (history — chat history chunks)
      change?.value?.history?.forEach((history) => {
        onHistorySync?.(history, change?.value?.metadata);
      });
      //Call account update event (account_update — WABA lifecycle)
      if (change?.value?.account_update) {
        onAccountUpdate?.(change.value.account_update);
      }
      //Call error event
      change?.value?.errors?.forEach((err) => {
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
