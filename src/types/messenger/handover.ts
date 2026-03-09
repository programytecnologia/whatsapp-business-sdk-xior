export type PassThreadControlPayload = {
  recipient: { id: string };
  target_app_id: string;
  metadata?: string;
};

export type TakeThreadControlPayload = {
  recipient: { id: string };
  metadata?: string;
};

export type RequestThreadControlPayload = {
  recipient: { id: string };
  metadata?: string;
};

export type GetThreadOwnerResponse = {
  data: [{ thread_owner: { app_id: string } }];
};

export type GetSecondaryReceiversResponse = {
  data: { id: string; name: string }[];
};
