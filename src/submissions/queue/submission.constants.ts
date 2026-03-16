// Queue name - sử dụng trong toàn bộ module
export const SUBMISSION_QUEUE_NAME = 'submission-grading';

// Job names
export const SUBMISSION_JOB_NAMES = {
  GRADE_ESSAY: 'grade-essay',
} as const;

// Job options defaults
export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,                    // Retry 3 lần nếu fail
  backoff: {
    type: 'exponential' as const,
    delay: 5000,                  // 5s, 10s, 20s...
  },
  removeOnComplete: {
    age: 24 * 3600,               // Giữ completed jobs 24h
    count: 1000,                  // Giữ tối đa 1000 completed jobs
  },
  removeOnFail: {
    age: 7 * 24 * 3600,           // Giữ failed jobs 7 ngày để debug
  },
};
