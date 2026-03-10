import type { GetConversationsParams, GetConversationsResponse } from "./types/conversations";
import type {
  AttachmentUploadResponse,
  CreatePersonaPayload,
  CreatePersonaResponse,
  FileAttachment,
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
  Persona,
  QuickReply,
  SenderAction,
  UserProfile,
  UserProfileField,
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
    // Graph API requires fields in the JSON body, not query params
    return this.restClient.delete<{ result: string }>("me/messenger_profile", undefined, {
      data: { fields },
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
    return this.restClient.post<AttachmentUploadResponse>("me/message_attachments", {
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
    return this.restClient.post<CreatePersonaResponse>("me/personas", payload);
  }

  /** Retrieve a Persona's name and profile picture by ID. */
  getPersona(personaId: string) {
    return this.restClient.get<Persona>(personaId);
  }

  /** Delete a Persona by ID. */
  deletePersona(personaId: string) {
    return this.restClient.delete<{ success: boolean }>(personaId);
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
    return this.restClient.get<UserProfile>(psid, undefined, {
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
    return this.restClient.get<GetConversationsResponse>("me/conversations", undefined, {
      params: { ...(fieldsValue ? { fields: fieldsValue } : {}), ...rest },
    });
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
}
