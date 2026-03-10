export type CallDirection = "BUSINESS_INITIATED" | "USER_INITIATED";

export type CallSdpSession = {
  /** `"offer"` for outbound (initiate/pre-accept/accept), `"answer"` for inbound (connect webhook). */
  sdp_type: "offer" | "answer";
  /** The SDP body, compliant with RFC 8866. */
  sdp: string;
};

// ─── Call action payloads (all POST /{phoneId}/calls) ────────────────────────

export type InitiateCallPayload = {
  messaging_product: "whatsapp";
  /** The callee's phone number. Either `to` or `recipient` (BSUID) must be provided. */
  to?: string;
  /**
   * The callee's BSUID or parent BSUID. Use instead of `to` when the phone number is
   * unavailable. If both are provided, `to` (phone number) takes precedence.
   */
  recipient?: string;
  action: "connect";
  session: CallSdpSession;
  /** Optional tracking string. Returned in the call terminate webhook. Max 512 chars. */
  biz_opaque_callback_data?: string;
};

export type RespondToCallPayload = {
  messaging_product: "whatsapp";
  /** The call ID received in the Call Connect webhook. */
  call_id: string;
  action: "pre_accept" | "accept";
  session: CallSdpSession;
  /** Optional tracking string. Max 512 chars. */
  biz_opaque_callback_data?: string;
};

export type RejectOrTerminateCallPayload = {
  messaging_product: "whatsapp";
  /** The call ID received in the Call Connect webhook. */
  call_id: string;
  action: "reject" | "terminate";
};

export type CallActionPayload =
  | InitiateCallPayload
  | RespondToCallPayload
  | RejectOrTerminateCallPayload;

export type InitiateCallResponse = {
  messaging_product: "whatsapp";
  calls: [{ id: string }];
};

export type CallActionResponse = {
  messaging_product: "whatsapp";
  success: boolean;
};

// ─── Call settings (GET/POST /{phoneId}/settings, nested under "calling") ────

export type CallHoursDay =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export type CallHoursScheduleEntry = {
  day_of_week: CallHoursDay;
  /** 24-hour format, e.g. `"0900"` = 9:00 AM. */
  open_time: string;
  /** 24-hour format, e.g. `"1800"` = 6:00 PM. */
  close_time: string;
};

export type CallHoursHolidayEntry = {
  /** Date in `YYYY-MM-DD` format. */
  date: string;
  /** 24-hour format, e.g. `"0000"`. */
  start_time: string;
  /** 24-hour format, e.g. `"2359"`. */
  end_time: string;
};

export type CallHours = {
  status: "ENABLED" | "DISABLED";
  /** IANA timezone identifier. Required when status is ENABLED. */
  timezone_id?: string;
  weekly_operating_hours?: CallHoursScheduleEntry[];
  /** Up to 20 holiday overrides. Omitting this field clears any existing schedule. */
  holiday_schedule?: CallHoursHolidayEntry[];
};

export type CallSipServer = {
  hostname: string;
  port?: number;
  request_uri_user_params?: Record<string, string>;
  /** Only returned when `include_sip_credentials=true` is passed on GET. */
  sip_user_password?: string;
};

export type CallSettingsPayload = {
  /** Enable or disable the Calling API for this phone number. */
  status?: "ENABLED" | "DISABLED";
  /** Whether the call button icon is visible in the WhatsApp chat UI. */
  call_icon_visibility?: "DEFAULT" | "DISABLE_ALL";
  call_hours?: CallHours;
  /** Show a callback permission prompt when a user calls your business. */
  callback_permission_status?: "ENABLED" | "DISABLED";
  sip?: {
    status: "ENABLED" | "DISABLED";
    servers?: CallSipServer[];
  };
};

export type UpdateCallSettingsPayload = {
  calling: CallSettingsPayload;
};

export type GetCallSettingsResponse = {
  calling: CallSettingsPayload;
};

// ─── Call permissions (GET /{phoneId}/call_permissions?user_wa_id=…) ─────────

export type CallPermissionLimit = {
  /** ISO 8601 duration, e.g. `"PT24H"`. */
  time_period: string;
  max_allowed: number;
  current_usage: number;
  /** Present when the current usage has reached max_allowed. Unix timestamp. */
  limit_expiration_time?: number;
};

export type CallPermissionAction = {
  action_name: "send_call_permission_request" | "start_call";
  can_perform_action: boolean;
  limits: CallPermissionLimit[];
};

export type GetCallPermissionsResponse = {
  messaging_product: "whatsapp";
  permission: {
    status: "no_permission" | "temporary" | "permanent";
    /** Unix timestamp when the permission expires. Present for temporary/permanent permissions. */
    expiration_time?: number;
  };
  actions: CallPermissionAction[];
};

// ─── Webhook types for "calls" field ─────────────────────────────────────────

export type WebhookCallConnect = {
  id: string;
  /** The callee's phone number. May be omitted if the user has enabled usernames. */
  to?: string;
  /** The callee's BSUID (business-initiated calls). */
  to_user_id?: string;
  /** The callee's parent BSUID, if parent BSUIDs are enabled (business-initiated calls). */
  to_parent_user_id?: string;
  /** The caller's phone number. May be omitted if the user has enabled usernames. */
  from?: string;
  /** The caller's BSUID (user-initiated calls). */
  from_user_id?: string;
  /** The caller's parent BSUID, if parent BSUIDs are enabled (user-initiated calls). */
  from_parent_user_id?: string;
  event: "connect";
  timestamp: string;
  direction: CallDirection;
  /** SDP answer from WhatsApp — apply to your WebRTC stack to establish media. */
  session?: CallSdpSession;
};

export type WebhookCallTerminate = {
  id: string;
  /** The callee's phone number. May be omitted if the user has enabled usernames. */
  to?: string;
  /** The callee's BSUID (business-initiated calls). */
  to_user_id?: string;
  /** The callee's parent BSUID, if parent BSUIDs are enabled (business-initiated calls). */
  to_parent_user_id?: string;
  /** The caller's phone number. May be omitted if the user has enabled usernames. */
  from?: string;
  /** The caller's BSUID (user-initiated calls). */
  from_user_id?: string;
  /** The caller's parent BSUID, if parent BSUIDs are enabled (user-initiated calls). */
  from_parent_user_id?: string;
  event: "terminate";
  timestamp: string;
  direction: CallDirection;
  status: "COMPLETED" | "FAILED";
  /** Unix timestamp when the call started. Only present when the call was answered. */
  start_time?: string;
  /** Unix timestamp when the call ended. Only present when the call was answered. */
  end_time?: string;
  /** Call duration in seconds. Only present when the call was answered. */
  duration?: number;
  biz_opaque_callback_data?: string;
};

/** Discriminated union for entries in the `calls` array of a calling webhook. */
export type WebhookCallEvent = WebhookCallConnect | WebhookCallTerminate;
