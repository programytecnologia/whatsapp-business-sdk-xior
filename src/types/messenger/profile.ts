export type MessengerProfileFieldName =
  | "get_started"
  | "greeting"
  | "ice_breakers"
  | "persistent_menu"
  | "nlp_configs"
  | "whitelisted_domains"
  | "account_linking_url"
  | "payment_settings"
  | "target_audience"
  | "home_url";

export type GetStarted = { payload: string };

export type Greeting = { locale: string; text: string };

/**
 * Legacy, non-localized ice breaker.
 * @deprecated Meta now takes ice breakers per locale; use `IceBreakersLocale`.
 */
export type IceBreaker = {
  call_to_action_title: string;
  call_to_action_payload: string;
};

/** A question shown when a user opens a new thread; tapping it sends `payload` as a postback. */
export type IceBreakerQuestion = { question: string; payload: string };

/**
 * Ice breakers for one locale (`default` is required), up to 4 questions.
 *
 * Documentation: https://developers.facebook.com/docs/messenger-platform/discovery/ice-breakers
 */
export type IceBreakersLocale = { locale: string; call_to_actions: IceBreakerQuestion[] };

export type PersistentMenuCallToAction =
  | {
      type: "web_url";
      title: string;
      url: string;
      webview_height_ratio?: "compact" | "tall" | "full";
      messenger_extensions?: boolean;
    }
  | { type: "postback"; title: string; payload: string }
  | { type: "nested"; title: string; call_to_actions: PersistentMenuCallToAction[] };

export type PersistentMenuItem = {
  locale: string;
  composer_input_disabled?: boolean;
  disabled_surfaces?: ("customer_chat_plugin" | "messenger_extensions")[];
  call_to_actions: PersistentMenuCallToAction[];
};

export type NLPConfig = {
  nlp_enabled?: boolean;
  model?: string;
  custom_token?: string;
  verbose?: boolean;
  n_best?: number;
};

export type MessengerProfile = {
  get_started?: GetStarted;
  greeting?: Greeting[];
  ice_breakers?: IceBreakersLocale[];
  persistent_menu?: PersistentMenuItem[];
  nlp_configs?: NLPConfig;
  whitelisted_domains?: string[];
  account_linking_url?: string;
};

export type GetMessengerProfileResponse = {
  data: Partial<MessengerProfile>[];
};

// --- User Profile API ---
// Reference: https://developers.facebook.com/docs/messenger-platform/identity/user-profile

export interface UserProfile {
  /** Needs the Business Asset User Profile Access feature, like the names and photo. */
  name?: string;
  first_name?: string;
  last_name?: string;
  profile_pic?: string;
  locale?: string;
  /** UTC offset (hours) of the user's timezone. */
  timezone?: number;
  gender?: string;
  id: string;
}

export type UserProfileField =
  | "name"
  | "first_name"
  | "last_name"
  | "profile_pic"
  | "locale"
  | "timezone"
  | "gender";
