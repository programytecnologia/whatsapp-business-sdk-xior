import type { WebhookCallConnect, WebhookCallEvent, WebhookCallTerminate } from "./calls";
import type { WABAErrorCodes } from "./error";
import type { MessageType, ReactionMessage } from "./messages";
import type { TemplateCategory } from "./templates";
import type { LiteralUnion } from "./utils";

export type { WebhookCallConnect, WebhookCallTerminate };

/**
 * The information for the customer who sent a message to the business
 */
export type WebhookContact = {
  /**
   * The customer's WhatsApp ID. May be omitted if the user has enabled the
   * usernames feature and phone number cannot be included.
   */
  wa_id?: string;
  /**
   * Business-scoped user ID (BSUID). Included starting March 31, 2026.
   * Format: `<ISO-3166-alpha-2-country-code>.<alphanumeric>`, e.g. `US.13491208655302741918`.
   */
  user_id?: string;
  /**
   * Parent BSUID, present only when parent BSUIDs are enabled on your business portfolio.
   */
  parent_user_id?: string;
  profile: {
    name: string;
    /**
     * The WhatsApp user's username, if they have enabled the usernames feature.
     */
    username?: string;
  };
};

export type WebhookError = {
  code: WABAErrorCodes;
  title: string;
  message: string;
  error_data: {
    details: string;
  };
};

export type WebhookMedia = {
  /**
   * Caption for the file, if provided
   */
  caption?: string;
  /**
   * Name for the file on the sender's device
   */
  filename?: string;
  sha256: string;
  mime_type: string;
  /**
   * ID for the file
   */
  id: string;
};

/**
 * When the name is "flow", it indicates a general flow submission.
 * Documentation: https://developers.facebook.com/docs/whatsapp/flows/reference/responsemsgwebhook/
 */
export type InteractiveWebhookMessageNfmReplyName = "address_message" | "flow" | string;

export type InteractiveWebhookMessageNfmReply<
  Name extends InteractiveWebhookMessageNfmReplyName = string,
> = (Name extends "flow" ? { body: "Sent" } : { body?: string }) &
  (Name extends "flow" | "address_message" ? { name: Name } : { name?: Name }) & {
    response_json: string;
  };

export interface InteractiveWebhookMessageListReply {
  /**
   * Unique ID of the selected list item.
   */
  id: string;
  /**
   * Title of the selected list item.
   */
  title: string;
  /**
   * Description of the selected list item.
   */
  description: string;
}

export interface InteractiveWebhookMessageButtonReply {
  /**
   * Unique ID of the button.
   */
  id: string;
  /**
   * Title of the button.
   */
  title: string;
}

export type InteractiveWebhookMessageObjects =
  | InteractiveWebhookMessageButtonReply
  | InteractiveWebhookMessageListReply
  | InteractiveWebhookMessageNfmReply;

export type InteractiveWebhookMessageType = "button_reply" | "list_reply" | "nfm_reply";

interface InteractiveWebhookMessagesMap
  extends Record<InteractiveWebhookMessageType, InteractiveWebhookMessageObjects> {
  button_reply: InteractiveWebhookMessageButtonReply;
  list_reply: InteractiveWebhookMessageListReply;
  nfm_reply: InteractiveWebhookMessageNfmReply;
}

export type InteractiveWebhookMessage<
  Type extends InteractiveWebhookMessageType = InteractiveWebhookMessageType,
> = Pick<InteractiveWebhookMessagesMap, Type> & { type: Type };

type SharedMessageTypes = Exclude<MessageType, "template">;

/**
 * For more information about this object, go here https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#messages-object
 *
 * Please also take a look at the examples for this object, because the docs for this object are not always up to date.
 * You can find the examples for this object here https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#received-messages
 */
