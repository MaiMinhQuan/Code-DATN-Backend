"""
Migration: Chuyen courseId tu String sang ObjectId trong collection lessons.

Mot so lesson bi luu courseId dang plain string thay vi ObjectId (do Mongoose
findByIdAndUpdate khong cast dung khi nhan string tu frontend form).
Query { courseId: ObjectId(...) } se khong match cac lesson nay nen chung khong
hien tren frontend du da co trong DB.

Cach chay:
  python pipeline/migrate_courseid_to_objectid.py
  python pipeline/migrate_courseid_to_objectid.py --dry-run
"""

import sys
import argparse
from pathlib import Path
from datetime import datetime, timezone

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

from pymongo import MongoClient
from bson import ObjectId


def _load_mongo_uri() -> str:
    env_path = Path(__file__).parent.parent / ".env"
    if not env_path.exists():
        raise FileNotFoundError(f"Khong tim thay backend/.env: {env_path}")
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith("MONGODB_URI="):
            return line.split("=", 1)[1].strip()
    raise ValueError("MONGODB_URI chua duoc khai bao trong backend/.env")


def migrate(dry_run: bool = False):
    uri = _load_mongo_uri()
    client = MongoClient(uri)
    db_name = uri.rstrip("/").split("/")[-1].split("?")[0]
    db = client[db_name]

    # Tim tat ca lesson co courseId la string (type 2 = String trong BSON)
    string_lessons = list(db.lessons.find({"courseId": {"$type": "string"}}))

    print(f"\n  Database  : {db_name}")
    print(f"  Dry-run   : {dry_run}")
    print(f"  Tim thay  : {len(string_lessons)} lesson co courseId la string\n")

    if not string_lessons:
        print("  Khong co gi can migrate.")
        client.close()
        return

    fixed = 0
    skipped = 0
    for lesson in string_lessons:
        cid_str = lesson["courseId"]

        # Kiem tra xem courseId co phai ObjectId hop le khong
        if not ObjectId.is_valid(cid_str):
            print(f"  [SKIP] {lesson['_id']} — courseId khong hop le: '{cid_str}'")
            skipped += 1
            continue

        cid_obj = ObjectId(cid_str)

        # Xac nhan course tuong ung ton tai
        course = db.courses.find_one({"_id": cid_obj})
        course_title = course["title"] if course else "(khong tim thay course)"

        print(f"  [{'DRY' if dry_run else 'FIX'}] lesson {lesson['_id']}")
        print(f"        title     : {lesson['title'][:60]}")
        print(f"        courseId  : '{cid_str}' -> ObjectId('{cid_str}')")
        print(f"        course    : {course_title[:60]}")

        if not dry_run:
            db.lessons.update_one(
                {"_id": lesson["_id"]},
                {"$set": {"courseId": cid_obj, "updatedAt": datetime.now(timezone.utc)}},
            )
        fixed += 1

    print(f"\n  Ket qua: {fixed} lesson {'se duoc' if dry_run else 'da duoc'} fix, {skipped} skip.")

    # Cap nhat lai totalLessons cho tung course bi anh huong
    if not dry_run and fixed > 0:
        affected_courses = {ObjectId(l["courseId"]) for l in string_lessons if ObjectId.is_valid(l["courseId"])}
        print(f"\n  Cap nhat totalLessons cho {len(affected_courses)} course...")
        for cid in affected_courses:
            count = db.lessons.count_documents({"courseId": cid})
            db.courses.update_one(
                {"_id": cid},
                {"$set": {"totalLessons": count, "updatedAt": datetime.now(timezone.utc)}},
            )
            print(f"    course {cid}: totalLessons = {count}")

    client.close()
    print("\n  Hoan thanh!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Xem truoc thay doi ma khong ghi vao DB")
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print("  Migration: courseId String -> ObjectId")
    print(f"{'='*60}")

    migrate(dry_run=args.dry_run)
