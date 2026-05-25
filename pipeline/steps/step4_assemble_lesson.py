"""
Bước 4 — Tổng hợp dữ liệu từ Bước 1 + 3 thành Lesson + FlashcardSet seed.

Input : output/step1_<slug>.json, output/step3_<slug>.json
Output: output/step4_<slug>.json

Mỗi video (Bước 1) kết hợp với nội dung đã extract (Bước 3) thành 1 Lesson:
  - 1 video (videoUrl, duration, thumbnailUrl từ Bước 1)
  - vocabularies và grammars ở cấp lesson, kèm timestamp liên kết với video đó
  - Flashcards từ vocabulary của video đó

Từ đồng nghĩa lấy từ Free Dictionary API (miễn phí, không cần key).
"""

import re
import sys
import json
import time
import requests
from pathlib import Path
from dataclasses import dataclass, asdict

sys.path.insert(0, str(Path(__file__).parent.parent))

from steps.step1_find_videos import load_results as load_step1
from steps.step3_extract_content import (
    VocabularyItem, GrammarItem,
    load_results as load_step3,
)


# ─── Free Dictionary API ──────────────────────────────────────────────────────

_FREE_DICT_URL = "https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
_synonym_cache: dict[str, list[str]] = {}


def _fetch_synonyms(word: str, max_synonyms: int = 4) -> list[str]:
    """
    Lấy từ đồng nghĩa từ Free Dictionary API (freeDictionaryAPI.com).
    Hoàn toàn miễn phí, không cần API key.
    Trả về list rỗng nếu không tìm thấy hoặc lỗi mạng.
    """
    key = word.lower().strip()
    if key in _synonym_cache:
        return _synonym_cache[key]

    try:
        resp = requests.get(
            _FREE_DICT_URL.format(word=key),
            timeout=8,
        )
        if resp.status_code != 200:
            _synonym_cache[key] = []
            return []

        data = resp.json()
        synonyms: list[str] = []

        for entry in data:
            for meaning in entry.get("meanings", []):
                synonyms.extend(meaning.get("synonyms", []))
                for defn in meaning.get("definitions", []):
                    synonyms.extend(defn.get("synonyms", []))

        seen = set()
        unique = []
        for s in synonyms:
            sl = s.lower()
            if sl != key and sl not in seen:
                seen.add(sl)
                unique.append(s)

        result = unique[:max_synonyms]
        _synonym_cache[key] = result
        return result

    except Exception:
        _synonym_cache[key] = []
        return []


# ─── Data models (khớp với NestJS schema) ────────────────────────────────────

@dataclass
class LessonVideo:
    title:        str
    url:          str
    duration:     int     # giây (từ step1 duration_sec)
    thumbnailUrl: str     # URL thumbnail (từ step1 thumbnail)


@dataclass
class LessonVocabulary:
    word:            str
    pronunciation:   str
    definition:      str
    examples:        list[str]
    translation:     str
    timestamp:       float   # giây trong video — liên kết với video đó
    contextSentence: str


@dataclass
class LessonGrammar:
    title:           str
    explanation:     str
    examples:        list[str]
    structure:       str
    timestamp:       float   # giây trong video — liên kết với video đó
    contextSentence: str


@dataclass
class LessonSeed:
    title:        str
    targetBand:   str
    videos:       list[LessonVideo]        # luôn đúng 1 video
    vocabularies: list[LessonVocabulary]   # vocab của video đó, kèm timestamp
    grammars:     list[LessonGrammar]      # grammar của video đó, kèm timestamp
    notesContent: str


@dataclass
class FlashcardSeed:
    frontContent: str   # từ vựng
    backContent:  str   # nghĩa VI · IPA · ví dụ · đồng nghĩa


@dataclass
class FlashcardSetSeed:
    title:       str
    description: str
    cards:       list[FlashcardSeed]


@dataclass
class Step4Result:
    topic:         str
    target_band:   str
    lesson:        LessonSeed
    flashcard_set: FlashcardSetSeed


