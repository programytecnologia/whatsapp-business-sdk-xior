import fs from "node:fs";
import FormData from "form-data";
import type {
  AdoptUsernamePayload,
  AdoptUsernameResponse,
  BlockUsersPayload,
  BlockUsersResponse,
  BlockUserTarget,
  BusinessPhoneNumber,
  BusinessProfile,
  BusinessProfileFields,
  BusinessProfileFieldsQuery,
  CallActionPayload,
  CallActionResponse,
  CreateFlowPayload,
  CreateFlowResponse,
  CreateTemplatePayload,
  CreateTemplateResponse,
  DefaultResponse,
  DefaultWABAErrorAPI,
  DeleteTemplateResponse,
  DeleteUsernameResponse,
  Flow,
  GetAnalyticsParams,
  GetAnalyticsResponse,
  GetBlockedUsersResponse,
  GetBusinessPhoneNumberResponse,
  GetCallPermissionsResponse,
  GetCallSettingsResponse,
  GetConversationAnalyticsParams,
  GetConversationAnalyticsResponse,
  GetFlowAssetsResponse,
  GetMediaResponse,
  GetReservedUsernamesResponse,
  GetTemplatesParams,
  GetTemplatesResponse,
  GetUsernameResponse,
  HealthStatusResponse,
  InitiateCallPayload,
  InitiateCallResponse,
  ListFlowsResponse,
  MarkMessageAsReadPayload,
  Message,
  MigrateFlowsPayload,
  MigrateFlowsResponse,
  RegisterPhoneArgs,
  RegisterPhonePayload,
  RequestPhoneNumberVerificationCodeArgs,
  RequestPhoneNumberVerificationCodePayload,
  SendMarketingMessagePayload,
  SendMessageResponse,
  SetUpTwoFactorAuthArgs,
  SmbAppDataSyncType,
  TypingIndicatorPayload,
  UnblockUsersResponse,
  UpdateBusinessProfilePayload,
  UpdateCallSettingsPayload,
  UpdateFlowMetadataPayload,
  UpdateIdentityCheckState,
  UpdateTemplatePayload,
  UploadMediaPayload,
  UploadMediaResponse,
  VerifyPhoneNumberArgs,
} from "./types";
import { WABAErrorHandler } from "./utils/errorHandler";
import { createRestClient } from "./utils/restClient";

interface WABAClientArgs {
  apiToken: string;
  phoneId: string;
  accountId: string;
}

/**
 * Connector for the Whatsapp Cloud API.
 *
 * documentation: https://developers.facebook.com/docs/whatsapp/cloud-api/guides
 */
export class WABAClient {
  restClient: ReturnType<typeof createRestClient>;
  phoneId: string;
  accountId: string;

  constructor({ apiToken, phoneId, accountId }: WABAClientArgs) {
    this.phoneId = phoneId;
    this.accountId = accountId;
    this.restClient = createRestClient({
      apiToken,
      baseURL: "https://graph.facebook.com/v25.0",
      errorHandler: (error) =>
        WABAErrorHandler((error?.response?.data || error) as DefaultWABAErrorAPI),
    });
  }

