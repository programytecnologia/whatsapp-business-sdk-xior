import type { IceBreakersLocale } from "../types/messenger/profile";

// Shared by MessengerClient and InstagramClient: Meta's limits for templates and
// the messaging profile, checked before the request so a bad payload fails with a
// clear message instead of a generic Graph error.

const MAX_GENERIC_ELEMENTS = 10;
const MAX_ELEMENT_BUTTONS = 3;
const MAX_ICE_BREAKER_QUESTIONS = 4;
const MAX_PERSISTENT_MENU_ITEMS = 20;

/** Counts characters rather than UTF-16 units, so an emoji counts once. */
const charCount = (value: string) => Array.from(value).length;

type GenericElementLike = { title: string; subtitle?: string; buttons?: unknown[] };

export const assertGenericElements = (
  method: string,
  elements: GenericElementLike[],
  textLimit?: number,
) => {
  if (!Array.isArray(elements) || elements.length < 1 || elements.length > MAX_GENERIC_ELEMENTS) {
    throw new Error(
      `${method} needs 1 to ${MAX_GENERIC_ELEMENTS} elements, got ${elements?.length ?? 0}`,
    );
  }
  elements.forEach((element, index) => {
    const buttons = element.buttons?.length ?? 0;
    if (buttons > MAX_ELEMENT_BUTTONS) {
      throw new Error(
        `${method}: element ${index} has ${buttons} buttons, the limit is ${MAX_ELEMENT_BUTTONS}`,
      );
    }
    if (textLimit === undefined) return;
    if (charCount(element.title) > textLimit) {
      throw new Error(`${method}: element ${index} title is over ${textLimit} characters`);
    }
    if (element.subtitle !== undefined && charCount(element.subtitle) > textLimit) {
      throw new Error(`${method}: element ${index} subtitle is over ${textLimit} characters`);
    }
  });
};

export const assertButtonTemplate = (method: string, text: string, buttons: unknown[]) => {
  if (charCount(text) > 640) throw new Error(`${method}: text is over 640 characters`);
  if (!Array.isArray(buttons) || buttons.length < 1 || buttons.length > MAX_ELEMENT_BUTTONS) {
    throw new Error(
      `${method} needs 1 to ${MAX_ELEMENT_BUTTONS} buttons, got ${buttons?.length ?? 0}`,
    );
  }
};

const assertDefaultLocale = (method: string, locales: { locale: string }[]) => {
  if (!Array.isArray(locales) || !locales.some((entry) => entry.locale === "default")) {
    throw new Error(`${method} needs an entry with locale "default"`);
  }
};

export const assertIceBreakers = (method: string, iceBreakers: IceBreakersLocale[]) => {
  assertDefaultLocale(method, iceBreakers);
  for (const { locale, call_to_actions } of iceBreakers) {
    const count = call_to_actions?.length ?? 0;
    if (count < 1 || count > MAX_ICE_BREAKER_QUESTIONS) {
      throw new Error(
        `${method}: locale "${locale}" needs 1 to ${MAX_ICE_BREAKER_QUESTIONS} questions, got ${count}`,
      );
    }
  }
};

export const assertPersistentMenu = (
  method: string,
  menu: { locale: string; call_to_actions: unknown[] }[],
) => {
  assertDefaultLocale(method, menu);
  for (const { locale, call_to_actions } of menu) {
    const count = call_to_actions?.length ?? 0;
    if (count > MAX_PERSISTENT_MENU_ITEMS) {
      throw new Error(
        `${method}: locale "${locale}" has ${count} items, the limit is ${MAX_PERSISTENT_MENU_ITEMS}`,
      );
    }
  }
};

type ProfileResponse = { data?: unknown[] } | undefined | null;

const profileEntries = (response: ProfileResponse) =>
  (Array.isArray(response?.data) ? response.data : []).filter(
    (entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null,
  );

/** The list stored under `field` in a `messenger_profile` GET, or `[]` when unset. */
export const readProfileList = <T>(response: ProfileResponse, field: string): T[] => {
  for (const entry of profileEntries(response)) {
    const value = entry[field];
    if (Array.isArray(value)) return value as T[];
  }
  return [];
};

/**
 * Ice breakers from a `messenger_profile` GET. Meta documents the Instagram
 * response both wrapped (`data[0].ice_breakers`) and with the locales directly
 * in `data`, so both are read.
 */
export const readIceBreakers = (response: ProfileResponse): IceBreakersLocale[] => {
  const wrapped = readProfileList<IceBreakersLocale>(response, "ice_breakers");
  if (wrapped.length > 0) return wrapped;
  return profileEntries(response).filter((entry) =>
    Array.isArray(entry.call_to_actions),
  ) as unknown as IceBreakersLocale[];
};
