"""Quick test: yt-dlp vs youtube-transcript-api on current host."""
import sys

VIDEO_ID = sys.argv[1] if len(sys.argv) > 1 else "BFpUuK1MOBU"
URL = f"https://www.youtube.com/watch?v={VIDEO_ID}"

print("=== yt-dlp (default) ===")
try:
    import yt_dlp

    with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True, "skip_download": True}) as ydl:
        info = ydl.extract_info(URL, download=False)
    subs = list((info.get("subtitles") or {}).keys())
    print(f"OK subtitles: {subs[:5]}")
except Exception as e:
    print(f"FAIL: {e}")

print("\n=== youtube-transcript-api ===")
try:
    from youtube_transcript_api import YouTubeTranscriptApi

    segments = YouTubeTranscriptApi().fetch(VIDEO_ID)
    print(f"OK segments: {len(segments)}")
except Exception as e:
    print(f"FAIL: {e}")
