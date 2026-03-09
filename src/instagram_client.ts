import type {
  GetIGCommentsResponse,
  IGAttachment,
  IGMessageTag,
  IGMessagingType,
  IGPublicCommentReplyResponse,
  IGSendMessagePayload,
  IGSendMessageResponse,
} from "./types/instagram";
import { MessengerErrorHandler } from "./utils/messengerErrorHandler";
import { createRestClient } from "./utils/restClient";

interface InstagramClientArgs {
  apiToken: string;
  /** The Instagram-scoped User ID (ig-user-id) for your business account. */
  igUserId: string;
}

/**
 * Connector for the Instagram Messaging API (DMs and comment interactions).
 *
 * Documentation: https://developers.facebook.com/docs/messenger-platform/instagram
 */
export class InstagramClient {
  restClient: ReturnType<typeof createRestClient>;
  igUserId: string;

  constructor({ apiToken, igUserId }: InstagramClientArgs) {
    this.igUserId = igUserId;
    this.restClient = createRestClient({
      apiToken,
      baseURL: "https://graph.facebook.com/v25.0",
      errorHandler: (error) => MessengerErrorHandler(error?.response?.data || error),
    });
  }

  // ---------------------------------------------------------------------------
  // Send API
  // ---------------------------------------------------------------------------

  sendMessage(payload: IGSendMessagePayload) {
    return this.restClient.post<IGSendMessageResponse>(`${this.igUserId}/messages`, payload);
  }

  sendText(
    recipientId: string,
    text: string,
    options?: { messagingType?: IGMessagingType; tag?: IGMessageTag },
  ) {
    return this.sendMessage({
      recipient: { id: recipientId },
      message: { text },
      messaging_type: options?.messagingType || "RESPONSE",
      tag: options?.tag,
    });
  }

  sendAttachment(recipientId: string, attachment: IGAttachment) {
    return this.sendMessage({
      recipient: { id: recipientId },
      message: { attachment },
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
}
