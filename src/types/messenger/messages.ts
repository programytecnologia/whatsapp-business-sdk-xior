// ----- Recipient -----

export type MessengerRecipient =
	| { id: string }
	| { phone_number: string }
	| { user_ref: string }
	| { comment_id: string }
	| { post_id: string };

// ----- Messaging type & tags -----

export type MessagingType = "RESPONSE" | "UPDATE" | "MESSAGE_TAG";

export type MessageTag =
	| "CONFIRMED_EVENT_UPDATE"
	| "POST_PURCHASE_UPDATE"
	| "ACCOUNT_UPDATE"
	| "HUMAN_AGENT";

// ----- Sender actions -----

export type SenderAction = "typing_on" | "typing_off" | "mark_seen";

// ----- Quick replies -----

export type QuickReplyText = {
	content_type: "text";
	title: string;
	payload: string | number;
	image_url?: string;
};

export type QuickReplyLocation = { content_type: "location" };
export type QuickReplyUserPhone = { content_type: "user_phone_number" };
export type QuickReplyUserEmail = { content_type: "user_email" };

export type QuickReply =
	| QuickReplyText
	| QuickReplyLocation
	| QuickReplyUserPhone
	| QuickReplyUserEmail;

// ----- Attachment payloads -----

export type UrlAttachmentPayload = { url: string; is_reusable?: boolean };
export type IdAttachmentPayload = { attachment_id: string };
export type MediaAttachmentPayload = UrlAttachmentPayload | IdAttachmentPayload;

// ----- Template building blocks -----

export type DefaultAction = {
	type: "web_url";
	url: string;
	webview_height_ratio?: "compact" | "tall" | "full";
	messenger_extensions?: boolean;
	fallback_url?: string;
};

export type UrlButton = {
	type: "web_url";
	title: string;
	url: string;
	webview_height_ratio?: "compact" | "tall" | "full";
	messenger_extensions?: boolean;
	fallback_url?: string;
};

export type PostbackButton = {
	type: "postback";
	title: string;
	payload: string;
};

export type CallButton = {
	type: "phone_number";
	title: string;
	payload: string;
};

export type LoginButton = {
	type: "account_link";
	url: string;
};

export type LogoutButton = { type: "account_unlink" };

export type ShareButton = {
	type: "element_share";
	share_contents?: {
		attachment: { type: "template"; payload: GenericTemplatePayload };
	};
};

export type TemplateButton =
	| UrlButton
	| PostbackButton
	| CallButton
	| LoginButton
	| LogoutButton
	| ShareButton;

// ----- Template payloads -----

export type GenericElement = {
	title: string;
	subtitle?: string;
	image_url?: string;
	default_action?: DefaultAction;
	buttons?: TemplateButton[];
};

export type GenericTemplatePayload = {
	template_type: "generic";
	elements: GenericElement[];
	image_aspect_ratio?: "horizontal" | "square";
	sharable?: boolean;
};

export type ButtonTemplatePayload = {
	template_type: "button";
	text: string;
	buttons: (UrlButton | PostbackButton | LoginButton | LogoutButton)[];
};

export type MediaTemplateElement = {
	media_type: "image" | "video";
	url?: string;
	attachment_id?: string;
	buttons?: TemplateButton[];
};

export type MediaTemplatePayload = {
	template_type: "media";
	elements: [MediaTemplateElement];
	sharable?: boolean;
};

export type ReceiptAddress = {
	street_1?: string;
	street_2?: string;
	city: string;
	postal_code?: string;
	state?: string;
	country: string;
};

export type ReceiptSummary = {
	subtotal?: number;
	shipping_cost?: number;
	total_tax?: number;
	total_cost: number;
};

export type ReceiptAdjustment = { name: string; amount: number };

export type ReceiptElement = {
	title: string;
	subtitle?: string;
	quantity?: number;
	price: number;
	currency?: string;
	image_url?: string;
};

export type ReceiptTemplatePayload = {
	template_type: "receipt";
	recipient_name: string;
	order_number: string;
	currency: string;
	payment_method: string;
	timestamp?: string;
	elements: ReceiptElement[];
	address?: ReceiptAddress;
	summary: ReceiptSummary;
	adjustments?: ReceiptAdjustment[];
	sharable?: boolean;
};

export type OTNTemplatePayload = {
	template_type: "one_time_notif_req";
	title: string;
	payload: string;
};

export type TemplatePayload =
	| GenericTemplatePayload
	| ButtonTemplatePayload
	| MediaTemplatePayload
	| ReceiptTemplatePayload
	| OTNTemplatePayload;

export type TemplateAttachment = {
	type: "template";
	payload: TemplatePayload;
};

export type FileAttachment = {
	type: "image" | "video" | "audio" | "file";
	payload: MediaAttachmentPayload;
};

export type MessengerAttachment = TemplateAttachment | FileAttachment;

// ----- Message -----

export type MessengerMessage = {
	text?: string;
	attachment?: MessengerAttachment;
	quick_replies?: QuickReply[];
	metadata?: string;
};

// ----- Send payload -----

export type MessengerSendPayload = {
	recipient: MessengerRecipient;
	message?: MessengerMessage;
	sender_action?: SenderAction;
	messaging_type?: MessagingType;
	tag?: MessageTag;
	notification_type?: "REGULAR" | "SILENT_PUSH" | "NO_PUSH";
	persona_id?: string;
};

export type MessengerSendResponse = {
	recipient_id: string;
	message_id: string;
	attachment_id?: string;
};

// ----- Attachment Upload -----

export type AttachmentUploadResponse = {
	/** Reusable id — pass as `payload.attachment_id` in future sends to avoid re-uploading. */
	attachment_id: string;
};
