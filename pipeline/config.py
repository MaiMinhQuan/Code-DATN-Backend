import os
from dotenv import load_dotenv

load_dotenv()

YOUTUBE_API_KEY    = os.getenv("YOUTUBE_API_KEY", "")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
DEEPL_API_KEY      = os.getenv("DEEPL_API_KEY", "")

# VPS/datacenter: YouTube thường chặn IP → cần proxy residential cho Bước 2
# Ví dụ: http://user:pass@proxy.example.com:8080
YOUTUBE_PROXY_URL   = os.getenv("YOUTUBE_PROXY_URL", "").strip()
YOUTUBE_COOKIES_FILE = os.getenv("YOUTUBE_COOKIES_FILE", "").strip()

# Model tiết kiệm, hỗ trợ tốt tiếng Việt và JSON structured output
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "google/gemini-2.0-flash-lite")
MONGODB_URI     = os.getenv("MONGODB_URI", "mongodb://localhost:27017/ielts-writing-db")

# Kênh YouTube uy tín cho IELTS — ưu tiên khi tìm kiếm
TRUSTED_CHANNELS = {
    "UCsooa4yRKGN_zEE8iknghZA": "TED-Ed",
    "UCZYTClx2T1of7BRZ86-8fow": "SciShow",
    "UCsXVk37bltHxD1rDPwtNM8Q": "Kurzgesagt",
    "UCpVm7bg6pXKo1Pr6k5kxG9A": "National Geographic",
    "UC3XTzVzaHQEd30rQbuvCtTQ": "LastWeekTonight",
    "UC9-y-6csu5WGm29I7JiwpnA": "Computerphile",
    "UCSju5G2aFaWMqn-_0YBtq5A": "BBC News",
}

# Từ khoá mở rộng cho IELTS Task 2
IELTS_KEYWORDS = ["IELTS", "academic", "education", "society", "environment", "technology"]

# Giới hạn số video lấy về mỗi lần tìm kiếm
MAX_RESULTS_PER_QUERY = 10

# Độ dài video hợp lệ (giây)
MIN_DURATION_SECONDS = 180   # 3 phút
MAX_DURATION_SECONDS = 1200  # 20 phút
