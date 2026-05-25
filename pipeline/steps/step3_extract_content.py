"""
Bước 3 — Dùng Gemini AI để extract từ vựng và ngữ pháp từ transcript.

Input : output/step2_<slug>.json
Output: output/step3_<slug>.json

Mỗi video transcript → Gemini trích xuất:
  - 10-15 vocabulary items (word, IPA, definition, translation, examples, context)
  - 5-8 grammar items (title, explanation, structure, examples, context)
"""

import re
import sys
import json
import time
from pathlib import Path
from dataclasses import dataclass, asdict

sys.path.insert(0, str(Path(__file__).parent.parent))

from openai import OpenAI
from config import OPENROUTER_API_KEY, OPENROUTER_MODEL
from steps.step2_get_subtitles import VideoTranscript, TranscriptSegment
from steps.step2_get_subtitles import load_results as load_step2


# ─── Data models ─────────────────────────────────────────────────────────────

@dataclass
class VocabularyItem:
    word:             str
    pronunciation:    str        # IPA, VD: /ˌtɛknəˈlɒdʒi/
    definition:       str        # định nghĩa tiếng Anh
    translation:      str        # dịch tiếng Việt
    examples:         list[str]  # 2 câu ví dụ
    context_sentence: str        # câu trong transcript chứa từ này
    timestamp:        float      # giây trong video (gần đúng)


@dataclass
class GrammarItem:
    title:            str        # VD: "Passive Voice for Formal Writing"
    explanation:      str        # giải thích tiếng Anh
    structure:        str        # VD: "Subject + be + V3/ed"
    examples:         list[str]  # 2 câu ví dụ
    context_sentence: str        # câu trong transcript minh hoạ
    timestamp:        float      # giây trong video (gần đúng)


@dataclass
class ExtractedContent:
    video_id:   str
    title:      str
    url:        str
    vocabulary: list[VocabularyItem]
    grammar:    list[GrammarItem]


# ─── Build transcript text cho Gemini ────────────────────────────────────────

def _build_timestamped_text(transcript: VideoTranscript, max_words: int = 6000) -> str:
    """
    Ghép các segment thành text có timestamp để Gemini tham chiếu.
    VD: "[12.5s] Technology has fundamentally changed..."
    """
    lines = []
    word_count = 0

    for seg in transcript.segments:
        words = seg.text.split()
        word_count += len(words)
        if word_count > max_words:
            break
        lines.append(f"[{seg.start:.1f}s] {seg.text}")

    return "\n".join(lines)


# ─── Gemini prompt ────────────────────────────────────────────────────────────

_PROMPT_TEMPLATE = """You are an expert IELTS Writing Task 2 teacher. Analyze the following English video transcript and extract educational content for IELTS Band 6.0–7.0 students.

Video title: {title}

Transcript (with timestamps):
{transcript_text}

Extract and return a JSON object with exactly this structure:
{{
  "vocabulary": [
    {{
      "word": "the word or multi-word phrase",
      "pronunciation": "IPA notation, e.g. /ˌtɛknəˈlɒdʒi/",
      "definition": "clear English definition suitable for IELTS",
      "translation": "Vietnamese translation",
      "examples": ["example sentence 1", "example sentence 2"],
      "context_sentence": "exact sentence from the transcript where this word/phrase appears",
      "timestamp": 12.5
    }}
  ],
  "grammar": [
    {{
      "title": "descriptive title, e.g. Passive Voice for Academic Writing",
      "explanation": "clear English explanation of the grammar point",
      "structure": "grammar pattern, e.g. Subject + have/has + been + V-ing",
      "examples": ["example sentence 1", "example sentence 2"],
      "context_sentence": "sentence from the transcript that demonstrates this grammar point",
      "timestamp": 45.2
    }}
  ]
}}

Rules:
- Extract 10–15 vocabulary items: choose academic/IELTS-relevant words and collocations
- Extract 5–8 grammar items: focus on structures useful for IELTS Writing Task 2
- Use timestamps from the transcript (the numbers in brackets like [12.5s])
- Return ONLY valid JSON — no markdown, no code fences, no explanation text
"""


# ─── Call Gemini ──────────────────────────────────────────────────────────────

