// Data được đẩy vào Queue khi học viên nộp bài
export interface GradingJobData {
  submissionId: string;           // ID của submission cần chấm điểm
  userId: string;                 // Để emit WebSocket về đúng user
  essayContent: string;           // Bài viết cần chấm điểm
  questionPrompt: string;         // Đề bài
  attemptNumber: number;          // Số lần làm lại đề bài này
}

// Kết quả trả về sau khi job hoàn thành
export interface GradingJobResult {
  submissionId: string;           // ID của submission đã được chấm điểm
  success: boolean;               // Chấm điểm thành công hay thất bại
  processedAt: Date;              // Thời điểm hoàn thành chấm điểm
  errorMessage?: string;          // Nếu chấm điểm thất bại, thông báo lỗi
}
