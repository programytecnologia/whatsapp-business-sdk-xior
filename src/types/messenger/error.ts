/**
 * Common Graph API error codes for the Messenger Platform.
 * https://developers.facebook.com/docs/messenger-platform/error-codes
 */
export const MESSENGER_ERROR_CODES = {
  0: "AuthException",
  1: "API Unknown",
  2: "API Service",
  3: "API Method",
  4: "API Too Many Calls",
  10: "API Permission Denied",
  100: "Invalid parameter",
  190: "Access token has expired",
  200: "API Permission",
  299: "API Permission",
  368: "Temporarily blocked for policies violations",
  506: "Duplicate Post",
  551: "User is no longer a recipient",
  613: "Calls to this API have exceeded the rate limit",
} as const;

/**
 * Subcodes the Send API returns with codes 10, 100, 200 and 551.
 * https://developers.facebook.com/documentation/business-messaging/messenger-platform/error-codes
 */
export const MESSENGER_ERROR_SUBCODES = {
  /** Code 10: Messenger message sent outside the standard messaging window. */
  OUTSIDE_WINDOW: 2018278,
  /** Code 10: Instagram message sent outside the standard messaging window. */
  IG_OUTSIDE_WINDOW: 2534022,
  /** Code 10: the person can't receive messages right now. */
  CANNOT_RECEIVE: 2018108,
  /** Code 100: no user matches the recipient id. */
  NO_MATCHING_USER: 2018001,
  /** Codes 200 / 551: the person isn't available (blocked the Page, left, ...). */
  PERSON_UNAVAILABLE: 1545041,
} as const;

/** Whether a Send API error means the messaging window is closed. */
export const isOutsideMessagingWindowError = (error: {
  code?: number;
  error_subcode?: number;
}): boolean =>
  error.code === 10 &&
  (error.error_subcode === MESSENGER_ERROR_SUBCODES.OUTSIDE_WINDOW ||
    error.error_subcode === MESSENGER_ERROR_SUBCODES.IG_OUTSIDE_WINDOW);

/** Whether the recipient can no longer be messaged at all (blocked, gone). */
export const isRecipientUnavailableError = (error: {
  code?: number;
  error_subcode?: number;
}): boolean =>
  error.code === 551 ||
  error.error_subcode === MESSENGER_ERROR_SUBCODES.PERSON_UNAVAILABLE ||
  error.error_subcode === MESSENGER_ERROR_SUBCODES.NO_MATCHING_USER ||
  error.error_subcode === MESSENGER_ERROR_SUBCODES.CANNOT_RECEIVE;

export type MessengerErrorCodes = keyof typeof MESSENGER_ERROR_CODES;
export type MessengerErrorMessages =
  (typeof MESSENGER_ERROR_CODES)[keyof typeof MESSENGER_ERROR_CODES];

export type MessengerErrorAPI = {
  message: string;
  type: string;
  code: MessengerErrorCodes;
  error_subcode?: number;
  fbtrace_id: string;
};

export type DefaultMessengerErrorAPI = {
  error: MessengerErrorAPI;
};
