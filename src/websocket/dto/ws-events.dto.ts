// Tên event, namespace và prefix room dùng chung cho WebSocket submissions.
export const WS_EVENTS = {
  // Client -> Server
  JOIN_ROOM: "join_room",
  LEAVE_ROOM: "leave_room",

  // Server -> Client
  SUBMISSION_STATUS_UPDATED: "submission_status_updated",
  SUBMISSION_PROGRESS: "submission_progress",
  CONNECTED: "connected",
  ERROR: "error",
} as const;

export const WS_NAMESPACES = {
  SUBMISSIONS: "/ws/submissions",
} as const;

export const ROOM_PREFIX = {
  USER: "user:",
  SUBMISSION: "submission:",
} as const;