export type WebhookMessage = {
  /**
   * The type of message that has been received by the business that has subscribed to Webhooks.
   */
  type: SharedMessageTypes | "system" | "unknown" | "request_welcome" | "button" | "order";
  /**
   * The time when the customer sent the message to the business in unix format
   */
  timestamp: string;
  /**
   * When the messages type is set to audio, including voice messages, this object is included in the messages object:
   */
  audio?: {
    id: string;
    mime_type: string;
  };
  /**
   * When the messages type field is set to button, this object is included in the messages object:
   */
  button?: {
    /**
     * The payload for a button set up by the business that a customer clicked as part of an interactive message
     */
    payload: string;
    text: string;
  };
  /**
   * When the messages type field is set to contact, this object is included in the messages object:
   */
  contacts?: [
    {
      addresses?: {
        city?: string;
        country?: string;
        country_code?: string;
        state?: string;
        street?: string;
        type?: string;
        zip?: string;
      }[];
      birthday?: string;
      emails?: {
        email: string;
        type?: string;
      }[];
      name?: {
        formatted_name?: string;
        first_name?: string;
        last_name?: string;
        middle_name?: string;
        suffix?: string;
        prefix?: string;
      };
      org?: {
        company?: string;
        department?: string;
        title?: string;
      };
      phones?: {
        phone: string;
        wa_id?: string;
        type?: string;
      }[];
      urls?: {
        url: string;
        type?: string;
      }[];
    },
  ];
  /**
   * Context object. Only included when a user replies or interacts with one of your messages. Context objects can have the following properties
   */
  context?: {
    /**
     * Set to true if the message received by the business has been forwarded
     */
    forwarded: boolean;
    /**
     * Set to true if the message received by the business has been forwarded more than 5 times.
     */
    frequently_forwarded: boolean;
    /**
     * The WhatsApp ID for the customer who replied to an inbound message
     */
    from: string;
    /**
     * The message ID for the sent message for an inbound reply
     */
    id: string;
    /**
     * Referred product object describing the product the user is requesting information about. You must parse this value if you support Product Enquiry Messages
     */
    referred_product: {
      catalog_id: string;
      product_retailer_id: string;
    };
  };
  /**
   * When messages type is set to document.
   */
  document?: WebhookMedia;
  /**
   * The message that a business received from a customer is not a supported type.
   */
  errors?: WebhookError[];
  /**
   * The customer's WhatsApp ID. A business can respond to a customer using this ID.
   * May be omitted if the user has enabled the usernames feature and phone number cannot be included.
   */
  from?: string;
  /**
   * The user's BSUID. Included starting March 31, 2026.
   */
  from_user_id?: string;
  /**
   * The user's parent BSUID, present only when parent BSUIDs are enabled.
   */
  from_parent_user_id?: string;
  /**
   * The ID for the message that was received by the business. You could use messages endpoint to mark it as read.
   */
  id: string;
  /**
   * A webhook is triggered when a customer's phone number or profile information has been updated.
   */
  identity?: {
    acknowledged: boolean;
    /**
     * The time when the WhatsApp Business Management API detected the customer may have changed their profile information
     */
    created_timestamp: string;
    /**
     * The ID for the messages system customer_identity_changed
     */
    hash: string;
  };
  /**
   * When messages type is set to image, this object is included in the messages object.
   * */
  image?: WebhookMedia;
  /**
   * Included when a customer interacts with an interactive message (button, list, or flow).
   */
  interactive?: InteractiveWebhookMessage;
  /**
   * When the messages type field is set to location, this object is included in the messages object:
   */
  location?: {
    latitude: string;
    longitude: string;
    name?: string;
    address?: string;
  };

  /**
   * Included in the messages object when a customer has placed an order. Order objects have the following properties:
   */
  order?: {
    catalog_id: string;
    text: string;
    product_items: {
      product_retailer_id: string;
      quantity: string;
      item_price: string;
      currency: string;
    }[];
  };
  /**
   * A customer clicked an ad that redirects them to WhatsApp.
   *
   * The referral object can be included in the following types of message: text, location, contact, image, video, document, voice, and sticker.
   */
  referral?: {
    /**
     *  The Meta URL that leads to the ad or post clicked by the customer. Opening this url takes you to the ad viewed by your customer.
     */
    source_url: string;
    /**
     * The type of the ad’s source; ad or post
     */
    source_type: LiteralUnion<"ad" | "post">;
    /**
     * Meta ID for an ad or a post
     */
    source_id: string;
    headline: string;
    body: string;
    /**
     * Media present in the ad or post; image or video
     */
    media_type: string;
    /**
     * URL of the image, when media_type is an image
     */
    image_url: string;
    /**
     * URL of the video, when media_type is a video
     */
    video_url: string;
    /**
     * URL for the thumbnail, when media_type is a video
     */
    thumbnail_url: string;
    ctwa_clid: string;
  };
  /**
   * When messages type is set to sticker.
   */
  sticker?: {
    mime_type: LiteralUnion<"image/webp">;
    sha256: string;
    /**
     *  ID for the sticker
     */
    id: string;
    /**
     *  Set to true if the sticker is animated; false otherwise.
     */
    animated: boolean;
  };
  /**
   * When messages type is set to system, a customer has updated their phone number or profile information
   */
  system?: {
    /**
     * Describes the change to the customer's identity or phone number
     */
    body: string;
    /**
     * Hash for the identity fetched from server
     */
    identity: string;
    /**
     * New WhatsApp ID for the customer when their phone number is updated. Available on webhook versions V11 and below
     */
    new_wa_id: string;
    /**
     * New WhatsApp ID for the customer when their phone number is updated. Available on webhook versions V12 and above
     */
    wa_id: string;
    /**
     * Type of system update.
     */
    type: {
      /**
       * A customer changed their phone number
       */
      customer_changed_number: boolean;
      /**
       * A customer changed their profile information
       */
      customer_identity_changed: boolean;
      /**
       * A WhatsApp user changed their phone number (and thus their BSUID).
       */
      user_changed_user_id: boolean;
    };
    /**
     * The WhatsApp ID for the customer prior to the update
     */
    customer: string;
    /**
     * The user's new BSUID, assigned when they change their phone number.
     */
    user_id?: string;
    /**
     * The user's new parent BSUID, if parent BSUIDs are enabled.
     */
    parent_user_id?: string;
  };
  /**
   * When messages type is set to text.
   */
  text?: {
    body: string;
  };
  /**
   * When messages type is set to video.
   */
  video?: WebhookMedia;
  /**
   * When messages type is set to reaction.
   */
  reaction?: ReactionMessage;
};

