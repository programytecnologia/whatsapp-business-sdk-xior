import type { DefaultMessengerErrorAPI } from "../types/messenger/error";
import { MESSENGER_ERROR_CODES } from "../types/messenger/error";

export const MessengerErrorHandler = (error: DefaultMessengerErrorAPI) => {
  const err = error?.error;
  if (!err) return Promise.reject(error);
  err.message = MESSENGER_ERROR_CODES[err.code] || err.message;
  if (!err.error_subcode) err.error_subcode = NaN;
  return Promise.reject(err);
};
