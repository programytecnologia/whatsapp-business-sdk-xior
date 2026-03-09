// ----- Recipient -----

export type IGRecipient = { id: string } | { comment_id: string } | { post_id: string };

// ----- Attachment -----

export type IGAttachment = {
  type: "image" | "audio" | "video" | "file";
  payload: { url: string } | { attachment_id: string };
};

// ----- Message -----

export type IGMessage = {
  text?: string;
  attachment?: IGAttachment;
};

// ----- Messaging type / tags (subset supported by IG) -----

export type IGMessagingType = "RESPONSE" | "UPDATE" | "MESSAGE_TAG";

export type IGMessageTag =
  | "CONFIRMED_EVENT_UPDATE"
  | "POST_PURCHASE_UPDATE"
  | "ACCOUNT_UPDATE"
  | "HUMAN_AGENT";

// ----- Send payload -----

export type IGSendMessagePayload = {
  recipient: IGRecipient;
  message: IGMessage;
  messaging_type?: IGMessagingType;
  tag?: IGMessageTag;
};

export type IGSendMessageResponse = {
  recipient_id: string;
  message_id: string;
};
