// WhatsApp Flows API types
// Reference: https://developers.facebook.com/docs/whatsapp/flows/reference/flowsapi

export type FlowStatus = "DRAFT" | "PUBLISHED" | "DEPRECATED";

export type FlowCategory =
  | "SIGN_UP"
  | "SIGN_IN"
  | "APPOINTMENT_BOOKING"
  | "LEAD_GENERATION"
  | "CONTACT_US"
  | "CUSTOMER_SUPPORT"
  | "SURVEY"
  | "OTHER";

export interface FlowValidationError {
  error: string;
  error_type: string;
  message: string;
  line_start: number;
  line_end: number;
  column_start: number;
  column_end: number;
  pointers?: string[];
}

export interface FlowPreview {
  preview_url: string;
  expires_at: string;
}

export interface Flow {
  id: string;
  name: string;
  status: FlowStatus;
  categories: FlowCategory[];
  validation_errors?: FlowValidationError[];
  json_version?: string;
  data_api_version?: string;
  endpoint_uri?: string;
  preview?: FlowPreview;
  health_status?: Record<string, unknown>;
  whatsapp_business_account?: { id: string };
  application?: { id: string };
}

export interface CreateFlowPayload {
  name: string;
  categories: FlowCategory[];
  flow_json?: string;
  publish?: boolean;
  clone_flow_id?: string;
}

export interface CreateFlowResponse {
  id: string;
  success?: boolean;
  validation_errors?: FlowValidationError[];
}

export interface UpdateFlowMetadataPayload {
  name?: string;
  categories?: FlowCategory[];
}

export interface ListFlowsResponse {
  data: Flow[];
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

export interface FlowAsset {
  name: string;
  asset_type: string;
  download_url: string;
}

export interface GetFlowAssetsResponse {
  data: FlowAsset[];
}

export interface MigratedFlow {
  source_name: string;
  source_id: string;
  migrated_id: string;
}

export interface FailedFlow {
  source_name: string;
  error_code: string;
  error_message: string;
}

export interface MigrateFlowsResponse {
  migrated_flows: MigratedFlow[];
  failed_flows: FailedFlow[];
}

export interface MigrateFlowsPayload {
  source_waba_id: string;
  source_flow_names: string[];
}
