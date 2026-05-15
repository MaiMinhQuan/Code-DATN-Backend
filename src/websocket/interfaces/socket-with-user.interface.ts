import { Socket } from "socket.io";

// Socket đã gắn user sau khi auth
export interface SocketWithUser extends Socket {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

// Payload emit submission_status_updated
export interface SubmissionStatusPayload {
  submissionId: string;
  status: string;
  hasResult: boolean;
  overallBand?: number;
  errorMessage?: string;
  timestamp: Date;
}

// Payload emit submission_progress
export interface SubmissionProgressPayload {
  submissionId: string;
  progress: number;
  message: string;
  timestamp: Date;
}