def _extract_with_llm(transcript: VideoTranscript, client: OpenAI) -> ExtractedContent | None:
    """Gửi transcript lên OpenRouter và parse kết quả JSON trả về."""
    transcript_text = _build_timestamped_text(transcript)
    prompt = _PROMPT_TEMPLATE.format(
        title=transcript.title,
        transcript_text=transcript_text,
    )

    try:
        response = client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
        )
        raw = response.choices[0].message.content.strip()
    except Exception as e:
        print(f"         ✗ OpenRouter API lỗi: {e}")
        return None

    # Xoá code fences nếu model trả về ```json ... ```
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"         ✗ Không parse được JSON: {e}")
        print(f"           Raw (100 ký tự đầu): {raw[:100]}")
        return None

    vocab_items = [
        VocabularyItem(
            word=v.get("word", ""),
            pronunciation=v.get("pronunciation", ""),
            definition=v.get("definition", ""),
            translation=v.get("translation", ""),
            examples=v.get("examples", []),
            context_sentence=v.get("context_sentence", ""),
            timestamp=float(v.get("timestamp", 0)),
        )
        for v in data.get("vocabulary", [])
        if v.get("word")
    ]

    grammar_items = [
        GrammarItem(
            title=g.get("title", ""),
            explanation=g.get("explanation", ""),
            structure=g.get("structure", ""),
            examples=g.get("examples", []),
            context_sentence=g.get("context_sentence", ""),
            timestamp=float(g.get("timestamp", 0)),
        )
        for g in data.get("grammar", [])
        if g.get("title")
    ]

    return ExtractedContent(
        video_id=transcript.video_id,
        title=transcript.title,
        url=transcript.url,
        vocabulary=vocab_items,
        grammar=grammar_items,
    )


# ─── Main step function ───────────────────────────────────────────────────────

def extract_content(topic: str) -> list[ExtractedContent]:
    """Đọc kết quả Bước 2 và extract vocab/grammar bằng OpenRouter."""
    if not OPENROUTER_API_KEY:
        raise ValueError(
            "Thiếu OPENROUTER_API_KEY. Điền vào pipeline/.env"
        )

    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY,
    )
    print(f"  Model: {OPENROUTER_MODEL}")

    transcripts = load_step2(topic)
    print(f"  Đọc được {len(transcripts)} transcript từ Bước 2")

    results = []
    for i, transcript in enumerate(transcripts, 1):
        print(f"  [{i}/{len(transcripts)}] {transcript.title[:55]}")
        content = _extract_with_llm(transcript, client)
        if content:
            print(f"         ✓ {len(content.vocabulary)} vocab · {len(content.grammar)} grammar")
            results.append(content)
        else:
            print(f"         ✗ Bỏ qua video này")

        # Tránh rate limit (free tier: 15 req/phút)
        if i < len(transcripts):
            time.sleep(4)

    return results


# ─── Save / Load ──────────────────────────────────────────────────────────────

def save_results(contents: list[ExtractedContent], topic: str) -> Path:
    """Lưu kết quả ra output/step3_<slug>.json."""
    slug = re.sub(r"[^a-z0-9]+", "_", topic.lower()).strip("_")
    out_path = Path(__file__).parent.parent / "output" / f"step3_{slug}.json"
    out_path.parent.mkdir(exist_ok=True)

    payload = {
        "topic":    topic,
        "count":    len(contents),
        "contents": [asdict(c) for c in contents],
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    return out_path


def load_results(topic: str) -> list[ExtractedContent]:
    """Đọc lại kết quả đã lưu từ output/step3_<slug>.json."""
    slug = re.sub(r"[^a-z0-9]+", "_", topic.lower()).strip("_")
    path = Path(__file__).parent.parent / "output" / f"step3_{slug}.json"
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return [
        ExtractedContent(
            **{
                **c,
                "vocabulary": [VocabularyItem(**v) for v in c["vocabulary"]],
                "grammar":    [GrammarItem(**g) for g in c["grammar"]],
            }
        )
        for c in data["contents"]
    ]


# ─── CLI quick-test ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    topic = sys.argv[1] if len(sys.argv) > 1 else "Technology and Society"

    print(f"\n{'='*60}")
    print(f"  Bước 3 — Extract vocab & grammar bằng Gemini AI")
    print(f"  Topic: {topic}")
    print(f"{'='*60}\n")

    results = extract_content(topic)

    if not results:
        print("Không extract được nội dung nào.")
        sys.exit(1)

    out_path = save_results(results, topic)
    print(f"\n Xử lý {len(results)} video → {out_path.name}")

    # In mẫu kết quả đầu tiên
    first = results[0]
    print(f"\n--- Mẫu kết quả: {first.title[:40]} ---")
    print(f"\nVocabulary ({len(first.vocabulary)} từ):")
    for v in first.vocabulary[:3]:
        print(f"  • {v.word} {v.pronunciation}")
        print(f"    Def : {v.definition[:70]}")
        print(f"    Viet: {v.translation}")
        print(f"    Ctx : {v.context_sentence[:70]}")
    print(f"\nGrammar ({len(first.grammar)} điểm):")
    for g in first.grammar[:2]:
        print(f"  • {g.title}")
        print(f"    {g.structure}")
        print(f"    {g.explanation[:80]}")
