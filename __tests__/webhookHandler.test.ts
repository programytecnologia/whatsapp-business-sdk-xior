import type {
  Webhook,
  WebhookAccountAlert,
  WebhookAccountReviewUpdate,
  WebhookAccountUpdate,
  WebhookBusinessCapabilityUpdate,
  WebhookCallConnect,
  WebhookCallTerminate,
  WebhookEvents,
  WebhookFlow,
  WebhookHistory,
  WebhookMessageEcho,
  WebhookPhoneNumberNameUpdate,
  WebhookPhoneNumberQualityUpdate,
  WebhookSecurity,
  WebhookStateSync,
  WebhookStatus,
  WebhookTemplateCategoryUpdate,
  WebhookTemplateQualityUpdate,
  WebhookTemplateStatusUpdate,
} from "../src/types/webhooks";
import { webhookHandler } from "../src/webhooks/helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const metadata = { display_phone_number: "15550783881", phone_number_id: "106540352242922" };

/** Build a minimal Webhook body, merging extra fields into `value`. */
const makeBody = (valueOverrides: Record<string, unknown>): Webhook => ({
  object: "whatsapp_business_account",
  entry: [
    {
      id: "waba-id",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata,
            contacts: [],
            ...valueOverrides,
          },
        },
      ],
    },
  ],
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const callConnect: WebhookCallConnect = {
  id: "call-1",
  to: "15550783881",
  from: "16505551234",
  event: "connect",
  timestamp: "1739321000",
  direction: "USER_INITIATED",
  session: { sdp_type: "answer", sdp: "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\n" },
};

const callTerminate: WebhookCallTerminate = {
  id: "call-1",
  to: "15550783881",
  from: "16505551234",
  event: "terminate",
  timestamp: "1739321099",
  direction: "USER_INITIATED",
  status: "COMPLETED",
  start_time: "1739321001",
  end_time: "1739321099",
  duration: 98,
};

const callTerminateFailed: WebhookCallTerminate = {
  id: "call-2",
  to: "15550783881",
  from: "16505551234",
  event: "terminate",
  timestamp: "1739321010",
  direction: "BUSINESS_INITIATED",
  status: "FAILED",
};

const baseStatus: WebhookStatus = {
  id: "msg-id",
  biz_opaque_callback_data: "",
  pricing: { category: "service", pricing_model: "CBP" },
  conversation: {
    id: "conv-1",
    origin: { type: "service" },
    expiration_timestamp: "",
  },
  recipient_id: "16505551234",
  timestamp: "1739321024",
  errors: [],
  status: "sent",
};

const messageEcho: WebhookMessageEcho = {
  from: "15550783881",
  to: "16505551234",
  id: "wamid.echo1",
  timestamp: "1739321024",
  type: "text",
  text: { body: "Hello from the WBA app" },
};

const stateSyncAdd: WebhookStateSync = {
  type: "contact",
  contact: { full_name: "Pablo Morales", first_name: "Pablo", phone_number: "16505551234" },
  action: "add",
  metadata: { timestamp: "1738346006" },
};

const stateSyncRemove: WebhookStateSync = {
  type: "contact",
  contact: { phone_number: "16505551234" },
  action: "remove",
  metadata: { timestamp: "1738346100" },
};

const historyChunk: WebhookHistory = {
  metadata: { phase: 0, chunk_order: 1, progress: 55 },
  threads: [
    {
      id: "16505551234",
      messages: [
        {
          from: "15550783881",
          id: "wamid.hist1",
          timestamp: "1738796547",
          type: "text",
          text: { body: "Historic message" },
        },
      ],
    },
  ],
};

const historyDeclined: WebhookHistory = {
  errors: [
    {
      // 2593109 is the real API code for "history sharing turned off" — not yet in our enum
      // biome-ignore lint/suspicious/noExplicitAny: intentional out-of-enum code
      code: 2593109 as any,
      title: "History sync is turned off by the business from the WhatsApp Business App",
      message: "History sync is turned off by the business from the WhatsApp Business App",
      error_data: { details: "History sharing is turned off by the business" },
    },
  ],
};

const accountUpdatePartnerRemoved: WebhookAccountUpdate = {
  phone_number: "15550783881",
  event: "PARTNER_REMOVED",
};

