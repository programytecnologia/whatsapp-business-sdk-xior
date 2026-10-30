import type { IceBreakersLocale } from "../messenger/profile";
import type { IGTemplateButton } from "./messages";

/**
 * Persistent menu for one locale (`default` is required). Instagram only takes
 * `postback` and `web_url` items, without nesting.
 *
 * Documentation: https://developers.facebook.com/documentation/business-messaging/instagram-messaging/features/persistent-menu
 */
export type IGPersistentMenuItem = { locale: string; call_to_actions: IGTemplateButton[] };

/** Instagram messaging profile, read and written with `platform=instagram`. */
export type IGMessagingProfile = {
  ice_breakers?: IceBreakersLocale[];
  persistent_menu?: IGPersistentMenuItem[];
  [field: string]: unknown;
};

export type GetIGMessagingProfileResponse = { data: IGMessagingProfile[] };
