// WhatsApp Analytics API types
// Reference: https://developers.facebook.com/docs/whatsapp/business-management-api/analytics

export type AnalyticsGranularity = "DAY" | "MONTH" | "HALF_HOUR";

export type AnalyticsDimension =
  | "CONVERSATION_CATEGORY"
  | "CONVERSATION_DIRECTION"
  | "CONVERSATION_TYPE"
  | "COUNTRY"
  | "PHONE";

export interface GetAnalyticsParams {
  /** Unix timestamp (seconds) for the start of the range. */
  start: number;
  /** Unix timestamp (seconds) for the end of the range. */
  end: number;
  granularity: AnalyticsGranularity;
  phone_numbers?: string[];
  /** 0 = cloud-hosted, 2 = on-premises. Omit for all. */
  product_types?: number[];
  country_codes?: string[];
  dimensions?: AnalyticsDimension[];
}

export interface AnalyticsDataPoint {
  start: number;
  end: number;
  sent: number;
  delivered: number;
}

export interface Analytics {
  account_id: string;
  phone_numbers: string[];
  country_codes: string[];
  granularity: AnalyticsGranularity;
  data_points: AnalyticsDataPoint[];
}

export interface GetAnalyticsResponse {
  analytics: Analytics;
  id: string;
}

// --- Conversation Analytics ---

export type ConversationGranularity = "HALF_HOUR" | "DAY" | "MONTH";

export type ConversationType = "REGULAR" | "REFERRAL_CONVERSION";

export type ConversationDirection = "BUSINESS_INITIATED" | "USER_INITIATED";

export type ConversationCategory =
  | "AUTHENTICATION"
  | "AUTHENTICATION_INTERNATIONAL"
  | "MARKETING"
  | "SERVICE"
  | "UTILITY"
  | "REFERRAL_CONVERSION";

export interface GetConversationAnalyticsParams {
  /** Unix timestamp (seconds) for the start of the range. */
  start: number;
  /** Unix timestamp (seconds) for the end of the range. */
  end: number;
  granularity: ConversationGranularity;
  phone_numbers?: string[];
  dimensions?: AnalyticsDimension[];
  conversation_types?: ConversationType[];
  conversation_directions?: ConversationDirection[];
  conversation_categories?: ConversationCategory[];
  country_codes?: string[];
}

export interface ConversationDataPoint {
  conversation_direction?: ConversationDirection;
  conversation_type?: ConversationType;
  conversation_category?: ConversationCategory;
  country?: string;
  phone?: string;
  start: number;
  end: number;
  count: number;
  cost?: number;
}

export interface ConversationAnalytics {
  data: {
    data_points: ConversationDataPoint[];
  }[];
  paging?: {
    cursors?: { before: string; after: string };
  };
}

export interface GetConversationAnalyticsResponse {
  conversation_analytics: ConversationAnalytics;
  id: string;
}