# ─── Deduplication ────────────────────────────────────────────────────────────

def _dedup_vocabulary(items: list[VocabularyItem], max_items: int = 20) -> list[LessonVocabulary]:
    seen: dict[str, LessonVocabulary] = {}
    for v in items:
        key = v.word.lower().strip()
        if key in seen:
            merged = list(dict.fromkeys(seen[key].examples + v.examples))
            seen[key].examples = merged[:3]
        else:
            seen[key] = LessonVocabulary(
                word=v.word,
                pronunciation=v.pronunciation,
                definition=v.definition,
                examples=v.examples[:2],
                translation=v.translation,
                timestamp=v.timestamp,
                contextSentence=v.context_sentence,
            )
    return list(seen.values())[:max_items]


def _dedup_grammar(items: list[GrammarItem], max_items: int = 10) -> list[LessonGrammar]:
    seen: dict[str, LessonGrammar] = {}
    for g in items:
        key = g.title.lower().strip()
        if key not in seen:
            seen[key] = LessonGrammar(
                title=g.title,
                explanation=g.explanation,
                examples=g.examples[:2],
                structure=g.structure,
                timestamp=g.timestamp,
                contextSentence=g.context_sentence,
            )
    return list(seen.values())[:max_items]


# ─── Build flashcards ─────────────────────────────────────────────────────────

def _build_flashcards(vocabulary: list[LessonVocabulary]) -> list[FlashcardSeed]:
    """
    Mặt trước: từ vựng
    Mặt sau  : nghĩa tiếng Việt | cách đọc IPA | ví dụ trong câu | từ đồng nghĩa
    Từ đồng nghĩa lấy từ Free Dictionary API (miễn phí).
    """
    cards = []
    total = len(vocabulary)

    for i, v in enumerate(vocabulary, 1):
        print(f"    [{i}/{total}] Lấy từ đồng nghĩa: {v.word}")
        synonyms = _fetch_synonyms(v.word)
        time.sleep(0.3)   # lịch sự với server public

        back_parts = [
            f"<p><strong>Nghĩa:</strong> {v.translation}</p>",
            f"<p><strong>Phát âm:</strong> {v.pronunciation}</p>",
        ]
        if v.examples:
            back_parts.append(f"<p><em>Ví dụ:</em> {v.examples[0]}</p>")
        if synonyms:
            back_parts.append(f"<p><strong>Đồng nghĩa:</strong> {', '.join(synonyms)}</p>")

        cards.append(FlashcardSeed(
            frontContent=f"<p>{v.word}</p>",
            backContent="".join(back_parts),
        ))

    return cards


# ─── Main step function ───────────────────────────────────────────────────────

def assemble_lesson(topic: str, target_band: str = "BAND_6_0") -> list[Step4Result]:
    """
    Với mỗi video đã extract nội dung (Bước 3), tạo 1 LessonSeed riêng:
      - 1 video (videoUrl, duration, thumbnailUrl từ Bước 1)
      - vocabularies + grammars kèm timestamp liên kết với video đó
    Trả về list[Step4Result], mỗi phần tử ứng với 1 video.
    """
    videos_raw = load_step1(topic)
    contents   = load_step3(topic)

    content_by_id = {c.video_id: c for c in contents}
    print(f"  {len(videos_raw)} video (Bước 1) · {len(contents)} video có nội dung (Bước 3)")

    results: list[Step4Result] = []

    for idx, video in enumerate(videos_raw, 1):
        if video.video_id not in content_by_id:
            print(f"  [{idx}] Bỏ qua (không có nội dung extract): {video.title[:55]}")
            continue

        content = content_by_id[video.video_id]
        print(f"  [{idx}/{len(videos_raw)}] {video.title[:55]}")

        lesson_video = LessonVideo(
            title=video.title,
            url=video.url,
            duration=video.duration_sec,
            thumbnailUrl=video.thumbnail,
        )

        vocabulary = _dedup_vocabulary(content.vocabulary)
        grammar    = _dedup_grammar(content.grammar)
        print(f"    Vocab: {len(vocabulary)} · Grammar: {len(grammar)}")

        band_label = {"BAND_5_0": "5.0", "BAND_6_0": "6.0", "BAND_7_PLUS": "7.0+"}.get(target_band, "")
        lesson = LessonSeed(
            title=video.title,
            targetBand=target_band,
            videos=[lesson_video],
            vocabularies=vocabulary,
            grammars=grammar,
            notesContent="",
        )

        print(f"    Tạo flashcards...")
        cards = _build_flashcards(vocabulary)
        flashcard_set = FlashcardSetSeed(
            title=f"Từ vựng: {video.title[:50]}",
            description=f"Bộ flashcard từ video '{video.title}'",
            cards=cards,
        )

        results.append(Step4Result(
            topic=topic,
            target_band=target_band,
            lesson=lesson,
            flashcard_set=flashcard_set,
        ))

    return results


