# WhatsApp Business SDK

Node.js SDK for the **WhatsApp Business Cloud API**, **Facebook Messenger**, and **Instagram Direct Messaging** — fully typed, tested, and documented.

Built with [`xior`](https://github.com/suhaotian/xior) for edge, Bun, and Deno compatibility. TypeScript types are bundled — no `@types/…` package needed.

## Installation

```bash
npm install @programytecnologia/whatsapp-business-sdk
pnpm add @programytecnologia/whatsapp-business-sdk
```

## Channels

| Channel                       | Client            | Webhook Client           |
| ----------------------------- | ----------------- | ------------------------ |
| WhatsApp Business (Cloud API) | `WABAClient`      | `WebhookClient`          |
| Facebook Messenger            | `MessengerClient` | `MessengerWebhookClient` |
| Instagram Direct              | `InstagramClient` | `InstagramWebhookClient` |

## Quick start

### WhatsApp

```ts
import { WABAClient, WABAErrorAPI } from "@programytecnologia/whatsapp-business-sdk";

const client = new WABAClient({
	apiToken: process.env.WA_TOKEN!,
	phoneId: process.env.WA_PHONE_ID!,
	accountId: process.env.WA_ACCOUNT_ID!,
});

// Send a text message
await client.sendMessage({
	to: "+16505551234",
	type: "text",
	text: { body: "Hello from WhatsApp!" },
});

// Send an image
await client.sendMessage({
	to: "+16505551234",
	type: "image",
	image: { link: "https://example.com/photo.jpg", caption: "Check this out" },
});
```

### WhatsApp webhooks

```ts
import { WebhookClient } from "@programytecnologia/whatsapp-business-sdk";

const webhookClient = new WebhookClient({
	token: process.env.WA_WEBHOOK_TOKEN!,
	appSecret: process.env.META_APP_SECRET!, // enables X-Hub-Signature-256 verification
	port: 3000,
	path: "/webhook/whatsapp",
});

webhookClient.initWebhook({
	onTextMessageReceived: async (message, contact) => {
		const sender = contact.wa_id ?? contact.user_id; // wa_id may be absent if user has a username
		await client.markMessageAsRead(message.id);
		await client.sendMessage({
			to: sender!,
			type: "text",
			text: { body: "Got your message!" },
		});
	},
	onStatusReceived: (status) => {
		console.log(status.status, "for", status.recipient_id ?? status.recipient_user_id);
	},
});
```

### Messenger

```ts
import { MessengerClient } from "@programytecnologia/whatsapp-business-sdk";

const client = new MessengerClient({
	apiToken: process.env.PAGE_ACCESS_TOKEN!,
	pageId: process.env.PAGE_ID!,
});

await client.sendText("USER_PSID", "Hello from your Page!");
```

### Instagram Direct

```ts
import { InstagramClient } from "@programytecnologia/whatsapp-business-sdk";

const client = new InstagramClient({
	apiToken: process.env.PAGE_ACCESS_TOKEN!,
	pageId: process.env.PAGE_ID!,
});

await client.sendText("USER_IGSID", "Hello from Instagram!");
```

## Features

**WhatsApp Business**

- Send text, image, audio, video, document, location, contacts, reactions, stickers, and templates
- Interactive messages: reply buttons, list messages, CTA URL, flows, catalog, `location_request_message`, `call_permission_request`, `request_contact_info`
- Media upload, download, and management
- Template management (create, update, delete, list)
- Business profile management
- Phone number management and verification
- Blocking / unblocking users (by phone number or BSUID)
- Marketing Messages API
- Calling API (outbound calls, SDP exchange, call settings)
- Business username CRUD (`getUsername`, `adoptUsername`, `getReservedUsernames`, `deleteUsername`)
- Full webhook support: messages, statuses, calls, echoes, history sync, state sync, template updates, account updates, `business_username_update`
- **BSUID support** — Business-Scoped User IDs rolling out from March 31, 2026

**Facebook Messenger**

- Send text, images, audio, video, files, templates, quick replies
- Sender actions (typing indicator, read receipts)
- Attachment Upload API (reusable media)
- Persona API
- Messenger Profile (Get Started, greeting, persistent menu)
- One-Time Notifications (OTN)
- Handover Protocol

**Instagram Direct**

- Send text, images, audio, video, files, templates, quick replies
- Sender actions
- Handover Protocol

## BSUID support

Starting **March 31, 2026**, WhatsApp delivers Business-Scoped User IDs alongside phone numbers in webhooks. Starting **May 2026**, BSUIDs can be used to send messages and calls directly.

All SDK types are backward compatible — `wa_id`, `from`, and `recipient_id` become optional; their BSUID counterparts (`user_id`, `from_user_id`, `recipient_user_id`) appear alongside them.

```ts
webhookClient.initWebhook({
	onMessageReceived: (message, contact) => {
		// phone number OR bsuid — whichever is present
		const sender = contact.wa_id ?? contact.user_id;
	},
});
```

See [docs/GUIDE.md](docs/GUIDE.md#113--business-scoped-user-ids-bsuids) for the full migration guide.

## Documentation

Full usage guide with examples for all three channels: [docs/GUIDE.md](docs/GUIDE.md)

## License

MIT
