"""
Bước 2 — Lấy subtitle (transcript) từ các YouTube video tìm được ở Bước 1.

Dùng yt-dlp để lấy URL subtitle, sau đó fetch JSON3 và parse thành segments.

Input : output/step1_<slug>.json
Output: output/step2_<slug>.json
"""

import re
import sys
import json
import requests
from pathlib import Path
from dataclasses import dataclass, asdict

sys.path.insert(0, str(Path(__file__).parent.parent))

import yt_dlp
from steps.step1_find_videos import VideoResult
from steps.step1_find_videos import load_results as load_step1


# ─── Data models ─────────────────────────────────────────────────────────────

@dataclass
class TranscriptSegment:
    text:     str
    start:    float   # giây từ đầu video
    duration: float   # độ dài segment (giây)


@dataclass
class VideoTranscript:
    video_id:     str
    title:        str
    url:          str
    language:     str
    is_generated: bool   # True = auto-generated, False = manual captions
    segments:     list[TranscriptSegment]
    full_text:    str    # toàn bộ text nối lại (dùng cho AI ở Bước 3)


# ─── Parse JSON3 subtitle format ─────────────────────────────────────────────

def _parse_json3(data: dict) -> list[TranscriptSegment]:
    """
    YouTube JSON3 subtitle format:
    {
      "events": [
        { "tStartMs": 1000, "dDurationMs": 2000, "segs": [{"utf8": "Hello"}] },
        ...
      ]
    }
    """
    segments = []
    for event in data.get("events", []):
        if "segs" not in event:
            continue
        text = "".join(seg.get("utf8", "") for seg in event["segs"]).strip()
        if not text or text == "\n":
            continue
        segments.append(TranscriptSegment(
            text=text,
            start=round(event.get("tStartMs", 0) / 1000, 2),
            duration=round(event.get("dDurationMs", 0) / 1000, 2),
        ))
    return segments


# ─── Lấy subtitle URL qua yt-dlp ─────────────────────────────────────────────

def _get_subtitle_url(video_id: str) -> tuple[str, str, bool] | None:
    """
    Dùng yt-dlp để lấy URL của subtitle JSON3.
    Trả về (subtitle_url, language_code, is_auto_generated).
    """
    url = f"https://www.youtube.com/watch?v={video_id}"
    ydl_opts = {
        "quiet":        True,
        "no_warnings":  True,
        "skip_download": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as e:
        print(f"         ✗ yt-dlp extract_info lỗi: {e}")
        return None

    # 1. Ưu tiên manual subtitles (tiếng Anh)
    subtitles = info.get("subtitles", {})
    for lang in ["en", "en-US", "en-GB"]:
        if lang in subtitles:
            for fmt in subtitles[lang]:
                if fmt.get("ext") == "json3":
                    return fmt["url"], lang, False

    # 2. Fallback: auto-generated captions
    auto = info.get("automatic_captions", {})
    for lang in ["en", "en-US", "en-orig", "en-GB"]:
        if lang in auto:
            for fmt in auto[lang]:
                if fmt.get("ext") == "json3":
                    return fmt["url"], lang, True

    return None


# ─── Fetch + parse transcript ─────────────────────────────────────────────────

def _fetch_transcript(video: VideoResult) -> VideoTranscript | None:
    result = _get_subtitle_url(video.video_id)
    if result is None:
        print(f"         ✗ Không tìm thấy subtitle JSON3")
        return None

    sub_url, lang, is_auto = result

    try:
        resp = requests.get(sub_url, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"         ✗ Lỗi fetch subtitle URL: {e}")
        return None

    segments = _parse_json3(data)
    if not segments:
        print(f"         ✗ Subtitle rỗng sau khi parse")
        return None

    full_text = " ".join(seg.text for seg in segments)

    return VideoTranscript(
        video_id=video.video_id,
        title=video.title,
        url=video.url,
        language=lang,
        is_generated=is_auto,
        segments=segments,
        full_text=full_text,
    )


# ─── Main step function ───────────────────────────────────────────────────────

def get_subtitles(topic: str) -> list[VideoTranscript]:
    """Đọc kết quả Bước 1 và lấy subtitle cho từng video."""
    videos = load_step1(topic)
    print(f"  Đọc được {len(videos)} video từ Bước 1")

    transcripts = []
    for i, video in enumerate(videos, 1):
        print(f"  [{i}/{len(videos)}] {video.title[:55]}")
        result = _fetch_transcript(video)
        if result:
            word_count = len(result.full_text.split())
            tag = "auto" if result.is_generated else "manual"
            print(f"         ✓ [{tag}|{result.language}] {len(result.segments)} segments · ~{word_count} từ")
            transcripts.append(result)

    return transcripts


# ─── Save / Load ──────────────────────────────────────────────────────────────

def save_results(transcripts: list[VideoTranscript], topic: str) -> Path:
    """Lưu kết quả ra output/step2_<slug>.json."""
    slug = re.sub(r"[^a-z0-9]+", "_", topic.lower()).strip("_")
    out_path = Path(__file__).parent.parent / "output" / f"step2_{slug}.json"
    out_path.parent.mkdir(exist_ok=True)

    payload = {
        "topic":       topic,
        "count":       len(transcripts),
        "transcripts": [asdict(t) for t in transcripts],
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    return out_path


def load_results(topic: str) -> list[VideoTranscript]:
    """Đọc lại kết quả đã lưu từ output/step2_<slug>.json."""
    slug = re.sub(r"[^a-z0-9]+", "_", topic.lower()).strip("_")
    path = Path(__file__).parent.parent / "output" / f"step2_{slug}.json"
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return [
        VideoTranscript(
            **{**t, "segments": [TranscriptSegment(**s) for s in t["segments"]]}
        )
        for t in data["transcripts"]
    ]


# ─── CLI quick-test ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    topic = sys.argv[1] if len(sys.argv) > 1 else "Technology and Society"

    print(f"\n{'='*60}")
    print(f"  Bước 2 — Lấy subtitle")
    print(f"  Topic: {topic}")
    print(f"{'='*60}\n")

    results = get_subtitles(topic)

    if not results:
        print("Không lấy được transcript nào.")
        sys.exit(1)

    out_path = save_results(results, topic)
    print(f"\n Lấy được {len(results)} transcript → {out_path.name}")

    # In mẫu 3 segment đầu của video đầu tiên
    print(f"\n--- Mẫu transcript ({results[0].title[:40]}) ---")
    for seg in results[0].segments[:3]:
        print(f"  [{seg.start:.1f}s] {seg.text}")
