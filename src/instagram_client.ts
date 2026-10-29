import type { GetConversationsParams, GetConversationsResponse } from "./types/conversations";
import type {
  GetIGCommentsResponse,
  IGAttachment,
  IGAttachmentUploadResponse,
  IGIndicatorSenderAction,
  IGPublicCommentReplyResponse,
  IGQuickReply,
  IGSendMessagePayload,
  IGSendMessageResponse,
  IGSendOptions,
  IGUserProfile,
  IGUserProfileField,
  IGWebhookField,
} from "./types/instagram";
import type { SubscribedAppsResponse } from "./types/messenger";
import type { DefaultMessengerErrorAPI } from "./types/messenger/error";
import { assertGraphNodeId, graphApiBaseUrl } from "./utils/graphApi";
import { MessengerErrorHandler } from "./utils/messengerErrorHandler";
import { createRestClient } from "./utils/restClient";

interface InstagramClientArgs {
  apiToken: string;
  /**
   * The node messages are sent from: the Instagram professional account id
   * (Unified Login, Instagram Login) or, for Facebook Login setups, the id of
   * the Page linked to the account.
   */
  igUserId: string;
  /** Graph API version, e.g. `v26.0`. Defaults to `DEFAULT_GRAPH_API_VERSION`. */
  graphApiVersion?: string;
}

const sendOptionFields = (options?: IGSendOptions) => ({
  ...(options?.messagingType && { messaging_type: options.messagingType }),
  ...(options?.tag && { tag: options.tag, messaging_type: "MESSAGE_TAG" as const }),
  ...(options?.replyTo && { reply_to: { mid: options.replyTo } }),
});

/**
 * Connector for the Instagram Messaging API (DMs and comment interactions).
 *
 * Documentation: https://developers.facebook.com/docs/messenger-platform/instagram
 */
export class InstagramClient {
  restClient: ReturnType<typeof createRestClient>;
  igUserId: string;

