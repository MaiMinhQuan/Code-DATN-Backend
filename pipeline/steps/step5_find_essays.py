"""
Bước 5 — Tìm và phân tích Sample Essays từ web (Band 7.0+).

Phase 1 (--phase scrape):
  Tìm URL qua DuckDuckGo → scrape nội dung → lưu candidates để duyệt.
  Output: output/step5_candidates_<slug>.json

  Sau đó mở file, set "approved": true cho các bài muốn giữ,
  có thể sửa question/essay nếu scrape chưa chuẩn.

Phase 2 (--phase analyze):
  Đọc candidates approved → AI phân tích điểm hay → lưu kết quả cuối.
  Output: output/step5_<slug>.json

Cách chạy:
  python steps/step5_find_essays.py "Technology and Society" --phase scrape
  python steps/step5_find_essays.py "Technology and Society" --phase analyze
"""

import re
import sys
import json
import time
import argparse
import requests
from pathlib import Path
from dataclasses import dataclass, asdict, field

sys.path.insert(0, str(Path(__file__).parent.parent))

from bs4 import BeautifulSoup
from openai import OpenAI
from config import OPENROUTER_API_KEY, OPENROUTER_MODEL, HTTP_PROXY_URL

# Proxy dùng cho tất cả HTTP request scraping bài mẫu
_PROXIES = {"http": HTTP_PROXY_URL, "https": HTTP_PROXY_URL} if HTTP_PROXY_URL else None



# ─── Màu theo loại annotation (khớp với frontend) ────────────────────────────

_HIGHLIGHT_COLOR = {
    "VOCABULARY": "#fbbf24",
    "GRAMMAR":    "#818cf8",
    "STRUCTURE":  "#34d399",
    "ARGUMENT":   "#f87171",
}

# ─── Data models ─────────────────────────────────────────────────────────────

@dataclass
class EssayCandidate:
    """Bài essay tìm được từ web — chờ duyệt."""
    url:            str
    source:         str          # tên site (zim.vn, study4.com, ...)
    question:       str          # IELTS question prompt
    essay:          str          # nội dung bài viết
    band_score:     float        # band score tìm được từ trang (0 = không xác định)
    approved:       bool = False # bạn set True sau khi duyệt


@dataclass
class HighlightAnnotation:
    text:          str
    highlightType: str   # VOCABULARY | GRAMMAR | STRUCTURE | ARGUMENT
    explanation:   str
    color:         str


@dataclass
class SampleEssaySeed:
    title:                str
    questionPrompt:       str
    targetBand:           str
    outlineContent:       str    # HTML
    fullEssayContent:     str
    highlightAnnotations: list[HighlightAnnotation]
    overallBandScore:     float
    authorName:           str


@dataclass
class ExamQuestionSeed:
    title:            str
    questionPrompt:   str
    suggestedOutline: str
    difficultyLevel:  str
    tags:             list[str]


@dataclass
class Step5Result:
    topic:          str
    target_band:    str
    exam_questions: list[ExamQuestionSeed]
    sample_essays:  list[SampleEssaySeed]


# ─── PHASE 1: Tìm kiếm và scrape ─────────────────────────────────────────────

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}

# Các trang IELTS có listing page để scrape theo chủ đề.
# page_tpl: template URL trang thứ N (None = không có phân trang).
# link_selectors: CSS selectors thử lần lượt để tìm link bài viết.
_LISTING_SOURCES = [
    {
        "name": "howtodoielts.com",
        "listing": "https://howtodoielts.com/category/writing-task-2/",
        "page_tpl": None,
        "max_pages": 1,
        "link_selectors": ["h5.title a"],
    },
    {
        "name": "ieltsliz.com",
        "listing": "https://ieltsliz.com/ielts-writing-task-2/",
        "page_tpl": None,
        "max_pages": 1,
        "link_selectors": ["h2.entry-title a", "h3.entry-title a", ".entry-title a"],
    },
    {
        "name": "ieltsbuddy.com",
        "listing": "https://www.ieltsbuddy.com/ielts-essay.html",
        "page_tpl": None,
        "max_pages": 1,
        "link_selectors": ["div.essay-list a", "ul.essay-list a", "a[href*='essay']"],
    },
]

# Từ quá ngắn / quá chung không dùng để lọc
_STOP_WORDS = {"and", "the", "for", "with", "that", "this", "from", "are", "have", "not", "has"}


def _topic_keywords(topic: str) -> list[str]:
    """Tách topic thành các từ khóa có nghĩa (≥4 ký tự, không phải stop word)."""
    return [w.lower() for w in topic.split() if len(w) >= 4 and w.lower() not in _STOP_WORDS]


