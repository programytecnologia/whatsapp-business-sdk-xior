import type { GetConversationsParams, GetConversationsResponse } from "./types/conversations";
import type {
  AttachmentUploadResponse,
  CreatePersonaPayload,
  CreatePersonaResponse,
  FileAttachment,
  GetMessengerProfileResponse,
  GetSecondaryReceiversResponse,
  GetThreadOwnerResponse,
  IndicatorSenderAction,
  MessengerAttachment,
  MessengerProfile,
  MessengerProfileFieldName,
  MessengerSendOptions,
  MessengerSendPayload,
  MessengerSendResponse,
  MessengerWebhookField,
  Persona,
  QuickReply,
  SubscribedAppsResponse,
  UserProfile,
  UserProfileField,
} from "./types/messenger";
import type { DefaultMessengerErrorAPI } from "./types/messenger/error";
import { assertGraphNodeId, graphApiBaseUrl } from "./utils/graphApi";
import { MessengerErrorHandler } from "./utils/messengerErrorHandler";
import { createRestClient } from "./utils/restClient";

interface MessengerClientArgs {
  /** A Page access token, or a business integration system user token with access to the Page. */
  apiToken: string;
  /** The Page ID. Every Page endpoint is called on it rather than on `me/`. */
  pageId: string;
  /** Graph API version, e.g. `v26.0`. Defaults to `DEFAULT_GRAPH_API_VERSION`. */
  graphApiVersion?: string;
}

const sendOptionFields = (options?: MessengerSendOptions) => ({
  ...(options?.messagingType && { messaging_type: options.messagingType }),
  ...(options?.tag && { tag: options.tag, messaging_type: "MESSAGE_TAG" as const }),
  ...(options?.replyTo && { reply_to: { mid: options.replyTo } }),
});

/**
 * Connector for the Messenger Platform Send API and related endpoints.
 *
 * Documentation: https://developers.facebook.com/docs/messenger-platform
 */
export class MessengerClient {
  restClient: ReturnType<typeof createRestClient>;
  pageId: string;

  constructor({ apiToken, pageId, graphApiVersion }: MessengerClientArgs) {
    this.pageId = assertGraphNodeId(pageId, "pageId");
    this.restClient = createRestClient({
      apiToken,
      baseURL: graphApiBaseUrl(graphApiVersion),
      errorHandler: (error) =>
        MessengerErrorHandler((error?.response?.data || error) as DefaultMessengerErrorAPI),
    });
  }

  // ---------------------------------------------------------------------------
  // Send API
  // ---------------------------------------------------------------------------

  send(payload: MessengerSendPayload) {
    return this.restClient.post<MessengerSendResponse>(`${this.pageId}/messages`, payload);
  }

  /**
   * Send a text message. `messaging_type` defaults to `RESPONSE`; passing a
   * `tag` switches it to `MESSAGE_TAG`.
   */
  sendText(recipientId: string, text: string, options?: MessengerSendOptions) {
    return this.send({
      recipient: { id: recipientId },
      message: { text },
      messaging_type: "RESPONSE",
      ...sendOptionFields(options),
    });
  }

  sendAttachment(
    recipientId: string,
    attachment: MessengerAttachment,
    options?: MessengerSendOptions,
  ) {
    return this.send({
      recipient: { id: recipientId },
      message: { attachment },
      messaging_type: "RESPONSE",
      ...sendOptionFields(options),
    });
  }

  /** Up to 13 quick replies; titles are cut by Messenger at 20 characters. */
  sendQuickReplies(
    recipientId: string,
    text: string,
    quick_replies: QuickReply[],
    options?: MessengerSendOptions,
  ) {
    return this.send({
      recipient: { id: recipientId },
      message: { text, quick_replies },
      messaging_type: "RESPONSE",
      ...sendOptionFields(options),
    });
  }

  /** Typing on/off or mark seen. Sender actions only carry the recipient. */
  sendSenderAction(recipientId: string, sender_action: IndicatorSenderAction) {
    return this.send({ recipient: { id: recipientId }, sender_action });
  }