/**
 * For more information about this object, go here https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#statuses-object
 */
export type WebhookStatus = {
  /**
   * The ID for the message that the business that is subscribed to the webhooks sent to a customer
   */
  id: string;
  /**
   * Arbitrary string included in sent message. See Message object.
   */
  biz_opaque_callback_data: string;
  /**
   * An object containing billing information.
   */
  pricing: {
    /**
     * Indicates the conversation pricing category
     */
    category: "authentication" | "marketing" | "utility" | "service" | "referral_conversion";
    /**
     *  Type of pricing model used by the business.
     */
    pricing_model: LiteralUnion<"CBP">;
  };
  conversation: {
    /**
     *  Represents the ID of the conversation the given status notification belongs to.
     */
    id: string;
    /**
     *  Indicates who initiated the conversation
     */
    origin: {
      /**
       * Indicates where a conversation has started. This can also be referred to as a conversation entry point
       */
      type:
        | "authentication"
        | "marketing"
        | "utility"
        | "service"
        | "business_initiated"
        | "customer_initiated"
        | "referral_conversation";
      /**
       *  Date when the conversation expires. This field is only present for messages with a `status` set to `sent`
       */
    };
    expiration_timestamp: string;
  };
  /**
   * The WhatsApp ID (phone number) of the message recipient. May be omitted if the message
   * was sent to a BSUID and the phone number cannot be included.
   */
  recipient_id?: string;
  /**
   * The BSUID or parent BSUID of the recipient, if the message was sent to a BSUID.
   */
  recipient_user_id?: string;
  /**
   * The parent BSUID of the recipient, if parent BSUIDs are enabled.
   */
  recipient_parent_user_id?: string;
  /**
   * Contacts array included for sent, delivered, and read status messages.
   * Omitted for failed status messages.
   */
  contacts?: Array<{
    profile: {
      name: string;
      username?: string;
    };
    wa_id?: string;
    user_id?: string;
    parent_user_id?: string;
  }>;
  status: "delivered" | "failed" | "read" | "sent" | "RINGING" | "ACCEPTED" | "REJECTED";
  /**
   * Date for the status message in unix
   */
  timestamp: string;

  errors: Array<WebhookError>;
  /**
   * Present for call status webhooks. When `type` is `"call"`, `status` will be
   * `"RINGING"`, `"ACCEPTED"`, or `"REJECTED"`.
   */
  type?: LiteralUnion<"call">;
};

