"""
Pipeline chính — chạy tuần tự các bước.

Cách chạy:
    python main.py --topic "Technology and Society" --band BAND_6_0 --step 4
    python main.py --topic "Technology and Society" --step 5 --phase scrape
    python main.py --topic "Technology and Society" --step 5 --phase analyze --band BAND_7_PLUS
    python main.py --topic "Technology and Society" --step 6 --band BAND_7_PLUS
    python main.py --topic "Technology and Society" --step 6 --dry-run
"""

import argparse
import sys
from pathlib import Path

# Thêm thư mục pipeline vào path để import steps
sys.path.insert(0, str(Path(__file__).parent))

from steps.step1_find_videos import find_videos, save_results
from steps.step2_get_subtitles import get_subtitles, save_results as save_subtitles
from steps.step3_extract_content import extract_content, save_results as save_content
from steps.step4_assemble_lesson import assemble_lesson, save_results as save_lesson
from steps.step5_find_essays import run_scrape, run_analyze, load_results as load_essays
from steps.step6_seed_to_mongodb import seed as seed_to_mongodb


def parse_args():
    parser = argparse.ArgumentParser(
        description="IELTS Data Pipeline — tự động tạo dữ liệu học liệu"
    )
    parser.add_argument(
        "--topic",
        required=True,
        help='Tên chủ đề IELTS. VD: "Technology and Society"',
    )
    parser.add_argument(
        "--band",
        default="BAND_6_0",
        choices=["BAND_5_0", "BAND_6_0", "BAND_7_PLUS"],
        help="Target band score (mặc định: BAND_6_0)",
    )
    parser.add_argument(
        "--max-videos",
        type=int,
        default=8,
        help="Số video tối đa lấy về (mặc định: 8)",
    )
    parser.add_argument(
        "--max-essays",
        type=int,
        default=8,
        help="Số essay candidates tối đa scrape về (mặc định: 8)",
    )
    parser.add_argument(
        "--step",
        type=int,
        default=1,
        help="Chạy đến bước nào (mặc định: 1)",
    )
    parser.add_argument(
        "--phase",
        choices=["scrape", "analyze"],
        default="scrape",
        help="(Chỉ dùng với --step 5) scrape: tìm bài mẫu | analyze: AI phân tích sau khi duyệt",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="(Chỉ dùng với --step 6) Kiểm tra dữ liệu mà không ghi vào database",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    print(f"\n{'='*60}")
    print(f"  IELTS Data Pipeline")
    print(f"  Topic  : {args.topic}")
    print(f"  Band   : {args.band}")
    print(f"{'='*60}\n")

    # ── Bước 1: Tìm video ────────────────────────────────────────────────────
    if args.step >= 1 and args.step < 5:
        print("[ Bước 1 ] Tìm video YouTube...")
        videos = find_videos(
            topic=args.topic,
            target_band=args.band,
            max_results=args.max_videos,
        )

        if not videos:
            print("  ✗ Không tìm được video nào. Dừng pipeline.")
            sys.exit(1)

        out = save_results(videos, args.topic)
        print(f"  ✓ Tìm được {len(videos)} video → {out.name}\n")

        for i, v in enumerate(videos, 1):
            mins = v.duration_sec // 60
            secs = v.duration_sec % 60
            cap  = "✓" if v.has_caption else "✗"
            print(f"  {i:2}. [{cap} phụ đề] {mins}:{secs:02}  {v.title[:55]}")
            print(f"       {v.url}")

        if args.step == 1:
            print(f"\n Hoàn thành Bước 1. Kiểm tra file output/{out.name}")
            print("   Chạy Bước 2 (lấy subtitle): thêm --step 2")
            return

    # ── Bước 2: Lấy subtitle ─────────────────────────────────────────────────
    if args.step >= 2 and args.step < 5:
        print("[ Bước 2 ] Lấy subtitle từ YouTube...")
        transcripts = get_subtitles(args.topic)

        if not transcripts:
            print("  ✗ Không tìm được phụ đề cho các video. Dừng pipeline.")
            sys.exit(1)

        out2 = save_subtitles(transcripts, args.topic)
        print(f"  ✓ Lấy được {len(transcripts)} transcript → {out2.name}\n")

        if args.step == 2:
            print(f" Hoàn thành Bước 2. Kiểm tra file output/{out2.name}")
            print("   Chạy Bước 3 (AI extract vocab/grammar): thêm --step 3")
            return

    # ── Bước 3: Extract vocab & grammar bằng OpenRouter ─────────────────────
    if args.step >= 3 and args.step < 5:
        print("[ Bước 3 ] Extract từ vựng và ngữ pháp bằng AI...")
        contents = extract_content(args.topic)

        if not contents:
            print("  ✗ Không extract được nội dung nào. Dừng pipeline.")
            sys.exit(1)

        out3 = save_content(contents, args.topic)
        total_vocab   = sum(len(c.vocabulary) for c in contents)
        total_grammar = sum(len(c.grammar) for c in contents)
        print(f"  ✓ {len(contents)} video → {total_vocab} vocab · {total_grammar} grammar → {out3.name}\n")

        if args.step == 3:
            print(f" Hoàn thành Bước 3. Kiểm tra file output/{out3.name}")
            print("   Chạy Bước 4 (tổng hợp Lesson + Flashcard): thêm --step 4")
            return

    # ── Bước 4: Tổng hợp Lesson + FlashcardSet ───────────────────────────────
    if args.step >= 4 and args.step < 5:
        print("[ Bước 4 ] Tổng hợp Lesson + FlashcardSet...")
        lesson_results = assemble_lesson(args.topic, args.band)

        out4          = save_lesson(lesson_results, args.topic)
        total_vocab   = sum(len(r.lesson.vocabularies) for r in lesson_results)
        total_grammar = sum(len(r.lesson.grammars) for r in lesson_results)
        total_cards   = sum(len(r.flashcard_set.cards) for r in lesson_results)
        print(f"  ✓ {len(lesson_results)} bài học · {total_vocab} vocab · "
              f"{total_grammar} grammar · {total_cards} flashcards → {out4.name}\n")

        if args.step == 4:
            print(f" Hoàn thành Bước 4. Kiểm tra file output/{out4.name}")
            print("   Chạy Bước 5 (tìm Sample Essays từ web):")
            print("     Bước 5a — scrape: python main.py --topic ... --step 5 --phase scrape")
            print("     Bước 5b — duyệt file step5_candidates_*.json rồi set approved=true")
            print("     Bước 5c — analyze: python main.py --topic ... --step 5 --phase analyze")
            return

    # ── Bước 5: Tìm Sample Essays từ web (2 phase) ───────────────────────────
    if args.step == 5:
        if args.phase == "scrape":
            print("[ Bước 5 — Phase 1 ] Tìm kiếm và scrape bài mẫu từ web...")
            run_scrape(args.topic, max_essays=args.max_essays)
            print(f"\n Hoàn thành Phase 1.")
            print(f"   Mở output/step5_candidates_*.json, set \"approved\": true cho bài muốn dùng.")
            print(f"   Sau đó chạy: python main.py --topic \"{args.topic}\" --step 5 --phase analyze --band {args.band}")
        else:
            print("[ Bước 5 — Phase 2 ] AI phân tích bài mẫu đã duyệt...")
            out5 = run_analyze(args.topic, args.band)
            essays = load_essays(args.topic)
            print(f"\n Hoàn thành Bước 5.")
            print(f"   {len(essays.sample_essays)} sample essays · {len(essays.exam_questions)} exam questions")
            print(f"   Kiểm tra file {out5.name}")
            print("   Chạy Bước 6 (seed vào MongoDB): thêm --step 6")
        return

    # ── Bước 6: Seed vào MongoDB ─────────────────────────────────────────────
    if args.step >= 6:
        print("[ Bước 6 ] Seed dữ liệu vào MongoDB...")
        seed_to_mongodb(topic=args.topic, dry_run=args.dry_run)
        return


if __name__ == "__main__":
    main()
