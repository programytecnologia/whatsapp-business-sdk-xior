import type {
  GetMessengerProfileResponse,
  GetSecondaryReceiversResponse,
  GetThreadOwnerResponse,
  MessageTag,
  MessagingType,
  MessengerAttachment,
  MessengerProfile,
  MessengerProfileFieldName,
  MessengerSendPayload,
  MessengerSendResponse,
  QuickReply,
  SenderAction,
} from "./types/messenger";
import { MessengerErrorHandler } from "./utils/messengerErrorHandler";
import { createRestClient } from "./utils/restClient";

interface MessengerClientArgs {
  apiToken: string;
  /** The Page ID. Stored for reference; most endpoints use `me/` with a page access token. */
  pageId: string;
}

/**
 * Connector for the Messenger Platform Send API and related endpoints.
 *
 * Documentation: https://developers.facebook.com/docs/messenger-platform
 */
export class MessengerClient {
  restClient: ReturnType<typeof createRestClient>;
  pageId: string;

  constructor({ apiToken, pageId }: MessengerClientArgs) {
    this.pageId = pageId;
    this.restClient = createRestClient({
      apiToken,
      baseURL: "https://graph.facebook.com/v25.0",
      errorHandler: (error) => MessengerErrorHandler(error?.response?.data || error),
    });
  }

  // ---------------------------------------------------------------------------
  // Send API
  // ---------------------------------------------------------------------------

  send(payload: MessengerSendPayload) {
    return this.restClient.post<MessengerSendResponse>("me/messages", payload);
  }

  sendText(
    recipientId: string,
    text: string,
    options?: { messagingType?: MessagingType; tag?: MessageTag },
  ) {
    return this.send({
      recipient: { id: recipientId },
      message: { text },
      messaging_type: options?.messagingType || "RESPONSE",
      tag: options?.tag,
    });
  }

  sendAttachment(recipientId: string, attachment: MessengerAttachment) {
    return this.send({
      recipient: { id: recipientId },
      message: { attachment },
    });
  }

  sendQuickReplies(recipientId: string, text: string, quick_replies: QuickReply[]) {
    return this.send({
      recipient: { id: recipientId },
      message: { text, quick_replies },
    });
  }

  sendSenderAction(recipientId: string, sender_action: SenderAction) {
    return this.send({ recipient: { id: recipientId }, sender_action });
  }

  // ---------------------------------------------------------------------------
  // Messenger Profile API
  // ---------------------------------------------------------------------------

  getProfile(fields: MessengerProfileFieldName[]) {
    return this.restClient.get<GetMessengerProfileResponse>("me/messenger_profile", undefined, {
      params: { fields: fields.join(",") },
    });
  }

  setProfile(payload: Partial<MessengerProfile>) {
    return this.restClient.post<{ result: string }>("me/messenger_profile", payload);
  }

  deleteProfile(fields: MessengerProfileFieldName[]) {
    return this.restClient.delete<{ result: string }>("me/messenger_profile", undefined, {
      params: { fields },
    });
  }

  // ---------------------------------------------------------------------------
  // Handover Protocol
  // ---------------------------------------------------------------------------

  passThreadControl(recipientId: string, targetAppId: string, metadata?: string) {
    return this.restClient.post<{ success: boolean }>("me/pass_thread_control", {
      recipient: { id: recipientId },
      target_app_id: targetAppId,
      ...(metadata !== undefined && { metadata }),
    });
  }

  takeThreadControl(recipientId: string, metadata?: string) {
    return this.restClient.post<{ success: boolean }>("me/take_thread_control", {
      recipient: { id: recipientId },
      ...(metadata !== undefined && { metadata }),
    });
  }

  requestThreadControl(recipientId: string, metadata?: string) {
    return this.restClient.post<{ success: boolean }>("me/request_thread_control", {
      recipient: { id: recipientId },
      ...(metadata !== undefined && { metadata }),
    });
  }

  getThreadOwner(recipientId: string) {
    return this.restClient.get<GetThreadOwnerResponse>("me/thread_owner", undefined, {
      params: { recipient_id: recipientId },
    });
  }

  getSecondaryReceivers() {
    return this.restClient.get<GetSecondaryReceiversResponse>("me/secondary_receivers", undefined, {
      params: { fields: "id,name" },
    });
  }

  // ---------------------------------------------------------------------------
  // One-Time Notification (OTN)
  // ---------------------------------------------------------------------------

  /** Send an OTN opt-in request template to a user. */
  sendOtnRequest(recipientId: string, title: string, payload: string) {
    return this.send({
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: "template",
          payload: { template_type: "one_time_notif_req", title, payload },
        },
      },
    });
  }

  /** Send the one-time follow-up message using the token received via optin webhook. */
  sendOtnMessage(otnToken: string, text: string) {
    return this.restClient.post<MessengerSendResponse>("me/messages", {
      recipient: { one_time_notif_token: otnToken },
      message: { text },
    });
  }
}