export type WebhookMetadata = {
  display_phone_number: string;
  phone_number_id: string;
};

/** The type of data to synchronize from the WhatsApp Business app. */
export type SmbAppDataSyncType = "smb_app_state_sync" | "history";

/** Events that trigger the account_update webhook. */
export type AccountUpdateEvent = "PARTNER_REMOVED" | "ACCOUNT_OFFBOARDED" | "ACCOUNT_RECONNECTED";

/** Payload shape for the account_update webhook field. */
export type WebhookAccountUpdate = {
  /** The business phone number. Present for PARTNER_REMOVED events. */
  phone_number?: string;
  event: AccountUpdateEvent;
};

/** A message sent by the business via the WhatsApp Business app (smb_message_echoes). */
export type WebhookMessageEcho = {
  /** Business phone number that sent the message. */
  from: string;
  /** WhatsApp user phone number that received the message. May be omitted if the user has enabled usernames. */
  to?: string;
  /** The user's BSUID. */
  to_user_id?: string;
  /** The user's parent BSUID, if parent BSUIDs are enabled. */
  to_parent_user_id?: string;
  id: string;
  timestamp: string;
  /** Message type (e.g. "text", "image"). */
  type: string;
  [key: string]: unknown;
};

/** A single WhatsApp contact in the business's address book (smb_app_state_sync). */
export type WebhookStateSyncContact = {
  full_name?: string;
  first_name?: string;
  /** The contact's phone number. May be omitted if the user has enabled usernames. */
  phone_number?: string;
  /** The user's BSUID. */
  user_id?: string;
  /** The user's parent BSUID, if parent BSUIDs are enabled. */
  parent_user_id?: string;
  /** The user's username, if the user has enabled the usernames feature. */
  username?: string;
};

/** A single contact sync event from an smb_app_state_sync webhook. */
export type WebhookStateSync = {
  type: "contact";
  contact: WebhookStateSyncContact;
  /** "add" means the contact was added or edited; "remove" means it was deleted. */
  action: "add" | "remove";
  metadata: {
    timestamp: string;
  };
};

/** Progress metadata for a history sync chunk. */
export type WebhookHistoryMeta = {
  /** Phase of the sync: 0 = day 0–1, 1 = day 1–90, 2 = day 90–180. */
  phase: 0 | 1 | 2;
  /** Sequential chunk number. Use to order chunks. */
  chunk_order: number;
  /** Overall synchronization progress percentage (0–100). */
  progress: number;
};

/** A single item in the history webhook's history array. */
export type WebhookHistory = {
  metadata?: WebhookHistoryMeta;
  threads?: Array<{
    /** WhatsApp user phone number for this thread. May be omitted if the user has enabled usernames. */
    id?: string;
    /** Context for the thread, including BSUID and username information. */
    context?: {
      /** The user's phone number. Omitted if the user has enabled usernames. */
      wa_id?: string;
      /** The user's BSUID. */
      user_id?: string;
      /** The user's parent BSUID, if parent BSUIDs are enabled. */
      parent_user_id?: string;
      /** The user's username, if the user has enabled the usernames feature. */
      username?: string;
    };
    messages?: WebhookMessage[];
  }>;
  errors?: WebhookError[];
};

