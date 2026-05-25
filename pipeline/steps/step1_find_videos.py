"""
Bước 1 — Tìm YouTube videos phù hợp cho một chủ đề IELTS.

Input : topic (str), target_band (str), max_results (int)
Output: danh sách VideoResult lưu vào output/step1_<topic>.json
"""

import re
import sys
import json
import isodate
from pathlib import Path
from dataclasses import dataclass, asdict
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

sys.path.insert(0, str(Path(__file__).parent.parent))
from config import YOUTUBE_API_KEY, MIN_DURATION_SECONDS, MAX_DURATION_SECONDS


# ─── Data model ──────────────────────────────────────────────────────────────

@dataclass
class VideoResult:
    video_id:     str
    title:        str
    channel:      str
    duration_sec: int
    has_caption:  bool
    thumbnail:    str
    url:          str
    description:  str


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _iso_to_seconds(iso_duration: str) -> int:
    """Chuyển ISO 8601 duration (PT4M30S) → giây."""
    try:
        return int(isodate.parse_duration(iso_duration).total_seconds())
    except Exception:
        return 0


def _build_queries(topic: str, target_band: str) -> list[str]:
    """
    Tạo danh sách query từ topic và band, ưu tiên IELTS-oriented.
    Ví dụ topic='Technology', band='BAND_6_0'
    → ['Technology IELTS Task 2', 'Technology society documentary', ...]
    """
    band_label = {
        "BAND_5_0":   "beginner intermediate",
        "BAND_6_0":   "intermediate",
        "BAND_7_PLUS": "advanced academic",
    }.get(target_band, "")

    return [
        f"{topic} IELTS Writing Task 2",
        f"{topic} documentary {band_label}",
        f"{topic} explained TED",
        f"{topic} society impact explained",
    ]


def _is_duration_valid(seconds: int) -> bool:
    return MIN_DURATION_SECONDS <= seconds <= MAX_DURATION_SECONDS


# ─── Main step function ───────────────────────────────────────────────────────

def find_videos(
    topic: str,
    target_band: str = "BAND_6_0",
    max_results: int = 10,
    require_caption: bool = True,
) -> list[VideoResult]:
    """
    Tìm YouTube videos phù hợp với topic và band mục tiêu.

    Args:
        topic:           Chủ đề IELTS (VD: "Technology and Society")
        target_band:     BAND_5_0 | BAND_6_0 | BAND_7_PLUS
        max_results:     Số video tối đa trả về
        require_caption: Chỉ lấy video có phụ đề

    Returns:
        Danh sách VideoResult đã lọc theo duration và caption
    """
    if not YOUTUBE_API_KEY:
        raise ValueError(
            "Thiếu YOUTUBE_API_KEY. "
            "Copy .env.example → .env và điền API key vào."
        )

    youtube = build("youtube", "v3", developerKey=YOUTUBE_API_KEY)
    queries  = _build_queries(topic, target_band)

    # Bước 1a: search → lấy video_ids
    seen_ids:  set[str]        = set()
    video_ids: list[str]       = []

    for query in queries:
        if len(video_ids) >= max_results * 3:   # lấy dư để sau filter
            break
        try:
            resp = youtube.search().list(
                part          = "id,snippet",
                q             = query,
                type          = "video",
                videoDuration = "medium",           # 4–20 phút
                videoCaption  = "closedCaption" if require_caption else "any",
                maxResults    = 10,
                relevanceLanguage = "en",
                safeSearch    = "moderate",
            ).execute()

            for item in resp.get("items", []):
                vid = item["id"]["videoId"]
                if vid not in seen_ids:
                    seen_ids.add(vid)
                    video_ids.append(vid)

        except HttpError as e:
            print(f"  [!] Search lỗi với query '{query}': {e}")
            continue

    if not video_ids:
        print("  [!] Không tìm thấy video nào. Kiểm tra API key và kết nối mạng.")
        return []

    # Bước 1b: videos.list → lấy duration + caption detail
    results: list[VideoResult] = []

    # API chỉ nhận tối đa 50 id/lần
    for chunk_start in range(0, len(video_ids), 50):
        chunk = video_ids[chunk_start : chunk_start + 50]
        try:
            detail_resp = youtube.videos().list(
                part = "contentDetails,snippet,status",
                id   = ",".join(chunk),
            ).execute()
        except HttpError as e:
            print(f"  [!] videos.list lỗi: {e}")
            continue

        for item in detail_resp.get("items", []):
            vid_id   = item["id"]
            snippet  = item["snippet"]
            details  = item["contentDetails"]

            duration_sec = _iso_to_seconds(details.get("duration", "PT0S"))
            has_caption  = details.get("caption", "false") == "true"

            # Lọc theo duration
            if not _is_duration_valid(duration_sec):
                continue

            # Lọc theo caption nếu yêu cầu
            if require_caption and not has_caption:
                continue

            results.append(VideoResult(
                video_id     = vid_id,
                title        = snippet.get("title", ""),
                channel      = snippet.get("channelTitle", ""),
                duration_sec = duration_sec,
                has_caption  = has_caption,
                thumbnail    = snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                url          = f"https://www.youtube.com/watch?v={vid_id}",
                description  = snippet.get("description", "")[:300],
            ))

            if len(results) >= max_results:
                break

        if len(results) >= max_results:
            break

    return results


# ─── Save / Load ──────────────────────────────────────────────────────────────

def save_results(videos: list[VideoResult], topic: str) -> Path:
    """Lưu kết quả ra output/step1_<slug>.json."""
    slug      = re.sub(r"[^a-z0-9]+", "_", topic.lower()).strip("_")
    out_path  = Path(__file__).parent.parent / "output" / f"step1_{slug}.json"
    out_path.parent.mkdir(exist_ok=True)

    payload = {
        "topic":  topic,
        "count":  len(videos),
        "videos": [asdict(v) for v in videos],
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    return out_path


def load_results(topic: str) -> list[VideoResult]:
    """Đọc lại kết quả đã lưu từ output/step1_<slug>.json."""
    slug     = re.sub(r"[^a-z0-9]+", "_", topic.lower()).strip("_")
    path     = Path(__file__).parent.parent / "output" / f"step1_{slug}.json"
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return [VideoResult(**v) for v in data["videos"]]


# ─── CLI quick-test ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    import sys

    topic       = sys.argv[1] if len(sys.argv) > 1 else "Technology and Society"
    target_band = sys.argv[2] if len(sys.argv) > 2 else "BAND_6_0"
    max_results = int(sys.argv[3]) if len(sys.argv) > 3 else 8

    print(f"\n{'='*60}")
    print(f"  Bước 1 — Tìm video YouTube")
    print(f"  Topic      : {topic}")
    print(f"  Target band: {target_band}")
    print(f"  Max results: {max_results}")
    print(f"{'='*60}\n")

    videos = find_videos(topic, target_band, max_results)

    if not videos:
        print("Không có video nào phù hợp.")
        sys.exit(1)

    print(f"Tìm được {len(videos)} video:\n")
    for i, v in enumerate(videos, 1):
        mins = v.duration_sec // 60
        secs = v.duration_sec % 60
        cap  = "✓" if v.has_caption else "✗"
        print(f"  {i:2}. [{cap} caption] {mins:2}:{secs:02}  {v.title[:55]}")
        print(f"       Channel: {v.channel}")
        print(f"       URL    : {v.url}")
        print()

    out_path = save_results(videos, topic)
    print(f" Đã lưu kết quả → {out_path}")
