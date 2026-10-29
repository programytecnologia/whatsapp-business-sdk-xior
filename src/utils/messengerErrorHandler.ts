import type { DefaultMessengerErrorAPI } from "../types/messenger/error";
import { MESSENGER_ERROR_CODES } from "../types/messenger/error";

export const MessengerErrorHandler = (error: DefaultMessengerErrorAPI) => {
  const err = error?.error;
  if (!err) return Promise.reject(error);
  // Keep Meta's text: the generic label alone hides which parameter or policy failed.
  const label = MESSENGER_ERROR_CODES[err.code];
  err.message =
    label && err.message && err.message !== label
      ? `${label}: ${err.message}`
      : label || err.message;
  if (!err.error_subcode) err.error_subcode = NaN;
  return Promise.reject(err);
};