/** Value shape for messaging-style webhook changes (messages, statuses, calls, echoes, etc.). */
export type MessagingWebhookValue = {
  messaging_product: "whatsapp";
  metadata: WebhookMetadata;
  errors?: WebhookError[];
  contacts: WebhookContact[];
  messages?: WebhookMessage[];
  statuses?: WebhookStatus[];
  /** Present on webhooks with `field: "calls"`. Contains call connect/terminate events. */
  calls?: WebhookCallEvent[];
  /** Present on smb_app_state_sync webhooks. Contact add/edit/remove events. */
  state_sync?: WebhookStateSync[];
  /** Present on smb_message_echoes webhooks. Messages sent from the WBA app. */
  message_echoes?: WebhookMessageEcho[];
  /** Present on history webhooks. Synchronized message history chunks. */
  history?: WebhookHistory[];
  /** Present on account_update webhooks. WABA lifecycle event. */
  account_update?: WebhookAccountUpdate;
};

// ─── Template lifecycle webhooks ──────────────────────────────────────────────

/** Quality score reported on template quality update webhooks. */
export type TemplateQualityScore = "GREEN" | "YELLOW" | "RED" | "UNKNOWN";

/** Payload for `message_template_status_update` webhook field. */
export type WebhookTemplateStatusUpdate = {
  message_template_id: number;
  message_template_name: string;
  message_template_language: string;
  /** The lifecycle event that triggered the update. */
  event: LiteralUnion<
    "APPROVED" | "REJECTED" | "FLAGGED" | "PAUSED" | "DISABLED" | "PENDING_DELETION"
  >;
  /** Present when event is REJECTED. Describes the rejection reason. */
  reason?: string;
};

/** Payload for `message_template_quality_update` webhook field. */
export type WebhookTemplateQualityUpdate = {
  message_template_id: number;
  message_template_name: string;
  previous_quality_score: TemplateQualityScore;
  new_quality_score: TemplateQualityScore;
};

/** Payload for `message_template_category_update` webhook field. */
export type WebhookTemplateCategoryUpdate = {
  message_template_id: number;
  message_template_name: string;
  previous_category: TemplateCategory;
  new_category: TemplateCategory;
};

// ─── Phone number webhooks ────────────────────────────────────────────────────

/** Messaging limit tier for a WhatsApp Business phone number. */
export type PhoneNumberConversationLimit =
  | "TIER_50"
  | "TIER_250"
  | "TIER_1K"
  | "TIER_10K"
  | "TIER_100K"
  | "TIER_UNLIMITED";

/** Payload for `phone_number_quality_update` webhook field. */
export type WebhookPhoneNumberQualityUpdate = {
  display_phone_number: string;
  event: "QUALITY_RATING_RESTORED" | "QUALITY_RATING_CHANGED";
  /** Messaging tier limit, present when quality rating affects the sending tier. */
  current_limit?: PhoneNumberConversationLimit;
};

/** Payload for `phone_number_name_update` webhook field. */
export type WebhookPhoneNumberNameUpdate = {
  display_phone_number: string;
  phone_number: string;
  requested_verified_name: string;
  /** Present when decision is DECLINED. */
  rejection_reason?: string;
  decision: "APPROVED" | "DECLINED";
};

// ─── Flows webhooks ───────────────────────────────────────────────────────────

/** Events that can be reported on `flows` webhooks. */
export type WebhookFlowEvent = LiteralUnion<
  | "ENDPOINT_NOT_CONFIGURED"
  | "ENDPOINT_RETURNED_HTTP_ERROR"
  | "ENDPOINT_TIMEOUT"
  | "DEPRECATED"
  | "PUBLISHED"
  | "DELETED"
  | "BLOCKED"
>;

/** Payload for `flows` webhook field. */
export type WebhookFlow = {
  flow_id: string;
  event: WebhookFlowEvent;
};

// ─── Security / capability / review / alert webhooks ─────────────────────────

