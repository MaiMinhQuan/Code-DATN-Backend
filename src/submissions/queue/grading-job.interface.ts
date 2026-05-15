// Interface payload/result cho BullMQ job chấm bài
export interface GradingJobData {
  submissionId: string;
  userId: string;
  essayContent: string;
  questionPrompt: string;
  attemptNumber: number;
}

export interface GradingJobResult {
  submissionId: string;
  success: boolean;
  processedAt: Date;
  errorMessage?: string;
}
