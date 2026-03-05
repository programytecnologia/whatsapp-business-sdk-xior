export type BusinessPhoneNumber = {
  verified_name: string;
  display_phone_number: string;
  id: string;
  quality_rating: string;
  code_verification_status?: string;
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
  input: string;
  wa_id: string;
};

export type BlockUsersPayload = {
  messaging_product: "whatsapp";
  block_users: { user: string }[];
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
    wa_id: string;
  }[];
  paging: {
    cursors: {
      before: string;
      after: string;
    };
  };
};