/** Payload for `security` webhook field. */
export type WebhookSecurity = {
  /** The security event that occurred. */
  event: LiteralUnion<"TWO_STEP_VERIFICATION_DISABLED">;
};

/** Payload for `business_capability_update` webhook field. */
export type WebhookBusinessCapabilityUpdate = {
  max_daily_conversation_per_phone?: number;
  current_limit?: PhoneNumberConversationLimit;
  max_phone_numbers_per_business?: number;
  max_phone_numbers_per_waba?: number;
};

/** Payload for `account_review_update` webhook field. */
export type WebhookAccountReviewUpdate = {
  decision: "APPROVED" | "REJECTED";
};

/** Payload for `account_alerts` webhook field. */
export type WebhookAccountAlert = {
  /** The alert type. */
  type: LiteralUnion<"FLAGGED" | "RESTRICTED">;
  /** Human-readable details about the alert. */
  details: string;
};

/** Status of a business username request. */
export type UsernameStatus = "approved" | "reserved" | "deleted";

/**
 * Payload for the `business_username_update` webhook field.
 * Triggered when a business username status changes.
 */
export type WebhookBusinessUsernameUpdate = {
  /** Business phone number display number. */
  display_phone_number: string;
  /**
   * The username whose status changed.
   * Omitted when `status` is `"deleted"`.
   */
  username?: string;
  /** New status of the username. */
  status: UsernameStatus;
};

// ─── WebhookChange discriminated union ───────────────────────────────────────

export type WebhookChange =
  | {
      field: LiteralUnion<
        | "messages"
        | "calls"
        | "smb_app_state_sync"
        | "smb_message_echoes"
        | "history"
        | "account_update"
      >;
      value: MessagingWebhookValue;
    }
  | { field: "message_template_status_update"; value: WebhookTemplateStatusUpdate }
  | { field: "message_template_quality_update"; value: WebhookTemplateQualityUpdate }
  | { field: "message_template_category_update"; value: WebhookTemplateCategoryUpdate }
  | { field: "phone_number_quality_update"; value: WebhookPhoneNumberQualityUpdate }
  | { field: "phone_number_name_update"; value: WebhookPhoneNumberNameUpdate }
  | { field: "flows"; value: WebhookFlow }
  | { field: "security"; value: WebhookSecurity }
  | { field: "business_capability_update"; value: WebhookBusinessCapabilityUpdate }
  | { field: "account_review_update"; value: WebhookAccountReviewUpdate }
  | { field: "account_alerts"; value: WebhookAccountAlert }
  | { field: "business_username_update"; value: WebhookBusinessUsernameUpdate };

/**
 * Webhooks are triggered when a customer performs an action or the status for a message a business sends a customer changes.
 * To add webhooks go here https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks
 * To see examples of Webhooks Responses go here: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 */
export type Webhook = {
  object: string;
  entry: [
    {
      id: string;
      changes: WebhookChange[];
    },
  ];
};

