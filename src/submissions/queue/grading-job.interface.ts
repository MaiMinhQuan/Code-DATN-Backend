// Data được đẩy vào Queue
export interface GradingJobData {
  submissionId: string;           // MongoDB ObjectId as string
  userId: string;                 // Để emit WebSocket về đúng user
  essayContent: string;           // Nội dung bài viết
  questionPrompt: string;         // Đề bài
  attemptNumber: number;          // Lần thử thứ mấy
}

// Result trả về sau khi job hoàn thành
export interface GradingJobResult {
  submissionId: string;
  success: boolean;
  processedAt: Date;
  errorMessage?: string;
}
