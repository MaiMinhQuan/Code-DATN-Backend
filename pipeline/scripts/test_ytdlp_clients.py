import sys
import yt_dlp

VIDEO_ID = sys.argv[1] if len(sys.argv) > 1 else "BFpUuK1MOBU"
URL = f"https://www.youtube.com/watch?v={VIDEO_ID}"

for client in ["android", "ios", "tv_embedded", "web", "mweb"]:
    opts = {
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
        "extractor_args": {"youtube": {"player_client": [client]}},
    }
    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(URL, download=False)
        subs = list((info.get("subtitles") or {}).keys())[:3]
        auto = list((info.get("automatic_captions") or {}).keys())[:3]
        print(f"client={client}: OK subs={subs} auto={auto}")
    except Exception as e:
        print(f"client={client}: FAIL {str(e)[:120]}")
