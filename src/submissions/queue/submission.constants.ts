// Constants BullMQ queue chấm bài
export const SUBMISSION_QUEUE_NAME = "submission-grading";

/** Mốc % tiến trình chấm bài — đồng bộ với frontend/src/constants/grading-progress.ts */
export const GRADING_PROGRESS = {
  QUEUED:    0,
  STARTED:   10,
  ANALYZING: 30,
  SAVING:    80,
  COMPLETE:  100,
} as const;

export const SUBMISSION_JOB_NAMES = {
  GRADE_ESSAY: "grade-essay",
} as const;

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3, // Thử lại 3 lần nếu thất bại
  backoff: {
    type: "exponential" as const,
    delay: 5000, // Delays: 5s -> 10s -> 20s
  },
  removeOnComplete: {
    age: 24 * 3600,  // Giữ lại các job hoàn thành trong 24 giờ
    count: 1000,     // Giữ tối đa 1000 job hoàn thành
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // Giữ lại các job thất bại trong 7 ngày
  },
};