def _fetch_listing_links(source: dict) -> list[tuple[str, str]]:
    """
    Duyệt qua các trang listing của một source, trả về list (url, title).
    Dừng sớm khi gặp trang 404 hoặc không còn link bài viết.
    """
    all_links: list[tuple[str, str]] = []

    for page_num in range(1, source["max_pages"] + 1):
        if page_num == 1:
            page_url = source["listing"]
        elif source["page_tpl"]:
            page_url = source["page_tpl"].format(page_num)
        else:
            break

        try:
            resp = requests.get(page_url, headers=_HEADERS, timeout=15, proxies=_PROXIES)
            if resp.status_code == 404:
                break
            resp.raise_for_status()
        except Exception as e:
            print(f"      [!] Lỗi trang {page_num}: {e}")
            break

        soup = BeautifulSoup(resp.text, "lxml")

        # Thử từng selector cho đến khi tìm được link
        found: list[tuple[str, str]] = []
        for selector in source["link_selectors"]:
            tags = soup.select(selector)
            if tags:
                for a in tags:
                    href  = a.get("href", "").strip()
                    title = a.get_text(strip=True)
                    if href and title and href.startswith("http"):
                        found.append((href, title))
                break

        if not found:
            break  # Hết trang

        all_links.extend(found)
        time.sleep(1)

    return all_links


def _find_essays_from_listing(topic: str, max_urls: int = 15) -> list[tuple[str, str]]:
    """
    Scrape listing pages của các trusted sites, lọc bài liên quan đến topic.
    Trả về list (url, source_name).
    """
    keywords = _topic_keywords(topic)
    if not keywords:
        keywords = [topic.lower()]

    results: list[tuple[str, str]] = []

    for source in _LISTING_SOURCES:
        print(f"    Đang duyệt {source['name']}...")
        links = _fetch_listing_links(source)
        print(f"      Tìm được {len(links)} bài, lọc theo topic...")

        for url, title in links:
            title_lower = title.lower()
            url_lower   = url.lower()
            if any(kw in title_lower or kw in url_lower for kw in keywords):
                results.append((url, source["name"]))
                if len(results) >= max_urls:
                    return results

        time.sleep(1)

    return results


def _extract_band_score(url: str) -> float:
    """
    howtodoielts.com không ghi band score trên trang.
    Thử đọc từ URL slug (vd: "band-8-0", "band-7-5").
    Trả về 0.0 nếu không tìm thấy.
    """
    m = re.search(r"band[-_](\d+)[-_]?(\d)?", url, re.IGNORECASE)
    if m:
        integer = m.group(1)
        decimal = m.group(2) or "0"
        try:
            score = float(f"{integer}.{decimal}")
            if 5.0 <= score <= 9.0:
                return score
        except ValueError:
            pass
    return 0.0


def _extract_question_and_essay(soup: BeautifulSoup, source: str = "") -> tuple[str, str]:
    """
    Trích xuất (question, essay) từ trang bài mẫu.
    Hỗ trợ cấu trúc howtodoielts.com (dùng h2 làm anchor) và
    fallback generic cho các trang WordPress IELTS khác.
    """
    content = (
        soup.find("div", class_="entry-content")
        or soup.find("article")
        or soup.find("div", class_="post-content")
        or soup.find("div", class_="content")
    )
    if not content:
        return "", ""

    # ── howtodoielts.com: dùng h2.wp-block-heading làm anchor ─────────────
    h2 = content.find("h2", class_="wp-block-heading")
    if h2:
        question_parts: list[str] = []
        essay_parts:    list[str] = []
        collecting_essay = False

        for tag in h2.find_next_siblings():
            if tag.name == "h2":
                break
            if tag.name != "p":
                continue
            text = tag.get_text(strip=True)
            if not text or text == "﻿":
                continue
            has_strong = bool(tag.find("strong"))
            if not collecting_essay and has_strong:
                question_parts.append(text)
            else:
                collecting_essay = True
                if len(text.split()) >= 5:
                    essay_parts.append(text)

        question = " ".join(question_parts)
        essay    = "\n\n".join(essay_parts)
        if essay and len(essay.split()) >= 180:
            return question, essay

    # ── Generic fallback: tìm đoạn văn dài nhất làm essay ────────────────
    paragraphs = content.find_all("p")
    question_parts = []
    essay_parts    = []

    for p in paragraphs:
        text = p.get_text(strip=True)
        if not text or len(text) < 20:
            continue
        words = text.split()
        # Đoạn ngắn có chứa "?" thường là câu hỏi đề thi
        if len(words) < 60 and "?" in text and not question_parts:
            question_parts.append(text)
        elif len(words) >= 30:
            essay_parts.append(text)

    question = " ".join(question_parts)
    essay    = "\n\n".join(essay_parts)
    return question, essay


