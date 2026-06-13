"""
Bước 2 — Lấy subtitle (transcript) từ các YouTube video tìm được ở Bước 1.

Chiến lược (theo thứ tự):
  1. InnerTube API (Android client) + timedtext XML — ổn định trên IP thường
  2. youtube-transcript-api
  3. yt-dlp (nhiều player_client + định dạng phụ đề)

Trên VPS (IP datacenter): YouTube thường chặn → cần YOUTUBE_PROXY_URL trong .env.

Input : output/step1_<slug>.json
Output: output/step2_<slug>.json
"""

import re
import sys
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from dataclasses import dataclass, asdict

import requests
import yt_dlp

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import YOUTUBE_PROXY_URL, YOUTUBE_COOKIES_FILE
from steps.step1_find_videos import VideoResult
from steps.step1_find_videos import load_results as load_step1

INNERTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
INNERTUBE_PLAYER_URL = f"https://www.youtube.com/youtubei/v1/player?key={INNERTUBE_API_KEY}&prettyPrint=false"
INNERTUBE_ANDROID_UA = "com.google.android.youtube/20.10.38 (Linux; U; Android 14)"

EN_LANGS = ["en", "en-US", "en-GB", "en-orig"]
SUBTITLE_EXTS = ["json3", "vtt", "srv3", "ttml", "srt"]


# ─── Data models ─────────────────────────────────────────────────────────────

@dataclass
class TranscriptSegment:
    text:     str
    start:    float
    duration: float


@dataclass
class VideoTranscript:
    video_id:     str
    title:        str
    url:          str
    language:     str
    is_generated: bool
    segments:     list[TranscriptSegment]
    full_text:    str
    source:       str = "unknown"


# ─── HTTP session (proxy / cookies) ──────────────────────────────────────────

def _requests_proxies() -> dict | None:
    if not YOUTUBE_PROXY_URL:
        return None
    return {"http": YOUTUBE_PROXY_URL, "https": YOUTUBE_PROXY_URL}


def _http_session() -> requests.Session:
    session = requests.Session()
    session.headers.update({"User-Agent": INNERTUBE_ANDROID_UA})
    proxies = _requests_proxies()
    if proxies:
        session.proxies.update(proxies)
    return session


# ─── Parsers ─────────────────────────────────────────────────────────────────

def _parse_json3(data: dict) -> list[TranscriptSegment]:
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


def _parse_timedtext_xml(text: str) -> list[TranscriptSegment]:
    """YouTube timedtext format 3: <p t=\"ms\" d=\"ms\">...</p>"""
    segments = []
    try:
        root = ET.fromstring(text)
    except ET.ParseError:
        return segments

    for p in root.iter("p"):
        t_ms = int(p.get("t", 0))
        d_ms = int(p.get("d", 0))
        parts = [p.text or ""]
        for child in p:
            if child.text:
                parts.append(child.text)
            if child.tail:
                parts.append(child.tail)
        line = re.sub(r"\s+", " ", "".join(parts)).strip()
        if not line:
            continue
        segments.append(TranscriptSegment(
            text=line,
            start=round(t_ms / 1000, 2),
            duration=round(d_ms / 1000, 2),
        ))
    return segments


def _parse_vtt(text: str) -> list[TranscriptSegment]:
    segments = []
    blocks = re.split(r"\n\n+", text.strip())
    time_re = re.compile(
        r"(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*"
        r"(\d{2}):(\d{2}):(\d{2})\.(\d{3})"
    )

    def to_sec(h, m, s, ms):
        return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000

    for block in blocks:
        lines = block.strip().splitlines()
        if len(lines) < 2:
            continue
        m = time_re.match(lines[0])
        if not m:
            continue
        start = to_sec(*m.groups()[:4])
        end = to_sec(*m.groups()[4:])
        body = " ".join(lines[1:]).strip()
        if body and not body.startswith("NOTE"):
            segments.append(TranscriptSegment(
                text=body,
                start=round(start, 2),
                duration=round(max(end - start, 0), 2),
            ))
    return segments


def _parse_subtitle_payload(text: str, ext: str) -> list[TranscriptSegment]:
    ext = ext.lower()
    if ext == "json3":
        try:
            return _parse_json3(json.loads(text))
        except json.JSONDecodeError:
            return []
    if ext in ("vtt", "srv3", "ttml", "srt") or text.lstrip().startswith("<?xml"):
        if text.lstrip().startswith("WEBVTT") or ext == "vtt":
            return _parse_vtt(text)
        return _parse_timedtext_xml(text)
    if text.lstrip().startswith("{"):
        try:
            return _parse_json3(json.loads(text))
        except json.JSONDecodeError:
            pass
    return _parse_timedtext_xml(text)