export type WebhookEvents = {
  /**
   * Gets fired when the server starts listening
   */
  onStartListening?: () => void;
  /**
   * This event gets fired on any webhooks messages, you'll have to differentiate between the message type
   */
  onMessageReceived?: (
    payload: WebhookMessage,
    contact: WebhookContact,
    metadata?: WebhookMetadata,
  ) => void;
  /**
   * Gets fired when the received message is type of text
   */
  onTextMessageReceived?: (
    textMessage: Pick<WebhookMessage, "type" | "timestamp" | "text" | "from" | "id">,
    contact: WebhookContact,
    metadata?: WebhookMetadata,
  ) => void;
  /**
   * Gets triggered when a message is sent or delivered to a customer
   * or the customer reads the delivered message sent by a business that is subscribed to the Webhooks.
   */
  onStatusReceived?: (payload: WebhookStatus, metadata?: WebhookMetadata) => void;
  /**
   * Gets fired whenever there is an err
   */
  onError?: (payload: WebhookError) => void;
  /**
   * Fired when a business-initiated call is ready to be connected (SDP answer received).
   * Apply `call.session.sdp` to your WebRTC stack, then call `acceptCall()`.
   */
  onCallConnected?: (call: WebhookCallConnect, metadata?: WebhookMetadata) => void;
  /**
   * Fired when any call has been terminated (completed or failed).
   */
  onCallTerminated?: (call: WebhookCallTerminate, metadata?: WebhookMetadata) => void;
  /**
   * Fired for each message sent by the business via the WhatsApp Business app (smb_message_echoes).
   * Mirror these in your app's conversation history.
   */
  onMessageEcho?: (echo: WebhookMessageEcho, metadata?: WebhookMetadata) => void;
  /**
   * Fired when the WABA account status changes (account_update).
   * Includes PARTNER_REMOVED, ACCOUNT_OFFBOARDED, and ACCOUNT_RECONNECTED events.
   */
  onAccountUpdate?: (update: WebhookAccountUpdate) => void;
  /**
   * Fired for each chunk of synchronized messaging history (history).
   * Process asynchronously — a single chunk may describe thousands of messages.
   */
  onHistorySync?: (history: WebhookHistory, metadata?: WebhookMetadata) => void;
  /**
   * Fired when a contact is added, edited, or removed in the WhatsApp Business app (smb_app_state_sync).
   */
  onStateSync?: (sync: WebhookStateSync, metadata?: WebhookMetadata) => void;
  /**
   * Fired when a template's lifecycle status changes (approved, rejected, flagged, paused, etc.).
   * Subscribe to the `message_template_status_update` webhook field.
   */
  onTemplateStatusUpdate?: (update: WebhookTemplateStatusUpdate) => void;
  /**
   * Fired when a template's quality rating changes (GREEN → YELLOW → RED or restored).
   * Subscribe to the `message_template_quality_update` webhook field.
   */
  onTemplateQualityUpdate?: (update: WebhookTemplateQualityUpdate) => void;
  /**
   * Fired when Meta auto-recategorizes a template (e.g. MARKETING → UTILITY).
   * Subscribe to the `message_template_category_update` webhook field.
   */
  onTemplateCategoryUpdate?: (update: WebhookTemplateCategoryUpdate) => void;
  /**
   * Fired when a phone number's quality rating or messaging tier changes.
   * Subscribe to the `phone_number_quality_update` webhook field.
   */
  onPhoneNumberQualityUpdate?: (update: WebhookPhoneNumberQualityUpdate) => void;
  /**
   * Fired when a display name change request is approved or declined.
   * Subscribe to the `phone_number_name_update` webhook field.
   */
  onPhoneNumberNameUpdate?: (update: WebhookPhoneNumberNameUpdate) => void;
  /**
   * Fired when a WhatsApp Flow status changes (published, deleted, endpoint errors, etc.).
   * Subscribe to the `flows` webhook field.
   */
  onFlowUpdate?: (flow: WebhookFlow) => void;
  /**
   * Fired for account security alerts such as two-step verification being disabled.
   * Subscribe to the `security` webhook field.
   */
  onSecurityAlert?: (alert: WebhookSecurity) => void;
  /**
   * Fired when the WABA messaging tier or phone number limits change.
   * Subscribe to the `business_capability_update` webhook field.
   */
  onBusinessCapabilityUpdate?: (update: WebhookBusinessCapabilityUpdate) => void;
  /**
   * Fired when a business account review decision is made (approved or rejected).
   * Subscribe to the `account_review_update` webhook field.
   */
  onAccountReviewUpdate?: (update: WebhookAccountReviewUpdate) => void;
  /**
   * Fired for policy-related platform alerts (FLAGGED, RESTRICTED, etc.).
   * Subscribe to the `account_alerts` webhook field.
   */
  onAccountAlert?: (alert: WebhookAccountAlert) => void;
  /**
   * Fired when a business username status changes (approved, reserved, or deleted).
   * Subscribe to the `business_username_update` webhook field.
   */
  onBusinessUsernameUpdate?: (update: WebhookBusinessUsernameUpdate) => void;
};
