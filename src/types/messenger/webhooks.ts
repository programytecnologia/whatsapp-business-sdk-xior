// ----- Incoming message object -----

/**
 * Attachment kinds a Page receives. `sticker` replaces stickers delivered as
 * `image` (with `sticker_id`) from 2026-08-30. Unknown kinds stay `string`.
 */
export type MessengerWebhookAttachmentType =
  | "image"
  | "video"
  | "audio"
  | "file"
  | "sticker"
  | "location"
  | "fallback"
  | "template"
  | "reel"
  | "ig_reel"
  | (string & {});

export type MessengerWebhookAttachment = {
  type: MessengerWebhookAttachmentType;
  payload: {
    /** CDN URL. It expires; download the file when the webhook arrives. */
    url?: string;
    sticker_id?: number;
    title?: string;
    coordinates?: { lat: number; long: number };
  };
};

export type MessengerWebhookMessage = {
  mid: string;
  text?: string;
  attachments?: MessengerWebhookAttachment[];
  quick_reply?: { payload: string };
  reply_to?: { mid: string };
  /** Set with `is_echo`: the app that sent the message (absent for the Page inbox). */
  app_id?: number | string;
  metadata?: string;
  /** The ad or link that opened the thread, on the first message after it. */
  referral?: MessengerReferral;
  is_echo?: boolean;
  is_deleted?: boolean;
  is_unsupported?: boolean;
};

// ----- Event fields -----

export type MessengerPostback = {
  title: string;
  payload: string;
  referral?: { ref: string; source: string; type: string };
};

/** What a Click-to-Messenger ad sends with the first message. */
export type AdsContextData = {
  ad_title?: string;
  photo_url?: string;
  video_url?: string;
  post_id?: string;
  product_id?: string;
  flow_id?: string;
};

export type MessengerReferral = {
  ref?: string;
  /** `ADS`, `SHORTLINK`, `CUSTOMER_CHAT_PLUGIN`, ... */
  source: string;
  type: string;
  ad_id?: string;
  ads_context_data?: AdsContextData;
  referer_uri?: string;
};

export type MessengerOptin = {
  ref?: string;
  user_ref?: string;
  type: string;
  payload?: string;
  /** @deprecated One-Time Notification is retired. */
  one_time_notif_token?: string;
  /** Marketing Messages subscription token. */
  notification_messages_token?: string;
  notification_messages_status?: "STOP_NOTIFICATIONS" | "RESUME_NOTIFICATIONS";
};

export type MessengerRead = { watermark: number };
export type MessengerDelivery = { watermark: number; mids?: string[] };

export type MessengerReaction = {
  mid: string;
  action: "react" | "unreact";
  reaction?: string;
  emoji?: string;
};

/** An edited message: `text` is the new text. */
export type MessengerMessageEdit = {
  mid: string;
  text?: string;
  num_edit?: number;
};

/** Meta warned about, or blocked, the app for a policy violation. */
export type MessengerPolicyEnforcement = {
  action: "warning" | "block" | "unblock" | (string & {});
  reason?: string;
};

export type MessengerHandover = {
  new_owner_app_id: string;
  metadata?: string;
};

export type MessengerThreadControlRequest = {
  /** App ID of the secondary app requesting thread control. */
  requested_owner_app_id: string;
  metadata?: string;
};

// ----- Messaging entry -----

export type MessengerMessaging = {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: MessengerWebhookMessage;
  postback?: MessengerPostback;
  referral?: MessengerReferral;
  optin?: MessengerOptin;
  read?: MessengerRead;
  delivery?: MessengerDelivery;
  reaction?: MessengerReaction;
  message_edit?: MessengerMessageEdit;
  "policy-enforcement"?: MessengerPolicyEnforcement;
  policy_enforcement?: MessengerPolicyEnforcement;
  pass_thread_control?: MessengerHandover;
  take_thread_control?: MessengerHandover;
  request_thread_control?: MessengerThreadControlRequest;
};

export type MessengerEntry = {
  id: string;
  time: number;
  /** Absent when the entry only carries `standby` or `changes`. */
  messaging?: MessengerMessaging[];
  /** Events for threads another app controls (Conversation Routing). */
  standby?: MessengerMessaging[];
};

export type MessengerWebhook = {
  object: "page";
  entry: MessengerEntry[];
};

// ----- Webhook event callbacks -----

export type MessengerWebhookEvents = {
  onMessageReceived?: (messaging: MessengerMessaging, message: MessengerWebhookMessage) => void;
  onTextMessageReceived?: (messaging: MessengerMessaging, text: string) => void;
  onAttachmentReceived?: (
    messaging: MessengerMessaging,
    attachments: MessengerWebhookAttachment[],
  ) => void;
  onPostbackReceived?: (messaging: MessengerMessaging, postback: MessengerPostback) => void;
  onReferralReceived?: (messaging: MessengerMessaging, referral: MessengerReferral) => void;
  onOptinReceived?: (messaging: MessengerMessaging, optin: MessengerOptin) => void;
  onReadReceived?: (messaging: MessengerMessaging, read: MessengerRead) => void;
  onDeliveryReceived?: (messaging: MessengerMessaging, delivery: MessengerDelivery) => void;
  onReactionReceived?: (messaging: MessengerMessaging, reaction: MessengerReaction) => void;
  onHandoverReceived?: (messaging: MessengerMessaging, handover: MessengerHandover) => void;
  onThreadControlRequested?: (
    messaging: MessengerMessaging,
    request: MessengerThreadControlRequest,
  ) => void;
  onEchoReceived?: (messaging: MessengerMessaging, message: MessengerWebhookMessage) => void;
  onStartListening?: () => void;
};
