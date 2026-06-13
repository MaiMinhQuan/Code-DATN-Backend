"""
Buoc 6 — Seed du lieu vao MongoDB.

Doc output tu step4 (Lesson + FlashcardSet) va step5 (SampleEssay + ExamQuestion),
sau do insert vao MongoDB (bo qua Mongoose validation, ghi thang qua pymongo).

Thu tu thuc hien:
  1. Upsert Topic (theo slug)
  2. Tao Course → Lesson (tu step4)
  3. Tao FlashcardSet + Flashcards (tu step4, gan vao admin user)
  4. Tao ExamQuestions (tu step5)
  5. Tao SampleEssays (tu step5)

Cach chay:
  python steps/step6_seed_to_mongodb.py "Technology and Society" --band BAND_7_PLUS
  python steps/step6_seed_to_mongodb.py "Technology and Society" --dry-run
"""

import re
import sys
import json
import argparse
from pathlib import Path
from datetime import datetime, timezone

# Fix Windows console encoding
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).parent.parent))

from pymongo import MongoClient
from bson import ObjectId



# ─── Helpers ─────────────────────────────────────────────────────────────────

def _now() -> datetime:
    return datetime.now(timezone.utc)


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _load_mongo_uri() -> str:
    env_path = Path(__file__).parent.parent.parent / ".env"
    if not env_path.exists():
        raise FileNotFoundError(f"Khong tim thay backend/.env: {env_path}")
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("MONGODB_URI="):
            return line.split("=", 1)[1].strip()
    raise ValueError("MONGODB_URI chua duoc khai bao trong backend/.env")


_DIFFICULTY_MAP = {"EASY": 1, "MEDIUM": 2, "HARD": 3}


def _calc_target_band(score: float) -> str:
    if score >= 7.0:
        return "BAND_7_PLUS"
    if score >= 6.0:
        return "BAND_6_0"
    return "BAND_5_0"


# ─── Seed functions ───────────────────────────────────────────────────────────

def _upsert_topic(db, topic_name: str, dry_run: bool) -> ObjectId:
    slug = _slugify(topic_name)
    existing = db.topics.find_one({"slug": slug})
    if existing:
        print(f"  [Topic] Da ton tai: {topic_name} ({existing['_id']})")
        return existing["_id"]

    doc = {
        "name": topic_name,
        "slug": slug,
        "isActive": True,
        "createdAt": _now(),
        "updatedAt": _now(),
    }
    if dry_run:
        fake_id = ObjectId()
        print(f"  [Topic] DRY-RUN — se tao: {topic_name} (id gia: {fake_id})")
        return fake_id

    result = db.topics.insert_one(doc)
    print(f"  [Topic] Da tao: {topic_name} ({result.inserted_id})")
    return result.inserted_id