def _scrape_url(url: str, source: str) -> EssayCandidate | None:
    """Scrape một URL và trả về EssayCandidate hoặc None nếu thất bại."""
    try:
        resp = requests.get(url, headers=_HEADERS, timeout=12, proxies=_PROXIES)
        resp.raise_for_status()
        resp.encoding = resp.apparent_encoding
    except Exception as e:
        print(f"      ✗ Fetch lỗi: {e}")
        return None

    soup       = BeautifulSoup(resp.text, "lxml")
    band_score = _extract_band_score(url)
    question, essay = _extract_question_and_essay(soup, source)

    if not essay or len(essay.split()) < 180:
        print(f"      ✗ Không tìm được essay đủ dài")
        return None

    return EssayCandidate(
        url=url,
        source=source,
        question=question,
        essay=essay,
        band_score=band_score,
    )


def run_scrape(topic: str, max_essays: int = 8, manual_urls: list[str] | None = None) -> Path:
    """Phase 1: Tìm kiếm + scrape → lưu candidates để duyệt."""
    slug = re.sub(r"[^a-z0-9]+", "_", topic.lower()).strip("_")

    if manual_urls:
        print(f"\n  Dung {len(manual_urls)} URL thu cong")
        source_names = [s["name"] for s in _LISTING_SOURCES]
        urls = [(u, next((s for s in source_names if s in u), "manual")) for u in manual_urls]
    else:
        print(f"\n  Tim bai mau cho topic: '{topic}'")
        urls = _find_essays_from_listing(topic, max_urls=max_essays * 3)
        print(f"  Tim duoc {len(urls)} URL phu hop\n")

    if not urls:
        print("\n  [!] Khong tim duoc URL nao.")
        print("      Cung cap URL thu cong bang --urls:")
        print(f'      python steps/step5_find_essays.py "{topic}" --phase scrape')
        print('        --urls "https://howtodoielts.com/..." "https://ieltsliz.com/..."')
        out_path = Path(__file__).parent.parent / "output" / f"step5_candidates_{slug}.json"
        out_path.parent.mkdir(exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump({"topic": topic, "count": 0, "candidates": []}, f, ensure_ascii=False, indent=2)
        return out_path
    print()

    candidates = []
    seen_essays: set[str] = set()

    for url, source in urls:
        if len(candidates) >= max_essays:
            break

        print(f"  Scraping [{source}]: {url[:70]}")
        candidate = _scrape_url(url, source)
        if not candidate:
            continue

        # Bỏ qua bài trùng (so sánh 100 ký tự đầu của essay)
        key = candidate.essay[:100].strip()
        if key in seen_essays:
            print(f"      ✗ Trùng nội dung, bỏ qua")
            continue
        seen_essays.add(key)

        band_str = f"Band {candidate.band_score}" if candidate.band_score else "không rõ"
        words    = len(candidate.essay.split())
        print(f"      ✓ {band_str} · {words} từ · question: {'có' if candidate.question else 'không'}")
        candidates.append(candidate)
        time.sleep(1)   # lịch sự với server

    # Lưu file candidates
    slug     = re.sub(r"[^a-z0-9]+", "_", topic.lower()).strip("_")
    out_path = Path(__file__).parent.parent / "output" / f"step5_candidates_{slug}.json"
    out_path.parent.mkdir(exist_ok=True)

    payload = {
        "topic":      topic,
        "count":      len(candidates),
        "candidates": [asdict(c) for c in candidates],
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    print(f"\n   Lưu {len(candidates)} candidates → {out_path.name}")
    print(f"\n  ► Mở file và set \"approved\": true cho bài muốn phân tích.")
    print(f"    Có thể sửa trực tiếp question/essay nếu scrape chưa chính xác.")
    print(f"    Sau đó chạy: python steps/step5_find_essays.py \"{topic}\" --phase analyze")

    return out_path


# ─── PHASE 2: AI phân tích essays đã duyệt ───────────────────────────────────

_ANALYSIS_PROMPT = """You are an expert IELTS Writing Task 2 examiner analysing a sample essay.

Essay question:
{question}

Full essay:
{essay}

Your tasks:
1. Write an **outline** of this essay in Vietnamese (HTML format, using <p>, <ul>, <li>, <strong>, <em> tags).
   Include: essay type, stance, intro summary, body paragraph points, conclusion.

2. Identify **6–9 highlight annotations** — notable phrases that demonstrate Band 7+ writing techniques.
   For each highlight:
   - "text": the EXACT phrase as it appears in the essay (will be used for text search)
   - "highlightType": one of VOCABULARY | GRAMMAR | STRUCTURE | ARGUMENT
   - "explanation": detailed Vietnamese explanation of WHY this is a good IELTS technique,
     not just WHAT it means. Reference specific IELTS criteria. Min 2 sentences.

   Rules for highlights:
   - Each "text" must appear EXACTLY ONCE in the essay
   - No two "text" values should overlap or contain each other
   - Prefer shorter, precise phrases over long sentences when possible for VOCABULARY/GRAMMAR
   - For STRUCTURE/ARGUMENT, longer phrases showing the full technique are fine

3. Suggest an **exam question title**, **tags**, and a **Vietnamese HTML outline** for this question.
   The suggestedOutline must be written entirely in Vietnamese.
   Use only <p>, <ul>, <ol>, <li>, <strong>, <em> tags.
   Structure it as: loại bài (essay type), luận điểm chính (stance/thesis), tóm tắt mở bài, các luận điểm thân bài (body paragraphs), kết luận.

4. **Grade this essay** using the official IELTS Writing Task 2 four-criteria rubric:
   - Task Response (TR)
   - Coherence and Cohesion (CC)
   - Lexical Resource (LR)
   - Grammatical Range and Accuracy (GRA)
   Each criterion is scored 0–9 in 0.5 increments. The overall band score is the average rounded to the nearest 0.5.

Return ONLY valid JSON (no markdown fences):
{{
  "outlineContent": "<p>...</p>",
  "highlightAnnotations": [
    {{"text": "exact phrase", "highlightType": "VOCABULARY", "explanation": "..."}}
  ],
  "examTitle": "short title (max 8 words)",
  "suggestedOutline": "<p>...</p><ul><li>...</li></ul>",
  "difficultyLevel": "EASY|MEDIUM|HARD",
  "tags": ["tag1", "tag2", "tag3"],
  "bandScores": {{
    "taskResponse": 7.0,
    "coherenceCohesion": 7.0,
    "lexicalResource": 7.0,
    "grammaticalRangeAccuracy": 7.0
  }},
  "overallBandScore": 7.0
}}"""


def _call_ai(client: OpenAI, prompt: str) -> dict | None:
    try:
        response = client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
        )
        raw = response.choices[0].message.content.strip()
    except Exception as e:
        print(f"      ✗ API lỗi: {e}")
        return None

    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"      ✗ Không parse được JSON: {e}")
        print(f"        Raw (100 ký tự đầu): {raw[:100]}")
        return None


