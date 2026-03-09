// ----- Incoming message object -----

export type MessengerWebhookAttachment = {
  type: string;
  payload: {
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

export type MessengerReferral = {
  ref: string;
  source: string;
  type: string;
  ad_id?: string;
};

export type MessengerOptin = {
  ref?: string;
  user_ref?: string;
  type: string;
  payload?: string;
  one_time_notif_token?: string;
};

export type MessengerRead = { watermark: number };
export type MessengerDelivery = { watermark: number; mids?: string[] };

export type MessengerReaction = {
  mid: string;
  action: "react" | "unreact";
  reaction?: string;
  emoji?: string;
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
  pass_thread_control?: MessengerHandover;
  take_thread_control?: MessengerHandover;
  request_thread_control?: MessengerThreadControlRequest;
};

export type MessengerEntry = {
  id: string;
  time: number;
  messaging: MessengerMessaging[];
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
