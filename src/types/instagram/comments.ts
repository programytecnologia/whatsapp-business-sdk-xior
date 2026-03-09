/** Send a private DM reply from a comment (uses Send API with comment_id recipient) */
export type IGPrivateCommentReplyPayload = {
  recipient: { comment_id: string };
  message: { text: string };
};

/** Send a public reply in the comment thread (uses the /{comment-id}/replies endpoint) */
export type IGPublicCommentReplyPayload = {
  message: string;
};

export type IGPublicCommentReplyResponse = { id: string };

export type IGComment = {
  id: string;
  text: string;
  timestamp: string;
  from?: {
    id: string;
    username?: string;
  };
  media?: {
    id: string;
    media_product_type?: string;
  };
};

export type GetIGCommentsResponse = {
  data: IGComment[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
  };
};