  /*
   *
   *BUSINESS PROFILE ENDPOINTS (https://developers.facebook.com/docs/whatsapp/cloud-api/reference/business-profiles)
   */
  /**
   *
   * Retrieves your business profile. Customers can view your business profile by clicking your business's name or number in a conversation thread.
   *
   * @param fields you can specify which data you want to get from your business. If not passed, defaults to all fields.
   */
  getBusinessProfile(fields?: BusinessProfileFieldsQuery) {
    return this.restClient.get<BusinessProfile>(
      `${this.phoneId}/whatsapp_business_profile`,
      undefined,
      {
        params: {
          fields:
            fields?.join(",") ||
            "about,address,description,email,profile_picture_url,websites,vertical",
        },
      },
    );
  }
  /**
   * @param payload provide the fields that you wish to update.
   */
  updateBusinessProfile(payload: UpdateBusinessProfilePayload) {
    return this.restClient.post<DefaultResponse, Partial<BusinessProfileFields>>(
      `${this.phoneId}/whatsapp_business_profile`,
      {
        ...payload,
        messaging_product: "whatsapp",
      },
    );
  }
  /*
   *
   * MEDIA ENDPOINTS (https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media)
   *
   */
  /**
   * All media files sent through this endpoint are encrypted and persist for 30 days, unless they are deleted earlier.
   *
   * A successful response returns an object with the uploaded media's ID.
   */
  uploadMedia({ file, type }: Omit<UploadMediaPayload, "messaging_product">) {
    const formData = new FormData();
    formData.append("type", type);
    formData.append("file", fs.createReadStream(file));
    formData.append("messaging_product", "whatsapp");
    return this.restClient.post<UploadMediaResponse, FormData>(`${this.phoneId}/media`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  }
  /**
   * Retrieves your media’s URL. Use the returned URL to download the media file. Note that clicking this URL (i.e. performing a generic GET) will not return the media; you must include an access token.
   *
   * A successful response includes an object with a media url. The URL is only valid for 5 minutes.
   */
  getMedia(mediaId: string) {
    return this.restClient.get<GetMediaResponse>(mediaId);
  }
  deleteMedia(mediaId: string) {
    return this.restClient.delete<DefaultResponse>(mediaId);
  }
  /**
   * @param mediaUrl your media’s URL
   * @param pathToSaveFile the path where you want to store the media
   */
  async downloadMedia(mediaUrl: string, pathToSaveFile: string) {
    try {
      const response = await this.restClient.get<import("node:stream").Readable>(
        mediaUrl,
        undefined,
        { baseURL: "", responseType: "stream" },
      );
      return response.pipe(fs.createWriteStream(pathToSaveFile));
    } catch (err) {
      return Promise.reject(err);
    }
  }
  /*
   *
   * MESSAGES ENDPOINTS (https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages)
   *
   */

  /**
   * Yu can use the API to send the following free-form messages types:
   * 	Text
   *	Reaction
   * 	Media
   * 	Location
   * 	Contacts
   * 	Interactive
   * 	Address
   * 	messages
   * 	template
   *
   * For more information refer here: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages
   *
   * If you are working with template messages refer here: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates
   *
   */
  async sendMessage(payload: Omit<Message, "messaging_product">) {
    return this.restClient.post<SendMessageResponse, Message>(`${this.phoneId}/messages`, {
      ...payload,
      messaging_product: "whatsapp",
    });
  }
  /**
   * When you receive an incoming message from Webhooks,
   * you can use the /messages endpoint to mark the message as
   * read by changing its status to read. Messages marked as read display two blue check marks alongside their timestamp.
   */
  async markMessageAsRead(message_id: string) {
    return this.restClient.post<DefaultResponse, MarkMessageAsReadPayload>(
      `${this.phoneId}/messages`,
      {
        messaging_product: "whatsapp",
        status: "read",
        message_id,
      },
    );
  }
  /**
   * Displays a typing indicator to the WhatsApp user while you prepare a response.
   * Also marks the message as read. The indicator is dismissed once you respond or after 25 seconds.
   *
   * @param message_id the ID of the received message (from the messages webhook)
   */
  async sendTypingIndicator(message_id: string) {
    return this.restClient.post<DefaultResponse, TypingIndicatorPayload>(
      `${this.phoneId}/messages`,
      {
        messaging_product: "whatsapp",
        status: "read",
        message_id,
        typing_indicator: { type: "text" },
      },
    );
  }
  /*
   *
   *	PHONE NUMBERS ENDPOINTS (https://developers.facebook.com/docs/whatsapp/cloud-api/reference/phone-numbers)
   *
   */
  async getBusinessPhoneNumbers() {
    return this.restClient.get<GetBusinessPhoneNumberResponse>(`${this.accountId}/phone_numbers`);
  }
  async getSingleBusinessPhoneNumber(phoneNumberId: string) {
    return this.restClient.get<BusinessPhoneNumber>(phoneNumberId);
  }
  /**
   * You may want us to verify a customer's identity before we deliver your message to them.
   * You can have us do this by enabling the identity change check setting on your business phone number.
   */
  async updateIdentityCheckState({ enable_identity_key_check }: UpdateIdentityCheckState) {
    return this.restClient.post<DefaultResponse>(`${this.phoneId}/settings`, {
      user_identity_change: {
        enable_identity_key_check,
      },
    });
  }
  async requestPhoneNumberVerificationCode({
    phoneNumberId,
    ...payload
  }: RequestPhoneNumberVerificationCodeArgs) {
    return this.restClient.post<DefaultResponse, RequestPhoneNumberVerificationCodePayload>(
      `${phoneNumberId}/request_code`,
      payload,
    );
  }
  async verifyPhoneNumberCode({ phoneNumberId, ...payload }: VerifyPhoneNumberArgs) {
    return this.restClient.post<DefaultResponse>(`/${phoneNumberId}/verify_code`, payload);
  }
  async registerPhone({ phoneNumberId, ...payload }: RegisterPhoneArgs) {
    return this.restClient.post<DefaultResponse, RegisterPhonePayload>(
      `${phoneNumberId}/register`,
      { messaging_product: "whatsapp", ...payload },
    );
  }
  async deregisterPhone(phoneNumber: string) {
    return this.restClient.post<DefaultResponse>(`${phoneNumber}/deregister`);
  }
  /*
   *
   *	BLOCK USERS ENDPOINTS (https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-phone-number/block-api)
   *
   */
  /**
   * Blocks one or more users from sending messages to your business phone number.
   *
   * Each entry is either a phone number (`{ user: "+16505551234" }`) or
   * a BSUID (`{ user_id: "US.13491208655302741918" }`).
   */
  async blockUsers(users: BlockUserTarget[]) {
    return this.restClient.post<BlockUsersResponse, BlockUsersPayload>(
      `${this.phoneId}/block_users`,
      {
        messaging_product: "whatsapp",
        block_users: users,
      },
    );
  }
  /**
   * Unblocks one or more previously blocked users.
   *
   * Each entry is either a phone number (`{ user: "+16505551234" }`) or
   * a BSUID (`{ user_id: "US.13491208655302741918" }`).
   */
  async unblockUsers(users: BlockUserTarget[]) {
    return this.restClient.delete<UnblockUsersResponse>(`${this.phoneId}/block_users`, undefined, {
      data: {
        messaging_product: "whatsapp",
        block_users: users,
      },
    });
  }
  /**
   * Retrieves the list of users blocked by your business phone number.
   */
  async getBlockedUsers() {
    return this.restClient.get<GetBlockedUsersResponse>(`${this.phoneId}/block_users`);
  }
  async setupTwoStepAuth({ phoneNumberId, ...payload }: SetUpTwoFactorAuthArgs) {
    return this.restClient.post<DefaultResponse>(phoneNumberId, payload);
  }
  /*
   *
   *	TEMPLATE ENDPOINTS (https://developers.facebook.com/documentation/business-messaging/whatsapp/reference/whatsapp-business-account/template-api)
   *
   */
  /**
   * Retrieves the message templates for a WhatsApp Business Account.
   */
  async getTemplates(params?: GetTemplatesParams) {
    return this.restClient.get<GetTemplatesResponse>(
      `${this.accountId}/message_templates`,
      undefined,
      {
        params,
      },
    );
  }
  /**
   * Creates a new message template.
   */
  async createTemplate(payload: CreateTemplatePayload) {
    return this.restClient.post<CreateTemplateResponse, CreateTemplatePayload>(
      `${this.accountId}/message_templates`,
      payload,
    );
  }
  /**
   * Updates an existing message template by template ID.
   *
   * @param templateId - The ID of the template to update.
   */
  async updateTemplate(templateId: string, payload: UpdateTemplatePayload) {
    return this.restClient.post<CreateTemplateResponse, UpdateTemplatePayload>(templateId, payload);
  }
  /**
   * Deletes a message template by name.
   *
   * @param name - The name of the template to delete.
   */
  async deleteTemplate(name: string) {
    return this.restClient.delete<DeleteTemplateResponse>(
      `${this.accountId}/message_templates`,
      undefined,
      { params: { name } },
    );
  }
  /*
   *
   *	HEALTH ENDPOINTS (https://developers.facebook.com/docs/whatsapp/cloud-api/health-status)
   *
   */
  /**
   *
   * @param nodeId is optional, defaults to the account_id
   */
  async getHealthStatus(_nodeId?: string) {
    return this.restClient.get<HealthStatusResponse>(`${this.accountId}?fields=health_status`);
  }
  /*
   *
   *	CALLING API ENDPOINTS (https://developers.facebook.com/documentation/business-messaging/whatsapp/calling/reference)
   *
   */
  /**
   * Initiates an outbound call to a WhatsApp user.
   *
   * Provide an SDP offer in `session`. Listen for the Call Connect webhook to receive
   * the SDP answer, then call `preAcceptCall()` or `acceptCall()`.
   */
  async initiateCall(payload: Omit<InitiateCallPayload, "action">) {
    return this.restClient.post<InitiateCallResponse, InitiateCallPayload>(
      `${this.phoneId}/calls`,
      { ...payload, action: "connect" },
    );
  }
  /**
   * Pre-accepts an inbound call, establishing the WebRTC media connection before
   * fully accepting. Recommended to reduce audio clipping at call start.
   *
   * @param callId - The call ID received in the Call Connect webhook.
   */
  async preAcceptCall(callId: string, session: InitiateCallPayload["session"]) {
    return this.restClient.post<CallActionResponse, CallActionPayload>(`${this.phoneId}/calls`, {
      messaging_product: "whatsapp",
      call_id: callId,
      action: "pre_accept",
      session,
    });
  }
  /**
   * Accepts an inbound call and begins flowing call media.
   *
   * @param callId - The call ID received in the Call Connect webhook.
   */
  async acceptCall(
    callId: string,
    session: InitiateCallPayload["session"],
    bizOpaqueCallbackData?: string,
  ) {
    return this.restClient.post<CallActionResponse, CallActionPayload>(`${this.phoneId}/calls`, {
      messaging_product: "whatsapp",
      call_id: callId,
      action: "accept",
      session,
      ...(bizOpaqueCallbackData && { biz_opaque_callback_data: bizOpaqueCallbackData }),
    });
  }
  /**
   * Rejects an inbound call.
   *
   * @param callId - The call ID received in the Call Connect webhook.
   */
  async rejectCall(callId: string) {
    return this.restClient.post<CallActionResponse, CallActionPayload>(`${this.phoneId}/calls`, {
      messaging_product: "whatsapp",
      call_id: callId,
      action: "reject",
    });
  }
  /**
   * Terminates an active call. Must be called even if an `RTCP BYE` packet is present
   * in the media path. A Call Terminate webhook will be sent on success.
   *
   * @param callId - The call ID to terminate.
   */
  async terminateCall(callId: string) {
    return this.restClient.post<CallActionResponse, CallActionPayload>(`${this.phoneId}/calls`, {
      messaging_product: "whatsapp",
      call_id: callId,
      action: "terminate",
    });
  }
  /**
   * Retrieves Calling API settings for the business phone number.
   */
  async getCallSettings() {
    return this.restClient.get<GetCallSettingsResponse>(`${this.phoneId}/settings`);
  }
  /**
   * Configures Calling API settings (status, call hours, icon visibility, etc.).
   */
  async updateCallSettings(payload: UpdateCallSettingsPayload) {
    return this.restClient.post<{ success: boolean }, UpdateCallSettingsPayload>(
      `${this.phoneId}/settings`,
      payload,
    );
  }
  /**
   * Returns the current call permission state for a specific WhatsApp user,
   * including whether your business can initiate a call or send a permission request.
   *
   * @param target - The user's phone number (string, backward-compatible), or an object
   *   with `userWaId` (phone number) or `recipient` (BSUID / parent BSUID).
   */
  async getCallPermissions(target: string | { userWaId?: string; recipient?: string }) {
    const params =
      typeof target === "string"
        ? { user_wa_id: target }
        : {
            ...(target.userWaId && { user_wa_id: target.userWaId }),
            ...(target.recipient && { recipient: target.recipient }),
          };
    return this.restClient.get<GetCallPermissionsResponse>(
      `${this.phoneId}/call_permissions`,
      undefined,
      { params },
    );
  }
  /*
   *
   *	MARKETING MESSAGES API ENDPOINT (https://developers.facebook.com/documentation/business-messaging/whatsapp/marketing-messages/send-marketing-messages)
   *
   */
  /**
   * Sends a marketing template message via the Marketing Messages API.
   *
   * Only marketing template messages are supported. To receive incoming messages on the same
   * phone number, continue using Cloud API in parallel.
   *
   * Status webhooks for messages sent via this endpoint will include `pricing.category: "marketing_lite"`
   * (vs `"marketing"` for the Cloud API path).
   */
  async sendMarketingMessage(payload: SendMarketingMessagePayload) {
    return this.restClient.post<SendMessageResponse, SendMarketingMessagePayload>(
      `${this.phoneId}/marketing_messages`,
      payload,
    );
  }

  /**
   * Initiates synchronization of WhatsApp Business app data (contacts or message history).
   *
   * - `"smb_app_state_sync"`: synchronizes the business customer's WhatsApp contacts.
   *   Triggers one or more `smb_app_state_sync` webhooks.
   * - `"history"`: synchronizes the business customer's message history (up to 180 days).
   *   Triggers one or more `history` webhooks, or an error webhook if the business declined sharing.
   *
   * Must be called after the business completes Coexistence Embedded Signup onboarding.
   * The response includes a `request_id` for support reference.
   *
   * POST /{phone_number_id}/smb_app_data
   */
  async syncSmbAppData(syncType: SmbAppDataSyncType) {
    return this.restClient.post<DefaultResponse>(`${this.phoneId}/smb_app_data`, {
      messaging_product: "whatsapp",
      sync_type: syncType,
    });
  }

  /*
   *
   *	FLOWS API ENDPOINTS (https://developers.facebook.com/docs/whatsapp/flows/reference/flowsapi)
   *
   */

  /** Retrieve all Flows belonging to this WhatsApp Business Account. */
  listFlows() {
    return this.restClient.get<ListFlowsResponse>(`${this.accountId}/flows`);
  }

  /** Create a new Flow. */
  createFlow(payload: CreateFlowPayload) {
    return this.restClient.post<CreateFlowResponse, CreateFlowPayload>(
      `${this.accountId}/flows`,
      payload,
    );
  }

  /**
   * Retrieve details for a specific Flow.
   *
   * @param flowId - The Flow ID.
   * @param fields - Optional comma-separated fields to retrieve
   *   (e.g. "id,name,status,categories,validation_errors,json_version,data_api_version,endpoint_uri,preview,health_status").
   */
  getFlow(flowId: string, fields?: string) {
    return this.restClient.get<Flow>(flowId, undefined, {
      params: fields ? { fields } : undefined,
    });
  }

  /** Update a Flow's name or categories. */
  updateFlowMetadata(flowId: string, payload: UpdateFlowMetadataPayload) {
    return this.restClient.post<{ success: boolean }, UpdateFlowMetadataPayload>(flowId, payload);
  }

  /**
   * Upload or replace the Flow JSON for a Draft Flow.
   *
   * @param flowId - The Flow ID.
   * @param formData - A `FormData` instance with fields `file` (the JSON buffer),
   *   `name` ("flow.json"), and `asset_type` ("FLOW_JSON").
   */
  updateFlowJson(flowId: string, formData: FormData) {
    return this.restClient.post<CreateFlowResponse, FormData>(`${flowId}/assets`, formData, {
      headers: formData.getHeaders(),
    });
  }

  /** Retrieve the downloadable assets (e.g. Flow JSON) for a Flow. */
  getFlowAssets(flowId: string) {
    return this.restClient.get<GetFlowAssetsResponse>(`${flowId}/assets`);
  }

  /**
   * Retrieve a preview URL for a Flow.
   *
   * @param flowId - The Flow ID.
   * @param invalidate - When `true`, generates a fresh preview URL (default false).
   */
  getFlowPreview(flowId: string, invalidate = false) {
    return this.restClient.get<Flow>(flowId, undefined, {
      params: { fields: `preview.invalidate(${invalidate})` },
    });
  }

  /** Publish a Draft Flow, making it available for use in messages. */
  publishFlow(flowId: string) {
    return this.restClient.post<{ success: boolean }>(`${flowId}/publish`);
  }

  /** Deprecate a Published Flow. Deprecated Flows can no longer initiate new sessions. */
  deprecateFlow(flowId: string) {
    return this.restClient.post<{ success: boolean }>(`${flowId}/deprecate`);
  }

  /** Permanently delete a Draft Flow. Published/Deprecated Flows must be deprecated first. */
  deleteFlow(flowId: string) {
    return this.restClient.delete<{ success: boolean }>(flowId);
  }

  /**
   * Migrate Flows from another WABA to this account.
   *
   * @param destinationWabaId - The WABA to migrate flows into.
   * @param payload - `{ source_waba_id, source_flow_names }`.
   */
  migrateFlows(destinationWabaId: string, payload: MigrateFlowsPayload) {
    return this.restClient.post<MigrateFlowsResponse, MigrateFlowsPayload>(
      `${destinationWabaId}/migrate_flows`,
      payload,
    );
  }

  /*
   *
   *	ANALYTICS ENDPOINTS (https://developers.facebook.com/docs/whatsapp/business-management-api/analytics)
   *
   */

  /**
   * Retrieve message-level analytics (sent / delivered counts) for this WABA.
   *
   * @param params - Query parameters including `start`, `end`, `granularity`, etc.
   */
  getMessageAnalytics(params: GetAnalyticsParams) {
    return this.restClient.get<GetAnalyticsResponse>(`${this.accountId}`, undefined, {
      params: { fields: "analytics", ...params },
    });
  }

  /**
   * Retrieve conversation-level analytics (count and cost per conversation type) for this WABA.
   *
   * @param params - Query parameters including `start`, `end`, `granularity`, etc.
   */
  getConversationAnalytics(params: GetConversationAnalyticsParams) {
    return this.restClient.get<GetConversationAnalyticsResponse>(`${this.accountId}`, undefined, {
      params: { fields: "conversation_analytics", ...params },
    });
  }

  /*
   *
   *	BUSINESS USERNAME ENDPOINTS (https://developers.facebook.com/documentation/business-messaging/whatsapp/business-scoped-user-ids/)
   *
   */

  /**
   * Get the current business username for a phone number.
   *
   * GET /{phoneId}/username
   */
  getUsername(phoneNumberId?: string) {
    return this.restClient.get<GetUsernameResponse>(`${phoneNumberId ?? this.phoneId}/username`);
  }

  /**
   * Adopt or change the business username for a phone number.
   * The response status will be `"approved"` or `"reserved"` depending on
   * whether usernames are available in the business's country yet.
   *
   * POST /{phoneId}/username
   */
  adoptUsername(username: string, phoneNumberId?: string) {
    return this.restClient.post<AdoptUsernameResponse, AdoptUsernamePayload>(
      `${phoneNumberId ?? this.phoneId}/username`,
      { username },
    );
  }

  /**
   * Get the list of usernames reserved for this phone number's business portfolio.
   * Call `adoptUsername` with one of the returned suggestions to claim it.
   *
   * GET /{phoneId}/username_suggestions
   */
  getReservedUsernames(phoneNumberId?: string) {
    return this.restClient.get<GetReservedUsernamesResponse>(
      `${phoneNumberId ?? this.phoneId}/username_suggestions`,
    );
  }

  /**
   * Delete the business username associated with a phone number.
   *
   * DELETE /{phoneId}/username
   */
  deleteUsername(phoneNumberId?: string) {
    return this.restClient.delete<DeleteUsernameResponse>(
      `${phoneNumberId ?? this.phoneId}/username`,
    );
  }
}