def _remove_overlaps(annotations: list[HighlightAnnotation], essay: str) -> list[HighlightAnnotation]:
    """Loại bỏ annotations chồng nhau (giữ cái xuất hiện trước trong essay)."""
    located = []
    for ann in annotations:
        idx = essay.find(ann.text)
        if idx == -1:
            continue
        located.append((idx, idx + len(ann.text), ann))

    located.sort(key=lambda x: x[0])

    result = []
    cursor = 0
    for start, end, ann in located:
        if start >= cursor:
            result.append(ann)
            cursor = end

    return result


def run_analyze(topic: str, target_band: str = "BAND_7_PLUS") -> Path:
    """Phase 2: Đọc candidates đã duyệt → AI phân tích → lưu kết quả cuối."""
    slug      = re.sub(r"[^a-z0-9]+", "_", topic.lower()).strip("_")
    cand_path = Path(__file__).parent.parent / "output" / f"step5_candidates_{slug}.json"

    if not cand_path.exists():
        raise FileNotFoundError(
            f"Chưa có file candidates. Chạy --phase scrape trước.\n  {cand_path}"
        )

    with open(cand_path, encoding="utf-8") as f:
        data = json.load(f)

    approved = [c for c in data["candidates"] if c.get("approved")]
    if not approved:
        print("  Không có candidate nào được approved — bỏ qua phân tích bài mẫu.")
        # Tạo file output rỗng để seed step không bị crash
        out_path = Path(__file__).parent.parent / "output" / f"step5_{slug}.json"
        empty_result = Step5Result(topic=topic, target_band=target_band, exam_questions=[], sample_essays=[])
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(asdict(empty_result), f, ensure_ascii=False, indent=2)
        return out_path

    print(f"  {len(approved)} candidates được approved")
    print(f"  Model: {OPENROUTER_MODEL}\n")

    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_API_KEY,
    )

    sample_essays: list[SampleEssaySeed]  = []
    exam_questions: list[ExamQuestionSeed] = []

    for i, cand in enumerate(approved, 1):
        print(f"  [{i}/{len(approved)}] Phân tích: {cand['url'][:60]}")

        prompt = _ANALYSIS_PROMPT.format(
            question=cand["question"] or "(question not found — infer from essay)",
            essay=cand["essay"],
        )

        result = _call_ai(client, prompt)
        if not result:
            print(f"      ✗ Bỏ qua")
            if i < len(approved):
                time.sleep(3)
            continue

        # Band score: ưu tiên AI estimate, fallback về scraping rồi về 0
        ai_band_score = result.get("overallBandScore") or cand.get("band_score") or 0.0
        try:
            ai_band_score = float(ai_band_score)
        except (TypeError, ValueError):
            ai_band_score = 0.0

        # Build highlight annotations
        raw_annotations = [
            HighlightAnnotation(
                text=a.get("text", ""),
                highlightType=a.get("highlightType", "VOCABULARY"),
                explanation=a.get("explanation", ""),
                color=_HIGHLIGHT_COLOR.get(a.get("highlightType", "VOCABULARY"), "#fbbf24"),
            )
            for a in result.get("highlightAnnotations", [])
            if a.get("text") and a.get("explanation")
        ]
        annotations = _remove_overlaps(raw_annotations, cand["essay"])

        word_count = len(cand["essay"].split())
        print(f"      ✓ {word_count} từ · {len(annotations)} annotations · Band {ai_band_score}")

        # Sample essay
        source = cand.get("source", "web")
        sample_essays.append(SampleEssaySeed(
            title=f"{result.get('examTitle', topic)} — Band {ai_band_score}",
            questionPrompt=cand["question"] or cand["essay"][:200],
            targetBand=target_band,
            outlineContent=result.get("outlineContent", ""),
            fullEssayContent=cand["essay"],
            highlightAnnotations=annotations,
            overallBandScore=ai_band_score,
            authorName=source,
        ))

        # Exam question (từ bài essay này)
        if result.get("examTitle") and cand.get("question"):
            exam_questions.append(ExamQuestionSeed(
                title=result["examTitle"],
                questionPrompt=cand["question"],
                suggestedOutline=result.get("suggestedOutline", ""),
                difficultyLevel=result.get("difficultyLevel", "MEDIUM"),
                tags=result.get("tags", []),
            ))

        if i < len(approved):
            time.sleep(4)

    final = Step5Result(
        topic=topic,
        target_band=target_band,
        exam_questions=exam_questions,
        sample_essays=sample_essays,
    )

    out_path = Path(__file__).parent.parent / "output" / f"step5_{slug}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(asdict(final), f, ensure_ascii=False, indent=2)

    print(f"\n   {len(sample_essays)} sample essays · {len(exam_questions)} exam questions → {out_path.name}")
    return out_path


