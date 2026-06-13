"""Test InnerTube ANDROID player API for caption tracks (VPS diagnostic)."""
import json
import sys
import requests

VIDEO_ID = sys.argv[1] if len(sys.argv) > 1 else "BFpUuK1MOBU"
INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
URL = f"https://www.youtube.com/youtubei/v1/player?key={INNERTUBE_KEY}&prettyPrint=false"

payload = {
    "context": {
        "client": {
            "clientName": "ANDROID",
            "clientVersion": "20.10.38",
            "hl": "en",
            "gl": "US",
        }
    },
    "videoId": VIDEO_ID,
}

headers = {
    "Content-Type": "application/json",
    "User-Agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 14)",
}

resp = requests.post(URL, json=payload, headers=headers, timeout=20)
print("status:", resp.status_code)
data = resp.json()

playability = data.get("playabilityStatus", {})
print("playability:", playability.get("status"), playability.get("reason", ""))

captions = data.get("captions", {})
tracks = captions.get("playerCaptionsTracklistRenderer", {}).get("captionTracks", [])
print("caption tracks:", len(tracks))
for t in tracks[:3]:
    print(" -", t.get("languageCode"), t.get("kind", "manual"), t.get("baseUrl", "")[:80])

if tracks:
    r = requests.get(tracks[0]["baseUrl"] + "&fmt=json3", timeout=20)
    print("timedtext status:", r.status_code, "bytes:", len(r.content))
    if r.ok:
        try:
            events = r.json().get("events", [])
            print("events:", len(events))
        except Exception as e:
            print("parse err:", e)
