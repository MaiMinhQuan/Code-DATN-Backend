// Enums dùng chung toàn backend
export enum UserRole {
  STUDENT = "STUDENT",
  ADMIN = "ADMIN",
}

export enum TargetBand {
  BAND_5_0 = "BAND_5_0",
  BAND_6_0 = "BAND_6_0",
  BAND_7_PLUS = "BAND_7_PLUS",
}

export enum SubmissionStatus {
  DRAFT = "DRAFT",           // Lưu nhưng chưa nộp
  SUBMITTED = "SUBMITTED",   // Chờ xử lý
  PROCESSING = "PROCESSING", // Đang chấm
  COMPLETED = "COMPLETED",   // Chấm xong
  FAILED = "FAILED",         // Chấm lỗi
}

export enum HighlightType {
  VOCABULARY = "VOCABULARY",
  GRAMMAR = "GRAMMAR",
  STRUCTURE = "STRUCTURE",
  ARGUMENT = "ARGUMENT",
}

export enum ErrorCategory {
  GRAMMAR = "GRAMMAR",
  VOCABULARY = "VOCABULARY",
  COHERENCE = "COHERENCE",
  TASK_RESPONSE = "TASK_RESPONSE",
  SPELLING = "SPELLING",
  PUNCTUATION = "PUNCTUATION",
}

export enum AIProvider {
  GEMINI = "GEMINI",
  MISTRAL = "MISTRAL",
}