def _load_step4(topic_name: str) -> dict:
    slug = re.sub(r"[^a-z0-9]+", "_", topic_name.lower()).strip("_")
    path = Path(__file__).parent.parent / "output" / f"step4_{slug}.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _load_step5(topic_name: str) -> dict:
    slug = re.sub(r"[^a-z0-9]+", "_", topic_name.lower()).strip("_")
    path = Path(__file__).parent.parent / "output" / f"step5_{slug}.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _seed_lesson(db, topic_name: str, topic_id: ObjectId, topic_slug: str, dry_run: bool):
    data         = _load_step4(topic_name)
    lessons_data = data.get("lessons", [])   # list[{topic, target_band, lesson, flashcard_set}]

    # topicId luu embedded object {_id, name, slug} — giong seed.ts va NestJS schema
    topic_ref    = {"_id": topic_id, "name": topic_name, "slug": topic_slug}
    course_title = f"IELTS Writing Task 2 — {topic_name}"

    # Tao Course (1 course cho toan bo lessons cua topic nay)
    existing_course = db.courses.find_one({"title": course_title}) if not dry_run else None
    if existing_course:
        course_id = existing_course["_id"]
        print(f"  [Course] Da ton tai: {course_title} ({course_id})")
    else:
        course_doc = {
            "title":        course_title,
            "topicId":      topic_ref,
            "isPublished":  False,
            "isActive":     True,
            "totalLessons": 0,
            "createdAt":    _now(),
            "updatedAt":    _now(),
        }
        if dry_run:
            course_id = ObjectId()
            print(f"  [Course] DRY-RUN — se tao: {course_title} ({len(lessons_data)} lessons)")
        else:
            r = db.courses.insert_one(course_doc)
            course_id = r.inserted_id
            print(f"  [Course] Da tao: {course_title} ({course_id})")

    # Tao tung Lesson — moi video la 1 lesson rieng
    admin = db.users.find_one({"role": "ADMIN"})
    if not admin:
        print("  [Flashcard] Khong tim thay admin user, se bo qua FlashcardSet")

    for order_idx, item in enumerate(lessons_data):
        # Bo qua neu admin da bo chon lesson nay (mac dinh True neu chua co flag)
        if item.get("approved") is False:
            print(f"  [Lesson {order_idx}] Admin bo chon, bo qua")
            continue

        lesson = item["lesson"]
        fset   = item["flashcard_set"]

        # Kiem tra lesson da ton tai (theo title + courseId)
        lesson_exists = (
            not dry_run
            and db.lessons.find_one({"courseId": course_id, "title": lesson["title"]})
        )
        if lesson_exists:
            lesson_id = lesson_exists["_id"]
            print(f"  [Lesson {order_idx}] Da ton tai, bo qua: {lesson['title'][:55]}")
        else:
            lesson_doc = {
                "title":       lesson["title"],
                "courseId":    course_id,
                "targetBand":  "",
                "isPublished": False,
                "notesContent": lesson.get("notesContent", ""),
                "videos": [
                    {
                        "title":        v["title"],
                        "videoUrl":     v.get("url") or v.get("videoUrl", ""),
                        "duration":     v.get("duration"),
                        "thumbnailUrl": v.get("thumbnailUrl"),
                    }
                    for v in lesson.get("videos", [])
                ],
                "vocabularies": [
                    {
                        "word":            v["word"],
                        "pronunciation":   v.get("pronunciation", ""),
                        "definition":      v.get("definition", ""),
                        "translation":     v.get("translation", ""),
                        "examples":        v.get("examples", []),
                        "timestamp":       v.get("timestamp"),
                        "contextSentence": v.get("contextSentence", ""),
                    }
                    for v in lesson.get("vocabularies", [])
                ],
                "grammars": [
                    {
                        "title":           g["title"],
                        "explanation":     g.get("explanation", ""),
                        "structure":       g.get("structure", ""),
                        "examples":        g.get("examples", []),
                        "timestamp":       g.get("timestamp"),
                        "contextSentence": g.get("contextSentence", ""),
                    }
                    for g in lesson.get("grammars", [])
                ],
                "createdAt": _now(),
                "updatedAt": _now(),
            }

            if dry_run:
                lesson_id = ObjectId()
                print(f"  [Lesson {order_idx}] DRY-RUN — se tao: {lesson_doc['title'][:55]} "
                      f"({len(lesson_doc['videos'])} video, "
                      f"{len(lesson_doc['vocabularies'])} vocab, "
                      f"{len(lesson_doc['grammars'])} grammar)")
            else:
                r = db.lessons.insert_one(lesson_doc)
                lesson_id = r.inserted_id
                print(f"  [Lesson {order_idx}] Da tao: {lesson_doc['title'][:55]} ({lesson_id})")

        # FlashcardSet — type LESSON, gan voi lesson_id
        existing_fset = db.flashcardsets.find_one({"type": "LESSON", "lessonId": lesson_id}) if not dry_run else None
        if existing_fset:
            fset_id = existing_fset["_id"]
            print(f"  [FlashcardSet] Da ton tai: {fset['title'][:50]} ({fset_id})")
        else:
            fset_doc = {
                "type":        "LESSON",
                "lessonId":    lesson_id,
                "title":       fset["title"],
                "description": fset.get("description", ""),
                "createdAt":   _now(),
                "updatedAt":   _now(),
            }
            if dry_run:
                fset_id = ObjectId()
                print(f"  [FlashcardSet] DRY-RUN — se tao: {fset['title'][:50]} ({len(fset['cards'])} cards)")
            else:
                r = db.flashcardsets.insert_one(fset_doc)
                fset_id = r.inserted_id
                print(f"  [FlashcardSet] Da tao: {fset['title'][:50]} ({fset_id})")

        existing_card_count = 0 if dry_run else db.flashcards.count_documents({"setId": fset_id})
        if not dry_run and existing_card_count > 0:
            print(f"  [Flashcard] Da ton tai {existing_card_count} cards, bo qua")
            continue

        cards = [
            {
                "setId":        fset_id,
                "frontContent": c["frontContent"],
                "backContent":  c["backContent"],
                "reviewCount":  0,
                "createdAt":    _now(),
                "updatedAt":    _now(),
            }
            for c in fset.get("cards", [])
        ]
        if not dry_run and cards:
            db.flashcards.insert_many(cards)
            print(f"  [Flashcard] Da tao {len(cards)} cards")
        elif dry_run:
            print(f"  [Flashcard] DRY-RUN — se tao {len(cards)} cards")

    # Cap nhat totalLessons chinh xac sau khi tat ca lesson da duoc insert/skip
    if not dry_run:
        actual_count = db.lessons.count_documents({"courseId": course_id})
        db.courses.update_one({"_id": course_id}, {"$set": {"totalLessons": actual_count, "updatedAt": _now()}})
        print(f"  [Course] totalLessons cap nhat: {actual_count}")