  constructor({ apiToken, igUserId, graphApiVersion }: InstagramClientArgs) {
    this.igUserId = assertGraphNodeId(igUserId, "igUserId");
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

  sendMessage(payload: IGSendMessagePayload) {
    return this.restClient.post<IGSendMessageResponse>(`${this.igUserId}/messages`, payload);
  }

  /**
   * Send a text message (up to 1000 bytes). `messaging_type` defaults to
   * `RESPONSE`; passing the `HUMAN_AGENT` tag switches it to `MESSAGE_TAG`.
   */
  sendText(recipientId: string, text: string, options?: IGSendOptions) {
    return this.sendMessage({
      recipient: { id: recipientId },
      message: { text },
      messaging_type: "RESPONSE",
      ...sendOptionFields(options),
    });
  }

  /** Images (png/jpeg), audio (aac/m4a/wav/mp4), video, or a PDF `file`. */
  sendAttachment(recipientId: string, attachment: IGAttachment, options?: IGSendOptions) {
    return this.sendMessage({
      recipient: { id: recipientId },
      message: { attachment },
      messaging_type: "RESPONSE",
      ...sendOptionFields(options),
    });
  }

  /** Up to 13 text quick replies. They don't show on desktop. */
  sendQuickReplies(
    recipientId: string,
    text: string,
    quick_replies: IGQuickReply[],
    options?: IGSendOptions,
  ) {
    return this.sendMessage({
      recipient: { id: recipientId },
      message: { text, quick_replies },
      messaging_type: "RESPONSE",
      ...sendOptionFields(options),
    });
  }

  /** Typing on/off or mark seen. Sender actions only carry the recipient. */
  sendSenderAction(recipientId: string, sender_action: IGIndicatorSenderAction) {
    return this.sendMessage({ recipient: { id: recipientId }, sender_action });
  }

  /** React with a heart: the only reaction Instagram accepts. */
  sendReaction(recipientId: string, messageId: string) {
    return this.sendMessage({
      recipient: { id: recipientId },
      sender_action: "react",
      payload: { message_id: messageId, reaction: "love" },
    });
  }

  removeReaction(recipientId: string, messageId: string) {
    return this.sendMessage({
      recipient: { id: recipientId },
      sender_action: "unreact",
      payload: { message_id: messageId },
    });
  }

  // ---------------------------------------------------------------------------
  // User profile
  // ---------------------------------------------------------------------------

  /**
   * Profile of an Instagram-scoped user. Works once the user messaged the
   * account (or tapped an ice breaker / menu item), not for commenters alone.
   *
   * Documentation: https://developers.facebook.com/documentation/business-messaging/instagram-messaging/features/user-profile
   */
  getUserProfile(
    igsid: string,
    fields: IGUserProfileField[] = ["name", "username", "profile_pic", "is_user_follow_business"],
  ) {
    return this.restClient.get<IGUserProfile>(assertGraphNodeId(igsid, "igsid"), undefined, {
      params: { fields: fields.join(",") },
    });
  }

  // ---------------------------------------------------------------------------
  // Comment interactions
  // ---------------------------------------------------------------------------

  /**
   * Send a private DM reply to a user from a comment on a media object.
   * Uses the Send API with `recipient: { comment_id }`.
   */
  sendPrivateCommentReply(commentId: string, text: string) {
    return this.restClient.post<IGSendMessageResponse>(`${this.igUserId}/messages`, {
      recipient: { comment_id: commentId },
      message: { text },
    });
  }

  /**
   * Post a public reply in the comment thread.
   * Uses the `/{comment-id}/replies` endpoint.
   */
  replyToComment(commentId: string, message: string) {
    return this.restClient.post<IGPublicCommentReplyResponse>(`${commentId}/replies`, {
      message,
    });
  }

  /**
   * Get comments for a media object.
   */
  getComments(mediaId: string, fields?: string[]) {
    return this.restClient.get<GetIGCommentsResponse>(`${mediaId}/comments`, undefined, {
      params: fields ? { fields: fields.join(",") } : undefined,
    });
  }

  // ---------------------------------------------------------------------------
  // Attachment Upload API
  // ---------------------------------------------------------------------------

  /**
   * Upload a reusable attachment. Returns an `attachment_id` that can be reused
   * in subsequent sends via `payload.attachment_id` instead of re-uploading the file.
   */
  uploadAttachment(attachment: IGAttachment) {
    return this.restClient.post<IGAttachmentUploadResponse>(
      `${this.igUserId}/message_attachments`,
      { message: { attachment } },
    );
  }

  // ---------------------------------------------------------------------------
  // IG Messaging Profile (ice breakers, welcome message)
  // ---------------------------------------------------------------------------

  getProfile(fields: string[]) {
    return this.restClient.get<{ data: Record<string, unknown>[] }>(
      `${this.igUserId}/messenger_profile`,
      undefined,
      { params: { fields: fields.join(",") } },
    );
  }

  setProfile(payload: Record<string, unknown>) {
    return this.restClient.post<{ result: string }>(`${this.igUserId}/messenger_profile`, payload);
  }

  // ---------------------------------------------------------------------------
  // Conversations / Inbox API
  // ---------------------------------------------------------------------------

  /**
   * Retrieve a list of Instagram messaging conversations for this account.
   *
   * Documentation: https://developers.facebook.com/docs/graph-api/reference/page/conversations
   *   (Instagram requires platform=instagram or using the ig-user-id edge)
   *
   * @param params - Optional filters: fields, limit, cursor, etc.
   */
  getConversations(params?: GetConversationsParams) {
    const { fields, ...rest } = params ?? {};
    const fieldsValue = Array.isArray(fields) ? fields.join(",") : fields;
    return this.restClient.get<GetConversationsResponse>(
      `${this.igUserId}/conversations`,
      undefined,
      { params: { ...(fieldsValue ? { fields: fieldsValue } : {}), ...rest } },
    );
  }

  // ---------------------------------------------------------------------------
  // Webhook subscription
  // ---------------------------------------------------------------------------

  /**
   * Subscribe this app to the account's webhooks. The account owner must also
   * turn on "Allow access to messages" in Instagram, or sends fail with #200.
   * Meta unsubscribes after an hour of failed deliveries.
   *
   * Documentation: https://developers.facebook.com/docs/instagram-platform/webhooks/
   */
  subscribeApp(fields: IGWebhookField[]) {
    if (fields.length === 0) throw new Error("subscribeApp needs at least one field");
    return this.restClient.post<{ success: boolean }>(
      `${this.igUserId}/subscribed_apps`,
      undefined,
      { params: { subscribed_fields: fields } },
    );
  }

  getSubscribedApps() {
    return this.restClient.get<SubscribedAppsResponse>(`${this.igUserId}/subscribed_apps`);
  }

  unsubscribeApp() {
    return this.restClient.delete<{ success: boolean }>(`${this.igUserId}/subscribed_apps`);
  }
}