const accountUpdateOffboarded: WebhookAccountUpdate = { event: "ACCOUNT_OFFBOARDED" };
const accountUpdateReconnected: WebhookAccountUpdate = { event: "ACCOUNT_RECONNECTED" };

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("webhookHandler — new features", () => {
  let events: Omit<WebhookEvents, "onStartListening">;

  beforeEach(() => {
    events = {
      onError: jest.fn(),
      onMessageReceived: jest.fn(),
      onStatusReceived: jest.fn(),
      onTextMessageReceived: jest.fn(),
      onCallConnected: jest.fn(),
      onCallTerminated: jest.fn(),
      onMessageEcho: jest.fn(),
      onAccountUpdate: jest.fn(),
      onHistorySync: jest.fn(),
      onStateSync: jest.fn(),
      onTemplateStatusUpdate: jest.fn(),
      onTemplateQualityUpdate: jest.fn(),
      onTemplateCategoryUpdate: jest.fn(),
      onPhoneNumberQualityUpdate: jest.fn(),
      onPhoneNumberNameUpdate: jest.fn(),
      onFlowUpdate: jest.fn(),
      onSecurityAlert: jest.fn(),
      onBusinessCapabilityUpdate: jest.fn(),
      onAccountReviewUpdate: jest.fn(),
      onAccountAlert: jest.fn(),
    };
  });

  // ─── calls webhook field ──────────────────────────────────────────────────

  describe("calls webhook field", () => {
    it("fires onCallConnected for a connect event", () => {
      webhookHandler(makeBody({ calls: [callConnect] }), events);

      expect(events.onCallConnected).toHaveBeenCalledTimes(1);
      expect(events.onCallConnected).toHaveBeenCalledWith(callConnect, metadata);
      expect(events.onCallTerminated).not.toHaveBeenCalled();
    });

    it("fires onCallTerminated for a terminate event (COMPLETED)", () => {
      webhookHandler(makeBody({ calls: [callTerminate] }), events);

      expect(events.onCallTerminated).toHaveBeenCalledTimes(1);
      expect(events.onCallTerminated).toHaveBeenCalledWith(callTerminate, metadata);
      expect(events.onCallConnected).not.toHaveBeenCalled();
    });

    it("fires onCallTerminated for a failed terminate event (no duration/timestamps)", () => {
      webhookHandler(makeBody({ calls: [callTerminateFailed] }), events);

      expect(events.onCallTerminated).toHaveBeenCalledWith(
        expect.objectContaining({ status: "FAILED", id: "call-2" }),
        metadata,
      );
    });

    it("dispatches mixed connect + terminate events in one calls array", () => {
      const terminateExtra: WebhookCallTerminate = { ...callTerminate, id: "call-3" };
      webhookHandler(makeBody({ calls: [callConnect, callTerminate, terminateExtra] }), events);

      expect(events.onCallConnected).toHaveBeenCalledTimes(1);
      expect(events.onCallTerminated).toHaveBeenCalledTimes(2);
    });

    it("does not fire call events when calls array is empty", () => {
      webhookHandler(makeBody({ calls: [] }), events);

      expect(events.onCallConnected).not.toHaveBeenCalled();
      expect(events.onCallTerminated).not.toHaveBeenCalled();
    });

    it("does not fire call events when calls field is absent", () => {
      webhookHandler(makeBody({}), events);

      expect(events.onCallConnected).not.toHaveBeenCalled();
      expect(events.onCallTerminated).not.toHaveBeenCalled();
    });

    it("silently ignores unknown call event types without throwing", () => {
      const unknownEvent = { ...callConnect, event: "future_unknown_event" } as unknown;
      expect(() => webhookHandler(makeBody({ calls: [unknownEvent] }), events)).not.toThrow();
      expect(events.onCallConnected).not.toHaveBeenCalled();
      expect(events.onCallTerminated).not.toHaveBeenCalled();
    });

    it("does not throw when onCallConnected / onCallTerminated are not registered", () => {
      const { onCallConnected: _a, onCallTerminated: _b, ...rest } = events;
      expect(() =>
        webhookHandler(makeBody({ calls: [callConnect, callTerminate] }), rest),
      ).not.toThrow();
    });

    it("passes the correct metadata for call connect events", () => {
      webhookHandler(makeBody({ calls: [callConnect] }), events);

      const [, receivedMeta] = (events.onCallConnected as jest.Mock).mock.calls[0];
      expect(receivedMeta).toEqual(metadata);
    });

    it("includes SDP session in the call connect payload", () => {
      webhookHandler(makeBody({ calls: [callConnect] }), events);

      expect(events.onCallConnected).toHaveBeenCalledWith(
        expect.objectContaining({
          session: expect.objectContaining({ sdp_type: "answer" }),
        }),
        metadata,
      );
    });

    it("connect event without a session does not throw", () => {
      const connectNoSdp: WebhookCallConnect = { ...callConnect, session: undefined };
      expect(() => webhookHandler(makeBody({ calls: [connectNoSdp] }), events)).not.toThrow();
    });
  });

  // ─── call status webhooks (RINGING / ACCEPTED / REJECTED in statuses) ─────

  describe("call status webhooks", () => {
    it("fires onStatusReceived with status=RINGING and type=call", () => {
      const ringing: WebhookStatus = { ...baseStatus, status: "RINGING", type: "call" };
      webhookHandler(makeBody({ statuses: [ringing] }), events);

      expect(events.onStatusReceived).toHaveBeenCalledWith(ringing, metadata);
    });

    it("fires onStatusReceived with status=ACCEPTED", () => {
      const accepted: WebhookStatus = { ...baseStatus, status: "ACCEPTED", type: "call" };
      webhookHandler(makeBody({ statuses: [accepted] }), events);

      expect(events.onStatusReceived).toHaveBeenCalledWith(accepted, metadata);
    });

    it("fires onStatusReceived with status=REJECTED", () => {
      const rejected: WebhookStatus = { ...baseStatus, status: "REJECTED", type: "call" };
      webhookHandler(makeBody({ statuses: [rejected] }), events);

      expect(events.onStatusReceived).toHaveBeenCalledWith(rejected, metadata);
    });

    it("handles multiple call statuses in one webhook", () => {
      const ringing: WebhookStatus = { ...baseStatus, status: "RINGING", type: "call" };
      const accepted: WebhookStatus = { ...baseStatus, status: "ACCEPTED", type: "call" };
      webhookHandler(makeBody({ statuses: [ringing, accepted] }), events);

      expect(events.onStatusReceived).toHaveBeenCalledTimes(2);
    });
  });

  // ─── smb_message_echoes ───────────────────────────────────────────────────

  describe("smb_message_echoes (message_echoes field)", () => {
    it("fires onMessageEcho for a single echo", () => {
      webhookHandler(makeBody({ message_echoes: [messageEcho] }), events);

      expect(events.onMessageEcho).toHaveBeenCalledTimes(1);
      expect(events.onMessageEcho).toHaveBeenCalledWith(messageEcho, metadata);
    });

    it("fires onMessageEcho once per echo when multiple are present", () => {
      const echo2: WebhookMessageEcho = { ...messageEcho, id: "wamid.echo2", type: "image" };
      webhookHandler(makeBody({ message_echoes: [messageEcho, echo2] }), events);

      expect(events.onMessageEcho).toHaveBeenCalledTimes(2);
      expect(events.onMessageEcho).toHaveBeenNthCalledWith(1, messageEcho, metadata);
      expect(events.onMessageEcho).toHaveBeenNthCalledWith(2, echo2, metadata);
    });

    it("does not fire onMessageEcho when message_echoes is empty", () => {
      webhookHandler(makeBody({ message_echoes: [] }), events);

      expect(events.onMessageEcho).not.toHaveBeenCalled();
    });

    it("does not fire onMessageEcho when field is absent", () => {
      webhookHandler(makeBody({}), events);

      expect(events.onMessageEcho).not.toHaveBeenCalled();
    });

    it("does not throw when onMessageEcho handler is not registered", () => {
      const { onMessageEcho: _, ...rest } = events;
      expect(() => webhookHandler(makeBody({ message_echoes: [messageEcho] }), rest)).not.toThrow();
    });

    it("echo includes from/to/type fields", () => {
      webhookHandler(makeBody({ message_echoes: [messageEcho] }), events);

      expect(events.onMessageEcho).toHaveBeenCalledWith(
        expect.objectContaining({ from: "15550783881", to: "16505551234", type: "text" }),
        metadata,
      );
    });

    it("passes arbitrary extra fields on the echo (open shape)", () => {
      const echoWithExtra: WebhookMessageEcho = {
        ...messageEcho,
        someNewField: "future_api_field",
      };
      webhookHandler(makeBody({ message_echoes: [echoWithExtra] }), events);

      expect(events.onMessageEcho).toHaveBeenCalledWith(
        expect.objectContaining({ someNewField: "future_api_field" }),
        metadata,
      );
    });
  });

  // ─── smb_app_state_sync (state_sync field) ────────────────────────────────

  describe("smb_app_state_sync (state_sync field)", () => {
    it("fires onStateSync for an add event", () => {
      webhookHandler(makeBody({ state_sync: [stateSyncAdd] }), events);

      expect(events.onStateSync).toHaveBeenCalledTimes(1);
      expect(events.onStateSync).toHaveBeenCalledWith(stateSyncAdd, metadata);
    });

    it("fires onStateSync for a remove event", () => {
      webhookHandler(makeBody({ state_sync: [stateSyncRemove] }), events);

      expect(events.onStateSync).toHaveBeenCalledWith(stateSyncRemove, metadata);
    });

    it("fires onStateSync for each sync item when multiple are present", () => {
      webhookHandler(makeBody({ state_sync: [stateSyncAdd, stateSyncRemove] }), events);

      expect(events.onStateSync).toHaveBeenCalledTimes(2);
    });

    it("does not fire onStateSync when state_sync array is empty", () => {
      webhookHandler(makeBody({ state_sync: [] }), events);

      expect(events.onStateSync).not.toHaveBeenCalled();
    });

    it("does not fire onStateSync when field is absent", () => {
      webhookHandler(makeBody({}), events);

      expect(events.onStateSync).not.toHaveBeenCalled();
    });

    it("does not throw when onStateSync handler is not registered", () => {
      const { onStateSync: _, ...rest } = events;
      expect(() => webhookHandler(makeBody({ state_sync: [stateSyncAdd] }), rest)).not.toThrow();
    });

    it("remove event omits optional name fields from contact", () => {
      webhookHandler(makeBody({ state_sync: [stateSyncRemove] }), events);

      expect(events.onStateSync).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "remove",
          contact: expect.objectContaining({ phone_number: "16505551234" }),
        }),
        metadata,
      );
      const [syncArg] = (events.onStateSync as jest.Mock).mock.calls[0];
      expect(syncArg.contact).not.toHaveProperty("full_name");
    });

    it("add event includes full_name and first_name", () => {
      webhookHandler(makeBody({ state_sync: [stateSyncAdd] }), events);

      expect(events.onStateSync).toHaveBeenCalledWith(
        expect.objectContaining({
          contact: expect.objectContaining({
            full_name: "Pablo Morales",
            first_name: "Pablo",
          }),
        }),
        metadata,
      );
    });
  });

  // ─── history ─────────────────────────────────────────────────────────────

  describe("history events", () => {
    it("fires onHistorySync for a history chunk", () => {
      webhookHandler(makeBody({ history: [historyChunk] }), events);

      expect(events.onHistorySync).toHaveBeenCalledTimes(1);
      expect(events.onHistorySync).toHaveBeenCalledWith(historyChunk, metadata);
    });

    it("fires onHistorySync for the declined-sharing error payload", () => {
      webhookHandler(makeBody({ history: [historyDeclined] }), events);

      expect(events.onHistorySync).toHaveBeenCalledWith(historyDeclined, metadata);
    });

    it("fires onHistorySync once per chunk when multiple are present", () => {
      const chunk2: WebhookHistory = {
        metadata: { phase: 1, chunk_order: 1, progress: 80 },
        threads: [],
      };
      webhookHandler(makeBody({ history: [historyChunk, chunk2] }), events);

      expect(events.onHistorySync).toHaveBeenCalledTimes(2);
    });

    it("does not fire onHistorySync when history array is empty", () => {
      webhookHandler(makeBody({ history: [] }), events);

      expect(events.onHistorySync).not.toHaveBeenCalled();
    });

    it("does not fire onHistorySync when field is absent", () => {
      webhookHandler(makeBody({}), events);

      expect(events.onHistorySync).not.toHaveBeenCalled();
    });

    it("does not throw when onHistorySync handler is not registered", () => {
      const { onHistorySync: _, ...rest } = events;
      expect(() => webhookHandler(makeBody({ history: [historyChunk] }), rest)).not.toThrow();
    });

    it("passes phase/chunk_order/progress metadata correctly", () => {
      webhookHandler(makeBody({ history: [historyChunk] }), events);

      expect(events.onHistorySync).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { phase: 0, chunk_order: 1, progress: 55 } }),
        metadata,
      );
    });

    it("passes 100 progress when sync is fully complete", () => {
      const finalChunk: WebhookHistory = {
        metadata: { phase: 2, chunk_order: 3, progress: 100 },
        threads: [],
      };
      webhookHandler(makeBody({ history: [finalChunk] }), events);

      expect(events.onHistorySync).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: expect.objectContaining({ progress: 100 }) }),
        metadata,
      );
    });

    it("error payload includes error code 2593109 for declined sharing", () => {
      webhookHandler(makeBody({ history: [historyDeclined] }), events);

      const [historyArg] = (events.onHistorySync as jest.Mock).mock.calls[0];
      expect(historyArg.errors?.[0]?.code).toBe(2593109);
    });
  });

  // ─── account_update ───────────────────────────────────────────────────────

  describe("account_update events", () => {
    it("fires onAccountUpdate for PARTNER_REMOVED", () => {
      webhookHandler(makeBody({ account_update: accountUpdatePartnerRemoved }), events);

      expect(events.onAccountUpdate).toHaveBeenCalledTimes(1);
      expect(events.onAccountUpdate).toHaveBeenCalledWith(accountUpdatePartnerRemoved);
    });

    it("fires onAccountUpdate for ACCOUNT_OFFBOARDED", () => {
      webhookHandler(makeBody({ account_update: accountUpdateOffboarded }), events);

      expect(events.onAccountUpdate).toHaveBeenCalledWith(accountUpdateOffboarded);
    });

    it("fires onAccountUpdate for ACCOUNT_RECONNECTED", () => {
      webhookHandler(makeBody({ account_update: accountUpdateReconnected }), events);

      expect(events.onAccountUpdate).toHaveBeenCalledWith(accountUpdateReconnected);
    });

    it("does not fire onAccountUpdate when field is absent", () => {
      webhookHandler(makeBody({}), events);

      expect(events.onAccountUpdate).not.toHaveBeenCalled();
    });

    it("onAccountUpdate is called with only one argument (no metadata)", () => {
      webhookHandler(makeBody({ account_update: accountUpdatePartnerRemoved }), events);

      const callArgs = (events.onAccountUpdate as jest.Mock).mock.calls[0];
      expect(callArgs).toHaveLength(1);
    });

    it("PARTNER_REMOVED includes phone_number field", () => {
      webhookHandler(makeBody({ account_update: accountUpdatePartnerRemoved }), events);

      expect(events.onAccountUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ phone_number: "15550783881", event: "PARTNER_REMOVED" }),
      );
    });

    it("ACCOUNT_OFFBOARDED payload omits phone_number", () => {
      webhookHandler(makeBody({ account_update: accountUpdateOffboarded }), events);

      const [arg] = (events.onAccountUpdate as jest.Mock).mock.calls[0];
      expect(arg).not.toHaveProperty("phone_number");
    });

    it("does not throw when onAccountUpdate is not registered", () => {
      const { onAccountUpdate: _, ...rest } = events;
      expect(() =>
        webhookHandler(makeBody({ account_update: accountUpdatePartnerRemoved }), rest),
      ).not.toThrow();
    });
  });

  // ─── multiple entries / changes fan-out ───────────────────────────────────

  describe("fan-out across multiple entries and changes", () => {
    it("processes changes from all entries", () => {
      const body: Webhook = {
        object: "whatsapp_business_account",
        // The Webhook type uses a single-element tuple; cast for multi-entry test
        entry: [
          {
            id: "waba-1",
            changes: [
              {
                field: "smb_message_echoes",
                value: {
                  messaging_product: "whatsapp",
                  metadata,
                  contacts: [],
                  message_echoes: [messageEcho],
                },
              },
            ],
          },
          {
            id: "waba-2",
            changes: [
              {
                field: "account_update",
                value: {
                  messaging_product: "whatsapp",
                  metadata,
                  contacts: [],
                  account_update: accountUpdatePartnerRemoved,
                },
              },
            ],
          },
          // biome-ignore lint/suspicious/noExplicitAny: entry array contains non-union field strings
        ] as any,
      };

      webhookHandler(body, events);

      expect(events.onMessageEcho).toHaveBeenCalledTimes(1);
      expect(events.onAccountUpdate).toHaveBeenCalledTimes(1);
    });

    it("processes multiple changes within a single entry", () => {
      const body: Webhook = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "waba-1",
            changes: [
              {
                field: "smb_message_echoes",
                value: {
                  messaging_product: "whatsapp",
                  metadata,
                  contacts: [],
                  message_echoes: [messageEcho],
                },
              },
              {
                field: "smb_app_state_sync",
                value: {
                  messaging_product: "whatsapp",
                  metadata,
                  contacts: [],
                  state_sync: [stateSyncAdd],
                },
              },
              {
                field: "history",
                value: {
                  messaging_product: "whatsapp",
                  metadata,
                  contacts: [],
                  history: [historyChunk],
                },
              },
            ],
          },
        ],
      };

      webhookHandler(body, events);

      expect(events.onMessageEcho).toHaveBeenCalledTimes(1);
      expect(events.onStateSync).toHaveBeenCalledTimes(1);
      expect(events.onHistorySync).toHaveBeenCalledTimes(1);
    });

    it("a change with multiple coexistence field types fires all relevant handlers", () => {
      // A single change value can theoretically carry multiple fields
      webhookHandler(
        makeBody({
          message_echoes: [messageEcho],
          state_sync: [stateSyncAdd],
          account_update: accountUpdateOffboarded,
        }),
        events,
      );

      expect(events.onMessageEcho).toHaveBeenCalledTimes(1);
      expect(events.onStateSync).toHaveBeenCalledTimes(1);
      expect(events.onAccountUpdate).toHaveBeenCalledTimes(1);
    });
  });

  // ─── event isolation (no cross-contamination) ─────────────────────────────

  describe("event isolation", () => {
    it("call events do not trigger regular message/status events", () => {
      webhookHandler(makeBody({ calls: [callConnect] }), events);

      expect(events.onMessageReceived).not.toHaveBeenCalled();
      expect(events.onTextMessageReceived).not.toHaveBeenCalled();
      expect(events.onStatusReceived).not.toHaveBeenCalled();
    });

    it("message echo events do not trigger regular message events", () => {
      webhookHandler(makeBody({ message_echoes: [messageEcho] }), events);

      expect(events.onMessageReceived).not.toHaveBeenCalled();
      expect(events.onTextMessageReceived).not.toHaveBeenCalled();
    });

    it("account_update does not trigger error events", () => {
      webhookHandler(makeBody({ account_update: accountUpdatePartnerRemoved }), events);

      expect(events.onError).not.toHaveBeenCalled();
    });

    it("history events do not trigger error events even when errors are in the payload", () => {
      // The errors in history are part of the history item, not the change-level errors array
      webhookHandler(makeBody({ history: [historyDeclined] }), events);

      expect(events.onError).not.toHaveBeenCalled();
    });

    it("state sync events do not trigger message events", () => {
      webhookHandler(makeBody({ state_sync: [stateSyncAdd] }), events);

      expect(events.onMessageReceived).not.toHaveBeenCalled();
      expect(events.onTextMessageReceived).not.toHaveBeenCalled();
    });

    it("regular message events still fire alongside coexistence events in the same change", () => {
      const textMessage = {
        from: "16505551234",
        id: "wamid.msg1",
        timestamp: "1739321000",
        type: "text" as const,
        text: { body: "Hi" },
      };
      const contact = { wa_id: "16505551234", profile: { name: "Test User" } };

      webhookHandler(
        makeBody({
          contacts: [contact],
          messages: [textMessage],
          message_echoes: [messageEcho],
        }),
        events,
      );

      expect(events.onMessageReceived).toHaveBeenCalledTimes(1);
      expect(events.onTextMessageReceived).toHaveBeenCalledTimes(1);
      expect(events.onMessageEcho).toHaveBeenCalledTimes(1);
    });
  });

  // ─── robustness / null-safety ─────────────────────────────────────────────

  describe("robustness", () => {
    it("does not throw when all new event handlers are omitted", () => {
      const minimalEvents: Omit<WebhookEvents, "onStartListening"> = {
        onMessageReceived: jest.fn(),
      };
      expect(() =>
        webhookHandler(
          makeBody({
            calls: [callConnect],
            message_echoes: [messageEcho],
            state_sync: [stateSyncAdd],
            history: [historyChunk],
            account_update: accountUpdatePartnerRemoved,
          }),
          minimalEvents,
        ),
      ).not.toThrow();
    });

    it("handles an empty entry list without throwing", () => {
      // biome-ignore lint/suspicious/noExplicitAny: empty array for robustness test
      const body: Webhook = { object: "whatsapp_business_account", entry: [] as any };
      expect(() => webhookHandler(body, events)).not.toThrow();
    });

    it("handles a change with no value fields gracefully", () => {
      const body: Webhook = {
        object: "whatsapp_business_account",
        entry: [
          {
            id: "waba-1",
            changes: [
              {
                field: "messages",
                value: {
                  messaging_product: "whatsapp",
                  metadata,
                  contacts: [],
                },
              },
            ],
          },
        ],
      };
      expect(() => webhookHandler(body, events)).not.toThrow();
      expect(events.onCallConnected).not.toHaveBeenCalled();
      expect(events.onMessageEcho).not.toHaveBeenCalled();
      expect(events.onAccountUpdate).not.toHaveBeenCalled();
      expect(events.onHistorySync).not.toHaveBeenCalled();
      expect(events.onStateSync).not.toHaveBeenCalled();
    });

    it("does not throw when all admin event handlers are omitted and admin webhooks arrive", () => {
      const minimalEvents: Omit<WebhookEvents, "onStartListening"> = {};
      const adminFields = [
        [
          "message_template_status_update",
          {
            message_template_id: 1,
            message_template_name: "t",
            message_template_language: "en_US",
            event: "APPROVED",
          },
        ],
        [
          "message_template_quality_update",
          {
            message_template_id: 1,
            message_template_name: "t",
            previous_quality_score: "GREEN",
            new_quality_score: "YELLOW",
          },
        ],
        [
          "message_template_category_update",
          {
            message_template_id: 1,
            message_template_name: "t",
            previous_category: "MARKETING",
            new_category: "UTILITY",
          },
        ],
        [
          "phone_number_quality_update",
          { display_phone_number: "+1555", event: "QUALITY_RATING_CHANGED" },
        ],
        [
          "phone_number_name_update",
          {
            display_phone_number: "+1555",
            phone_number: "+1555",
            requested_verified_name: "Acme",
            decision: "APPROVED",
          },
        ],
        ["flows", { flow_id: "f1", event: "PUBLISHED" }],
        ["security", { event: "TWO_STEP_VERIFICATION_DISABLED" }],
        ["business_capability_update", { max_daily_conversation_per_phone: 1000 }],
        ["account_review_update", { decision: "APPROVED" }],
        ["account_alerts", { type: "FLAGGED", details: "Policy violation" }],
      ] as const;

      for (const [field, value] of adminFields) {
        const body = {
          object: "whatsapp_business_account",
          entry: [{ id: "w", changes: [{ field, value }] }],
        } as unknown as Webhook;
        expect(() => webhookHandler(body, minimalEvents)).not.toThrow();
      }
    });
  });

  // ─── message_template_status_update ────────────────────────────────

  describe("message_template_status_update field", () => {
    const approved: WebhookTemplateStatusUpdate = {
      message_template_id: 594434972594070,
      message_template_name: "order_confirmation",
      message_template_language: "en_US",
      event: "APPROVED",
    };

    const rejected: WebhookTemplateStatusUpdate = {
      message_template_id: 594434972594071,
      message_template_name: "promo_summer",
      message_template_language: "es_ES",
      event: "REJECTED",
      reason: "INVALID_FORMAT",
    };

    const makeTemplateStatusBody = (value: WebhookTemplateStatusUpdate) =>
      ({
        object: "whatsapp_business_account",
        entry: [{ id: "w", changes: [{ field: "message_template_status_update", value }] }],
      }) as unknown as Webhook;

    it("fires onTemplateStatusUpdate with the correct payload for APPROVED", () => {
      webhookHandler(makeTemplateStatusBody(approved), events);

      expect(events.onTemplateStatusUpdate).toHaveBeenCalledTimes(1);
      expect(events.onTemplateStatusUpdate).toHaveBeenCalledWith(approved);
    });

    it("fires onTemplateStatusUpdate for REJECTED and includes reason", () => {
      webhookHandler(makeTemplateStatusBody(rejected), events);

      expect(events.onTemplateStatusUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ event: "REJECTED", reason: "INVALID_FORMAT" }),
      );
    });

    it("does not fire messaging events (onMessageReceived, onStatusReceived, etc.)", () => {
      webhookHandler(makeTemplateStatusBody(approved), events);

      expect(events.onMessageReceived).not.toHaveBeenCalled();
      expect(events.onStatusReceived).not.toHaveBeenCalled();
      expect(events.onAccountUpdate).not.toHaveBeenCalled();
    });

    it("does not throw when onTemplateStatusUpdate is not registered", () => {
      const { onTemplateStatusUpdate: _, ...rest } = events;
      expect(() => webhookHandler(makeTemplateStatusBody(approved), rest)).not.toThrow();
    });

    it("payload includes template id, name, and language", () => {
      webhookHandler(makeTemplateStatusBody(approved), events);

      expect(events.onTemplateStatusUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          message_template_id: 594434972594070,
          message_template_name: "order_confirmation",
          message_template_language: "en_US",
        }),
      );
    });
  });

  // ─── message_template_quality_update ─────────────────────────────

  describe("message_template_quality_update field", () => {
    const qualityUpdate: WebhookTemplateQualityUpdate = {
      message_template_id: 123456789,
      message_template_name: "order_confirmation",
      previous_quality_score: "GREEN",
      new_quality_score: "YELLOW",
    };

    const makeBody2 = (value: WebhookTemplateQualityUpdate) =>
      ({
        object: "whatsapp_business_account",
        entry: [{ id: "w", changes: [{ field: "message_template_quality_update", value }] }],
      }) as unknown as Webhook;

    it("fires onTemplateQualityUpdate with the correct payload", () => {
      webhookHandler(makeBody2(qualityUpdate), events);

      expect(events.onTemplateQualityUpdate).toHaveBeenCalledTimes(1);
      expect(events.onTemplateQualityUpdate).toHaveBeenCalledWith(qualityUpdate);
    });

    it("reports GREEN -> RED downgrade correctly", () => {
      const severe: WebhookTemplateQualityUpdate = {
        ...qualityUpdate,
        previous_quality_score: "GREEN",
        new_quality_score: "RED",
      };
      webhookHandler(makeBody2(severe), events);

      expect(events.onTemplateQualityUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          previous_quality_score: "GREEN",
          new_quality_score: "RED",
        }),
      );
    });

    it("does not fire messaging events", () => {
      webhookHandler(makeBody2(qualityUpdate), events);

      expect(events.onMessageReceived).not.toHaveBeenCalled();
      expect(events.onTemplateStatusUpdate).not.toHaveBeenCalled();
    });

    it("does not throw when onTemplateQualityUpdate is not registered", () => {
      const { onTemplateQualityUpdate: _, ...rest } = events;
      expect(() => webhookHandler(makeBody2(qualityUpdate), rest)).not.toThrow();
    });
  });

  // ─── message_template_category_update ────────────────────────────

  describe("message_template_category_update field", () => {
    const categoryUpdate: WebhookTemplateCategoryUpdate = {
      message_template_id: 987654321,
      message_template_name: "promo_summer",
      previous_category: "MARKETING",
      new_category: "UTILITY",
    };

    const makeBody3 = (value: WebhookTemplateCategoryUpdate) =>
      ({
        object: "whatsapp_business_account",
        entry: [{ id: "w", changes: [{ field: "message_template_category_update", value }] }],
      }) as unknown as Webhook;

    it("fires onTemplateCategoryUpdate with the correct payload", () => {
      webhookHandler(makeBody3(categoryUpdate), events);

      expect(events.onTemplateCategoryUpdate).toHaveBeenCalledTimes(1);
      expect(events.onTemplateCategoryUpdate).toHaveBeenCalledWith(categoryUpdate);
    });

    it("payload includes previous and new category", () => {
      webhookHandler(makeBody3(categoryUpdate), events);

      expect(events.onTemplateCategoryUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ previous_category: "MARKETING", new_category: "UTILITY" }),
      );
    });

    it("does not fire messaging events", () => {
      webhookHandler(makeBody3(categoryUpdate), events);

      expect(events.onMessageReceived).not.toHaveBeenCalled();
      expect(events.onTemplateStatusUpdate).not.toHaveBeenCalled();
      expect(events.onTemplateQualityUpdate).not.toHaveBeenCalled();
    });

    it("does not throw when onTemplateCategoryUpdate is not registered", () => {
      const { onTemplateCategoryUpdate: _, ...rest } = events;
      expect(() => webhookHandler(makeBody3(categoryUpdate), rest)).not.toThrow();
    });
  });

  // ─── phone_number_quality_update ───────────────────────────────────

  describe("phone_number_quality_update field", () => {
    const qualityChanged: WebhookPhoneNumberQualityUpdate = {
      display_phone_number: "+1 555-078-3881",
      event: "QUALITY_RATING_CHANGED",
      current_limit: "TIER_1K",
    };

    const qualityRestored: WebhookPhoneNumberQualityUpdate = {
      display_phone_number: "+1 555-078-3881",
      event: "QUALITY_RATING_RESTORED",
    };

    const makeBody4 = (value: WebhookPhoneNumberQualityUpdate) =>
      ({
        object: "whatsapp_business_account",
        entry: [{ id: "w", changes: [{ field: "phone_number_quality_update", value }] }],
      }) as unknown as Webhook;

    it("fires onPhoneNumberQualityUpdate for QUALITY_RATING_CHANGED", () => {
      webhookHandler(makeBody4(qualityChanged), events);

      expect(events.onPhoneNumberQualityUpdate).toHaveBeenCalledTimes(1);
      expect(events.onPhoneNumberQualityUpdate).toHaveBeenCalledWith(qualityChanged);
    });

    it("fires onPhoneNumberQualityUpdate for QUALITY_RATING_RESTORED (no current_limit)", () => {
      webhookHandler(makeBody4(qualityRestored), events);

      expect(events.onPhoneNumberQualityUpdate).toHaveBeenCalledWith(qualityRestored);
      const [arg] = (events.onPhoneNumberQualityUpdate as jest.Mock).mock.calls[0];
      expect(arg).not.toHaveProperty("current_limit");
    });

    it("payload includes display_phone_number and current_limit tier", () => {
      webhookHandler(makeBody4(qualityChanged), events);

      expect(events.onPhoneNumberQualityUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          display_phone_number: "+1 555-078-3881",
          current_limit: "TIER_1K",
        }),
      );
    });

    it("does not fire messaging events", () => {
      webhookHandler(makeBody4(qualityChanged), events);

      expect(events.onMessageReceived).not.toHaveBeenCalled();
      expect(events.onAccountUpdate).not.toHaveBeenCalled();
    });

    it("does not throw when onPhoneNumberQualityUpdate is not registered", () => {
      const { onPhoneNumberQualityUpdate: _, ...rest } = events;
      expect(() => webhookHandler(makeBody4(qualityChanged), rest)).not.toThrow();
    });
  });

  // ─── phone_number_name_update ──────────────────────────────────────

  describe("phone_number_name_update field", () => {
    const nameApproved: WebhookPhoneNumberNameUpdate = {
      display_phone_number: "+1 555-078-3881",
      phone_number: "+15550783881",
      requested_verified_name: "Acme Corp",
      decision: "APPROVED",
    };

    const nameDeclined: WebhookPhoneNumberNameUpdate = {
      display_phone_number: "+1 555-078-3881",
      phone_number: "+15550783881",
      requested_verified_name: "Acme Corp™",
      rejection_reason: "INVALID_FORMAT",
      decision: "DECLINED",
    };

    const makeBody5 = (value: WebhookPhoneNumberNameUpdate) =>
      ({
        object: "whatsapp_business_account",
        entry: [{ id: "w", changes: [{ field: "phone_number_name_update", value }] }],
      }) as unknown as Webhook;

    it("fires onPhoneNumberNameUpdate for APPROVED decision", () => {
      webhookHandler(makeBody5(nameApproved), events);

      expect(events.onPhoneNumberNameUpdate).toHaveBeenCalledTimes(1);
      expect(events.onPhoneNumberNameUpdate).toHaveBeenCalledWith(nameApproved);
    });

    it("fires onPhoneNumberNameUpdate for DECLINED decision and includes rejection_reason", () => {
      webhookHandler(makeBody5(nameDeclined), events);

      expect(events.onPhoneNumberNameUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          decision: "DECLINED",
          rejection_reason: "INVALID_FORMAT",
        }),
      );
    });

    it("APPROVED payload omits rejection_reason", () => {
      webhookHandler(makeBody5(nameApproved), events);

      const [arg] = (events.onPhoneNumberNameUpdate as jest.Mock).mock.calls[0];
      expect(arg).not.toHaveProperty("rejection_reason");
    });

    it("does not fire messaging events", () => {
      webhookHandler(makeBody5(nameApproved), events);

      expect(events.onMessageReceived).not.toHaveBeenCalled();
    });

    it("does not throw when onPhoneNumberNameUpdate is not registered", () => {
      const { onPhoneNumberNameUpdate: _, ...rest } = events;
      expect(() => webhookHandler(makeBody5(nameApproved), rest)).not.toThrow();
    });
  });

  // ─── flows ────────────────────────────────────────────────────────

  describe("flows field", () => {
    const flowPublished: WebhookFlow = { flow_id: "flow-10001", event: "PUBLISHED" };
    const flowEndpointError: WebhookFlow = {
      flow_id: "flow-10002",
      event: "ENDPOINT_NOT_CONFIGURED",
    };
    const flowBlocked: WebhookFlow = { flow_id: "flow-10003", event: "BLOCKED" };

    const makeBody6 = (value: WebhookFlow) =>
      ({
        object: "whatsapp_business_account",
        entry: [{ id: "w", changes: [{ field: "flows", value }] }],
      }) as unknown as Webhook;

    it("fires onFlowUpdate for PUBLISHED", () => {
      webhookHandler(makeBody6(flowPublished), events);

      expect(events.onFlowUpdate).toHaveBeenCalledTimes(1);
      expect(events.onFlowUpdate).toHaveBeenCalledWith(flowPublished);
    });

    it("fires onFlowUpdate for ENDPOINT_NOT_CONFIGURED", () => {
      webhookHandler(makeBody6(flowEndpointError), events);

      expect(events.onFlowUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ flow_id: "flow-10002", event: "ENDPOINT_NOT_CONFIGURED" }),
      );
    });

    it("fires onFlowUpdate for BLOCKED", () => {
      webhookHandler(makeBody6(flowBlocked), events);

      expect(events.onFlowUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ event: "BLOCKED" }),
      );
    });

    it("does not fire messaging events", () => {
      webhookHandler(makeBody6(flowPublished), events);

      expect(events.onMessageReceived).not.toHaveBeenCalled();
      expect(events.onAccountUpdate).not.toHaveBeenCalled();
    });

    it("does not throw when onFlowUpdate is not registered", () => {
      const { onFlowUpdate: _, ...rest } = events;
      expect(() => webhookHandler(makeBody6(flowPublished), rest)).not.toThrow();
    });
  });

  // ─── security ──────────────────────────────────────────────────

  describe("security field", () => {
    const twoStepDisabled = {
      event: "TWO_STEP_VERIFICATION_DISABLED",
    } satisfies WebhookSecurity;

    const makeBody7 = (value: WebhookSecurity) =>
      ({
        object: "whatsapp_business_account",
        entry: [{ id: "w", changes: [{ field: "security", value }] }],
      }) as unknown as Webhook;

    it("fires onSecurityAlert for TWO_STEP_VERIFICATION_DISABLED", () => {
      webhookHandler(makeBody7(twoStepDisabled), events);

      expect(events.onSecurityAlert).toHaveBeenCalledTimes(1);
      expect(events.onSecurityAlert).toHaveBeenCalledWith(twoStepDisabled);
    });

    it("payload includes the event field", () => {
      webhookHandler(makeBody7(twoStepDisabled), events);

      expect(events.onSecurityAlert).toHaveBeenCalledWith(
        expect.objectContaining({ event: "TWO_STEP_VERIFICATION_DISABLED" }),
      );
    });

    it("does not fire messaging events", () => {
      webhookHandler(makeBody7(twoStepDisabled), events);

      expect(events.onMessageReceived).not.toHaveBeenCalled();
      expect(events.onAccountUpdate).not.toHaveBeenCalled();
    });

    it("does not throw when onSecurityAlert is not registered", () => {
      const { onSecurityAlert: _, ...rest } = events;
      expect(() => webhookHandler(makeBody7(twoStepDisabled), rest)).not.toThrow();
    });
  });

  // ─── business_capability_update ────────────────────────────────────

  describe("business_capability_update field", () => {
    const tierUpgrade: WebhookBusinessCapabilityUpdate = {
      max_daily_conversation_per_phone: 10000,
      current_limit: "TIER_10K",
    };

    const limitExpanded: WebhookBusinessCapabilityUpdate = {
      max_phone_numbers_per_business: 20,
      max_phone_numbers_per_waba: 10,
    };

    const makeBody8 = (value: WebhookBusinessCapabilityUpdate) =>
      ({
        object: "whatsapp_business_account",
        entry: [{ id: "w", changes: [{ field: "business_capability_update", value }] }],
      }) as unknown as Webhook;

    it("fires onBusinessCapabilityUpdate with tier upgrade payload", () => {
      webhookHandler(makeBody8(tierUpgrade), events);

      expect(events.onBusinessCapabilityUpdate).toHaveBeenCalledTimes(1);
      expect(events.onBusinessCapabilityUpdate).toHaveBeenCalledWith(tierUpgrade);
    });

    it("fires onBusinessCapabilityUpdate with phone number limits payload", () => {
      webhookHandler(makeBody8(limitExpanded), events);

      expect(events.onBusinessCapabilityUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ max_phone_numbers_per_business: 20 }),
      );
    });

    it("payload includes current_limit tier", () => {
      webhookHandler(makeBody8(tierUpgrade), events);

      expect(events.onBusinessCapabilityUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ current_limit: "TIER_10K" }),
      );
    });

    it("does not fire messaging events", () => {
      webhookHandler(makeBody8(tierUpgrade), events);

      expect(events.onMessageReceived).not.toHaveBeenCalled();
    });

    it("does not throw when onBusinessCapabilityUpdate is not registered", () => {
      const { onBusinessCapabilityUpdate: _, ...rest } = events;
      expect(() => webhookHandler(makeBody8(tierUpgrade), rest)).not.toThrow();
    });
  });

  // ─── account_review_update ──────────────────────────────────────────

  describe("account_review_update field", () => {
    const reviewApproved: WebhookAccountReviewUpdate = { decision: "APPROVED" };
    const reviewRejected: WebhookAccountReviewUpdate = { decision: "REJECTED" };

    const makeBody9 = (value: WebhookAccountReviewUpdate) =>
      ({
        object: "whatsapp_business_account",
        entry: [{ id: "w", changes: [{ field: "account_review_update", value }] }],
      }) as unknown as Webhook;

    it("fires onAccountReviewUpdate for APPROVED", () => {
      webhookHandler(makeBody9(reviewApproved), events);

      expect(events.onAccountReviewUpdate).toHaveBeenCalledTimes(1);
      expect(events.onAccountReviewUpdate).toHaveBeenCalledWith(reviewApproved);
    });

    it("fires onAccountReviewUpdate for REJECTED", () => {
      webhookHandler(makeBody9(reviewRejected), events);

      expect(events.onAccountReviewUpdate).toHaveBeenCalledWith({ decision: "REJECTED" });
    });

    it("does not fire messaging events", () => {
      webhookHandler(makeBody9(reviewApproved), events);

      expect(events.onMessageReceived).not.toHaveBeenCalled();
      expect(events.onAccountUpdate).not.toHaveBeenCalled();
    });

    it("does not throw when onAccountReviewUpdate is not registered", () => {
      const { onAccountReviewUpdate: _, ...rest } = events;
      expect(() => webhookHandler(makeBody9(reviewApproved), rest)).not.toThrow();
    });
  });

  // ─── account_alerts ─────────────────────────────────────────────

  describe("account_alerts field", () => {
    const flaggedAlert: WebhookAccountAlert = {
      type: "FLAGGED",
      details: "Your account has been flagged for policy violations.",
    };

    const restrictedAlert: WebhookAccountAlert = {
      type: "RESTRICTED",
      details: "Messaging has been restricted due to low quality rating.",
    };

    const makeBody10 = (value: WebhookAccountAlert) =>
      ({
        object: "whatsapp_business_account",
        entry: [{ id: "w", changes: [{ field: "account_alerts", value }] }],
      }) as unknown as Webhook;

    it("fires onAccountAlert for FLAGGED type", () => {
      webhookHandler(makeBody10(flaggedAlert), events);

      expect(events.onAccountAlert).toHaveBeenCalledTimes(1);
      expect(events.onAccountAlert).toHaveBeenCalledWith(flaggedAlert);
    });

    it("fires onAccountAlert for RESTRICTED type", () => {
      webhookHandler(makeBody10(restrictedAlert), events);

      expect(events.onAccountAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "RESTRICTED",
          details: expect.stringContaining("restricted"),
        }),
      );
    });

    it("payload includes type and details", () => {
      webhookHandler(makeBody10(flaggedAlert), events);

      expect(events.onAccountAlert).toHaveBeenCalledWith(
        expect.objectContaining({ type: "FLAGGED", details: expect.any(String) }),
      );
    });

    it("does not fire messaging events", () => {
      webhookHandler(makeBody10(flaggedAlert), events);

      expect(events.onMessageReceived).not.toHaveBeenCalled();
      expect(events.onAccountUpdate).not.toHaveBeenCalled();
    });

    it("does not throw when onAccountAlert is not registered", () => {
      const { onAccountAlert: _, ...rest } = events;
      expect(() => webhookHandler(makeBody10(flaggedAlert), rest)).not.toThrow();
    });

    it("does not fire onAccountUpdate for account_alerts (different field)", () => {
      webhookHandler(makeBody10(flaggedAlert), events);

      expect(events.onAccountUpdate).not.toHaveBeenCalled();
    });
  });
});