# ─── Save / Load ──────────────────────────────────────────────────────────────

def save_results(results: list[Step4Result], topic: str) -> Path:
    slug = re.sub(r"[^a-z0-9]+", "_", topic.lower()).strip("_")
    out_path = Path(__file__).parent.parent / "output" / f"step4_{slug}.json"
    out_path.parent.mkdir(exist_ok=True)

    payload = {
        "topic":   topic,
        "count":   len(results),
        "lessons": [asdict(r) for r in results],
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    return out_path


def load_results(topic: str) -> list[Step4Result]:
    slug = re.sub(r"[^a-z0-9]+", "_", topic.lower()).strip("_")
    path = Path(__file__).parent.parent / "output" / f"step4_{slug}.json"
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    results = []
    for item in data["lessons"]:
        ld = item["lesson"]
        fs = item["flashcard_set"]
        results.append(Step4Result(
            topic=item["topic"],
            target_band=item["target_band"],
            lesson=LessonSeed(
                title=ld["title"],
                targetBand=ld["targetBand"],
                videos=[LessonVideo(**v) for v in ld["videos"]],
                vocabularies=[LessonVocabulary(**v) for v in ld["vocabularies"]],
                grammars=[LessonGrammar(**g) for g in ld["grammars"]],
                notesContent=ld["notesContent"],
            ),
            flashcard_set=FlashcardSetSeed(
                title=fs["title"],
                description=fs["description"],
                cards=[FlashcardSeed(**c) for c in fs["cards"]],
            ),
        ))
    return results


# ─── CLI quick-test ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    topic       = sys.argv[1] if len(sys.argv) > 1 else "Technology and Society"
    target_band = sys.argv[2] if len(sys.argv) > 2 else "BAND_6_0"

    print(f"\n{'='*60}")
    print(f"  Bước 4 — Tổng hợp Lesson + FlashcardSet")
    print(f"  Topic      : {topic}")
    print(f"  Target band: {target_band}")
    print(f"{'='*60}\n")

    results  = assemble_lesson(topic, target_band)
    out_path = save_results(results, topic)

    print(f"\n Tổng hợp {len(results)} bài học → {out_path.name}")
    for i, r in enumerate(results, 1):
        print(f"  [{i}] {r.lesson.title[:55]}")
        print(f"       Vocab: {len(r.lesson.vocabularies)} · Grammar: {len(r.lesson.grammars)} · Flashcards: {len(r.flashcard_set.cards)}")

    if results:
        first = results[0]
        print(f"\n--- Mẫu vocab (bài học 1) ---")
        for v in first.lesson.vocabularies[:3]:
            print(f"  • [{v.timestamp:.0f}s] {v.word} {v.pronunciation}")
            print(f"    {v.definition[:70]}")
        print(f"\n--- Mẫu grammar (bài học 1) ---")
        for g in first.lesson.grammars[:2]:
            print(f"  • [{g.timestamp:.0f}s] {g.title}")
            print(f"    {g.structure}")
