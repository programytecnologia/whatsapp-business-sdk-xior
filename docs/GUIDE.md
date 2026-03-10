# whatsapp-business-sdk — Usage Guide

This guide walks through setting up and using each of the three messaging channels supported by this SDK:

- [WhatsApp Business (Cloud API)](#1-whatsapp-business-cloud-api)
    - [Business usernames](#112--business-usernames)
    - [Business-scoped user IDs (BSUIDs)](#113--business-scoped-user-ids-bsuids)
- [Facebook Messenger](#2-facebook-messenger)
- [Instagram Direct Messaging](#3-instagram-direct-messaging)

All three share the same installation and the same underlying HTTP client (`xior`). TypeScript types are bundled — no `@types/…` package needed.

---

## Installation

```bash
# npm
npm install whatsapp-business-sdk

# pnpm
pnpm add whatsapp-business-sdk
```

---

## 1 · WhatsApp Business (Cloud API)

### Prerequisites

| Requirement                                    | Where to get it                                                              |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| **System User Access Token**                   | Meta Business Suite → Settings → System Users                                |
| **Phone Number ID** (`phoneId`)                | App Dashboard → WhatsApp → API Setup                                         |
| **WhatsApp Business Account ID** (`accountId`) | App Dashboard → WhatsApp → API Setup                                         |
| **App Secret**                                 | App Dashboard → Settings → Basic (needed for webhook signature verification) |

### 1.1 — Client setup

```ts
import { WABAClient } from "whatsapp-business-sdk";

const client = new WABAClient({
	apiToken: process.env.WA_TOKEN!,
	phoneId: process.env.WA_PHONE_ID!,
	accountId: process.env.WA_ACCOUNT_ID!,
});
```

### 1.2 — Sending messages

```ts
// Plain text (by phone number)
await client.sendMessage({
	to: "+16505551234",
	type: "text",
	text: { body: "Hello from WhatsApp!" },
});

// Plain text (by BSUID — available from May 2026)
await client.sendMessage({
	recipient: "US.13491208655302741918",
	type: "text",
	text: { body: "Hello via BSUID!" },
});

// Both identifiers — phone number takes precedence, BSUID is returned in the response
await client.sendMessage({
	to: "+16505551234",
	recipient: "US.13491208655302741918",
	type: "text",
	text: { body: "Hello!" },
});

// Image by URL
await client.sendMessage({
	to: "+16505551234",
	type: "image",
	image: { link: "https://example.com/photo.jpg", caption: "Check this out" },
});

// Audio
await client.sendMessage({
	to: "+16505551234",
	type: "audio",
	audio: { link: "https://example.com/clip.ogg" },
});

// Document
await client.sendMessage({
	to: "+16505551234",
	type: "document",
	document: {
		link: "https://example.com/invoice.pdf",
		caption: "Your invoice",
		filename: "invoice.pdf",
	},
});

// Location
await client.sendMessage({
	to: "+16505551234",
	type: "location",
	location: { latitude: 37.7749, longitude: -122.4194, name: "San Francisco" },
});

// Interactive — reply buttons
await client.sendMessage({
	to: "+16505551234",
	type: "interactive",
	interactive: {
		type: "button",
		body: { text: "Choose an option:" },
		action: {
			buttons: [
				{ type: "reply", reply: { id: "yes", title: "Yes" } },
				{ type: "reply", reply: { id: "no", title: "No" } },
			],
		},
	},
});

// Interactive — request contact info (no template needed)
// When the user taps the button, their vCard and phone number are sent back
// as a contacts webhook message (message.type === "contacts").
await client.sendMessage({
	to: "+16505551234",
	type: "interactive",
	interactive: {
		type: "request_contact_info",
		body: { text: "Please share your contact info so we can reach you." },
		action: { name: "request_contact_info" },
	},
});

// Template message
await client.sendMessage({
	to: "+16505551234",
	type: "template",
	template: {
		name: "order_confirmation",
		language: { code: "en_US" },
		components: [
			{
				type: "body",
				parameters: [{ type: "text", text: "John" }],
			},
		],
	},
});
```

### 1.3 — Conversation management

```ts
// Mark a message as read (shows blue ticks)
await client.markMessageAsRead("wamid.XXXXX");

// Show a typing indicator while preparing a reply
await client.sendTypingIndicator("wamid.XXXXX");
```

### 1.4 — Media management

```ts
// Upload media (returns a media_id valid for 30 days)
const { id } = await client.uploadMedia({
	file: "/path/to/image.jpg",
	type: "image/jpeg",
});

// Get the CDN URL for a media_id (valid for 5 minutes)
const { url } = await client.getMedia(id);

// Download it directly to disk
await client.downloadMedia(url, "/path/to/save/image.jpg");

// Delete uploaded media
await client.deleteMedia(id);
```

### 1.5 — Template management

```ts
// List templates (optionally filter by status or category)
const { data } = await client.getTemplates({ status: "APPROVED" });

// Create a new template
await client.createTemplate({
	name: "order_confirmation",
	language: "en_US",
	category: "UTILITY",
	components: [
		{ type: "HEADER", format: "TEXT", text: "Order {{1}}" },
		{ type: "BODY", text: "Hi {{1}}, your order {{2}} is confirmed." },
		{ type: "FOOTER", text: "Thank you!" },
	],
});

// Update an existing template
await client.updateTemplate(templateId, {
	components: [{ type: "BODY", text: "Updated content." }],
});

// Delete a template by name
await client.deleteTemplate("order_confirmation");

// Create a template with a REQUEST_CONTACT_INFO button
// When tapped, the user's phone number and vCard are shared in the chat
// and delivered as a contacts webhook message.
await client.createTemplate({
	name: "share_contact_prompt",
	language: "en_US",
	category: "UTILITY", // or "MARKETING"
	components: [
		{ type: "BODY", text: "Tap below to share your contact info." },
		{
			type: "BUTTONS",
			buttons: [{ type: "REQUEST_CONTACT_INFO" }],
		},
	],
});
```

### 1.6 — Business profile

```ts
// Retrieve profile
const profile = await client.getBusinessProfile();

// Update profile
await client.updateBusinessProfile({
	about: "We sell great stuff",
	email: "support@example.com",
	websites: ["https://example.com"],
});
```

### 1.7 — Phone number management

```ts
// List all phone numbers on the account
const { data } = await client.getBusinessPhoneNumbers();

// Request a verification code
await client.requestPhoneNumberVerificationCode({
	phoneNumberId: "+16505559999",
	code_method: "SMS",
	language: "en",
});

// Submit the received code
await client.verifyPhoneNumberCode({
	phoneNumberId: "+16505559999",
	code: "123456",
});

// Register / enable Cloud API for a phone
await client.registerPhone({
	phoneNumberId: "+16505559999",
	pin: "123456",
});

// Deregister (remove Cloud API access)
await client.deregisterPhone("+16505559999");
```

### 1.8 — Blocking users

Each entry is a `BlockUserTarget` — an object with `user` (phone number), `user_id` (BSUID), or both. When both are provided, `user` takes precedence.

```ts
// Block by phone number
await client.blockUsers([{ user: "+16505551234" }, { user: "+16505555678" }]);

// Block by BSUID
await client.blockUsers([{ user_id: "US.13491208655302741918" }]);

// Both identifiers at once — phone number takes precedence
await client.blockUsers([{ user: "+16505551234", user_id: "US.13491208655302741918" }]);

// Unblock
await client.unblockUsers([{ user: "+16505551234" }]);
await client.unblockUsers([{ user_id: "US.13491208655302741918" }]);

// List blocked users
const { data } = await client.getBlockedUsers();
// Each entry has optional wa_id (phone) and user_id (BSUID)
```

### 1.9 — Marketing Messages API

```ts
// By phone number
await client.sendMarketingMessage({
	messaging_product: "whatsapp",
	to: "+16505551234",
	type: "template",
	template: {
		name: "promo_summer",
		language: { code: "en_US", policy: "deterministic" },
	},
	product_policy: "STRICT",
	message_activity_sharing: true,
});

// By BSUID (available from May 2026)
await client.sendMarketingMessage({
	messaging_product: "whatsapp",
	recipient: "US.13491208655302741918",
	type: "template",
	template: {
		name: "promo_summer",
		language: { code: "en_US", policy: "deterministic" },
	},
});
```

### 1.10 — Calling API

```ts
// Initiate an outbound call (supply an SDP offer)
const { call_id } = await client.initiateCall({
	messaging_product: "whatsapp",
	to: "+16505551234",
	session: { sdp_type: "offer", sdp: "<your-sdp>" },
});

// Pre-accept inbound call once you receive the Call Connect webhook
await client.preAcceptCall(callId, { sdp_type: "answer", sdp: "<answer>" });

// Accept a call
await client.acceptCall(callId, { sdp_type: "answer", sdp: "<answer>" });

// Reject an inbound call
await client.rejectCall(callId);

// Terminate an active call
await client.terminateCall(callId);

// Calling API settings
await client.updateCallSettings({
	calling: {
		status: "ENABLED",
		call_icon_visibility: "DEFAULT",
		call_hours: {
			status: "ENABLED",
			timezone_id: "America/New_York",
			weekly_operating_hours: [
				{ day_of_week: "MONDAY", open_time: "0900", close_time: "1700" },
			],
		},
	},
});

// Check whether you can call a specific user (by phone number)
const perms = await client.getCallPermissions("+16505551234");

// Or by BSUID
const permsBsuid = await client.getCallPermissions({
	recipient: "US.13491208655302741918",
});

// Initiate a call by BSUID (available from May 2026)
await client.initiateCall({
	messaging_product: "whatsapp",
	recipient: "US.13491208655302741918",
	session: { sdp_type: "offer", sdp: "<your-sdp>" },
});
```

### 1.11 — Webhook listener

```ts
import express from "express";
import { WebhookClient } from "whatsapp-business-sdk";

const webhookClient = new WebhookClient({
	token: process.env.WA_WEBHOOK_TOKEN!,
	appSecret: process.env.META_APP_SECRET!, // enables X-Hub-Signature-256 verification
	port: 3000,
	path: "/webhook/whatsapp",
});

webhookClient.initWebhook({
	onStartListening: () => console.log("WhatsApp webhook ready"),

	onMessageReceived: (message, contact, metadata) => {
		// contact.user_id contains the BSUID (starting March 31, 2026)
		// contact.wa_id may be omitted if the user enabled usernames
		const userId = contact?.user_id ?? contact?.wa_id;
		console.log("Message from", contact?.profile?.name, "(", userId, ")");

		// message.from may be omitted — use message.from_user_id (BSUID) as fallback
		const sender = message.from ?? message.from_user_id;
		console.log("Sender identifier:", sender);

		// Handle contacts shared via REQUEST_CONTACT_INFO button tap
		if (message.type === "contacts") {
			for (const c of message.contacts ?? []) {
				console.log("Shared contact:", c.name?.formatted_name, c.phones?.[0]?.phone);
			}
		}
	},

	onTextMessageReceived: (message, contact, metadata) => {
		console.log("Text:", message.text?.body, "from", message.from ?? message.from_user_id);
	},

	onStatusReceived: (status, metadata) => {
		// status.recipient_id may be omitted if sent to a BSUID
		// use status.recipient_user_id as fallback
		const recipientId = status.recipient_id ?? status.recipient_user_id;
		console.log("Status:", status.status, "for", recipientId);

		// status.contacts[] is included for sent/delivered/read (not failed)
		status.contacts?.forEach((c) => {
			console.log("  Contact:", c.profile.name, c.user_id, c.wa_id);
		});
	},

	onCallConnected: (call, metadata) => {
		// Business-initiated: call.to_user_id has the callee's BSUID
		// User-initiated: call.from_user_id has the caller's BSUID
		console.log("Call:", call.id, call.to_user_id ?? call.from_user_id);
	},

	onCallTerminated: (call, metadata) => {
		console.log("Call ended:", call.id);
	},

	onMessageEcho: (echo, metadata) => {
		// echo.to may be omitted — use echo.to_user_id as fallback
		console.log("Echo to:", echo.to ?? echo.to_user_id);
	},

	onBusinessUsernameUpdate: (update) => {
		// Fires when your business username status changes (approved, reserved, deleted)
		console.log("Username", update.username, "is now", update.status);
	},

	onAccountUpdate: (update) => {
		console.log("Account update:", update);
	},

	onError: (error) => {
		console.error("Webhook error:", error);
	},
});
```

#### Using your own Express app

```ts
import express, { json } from "express";
import { WebhookClient, captureRawBody } from "whatsapp-business-sdk";

const app = express();
// Use captureRawBody so signature verification has access to the raw body
app.use(json({ verify: captureRawBody }));

const webhookClient = new WebhookClient({
	token: process.env.WA_WEBHOOK_TOKEN!,
	appSecret: process.env.META_APP_SECRET!,
	path: "/webhook/whatsapp",
	expressApp: { app, shouldStartListening: false },
});

webhookClient.initWebhook({
	/* events */
});

app.listen(3000);
```

### 1.12 — Business usernames

Business usernames are optional, unique identifiers (3–35 characters) mapped 1:1 to a business phone number. Customers can search for your business by username.

```ts
// Get your current business username
const { username, status } = await client.getUsername();
// status: "approved" (visible to users) or "reserved" (not yet visible)

// See usernames reserved for your business portfolio
const { data } = await client.getReservedUsernames();
console.log("Suggestions:", data[0].username_suggestions);

// Adopt or change your business username
const result = await client.adoptUsername("jaspers_market");
console.log("Status:", result.status); // "approved" or "reserved"

// Delete the business username
await client.deleteUsername();

// All methods accept an optional phoneNumberId to target a different phone number
await client.getUsername("OTHER_PHONE_ID");
await client.adoptUsername("my_brand", "OTHER_PHONE_ID");
```

### 1.13 — Business-scoped user IDs (BSUIDs)

WhatsApp is rolling out **usernames** for consumers. When a user enables usernames, their phone number may no longer appear in webhooks. To maintain conversation context, Meta assigns each user a **BSUID** (Business-Scoped User ID) unique to your business portfolio.

#### Timeline

| Date               | What happens                                                         |
| ------------------ | -------------------------------------------------------------------- |
| **March 31, 2026** | BSUIDs begin appearing in webhook payloads (alongside phone numbers) |
| **May 2026**       | APIs start accepting BSUIDs for sending messages and calls           |

#### BSUID format

`<ISO-3166-alpha-2>.<alphanumeric>` — e.g. `US.13491208655302741918`

- Scoped to your **business portfolio** (formerly Business Manager)
- Regenerated if a user changes their phone number
- Up to 128 alphanumeric characters after the country-code prefix

#### Backward compatibility

All BSUID changes in this SDK are **runtime backward compatible** — safe to deploy today:

- **Before March 31**: Webhooks include phone numbers as usual. New optional BSUID fields (`user_id`, `from_user_id`, etc.) will simply be `undefined`.
- **Before May 2026**: Continue sending messages with `to` (phone number). The new `recipient` field is optional — just don't set it.
- **TypeScript caveat**: Previously-required fields like `Message.to`, `WebhookMessage.from`, and `WebhookContact.wa_id` are now optional (`string | undefined`). If your code does `const phone: string = message.from` without a null check, you'll get a **compile error** after upgrading. This is intentional — it forces you to handle the case where phone numbers are absent.

#### Key fields to handle in webhooks

| Webhook type                   | Phone number field | BSUID field                     | Parent BSUID field                            |
| ------------------------------ | ------------------ | ------------------------------- | --------------------------------------------- |
| **Contact** (`WebhookContact`) | `wa_id?`           | `user_id?`                      | `parent_user_id?`                             |
| **Message** (`WebhookMessage`) | `from?`            | `from_user_id?`                 | `from_parent_user_id?`                        |
| **Status** (`WebhookStatus`)   | `recipient_id?`    | `recipient_user_id?`            | `recipient_parent_user_id?`                   |
| **Call connect/terminate**     | `to?` / `from?`    | `to_user_id?` / `from_user_id?` | `to_parent_user_id?` / `from_parent_user_id?` |
| **Message echo**               | `to?`              | `to_user_id?`                   | `to_parent_user_id?`                          |

#### System message: user changed phone number

When a user changes their phone number, a `system` message is delivered with `type.user_changed_user_id: true`. The new BSUID is in `system.user_id`:

```ts
onMessageReceived: (message, contact) => {
	if (message.type === "system" && message.system?.type.user_changed_user_id) {
		const newBsuid = message.system.user_id;
		const newParentBsuid = message.system.parent_user_id; // if parent BSUIDs enabled
		// Update your CRM mapping
	}
},
```

#### Recommended migration pattern

```ts
// Helper: resolve a user identifier from any webhook contact
function resolveUserId(contact: WebhookContact): string {
	// Prefer phone number for backward compat, fall back to BSUID
	return contact.wa_id ?? contact.user_id ?? "unknown";
}

// Helper: resolve sender from a message
function resolveSender(message: WebhookMessage): string {
	return message.from ?? message.from_user_id ?? "unknown";
}
```

#### Parent BSUIDs

If your business has **linked business portfolios**, you can enable parent BSUIDs. A parent BSUID works across all linked portfolios, while a regular BSUID is scoped to a single portfolio. Parent BSUIDs appear in `parent_user_id` / `from_parent_user_id` / `recipient_parent_user_id` / `to_parent_user_id` fields.

---

## 2 · Facebook Messenger

### Prerequisites

| Requirement              | Where to get it                                            |
| ------------------------ | ---------------------------------------------------------- |
| **Page Access Token**    | App Dashboard → Messenger → Settings → Access Tokens       |
| **Page ID**              | Facebook Page → About, or `me?fields=id` with a page token |
| **App Secret**           | App Dashboard → Settings → Basic                           |
| **Webhook Verify Token** | Any string you choose and configure in the App Dashboard   |

> **Token type**: The `MessengerClient` must be initialized with a **Page Access Token**, not an app or user token. All Send API calls use `me/messages` on behalf of the Page.

### 2.1 — Client setup

```ts
import { MessengerClient } from "whatsapp-business-sdk";

const client = new MessengerClient({
	apiToken: process.env.PAGE_ACCESS_TOKEN!,
	pageId: process.env.PAGE_ID!,
});
```

### 2.2 — Sending messages

```ts
// Plain text (defaults to RESPONSE messaging type)
await client.sendText("USER_PSID", "Hello from your Page!");

// Text with MESSAGE_TAG (for notifications outside the 24-hour window)
await client.sendText("USER_PSID", "Your order has shipped!", {
	messagingType: "MESSAGE_TAG",
	tag: "POST_PURCHASE_UPDATE",
});

// Image attachment
await client.sendAttachment("USER_PSID", {
	type: "image",
	payload: { url: "https://example.com/banner.jpg", is_reusable: true },
});

// Audio
await client.sendAttachment("USER_PSID", {
	type: "audio",
	payload: { url: "https://example.com/greeting.mp3" },
});

// Video
await client.sendAttachment("USER_PSID", {
	type: "video",
	payload: { url: "https://example.com/promo.mp4" },
});

// File
await client.sendAttachment("USER_PSID", {
	type: "file",
	payload: { url: "https://example.com/doc.pdf" },
});

// Generic template (carousel)
await client.sendAttachment("USER_PSID", {
	type: "template",
	payload: {
		template_type: "generic",
		elements: [
			{
				title: "Product A",
				subtitle: "Best seller",
				image_url: "https://example.com/a.jpg",
				buttons: [
					{ type: "postback", title: "Buy now", payload: "BUY_A" },
					{ type: "web_url", title: "Details", url: "https://example.com/a" },
				],
			},
		],
	},
});

// Button template
await client.sendAttachment("USER_PSID", {
	type: "template",
	payload: {
		template_type: "button",
		text: "What would you like to do?",
		buttons: [
			{ type: "postback", title: "Track order", payload: "TRACK_ORDER" },
			{ type: "web_url", title: "Visit site", url: "https://example.com" },
		],
	},
});

// Quick replies
await client.sendQuickReplies("USER_PSID", "Which size?", [
	{ content_type: "text", title: "Small", payload: "SIZE_S" },
	{ content_type: "text", title: "Medium", payload: "SIZE_M" },
	{ content_type: "text", title: "Large", payload: "SIZE_L" },
]);

// Location quick reply
await client.sendQuickReplies("USER_PSID", "Share your location:", [{ content_type: "location" }]);

// Full send() — escape hatch for any payload
await client.send({
	recipient: { id: "USER_PSID" },
	message: { text: "Custom payload" },
	messaging_type: "UPDATE",
	notification_type: "SILENT_PUSH",
	persona_id: "PERSONA_ID",
});
```

### 2.3 — Sender actions (typing indicators, read receipts)

```ts
// Show typing bubble
await client.sendSenderAction("USER_PSID", "typing_on");

// Hide typing bubble
await client.sendSenderAction("USER_PSID", "typing_off");

// Mark last message as seen
await client.sendSenderAction("USER_PSID", "mark_seen");
```

### 2.4 — Attachment Upload API (reusable media)

Upload once, reuse by ID — avoids bandwidth costs and CDN re-upload latency.

```ts
const { attachment_id } = await client.uploadAttachment({
	type: "image",
	payload: { url: "https://example.com/logo.png", is_reusable: true },
});

// Later sends can reference it directly
await client.sendAttachment("USER_PSID", {
	type: "image",
	payload: { attachment_id },
});
```

### 2.5 — Persona API

Personas let you send messages that appear from a custom name + avatar rather than the Page.

```ts
// Create a persona
const { id: personaId } = await client.createPersona({
	name: "Order Bot",
	profile_picture_url: "https://example.com/bot-avatar.jpg",
});

// Send as that persona (use the full send() with persona_id)
await client.send({
	recipient: { id: "USER_PSID" },
	message: { text: "Your order is on its way!" },
	messaging_type: "RESPONSE",
	persona_id: personaId,
});

// Retrieve a persona
const persona = await client.getPersona(personaId);

// Delete a persona
await client.deletePersona(personaId);
```

### 2.6 — Messenger Profile (Page settings)

```ts
// Set a Get Started button
await client.setProfile({
	get_started: { payload: "GET_STARTED" },
});

// Configure a greeting per locale
await client.setProfile({
	greeting: [
		{ locale: "default", text: "Hi! How can we help?" },
		{ locale: "es_ES", text: "¡Hola! ¿Cómo podemos ayudarte?" },
	],
});

// Add a Persistent Menu
await client.setProfile({
	persistent_menu: [
		{
			locale: "default",
			composer_input_disabled: false,
			call_to_actions: [
				{ type: "postback", title: "Track my order", payload: "TRACK_ORDER" },
				{ type: "postback", title: "Customer support", payload: "SUPPORT" },
				{ type: "web_url", title: "Visit our website", url: "https://example.com" },
			],
		},
	],
});

// Retrieve current profile settings
const { data } = await client.getProfile(["get_started", "greeting", "persistent_menu"]);

// Remove fields
await client.deleteProfile(["get_started", "persistent_menu"]);
```

### 2.7 — One-Time Notification (OTN)

Lets you re-engage users outside the 24-hour messaging window for a single follow-up.

```ts
// Step 1: send an opt-in request template
await client.sendOtnRequest(
	"USER_PSID",
	"Get notified when your order ships", // template title
	"SHIPPING_NOTIFY" // payload returned in the optin webhook
);

// Step 2: in your onOptinReceived webhook handler, extract the token:
//   optin.one_time_notif_token
// Then send the one-time message:
await client.sendOtnMessage(otnToken, "Your order just shipped!");
```

### 2.8 — Handover Protocol (multi-app workflows)

Use the Handover Protocol when multiple apps (e.g. a bot and a live-agent inbox) share a Page inbox.

```ts
// Pass control to another app (e.g. live-agent inbox app ID: 263902037430900)
await client.passThreadControl("USER_PSID", "263902037430900", "escalated-to-human");

// Take control back from a secondary app
await client.takeThreadControl("USER_PSID");

// Request control from the primary app (secondary apps use this)
await client.requestThreadControl("USER_PSID", "transfer-reason");

// See who currently owns the thread
const { data } = await client.getThreadOwner("USER_PSID");
console.log("Current owner app ID:", data[0].thread_owner.app_id);

// List all secondary apps connected to the Page
const { data: apps } = await client.getSecondaryReceivers();
```

### 2.9 — Webhook listener

```ts
import { MessengerWebhookClient } from "whatsapp-business-sdk";

const webhook = new MessengerWebhookClient({
	token: process.env.MESSENGER_WEBHOOK_TOKEN!,
	appSecret: process.env.META_APP_SECRET!, // enables X-Hub-Signature-256 verification
	port: 3000,
	path: "/webhook/messenger",
});

webhook.initWebhook({
	onStartListening: () => console.log("Messenger webhook ready"),

	onMessageReceived: (messaging, message) => {
		console.log("Message from", messaging.sender.id, ":", message);
	},

	onTextMessageReceived: (messaging, text) => {
		// React to every inbound text message
		client.sendSenderAction(messaging.sender.id, "typing_on");
		client.sendText(messaging.sender.id, `You said: ${text}`);
	},

	onAttachmentReceived: (messaging, attachments) => {
		console.log("Got", attachments.length, "attachment(s)");
	},

	onPostbackReceived: (messaging, postback) => {
		console.log("Postback payload:", postback.payload);
		if (postback.payload === "GET_STARTED") {
			client.sendText(messaging.sender.id, "Welcome! How can I help?");
		}
	},

	onReferralReceived: (messaging, referral) => {
		console.log("Referral ref:", referral.ref);
	},

	onOptinReceived: (messaging, optin) => {
		// OTN — store the one_time_notif_token for a future follow-up
		if (optin.one_time_notif_token) {
			saveOtnToken(messaging.sender.id, optin.one_time_notif_token);
		}
	},

	onReadReceived: (messaging, read) => {
		console.log("Read up to watermark:", read.watermark);
	},

	onDeliveryReceived: (messaging, delivery) => {
		console.log("Delivered up to watermark:", delivery.watermark);
	},

	onReactionReceived: (messaging, reaction) => {
		console.log(reaction.action, ":", reaction.emoji);
	},

	onHandoverReceived: (messaging, handover) => {
		// Fires for both pass_thread_control and take_thread_control
		console.log("Thread control now with:", handover.new_owner_app_id);
	},

	onThreadControlRequested: (messaging, request) => {
		// Fires when a secondary app calls requestThreadControl
		console.log("Secondary app requesting control:", request.requested_owner_app_id);
		// Grant or reject by calling passThreadControl / takeThreadControl
	},

	onEchoReceived: (messaging, message) => {
		// Outbound message sent by your Page (is_echo: true)
		console.log("Echo:", message.text);
	},
});
```

---

## 3 · Instagram Direct Messaging

### Prerequisites

| Requirement                               | Where to get it                                      |
| ----------------------------------------- | ---------------------------------------------------- |
| **Page Access Token**                     | The Facebook Page connected to the Instagram account |
| **Instagram-scoped User ID** (`igUserId`) | Query `me?fields=instagram_business_account`         |
| **App Secret**                            | App Dashboard → Settings → Basic                     |
| **Webhook Verify Token**                  | Any string you configure in the App Dashboard        |

> Instagram messaging uses the same **Page Access Token** as Messenger (both go through the Messenger Platform). The `igUserId` is the Instagram Business Account ID, not the Facebook Page ID.

### 3.1 — Client setup

```ts
import { InstagramClient } from "whatsapp-business-sdk";

const client = new InstagramClient({
	apiToken: process.env.PAGE_ACCESS_TOKEN!,
	igUserId: process.env.IG_USER_ID!,
});
```

### 3.2 — Sending messages

```ts
// Plain text reply
await client.sendText("USER_IG_SCOPED_ID", "Thanks for reaching out!");

// Text with MESSAGE_TAG (outside 24-hour window)
await client.sendText("USER_IG_SCOPED_ID", "Your order shipped!", {
	messagingType: "MESSAGE_TAG",
	tag: "POST_PURCHASE_UPDATE",
});

// Image attachment
await client.sendAttachment("USER_IG_SCOPED_ID", {
	type: "image",
	payload: { url: "https://example.com/photo.jpg" },
});

// Audio
await client.sendAttachment("USER_IG_SCOPED_ID", {
	type: "audio",
	payload: { url: "https://example.com/voice.mp3" },
});

// Video
await client.sendAttachment("USER_IG_SCOPED_ID", {
	type: "video",
	payload: { url: "https://example.com/clip.mp4" },
});

// Full sendMessage() — escape hatch for any payload
await client.sendMessage({
	recipient: { id: "USER_IG_SCOPED_ID" },
	message: { text: "Custom payload" },
	messaging_type: "RESPONSE",
});
```

### 3.3 — Attachment Upload API (reusable media)

```ts
const { attachment_id } = await client.uploadAttachment({
	type: "image",
	payload: { url: "https://example.com/product.jpg" },
});

// Reuse the ID in subsequent sends
await client.sendAttachment("USER_IG_SCOPED_ID", {
	type: "image",
	payload: { attachment_id },
});
```

### 3.4 — Comment interactions

Instagram supports two ways to respond to a comment:

| Method                      | Visibility                             | Use case                            |
| --------------------------- | -------------------------------------- | ----------------------------------- |
| `sendPrivateCommentReply()` | **Private DM** to the commenter        | Sensitive info, personal follow-up  |
| `replyToComment()`          | **Public reply** in the comment thread | General replies visible to everyone |

```ts
// Private DM reply triggered from a comment
await client.sendPrivateCommentReply("COMMENT_ID", "Hi! We've sent the details to your DM.");

// Public reply in the comment thread
await client.replyToComment("COMMENT_ID", "Thanks for the kind words! 🙌");

// Fetch comments for a media post
const { data } = await client.getComments("MEDIA_ID", ["id", "text", "timestamp", "username"]);
```

### 3.5 — Messaging Profile (Ice Breakers / greeting)

```ts
// Set Ice Breakers (quick-tap prompts when a user opens a new DM thread)
await client.setProfile({
	ice_breakers: [
		{ call_to_action_title: "Track my order", call_to_action_payload: "TRACK_ORDER" },
		{ call_to_action_title: "Help & support", call_to_action_payload: "SUPPORT" },
		{ call_to_action_title: "See latest offers", call_to_action_payload: "OFFERS" },
	],
});

// Retrieve the current profile
const { data } = await client.getProfile(["ice_breakers"]);
```

### 3.6 — Webhook listener

```ts
import { InstagramWebhookClient } from "whatsapp-business-sdk";

const webhook = new InstagramWebhookClient({
	token: process.env.IG_WEBHOOK_TOKEN!,
	appSecret: process.env.META_APP_SECRET!, // enables X-Hub-Signature-256 verification
	port: 3000,
	path: "/webhook/instagram",
});

webhook.initWebhook({
	onStartListening: () => console.log("Instagram webhook ready"),

	onMessageReceived: (messaging, message) => {
		console.log("DM from", messaging.sender.id);
	},

	onTextMessageReceived: (messaging, text) => {
		client.sendText(messaging.sender.id, `You said: ${text}`);
	},

	onAttachmentReceived: (messaging, attachments) => {
		// Fires for images, audio, video, and shared posts
		console.log("Got", attachments.length, "attachment(s)");
	},

	onStoryMentionReceived: (messaging, attachment) => {
		// User mentioned your account in their Story
		console.log("Story mention! CDN URL:", attachment.payload.cdnUrl);
		client.sendText(messaging.sender.id, "Thanks for the mention! 🙌");
	},

	onPostbackReceived: (messaging, postback) => {
		// Fires when a user taps an Ice Breaker or Persistent Menu item
		console.log("Postback:", postback.payload);
	},

	onReactionReceived: (messaging, reaction) => {
		console.log(reaction.action === "react" ? `Reacted ${reaction.emoji}` : "Unreacted");
	},

	onReadReceived: (messaging, read) => {
		console.log("Read receipt for mid:", read.mid);
	},

	onReferralReceived: (messaging, referral) => {
		console.log("Referral ref:", referral.ref);
	},

	onEchoReceived: (messaging, message) => {
		// Outbound message sent by your business account (is_echo: true)
		console.log("Sent echo:", message.text);
	},
});
```

---

## Webhook security — X-Hub-Signature-256

All three webhook clients support automatic payload signature verification. Provide your **App Secret** and every incoming POST is verified against the `X-Hub-Signature-256` header before your event handlers are called. A mismatch returns HTTP 403 immediately.

```ts
// Enable by passing appSecret to any webhook client constructor
const webhook = new WebhookClient({
	// or MessengerWebhookClient / InstagramWebhookClient
	token: "...",
	appSecret: process.env.META_APP_SECRET!, // ← triggers automatic verification
});
```

### Using your own Express app

When you manage Express yourself you need to capture the raw body **before** JSON parsing. Import `captureRawBody` and pass it to `express.json()`:

```ts
import express, { json } from "express";
import { MessengerWebhookClient, captureRawBody } from "whatsapp-business-sdk";

const app = express();
// captureRawBody must be registered BEFORE any other body-parser
app.use(json({ verify: captureRawBody }));

const webhook = new MessengerWebhookClient({
	token: process.env.MESSENGER_WEBHOOK_TOKEN!,
	appSecret: process.env.META_APP_SECRET!,
	path: "/webhook/messenger",
	expressApp: { app, shouldStartListening: false },
});

webhook.initWebhook({
	/* events */
});

app.listen(3000);
```

---

## Running multiple channels on the same Express server

You can share a single Express process across all three channels:

```ts
import express, { json } from "express";
import {
	WABAClient,
	WebhookClient,
	MessengerClient,
	MessengerWebhookClient,
	InstagramClient,
	InstagramWebhookClient,
	captureRawBody,
} from "whatsapp-business-sdk";

const app = express();
app.use(json({ verify: captureRawBody }));

const wabaClient = new WABAClient({
	apiToken: process.env.WA_TOKEN!,
	phoneId: "...",
	accountId: "...",
});
const messengerClient = new MessengerClient({ apiToken: process.env.PAGE_TOKEN!, pageId: "..." });
const igClient = new InstagramClient({ apiToken: process.env.PAGE_TOKEN!, igUserId: "..." });

const secret = process.env.META_APP_SECRET!;

new WebhookClient({
	token: process.env.WA_WEBHOOK_TOKEN!,
	appSecret: secret,
	path: "/webhook/whatsapp",
	expressApp: { app, shouldStartListening: false },
}).initWebhook({
	/* WA events */
});

new MessengerWebhookClient({
	token: process.env.MESSENGER_WEBHOOK_TOKEN!,
	appSecret: secret,
	path: "/webhook/messenger",
	expressApp: { app, shouldStartListening: false },
}).initWebhook({
	/* Messenger events */
});

new InstagramWebhookClient({
	token: process.env.IG_WEBHOOK_TOKEN!,
	appSecret: secret,
	path: "/webhook/instagram",
	expressApp: { app, shouldStartListening: false },
}).initWebhook({
	/* IG events */
});

app.listen(3000, () => console.log("All webhooks listening on :3000"));
```

> **Tip**: Meta requires all webhook endpoints to be reachable over **HTTPS**. For local development, use a tunnel like [ngrok](https://ngrok.com) or [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/).

---

## Error handling

All client methods throw on HTTP 4xx/5xx. Wrap calls in try/catch:

```ts
try {
	await client.sendText("USER_ID", "Hello!");
} catch (err) {
	// err is the raw error from Meta's Graph API
	console.error("Send failed:", err);
}
```

---

## Environment variables reference

```env
# WhatsApp Cloud API
WA_TOKEN=<system-user-access-token>
WA_PHONE_ID=<phone-number-id>
WA_ACCOUNT_ID=<waba-id>
WA_WEBHOOK_TOKEN=<your-chosen-verify-token>

# Messenger + Instagram (same Page Access Token)
PAGE_ACCESS_TOKEN=<page-access-token>
PAGE_ID=<facebook-page-id>

# Instagram
IG_USER_ID=<instagram-business-account-id>
IG_WEBHOOK_TOKEN=<your-chosen-verify-token>

# Messenger webhook verify token (can differ from IG)
MESSENGER_WEBHOOK_TOKEN=<your-chosen-verify-token>

# Shared — your Meta App Secret (for X-Hub-Signature-256 verification)
META_APP_SECRET=<app-secret>
```
