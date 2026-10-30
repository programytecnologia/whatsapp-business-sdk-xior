// ----- Recipient -----

export type IGRecipient = { id: string } | { comment_id: string } | { post_id: string };

// ----- Attachment -----

export type IGAttachment = {
  type: "image" | "audio" | "video" | "file";
  payload: { url: string } | { attachment_id: string };
};

// ----- Generic template -----

export type IGUrlButton = { type: "web_url"; title: string; url: string };

export type IGPostbackButton = { type: "postback"; title: string; payload: string };

export type IGTemplateButton = IGUrlButton | IGPostbackButton;

/** Title and subtitle up to 80 characters each; up to 3 buttons. */
export type IGGenericElement = {
  title: string;
  subtitle?: string;
  image_url?: string;
  /** Opened when the user taps the element itself. */
  default_action?: { type: "web_url"; url: string };
  buttons?: IGTemplateButton[];
};

/**
 * A carousel of up to 10 elements.
 *
 * Documentation: https://developers.facebook.com/documentation/business-messaging/instagram-messaging/generic-template
 */
export type IGGenericTemplatePayload = {
  template_type: "generic";
  elements: IGGenericElement[];
};

export type IGTemplateAttachment = { type: "template"; payload: IGGenericTemplatePayload };

// ----- Message -----

/** Instagram quick replies: text only, up to 13, titles up to 20 characters. */
export type IGQuickReply = {
  content_type: "text";
  title: string;
  payload: string;
};

export type IGMessage = {
  text?: string;
  attachment?: IGAttachment | IGTemplateAttachment;
  quick_replies?: IGQuickReply[];
};

// ----- Messaging type / tags (subset supported by IG) -----

export type IGMessagingType = "RESPONSE" | "UPDATE" | "MESSAGE_TAG";

/** `HUMAN_AGENT` is the only tag Instagram accepts (7 days, human replies only). */
export type IGMessageTag = "HUMAN_AGENT";

/** Typing and read indicators; send them without a `message`. */
export type IGIndicatorSenderAction = "typing_on" | "typing_off" | "mark_seen";

/** Instagram only accepts the `love` reaction. */
export type IGSenderAction = IGIndicatorSenderAction | "react" | "unreact";

export type IGReactionPayload = { message_id: string; reaction?: "love" };

// ----- Send payload -----

export type IGSendMessagePayload = {
  recipient: IGRecipient;
  message?: IGMessage;
  sender_action?: IGSenderAction;
  /** Required with the `react` / `unreact` sender actions. */
  payload?: IGReactionPayload;
  /** Quote an earlier message of the thread. */
  reply_to?: { mid: string };
  messaging_type?: IGMessagingType;
  tag?: IGMessageTag;
};

export type IGSendOptions = {
  messagingType?: IGMessagingType;
  tag?: IGMessageTag;
  replyTo?: string;
};

// ----- User profile -----

/** Fields of an Instagram-scoped user (IGSID). Available once the user messaged the account. */
export type IGUserProfileField =
  | "name"
  | "username"
  | "profile_pic"
  | "follower_count"
  | "is_verified_user"
  | "is_user_follow_business"
  | "is_business_follow_user";

export type IGUserProfile = {
  id: string;
  name?: string | null;
  username?: string;
  /** Expires after a few days. */
  profile_pic?: string | null;
  follower_count?: number;
  is_verified_user?: boolean;
  is_user_follow_business?: boolean;
  is_business_follow_user?: boolean;
};

// ----- Webhook subscription (subscribed_apps) -----

export type IGWebhookField =
  | "messages"
  | "messaging_postbacks"
  | "messaging_seen"
  | "messaging_referral"
  | "message_reactions"
  | "message_edit"
  | "messaging_handover"
  | "messaging_policy_enforcement"
  | "standby"
  | "response_feedback"
  | "comments"
  | "live_comments"
  | "mentions"
  | "story_insights";

export type IGSendMessageResponse = {
  recipient_id: string;
  message_id: string;
};

// ----- Attachment Upload -----

export type IGAttachmentUploadResponse = {
  /** Reusable id — pass as `payload.attachment_id` in future sends to avoid re-uploading. */
  attachment_id: string;
};
