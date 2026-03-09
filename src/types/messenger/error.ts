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
