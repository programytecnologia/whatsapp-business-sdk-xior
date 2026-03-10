// Conversation / Inbox types shared by Messenger and Instagram APIs
// Reference: https://developers.facebook.com/docs/graph-api/reference/page/conversations

export interface ConversationMessage {
  id: string;
  created_time: string;
}

export interface ConversationParticipant {
  name: string;
  email?: string;
  id: string;
}

export interface Conversation {
  id: string;
  snippet?: string;
  updated_time?: string;
  message_count?: number;
  unread_count?: number;
  participants?: { data: ConversationParticipant[] };
  messages?: { data: ConversationMessage[] };
  link?: string;
  name?: string;
  platform?: string;
}

export interface GetConversationsParams {
  /** Comma-separated list of fields to return, or pass as an array (will be joined). */
  fields?: string | string[];
  platform?: "messenger" | "instagram";
  folder?: string;
  limit?: number;
  before?: string;
  after?: string;
}

export interface GetConversationsResponse {
  data: Conversation[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
    previous?: string;
  };
}