def _seed_essays(db, topic_name: str, topic_id: ObjectId, dry_run: bool):
    try:
        data = _load_step5(topic_name)
    except FileNotFoundError:
        print("  [SampleEssay] Không có file step5 (bỏ qua bài mẫu)")
        return

    # ExamQuestions — bo qua cau hoi da ton tai (theo questionPrompt)
    eq_docs = []
    existing_prompts = {
        d["questionPrompt"]
        for d in db.examquestions.find({"topicId": topic_id}, {"questionPrompt": 1})
    }
    for eq in data["exam_questions"]:
        if eq["questionPrompt"] in existing_prompts:
            print(f"  [ExamQuestion] Da ton tai, bo qua: {eq['title']}")
            continue
        eq_docs.append({
            "title": eq["title"],
            "topicId": topic_id,
            "questionPrompt": eq["questionPrompt"],
            "suggestedOutline": eq.get("suggestedOutline", ""),
            "difficultyLevel": _DIFFICULTY_MAP.get(eq.get("difficultyLevel", "MEDIUM"), 2),
            "tags": eq.get("tags", []),
            "isPublished": False,
            "attemptCount": 0,
            "createdAt": _now(),
            "updatedAt": _now(),
        })

    if eq_docs:
        if dry_run:
            print(f"  [ExamQuestion] DRY-RUN — se tao {len(eq_docs)} cau hoi")
        else:
            db.examquestions.insert_many(eq_docs)
            print(f"  [ExamQuestion] Da tao {len(eq_docs)} cau hoi")

    # SampleEssays — bo qua bai da ton tai (theo title)
    existing_titles = {
        d["title"]
        for d in db.sampleessays.find({"topicId": topic_id}, {"title": 1})
    }
    se_docs = []
    for se in data["sample_essays"]:
        if se["title"] in existing_titles:
            print(f"  [SampleEssay] Da ton tai, bo qua: {se['title']}")
            continue
        band_score = se.get("overallBandScore") or 0
        se_docs.append({
            "title": se["title"],
            "topicId": topic_id,
            "questionPrompt": se["questionPrompt"],
            "outlineContent": se.get("outlineContent", ""),
            "fullEssayContent": se["fullEssayContent"],
            "highlightAnnotations": [
                {
                    "text": a["text"],
                    "highlightType": a["highlightType"],
                    "explanation": a["explanation"],
                    "color": a.get("color", ""),
                }
                for a in se.get("highlightAnnotations", [])
            ],
            "overallBandScore": float(band_score) if band_score else 7.0,
            "authorName": se.get("authorName", ""),
            "isPublished": False,
            "favoriteCount": 0,
            "createdAt": _now(),
            "updatedAt": _now(),
        })

    if se_docs:
        if dry_run:
            print(f"  [SampleEssay] DRY-RUN — se tao {len(se_docs)} bai mau")
        else:
            db.sampleessays.insert_many(se_docs)
            print(f"  [SampleEssay] Da tao {len(se_docs)} bai mau")

    # ExamQuestion tu sample essay — dam bao 100% sample essay co exam question
    # (bu cho truong hop step5 miss vi cand["question"] rong hoac AI khong tra examTitle)
    # Lay lai tap existing_prompts sau khi da insert exam questions o tren
    existing_prompts_after = {
        d["questionPrompt"]
        for d in db.examquestions.find({"topicId": topic_id}, {"questionPrompt": 1})
    } if not dry_run else existing_prompts

    fallback_eq_docs = []
    for se in data["sample_essays"]:
        prompt = se.get("questionPrompt", "").strip()
        if not prompt:
            continue
        if prompt in existing_prompts_after:
            continue

        # Lay exam title: bo phan " — Band X.X" o cuoi title cua sample essay
        raw_title = se.get("title", "")
        eq_title  = raw_title.split(" — Band")[0].strip() or raw_title[:80]

        fallback_eq_docs.append({
            "title":           eq_title,
            "topicId":         topic_id,
            "questionPrompt":  prompt,
            "suggestedOutline": "",
            "difficultyLevel": 2,
            "tags":            [],
            "isPublished":     False,
            "attemptCount":    0,
            "createdAt":       _now(),
            "updatedAt":       _now(),
        })
        # Cap nhat tap de tranh trung lap trong cung vong lap
        existing_prompts_after.add(prompt)

    if fallback_eq_docs:
        if dry_run:
            print(f"  [ExamQuestion/fallback] DRY-RUN — se tao {len(fallback_eq_docs)} cau hoi tu sample essay")
        else:
            db.examquestions.insert_many(fallback_eq_docs)
            print(f"  [ExamQuestion/fallback] Da tao {len(fallback_eq_docs)} cau hoi tu sample essay")
    else:
        print(f"  [ExamQuestion/fallback] Tat ca sample essay da co exam question tuong ung")


# ─── Main ─────────────────────────────────────────────────────────────────────

def seed(topic: str, dry_run: bool = False):
    uri = _load_mongo_uri()
    client = MongoClient(uri)

    # Ten database lay tu URI (phan sau dau / cuoi cung)
    db_name = uri.rstrip("/").split("/")[-1].split("?")[0]
    db = client[db_name]

    print(f"\n  Database : {db_name}")
    print(f"  Topic    : {topic}")
    print(f"  Dry-run  : {dry_run}\n")

    topic_slug = _slugify(topic)
    topic_id   = _upsert_topic(db, topic, dry_run)
    _seed_lesson(db, topic, topic_id, topic_slug, dry_run)
    _seed_essays(db, topic, topic_id, dry_run)

    client.close()
    print("\n  Hoan thanh!")


# ─── CLI ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("topic", help='Ten chu de, VD: "Technology and Society"')
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Kiem tra du lieu ma khong ghi vao database",
    )
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  Buoc 6 — Seed vao MongoDB")
    print(f"{'='*60}")

    seed(args.topic, dry_run=args.dry_run)
