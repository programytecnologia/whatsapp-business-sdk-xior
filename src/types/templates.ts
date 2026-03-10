import type { SupportedLanguagesCodeUnion } from "./languageCodes";
import type { LiteralUnion } from "./utils";

export type TemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";

export type TemplateStatus =
  | "APPROVED"
  | "PENDING"
  | "REJECTED"
  | "PAUSED"
  | "DISABLED"
  | "IN_APPEAL";

export type TemplateComponentType = "HEADER" | "BODY" | "FOOTER" | "BUTTONS";

export type TemplateButtonType =
  | "QUICK_REPLY"
  | "URL"
  | "PHONE_NUMBER"
  | "OTP"
  | "COPY_CODE"
  | "FLOW"
  | "CATALOG"
  | "MPM"
  | "REQUEST_CONTACT_INFO";

export type TemplateComponentButton = {
  type: TemplateButtonType;
  /** Button label text. Maximum 25 characters. */
  text?: string;
  /** Required for type URL. The URL to open when the button is tapped. */
  url?: string;
  /** Required for type PHONE_NUMBER. */
  phone_number?: string;
  /** Required for type OTP. The OTP type. */
  otp_type?: "COPY_CODE" | "ONE_TAP" | "ZERO_TAP";
  /** Required for type FLOW. */
  flow_id?: string;
  /** Required for type FLOW. */
  flow_action?: "navigate" | "data_exchange";
  /** Required for type FLOW with flow_action=navigate. */
  navigate_screen?: string;
};

export type TemplateComponentExample = {
  /** Example values for header text variables. */
  header_text?: string[];
  /** Example values for body text variables. */
  body_text?: string[][];
  /** Example URL for header of type IMAGE, VIDEO, or DOCUMENT. */
  header_url?: string[];
};

export type TemplateComponent = {
  type: TemplateComponentType;
  /** Required for type HEADER. */
  format?: LiteralUnion<"TEXT" | "IMAGE" | "DOCUMENT" | "VIDEO" | "LOCATION">;
  /** Text content for HEADER (format=TEXT), BODY, or FOOTER components. */
  text?: string;
  /** Required for type BUTTONS. */
  buttons?: TemplateComponentButton[];
  /** Example values used for variable placeholders during template creation/review. */
  example?: TemplateComponentExample;
  /** Add security recommendation footer text. Only valid for BODY of AUTHENTICATION templates. */
  add_security_recommendation?: boolean;
  /** Code expiry time in minutes for AUTHENTICATION templates. */
  code_expiration_minutes?: number;
};

export type Template = {
  id: string;
  name: string;
  language: LiteralUnion<SupportedLanguagesCodeUnion>;
  category: TemplateCategory;
  status: TemplateStatus;
  components: TemplateComponent[];
  /** Rejection reason returned when status is REJECTED. */
  rejected_reason?: string;
  /** Library template name if the template was created from the WhatsApp template library. */
  library_template_name?: string;
};

export type GetTemplatesResponse = {
  data: Template[];
  paging?: {
    cursors: {
      before: string;
      after: string;
    };
    next?: string;
  };
};

export type GetTemplatesParams = {
  /** Comma-separated list of template fields to return. */
  fields?: string;
  /** Filter by template status. */
  status?: TemplateStatus;
  /** Filter by template category. */
  category?: TemplateCategory;
  /** Filter by template name. */
  name?: string;
  /** Maximum number of templates to return per page. */
  limit?: number;
};

export type CreateTemplatePayload = {
  name: string;
  language: LiteralUnion<SupportedLanguagesCodeUnion>;
  category: TemplateCategory;
  components: TemplateComponent[];
  /** Allow category to be changed automatically by WhatsApp if detected incorrectly. Default: true. */
  allow_category_change?: boolean;
};

export type UpdateTemplatePayload = {
  components?: TemplateComponent[];
  category?: TemplateCategory;
};

export type CreateTemplateResponse = {
  id: string;
  status: TemplateStatus;
  category: TemplateCategory;
};

export type DeleteTemplateResponse = {
  success: boolean;
};
