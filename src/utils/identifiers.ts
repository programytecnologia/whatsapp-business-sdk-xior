import type { WebhookMessage } from "../types/webhooks";

const BSUID_PATTERN = /^[A-Za-z]{2}\.[A-Za-z0-9]+$/;

export type WhatsAppIdentifier =
  | { type: "phone"; to: string }
  | { type: "bsuid"; recipient: string };

export type RecipientIdentity = {
  wa_id?: string;
  user_id?: string;
};

export type ResolvedRecipient =
  | { to: string; recipient?: never }
  | { recipient: string; to?: never };

export type UserChangedUserIdSystemMessage = WebhookMessage & {
  type: "system";
  system: NonNullable<WebhookMessage["system"]> & {
    type: NonNullable<WebhookMessage["system"]>["type"] & {
      user_changed_user_id: true;
    };
  };
};

export type UserChangedUserIdEvent = {
  body: string;
  identity: string;
  customer: string;
  wa_id: string;
  new_wa_id: string;
  user_id?: string;
  parent_user_id?: string;
};

export const isBsuid = (value: string): boolean => BSUID_PATTERN.test(value);

export const resolveRecipient = ({ wa_id, user_id }: RecipientIdentity): ResolvedRecipient => {
  if (wa_id) return { to: wa_id };
  if (user_id) return { recipient: user_id };
  throw new Error("Either wa_id or user_id must be provided");
};

export const isUserChangedUserIdSystemMessage = (
  message: WebhookMessage,
): message is UserChangedUserIdSystemMessage =>
  message.type === "system" && message.system?.type.user_changed_user_id === true;

export const getUserChangedUserIdEvent = (
  message: WebhookMessage,
): UserChangedUserIdEvent | undefined => {
  if (!isUserChangedUserIdSystemMessage(message)) return undefined;

  return {
    body: message.system.body,
    identity: message.system.identity,
    customer: message.system.customer,
    wa_id: message.system.wa_id,
    new_wa_id: message.system.new_wa_id,
    user_id: message.system.user_id,
    parent_user_id: message.system.parent_user_id,
  };
};