def _segments_to_transcript(
    video: VideoResult,
    segments: list[TranscriptSegment],
    lang: str,
    is_auto: bool,
    source: str,
) -> VideoTranscript | None:
    if not segments:
        return None
    full_text = " ".join(seg.text for seg in segments)
    if len(full_text.split()) < 20:
        return None
    return VideoTranscript(
        video_id=video.video_id,
        title=video.title,
        url=video.url,
        language=lang,
        is_generated=is_auto,
        segments=segments,
        full_text=full_text,
        source=source,
    )


# ─── Strategy 1: InnerTube Android + timedtext ───────────────────────────────

def _pick_caption_track(tracks: list[dict]) -> tuple[dict, bool] | None:
    manual = [t for t in tracks if t.get("kind") != "asr"]
    auto = [t for t in tracks if t.get("kind") == "asr"]
    for pool, is_auto in ((manual, False), (auto, True)):
        for lang in EN_LANGS:
            for track in pool:
                if track.get("languageCode", "").startswith(lang.split("-")[0]):
                    return track, is_auto
        if pool:
            return pool[0], is_auto
    return None


def _fetch_via_innertube(session: requests.Session, video: VideoResult) -> VideoTranscript | None:
    payload = {
        "context": {
            "client": {
                "clientName": "ANDROID",
                "clientVersion": "20.10.38",
                "hl": "en",
                "gl": "US",
            }
        },
        "videoId": video.video_id,
    }
    try:
        resp = session.post(
            INNERTUBE_PLAYER_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"         ✗ InnerTube lỗi: {e}")
        return None

    playability = data.get("playabilityStatus", {})
    status = playability.get("status", "")
    if status != "OK":
        reason = playability.get("reason") or status
        if status == "LOGIN_REQUIRED" or "bot" in reason.lower():
            hint = " (VPS: thêm YOUTUBE_PROXY_URL vào deploy/.env)" if not YOUTUBE_PROXY_URL else ""
            print(f"         ✗ InnerTube bị chặn: {reason}{hint}")
        else:
            print(f"         ✗ InnerTube: {reason}")
        return None

    tracks = (
        data.get("captions", {})
        .get("playerCaptionsTracklistRenderer", {})
        .get("captionTracks", [])
    )
    if not tracks:
        print("         ✗ InnerTube: video không có caption track")
        return None

    picked = _pick_caption_track(tracks)
    if not picked:
        return None
    track, is_auto = picked
    base_url = track.get("baseUrl")
    if not base_url:
        return None

    lang = track.get("languageCode", "en")
    try:
        sub_resp = session.get(base_url, timeout=20)
        sub_resp.raise_for_status()
    except Exception as e:
        print(f"         ✗ InnerTube timedtext lỗi: {e}")
        return None

    segments = _parse_subtitle_payload(sub_resp.text, "xml")
    result = _segments_to_transcript(video, segments, lang, is_auto, "innertube")
    if result:
        return result
    print("         ✗ InnerTube: parse timedtext rỗng")
    return None


# ─── Strategy 2: youtube-transcript-api ──────────────────────────────────────

def _fetch_via_transcript_api(video: VideoResult) -> VideoTranscript | None:
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        from youtube_transcript_api.proxies import GenericProxyConfig
    except ImportError:
        print("         ✗ Thiếu youtube-transcript-api")
        return None

    try:
        if YOUTUBE_PROXY_URL:
            api = YouTubeTranscriptApi(
                proxy_config=GenericProxyConfig(
                    http_url=YOUTUBE_PROXY_URL,
                    https_url=YOUTUBE_PROXY_URL,
                )
            )
        else:
            api = YouTubeTranscriptApi()

        fetched = api.fetch(video.video_id, languages=tuple(EN_LANGS))
    except Exception as e:
        lines = [ln.strip() for ln in str(e).splitlines() if ln.strip()]
        msg = (lines[0] if lines else str(e))[:120]
        if "blocking requests from your IP" in str(e).lower() and not YOUTUBE_PROXY_URL:
            msg += " → cần YOUTUBE_PROXY_URL"
        print(f"         ✗ transcript-api: {msg}")
        return None

    segments = []
    is_auto = False
    lang = "en"

    snippets = getattr(fetched, "snippets", None) or list(fetched)
    for snip in snippets:
        text = getattr(snip, "text", None) or snip.get("text", "")
        start = getattr(snip, "start", None) or snip.get("start", 0)
        duration = getattr(snip, "duration", None) or snip.get("duration", 0)
        if text.strip():
            segments.append(TranscriptSegment(
                text=text.strip(),
                start=round(float(start), 2),
                duration=round(float(duration), 2),
            ))

    if hasattr(fetched, "is_generated"):
        is_auto = bool(fetched.is_generated)
    if hasattr(fetched, "language_code"):
        lang = fetched.language_code

    return _segments_to_transcript(video, segments, lang, is_auto, "transcript-api")


# ─── Strategy 3: yt-dlp ──────────────────────────────────────────────────────

