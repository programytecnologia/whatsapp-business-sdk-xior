export type BusinessPhoneNumber = {
  verified_name: string;
  display_phone_number: string;
  id: string;
  quality_rating: string;
  code_verification_status?: string;
  /**
   * Whether this phone number is registered on the WhatsApp Business App (coexistence).
   */
  is_on_biz_app?: boolean;
  /**
   * The platform type for the phone number. E.g. `"CLOUD_API"`.
   */
  platform_type?: string;
};

export type GetBusinessPhoneNumberResponse = {
  data: BusinessPhoneNumber[];
  paging: {
    cursors: {
      before: string;
      after: string;
    };
  };
};

export type UpdateIdentityCheckState = {
  enable_identity_key_check: boolean;
};

export type RequestPhoneNumberVerificationCodePayload = {
  code_method: "SMS" | "VOICE";
  /**
   * Your locale. For example: "en_US".
   */
  language: string;
};

export type RequestPhoneNumberVerificationCodeArgs = RequestPhoneNumberVerificationCodePayload & {
  phoneNumberId: string;
};

export type VerifyPhoneNumberArgs = {
  phoneNumberId: string;
  code: string;
};

type BlockedUserResult = {
  /** The input value used in the request (phone number or BSUID). */
  input: string;
  /** The user's phone number. Omitted when the user was blocked/unblocked via BSUID. */
  wa_id?: string;
  /** The user's BSUID. Present when the user was blocked/unblocked via BSUID. */
  user_id?: string;
};

/**
 * A block/unblock target. Provide `user` (phone number), `user_id` (BSUID or parent BSUID), or both.
 * When both are provided, `user` (phone number) takes precedence.
 */
export type BlockUserTarget =
  | { user: string; user_id?: string }
  | { user_id: string; user?: string };

export type BlockUsersPayload = {
  messaging_product: "whatsapp";
  block_users: BlockUserTarget[];
};

export type BlockUsersResponse = {
  messaging_product: "whatsapp";
  block_users: {
    added_users: BlockedUserResult[];
  };
};

export type UnblockUsersResponse = {
  messaging_product: "whatsapp";
  block_users: {
    removed_users: BlockedUserResult[];
  };
};

export type GetBlockedUsersResponse = {
  data: {
    messaging_product: "whatsapp";
    wa_id?: string;
    user_id?: string;
  }[];
  paging: {
    cursors: {
      before: string;
      after: string;
    };
  };
};

// ─── Business username types ──────────────────────────────────────────────────

/** Status of a business username. */
export type BusinessUsernameStatus = "approved" | "reserved";

export type AdoptUsernamePayload = {
  /** The desired username. Must follow WhatsApp username format rules. */
  username: string;
};

export type AdoptUsernameResponse = {
  /** The status of the requested username. */
  status: BusinessUsernameStatus;
};

export type GetUsernameResponse = {
  /** Current username. Omitted if the phone number has no username. */
  username?: string;
  /** Username status. */
  status: BusinessUsernameStatus;
};

export type GetReservedUsernamesResponse = {
  data: [
    {
      username_suggestions: string[];
    },
  ];
};

export type DeleteUsernameResponse = {
  success: boolean;
};