  /**
   * React to a message of the thread, or change an earlier reaction.
   *
   * Documentation: https://developers.facebook.com/documentation/business-messaging/messenger-platform/send-messages/sender-actions
   */
  sendReaction(recipientId: string, messageId: string, reaction: string) {
    return this.send({
      recipient: { id: recipientId },
      sender_action: "react",
      payload: { message_id: messageId, reaction },
    });
  }

  removeReaction(recipientId: string, messageId: string) {
    return this.send({
      recipient: { id: recipientId },
      sender_action: "unreact",
      payload: { message_id: messageId },
    });
  }

  // ---------------------------------------------------------------------------
  // Messenger Profile API
  // ---------------------------------------------------------------------------

  getProfile(fields: MessengerProfileFieldName[]) {
    return this.restClient.get<GetMessengerProfileResponse>(
      `${this.pageId}/messenger_profile`,
      undefined,
      {
        params: { fields: fields.join(",") },
      },
    );
  }

  setProfile(payload: Partial<MessengerProfile>) {
    return this.restClient.post<{ result: string }>(`${this.pageId}/messenger_profile`, payload);
  }

  deleteProfile(fields: MessengerProfileFieldName[]) {
    // Graph API requires fields in the JSON body, not query params
    return this.restClient.delete<{ result: string }>(
      `${this.pageId}/messenger_profile`,
      undefined,
      {
        data: { fields },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Handover Protocol
  // ---------------------------------------------------------------------------

  passThreadControl(recipientId: string, targetAppId: string, metadata?: string) {
    return this.restClient.post<{ success: boolean }>(`${this.pageId}/pass_thread_control`, {
      recipient: { id: recipientId },
      target_app_id: targetAppId,
      ...(metadata !== undefined && { metadata }),
    });
  }

  takeThreadControl(recipientId: string, metadata?: string) {
    return this.restClient.post<{ success: boolean }>(`${this.pageId}/take_thread_control`, {
      recipient: { id: recipientId },
      ...(metadata !== undefined && { metadata }),
    });
  }

  requestThreadControl(recipientId: string, metadata?: string) {
    return this.restClient.post<{ success: boolean }>(`${this.pageId}/request_thread_control`, {
      recipient: { id: recipientId },
      ...(metadata !== undefined && { metadata }),
    });
  }

  getThreadOwner(recipientId: string) {
    return this.restClient.get<GetThreadOwnerResponse>(`${this.pageId}/thread_owner`, undefined, {
      params: { recipient_id: recipientId },
    });
  }

  getSecondaryReceivers() {
    return this.restClient.get<GetSecondaryReceiversResponse>(
      `${this.pageId}/secondary_receivers`,
      undefined,
      {
        params: { fields: "id,name" },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // One-Time Notification (OTN)
  // ---------------------------------------------------------------------------

  /**
   * Send an OTN opt-in request template to a user.
   * @deprecated One-Time Notification is retired; use Marketing Messages.
   */
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

  /**
   * Send the one-time follow-up message using the token received via optin webhook.
   * @deprecated One-Time Notification is retired; use Marketing Messages.
   */
  sendOtnMessage(otnToken: string, text: string) {
    return this.restClient.post<MessengerSendResponse>(`${this.pageId}/messages`, {
      recipient: { one_time_notif_token: otnToken },
      message: { text },
    });
  }

  // ---------------------------------------------------------------------------
  // Attachment Upload API
  // ---------------------------------------------------------------------------

  /**
   * Upload a reusable attachment. Returns an `attachment_id` that can be reused
   * in subsequent sends via `payload.attachment_id` instead of re-uploading the file.
   *
   * Documentation: https://developers.facebook.com/docs/messenger-platform/send-api-reference/attachment-upload
   */
  uploadAttachment(attachment: FileAttachment) {
    return this.restClient.post<AttachmentUploadResponse>(`${this.pageId}/message_attachments`, {
      message: { attachment },
    });
  }

  // ---------------------------------------------------------------------------
  // Persona API
  // ---------------------------------------------------------------------------

  /**
   * Create a Persona. Messages sent with its ID will appear as coming from
   * a custom name + avatar rather than the Page itself.
   *
   * Documentation: https://developers.facebook.com/docs/messenger-platform/send-api-reference/persona
   */
  createPersona(payload: CreatePersonaPayload) {
    return this.restClient.post<CreatePersonaResponse>(`${this.pageId}/personas`, payload);
  }

  /** Retrieve a Persona's name and profile picture by ID. */
  getPersona(personaId: string) {
    return this.restClient.get<Persona>(assertGraphNodeId(personaId, "personaId"));
  }

  /** Delete a Persona by ID. */
  deletePersona(personaId: string) {
    return this.restClient.delete<{ success: boolean }>(assertGraphNodeId(personaId, "personaId"));
  }

  // ---------------------------------------------------------------------------
  // User Profile API
  // ---------------------------------------------------------------------------

  /**
   * Retrieve a Messenger user's profile by their Page-Scoped ID (PSID).
   *
   * Documentation: https://developers.facebook.com/docs/messenger-platform/identity/user-profile
   *
   * @param psid - The Page-Scoped ID of the user.
   * @param fields - Profile fields to retrieve (defaults to common fields).
   */
  getUserProfile(
    psid: string,
    fields: UserProfileField[] = ["first_name", "last_name", "profile_pic", "locale", "timezone"],
  ) {
    return this.restClient.get<UserProfile>(assertGraphNodeId(psid, "psid"), undefined, {
      params: { fields: fields.join(",") },
    });
  }

  // ---------------------------------------------------------------------------
  // Conversations / Inbox API
  // ---------------------------------------------------------------------------

  /**
   * Retrieve a list of conversations for this Page.
   *
   * Documentation: https://developers.facebook.com/docs/graph-api/reference/page/conversations
   *
   * @param params - Optional filters: fields, platform, folder, limit, cursor, etc.
   */
  getConversations(params?: GetConversationsParams) {
    const { fields, ...rest } = params ?? {};
    const fieldsValue = Array.isArray(fields) ? fields.join(",") : fields;
    return this.restClient.get<GetConversationsResponse>(
      `${this.pageId}/conversations`,
      undefined,
      {
        params: { ...(fieldsValue ? { fields: fieldsValue } : {}), ...rest },
      },
    );
  }

  // ---------------------------------------------------------------------------
  // Private Replies
  // ---------------------------------------------------------------------------

  /**
   * Send a private DM reply to a user who commented on or posted to your Page.
   *
   * Documentation: https://developers.facebook.com/docs/messenger-platform/discovery/private-replies
   *
   * Only one message can be sent per post/comment; the comment must be less than 7 days old.
   * Pass either `post_id` or `comment_id` (not both).
   *
   * @param recipient - `{ post_id: "..." }` or `{ comment_id: "..." }`
   * @param text - The text message to send.
   */
  sendPrivateReply(recipient: { post_id: string } | { comment_id: string }, text: string) {
    return this.restClient.post<MessengerSendResponse>(`${this.pageId}/messages`, {
      recipient,
      message: { text },
    });
  }

  // ---------------------------------------------------------------------------
  // Webhook subscription
  // ---------------------------------------------------------------------------

  /**
   * Subscribe this app to the Page's webhooks. Needs `pages_manage_metadata`
   * and a token that can act on the Page. Meta unsubscribes a Page after an
   * hour of failed deliveries, so call it again from health checks.
   *
   * Documentation: https://developers.facebook.com/documentation/business-messaging/messenger-platform/webhooks
   */
  subscribeApp(fields: MessengerWebhookField[]) {
    if (fields.length === 0) throw new Error("subscribeApp needs at least one field");
    return this.restClient.post<{ success: boolean }>(`${this.pageId}/subscribed_apps`, undefined, {
      params: { subscribed_fields: fields },
    });
  }

  /** Apps subscribed to the Page and the fields each one receives. */
  getSubscribedApps() {
    return this.restClient.get<SubscribedAppsResponse>(`${this.pageId}/subscribed_apps`);
  }

  /** Remove this app's subscription to the Page. */
  unsubscribeApp() {
    return this.restClient.delete<{ success: boolean }>(`${this.pageId}/subscribed_apps`);
  }
}
