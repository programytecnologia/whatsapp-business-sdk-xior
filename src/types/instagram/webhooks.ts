// ----- Incoming message object -----

export type IGWebhookAttachment = {
  type: string;
  payload: {
    url?: string;
    title?: string;
    sticker_id?: number;
    coordinates?: { lat: number; long: number };
    reel_video_id?: string;
    /** Present for story_mention attachments */
    cdnUrl?: string;
  };
};

export type IGWebhookMessage = {
  mid: string;
  text?: string;
  attachments?: IGWebhookAttachment[];
  reply_to?: { mid?: string; story?: { url: string; id: string } };
  quick_reply?: { payload: string };
  is_echo?: boolean;
  is_deleted?: boolean;
  is_unsupported?: boolean;
};

// ----- Event fields -----

export type IGReferral = {
  ref: string;
  source: string;
  type: string;
  ad_id?: string;
};

export type IGRead = {
  mid?: string;
  watermark?: number;
};

export type IGReaction = {
  mid: string;
  action: "react" | "unreact";
  reaction?: string;
  emoji?: string;
};

// ----- Messaging entry -----

export type IGMessaging = {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: IGWebhookMessage;
  referral?: IGReferral;
  read?: IGRead;
  reaction?: IGReaction;
};

export type IGEntry = {
  id: string;
  time: number;
  messaging: IGMessaging[];
};

export type InstagramWebhook = {
  object: "instagram";
  entry: IGEntry[];
};

// ----- Webhook event callbacks -----

export type InstagramWebhookEvents = {
  onMessageReceived?: (messaging: IGMessaging, message: IGWebhookMessage) => void;
  onTextMessageReceived?: (messaging: IGMessaging, text: string) => void;
  onAttachmentReceived?: (messaging: IGMessaging, attachments: IGWebhookAttachment[]) => void;
  /** Fired when the message contains a story_mention attachment */
  onStoryMentionReceived?: (messaging: IGMessaging, attachment: IGWebhookAttachment) => void;
  onReactionReceived?: (messaging: IGMessaging, reaction: IGReaction) => void;
  onReadReceived?: (messaging: IGMessaging, read: IGRead) => void;
  onReferralReceived?: (messaging: IGMessaging, referral: IGReferral) => void;
  onEchoReceived?: (messaging: IGMessaging, message: IGWebhookMessage) => void;
  onStartListening?: () => void;
};
