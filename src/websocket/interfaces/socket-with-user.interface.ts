import { Socket } from 'socket.io';

/**
 * Interface mở rộng Socket với thông tin user đã xác thực
 */
export interface SocketWithUser extends Socket {
  user: {
    userId: string;
    email: string;
    role: string;
  };
}

/**
 * Payload gửi khi submission status thay đổi
 */
export interface SubmissionStatusPayload {
  submissionId: string;
  status: string;
  hasResult: boolean;
  overallBand?: number;
  errorMessage?: string;
  timestamp: Date;
}

/**
 * Payload gửi khi có progress update
 */
export interface SubmissionProgressPayload {
  submissionId: string;
  progress: number;
  message: string;
  timestamp: Date;
}
