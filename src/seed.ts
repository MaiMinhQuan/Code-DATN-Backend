/**
 * Seed script — chạy bằng:
 *   npx ts-node -r tsconfig-paths/register src/seed.ts
 *
 * Xóa sạch và tạo lại toàn bộ dữ liệu demo theo DEMO_PLAN.md.
 */

import mongoose, { Schema, Types } from "mongoose";
import * as bcrypt from "bcrypt";

const MONGO_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/ielts-writing-db";

// ─── Inline enums (tránh path-alias phức tạp) ────────────────────────────────

const UserRole = { STUDENT: "STUDENT", ADMIN: "ADMIN" } as const;
const TargetBand = { BAND_5_0: "BAND_5_0", BAND_6_0: "BAND_6_0", BAND_7_PLUS: "BAND_7_PLUS" } as const;
const SubmissionStatus = { DRAFT: "DRAFT", SUBMITTED: "SUBMITTED", PROCESSING: "PROCESSING", COMPLETED: "COMPLETED", FAILED: "FAILED" } as const;
const HighlightType = { VOCABULARY: "VOCABULARY", GRAMMAR: "GRAMMAR", STRUCTURE: "STRUCTURE", ARGUMENT: "ARGUMENT" } as const;
const ErrorCategory = { GRAMMAR: "GRAMMAR", VOCABULARY: "VOCABULARY", COHERENCE: "COHERENCE", TASK_RESPONSE: "TASK_RESPONSE", SPELLING: "SPELLING" } as const;
const FlashcardSetType = { PERSONAL: "PERSONAL", LESSON: "LESSON" } as const;

// ─── Minimal schemas (chỉ cần để mongoose biết collection name) ──────────────

const UserModel = mongoose.model("User", new Schema({}, { strict: false, timestamps: true }));
const TopicModel = mongoose.model("Topic", new Schema({}, { strict: false, timestamps: true }));
const CourseModel = mongoose.model("Course", new Schema({}, { strict: false, timestamps: true }));
const LessonModel = mongoose.model("Lesson", new Schema({}, { strict: false, timestamps: true }));
const ExamQuestionModel = mongoose.model("ExamQuestion", new Schema({}, { strict: false, timestamps: true }));
const SampleEssayModel = mongoose.model("SampleEssay", new Schema({}, { strict: false, timestamps: true }));
const SubmissionModel = mongoose.model("Submission", new Schema({}, { strict: false, timestamps: true }));
const FlashcardSetModel = mongoose.model("FlashcardSet", new Schema({}, { strict: false, timestamps: true }));
const FlashcardModel = mongoose.model("Flashcard", new Schema({}, { strict: false, timestamps: true }));
const NoteCollectionModel = mongoose.model("NoteCollection", new Schema({}, { strict: false, timestamps: true }));
const NotebookNoteModel = mongoose.model("NotebookNote", new Schema({}, { strict: false, timestamps: true }));

// ─── Helper ───────────────────────────────────────────────────────────────────

