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

export type IceBreaker = {
  call_to_action_title: string;
  call_to_action_payload: string;
};

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
  ice_breakers?: IceBreaker[];
  persistent_menu?: PersistentMenuItem[];
  nlp_configs?: NLPConfig;
  whitelisted_domains?: string[];
  account_linking_url?: string;
};

export type GetMessengerProfileResponse = {
  data: Partial<MessengerProfile>[];
};