def _ydl_opts(player_client: str | None = None) -> dict:
    opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
    }
    if player_client:
        opts["extractor_args"] = {"youtube": {"player_client": [player_client]}}
    if YOUTUBE_PROXY_URL:
        opts["proxy"] = YOUTUBE_PROXY_URL
    if YOUTUBE_COOKIES_FILE:
        opts["cookiefile"] = YOUTUBE_COOKIES_FILE
    return opts


def _pick_subtitle_url(info: dict) -> tuple[str, str, bool] | None:
    for is_auto, key in ((False, "subtitles"), (True, "automatic_captions")):
        tracks = info.get(key, {})
        for lang in EN_LANGS:
            if lang not in tracks:
                continue
            for fmt in tracks[lang]:
                ext = fmt.get("ext", "")
                url = fmt.get("url")
                if url and ext in SUBTITLE_EXTS:
                    return url, lang, is_auto
        for lang, formats in tracks.items():
            if not lang.startswith("en"):
                continue
            for fmt in formats:
                ext = fmt.get("ext", "")
                url = fmt.get("url")
                if url and ext in SUBTITLE_EXTS:
                    return url, lang, is_auto
    return None


def _fetch_via_ytdlp(session: requests.Session, video: VideoResult) -> VideoTranscript | None:
    url = f"https://www.youtube.com/watch?v={video.video_id}"
    clients = ["android", "ios", "tv_embedded", "web", None]

    for client in clients:
        try:
            with yt_dlp.YoutubeDL(_ydl_opts(client)) as ydl:
                info = ydl.extract_info(url, download=False)
        except Exception:
            continue

        picked = _pick_subtitle_url(info)
        if not picked:
            continue

        sub_url, lang, is_auto = picked
        ext = next(
            (f.get("ext") for f in (info.get("subtitles") or info.get("automatic_captions") or {}).get(lang, [])
             if f.get("url") == sub_url),
            "json3",
        )
        try:
            sub_resp = session.get(sub_url, timeout=20)
            sub_resp.raise_for_status()
        except Exception:
            continue

        segments = _parse_subtitle_payload(sub_resp.text, ext)
        result = _segments_to_transcript(
            video, segments, lang, is_auto, f"yt-dlp:{client or 'default'}"
        )
        if result:
            return result

    print("         ✗ yt-dlp: không lấy được phụ đề")
    return None


# ─── Main fetch orchestrator ─────────────────────────────────────────────────

def _fetch_transcript(video: VideoResult) -> VideoTranscript | None:
    session = _http_session()

    for name, fn in (
        ("InnerTube", lambda: _fetch_via_innertube(session, video)),
        ("transcript-api", lambda: _fetch_via_transcript_api(video)),
        ("yt-dlp", lambda: _fetch_via_ytdlp(session, video)),
    ):
        result = fn()
        if result:
            return result

    return None


def get_subtitles(topic: str) -> list[VideoTranscript]:
    videos = load_step1(topic)
    print(f"  Đọc được {len(videos)} video từ Bước 1")
    if YOUTUBE_PROXY_URL:
        print("  Proxy: bật (YOUTUBE_PROXY_URL)")
    else:
        print("  Proxy: tắt — trên VPS có thể cần YOUTUBE_PROXY_URL")

    transcripts = []
    failed = 0

    for i, video in enumerate(videos, 1):
        print(f"  [{i}/{len(videos)}] {video.title[:55]}")
        result = _fetch_transcript(video)
        if result:
            word_count = len(result.full_text.split())
            tag = "auto" if result.is_generated else "manual"
            print(
                f"         ✓ [{result.source}|{tag}|{result.language}] "
                f"{len(result.segments)} segments · ~{word_count} từ"
            )
            transcripts.append(result)
        else:
            failed += 1

    if failed:
        print(f"  ⚠ {failed}/{len(videos)} video không lấy được phụ đề")

    return transcripts


# ─── Save / Load ──────────────────────────────────────────────────────────────

def save_results(transcripts: list[VideoTranscript], topic: str) -> Path:
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


if __name__ == "__main__":
    topic = sys.argv[1] if len(sys.argv) > 1 else "Technology and Society"

    print(f"\n{'='*60}")
    print(f"  Bước 2 — Lấy subtitle")
    print(f"  Topic: {topic}")
    print(f"{'='*60}\n")

    results = get_subtitles(topic)

    if not results:
        print("\nKhông lấy được transcript nào.")
        if not YOUTUBE_PROXY_URL:
            print("Gợi ý VPS: thêm YOUTUBE_PROXY_URL=http://user:pass@host:port vào deploy/.env")
        sys.exit(1)

    out_path = save_results(results, topic)
    print(f"\n Lấy được {len(results)} transcript → {out_path.name}")

    print(f"\n--- Mẫu transcript ({results[0].title[:40]}) ---")
    for seg in results[0].segments[:3]:
        print(f"  [{seg.start:.1f}s] {seg.text}")