async function hash(plain: string) {
  return bcrypt.hash(plain, 10);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log(" Connected to MongoDB:", MONGO_URI);

  // Xóa sạch dữ liệu cũ
  const models = [UserModel, TopicModel, CourseModel, LessonModel, ExamQuestionModel, SampleEssayModel, SubmissionModel, FlashcardSetModel, FlashcardModel, NoteCollectionModel, NotebookNoteModel];
  for (const m of models) await m.deleteMany({});
  console.log("🗑️  Cleared all collections");

  // ── 1. USERS ────────────────────────────────────────────────────────────────

  const [u1, u2, u3] = await UserModel.insertMany([
    {
      email: "admin@ielts.dev",
      passwordHash: await hash("123456"),
      fullName: "Admin Hệ thống",
      role: UserRole.ADMIN,
      isActive: true,
    },
    {
      email: "minh@student.dev",
      passwordHash: await hash("123456"),
      fullName: "Nguyễn Văn Minh",
      role: UserRole.STUDENT,
      isActive: true,
      lastLoginAt: daysAgo(1),
    },
    {
      email: "lan@student.dev",
      passwordHash: await hash("123456"),
      fullName: "Trần Thị Lan",
      role: UserRole.STUDENT,
      isActive: true,
    },
  ]);
  console.log("👤 Users created:", u1.email, u2.email, u3.email);

  // ── 2. TOPIC ────────────────────────────────────────────────────────────────

  const [t1] = await TopicModel.insertMany([
    {
      name: "Môi trường",
      slug: "moi-truong",
      description: "Các chủ đề về ô nhiễm, biến đổi khí hậu, năng lượng tái tạo và vai trò của công nghệ trong bảo vệ môi trường — nhóm chủ đề xuất hiện thường xuyên nhất trong IELTS Writing Task 2.",
      isActive: true,
    },
  ]);
  console.log("🏷️  Topic created:", t1._id);

  // ── 3. COURSE ────────────────────────────────────────────────────────────────

  const topicInfo = { _id: t1._id, name: t1.get("name"), slug: t1.get("slug") };

  const [c1] = await CourseModel.insertMany([
    {
      title: "Environment & Sustainability",
      description: "Cung cấp từ vựng và ngữ pháp chủ đề Môi trường và Phát triển bền vững qua 6 bài học chia theo 3 cấp độ Band 5.0, 6.0 và 7.0+. Từ vựng và ngữ pháp lấy trực tiếp từ video Vox, National Geographic, Kurzgesagt và TED.",
      topicId: topicInfo,
      isPublished: true,
      totalLessons: 0,
      isActive: true,
    },
  ]);
  console.log("📚 Course created:", c1._id);

  // ── 4. LESSONS ───────────────────────────────────────────────────────────────

  const lessons = await LessonModel.insertMany([
    // ── L1 — Band 5.0 — BBC "Curbing our plastic addiction" ─────────────────
    {
      title: "Too Much Plastic: Is Recycling Enough?",
      courseId: c1._id,
      targetBand: TargetBand.BAND_5_0,
      description: "Nguồn gốc vi nhựa trong đại dương, hành trình nhựa từ bờ biển đến đáy biển sâu và lý do phần lớn rác thải biển 'biến mất'. Vox giải thích tại sao tái chế chưa đủ và cần thay đổi hệ thống.",
      isPublished: true,
      videos: [
        {
          title: "Why 99% of Ocean Plastic Is 'Missing' | Vox",
          videoUrl: "https://www.youtube.com/watch?v=fsjvwQclGLo",
          duration: 360,
          thumbnailUrl: "https://img.youtube.com/vi/fsjvwQclGLo/hqdefault.jpg",
        },
      ],
      vocabularies: [
        { word: "debris", pronunciation: "/ˈdebriː/", definition: "Scattered waste material left in the environment, especially in oceans", translation: "rác thải / mảnh vỡ", examples: ["Plastic debris accumulates in ocean gyres due to swirling currents, forming the Great Pacific Garbage Patch.", "Reducing debris at source, before it enters waterways, is far more effective than ocean clean-up."], timestamp: 8, contextSentence: "tons of our plastic debris has accumulated there because of swirling ocean currents." },
        { word: "accumulate", pronunciation: "/əˈkjuːmjəleɪt/", definition: "To gradually collect or build up over time in harmful quantities", translation: "tích tụ", examples: ["Plastic has accumulated in ocean gyres for decades because currents trap floating debris.", "Toxins accumulate in the bodies of marine animals that ingest microplastic particles."], timestamp: 10, contextSentence: "tons of our plastic debris has accumulated there because of swirling ocean currents." },
        { word: "microscopic", pronunciation: "/ˌmaɪkrəˈskɒpɪk/", definition: "Too small to be seen with the naked eye; visible only under a microscope", translation: "cực nhỏ, vi mô", examples: ["Plastic objects range in size from large debris to microscopic fragments invisible to the naked eye.", "Microscopic plastic particles have been found in the tissue of fish sold in supermarkets worldwide."], timestamp: 20, contextSentence: "they range in size from large debris to microscopic." },
        { word: "garbage patch", pronunciation: "/ˈɡɑːbɪdʒ pætʃ/", definition: "A large area of ocean where plastic waste concentrates due to circular ocean currents", translation: "vùng rác thải đại dương", examples: ["The Great Pacific Garbage Patch covers an area roughly twice the size of Texas.", "Cleaning up a single garbage patch would cost billions and fail to address the source of the problem."], timestamp: 25, contextSentence: "there are at least four other garbage patches like this in the world." },
        { word: "sediment", pronunciation: "/ˈsedɪmənt/", definition: "Material that settles at the bottom of a body of water; layers that record environmental history", translation: "trầm tích (đáy biển)", examples: ["Sea floor sediment cores show that microplastic levels have doubled every 15 years since the 1950s.", "Plastic buried in ocean sediment is largely invisible and extremely difficult to remove."], timestamp: 94, contextSentence: "This is clue number 1 in the case of the missing plastic: a sea floor sediment sample." },
        { word: "fragment", pronunciation: "/ˈfræɡmənt/", definition: "A small broken piece of a larger object; in plastic context, a piece produced by physical breakdown", translation: "mảnh vỡ nhỏ", examples: ["Plastic fragments smaller than 5 mm have been found in the digestive tracts of deep-sea creatures.", "Sunlight and wave action cause plastic objects to fragment into smaller and smaller pieces over time."], timestamp: 121, contextSentence: "the study authors found plastic fibers and fragments that were 1 millimeter or smaller in size." },
        { word: "microplastics", pronunciation: "/ˌmaɪkrəʊˈplæstɪks/", definition: "Plastic particles smaller than 5 millimetres, formed when larger plastics break down in the environment", translation: "vi nhựa", examples: ["Microplastics have been detected in human blood, sea salt, and the deepest ocean trenches.", "Washing a single synthetic garment can release hundreds of thousands of microplastic fibres into waterways."], timestamp: 155, contextSentence: "the sea sediment study looked at microplastics, particles smaller than five millimeters." },
        { word: "degrade", pronunciation: "/dɪˈɡreɪd/", definition: "To break down into smaller pieces or simpler compounds through physical or chemical processes", translation: "phân hủy", examples: ["Conventional plastic does not fully degrade; it merely fragments into smaller and smaller particles.", "Whether plastic degrades into harmless compounds or persists as microplastics depends on its chemical composition."], timestamp: 227, contextSentence: "large plastic objects don't just float on the surface or degrade into microplastic; some of them sink without breaking down." },
        { word: "dense", pronunciation: "/dens/", definition: "Having high mass relative to volume; in context, heavier than seawater and therefore capable of sinking", translation: "có tỷ trọng cao / nặng hơn nước", examples: ["About half of all plastic waste is more dense than seawater, allowing it to sink to the ocean floor.", "Dense plastic objects that reach the sea floor are largely beyond the reach of any existing clean-up technology."], timestamp: 236, contextSentence: "about 50% of plastic in landfills is more dense than seawater." },
        { word: "persistent", pronunciation: "/pəˈsɪstənt/", definition: "Remaining present and unchanged in the environment for a long time; resistant to natural breakdown", translation: "bền vững / khó phân hủy", examples: ["Plastic found floating in ocean gyres is surprisingly persistent, with some objects dating back to the 1970s.", "The persistent nature of synthetic polymers means that virtually every piece of plastic ever produced still exists in some form."], timestamp: 319, contextSentence: "the plastic that is accumulated at the surface of the ocean is actually very persistent." },
        { word: "shoreline", pronunciation: "/ˈʃɔːlaɪn/", definition: "The line where a body of water meets the land; the coastal zone where most plastic first enters the ocean", translation: "bờ biển / vùng ven biển", examples: ["Research suggests that most ocean plastic remains near shorelines rather than drifting to the open sea.", "Regular clean-up events along shorelines are one of the most cost-effective tools for preventing plastic from reaching deeper waters."], timestamp: 351, contextSentence: "a lot of debris actually stays close to shorelines around the world, hidden in plain sight." },
        { word: "food web", pronunciation: "/fuːd web/", definition: "A complex network of feeding relationships among organisms in an ecosystem; the pathway by which pollutants spread", translation: "mạng lưới thức ăn", examples: ["Once microplastics enter the food web via plankton, they travel up through fish, seabirds, and ultimately to humans.", "The contamination of the food web with microplastics raises serious questions about long-term human health risks."], timestamp: 450, contextSentence: "The microplastics becoming part of our food web and geologic record." },
      ],
      grammars: [
        {
          title: "Present Perfect for scientific discoveries and ongoing problems",
          explanation: "Video dùng present perfect để mô tả những phát hiện khoa học còn đang diễn ra và tích lũy theo thời gian. Đây là cấu trúc quan trọng trong Introduction khi trình bày quy mô vấn đề.",
          structure: "Subject + have/has + past participle (+ since / for / over the past...)",
          examples: [
            "Scientists have found microplastics in environments as remote as the Arctic and as deep as the Mariana Trench.",
            "Plastic debris has accumulated in ocean gyres for decades, forming the world's largest artificial ecosystems.",
            "Researchers have documented a doubling of microplastic levels in sea floor sediment roughly every 15 years since the 1950s.",
          ],
          timestamp: 168,
          contextSentence: "we found these tiny particles floating throughout the ocean and even in the guts of the ocean's tiniest creatures, like plankton.",
        },
        {
          title: "Modal verbs of possibility: might / could / may",
          explanation: "Video dùng modal verbs khi diễn đạt điều chưa chắc chắn về số phận của nhựa trong đại dương. Cấu trúc này cần thiết khi viết về hậu quả môi trường còn chưa được chứng minh hoàn toàn.",
          structure: "Subject + might/could/may + base verb | Subject + might/could + have + past participle",
          examples: [
            "Dense plastic objects that sink to the sea floor might remain intact for centuries without detection.",
            "Microplastics embedded in ocean sediment could be entering the food chain through bottom-feeding organisms.",
            "Van Sebille's model suggests that much of our plastic pollution may never reach the open ocean at all.",
          ],
          timestamp: 244,
          contextSentence: "even those other 50 percent may actually travel to the seafloor with time.",
        },
        {
          title: "Cause-and-effect connectors: because / so / as a result",
          explanation: "Video liên tục giải thích tại sao nhựa đi đâu sau khi vào đại dương. Cause-effect connectors là nền tảng của bài viết Band 5 về vấn đề môi trường.",
          structure: "Clause, because + reason | Cause, so + effect | Cause. As a result, + effect.",
          examples: [
            "Plastic accumulates in ocean gyres because circular currents trap floating debris in one location.",
            "Much of our plastic is denser than seawater, so it sinks rather than floating on the surface.",
            "Barnacles and other organisms colonise floating plastic, making it heavier; as a result, it eventually sinks.",
          ],
          timestamp: 252,
          contextSentence: "debris which is floating on the ocean surface becomes colonized with barnacles, muscles, all sorts of different organisms, and then it becomes heavier and heavier and at a certain point it then starts to sink.",
        },
        {
          title: "Passive voice for scientific observation and measurement",
          explanation: "Video mô tả các thí nghiệm và khảo sát khoa học bằng thể bị động. Đây là văn phong học thuật đặc trưng khi trình bày nghiên cứu, nhấn mạnh kết quả thay vì người làm.",
          structure: "Object + was/were/has been + past participle (+ by agent)",
          examples: [
            "A sediment core was taken from the Santa Barbara Basin to measure the historical accumulation of microplastics.",
            "Over 2,100 photographs were taken with a deep-sea camera, revealing plastic debris 2,500 metres below the Arctic surface.",
            "The production dates of debris in the Great Pacific Garbage Patch were analysed to determine how long plastic persists at sea.",
          ],
          timestamp: 99,
          contextSentence: "It was taken from the bottom of the Santa Barbara Basin, off the coast of California.",
        },
      ],
      notesContent: `Nguồn gốc vi nhựa trong đại dương, hành trình nhựa từ bờ biển đến đáy biển sâu và lý do phần lớn rác thải biển 'biến mất'. Vox giải thích tại sao tái chế chưa đủ và cần thay đổi hệ thống.`,
    },

    // ── L3 — Band 6.0 — Fossils 101 / National Geographic ───────────────────
    {
      title: "Fossils 101: How Life Becomes Stone",
      courseId: c1._id,
      targetBand: TargetBand.BAND_6_0,
      description: "National Geographic trình bày quá trình hóa thạch từ amber, than đá đến permineralization. Cách thiên nhiên bảo tồn sự sống trong đá hàng triệu năm.",
      isPublished: true,
      videos: [
        {
          title: "Fossils 101 | National Geographic",
          videoUrl: "https://www.youtube.com/watch?v=bRuSmxJo_iA",
          duration: 225,
          thumbnailUrl: "https://img.youtube.com/vi/bRuSmxJo_iA/hqdefault.jpg",
        },
      ],
      vocabularies: [
        { word: "fossil", pronunciation: "/ˈfɒsl/", definition: "The preserved remains or impression of an ancient organism embedded in rock", translation: "hóa thạch", examples: ["Fossils are the primary evidence scientists use to reconstruct the history of life on Earth.", "Without the fossil record, our understanding of evolution and mass extinction events would be almost entirely theoretical."], timestamp: 14, contextSentence: "Fossils are remnants or impressions of ancient organisms that are naturally preserved in stone." },
        { word: "fossil record", pronunciation: "/ˈfɒsl ˈrekəd/", definition: "The collective body of all known fossils, which documents the history of life on Earth through geological time", translation: "hồ sơ hóa thạch / hồ sơ địa chất", examples: ["The fossil record provides a primary account of how life has changed over billions of years.", "Gaps in the fossil record make it difficult to trace the evolution of soft-bodied organisms that rarely fossilize."], timestamp: 41, contextSentence: "together they form the fossil record, a primary account that tells the story of life on earth through stone." },
        { word: "fossilization", pronunciation: "/ˌfɒsəlaɪˈzeɪʃn/", definition: "The natural process by which organisms are preserved in stone or other materials after death", translation: "quá trình hóa thạch hóa", examples: ["Fossilization requires specific conditions: rapid burial, low oxygen, and the presence of mineralizing groundwater.", "Only a tiny fraction of organisms undergo fossilization; most decompose without leaving any trace."], timestamp: 53, contextSentence: "fossilisation or the process of preserving organisms in stone can occur in countless ways." },
        { word: "body fossil", pronunciation: "/ˈbɒdi ˈfɒsl/", definition: "A fossil consisting of the actual physical remains of an organism, such as bones, shells, or teeth", translation: "hóa thạch thân (phần vật chất của sinh vật)", examples: ["Body fossils such as dinosaur bones allow palaeontologists to reconstruct the size, diet, and movement of ancient species.", "The discovery of exceptionally preserved body fossils in amber has provided detailed information about prehistoric insects."], timestamp: 31, contextSentence: "body fossils, which are the preserved remains of plants and animals." },
        { word: "trace fossil", pronunciation: "/treɪs ˈfɒsl/", definition: "A fossil that records an organism's behaviour, such as footprints, burrows, or feeding marks, rather than its physical remains", translation: "hóa thạch dấu vết (dấu chân, hang hốc)", examples: ["Trace fossils such as dinosaur footprints reveal information about how ancient animals moved and interacted.", "The presence of ancient burrowing trace fossils indicates that complex animal behaviour existed long before the first body fossils appeared."], timestamp: 33, contextSentence: "trace fossils, which are records of an animal's behavior, such as footprints." },
        { word: "amber", pronunciation: "/ˈæmbə/", definition: "Fossilized tree resin that can preserve organisms, especially insects, in extraordinary detail over millions of years", translation: "hổ phách (nhựa cây hóa thạch)", examples: ["Insects preserved in amber retain soft tissue structures that have long since decomposed in other fossil types.", "The recovery of DNA from organisms trapped in amber remains a subject of scientific debate and popular fascination."], timestamp: 86, contextSentence: "one special case involves trapping organisms, oftentimes insects, in amber." },
        { word: "resin", pronunciation: "/ˈrezɪn/", definition: "A sticky substance secreted by trees that can entrap organisms and eventually harden into amber", translation: "nhựa cây", examples: ["When an insect lands on tree resin, it can become permanently entrapped as the resin hardens around it.", "The chemical properties of tree resin create an oxygen-free environment that prevents the decay of entrapped organisms."], timestamp: 97, contextSentence: "the sap or resin forms a protective seal around the entrapped organism." },
        { word: "specimen", pronunciation: "/ˈspesɪmən/", definition: "An individual example of an organism or rock collected for scientific study or display", translation: "mẫu vật (khoa học)", examples: ["An exceptionally preserved fossil specimen can reveal anatomical details not visible in fragmented remains.", "Museum collections of fossil specimens allow researchers worldwide to study ancient organisms without conducting fieldwork."], timestamp: 67, contextSentence: "Fossilization that does not alter a specimen can help to preserve its original form and texture." },
        { word: "carbonization", pronunciation: "/ˌkɑːbənaɪˈzeɪʃn/", definition: "A fossilization process in which organic material is compressed until only a thin film of carbon remains", translation: "quá trình carbon hóa (than hóa)", examples: ["Carbonization is the process by which compressed plant material formed the coal deposits that now fuel the world's power stations.", "Fern fossils preserved by carbonization often retain such detail that individual cell walls remain visible under a microscope."], timestamp: 128, contextSentence: "carbonization transforms soft tissues into thin black films of carbon." },
        { word: "permineralization", pronunciation: "/ˌpɜːmɪnərəlaɪˈzeɪʃn/", definition: "The most common fossilization process, in which minerals fill the spaces within bone or wood, turning organic tissue to stone", translation: "quá trình khoáng hóa (hóa đá)", examples: ["Permineralization preserved the dinosaur bones on display in natural history museums worldwide.", "Through permineralization, a tree trunk can be transformed into solid stone while retaining its original cellular structure."], timestamp: 141, contextSentence: "one of the most common types of fossilization that changes a specimen is called permineralization." },
        { word: "crystalline", pronunciation: "/ˈkrɪstəlaɪn/", definition: "Having a regular, repeating molecular structure characteristic of minerals; describing the network of minerals that replace organic tissue in permineralization", translation: "có cấu trúc tinh thể", examples: ["Minerals build a crystalline network inside fossilized bone, preserving its shape while replacing organic material.", "The crystalline structure of quartz makes it one of the most stable and common minerals found in permineralized fossils."], timestamp: 161, contextSentence: "building a crystalline network in the empty cavities." },
        { word: "genetic material", pronunciation: "/dʒəˈnetɪk məˈtɪəriəl/", definition: "DNA or RNA, the molecular information that encodes the characteristics of an organism and can sometimes be recovered from exceptionally preserved fossils", translation: "vật liệu di truyền (DNA)", examples: ["Insects in amber have been so well preserved that their genetic material was partially extracted and sequenced.", "The extraction of genetic material from ancient specimens opens new possibilities for understanding evolutionary relationships."], timestamp: 199, contextSentence: "their genetic material was extracted and partially sequenced." },
      ],
      grammars: [
        {
          title: "Passive voice for scientific processes (no human agent needed)",
          explanation: "Video dùng bị động liên tục khi mô tả quá trình thiên nhiên. Đây là đặc trưng văn phong khoa học học thuật, nhấn mạnh quá trình thay vì ai thực hiện.",
          structure: "Subject + is/are/was/were + past participle | Subject + has/have been + past participle",
          examples: [
            "Fossils are naturally preserved in stone through geological processes spanning millions of years.",
            "The genetic material of insects preserved in amber has been extracted and partially sequenced by researchers.",
            "During permineralization, the pores of dead plant or animal material are filled by minerals carried in groundwater.",
          ],
          timestamp: 141,
          contextSentence: "one of the most common types of fossilization that changes a specimen is called permineralization.",
        },
        {
          title: "Definition sentences with relative clauses (X is/are + noun + that/which...)",
          explanation: "Video định nghĩa từng loại hóa thạch và quá trình hóa thạch hóa bằng câu định nghĩa với relative clause. Đây là cấu trúc cốt lõi trong bài viết học thuật khi giới thiệu thuật ngữ khoa học.",
          structure: "X is/are a/an + [category noun] + that/which + [defining clause]",
          examples: [
            "Fossils are the preserved remains of ancient organisms that provide scientists with evidence of past life on Earth.",
            "Permineralization is a geological process in which minerals gradually replace organic tissue, turning bone into stone.",
            "A trace fossil is a record of an organism's behaviour, such as a footprint or burrow, rather than its physical remains.",
          ],
          timestamp: 14,
          contextSentence: "fossils are remnants or impressions of ancient organisms that are naturally preserved in stone.",
        },
        {
          title: "When + process clause: describing steps in a sequence",
          explanation: "Video dùng 'when' để nối từng bước trong quá trình hóa thạch. Cấu trúc này quan trọng khi viết description of a process trong Task 1 và Task 2 về chuỗi nhân quả.",
          structure: "When + subject + verb, + result clause | This process begins when + clause",
          examples: [
            "When an organism is covered in tree resin, it becomes entrapped as the resin forms a protective seal around it.",
            "When plant material is compressed under intense geological pressure, carbonization transforms it into a thin film of carbon.",
            "When minerals enter the pores of buried bone, they gradually build a crystalline network that preserves the original structure.",
          ],
          timestamp: 91,
          contextSentence: "This process begins when an organism is covered in tree sap.",
        },
        {
          title: "Over time + result: gradual change and transformation",
          explanation: "Video mô tả các quá trình diễn ra qua hàng triệu năm. Cấu trúc 'over time' + kết quả rất phổ biến khi viết về thay đổi môi trường hoặc quá trình tự nhiên.",
          structure: "Over time, + subject + verb | Over millions of years, + clause",
          examples: [
            "Over time, the soft tree resin hardens and turns into amber, with the organism suspended within.",
            "Over millions of years, carbonized plant material accumulated in thick layers, eventually forming the coal deposits we mine today.",
            "Over geological timescales, the minerals deposited during permineralization turn soft organic tissue into durable stone.",
          ],
          timestamp: 99,
          contextSentence: "over time the soft resin hardens and turns into amber with the organism suspended within.",
        },
        {
          title: "Can + verb for scientific potential and capability",
          explanation: "Video dùng 'can' để nói về tiềm năng thông tin của hóa thạch. Cấu trúc này quan trọng khi viết về khả năng giải quyết vấn đề trong body paragraphs.",
          structure: "Subject + can + verb | When conditions are right, + subject + can + verb",
          examples: [
            "When conditions are right, fossilization can preserve not only an organism's shape but also the chemical composition of its tissues.",
            "Permineralized wood can contain enough structural detail to identify the tree's genus and sometimes its species.",
            "Fossils preserved in amber can provide researchers with genetic material, offering a direct molecular link to the ancient past.",
          ],
          timestamp: 177,
          contextSentence: "When conditions are right, fossilization can preserve crucial information about an organism.",
        },
      ],
      notesContent: `National Geographic trình bày quá trình hóa thạch từ amber, than đá đến permineralization, là cách thiên nhiên bảo tồn sự sống trong đá hàng triệu năm.`,
    },

    // ── L4 — Band 6.0 — Ocean Plastic / Kurzgesagt ──────────────────────────
    {
      title: "The Plastic Crisis in Our Oceans",
      courseId: c1._id,
      targetBand: TargetBand.BAND_6_0,
      description: "Hành trình nhựa từ bờ biển vào chuỗi thức ăn, tác hại tích lũy đến hệ sinh thái biển và sức khỏe con người.",
      isPublished: true,
      videos: [
        {
          title: "Plastic Pollution: How Humans are Turning the World into Plastic",
          videoUrl: "https://www.youtube.com/watch?v=RS7IzU2VJIQ",
          duration: 420,
          thumbnailUrl: "https://img.youtube.com/vi/RS7IzU2VJIQ/hqdefault.jpg",
        },
      ],
      vocabularies: [
        { word: "polymer", pronunciation: "/ˈpɒlɪmə/", definition: "A large molecule made of long repeating chains of smaller units, which makes plastic durable and resistant to decay", translation: "polyme (chuỗi phân tử dài)", examples: ["Plastic is made from polymers, long repeating chains of molecule groups that resist biological breakdown.", "The polymer structure of plastic is what makes it so useful as a material, and so persistent as a pollutant."], timestamp: 76, contextSentence: "plastic is made from polymers long repeating chains of molecule groups." },
        { word: "crude oil", pronunciation: "/kruːd ɔɪl/", definition: "Raw petroleum extracted from underground, used as the primary raw material in conventional plastic production", translation: "dầu thô (nguyên liệu sản xuất nhựa)", examples: ["By breaking down crude oil and rearranging its components, chemists can form new synthetic polymers with extraordinary properties.", "As long as crude oil remains cheap, the financial incentive to manufacture virgin plastic rather than recycle will persist."], timestamp: 94, contextSentence: "by breaking down crude oil into its components and rearranging them, we can form new synthetic polymers." },
        { word: "synthetic", pronunciation: "/sɪnˈθetɪk/", definition: "Made by chemical processes rather than occurring naturally, describing man-made polymers that resist natural decomposition", translation: "tổng hợp / nhân tạo", examples: ["Synthetic polymers have extraordinary traits: they are lightweight, durable, and can be moulded into almost any shape.", "Unlike natural materials such as wood or cotton, synthetic plastics cannot be broken down by naturally occurring bacteria."], timestamp: 102, contextSentence: "synthetic polymers have extraordinary traits." },
        { word: "mass-produced", pronunciation: "/ˌmæs prəˈdjuːst/", definition: "Manufactured in very large quantities using automated processes, making products cheap but generating enormous quantities of waste", translation: "sản xuất hàng loạt", examples: ["Plastic can be mass-produced quickly and cheaply, which is why it displaced natural materials across virtually every industry.", "The very qualities that make plastic suitable for mass production, such as durability and low cost, are what make it an environmental disaster."], timestamp: 113, contextSentence: "plastic can be easily mass-produced." },
        { word: "packaging", pronunciation: "/ˈpækɪdʒɪŋ/", definition: "Materials used to wrap, contain, or protect products, accounting for the largest share of single-use plastic waste", translation: "bao bì (đóng gói)", examples: ["Forty percent of all plastics are used for packaging, most of which is discarded within minutes of purchase.", "Redesigning packaging to minimise plastic content is one of the most impactful steps manufacturers can take."], timestamp: 178, contextSentence: "40% of plastics are used for packaging." },
        { word: "recycling", pronunciation: "/ˌriːˈsaɪklɪŋ/", definition: "The process of converting waste materials into new products; currently applied to only a small fraction of plastic produced", translation: "tái chế", examples: ["Only 9% of all plastic ever produced has been recycled; the vast majority ends up in landfill, incinerated, or discarded in the environment.", "Effective recycling requires not just consumer willingness but also investment in sorting, collection, and processing infrastructure."], timestamp: 214, contextSentence: "nine percent was recycled, 12 burnt, but 79 of it is sticking around still." },
        { word: "microplastics", pronunciation: "/ˌmaɪkrəʊˈplæstɪks/", definition: "Plastic particles smaller than 5 millimetres, formed when larger plastics are broken down by sunlight, wave action, or physical wear", translation: "vi nhựa", examples: ["51 trillion microplastic particles are estimated to float in the world's oceans, where they are ingested by marine life at every level.", "Microplastics have been found in honey, beer, sea salt, tap water, and the human bloodstream."], timestamp: 267, contextSentence: "microplastics are pieces smaller than five millimeters." },
        { word: "food chain", pronunciation: "/fuːd tʃeɪn/", definition: "A linear sequence of organisms in which each is eaten by the next, forming a pathway by which pollutants travel from small organisms to large ones", translation: "chuỗi thức ăn", examples: ["Microplastics travel up the food chain from zooplankton to small fish to predatory fish and ultimately to humans.", "Chemical additives in plastic become more concentrated at each step of the food chain through a process called biomagnification."], timestamp: 314, contextSentence: "It would be pretty bad if micro plastics are toxic, because they travel up the food chain." },
        { word: "single-use", pronunciation: "/ˌsɪŋɡl juːz/", definition: "Designed to be used once and then discarded; the dominant model of plastic packaging that drives most ocean pollution", translation: "dùng một lần rồi bỏ", examples: ["Making a single-use plastic bag requires surprisingly little energy, but disposing of it sustainably takes thousands of years.", "A global shift away from single-use packaging is essential if ocean plastic pollution is to be reduced at scale."], timestamp: 386, contextSentence: "making a single-use plastic bag requires so little energy and produces far lower carbon dioxide emissions." },
        { word: "trade-off", pronunciation: "/ˈtreɪd ɒf/", definition: "A balance between two desirable but incompatible goals, where improving one comes at the expense of the other", translation: "sự đánh đổi", examples: ["The environmental debate around plastic involves difficult trade-offs: plastic packaging reduces food waste but creates ocean pollution.", "Policymakers face complex trade-offs when designing plastic bans, as alternatives often have higher carbon footprints."], timestamp: 405, contextSentence: "we're left with a complex process of trade-offs." },
        { word: "infrastructure", pronunciation: "/ˈɪnfrəstrʌktʃə/", definition: "The physical systems and facilities such as roads, factories, and collection points required to handle waste effectively", translation: "cơ sở hạ tầng (thu gom, tái chế)", examples: ["Countries with inadequate waste management infrastructure lack the means to prevent plastic from entering rivers and oceans.", "Investing in recycling infrastructure in rapidly industrialising nations is at least as important as awareness campaigns in wealthy countries."], timestamp: 462, contextSentence: "the garbage disposal infrastructure couldn't keep up with collecting and recycling all the new waste." },
        { word: "indigestible", pronunciation: "/ˌɪndɪˈdʒestɪbl/", definition: "Impossible to break down and absorb through digestion; in context, describing plastic that accumulates in animals' stomachs", translation: "không tiêu hóa được", examples: ["Many seabirds and whales are found dead with stomachs full of indigestible plastic, starving despite appearing to have eaten.", "Because plastic is indigestible, it accumulates in the gut rather than providing nutrition, eventually causing fatal blockages."], timestamp: 246, contextSentence: "Many animals starve with stomachs full of indigestible trash." },
      ],
      grammars: [
        {
          title: "Present Perfect + statistics for shocking scale statements",
          explanation: "Kurzgesagt mở bài và kết luận bằng số liệu quy mô lớn dùng present perfect. Đây là kỹ thuật hiệu quả trong Introduction và Topic Sentences của Band 6.",
          structure: "By [year], + subject + had/has + past participle | Since [year], + subject + has/have + past participle + [statistic]",
          examples: [
            "Since its invention roughly 100 years ago, plastic has transformed virtually every aspect of modern life.",
            "We have produced approximately 8.3 billion metric tonnes of plastic, and more than 6.3 billion tonnes have already become waste.",
            "By 2015, 90% of seabirds had already ingested plastic at some point in their lives.",
          ],
          timestamp: 186,
          contextSentence: "Since its invention, we have produced about 8.3 billion metric tons of plastic.",
        },
        {
          title: "Contrast connectors: compared to / whereas / while (for trade-off arguments)",
          explanation: "Video so sánh nhựa với các vật liệu thay thế, thừa nhận sự phức tạp. Đây là kỹ năng Band 6+ khi viết về trade-offs và lập luận hai chiều.",
          structure: "Compared to + noun, + clause | Whereas + clause, + clause | While + concession, + main point",
          examples: [
            "Making a single-use plastic bag produces far lower CO₂ emissions compared to manufacturing a cotton shopping bag.",
            "Whereas plastic packaging extends food shelf life and reduces food waste, its persistence in the environment poses enormous long-term risks.",
            "While banning plastic outright seems appealing, it ignores the complex trade-offs with alternatives that have their own environmental costs.",
          ],
          timestamp: 386,
          contextSentence: "making a single-use plastic bag requires so little energy and produces far lower carbon dioxide emissions compared to a reusable cotton bag.",
        },
        {
          title: "Relative clauses (which / that / where / whose) for defining and adding information",
          explanation: "Kurzgesagt dùng relative clauses để định nghĩa thuật ngữ khoa học và bổ sung thông tin, làm câu văn liền mạch và học thuật hơn.",
          structure: "Noun + which/that + verb | Noun + where/in which + clause",
          examples: [
            "Plastic is made from polymers, long repeating chains of molecule groups that are virtually indestructible by natural processes.",
            "The Yangtze River, which flushes 1.5 million tonnes of plastic into the ocean annually, is the world's most plastic-polluted waterway.",
            "Microplastics have been found in honey, sea salt, and tap water, environments where few consumers expect to encounter plastic contamination.",
          ],
          timestamp: 418,
          contextSentence: "one-third of all food that's produced is never eaten and ends up rotting away on landfills where it produces methane.",
        },
        {
          title: "Future predictions: will + verb / by [year] + will",
          explanation: "Video dùng dự đoán tương lai để nhấn mạnh tính cấp bách. Cấu trúc này quan trọng trong Conclusion khi đưa ra cảnh báo về hậu quả nếu không hành động.",
          structure: "Subject + will + verb (+ by [year]) | By [year], + subject + will have + past participle",
          examples: [
            "If current trends continue, plastic in the ocean will outweigh all the fish by 2050.",
            "Unless production is curbed significantly, global plastic waste will triple by mid-century.",
            "By 2100, virtually every seabird species will have been affected by plastic ingestion, according to current projections.",
          ],
          timestamp: 230,
          contextSentence: "it will outweigh all the fish in the ocean by 2050.",
        },
        {
          title: "Hedging language for scientific uncertainty: there is little science / inconclusive / might",
          explanation: "Video thận trọng khi nói về tác hại của microplastics vì khoa học chưa chắc chắn. Đây là kỹ năng quan trọng Band 6+ để thể hiện tư duy phê phán.",
          structure: "There is little/limited evidence that + clause | It remains inconclusive whether + clause | Research suggests that + clause, but + qualification",
          examples: [
            "There is limited scientific consensus on whether microplastics in food and water pose a direct threat to human health.",
            "It remains inconclusive whether the concentration of microplastics in the human body is sufficient to cause measurable harm.",
            "Research suggests that plastic additives like BPA may interfere with hormonal systems, but the long-term effects in humans remain unclear.",
          ],
          timestamp: 348,
          contextSentence: "there is little science about this so far and right now it's inconclusive.",
        },
      ],
      notesContent: `Hành trình nhựa từ bờ biển vào chuỗi thức ăn, tác hại tích lũy đến hệ sinh thái biển và sức khỏe con người.`,
    },

    // ── L5 — Band 7.0+ — Carbon Tax / TED Talk ──────────────────────────────
    {
      title: "Is It Too Late To Stop Climate Change?",
      courseId: c1._id,
      targetBand: TargetBand.BAND_7_PLUS,
      description: "Kurzgesagt phân tích liệu còn thời gian để hành động hay không, đề cập đến carbon budget, tipping points, khoảng cách giữa cam kết và thực tế, và vai trò của thay đổi hệ thống.",
      isPublished: true,
      videos: [
        {
          title: "Is It Too Late To Stop Climate Change? Well, it's Complicated. | Kurzgesagt",
          videoUrl: "https://www.youtube.com/watch?v=wbR-5mHI6bo",
          duration: 600,
          thumbnailUrl: "https://img.youtube.com/vi/wbR-5mHI6bo/hqdefault.jpg",
        },
      ],
      vocabularies: [
        { word: "greenhouse gases", pronunciation: "/ˈɡriːnhaʊs ɡæsɪz/", definition: "Gases such as CO₂ and methane that trap heat in the Earth's atmosphere, driving global warming", translation: "khí nhà kính", examples: ["Rapid climate change has been caused by the release of greenhouse gases, primarily CO₂ from burning fossil fuels.", "Reducing greenhouse gas concentrations in the atmosphere requires both eliminating emissions and scaling up natural carbon sinks."], timestamp: 22, contextSentence: "rapid climate change is being caused by the release of greenhouse gases." },
        { word: "emissions", pronunciation: "/ɪˈmɪʃnz/", definition: "The release of gases, especially CO₂, into the atmosphere through human activities such as burning fossil fuels", translation: "phát thải khí nhà kính", examples: ["In 2019, global CO₂ emissions were 50% higher than in the year 2000, despite decades of awareness of the climate crisis.", "Decoupling economic growth from emissions growth is the central challenge of the green energy transition."], timestamp: 31, contextSentence: "in 2019 the world was emitting 50% more CO₂ than in the year 2000." },
        { word: "energy intensity", pronunciation: "/ˈenədʒi ɪnˈtensɪti/", definition: "The amount of energy required to produce one unit of economic output; a measure of how efficiently an economy uses energy", translation: "cường độ năng lượng (hiệu quả sử dụng năng lượng)", examples: ["Improving energy intensity, making economies more efficient, is one of the four main levers for reducing CO₂ emissions.", "Technological advances in building insulation and industrial processes have reduced energy intensity significantly over the past 30 years."], timestamp: 234, contextSentence: "Energy intensity describes how efficiently we use energy." },
        { word: "electrification", pronunciation: "/ɪˌlektrɪfɪˈkeɪʃn/", definition: "The process of transitioning systems that currently run on fossil fuels, such as vehicles, heating, and industry, to run on electricity instead", translation: "điện khí hóa (chuyển sang dùng điện)", examples: ["The electrification of the transport sector, combined with a clean electricity grid, is one of the fastest ways to cut emissions.", "Electrification of industrial processes such as steel and cement production remains technologically challenging but essential for net zero."], timestamp: 272, contextSentence: "the electrification of the transportation and industrial sectors." },
        { word: "decouple", pronunciation: "/diːˈkʌpl/", definition: "To separate two things that were previously linked; in this context, to achieve economic growth without increasing CO₂ emissions", translation: "tách rời (tăng trưởng kinh tế khỏi phát thải)", examples: ["There are signs that economic growth can be decoupled from CO₂ emissions, but we are not yet close to achieving this globally.", "Decoupling prosperity from fossil fuel use requires massive investment in clean energy and a fundamental redesign of industrial systems."], timestamp: 200, contextSentence: "There are some signs that growth can be decoupled from CO₂ emissions." },
        { word: "rebound effect", pronunciation: "/rɪˈbaʊnd ɪˈfekt/", definition: "A phenomenon where efficiency gains lead to increased consumption, partially or fully offsetting the environmental benefit", translation: "hiệu ứng bật lại (tiết kiệm → dùng nhiều hơn)", examples: ["The rebound effect means that making cars more fuel-efficient can actually increase total fuel consumption if it leads to more driving.", "Direct rebound effects undermine the impact of energy efficiency improvements, making regulatory standards essential alongside market incentives."], timestamp: 291, contextSentence: "Direct Rebound Effects. This means that once something becomes more efficient, it's used more." },
        { word: "carbon footprint", pronunciation: "/ˈkɑːbən ˈfʊtprɪnt/", definition: "The total amount of CO₂ and equivalent greenhouse gases produced by a person, organisation, or activity", translation: "dấu chân carbon", examples: ["Humanity's global carbon footprint is the product of population size, economic activity, energy efficiency, and the carbon intensity of energy.", "A programmer in a wealthy nation typically has a carbon footprint 50 times larger than a subsistence farmer in a developing country."], timestamp: 392, contextSentence: "Humanity's global carbon footprint is the CO₂ released per energy unit generated." },
        { word: "fossil fuels", pronunciation: "/ˈfɒsl fjuːəlz/", definition: "Non-renewable energy sources such as coal, oil, and natural gas, formed from ancient organic material and the primary driver of CO₂ emissions", translation: "nhiên liệu hóa thạch", examples: ["Fossil fuels are the single greatest lever for reducing emissions; cutting their use is both the most impactful and most politically difficult action.", "Without fossil fuels, the industrial revolution as we know it would not have been possible, but their continued use threatens the stability of the climate system."], timestamp: 410, contextSentence: "Fossil fuels are the greatest lever humanity has right now." },
        { word: "subsidies", pronunciation: "/ˈsʌbsɪdiz/", definition: "Financial support provided by governments to reduce the cost of producing or consuming a good, in this context propping up fossil fuel industries", translation: "trợ cấp (của nhà nước cho nhiên liệu hóa thạch)", examples: ["Cutting subsidies to the fossil fuel industry and redirecting them to renewables is one of the highest-impact policy changes available.", "Global fossil fuel subsidies dwarf investment in renewable energy, creating a structural barrier to the clean energy transition."], timestamp: 447, contextSentence: "We can cut subsidies to the fossil fuel industry, and funnel them into renewables." },
        { word: "incentive", pronunciation: "/ɪnˈsentɪv/", definition: "A financial or regulatory mechanism that encourages a particular behaviour or investment choice", translation: "động lực / khuyến khích kinh tế", examples: ["Pricing carbon emissions harshly creates a powerful incentive for industry to switch to lower-emission alternatives.", "Without financial incentives, the transition to renewable energy will be slower than the climate requires, because inertia and vested interests will resist it."], timestamp: 458, contextSentence: "create strong incentives for the world's industries to transition." },
        { word: "carbon capture", pronunciation: "/ˈkɑːbən ˈkæptʃə/", definition: "Technology that removes CO₂ from the atmosphere or prevents it from entering it, typically by chemical processes or natural storage", translation: "thu giữ carbon", examples: ["Technologies like carbon capture could allow continued industrial activity while removing emissions, but costs remain high and scale is unproven.", "Carbon capture is not a substitute for reducing emissions; it is a supplementary tool that may help close the gap between pledges and targets."], timestamp: 482, contextSentence: "technologies like carbon capture, or a new generation of nuclear power plants." },
        { word: "net-zero", pronunciation: "/net ˈzɪərəʊ/", definition: "A state in which the greenhouse gases added to the atmosphere are balanced by an equivalent amount removed, resulting in no net increase", translation: "phát thải ròng bằng 0", examples: ["Over 130 countries have pledged to achieve net-zero emissions by 2050, but critics argue that many national plans lack credibility or funding.", "Reaching net-zero requires not only eliminating emissions but also deploying carbon removal at a scale that has never been attempted."], timestamp: 586, contextSentence: "the innovations that will lead the world to net zero carbon emissions." },
      ],
      grammars: [
        {
          title: "The more... the more: correlative comparison for policy trade-offs",
          explanation: "Kurzgesagt dùng cấu trúc này để diễn đạt quan hệ tỷ lệ thuận giữa hành động và kết quả, đặc trưng văn phong học thuật Band 7+, rất hiệu quả trong Conclusion.",
          structure: "The more + subject + verb, the more + subject + verb | The less... the more...",
          examples: [
            "The less fossil fuel we burn in the next decade, the more time we give innovation and renewable deployment to catch up.",
            "The more we invest in clean energy infrastructure today, the greater our capacity to compensate for population and economic growth.",
            "The more coal power plants currently under construction are cancelled, the lower the lock-in of emissions for the next 30 years.",
          ],
          timestamp: 511,
          contextSentence: "The less fossil fuel we burn over the next few years, the more time we give innovation to catch up.",
        },
        {
          title: "Concession + rebuttal: Although / While / Even though... + however / yet / but",
          explanation: "Video thừa nhận sự phức tạp của vấn đề (tăng trưởng kinh tế, nghèo đói) trước khi đưa ra phản bác. Cấu trúc này thể hiện tư duy phê phán Band 7+.",
          structure: "Although/While + concession clause, + main point | Concession. However, + rebuttal.",
          examples: [
            "Although economic growth has lifted billions out of poverty, its continued dependence on fossil fuels makes climate targets nearly impossible to meet.",
            "While developing nations have contributed little to historical emissions, they are among the most vulnerable to the consequences of climate change.",
            "Even though efficiency improvements have reduced the carbon intensity of many industries, rebound effects have often eroded the net benefit.",
          ],
          timestamp: 200,
          contextSentence: "There are some signs that growth can be decoupled from CO₂ emissions, but we're not close to that yet.",
        },
        {
          title: "Nominalization: converting verbs and adjectives into abstract nouns",
          explanation: "Video diễn đạt ý phức tạp bằng cụm danh từ học thuật, chuyển động từ sang danh từ tương đương để tăng độ súc tích và trang trọng.",
          structure: "Verb → Noun: electrify → electrification | reduce → reduction | invest → investment | emit → emission",
          examples: [
            "Our collective CO₂ emissions can be expressed as a product of four factors and their relationship with each other.",
            "The electrification of the transport sector and the phase-out of fossil fuel vehicles are among the most impactful near-term actions.",
            "The acceleration of clean energy deployment requires not just investment but also a fundamental reform of subsidy structures.",
          ],
          timestamp: 49,
          contextSentence: "Our collective CO₂ emissions can be expressed as a product of four factors and their relationship with each other.",
        },
        {
          title: "Without + gerund phrase: negative conditional for urgent action",
          explanation: "Cấu trúc 'Without + noun/gerund' diễn đạt điều kiện phủ định ngắn gọn hơn 'If we do not...', thể hiện văn phong học thuật chắc chắn, phù hợp Band 7+.",
          structure: "Without + noun/gerund phrase, + main clause | Without + noun, it will be impossible/unlikely to + verb",
          examples: [
            "Without new technologies and innovation, it will be impossible to achieve a zero-carbon economy, even with aggressive efficiency improvements.",
            "Without decisive policy action to price carbon and phase out fossil fuel subsidies, the clean energy transition will proceed far too slowly.",
            "Without massive investment in energy efficiency today, the carbon savings required by 2050 targets cannot be achieved by renewable energy alone.",
          ],
          timestamp: 476,
          contextSentence: "Without new technologies and innovation, it will be impossible to achieve a zero CO₂ emission world.",
        },
        {
          title: "Hedging with uncertainty markers: there are signs that / it is still possible / arguably",
          explanation: "Video tránh tuyệt đối hóa khi đề cập đến dự đoán tương lai. Đây là kỹ năng quan trọng Band 7+ thể hiện tư duy khoa học thận trọng.",
          structure: "There are signs that + clause | It is still possible/likely that + clause | Arguably, + clause",
          examples: [
            "There are some signs that economic growth can be decoupled from CO₂ emissions, but we are not yet close to achieving this at scale.",
            "It is still very much possible to limit warming to 1.5°C, but it requires a pace of change without historical precedent.",
            "Arguably, the greatest barrier to climate action is not technological or economic; it is the political will to confront vested interests in fossil fuels.",
          ],
          timestamp: 559,
          contextSentence: "it is still very much possible.",
        },
      ],
      notesContent: `Kurzgesagt phân tích liệu còn thời gian để hành động hay không, đề cập đến carbon budget, tipping points, khoảng cách giữa cam kết và thực tế, và vai trò của thay đổi hệ thống.`,
    },

    // ── L6 — Band 7.0+ — Christiana Figueres TED — Paris Agreement ──────────
    {
      title: "The Paris Agreement: Inside the World's Most Important Climate Deal",
      courseId: c1._id,
      targetBand: TargetBand.BAND_7_PLUS,
      description: "TED talk của Christiana Figueres, là trưởng đàm phán khí hậu LHQ, kể lại hành trình 6 năm từ thất bại ở Copenhagen đến Thỏa thuận Paris 2015. Bà giải thích ba làn sóng thay đổi: công nghệ, kinh tế, chính trị và vai trò của sự lạc quan như vũ khí ngoại giao.",
      isPublished: true,
      videos: [
        {
          title: "The Paris Agreement: Inside the World's Most Important Climate Deal | Christiana Figueres",
          videoUrl: "https://www.youtube.com/watch?v=MIA_1xQc7x8",
          duration: 895,
          thumbnailUrl: "https://img.youtube.com/vi/MIA_1xQc7x8/hqdefault.jpg",
        },
      ],
      vocabularies: [
        { word: "unanimously", pronunciation: "/juːˈnænɪməsli/", definition: "With complete agreement from all people involved, with no dissenting vote", translation: "nhất trí (100% đồng thuận)", examples: ["In 2015, 195 governments unanimously decided to change the course of the global economy to protect the most vulnerable.", "Achieving a unanimously adopted international agreement on climate was regarded as impossible before Paris, a fact that makes the outcome all the more remarkable."], timestamp: 38, contextSentence: "unanimously decided to intentionally change the course of the global economy in order to protect the most vulnerable." },
        { word: "entrenched", pronunciation: "/ɪnˈtrentʃt/", definition: "Firmly established and very difficult to change; used of attitudes, divisions, or systemic problems", translation: "ăn sâu / cố hữu (khó thay đổi)", examples: ["Copenhagen failed primarily because of a deeply entrenched divide between developed and developing nations over historical responsibility for emissions.", "Entrenched vested interests in the fossil fuel industry have consistently obstructed meaningful climate legislation at the national level."], timestamp: 83, contextSentence: "primarily because of the deeply entrenched divide between the global North and the global South." },
        { word: "sovereign", pronunciation: "/ˈsɒvrɪn/", definition: "Having supreme authority and independence, especially a government's right to make its own decisions without external control", translation: "có chủ quyền / tự chủ (không ai có quyền ép buộc)", examples: ["Figueres had full responsibility to deliver a climate agreement, yet no authority, because governments are sovereign in every decision they take.", "The voluntary nature of Paris targets reflects the political reality that sovereign nations cannot be compelled to adopt binding emissions cuts."], timestamp: 228, contextSentence: "you have absolutely no authority, because governments are sovereign in every decision that they take." },
        { word: "optimism", pronunciation: "/ˈɒptɪmɪzəm/", definition: "In Figueres' framing: not naive positivity, but active courage, hope, trust, and solidarity; the belief that collective human action can solve shared problems", translation: "tinh thần lạc quan / niềm tin tích cực", examples: ["Figueres argues that optimism, understood as courage, hope, trust, and solidarity, was the decisive diplomatic tool that unlocked the Paris Agreement.", "Optimism in international negotiations is not wishful thinking but a strategic choice; it is the refusal to accept paralysis as inevitable."], timestamp: 273, contextSentence: "let's understand it in its broader sense. Let's understand it as courage, hope, trust, solidarity." },
        { word: "solidarity", pronunciation: "/ˌsɒlɪˈdærɪti/", definition: "Unity and mutual support among a group of people facing a common challenge, especially across national or political divides", translation: "tinh thần đoàn kết", examples: ["Climate action requires solidarity between rich and poor nations: those who caused the problem must support those most vulnerable to its consequences.", "Solidarity, the willingness to act collectively even when individual short-term costs are high, is the foundation of any effective international agreement."], timestamp: 282, contextSentence: "courage, hope, trust, solidarity, the fundamental belief that we humans can come together and can help each other." },
        { word: "paralysis", pronunciation: "/pəˈræləsɪs/", definition: "A state of total inability to act; in political contexts, a deadlock so complete that no progress is possible", translation: "tình trạng bế tắc / tê liệt (không hành động được)", examples: ["After Copenhagen, there was no way to escape the paralysis of international climate negotiations without fundamentally changing the tone of the conversation.", "Political paralysis on climate policy, caused by short-term electoral pressures and fossil fuel lobbying, has cost humanity decades of crucial transition time."], timestamp: 296, contextSentence: "there was no way we were going to get out of the paralysis of Copenhagen." },
        { word: "precipitate", pronunciation: "/prɪˈsɪpɪteɪt/", definition: "To cause something to happen suddenly or sooner than expected, especially a significant change", translation: "khởi phát / thúc đẩy (điều gì đó xảy ra nhanh hơn)", examples: ["Changes in the global economy were precipitated by thousands of people, including entrepreneurs, investors, and city leaders, who saw the economic case for clean energy.", "The dramatic drop in renewable energy costs, precipitated by sustained public and private investment, transformed the political calculus of the Paris negotiations."], timestamp: 334, contextSentence: "we began to see changes happening in many areas, precipitated by thousands of people, including many of you here today." },
        { word: "intrinsic", pronunciation: "/ɪnˈtrɪnsɪk/", definition: "Belonging to the fundamental nature of something; inherent value that exists independently of external factors", translation: "vốn có / nội tại (giá trị trong bản thân sự vật)", examples: ["There are not only economic advantages to the energy transition but also intrinsic benefits: cleaner air, better health, and more liveable cities.", "The intrinsic benefits of a decarbonized economy, including improved public health, energy security, and reduced geopolitical instability, extend far beyond the climate itself."], timestamp: 401, contextSentence: "there also are economic advantages and intrinsic benefits, because the dissemination of the clean technologies is going to bring us cleaner air, better health." },
        { word: "dissemination", pronunciation: "/dɪˌsemɪˈneɪʃn/", definition: "The widespread distribution of something, such as information, technology, or practices, to a large number of people or places", translation: "sự phổ biến rộng rãi (công nghệ, thông tin)", examples: ["The dissemination of clean technologies worldwide will deliver cleaner air, better health, and improved energy access to the developing world.", "Accelerating the dissemination of proven low-carbon technologies to emerging economies is more effective than waiting for each country to independently develop its own solutions."], timestamp: 405, contextSentence: "the dissemination of the clean technologies is going to bring us cleaner air, better health, better transportation, more livable cities." },
        { word: "decarbonized", pronunciation: "/diːˈkɑːbənaɪzd/", definition: "Describing an economy or system that has eliminated or dramatically reduced its carbon dioxide emissions", translation: "đã phi carbon hóa / không còn phụ thuộc nhiên liệu hóa thạch", examples: ["The national contributions on the table are only the first step toward a decarbonized, highly resilient global economy.", "A fully decarbonized economy is achievable within decades if current technological and investment trends continue, but only if political will keeps pace."], timestamp: 565, contextSentence: "into a decarbonized highly resilient economy." },
        { word: "legally binding", pronunciation: "/ˈliːɡəli ˈbaɪndɪŋ/", definition: "Enforceable under law, creating obligations with legal consequences for non-compliance", translation: "có tính ràng buộc pháp lý", examples: ["Under the Paris Agreement, the measurement, reporting and verification of climate efforts, and the five-year checkpoints, are legally binding.", "The legally binding nature of the review process, even without binding targets, was a key diplomatic innovation that made universal participation possible."], timestamp: 580, contextSentence: "the measurement reporting and verification of all of those efforts is legally binding." },
        { word: "zero-sum", pronunciation: "/ˈzɪərəʊ sʌm/", definition: "Describing a situation where one party's gain is exactly equal to another's loss; the opposite of a cooperative win-win framework", translation: "tư duy được mất (một bên được thì bên kia mất)", examples: ["Figueres argues that humanity must reinterpret the zero-sum mentality: in a climate crisis, your loss is no longer my gain; we are either all losers or all winners.", "Traditional geopolitics operates on a zero-sum logic that is fundamentally incompatible with global challenges like climate change, which require every nation to win together."], timestamp: 833, contextSentence: "we have got to reinterpret the zero sum mentality." },
      ],
      grammars: [
        {
          title: "Emphatic concession reversal: That is X. But it is even more X...",
          explanation: "Figueres dùng cấu trúc nhượng bộ-đảo ngược để tăng impact của lập luận: thừa nhận một điều tích cực, rồi ngay lập tức nâng lên một cấp bằng 'But...even more'. Đây là công cụ mạnh để xây dựng lập luận thuyết phục trong Band 7+.",
          structure: "That is a [positive statement]. But it is even more [adjective] if you consider [deeper context].",
          examples: [
            "That is a remarkable diplomatic achievement. But it is even more remarkable if you consider that the same governments had failed catastrophically just six years earlier in Copenhagen.",
            "Renewable energy has become cheaper. But it is even more significant that its cost has fallen faster than any expert predicted ten years ago.",
            "International cooperation on climate has improved. But it is even more impressive when you consider the deeply entrenched national interests that negotiators had to overcome.",
          ],
          timestamp: 50,
          contextSentence: "that is a remarkable achievement but it is even more remarkable if you consider where we had been just a few years ago.",
        },
        {
          title: "Second Conditional for hypothetical scenarios: If + past simple, + would",
          explanation: "Figueres uses a hypothetical question to make the audience imagine an impossible responsibility, a powerful rhetorical device. In IELTS, this structure is essential for exploring policy consequences and alternative scenarios.",
          structure: "If + past simple, + would/could/might + base verb",
          examples: [
            "If you were told your job was to save the planet with full responsibility but no authority, the only viable strategy would be to change the tone of the entire conversation.",
            "If governments were willing to adopt legally binding emissions targets, international climate agreements would have far greater credibility, but far fewer signatories.",
            "If renewable energy costs continued to fall at their current rate, a fully decarbonized global electricity grid could become affordable within two decades.",
          ],
          timestamp: 210,
          contextSentence: "what you would do if you were told your job is to save the planet.",
        },
        {
          title: "Not just X but also Y: expanding scope for inclusive arguments",
          explanation: "Dùng để mở rộng phạm vi lập luận vượt ra ngoài điều hiển nhiên, đặc biệt mạnh khi muốn cho thấy ảnh hưởng rộng hơn dự kiến (ví dụ: không chỉ các nhà hoạt động mà còn CEO dầu khí cũng ủng hộ chuyển đổi xanh).",
          structure: "It is not just + [obvious group/factor] + but also + [surprising/broader group/factor]",
          examples: [
            "It is not just climate activists but also major oil and gas executives who now acknowledge that the long-term viability of their industry depends on the energy transition.",
            "The benefits of cleaner energy are not just environmental but also economic: better health outcomes, reduced energy import costs, and new industrial employment.",
            "Climate change is not just an environmental challenge but also a security, economic, and human rights issue, requiring responses across every area of public policy.",
          ],
          timestamp: 459,
          contextSentence: "And it wasn't just the usual suspects.",
        },
        {
          title: "From X to Y: parallel structure for describing transformation",
          explanation: "Figueres uses this structure to describe the entire arc of climate diplomacy in one powerful sentence. 'From X to Y' is essential in IELTS for describing change over time, policy shifts, or historical transformations.",
          structure: "From + [starting point], to + [end point] | From + [negative state] to + [positive state]",
          examples: [
            "Climate diplomacy moved from the paralysis of Copenhagen to the unanimous adoption of Paris through six years of relentless, strategic optimism.",
            "The energy transition has shifted the debate from whether a low-carbon economy is possible to how quickly it can be achieved.",
            "Governments evolved from viewing climate action as an economic burden to recognising it as a national interest, a shift that made the Paris Agreement possible.",
          ],
          timestamp: 778,
          contextSentence: "we have come over the past six years from the impossible to the now Unstoppable, from confrontation to collaboration.",
        },
        {
          title: "Either...or: reframing a binary choice to shift the argument",
          explanation: "Figueres ends her talk by collapsing the false zero-sum logic: in a shared planetary crisis, the choice is not between winners and losers but between collective survival and collective failure. This structure is powerful in IELTS conclusions.",
          structure: "We are either + [outcome A] + or + [outcome B] | It is either X or Y; there is no third option.",
          examples: [
            "On climate change, there is no middle ground: we are either all losers, or, if we act collectively, we can all be winners.",
            "Governments face a stark choice on the energy transition: either lead the shift to renewables and capture its economic benefits, or resist it and be left with stranded fossil fuel assets.",
            "Either the international community develops genuine mechanisms to hold nations accountable for their climate commitments, or the Paris Agreement will follow Kyoto into irrelevance.",
          ],
          timestamp: 861,
          contextSentence: "we're either all losers or we all can be winners.",
        },
      ],
      notesContent: `TED talk của Christiana Figueres, là trưởng đàm phán khí hậu LHQ, kể lại hành trình 6 năm từ thất bại ở Copenhagen đến Thỏa thuận Paris 2015. Bà giải thích ba làn sóng thay đổi: công nghệ, kinh tế, chính trị và vai trò của sự lạc quan như vũ khí ngoại giao.`,
    },
  ]);

  console.log("📖 Lessons created:", lessons.length);
  await CourseModel.findByIdAndUpdate(c1._id, { totalLessons: lessons.length });
  const [l1, l3, l4, l5, l6] = lessons;

  // ── 5. EXAM QUESTIONS ────────────────────────────────────────────────────────

  const [q1, q2, q3] = await ExamQuestionModel.insertMany([
    {
      title: "Recycling: Legal Requirement",
      topicId: t1._id,
      questionPrompt: "Some people claim that not enough of the waste from homes is recycled. They say that the only way to increase recycling is for governments to make it a legal requirement. To what extent do you agree or disagree?",
      suggestedOutline: "<p><strong>Dạng bài:</strong> Đồng tình hoặc Không đồng tình</p><p><strong>Quan điểm:</strong> Hoàn toàn không đồng ý với việc ban hành luật là cách duy nhất để tăng cường tái chế vì việc đầu tư vào cơ sở hạ tầng và giáo dục nhận thức mang lại hiệu quả tốt hơn nhiều.</p><p><strong>Mở bài:</strong> Viết lại vấn đề đang được tranh luận về việc bắt buộc tái chế bằng luật pháp. Khẳng định sự không đồng tình mạnh mẽ với quan điểm đó và giới thiệu nội dung bài viết.</p><p><strong>Thân bài 1: Lý do thứ nhất giải thích vì sao luật pháp không hiệu quả bằng việc xây dựng cơ sở hạ tầng:</strong></p><ul><li>Chỉ áp dụng luật sẽ không hiệu quả nếu thiếu hệ thống hỗ trợ tái chế, người dân vẫn có thể vứt rác lén lút ra môi trường.</li><li>Chính phủ nên đầu tư vào các hệ thống tái chế như thùng rác phân loại, dịch vụ thu gom thường xuyên và trung tâm tái chế để người dân dễ dàng thực hiện.</li><li>Ví dụ minh họa từ Thụy Điển về hệ thống hoàn trả tiền cọc ở mỗi khu dân cư đã giúp nước này trở thành một trong những quốc gia sạch nhất thế giới.</li></ul><p><strong>Thân bài 2: Lý do thứ hai nhấn mạnh vai trò quan trọng của giáo dục và nâng cao nhận thức:</strong></p><ul><li>Các chiến dịch truyền thông rộng rãi giúp người dân hiểu rõ lợi ích của việc tái chế và khuyến khích họ sống thân thiện với môi trường hơn.</li><li>Khi người dân biết được tác hại của việc xả rác bừa bãi đến động vật hoang dã, nguồn nước và khí hậu thì họ sẽ chủ động thay đổi thói quen.</li><li>Ví dụ thực tế từ một nghiên cứu tại Mỹ cho thấy chiến dịch giáo dục đã thúc đẩy rất nhiều gia đình mua thùng rác phân loại, chứng minh sức mạnh của kiến thức.</li></ul><p><strong>Kết bài:</strong> Nhìn nhận lại rằng việc dùng luật để ép buộc có thể mang lại một chút tác dụng nhưng không hiệu quả về lâu dài. Khẳng định lại việc kết hợp giáo dục cộng đồng và xây dựng hệ thống hỗ trợ tái chế sẽ mang lại tác động lớn và bền vững hơn.</p>",
      difficultyLevel: 1,
      isPublished: true,
      attemptCount: 0,
    },
    {
      title: "Plastic Pollution: Causes and Solutions",
      topicId: t1._id,
      questionPrompt: "Plastic pollution has become a major problem affecting both marine ecosystems and human health. What are the main causes of this problem and what measures can be taken to address it?",
      suggestedOutline: "<p><strong>Dạng bài:</strong> Nguyên nhân và Giải pháp</p><p><strong>Quan điểm:</strong> Ô nhiễm nhựa chủ yếu bắt nguồn từ thói quen dùng đồ nhựa một lần và khâu xử lý rác yếu kém, do đó cần có các quy định hạn chế đồ nhựa và nâng cấp hệ thống tái chế để khắc phục.</p><p><strong>Mở bài:</strong> Viết lại tình trạng ô nhiễm nhựa đang đe dọa nghiêm trọng đến đại dương và sức khỏe con người. Nêu rõ mục đích bài viết là chỉ ra nguyên nhân và đề xuất các biện pháp giải quyết.</p><p><strong>Thân bài 1: Những nguyên nhân chính gây ra tình trạng ô nhiễm nhựa:</strong></p><ul><li>Sự phụ thuộc quá mức vào các sản phẩm nhựa dùng một lần như túi nilon, ống hút và ly nhựa vì chúng rất tiện lợi và có giá thành rẻ trong đời sống hàng ngày.</li><li>Hệ thống quản lý rác thải ở nhiều nơi còn kém, khiến cho một lượng rác khổng lồ không được phân loại và xử lý đúng cách mà bị xả thẳng ra biển và môi trường tự nhiên.</li></ul><p><strong>Thân bài 2: Các giải pháp hiệu quả để khắc phục vấn đề này:</strong></p><ul><li>Chính phủ cần đưa ra các quy định cấm hoặc đánh thuế cao đối với đồ nhựa dùng một lần, đồng thời khuyến khích người dân và doanh nghiệp chuyển sang dùng các vật liệu dễ phân hủy như giấy hoặc tre.</li><li>Cần đầu tư ngân sách vào việc xây dựng các nhà máy tái chế hiện đại để thu gom và xử lý rác thải nhựa triệt để trước khi chúng trôi ra đại dương gây hại cho các loài sinh vật.</li></ul><p><strong>Kết bài:</strong> Khẳng định lại ô nhiễm nhựa chủ yếu là do thói quen tiêu dùng và khâu quản lý rác chưa tốt. Nhấn mạnh rằng nếu áp dụng đồng bộ các giải pháp thay thế vật liệu và nâng cấp công nghệ thì chúng ta hoàn toàn có thể bảo vệ được Trái Đất và sức khỏe con người.</p>",
      difficultyLevel: 2,
      isPublished: true,
      attemptCount: 0,
    },
    {
      title: "Species Loss vs Other Environmental Problems",
      topicId: t1._id,
      questionPrompt: "Some people say that the main environmental problem of our time is the loss of particular species of plants and animals. Others say that there are more important environmental problems. Discuss both views and give your own opinion.",
      suggestedOutline: "<p><strong>Dạng bài:</strong> Bàn luận hai ý kiến và đưa ra quan điểm cá nhân</p><p><strong>Quan điểm:</strong> Các vấn đề như ô nhiễm và biến đổi khí hậu nguy hiểm hơn vì chúng chính là nguyên nhân gốc rễ làm cho các loài động thực vật biến mất. Do đó, thay vì chỉ tập trung cứu các loài sinh vật, chúng ta phải giải quyết tận gốc tất cả các vấn đề môi trường này cùng một lúc.</p><p><strong>Mở bài:</strong> Khẳng định sự đồng tình với ý kiến cho rằng các vấn đề môi trường khác nghiêm trọng hơn và giới thiệu nội dung bài viết.</p><p><strong>Thân bài 1: Ý kiến thứ nhất về việc sự tuyệt chủng của các loài động thực vật cụ thể là vấn đề chính:</strong></p><ul><li>Gây ảnh hưởng xấu đến sự phong phú của các loài sinh vật trên hành tinh.</li><li>Việc chặt phá cây cối để phục vụ công nghiệp và nông nghiệp khiến cho không khí bị thiếu oxy và làm cho đất bị xói mòn.</li><li>Việc săn bắt trái phép các động vật quý hiếm làm hỏng chuỗi thức ăn trong tự nhiên. Ví dụ cụ thể là khi cá mập bị săn bắt để lấy vây thì các loài sinh vật dưới nước không còn bị kiểm soát số lượng bởi loài săn mồi này, dẫn đến việc mất cân bằng môi trường sống dưới nước.</li></ul><p><strong>Thân bài 2: Ý kiến thứ hai và quan điểm cá nhân về việc các vấn đề khác khẩn cấp hơn:</strong></p><ul><li>Ô nhiễm môi trường và biến đổi khí hậu là nguyên nhân chính làm giảm số lượng các loài sinh vật và đẩy môi trường sống vào nguy cơ bị phá hủy.</li><li>Sự ô nhiễm nguồn nước và đất làm nhiễm độc nhiều loài động vật trên cạn cũng như dưới nước, điều này cũng gây hại cho sức khỏe con người vì những động vật này là nguồn thức ăn quan trọng.</li><li>Biến đổi khí hậu làm thời tiết thay đổi thất thường, gây ra nhiều thiên tai hơn như hạn hán, lũ lụt và cháy rừng.</li></ul><p><strong>Kết bài:</strong> Khẳng định lại rằng việc các loài sinh vật biến mất cần được chú ý nhiều, nhưng các vấn đề môi trường khác cũng quan trọng như vậy. Đưa ra lời khuyên là nên tập trung giải quyết tất cả các vấn đề cùng một lúc thay vì chỉ chú ý vào sự tuyệt chủng của động thực vật.</p>",
      difficultyLevel: 3,
      isPublished: true,
      attemptCount: 0,
    },
  ]);
  console.log("❓ Exam Questions created:", q1._id, q2._id, q3._id);

  // ── 6. SAMPLE ESSAYS ─────────────────────────────────────────────────────────

  const [e1, e2, e3] = await SampleEssayModel.insertMany([
    // ── E1 — Band 7.0 — Discussion — Q3 (Species loss) ──────────────────────
    {
      title: "Species Extinction or Systemic Threats: Which Demands Greater Urgency?",
      topicId: t1._id,
      questionPrompt: q3.get("questionPrompt"),
      overallBandScore: 7.0,
      authorName: "Zim.vn",
      isPublished: true,
      favoriteCount: 2,
      outlineContent: "<p><strong>Dạng bài:</strong> Bàn luận hai ý kiến và đưa ra quan điểm cá nhân</p><p><strong>Quan điểm:</strong> Các vấn đề như ô nhiễm và biến đổi khí hậu nguy hiểm hơn vì chúng chính là nguyên nhân gốc rễ làm cho các loài động thực vật biến mất. Do đó, thay vì chỉ tập trung cứu các loài sinh vật, chúng ta phải giải quyết tận gốc tất cả các vấn đề môi trường này cùng một lúc.</p><p><strong>Mở bài:</strong> Khẳng định sự đồng tình với ý kiến cho rằng các vấn đề môi trường khác nghiêm trọng hơn và giới thiệu nội dung bài viết.</p><p><strong>Thân bài 1: Ý kiến thứ nhất về việc sự tuyệt chủng của các loài động thực vật cụ thể là vấn đề chính:</strong></p><ul><li>Gây ảnh hưởng xấu đến sự phong phú của các loài sinh vật trên hành tinh.</li><li>Việc chặt phá cây cối để phục vụ công nghiệp và nông nghiệp khiến cho không khí bị thiếu oxy và làm cho đất bị xói mòn.</li><li>Việc săn bắt trái phép các động vật quý hiếm làm hỏng chuỗi thức ăn trong tự nhiên. Ví dụ cụ thể là khi cá mập bị săn bắt để lấy vây thì các loài sinh vật dưới nước không còn bị kiểm soát số lượng bởi loài săn mồi này, dẫn đến việc mất cân bằng môi trường sống dưới nước.</li></ul><p><strong>Thân bài 2: Ý kiến thứ hai và quan điểm cá nhân về việc các vấn đề khác khẩn cấp hơn:</strong></p><ul><li>Ô nhiễm môi trường và biến đổi khí hậu là nguyên nhân chính làm giảm số lượng các loài sinh vật và đẩy môi trường sống vào nguy cơ bị phá hủy.</li><li>Sự ô nhiễm nguồn nước và đất làm nhiễm độc nhiều loài động vật trên cạn cũng như dưới nước, điều này cũng gây hại cho sức khỏe con người vì những động vật này là nguồn thức ăn quan trọng.</li><li>Biến đổi khí hậu làm thời tiết thay đổi thất thường, gây ra nhiều thiên tai hơn như hạn hán, lũ lụt và cháy rừng.</li></ul><p><strong>Kết bài:</strong> Khẳng định lại rằng việc các loài sinh vật biến mất cần được chú ý nhiều, nhưng các vấn đề môi trường khác cũng quan trọng như vậy. Đưa ra lời khuyên là nên tập trung giải quyết tất cả các vấn đề cùng một lúc thay vì chỉ chú ý vào sự tuyệt chủng của động thực vật.</p>",
      fullEssayContent: `Many people think that the loss of particular plants and animal species is the main environmental problem that humans are facing nowadays, while others believe that some other environmental issues are more alarming. I agree with the latter view and will analyse both views in the following essay.

On the one hand, the loss of animal and plant species is considered the main environmental problem because of its impact on our planet's biodiversity. Around the world, trees are being cut down for industrial and agriculture purposes. As a result, there will not be enough trees to produce oxygen for humans and prevent soil erosion. Meanwhile, endangered animals are being poached to serve people's needs, hence negatively affecting the whole ecosystem. For example, when sharks are killed for their fins, many types of aquatic species no longer have their natural predators to control their population. Consequently, the disappearance of predators disrupts the natural food chain and then leads to unbalanced underwater ecosystems.

On the other hand, there are more urgent environmental issues than the loss of plant and animal species. Those problems, which include pollution and climate change, are the main factors that cause the loss of biodiversity and put the natural habitat on the brink of destruction. Water and soil pollution caused by industrial and agricultural activities are poisoning a large number of species of marine and land animals, which means that human health is also negatively affected as those animals are humans' important food source. Moreover, changing weather patterns caused by climate change lead to more frequent occurrences of natural disasters such as droughts, floods and wildfires.

In conclusion, it is true that the loss of particular plants and animals should be paid great attention to, but other environmental issues should also be taken into consideration. I think we should put a great deal of effort into tackling all of those problems rather than only focusing on the animals and plants' extinction.`,
      highlightAnnotations: [
        {
          text: "biodiversity",
          highlightType: HighlightType.VOCABULARY,
          explanation: "'biodiversity': từ kỹ thuật quan trọng nhất của chủ đề, dùng chính xác ngay câu mở Body 1 để nêu impact. Thay vì nói chung chung 'harmful to nature' hay 'animals and plants in general', 'biodiversity' gói gọn toàn bộ khái niệm đa dạng sinh học trong một từ duy nhất, đặc trưng Band 7.",
          color: "#fbbf24",
        },
        {
          text: "trees are being cut down for industrial and agriculture purposes",
          highlightType: HighlightType.GRAMMAR,
          explanation: "Passive continuous: 'are being cut down': be + being + past participle, nhấn mạnh hoạt động đang xảy ra và chưa kết thúc. Dùng passive vì tác nhân (con người) ít quan trọng hơn đối tượng bị ảnh hưởng (cây cối). Bài dùng thêm 'are being poached' ở câu tiếp, thể hiện variety trong passive voice.",
          color: "#818cf8",
        },
        {
          text: "endangered animals are being poached",
          highlightType: HighlightType.VOCABULARY,
          explanation: "'poached' (săn trộm) chính xác hơn 'illegally killed/hunted'. 'Endangered' (bị đe dọa tuyệt chủng) là tính từ kỹ thuật chuẩn. Cả hai từ thể hiện kiến thức chuyên ngành về môi trường; examiners đánh giá cao technical vocabulary dùng đúng ngữ cảnh.",
          color: "#fbbf24",
        },
        {
          text: "when sharks are killed for their fins, many types of aquatic species no longer have their natural predators to control their population. Consequently,",
          highlightType: HighlightType.STRUCTURE,
          explanation: "Ví dụ cụ thể với chuỗi nhân quả hoàn chỉnh: sự kiện → hậu quả gần → hậu quả xa. Không dừng ở 'sharks are killed' mà trace toàn bộ logic: predators gone → population uncontrolled → food chain disrupted → ecosystems unbalanced. Đây là cách phát triển ví dụ Band 7: mỗi bước có lý giải, dùng 'Consequently' đúng chỗ.",
          color: "#34d399",
        },
        {
          text: "the disappearance of predators disrupts the natural food chain",
          highlightType: HighlightType.GRAMMAR,
          explanation: "Nominalization: 'disappear' (v) → 'the disappearance of' (n). Thay vì 'After predators disappear, the food chain is disrupted', bài dùng cụm danh từ làm chủ ngữ, gọn hơn và học thuật hơn. Đây là đặc trưng Band 7+: abstract noun phrase thay vì simple subject + verb.",
          color: "#818cf8",
        },
        {
          text: "Those problems, which include pollution and climate change,",
          highlightType: HighlightType.GRAMMAR,
          explanation: "Non-defining relative clause với dấu phẩy bao quanh: 'Those problems, which include pollution and climate change,': bổ sung thông tin liệt kê ví dụ mà không cần câu riêng. Phân biệt với defining relative clause (không có dấu phẩy). Cách 'nén' thông tin vào một câu duy nhất của Band 6+.",
          color: "#818cf8",
        },
        {
          text: "are the main factors that cause the loss of biodiversity and put the natural habitat",
          highlightType: HighlightType.ARGUMENT,
          explanation: "Lập luận cốt lõi của Body 2: không chỉ liệt kê 'vấn đề khác' mà tuyên bố rõ: ô nhiễm và biến đổi khí hậu là nguyên nhân gốc rễ gây mất đa dạng sinh học. Logic này vừa trả lời đề (other problems > species loss) vừa liên kết hai body paragraphs lại với nhau, thể hiện cấu trúc lập luận Band 7.",
          color: "#f87171",
        },
        {
          text: "on the brink of destruction",
          highlightType: HighlightType.VOCABULARY,
          explanation: "'on the brink of destruction': idiomatic expression đặc thù Environmental essays. Mạnh hơn 'in danger of being destroyed' hay 'almost destroyed'. 'Brink' (bờ vực) gợi sự cấp bách, nguy hiểm sắp xảy ra, tạo emotional weight cho lập luận mà không cần dùng từ cảm thán.",
          color: "#fbbf24",
        },
        {
          text: "which means that human health is also negatively affected as those animals are humans' important food source",
          highlightType: HighlightType.ARGUMENT,
          explanation: "Mở rộng impact: ô nhiễm → động vật bị nhiễm độc → con người ăn động vật → con người bị ảnh hưởng. 'Which means that' kết nối hậu quả môi trường trực tiếp với lợi ích con người. Đây là lập luận Band 7: không chỉ nói 'tốt cho thiên nhiên' mà chứng minh tại sao con người phải quan tâm.",
          color: "#f87171",
        },
      ],
    },

    // ── E2 — Band 8.0 — Problems-Solutions — Q2 (Plastic pollution) ────────────
    {
      title: "The Growing Crisis of Plastic Pollution: Problems and Solutions",
      topicId: t1._id,
      questionPrompt: "More and more plastic waste is polluting the world's cities, countryside, and oceans. What problems will it cause? What measures should be taken to solve these problems?",
      overallBandScore: 8.0,
      authorName: "study4.com",
      isPublished: true,
      favoriteCount: 1,
      outlineContent: "<p><strong>Dạng bài:</strong> Vấn đề và Giải pháp</p><p><strong>Quan điểm:</strong> Rác thải nhựa gây ra nhiều khó khăn lớn cho hệ sinh thái và con người, do đó cần phải áp dụng các biện pháp thực tế như phát triển kinh tế tuần hoàn và nâng cao ý thức cộng đồng để khắc phục tình trạng này.</p><p><strong>Mở bài:</strong> Viết lại tình trạng rác thải nhựa đang ngày càng nghiêm trọng. Nêu rõ mục đích của bài viết là phân tích những tác hại và đề xuất các cách giải quyết.</p><p><strong>Thân bài 1: Những vấn đề do rác thải nhựa gây ra:</strong></p><ul><li>Gây nguy hiểm cho hệ sinh thái và động vật hoang dã vì nhiều loài vật nhầm rác nhựa là thức ăn nên nuốt phải, dẫn đến bị thương hoặc mất mạng.</li><li>Làm hỏng môi trường sống tự nhiên như bờ biển và dòng nước, làm mất đi cảnh quan đẹp và không gian vui chơi. Điều này ảnh hưởng trực tiếp đến người dân và các ngành kinh tế địa phương phụ thuộc vào du lịch.</li></ul><p><strong>Thân bài 2: Các giải pháp để khắc phục vấn đề:</strong></p><ul><li>Thúc đẩy nền kinh tế tuần hoàn bằng cách thiết kế đồ nhựa để có thể tái sử dụng hoặc tái chế. Chính phủ và các công ty cần hỗ trợ việc dùng bao bì thân thiện với môi trường và đưa ra các quy định xử lý rác thải tốt hơn.</li><li>Nâng cao hiểu biết của người dân thông qua các chương trình giáo dục. Việc này giúp mọi người thấy rõ hậu quả của rác thải nhựa, từ đó khuyên họ bớt dùng đồ nhựa, chuyển sang đồ dùng nhiều lần và phân loại rác đúng quy định.</li></ul><p><strong>Kết bài:</strong> Khẳng định lại rác thải nhựa là một mối đe dọa lớn. Nhấn mạnh rằng nếu thực hiện tốt các biện pháp trên thì chúng ta có thể giảm bớt thiệt hại và bảo vệ Trái Đất hướng tới một tương lai tốt đẹp hơn.</p>",
      fullEssayContent: `The increasing amount of plastic waste polluting the world's cities, countryside, and oceans has become a pressing environmental concern. This essay will discuss the problems caused by plastic pollution and propose measures that can be taken to mitigate these issues.

Plastic waste poses numerous challenges for both the environment and human health. Firstly, plastic pollution negatively impacts ecosystems and wildlife. Many animals, including marine species, often mistake plastic debris for food, leading to ingestion, injury, and even death. Secondly, plastic pollution contributes to the deterioration of natural habitats, such as coastlines and waterways, adversely affecting their aesthetic appeal and reducing their recreational value. This can have negative implications for local communities and industries, such as tourism, that rely on the attractiveness of these areas.

To combat the growing problem of plastic waste, several measures can be implemented. One such measure is the promotion of a circular economy, in which plastic materials are designed for reuse, recycling, or composting. Governments and industries can incentivize the use of eco-friendly packaging materials, support research and development of sustainable alternatives, and implement policies that encourage recycling and responsible waste management. Another measure is raising public awareness about the issue of plastic pollution and the importance of responsible consumption. Educational campaigns can inform individuals about the environmental and health consequences of plastic waste and encourage them to reduce their plastic consumption, adopt reusable alternatives, and recycle properly.

In conclusion, plastic waste poses significant problems for the environment, wildlife, and human health. By adopting the strategies mentioned above, we can work towards a more sustainable future and reduce the detrimental impact of plastic waste on our planet.`,
      highlightAnnotations: [
        {
          text: "pressing environmental concern",
          highlightType: HighlightType.VOCABULARY,
          explanation: "'pressing' (cấp bách) kết hợp với 'concern' (mối lo ngại) tạo thành một cụm từ học thuật tự nhiên. Thay vì dùng 'serious problem' thông thường, cặp từ này thể hiện ngay từ đầu bài rằng người viết có vốn từ vựng rộng hơn mức trung bình.",
          color: "#fbbf24",
        },
        {
          text: "Many animals, including marine species, often mistake plastic debris for food, leading to ingestion, injury, and even death.",
          highlightType: HighlightType.GRAMMAR,
          explanation: "Câu này dùng hai cách bổ sung thông tin mà không cần viết thêm câu riêng: cụm 'including marine species' chèn vào giữa để thu hẹp đối tượng, và cụm 'leading to ingestion, injury, and even death' ở cuối để nêu hậu quả. Kỹ thuật gói nhiều ý vào một câu duy nhất là dấu hiệu của khả năng viết Band 6+.",
          color: "#818cf8",
        },
        {
          text: "deterioration of natural habitats",
          highlightType: HighlightType.VOCABULARY,
          explanation: "Thay vì viết 'natural habitats are getting worse/damaged', bài chuyển động từ thành danh từ: 'deterioration' (sự xuống cấp). Cách danh từ hóa như vậy làm câu gọn và học thuật hơn, phù hợp phong cách viết Band 6+.",
          color: "#fbbf24",
        },
        {
          text: "adversely affecting their aesthetic appeal and reducing their recreational value",
          highlightType: HighlightType.GRAMMAR,
          explanation: "Thay vì viết thêm câu mới, bài dùng cụm động từ '-ing' để nối trực tiếp vào câu trước. Hai hành động song song 'adversely affecting...' và 'reducing...' giúp câu gọn và có nhịp điệu tốt hơn.",
          color: "#818cf8",
        },
        {
          text: "This can have negative implications for local communities and industries, such as tourism, that rely on the attractiveness of these areas.",
          highlightType: HighlightType.ARGUMENT,
          explanation: "Bài không dừng ở việc nói 'môi trường bị ô nhiễm' mà mở rộng sang tác động kinh tế và xã hội: khi bờ biển và sông ngòi mất đi vẻ đẹp tự nhiên, ngành du lịch và cộng đồng địa phương cũng bị ảnh hưởng theo. Cách lập luận mở rộng như vậy cho thấy người viết hiểu sâu hơn về mức độ tác động của vấn đề.",
          color: "#f87171",
        },
        {
          text: "One such measure is the promotion of",
          highlightType: HighlightType.STRUCTURE,
          explanation: "Hai câu mở đầu của đoạn giải pháp dùng chung cấu trúc 'One such measure... Another measure...' — người đọc nhận ra ngay bố cục hai giải pháp mà không cần đọc toàn đoạn. Khả năng tổ chức đoạn văn rõ ràng như vậy là một trong những yếu tố được đánh giá trong tiêu chí mạch lạc và liên kết.",
          color: "#34d399",
        },
        {
          text: "a circular economy",
          highlightType: HighlightType.VOCABULARY,
          explanation: "Đây là thuật ngữ chuyên ngành về chính sách môi trường — mô hình trong đó vật liệu được tái sử dụng thay vì bỏ đi sau một lần dùng. Dùng đúng thuật ngữ như thế này thể hiện người viết nắm được kiến thức nền về chủ đề, không chỉ dùng ngôn ngữ chung chung.",
          color: "#fbbf24",
        },
        {
          text: "in which plastic materials are designed for reuse, recycling, or composting",
          highlightType: HighlightType.GRAMMAR,
          explanation: "Mệnh đề quan hệ dùng 'in which' thay vì 'where' thông thường — cách dùng chính xác và trang trọng hơn khi nói về một mô hình trừu tượng. Ba hành động ở cuối câu 'reuse, recycling, or composting' được viết đúng dạng song song — tất cả đều là danh từ.",
          color: "#818cf8",
        },
        {
          text: "Governments and industries can incentivize the use of eco-friendly packaging materials, support research and development of sustainable alternatives, and implement policies that encourage recycling and responsible waste management.",
          highlightType: HighlightType.ARGUMENT,
          explanation: "Câu này nêu ba hành động cụ thể mà chính phủ và doanh nghiệp có thể thực hiện, với chủ thể rõ ràng (ai làm gì). Đề xuất giải pháp có phân vai như vậy là đặc trưng của bài đạt điểm tốt ở tiêu chí trả lời đúng yêu cầu đề.",
          color: "#f87171",
        },
      ],
    },

    // ── E3 — Band 7.5 — Agree-Disagree — Q1 (Recycling) ─────────────────────
    {
      title: "Beyond Legislation: Infrastructure and Education as Keys to Recycling",
      topicId: t1._id,
      questionPrompt: q1.get("questionPrompt"),
      overallBandScore: 7.5,
      authorName: "writing9.com",
      isPublished: true,
      favoriteCount: 0,
      outlineContent: "<p><strong>Dạng bài:</strong> Đồng tình hoặc Không đồng tình</p><p><strong>Quan điểm:</strong> Hoàn toàn không đồng ý với việc ban hành luật là cách duy nhất để tăng cường tái chế vì việc đầu tư vào cơ sở hạ tầng và giáo dục nhận thức mang lại hiệu quả tốt hơn nhiều.</p><p><strong>Mở bài:</strong> Viết lại vấn đề đang được tranh luận về việc bắt buộc tái chế bằng luật pháp. Khẳng định sự không đồng tình mạnh mẽ với quan điểm đó và giới thiệu nội dung bài viết.</p><p><strong>Thân bài 1: Lý do thứ nhất giải thích vì sao luật pháp không hiệu quả bằng việc xây dựng cơ sở hạ tầng:</strong></p><ul><li>Chỉ áp dụng luật sẽ không hiệu quả nếu thiếu hệ thống hỗ trợ tái chế, người dân vẫn có thể vứt rác lén lút ra môi trường.</li><li>Chính phủ nên đầu tư vào các hệ thống tái chế như thùng rác phân loại, dịch vụ thu gom thường xuyên và trung tâm tái chế để người dân dễ dàng thực hiện.</li><li>Ví dụ minh họa từ Thụy Điển về hệ thống hoàn trả tiền cọc ở mỗi khu dân cư đã giúp nước này trở thành một trong những quốc gia sạch nhất thế giới.</li></ul><p><strong>Thân bài 2: Lý do thứ hai nhấn mạnh vai trò quan trọng của giáo dục và nâng cao nhận thức:</strong></p><ul><li>Các chiến dịch truyền thông rộng rãi giúp người dân hiểu rõ lợi ích của việc tái chế và khuyến khích họ sống thân thiện với môi trường hơn.</li><li>Khi người dân biết được tác hại của việc xả rác bừa bãi đến động vật hoang dã, nguồn nước và khí hậu thì họ sẽ chủ động thay đổi thói quen.</li><li>Ví dụ thực tế từ một nghiên cứu tại Mỹ cho thấy chiến dịch giáo dục đã thúc đẩy rất nhiều gia đình mua thùng rác phân loại, chứng minh sức mạnh của kiến thức.</li></ul><p><strong>Kết bài:</strong> Nhìn nhận lại rằng việc dùng luật để ép buộc có thể mang lại một chút tác dụng nhưng không hiệu quả về lâu dài. Khẳng định lại việc kết hợp giáo dục cộng đồng và xây dựng hệ thống hỗ trợ tái chế sẽ mang lại tác động lớn và bền vững hơn.</p>",
      fullEssayContent: `In recent years, the question of whether governments should introduce laws requiring people to recycle has been widely debated. While some contend that only legislation can compel people to manage their waste, I firmly disagree with that and will explain my reasons.

To begin with, law enforcement alone cannot effectively encourage individuals to live more sustainably, as residents may still fly-tip when sustainable infrastructure is lacking. Governments should invest in recycling infrastructure, such as separate bins, regular collection services, and accessible recycling centres, which facilitate recycling processes. For example, Swedish authorities promote households' garbage separation by providing deposit-refund schemes in every neighbourhood, which has helped the nation become one of most cleanest countries worldwide. As a result, developing eco-friendly structures that help residents sort their household waste can have a long-lasting effect.

Furthermore, wide-ranging campaigns that educate individuals about the positive impacts of recycling can strongly motivate them to adopt a more sustainable lifestyle. If residents are informed that thoughtless littering has negative consequences, including harming marine life and terrestrial wildlife, polluting water, and accelerating climate change, they are more likely to change their behaviour.For instance, a 2023 study in the United States found that over 56% of households purchased recycling containers following a large educational campaign, demonstrating the importance of knowledge as an effective tool.

To conclude, although enacting laws that prohibit the disposal of unsorted garbage can have some effects, I am convinced that they are not effective in the long term. Investing not only in public education but also in establishing sustainable systems to support recycling is far more impactful.`,
      highlightAnnotations: [
        {
          text: "fly-tip",
          highlightType: HighlightType.VOCABULARY,
          explanation: "'fly-tip' (đổ rác trái phép ở nơi không được phép) là từ rất đặc thù, chính xác hơn nhiều so với 'throw away rubbish illegally' hay 'dump waste'. Đây là từ vựng Band 7+ thể hiện người viết hiểu cả vấn đề pháp lý lẫn hành vi thực tế của người dân khi thiếu cơ sở hạ tầng.",
          color: "#fbbf24",
        },
        {
          text: "which facilitate recycling processes",
          highlightType: HighlightType.GRAMMAR,
          explanation: "Mệnh đề quan hệ không xác định với dấu phẩy — 'which' bổ sung thêm thông tin về chức năng của các trung tâm tái chế mà không làm gián đoạn mạch liệt kê. Dấu phẩy trước 'which' là dấu hiệu phân biệt với mệnh đề xác định — cách dùng đúng và trang trọng.",
          color: "#818cf8",
        },
        {
          text: "Swedish authorities promote households' garbage separation by providing",
          highlightType: HighlightType.STRUCTURE,
          explanation: "Ví dụ hoàn chỉnh với ba thành phần: tên quốc gia cụ thể (Thụy Điển) + tên chính sách cụ thể (deposit-refund schemes) + kết quả đo lường được (một trong những quốc gia sạch nhất). So với kiểu ví dụ chung chung 'some countries have achieved good results', cấu trúc ví dụ này thuyết phục hơn nhiều.",
          color: "#34d399",
        },
        {
          text: "deposit-refund schemes",
          highlightType: HighlightType.VOCABULARY,
          explanation: "Thuật ngữ chính sách cụ thể chỉ cơ chế đặt cọc-hoàn tiền khi trả lại bao bì. Thay vì nói chung chung 'financial incentives', người viết dùng đúng tên gọi của chính sách — thể hiện kiến thức nền về các giải pháp môi trường thực tế đang được triển khai.",
          color: "#fbbf24",
        },
        {
          text: "thoughtless littering",
          highlightType: HighlightType.VOCABULARY,
          explanation: "Cụm từ kết hợp thái độ ('thoughtless' — vô ý thức) với hành vi ('littering' — xả rác). Chính xác và gọn hơn cách nói 'irresponsible disposal of waste' hay 'throwing rubbish carelessly'. Đặt trong mệnh đề điều kiện, cụm này tạo ra lập luận rõ ràng: nhận thức thay đổi → hành vi thay đổi.",
          color: "#fbbf24",
        },
        {
          text: "including harming marine life and terrestrial wildlife, polluting water, and accelerating climate change",
          highlightType: HighlightType.GRAMMAR,
          explanation: "Câu điều kiện loại 1 với danh sách ba hậu quả nhúng vào bên trong qua 'including'. Ba động từ dạng '-ing' ('harming', 'polluting', 'accelerating') song song nhau — cách liệt kê học thuật mà không cần viết thêm câu. Cấu trúc dài nhưng rõ ràng và đúng ngữ pháp.",
          color: "#818cf8",
        },
        {
          text: "a 2023 study in the United States found that over 56% of households purchased recycling containers following a large educational campaign, demonstrating the importance of knowledge as an effective tool.",
          highlightType: HighlightType.STRUCTURE,
          explanation: "Dẫn chứng nghiên cứu gồm đủ: năm (2023), địa điểm (United States), số liệu cụ thể (56%), hành động (purchased recycling containers), và kết luận rút ra (demonstrating...). Cụm phân từ 'demonstrating...' ở cuối giúp nối dữ liệu với lập luận mà không cần viết thêm câu mới.",
          color: "#34d399",
        },
        {
          text: "although enacting laws that prohibit the disposal of unsorted garbage can have some effects, I am convinced that they are not effective in the long term.",
          highlightType: HighlightType.ARGUMENT,
          explanation: "Nhượng bộ và phản bác trong cùng một câu: thừa nhận luật pháp 'can have some effects' (không phủ nhận hoàn toàn) rồi lập tức giới hạn lại bằng 'not effective in the long term'. Cách kết luận như vậy thể hiện lập luận cân bằng hơn là chỉ đơn giản bác bỏ — dấu hiệu của tư duy phê phán Band 7+.",
          color: "#f87171",
        },
        {
          text: "Investing not only in public education but also in establishing sustainable systems to support recycling is far more impactful.",
          highlightType: HighlightType.GRAMMAR,
          explanation: "Cặp liên từ 'not only...but also' nối hai cụm danh từ hóa ('investing in public education' và 'establishing sustainable systems') làm chủ ngữ kép. Đây là cấu trúc nâng cao tóm tắt hai luận điểm của toàn bài trong một câu duy nhất — đặc trưng của phần kết Band 7+.",
          color: "#818cf8",
        },
      ],
    },
  ]);
  console.log("📝 Sample Essays created:", e1._id, e2._id, e3._id);

  // ── 8. FLASHCARD SET + FLASHCARDS ─────────────────────────────────────────
  // 6 sets riêng biệt theo từng lesson, mỗi set 12 thẻ từ vocabulary của lesson đó

  const [fs1, fs3, fs4, fs5, fs6] = await FlashcardSetModel.insertMany([
    {
      type: FlashcardSetType.LESSON,
      lessonId: l1._id,
      title: "Flashcard set của video Too Much Plastic: Is Recycling Enough?",
      description: "12 từ vựng từ video Vox về hành trình nhựa trong đại dương: debris, accumulate, microplastics, degrade và các từ liên quan.",
    },
    {
      type: FlashcardSetType.LESSON,
      lessonId: l3._id,
      title: "Flashcard set của video Fossils 101: How Life Becomes Stone",
      description: "12 từ vựng khoa học từ video National Geographic về hóa thạch: fossilization, permineralization, amber, specimen và các từ liên quan.",
    },
    {
      type: FlashcardSetType.LESSON,
      lessonId: l4._id,
      title: "Flashcard set của video The Plastic Crisis in Our Oceans",
      description: "12 từ vựng từ video Kurzgesagt về ô nhiễm nhựa toàn cầu: polymer, microplastics, single-use, trade-off, infrastructure và các từ liên quan.",
    },
    {
      type: FlashcardSetType.LESSON,
      lessonId: l5._id,
      title: "Flashcard set của video Is It Too Late To Stop Climate Change?",
      description: "12 từ vựng từ video Kurzgesagt về biến đổi khí hậu: emissions, electrification, rebound effect, net-zero, carbon capture và các từ liên quan.",
    },
    {
      type: FlashcardSetType.LESSON,
      lessonId: l6._id,
      title: "Flashcard set của video The Paris Agreement: Inside the World's Most Important Climate Deal",
      description: "12 từ vựng từ TED Talk của Christiana Figueres về Paris Agreement: unanimously, entrenched, sovereign, optimism, legally binding và các từ liên quan.",
    },
  ]);

  await FlashcardModel.insertMany([
    // ── FS1 — L1 "Too Much Plastic" (Vox) — 12 thẻ ──────────────────────────
    {
      setId: fs1._id,
      frontContent: "debris",
      backContent: "<p><strong>Nghĩa:</strong> Rác thải, mảnh vỡ rải rác trong môi trường tự nhiên</p><p><strong>Phát âm:</strong> /ˈdebriː/</p><p><strong>Ví dụ:</strong> <em>Plastic debris accumulates in ocean gyres due to swirling currents, forming the Great Pacific Garbage Patch.</em></p><p><strong>Từ đồng nghĩa:</strong> waste, litter, fragments, refuse, wreckage</p>",
      reviewCount: 5,
      nextReviewDate: daysAgo(-3),
    },
    {
      setId: fs1._id,
      frontContent: "accumulate",
      backContent: "<p><strong>Nghĩa:</strong> Tích tụ, dần dần tập hợp lại với số lượng lớn theo thời gian</p><p><strong>Phát âm:</strong> /əˈkjuːmjəleɪt/</p><p><strong>Ví dụ:</strong> <em>Plastic has accumulated in ocean gyres for decades because currents trap floating debris.</em></p><p><strong>Từ đồng nghĩa:</strong> build up, collect, gather, amass, pile up</p>",
      reviewCount: 4,
      nextReviewDate: daysAgo(-2),
    },
    {
      setId: fs1._id,
      frontContent: "microscopic",
      backContent: "<p><strong>Nghĩa:</strong> Cực nhỏ, chỉ nhìn thấy được qua kính hiển vi, không thể thấy bằng mắt thường</p><p><strong>Phát âm:</strong> /ˌmaɪkrəˈskɒpɪk/</p><p><strong>Ví dụ:</strong> <em>Plastic objects range in size from large debris to microscopic fragments invisible to the naked eye.</em></p><p><strong>Từ đồng nghĩa:</strong> tiny, minute, infinitesimal, submicroscopic, invisible</p>",
      reviewCount: 4,
      nextReviewDate: daysAgo(-2),
    },
    {
      setId: fs1._id,
      frontContent: "garbage patch",
      backContent: "<p><strong>Nghĩa:</strong> Vùng rác thải đại dương, khu vực tập trung nhựa do dòng hải lưu xoay vòng</p><p><strong>Phát âm:</strong> /ˈɡɑːbɪdʒ pætʃ/</p><p><strong>Ví dụ:</strong> <em>The Great Pacific Garbage Patch covers an area roughly twice the size of Texas.</em></p><p><strong>Từ đồng nghĩa:</strong> marine debris zone, plastic gyre, floating waste zone, ocean waste area</p>",
      reviewCount: 3,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fs1._id,
      frontContent: "sediment",
      backContent: "<p><strong>Nghĩa:</strong> Trầm tích, vật chất lắng xuống đáy biển theo từng lớp ghi lại lịch sử môi trường</p><p><strong>Phát âm:</strong> /ˈsedɪmənt/</p><p><strong>Ví dụ:</strong> <em>Sea floor sediment cores show that microplastic levels have doubled every 15 years since the 1950s.</em></p><p><strong>Từ đồng nghĩa:</strong> deposits, silt, residue, alluvium, sedimentation</p>",
      reviewCount: 3,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fs1._id,
      frontContent: "fragment",
      backContent: "<p><strong>Nghĩa:</strong> Mảnh vỡ nhỏ, hình thành khi vật thể lớn bị phân rã do ánh sáng, sóng biển hoặc va chạm</p><p><strong>Phát âm:</strong> /ˈfræɡmənt/</p><p><strong>Ví dụ:</strong> <em>Sunlight and wave action cause plastic objects to fragment into smaller and smaller pieces over time.</em></p><p><strong>Từ đồng nghĩa:</strong> piece, shard, particle, chip, splinter</p>",
      reviewCount: 3,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fs1._id,
      frontContent: "microplastics",
      backContent: "<p><strong>Nghĩa:</strong> Vi nhựa, hạt nhựa nhỏ hơn 5mm hình thành khi nhựa lớn bị phân hủy dần trong môi trường</p><p><strong>Phát âm:</strong> /ˌmaɪkrəʊˈplæstɪks/</p><p><strong>Ví dụ:</strong> <em>Microplastics have been detected in human blood, sea salt, and the deepest ocean trenches.</em></p><p><strong>Từ đồng nghĩa:</strong> plastic particles, nano-plastics, plastic fragments, plastic debris</p>",
      reviewCount: 2,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fs1._id,
      frontContent: "degrade",
      backContent: "<p><strong>Nghĩa:</strong> Phân hủy, bị phá vỡ thành các mảnh nhỏ hơn hoặc hợp chất đơn giản hơn qua quá trình vật lý hoặc hóa học</p><p><strong>Phát âm:</strong> /dɪˈɡreɪd/</p><p><strong>Ví dụ:</strong> <em>Conventional plastic does not fully degrade; it merely fragments into smaller and smaller particles.</em></p><p><strong>Từ đồng nghĩa:</strong> break down, decompose, deteriorate, decay, disintegrate</p>",
      reviewCount: 2,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fs1._id,
      frontContent: "dense",
      backContent: "<p><strong>Nghĩa:</strong> Có tỷ trọng cao, nặng hơn nước nên có thể chìm xuống đáy đại dương</p><p><strong>Phát âm:</strong> /dens/</p><p><strong>Ví dụ:</strong> <em>About half of all plastic waste is more dense than seawater, allowing it to sink to the ocean floor.</em></p><p><strong>Từ đồng nghĩa:</strong> heavy, compact, thick, concentrated, high-density</p>",
      reviewCount: 2,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fs1._id,
      frontContent: "persistent",
      backContent: "<p><strong>Nghĩa:</strong> Bền vững, khó phân hủy, tồn tại lâu dài trong môi trường và kháng lại quá trình phân hủy tự nhiên</p><p><strong>Phát âm:</strong> /pəˈsɪstənt/</p><p><strong>Ví dụ:</strong> <em>The persistent nature of synthetic polymers means that virtually every piece of plastic ever produced still exists in some form.</em></p><p><strong>Từ đồng nghĩa:</strong> long-lasting, enduring, durable, stable, non-degradable</p>",
      reviewCount: 1,
      nextReviewDate: daysAgo(1),
    },
    {
      setId: fs1._id,
      frontContent: "shoreline",
      backContent: "<p><strong>Nghĩa:</strong> Bờ biển, vùng ven biển nơi nước gặp đất liền và là nơi phần lớn nhựa tích tụ trước khi ra đại dương</p><p><strong>Phát âm:</strong> /ˈʃɔːlaɪn/</p><p><strong>Ví dụ:</strong> <em>Research suggests that most ocean plastic remains near shorelines rather than drifting to the open sea.</em></p><p><strong>Từ đồng nghĩa:</strong> coastline, waterfront, beach, coastal zone, littoral zone</p>",
      reviewCount: 1,
      nextReviewDate: daysAgo(1),
    },
    {
      setId: fs1._id,
      frontContent: "food web",
      backContent: "<p><strong>Nghĩa:</strong> Mạng lưới thức ăn, hệ thống các mối quan hệ ăn nhau phức tạp trong hệ sinh thái mà qua đó chất ô nhiễm lan rộng</p><p><strong>Phát âm:</strong> /fuːd web/</p><p><strong>Ví dụ:</strong> <em>Once microplastics enter the food web via plankton, they travel up through fish, seabirds, and ultimately to humans.</em></p><p><strong>Từ đồng nghĩa:</strong> ecosystem network, trophic web, feeding network, ecological network</p>",
      reviewCount: 0,
      nextReviewDate: daysAgo(2),
    },

    // ── FS3 — L3 "Fossils 101" (National Geographic) — 12 thẻ ───────────────
    {
      setId: fs3._id,
      frontContent: "fossil",
      backContent: "<p><strong>Nghĩa:</strong> Hóa thạch, phần còn lại hoặc dấu vết của sinh vật cổ đại được bảo tồn tự nhiên trong đá</p><p><strong>Phát âm:</strong> /ˈfɒsl/</p><p><strong>Ví dụ:</strong> <em>Fossils are the primary evidence scientists use to reconstruct the history of life on Earth.</em></p><p><strong>Từ đồng nghĩa:</strong> remains, specimen, relic, impression, preserved organism</p>",
      reviewCount: 4,
      nextReviewDate: daysAgo(-2),
    },
    {
      setId: fs3._id,
      frontContent: "fossil record",
      backContent: "<p><strong>Nghĩa:</strong> Hồ sơ hóa thạch, toàn bộ bộ sưu tập hóa thạch đã biết ghi lại lịch sử sự sống trên Trái Đất qua thời gian địa chất</p><p><strong>Phát âm:</strong> /ˈfɒsl ˈrekəd/</p><p><strong>Ví dụ:</strong> <em>The fossil record provides a primary account of how life has changed over billions of years.</em></p><p><strong>Từ đồng nghĩa:</strong> geological record, paleontological record, biological history in stone</p>",
      reviewCount: 4,
      nextReviewDate: daysAgo(-2),
    },
    {
      setId: fs3._id,
      frontContent: "fossilization",
      backContent: "<p><strong>Nghĩa:</strong> Quá trình hóa thạch hóa, quá trình tự nhiên mà sinh vật được bảo tồn trong đá hoặc vật liệu khác sau khi chết</p><p><strong>Phát âm:</strong> /ˌfɒsəlaɪˈzeɪʃn/</p><p><strong>Ví dụ:</strong> <em>Only a tiny fraction of organisms undergo fossilization; most decompose without leaving any trace.</em></p><p><strong>Từ đồng nghĩa:</strong> petrification, mineralization, preservation, lithification</p>",
      reviewCount: 3,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fs3._id,
      frontContent: "amber",
      backContent: "<p><strong>Nghĩa:</strong> Hổ phách, nhựa cây hóa thạch có thể bảo tồn sinh vật (đặc biệt côn trùng) chi tiết phi thường qua hàng triệu năm</p><p><strong>Phát âm:</strong> /ˈæmbə/</p><p><strong>Ví dụ:</strong> <em>Insects preserved in amber retain soft tissue structures that have long since decomposed in other fossil types.</em></p><p><strong>Từ đồng nghĩa:</strong> petrified resin, tree resin fossil, fossilized sap</p>",
      reviewCount: 3,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fs3._id,
      frontContent: "resin",
      backContent: "<p><strong>Nghĩa:</strong> Nhựa cây, chất dính do cây tiết ra có thể bẫy sinh vật và cuối cùng cứng lại thành hổ phách</p><p><strong>Phát âm:</strong> /ˈrezɪn/</p><p><strong>Ví dụ:</strong> <em>When an insect lands on tree resin, it can become permanently entrapped as the resin hardens around it.</em></p><p><strong>Từ đồng nghĩa:</strong> sap, pitch, gum, tree sap, plant exudate</p>",
      reviewCount: 3,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fs3._id,
      frontContent: "specimen",
      backContent: "<p><strong>Nghĩa:</strong> Mẫu vật khoa học, ví dụ cá thể của sinh vật hoặc đá được thu thập để nghiên cứu hoặc trưng bày</p><p><strong>Phát âm:</strong> /ˈspesɪmən/</p><p><strong>Ví dụ:</strong> <em>An exceptionally preserved fossil specimen can reveal anatomical details not visible in fragmented remains.</em></p><p><strong>Từ đồng nghĩa:</strong> sample, example, instance, case study, subject</p>",
      reviewCount: 2,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fs3._id,
      frontContent: "carbonization",
      backContent: "<p><strong>Nghĩa:</strong> Quá trình carbon hóa (than hóa), quá trình hóa thạch mà chất hữu cơ bị nén lại cho đến khi chỉ còn lớp carbon mỏng</p><p><strong>Phát âm:</strong> /ˌkɑːbənaɪˈzeɪʃn/</p><p><strong>Ví dụ:</strong> <em>Carbonization is the process by which compressed plant material formed the coal deposits that now fuel the world's power stations.</em></p><p><strong>Từ đồng nghĩa:</strong> coalification, charring, carbon film formation</p>",
      reviewCount: 2,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fs3._id,
      frontContent: "permineralization",
      backContent: "<p><strong>Nghĩa:</strong> Quá trình khoáng hóa (hóa đá), quá trình hóa thạch phổ biến nhất trong đó khoáng chất lấp đầy khoang xương hoặc gỗ biến mô hữu cơ thành đá</p><p><strong>Phát âm:</strong> /ˌpɜːmɪnərəlaɪˈzeɪʃn/</p><p><strong>Ví dụ:</strong> <em>Through permineralization, a tree trunk can be transformed into solid stone while retaining its original cellular structure.</em></p><p><strong>Từ đồng nghĩa:</strong> petrifaction, mineral replacement, silicification, petrification</p>",
      reviewCount: 2,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fs3._id,
      frontContent: "body fossil",
      backContent: "<p><strong>Nghĩa:</strong> Hóa thạch thân, hóa thạch gồm phần vật chất thực tế của sinh vật như xương, vỏ hoặc răng</p><p><strong>Phát âm:</strong> /ˈbɒdi ˈfɒsl/</p><p><strong>Ví dụ:</strong> <em>Body fossils such as dinosaur bones allow palaeontologists to reconstruct the size, diet, and movement of ancient species.</em></p><p><strong>Từ đồng nghĩa:</strong> physical remain, skeletal fossil, corporeal fossil</p>",
      reviewCount: 1,
      nextReviewDate: daysAgo(1),
    },
    {
      setId: fs3._id,
      frontContent: "trace fossil",
      backContent: "<p><strong>Nghĩa:</strong> Hóa thạch dấu vết, hóa thạch ghi lại hành vi của sinh vật như dấu chân, hang hốc thay vì phần vật chất</p><p><strong>Phát âm:</strong> /treɪs ˈfɒsl/</p><p><strong>Ví dụ:</strong> <em>Trace fossils such as dinosaur footprints reveal information about how ancient animals moved and interacted.</em></p><p><strong>Từ đồng nghĩa:</strong> behavioral fossil, impression fossil, ichnofossil</p>",
      reviewCount: 1,
      nextReviewDate: daysAgo(1),
    },
    {
      setId: fs3._id,
      frontContent: "crystalline",
      backContent: "<p><strong>Nghĩa:</strong> Có cấu trúc tinh thể, mô tả mạng lưới khoáng chất thay thế mô hữu cơ trong quá trình khoáng hóa hóa thạch</p><p><strong>Phát âm:</strong> /ˈkrɪstəlaɪn/</p><p><strong>Ví dụ:</strong> <em>Minerals build a crystalline network inside fossilized bone, preserving its shape while replacing organic material.</em></p><p><strong>Từ đồng nghĩa:</strong> mineral, geometric, latticed, ordered structure</p>",
      reviewCount: 0,
      nextReviewDate: daysAgo(2),
    },
    {
      setId: fs3._id,
      frontContent: "genetic material",
      backContent: "<p><strong>Nghĩa:</strong> Vật liệu di truyền (DNA), thông tin phân tử mã hóa đặc điểm của sinh vật và đôi khi có thể được trích xuất từ hóa thạch bảo tồn đặc biệt tốt</p><p><strong>Phát âm:</strong> /dʒəˈnetɪk məˈtɪəriəl/</p><p><strong>Ví dụ:</strong> <em>Insects in amber have been so well preserved that their genetic material was partially extracted and sequenced.</em></p><p><strong>Từ đồng nghĩa:</strong> DNA, hereditary material, genomic material, biological blueprint</p>",
      reviewCount: 0,
      nextReviewDate: daysAgo(2),
    },

    // ── FS4 — L4 "Plastic Pollution" (Kurzgesagt) — 12 thẻ ──────────────────
    {
      setId: fs4._id,
      frontContent: "polymer",
      backContent: "<p><strong>Nghĩa:</strong> Polyme, phân tử lớn được tạo thành từ các chuỗi dài lặp lại, là cấu trúc hóa học làm cho nhựa bền và kháng phân hủy</p><p><strong>Phát âm:</strong> /ˈpɒlɪmə/</p><p><strong>Ví dụ:</strong> <em>Plastic is made from polymers, long repeating chains of molecule groups that resist biological breakdown.</em></p><p><strong>Từ đồng nghĩa:</strong> plastic compound, macromolecule, synthetic material, chain molecule</p>",
      reviewCount: 4,
      nextReviewDate: daysAgo(-2),
    },
    {
      setId: fs4._id,
      frontContent: "single-use",
      backContent: "<p><strong>Nghĩa:</strong> Dùng một lần rồi bỏ, thiết kế để sử dụng một lần duy nhất và là mô hình bao bì nhựa chiếm ưu thế gây ô nhiễm đại dương</p><p><strong>Phát âm:</strong> /ˌsɪŋɡl juːz/</p><p><strong>Ví dụ:</strong> <em>A global shift away from single-use packaging is essential if ocean plastic pollution is to be reduced at scale.</em></p><p><strong>Từ đồng nghĩa:</strong> disposable, throwaway, one-time use, non-reusable</p>",
      reviewCount: 4,
      nextReviewDate: daysAgo(-2),
    },
    {
      setId: fs4._id,
      frontContent: "trade-off",
      backContent: "<p><strong>Nghĩa:</strong> Sự đánh đổi, sự cân bằng giữa hai mục tiêu mong muốn nhưng xung đột nhau, cải thiện mục tiêu này ảnh hưởng đến mục tiêu kia</p><p><strong>Phát âm:</strong> /ˈtreɪd ɒf/</p><p><strong>Ví dụ:</strong> <em>The environmental debate around plastic involves difficult trade-offs: plastic packaging reduces food waste but creates ocean pollution.</em></p><p><strong>Từ đồng nghĩa:</strong> compromise, balance, give-and-take, sacrifice, dilemma</p>",
      reviewCount: 3,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fs4._id,
      frontContent: "microplastics",
      backContent: "<p><strong>Nghĩa:</strong> Vi nhựa, hạt nhựa nhỏ hơn 5mm hình thành khi nhựa lớn bị ánh sáng, sóng biển hoặc ma sát phá vỡ</p><p><strong>Phát âm:</strong> /ˌmaɪkrəʊˈplæstɪks/</p><p><strong>Ví dụ:</strong> <em>51 trillion microplastic particles are estimated to float in the world's oceans, where they are ingested by marine life at every level.</em></p><p><strong>Từ đồng nghĩa:</strong> plastic particles, nano-plastics, micro-fragments, plastic debris</p>",
      reviewCount: 3,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fs4._id,
      frontContent: "infrastructure",
      backContent: "<p><strong>Nghĩa:</strong> Cơ sở hạ tầng, hệ thống cơ sở vật chất cần thiết để xử lý rác thải hiệu quả như đường sá, nhà máy, điểm thu gom</p><p><strong>Phát âm:</strong> /ˈɪnfrəstrʌktʃə/</p><p><strong>Ví dụ:</strong> <em>Countries with inadequate waste management infrastructure lack the means to prevent plastic from entering rivers and oceans.</em></p><p><strong>Từ đồng nghĩa:</strong> system, facilities, framework, network, physical base</p>",
      reviewCount: 3,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fs4._id,
      frontContent: "crude oil",
      backContent: "<p><strong>Nghĩa:</strong> Dầu thô, dầu mỏ thô được khai thác từ lòng đất, là nguyên liệu chính để sản xuất nhựa thông thường</p><p><strong>Phát âm:</strong> /kruːd ɔɪl/</p><p><strong>Ví dụ:</strong> <em>By breaking down crude oil and rearranging its components, chemists can form new synthetic polymers with extraordinary properties.</em></p><p><strong>Từ đồng nghĩa:</strong> petroleum, fossil oil, mineral oil, raw petrol</p>",
      reviewCount: 2,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fs4._id,
      frontContent: "synthetic",
      backContent: "<p><strong>Nghĩa:</strong> Tổng hợp, nhân tạo, được tạo ra bằng quá trình hóa học thay vì xảy ra tự nhiên, mô tả các polyme nhân tạo kháng phân hủy</p><p><strong>Phát âm:</strong> /sɪnˈθetɪk/</p><p><strong>Ví dụ:</strong> <em>Synthetic polymers have extraordinary traits: they are lightweight, durable, and can be moulded into almost any shape.</em></p><p><strong>Từ đồng nghĩa:</strong> artificial, man-made, manufactured, non-natural, engineered</p>",
      reviewCount: 2,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fs4._id,
      frontContent: "mass-produced",
      backContent: "<p><strong>Nghĩa:</strong> Sản xuất hàng loạt, chế tạo với số lượng rất lớn bằng quy trình tự động làm cho sản phẩm rẻ nhưng tạo ra lượng rác thải khổng lồ</p><p><strong>Phát âm:</strong> /ˌmæs prəˈdjuːst/</p><p><strong>Ví dụ:</strong> <em>Plastic can be mass-produced quickly and cheaply, which is why it displaced natural materials across virtually every industry.</em></p><p><strong>Từ đồng nghĩa:</strong> factory-made, industrially manufactured, bulk-produced, large-scale produced</p>",
      reviewCount: 2,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fs4._id,
      frontContent: "packaging",
      backContent: "<p><strong>Nghĩa:</strong> Bao bì, vật liệu dùng để bọc, chứa hoặc bảo vệ sản phẩm, chiếm phần lớn nhất trong rác thải nhựa dùng một lần</p><p><strong>Phát âm:</strong> /ˈpækɪdʒɪŋ/</p><p><strong>Ví dụ:</strong> <em>Forty percent of all plastics are used for packaging, most of which is discarded within minutes of purchase.</em></p><p><strong>Từ đồng nghĩa:</strong> wrapping, container, packing material, enclosure</p>",
      reviewCount: 1,
      nextReviewDate: daysAgo(1),
    },
    {
      setId: fs4._id,
      frontContent: "recycling",
      backContent: "<p><strong>Nghĩa:</strong> Tái chế, quá trình chuyển đổi vật liệu thải thành sản phẩm mới, hiện chỉ áp dụng được cho một phần nhỏ nhựa được sản xuất</p><p><strong>Phát âm:</strong> /ˌriːˈsaɪklɪŋ/</p><p><strong>Ví dụ:</strong> <em>Only 9% of all plastic ever produced has been recycled; the vast majority ends up in landfill or the environment.</em></p><p><strong>Từ đồng nghĩa:</strong> reprocessing, waste recovery, upcycling, reclamation</p>",
      reviewCount: 1,
      nextReviewDate: daysAgo(1),
    },
    {
      setId: fs4._id,
      frontContent: "food chain",
      backContent: "<p><strong>Nghĩa:</strong> Chuỗi thức ăn, chuỗi tuần tự các sinh vật mà mỗi loài bị sinh vật tiếp theo ăn, là con đường ô nhiễm lan từ sinh vật nhỏ đến lớn</p><p><strong>Phát âm:</strong> /fuːd tʃeɪn/</p><p><strong>Ví dụ:</strong> <em>Microplastics travel up the food chain from zooplankton to small fish to predatory fish and ultimately to humans.</em></p><p><strong>Từ đồng nghĩa:</strong> trophic chain, feeding chain, ecological chain</p>",
      reviewCount: 1,
      nextReviewDate: daysAgo(1),
    },
    {
      setId: fs4._id,
      frontContent: "indigestible",
      backContent: "<p><strong>Nghĩa:</strong> Không tiêu hóa được, không thể phân hủy và hấp thụ qua quá trình tiêu hóa, mô tả nhựa tích lũy trong dạ dày động vật</p><p><strong>Phát âm:</strong> /ˌɪndɪˈdʒestɪbl/</p><p><strong>Ví dụ:</strong> <em>Many seabirds and whales are found dead with stomachs full of indigestible plastic, starving despite appearing to have eaten.</em></p><p><strong>Từ đồng nghĩa:</strong> unprocessable, non-nutritive, non-absorbable, undigestible</p>",
      reviewCount: 0,
      nextReviewDate: daysAgo(2),
    },

    // ── FS5 — L5 "Is It Too Late?" (Kurzgesagt) — 12 thẻ ───────────────────
    {
      setId: fs5._id,
      frontContent: "greenhouse gases",
      backContent: "<p><strong>Nghĩa:</strong> Khí nhà kính, các khí như CO₂ và khí metan giữ nhiệt trong bầu khí quyển Trái Đất thúc đẩy nóng lên toàn cầu</p><p><strong>Phát âm:</strong> /ˈɡriːnhaʊs ɡæsɪz/</p><p><strong>Ví dụ:</strong> <em>Rapid climate change has been caused by the release of greenhouse gases, primarily CO₂ from burning fossil fuels.</em></p><p><strong>Từ đồng nghĩa:</strong> carbon emissions, warming gases, atmospheric gases, climate gases</p>",
      reviewCount: 4,
      nextReviewDate: daysAgo(-2),
    },
    {
      setId: fs5._id,
      frontContent: "emissions",
      backContent: "<p><strong>Nghĩa:</strong> Phát thải khí nhà kính, sự thải ra các khí đặc biệt là CO₂ vào khí quyển thông qua hoạt động của con người như đốt nhiên liệu hóa thạch</p><p><strong>Phát âm:</strong> /ɪˈmɪʃnz/</p><p><strong>Ví dụ:</strong> <em>In 2019, global CO₂ emissions were 50% higher than in the year 2000, despite decades of awareness of the climate crisis.</em></p><p><strong>Từ đồng nghĩa:</strong> discharge, release, output, pollution, carbon output</p>",
      reviewCount: 3,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fs5._id,
      frontContent: "energy intensity",
      backContent: "<p><strong>Nghĩa:</strong> Cường độ năng lượng, lượng năng lượng cần thiết để tạo ra một đơn vị sản lượng kinh tế, đo lường hiệu quả sử dụng năng lượng của nền kinh tế</p><p><strong>Phát âm:</strong> /ˈenədʒi ɪnˈtensɪti/</p><p><strong>Ví dụ:</strong> <em>Improving energy intensity, making economies more efficient, is one of the four main levers for reducing CO₂ emissions.</em></p><p><strong>Từ đồng nghĩa:</strong> energy efficiency metric, carbon per GDP, energy productivity</p>",
      reviewCount: 3,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fs5._id,
      frontContent: "electrification",
      backContent: "<p><strong>Nghĩa:</strong> Điện khí hóa, quá trình chuyển đổi các hệ thống hiện chạy bằng nhiên liệu hóa thạch sang chạy bằng điện thay thế</p><p><strong>Phát âm:</strong> /ɪˌlektrɪfɪˈkeɪʃn/</p><p><strong>Ví dụ:</strong> <em>The electrification of the transport sector, combined with a clean electricity grid, is one of the fastest ways to cut emissions.</em></p><p><strong>Từ đồng nghĩa:</strong> power conversion, electrical transition, green conversion</p>",
      reviewCount: 3,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fs5._id,
      frontContent: "decouple",
      backContent: "<p><strong>Nghĩa:</strong> Tách rời, tách tăng trưởng kinh tế khỏi phát thải CO₂ để đạt tăng trưởng mà không làm tăng lượng khí thải</p><p><strong>Phát âm:</strong> /diːˈkʌpl/</p><p><strong>Ví dụ:</strong> <em>There are signs that economic growth can be decoupled from CO₂ emissions, but we are not yet close to achieving this globally.</em></p><p><strong>Từ đồng nghĩa:</strong> separate, detach, disconnect, disengage, unbind</p>",
      reviewCount: 2,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fs5._id,
      frontContent: "rebound effect",
      backContent: "<p><strong>Nghĩa:</strong> Hiệu ứng bật lại, hiện tượng khi tăng hiệu quả dẫn đến tăng tiêu thụ bù trừ một phần hoặc toàn bộ lợi ích môi trường</p><p><strong>Phát âm:</strong> /rɪˈbaʊnd ɪˈfekt/</p><p><strong>Ví dụ:</strong> <em>The rebound effect means that making cars more fuel-efficient can actually increase total fuel consumption if it leads to more driving.</em></p><p><strong>Từ đồng nghĩa:</strong> backfire effect, paradox of efficiency, take-back effect, Jevons paradox</p>",
      reviewCount: 2,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fs5._id,
      frontContent: "carbon footprint",
      backContent: "<p><strong>Nghĩa:</strong> Dấu chân carbon, tổng lượng CO₂ và khí nhà kính tương đương được tạo ra bởi một người, tổ chức hoặc hoạt động</p><p><strong>Phát âm:</strong> /ˈkɑːbən ˈfʊtprɪnt/</p><p><strong>Ví dụ:</strong> <em>Humanity's global carbon footprint is the product of population size, economic activity, energy efficiency, and the carbon intensity of energy.</em></p><p><strong>Từ đồng nghĩa:</strong> environmental impact, CO₂ output, carbon output, climate impact</p>",
      reviewCount: 2,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fs5._id,
      frontContent: "fossil fuels",
      backContent: "<p><strong>Nghĩa:</strong> Nhiên liệu hóa thạch, nguồn năng lượng không tái tạo gồm than, dầu mỏ và khí tự nhiên là nguyên nhân chính gây phát thải CO₂</p><p><strong>Phát âm:</strong> /ˈfɒsl fjuːəlz/</p><p><strong>Ví dụ:</strong> <em>Fossil fuels are the single greatest lever for reducing emissions; cutting their use is both the most impactful and most politically difficult action.</em></p><p><strong>Từ đồng nghĩa:</strong> coal oil and gas, non-renewables, hydrocarbons, petrol resources</p>",
      reviewCount: 1,
      nextReviewDate: daysAgo(1),
    },
    {
      setId: fs5._id,
      frontContent: "subsidies",
      backContent: "<p><strong>Nghĩa:</strong> Trợ cấp nhà nước, hỗ trợ tài chính của chính phủ để giảm chi phí sản xuất hoặc tiêu thụ, trong ngữ cảnh này là hỗ trợ ngành nhiên liệu hóa thạch</p><p><strong>Phát âm:</strong> /ˈsʌbsɪdiz/</p><p><strong>Ví dụ:</strong> <em>Cutting subsidies to the fossil fuel industry and redirecting them to renewables is one of the highest-impact policy changes available.</em></p><p><strong>Từ đồng nghĩa:</strong> financial support, government grants, state aid, funding incentives</p>",
      reviewCount: 1,
      nextReviewDate: daysAgo(1),
    },
    {
      setId: fs5._id,
      frontContent: "incentive",
      backContent: "<p><strong>Nghĩa:</strong> Động lực, khuyến khích kinh tế hoặc quy định nhằm khuyến khích một hành vi hoặc lựa chọn đầu tư cụ thể</p><p><strong>Phát âm:</strong> /ɪnˈsentɪv/</p><p><strong>Ví dụ:</strong> <em>Pricing carbon emissions harshly creates a powerful incentive for industry to switch to lower-emission alternatives.</em></p><p><strong>Từ đồng nghĩa:</strong> motivation, reward, stimulus, encouragement, enticement</p>",
      reviewCount: 1,
      nextReviewDate: daysAgo(1),
    },
    {
      setId: fs5._id,
      frontContent: "carbon capture",
      backContent: "<p><strong>Nghĩa:</strong> Thu giữ carbon, công nghệ loại bỏ CO₂ khỏi khí quyển hoặc ngăn không cho phát thải vào, thường bằng quá trình hóa học hoặc lưu trữ tự nhiên</p><p><strong>Phát âm:</strong> /ˈkɑːbən ˈkæptʃə/</p><p><strong>Ví dụ:</strong> <em>Carbon capture is not a substitute for reducing emissions; it is a supplementary tool that may help close the gap between pledges and targets.</em></p><p><strong>Từ đồng nghĩa:</strong> CO₂ removal, carbon sequestration, carbon scrubbing, direct air capture</p>",
      reviewCount: 0,
      nextReviewDate: daysAgo(2),
    },
    {
      setId: fs5._id,
      frontContent: "net-zero",
      backContent: "<p><strong>Nghĩa:</strong> Phát thải ròng bằng 0, trạng thái khí nhà kính thêm vào khí quyển được cân bằng hoàn toàn bởi lượng được loại bỏ</p><p><strong>Phát âm:</strong> /net ˈzɪərəʊ/</p><p><strong>Ví dụ:</strong> <em>Reaching net-zero requires not only eliminating emissions but also deploying carbon removal at a scale that has never been attempted.</em></p><p><strong>Từ đồng nghĩa:</strong> carbon neutral, zero emissions, climate neutral, carbon balance</p>",
      reviewCount: 0,
      nextReviewDate: daysAgo(2),
    },

    // ── FS6 — L6 "Paris Agreement" (Christiana Figueres) — 12 thẻ ────────────
    {
      setId: fs6._id,
      frontContent: "unanimously",
      backContent: "<p><strong>Nghĩa:</strong> Nhất trí, với sự đồng thuận hoàn toàn từ tất cả mọi người liên quan, không có phiếu phản đối</p><p><strong>Phát âm:</strong> /juːˈnænɪməsli/</p><p><strong>Ví dụ:</strong> <em>The Paris Agreement was unanimously adopted by 195 governments in December 2015.</em></p><p><strong>Từ đồng nghĩa:</strong> by consensus, by agreement, without dissent, with one voice</p>",
      reviewCount: 4,
      nextReviewDate: daysAgo(-2),
    },
    {
      setId: fs6._id,
      frontContent: "entrenched",
      backContent: "<p><strong>Nghĩa:</strong> Ăn sâu, cố hữu, được thiết lập vững chắc và rất khó thay đổi, dùng để mô tả thái độ, chia rẽ hoặc vấn đề hệ thống</p><p><strong>Phát âm:</strong> /ɪnˈtrentʃt/</p><p><strong>Ví dụ:</strong> <em>Copenhagen failed primarily because of a deeply entrenched divide between developed and developing nations.</em></p><p><strong>Từ đồng nghĩa:</strong> deeply rooted, ingrained, fixed, embedded, established</p>",
      reviewCount: 4,
      nextReviewDate: daysAgo(-2),
    },
    {
      setId: fs6._id,
      frontContent: "optimism",
      backContent: "<p><strong>Nghĩa:</strong> Tinh thần lạc quan, trong cách hiểu của Figueres không phải sự tích cực ngây thơ mà là lòng dũng cảm, niềm hy vọng, sự tin tưởng và đoàn kết chủ động</p><p><strong>Phát âm:</strong> /ˈɒptɪmɪzəm/</p><p><strong>Ví dụ:</strong> <em>Figueres argues that optimism, understood as courage, hope, trust, and solidarity, was the decisive diplomatic tool that unlocked the Paris Agreement.</em></p><p><strong>Từ đồng nghĩa:</strong> positive outlook, hope, confidence, determination, constructive belief</p>",
      reviewCount: 3,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fs6._id,
      frontContent: "sovereign",
      backContent: "<p><strong>Nghĩa:</strong> Có chủ quyền, tự chủ, có quyền lực tối cao và độc lập, đặc biệt là quyền của chính phủ tự đưa ra quyết định mà không bị ép buộc từ bên ngoài</p><p><strong>Phát âm:</strong> /ˈsɒvrɪn/</p><p><strong>Ví dụ:</strong> <em>Figueres had full responsibility to deliver a climate agreement, yet no authority, because governments are sovereign in every decision they take.</em></p><p><strong>Từ đồng nghĩa:</strong> autonomous, independent, self-governing, supreme</p>",
      reviewCount: 3,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fs6._id,
      frontContent: "solidarity",
      backContent: "<p><strong>Nghĩa:</strong> Tinh thần đoàn kết, sự thống nhất và hỗ trợ lẫn nhau giữa những người đối mặt với thách thức chung, đặc biệt qua các rào cản quốc gia hoặc chính trị</p><p><strong>Phát âm:</strong> /ˌsɒlɪˈdærɪti/</p><p><strong>Ví dụ:</strong> <em>Climate action requires solidarity between rich and poor nations: those who caused the problem must support those most vulnerable.</em></p><p><strong>Từ đồng nghĩa:</strong> unity, togetherness, cooperation, mutual support, cohesion</p>",
      reviewCount: 2,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fs6._id,
      frontContent: "paralysis",
      backContent: "<p><strong>Nghĩa:</strong> Tình trạng bế tắc, tê liệt, không thể hành động trong bối cảnh chính trị là tình trạng bế tắc hoàn toàn không có tiến triển</p><p><strong>Phát âm:</strong> /pəˈræləsɪs/</p><p><strong>Ví dụ:</strong> <em>After Copenhagen, there was no way to escape the paralysis of international climate negotiations without fundamentally changing the tone.</em></p><p><strong>Từ đồng nghĩa:</strong> deadlock, gridlock, stalemate, inaction, impasse</p>",
      reviewCount: 2,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fs6._id,
      frontContent: "precipitate",
      backContent: "<p><strong>Nghĩa:</strong> Khởi phát, thúc đẩy điều gì đó xảy ra đột ngột hoặc sớm hơn dự kiến, đặc biệt là một sự thay đổi quan trọng</p><p><strong>Phát âm:</strong> /prɪˈsɪpɪteɪt/</p><p><strong>Ví dụ:</strong> <em>Changes in the global economy were precipitated by thousands of people, including entrepreneurs, investors, and city leaders, who saw the economic case for clean energy.</em></p><p><strong>Từ đồng nghĩa:</strong> trigger, spark, catalyze, cause, prompt, accelerate</p>",
      reviewCount: 2,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fs6._id,
      frontContent: "intrinsic",
      backContent: "<p><strong>Nghĩa:</strong> Vốn có, nội tại, thuộc về bản chất cơ bản của sự vật, giá trị tồn tại độc lập với các yếu tố bên ngoài</p><p><strong>Phát âm:</strong> /ɪnˈtrɪnsɪk/</p><p><strong>Ví dụ:</strong> <em>There are not only economic advantages to the energy transition but also intrinsic benefits: cleaner air, better health, and more liveable cities.</em></p><p><strong>Từ đồng nghĩa:</strong> inherent, innate, fundamental, built-in, essential</p>",
      reviewCount: 1,
      nextReviewDate: daysAgo(1),
    },
    {
      setId: fs6._id,
      frontContent: "dissemination",
      backContent: "<p><strong>Nghĩa:</strong> Sự phổ biến rộng rãi, phân phối thông tin, công nghệ hoặc thực hành đến số lượng lớn người hoặc nhiều nơi</p><p><strong>Phát âm:</strong> /dɪˌsemɪˈneɪʃn/</p><p><strong>Ví dụ:</strong> <em>The dissemination of clean technologies worldwide will deliver cleaner air, better health, and improved energy access to the developing world.</em></p><p><strong>Từ đồng nghĩa:</strong> distribution, spread, propagation, sharing, diffusion</p>",
      reviewCount: 1,
      nextReviewDate: daysAgo(1),
    },
    {
      setId: fs6._id,
      frontContent: "decarbonized",
      backContent: "<p><strong>Nghĩa:</strong> Đã phi carbon hóa, mô tả nền kinh tế hoặc hệ thống đã loại bỏ hoặc giảm mạnh lượng phát thải CO₂</p><p><strong>Phát âm:</strong> /diːˈkɑːbənaɪzd/</p><p><strong>Ví dụ:</strong> <em>A fully decarbonized economy is achievable within decades if current technological and investment trends continue.</em></p><p><strong>Từ đồng nghĩa:</strong> carbon-free, low-carbon, net-zero, emissions-neutral</p>",
      reviewCount: 1,
      nextReviewDate: daysAgo(1),
    },
    {
      setId: fs6._id,
      frontContent: "legally binding",
      backContent: "<p><strong>Nghĩa:</strong> Có tính ràng buộc pháp lý, có thể thi hành theo luật, tạo ra nghĩa vụ với hậu quả pháp lý nếu không tuân thủ</p><p><strong>Phát âm:</strong> /ˈliːɡəli ˈbaɪndɪŋ/</p><p><strong>Ví dụ:</strong> <em>Under the Paris Agreement, the measurement, reporting and verification of climate efforts are legally binding.</em></p><p><strong>Từ đồng nghĩa:</strong> enforceable, obligatory, compulsory, binding, mandatory</p>",
      reviewCount: 0,
      nextReviewDate: daysAgo(2),
    },
    {
      setId: fs6._id,
      frontContent: "zero-sum",
      backContent: "<p><strong>Nghĩa:</strong> Tư duy được mất, mô tả tình huống mà lợi ích của một bên bằng đúng tổn thất của bên kia, trái ngược với khuôn khổ cùng thắng</p><p><strong>Phát âm:</strong> /ˈzɪərəʊ sʌm/</p><p><strong>Ví dụ:</strong> <em>Figueres argues that humanity must reinterpret the zero-sum mentality: in a climate crisis, we are either all losers or all winners.</em></p><p><strong>Từ đồng nghĩa:</strong> win-lose thinking, competitive mindset, non-cooperative, adversarial</p>",
      reviewCount: 0,
      nextReviewDate: daysAgo(2),
    },
  ]);
  console.log("🃏 Flashcard Sets + Cards created:", fs1._id, fs3._id, fs4._id, fs5._id, fs6._id);

  // ── 8b. PERSONAL FLASHCARD SET (u2) — AI Vocabulary ──────────────────────────
  const [fsPersonalAI] = await FlashcardSetModel.insertMany([
    {
      userId: u2._id,
      type: FlashcardSetType.PERSONAL,
      title: "Từ vựng AI cho IELTS Writing",
      description: "4 thuật ngữ AI phổ biến trong bài IELTS Writing Task 2: artificial intelligence, algorithm, automation, neural network.",
    },
  ]);

  await FlashcardModel.insertMany([
    {
      setId: fsPersonalAI._id,
      frontContent: "artificial intelligence",
      backContent: "<p><strong>Nghĩa:</strong> Trí tuệ nhân tạo, khả năng của máy tính thực hiện các tác vụ thường đòi hỏi trí tuệ con người như học hỏi, suy luận và giải quyết vấn đề</p><p><strong>Phát âm:</strong> /ˌɑːtɪˈfɪʃəl ɪnˈtelɪdʒəns/ (viết tắt: AI)</p><p><strong>Ví dụ:</strong> <em>Artificial intelligence is increasingly being used in healthcare to diagnose diseases with greater speed and accuracy than human doctors.</em></p><p><strong>Từ đồng nghĩa:</strong> machine intelligence, AI, machine learning (hẹp hơn), cognitive computing</p>",
      reviewCount: 2,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fsPersonalAI._id,
      frontContent: "algorithm",
      backContent: "<p><strong>Nghĩa:</strong> Thuật toán, tập hợp các quy tắc hoặc hướng dẫn có thứ tự mà máy tính tuân theo để giải quyết một bài toán hoặc đưa ra quyết định</p><p><strong>Phát âm:</strong> /ˈælɡərɪðəm/</p><p><strong>Ví dụ:</strong> <em>Social media platforms rely on recommendation algorithms that determine which content users see, raising concerns about bias and misinformation.</em></p><p><strong>Từ đồng nghĩa:</strong> procedure, formula, computational method, protocol, decision rule</p>",
      reviewCount: 1,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fsPersonalAI._id,
      frontContent: "automation",
      backContent: "<p><strong>Nghĩa:</strong> Tự động hóa, quá trình sử dụng công nghệ để thực hiện các tác vụ lặp đi lặp lại mà không cần sự can thiệp của con người, thường dẫn đến thay thế lao động</p><p><strong>Phát âm:</strong> /ˌɔːtəˈmeɪʃən/</p><p><strong>Ví dụ:</strong> <em>The widespread automation of manufacturing jobs has displaced millions of workers, intensifying debates about universal basic income.</em></p><p><strong>Từ đồng nghĩa:</strong> mechanisation, robotisation, technological displacement, computerisation</p>",
      reviewCount: 3,
      nextReviewDate: daysAgo(-2),
    },
    {
      setId: fsPersonalAI._id,
      frontContent: "neural network",
      backContent: "<p><strong>Nghĩa:</strong> Mạng thần kinh nhân tạo, hệ thống máy tính được thiết kế mô phỏng cách não người xử lý thông tin, gồm các lớp nút kết nối học từ dữ liệu</p><p><strong>Phát âm:</strong> /ˈnjʊərəl ˈnetwɜːk/</p><p><strong>Ví dụ:</strong> <em>Deep neural networks have enabled breakthroughs in image recognition, language translation, and autonomous vehicle navigation.</em></p><p><strong>Từ đồng nghĩa:</strong> deep learning model, artificial neural network, deep network, connectionist model</p>",
      reviewCount: 0,
      nextReviewDate: daysAgo(1),
    },
  ]);
  console.log("🤖 Personal AI Flashcard Set created:", fsPersonalAI._id);

  // ── 9. NOTE COLLECTION + NOTES ───────────────────────────────────────────────

  const [nc1, nc2] = await NoteCollectionModel.insertMany([
    {
      userId: u2._id,
      name: "Học từ bài học",
      color: "#6366f1",
    },
    {
      userId: u2._id,
      name: "Phân tích bài mẫu",
      color: "#10b981",
    },
  ]);

  await NotebookNoteModel.insertMany([
    // ── NC1 — "Học từ bài học" ──────────────────────────────────────────────
    {
      userId: u2._id,
      collectionId: nc1._id,
      title: "Từ vựng Band 6 từ video nhựa",
      userDraftNote: "<p><strong>Từ vựng chủ đề Plastic Pollution: L4</strong></p>\n<p>Những từ quan trọng nhất cần dùng trong bài Problem-Solution:</p>\n<ul>\n<li><p><strong>trade-off</strong>: sự đánh đổi, lợi ích A đổi bằng thiệt hại B: <em>a damaging trade-off between corporate profit and public cost</em></p></li>\n<li><p><strong>infrastructure</strong>: cơ sở hạ tầng, hệ thống cơ sở vật chất xã hội: <em>invest in waste management infrastructure in developing nations</em></p></li>\n<li><p><strong>single-use</strong>: dùng một lần rồi bỏ: <em>ban single-use plastic packaging at the source</em></p></li>\n<li><p><strong>microplastics</strong>: vi nhựa, hạt nhựa nhỏ hơn 5mm: <em>microplastics have been detected in human blood and drinking water</em></p></li>\n<li><p><strong>degrade</strong>: phân hủy, vỡ thành các mảnh nhỏ hơn: <em>conventional plastic does not fully degrade; it merely fragments</em></p></li>\n<li><p><strong>debris</strong>: mảnh vỡ, rác thải trôi nổi trong tự nhiên: <em>plastic debris accumulates in ocean gyres due to circular currents</em></p></li>\n</ul>\n<p><strong>Lưu ý:</strong> Bài mẫu E2 dùng <em>trade-off</em>, <em>infrastructure</em> và <em>single-use</em> trong cùng một đoạn Body 2; xem cách chúng được kết nối bằng relative clause để học cách dùng tự nhiên.</p>",
    },
    {
      userId: u2._id,
      collectionId: nc1._id,
      title: "Danh từ hóa",
      userDraftNote: "<p><strong>Nominalization: Kỹ thuật Band 7+ (L5)</strong></p>\n<p>Chuyển động từ / tính từ thành danh từ để câu văn học thuật hơn, súc tích hơn và tránh lặp cấu trúc chủ-vị đơn điệu.</p>\n<p><strong>So sánh trực tiếp:</strong></p>\n<ul>\n<li><p> <em>We failed to implement the policy</em> →  <em>The failure to implement the policy...</em></p></li>\n<li><p> <em>Countries reduce emissions slowly</em> →  <em>The slow reduction of emissions by countries...</em></p></li>\n<li><p> <em>If we accelerate deforestation...</em> →  <em>The acceleration of deforestation...</em></p></li>\n<li><p> <em>We eliminated natural carbon sinks</em> →  <em>The elimination of natural carbon sinks...</em></p></li>\n</ul>\n<p><strong>Bảng chuyển đổi hay dùng:</strong></p>\n<ul>\n<li><p>implement → <strong>implementation</strong></p></li>\n<li><p>reduce → <strong>reduction</strong></p></li>\n<li><p>invest → <strong>investment</strong></p></li>\n<li><p>emit → <strong>emission</strong></p></li>\n<li><p>eliminate → <strong>elimination</strong></p></li>\n<li><p>accelerate → <strong>acceleration</strong></p></li>\n<li><p>destroy → <strong>destruction</strong></p></li>\n<li><p>deteriorate → <strong>deterioration</strong></p></li>\n</ul>\n<p><strong>Trong bài mẫu E1 (Band 7.0):</strong> <em>The acceleration of biodiversity loss and the elimination of natural carbon sinks are not separate crises.</em> Hai nominalization làm chủ ngữ compound, câu trở nên súc tích và học thuật ngay lập tức.</p>",
    },
    {
      userId: u2._id,
      collectionId: nc1._id,
      title: "Emphatic reversal: cấu trúc ấn tượng",
      userDraftNote: "<p><strong>Emphatic Concession Reversal: Kỹ thuật L6</strong></p>\n<p>Cấu trúc 'thừa nhận rồi nâng tầm', tạo hiệu ứng tương phản mạnh mẽ, đặc trưng của bài Band 7+ trong Discuss Both Views và Agree/Disagree.</p>\n<p><strong>Pattern cơ bản:</strong></p>\n<p><em>That is [nhận xét]. But it is even more [nhận xét mạnh hơn] when/if you consider [lý do nâng tầm].</em></p>\n<p><strong>Ví dụ gốc từ video L6:</strong></p>\n<p><em>Now, that is a remarkable achievement. But it is even more remarkable if you consider where we had been just a few years ago.</em> (Christiana Figueres TED)</p>\n<p><strong>Ứng dụng vào chủ đề môi trường:</strong></p>\n<ul>\n<li><p><em>Species loss is undeniably serious. But it is even more alarming when we consider that it is merely a symptom of deeper systemic failures.</em></p></li>\n<li><p><em>Banning plastic bags is a positive step. But it is even more meaningful when we consider that production-level regulation has never been attempted at scale.</em></p></li>\n</ul>\n<p><strong>Nên đặt cấu trúc này ở đâu:</strong></p>\n<ul>\n<li><p><strong>Đầu Body 2</strong>: để chuyển từ view 1 sang view 2 + own opinion một cách ấn tượng</p></li>\n<li><p><strong>Conclusion</strong>: để nâng broader implication lên một tầm mới trước câu kết</p></li>\n</ul>\n<p><strong>Lưu ý:</strong> Chỉ dùng tối đa 1 lần trong một bài; lạm dụng sẽ bị trừ điểm Coherence vì có vẻ giả tạo.</p>",
    },

    // ── NC2 — "Phân tích bài mẫu" ────────────────────────────────────────────
    {
      userId: u2._id,
      collectionId: nc2._id,
      title: "Phân tích bài mẫu E1",
      userDraftNote: "<p><strong>Bài mẫu E1: Band 7.0, Điểm hay cần học</strong></p>\n<p>Bài Discuss Both Views về mất loài vs. các vấn đề hệ thống. Đây là bài Band 7 điển hình: lập luận chặt, từ vựng đúng chỗ, grammar có variety.</p>\n<p><strong>Mở bài:</strong></p>\n<p>Không dùng clichés. Giới thiệu ngay hai quan điểm rồi chốt lập trường trong một câu: <em>I agree with the latter view and will analyse both views in the following essay.</em></p>\n<p><strong>Body 1: Trình bày view 1 công bằng:</strong></p>\n<ul>\n<li><p>Từ kỹ thuật đặt ngay câu đầu: <em>its impact on our planet's biodiversity</em></p></li>\n<li><p>Passive continuous nói về quá trình đang xảy ra: <em>trees are being cut down</em>, <em>animals are being poached</em></p></li>\n<li><p>Chuỗi nhân quả đầy đủ 4 bước: sharks killed → no predators → food chain disrupted → ecosystem unbalanced</p></li>\n</ul>\n<p><strong>Body 2: View 2 + Ý kiến cá nhân:</strong></p>\n<ul>\n<li><p>Nominalization làm chủ ngữ: <em>The disappearance of predators disrupts the natural food chain</em></p></li>\n<li><p>Non-defining relative clause bổ sung thông tin: <em>Those problems, which include pollution and climate change, are the main factors...</em></p></li>\n<li><p>Idiom học thuật: <em>on the brink of destruction</em>: mạnh hơn và trang trọng hơn 'about to be destroyed'</p></li>\n</ul>\n<p><strong>Từ vựng đáng ghi nhớ:</strong></p>\n<ul>\n<li><p><strong>biodiversity</strong>: đa dạng sinh học (dùng thay cho 'variety of species')</p></li>\n<li><p><strong>poached</strong>: bị săn trộm (chính xác hơn 'illegally killed/hunted')</p></li>\n<li><p><strong>on the brink of</strong>: đứng trước nguy cơ (mạnh hơn 'at risk of')</p></li>\n<li><p><strong>occurrences</strong>: dùng trong cụm: <em>more frequent occurrences of natural disasters</em></p></li>\n</ul>",
    },
    {
      userId: u2._id,
      collectionId: nc2._id,
      title: "Contrast connectors",
      userDraftNote: "<p><strong>Contrast Connectors: Phân cấp theo Band Score</strong></p>\n<p>Để đạt điểm Coherence &amp; Cohesion cao cần variety; không dùng mãi 'However'. Dưới đây là phân cấp từ nối tương phản từ thấp đến cao:</p>\n<p><strong>Band 5–6 (cơ bản):</strong></p>\n<ul>\n<li><p><strong>However, / Nevertheless,</strong>: đặt đầu câu, theo sau dấu phẩy</p></li>\n<li><p><strong>Despite + danh từ</strong>: <em>Despite the benefits, plastic remains a serious threat.</em></p></li>\n<li><p><strong>Although + mệnh đề</strong>: <em>Although laws are necessary, they are insufficient alone.</em></p></li>\n</ul>\n<p><strong>Band 6–7 (trung cấp):</strong></p>\n<ul>\n<li><p><strong>Whereas + mệnh đề, + mệnh đề</strong>: <em>Whereas legislation creates compliance, education creates genuine commitment.</em></p></li>\n<li><p><strong>In spite of the fact that + mệnh đề</strong>: trang trọng hơn 'although', thường đặt đầu câu</p></li>\n<li><p><strong>Notwithstanding + danh từ</strong>: <em>Notwithstanding these limitations, the policy marks a significant step forward.</em></p></li>\n</ul>\n<p><strong>Band 7+ (nâng cao):</strong></p>\n<ul>\n<li><p><strong>Admittedly,... However,...</strong>: nhượng bộ rồi phản bác; thấy trong bài mẫu E1 và E3</p></li>\n<li><p><strong>While it is true that..., this does not mean that...</strong>: concession-rebuttal hoàn chỉnh trong một câu</p></li>\n<li><p><strong>That said, / That notwithstanding,</strong>: chuyển ý ngắn gọn sau khi nhường một điểm</p></li>\n</ul>\n<p><strong>Trong bài mẫu E2 (Band 8.0):</strong> Bài kết hợp <em>Despite</em> ở Body 1 và <em>Whereas</em> ở Body 2 để tạo variety; đây là cách làm của Band 8. Tránh dùng cùng một từ nối hai lần trong một bài.</p>",
    },
  ]);
  console.log("📒 Note Collections + Notes created:", nc1._id, nc2._id);

  console.log("\n✨ Seed completed successfully!");
  console.log("─".repeat(50));
  console.log("👤 Users:");
  console.log("   admin@ielts.dev        / 123456  (ADMIN)");
  console.log("   minh@student.dev       / 123456 (STUDENT)");
  console.log("   lan@student.dev        / 123456 (STUDENT)");
  console.log("─".repeat(50));

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(" Seed failed:", err);
  process.exit(1);
});