def load_results(topic: str) -> Step5Result:
    slug = re.sub(r"[^a-z0-9]+", "_", topic.lower()).strip("_")
    path = Path(__file__).parent.parent / "output" / f"step5_{slug}.json"
    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    return Step5Result(
        topic=data["topic"],
        target_band=data["target_band"],
        exam_questions=[ExamQuestionSeed(**q) for q in data["exam_questions"]],
        sample_essays=[
            SampleEssaySeed(
                **{**e, "highlightAnnotations": [HighlightAnnotation(**a) for a in e["highlightAnnotations"]]}
            )
            for e in data["sample_essays"]
        ],
    )


# ─── CLI ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("topic", help='Topic IELTS, VD: "Technology and Society"')
    parser.add_argument(
        "--phase",
        choices=["scrape", "analyze"],
        default="scrape",
        help="scrape: tìm + scrape essays | analyze: AI phân tích candidates đã duyệt",
    )
    parser.add_argument("--band", default="BAND_7_PLUS")
    parser.add_argument("--max-essays", type=int, default=8)
    parser.add_argument(
        "--urls",
        nargs="+",
        metavar="URL",
        help="URL thủ công để scrape (bỏ qua bước tìm kiếm DuckDuckGo)",
    )
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  Bước 5 — Sample Essays từ web")
    print(f"  Topic : {args.topic}")
    print(f"  Phase : {args.phase}")
    print(f"{'='*60}")

    if args.phase == "scrape":
        run_scrape(args.topic, max_essays=args.max_essays, manual_urls=args.urls)
    else:
        if not OPENROUTER_API_KEY:
            print("  Thiếu OPENROUTER_API_KEY trong .env")
            sys.exit(1)
        run_analyze(args.topic, args.band)
