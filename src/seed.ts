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
const FavoriteEssayModel = mongoose.model("FavoriteEssay", new Schema({}, { strict: false, timestamps: true }));

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
  const models = [UserModel, TopicModel, CourseModel, LessonModel, ExamQuestionModel, SampleEssayModel, SubmissionModel, FlashcardSetModel, FlashcardModel, NoteCollectionModel, NotebookNoteModel, FavoriteEssayModel];
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
      title: "Environment & Sustainability — IELTS Writing Task 2",
      description: "Khóa học giúp bạn chinh phục nhóm chủ đề Môi trường trong IELTS Writing Task 2. Ba learning tracks thiết kế riêng cho Band 5.0, 6.0 và 7.0+, mỗi track gồm 2 bài học với từ vựng và ngữ pháp được rút trực tiếp từ các video học thuật chất lượng cao.",
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
      title: "Too Much Plastic — Is Recycling Enough?",
      courseId: c1._id,
      targetBand: TargetBand.BAND_5_0,
      description: "Nguồn gốc vi nhựa trong đại dương, hành trình nhựa từ bờ biển đến đáy biển sâu và lý do phần lớn rác thải biển 'biến mất'. Vox giải thích tại sao tái chế chưa đủ và cần thay đổi hệ thống. Phù hợp người học bắt đầu luyện viết Opinion Essay về môi trường.",
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
        { word: "debris", pronunciation: "/ˈdebriː/", definition: "Scattered waste material left in the environment, especially in oceans", translation: "rác thải / mảnh vỡ", examples: ["Plastic debris accumulates in ocean gyres due to swirling currents, forming the Great Pacific Garbage Patch.", "Reducing debris at source — before it enters waterways — is far more effective than ocean clean-up."], timestamp: 1, contextSentence: "tons of our plastic debris has accumulated there because of swirling ocean currents." },
        { word: "accumulate", pronunciation: "/əˈkjuːmjəleɪt/", definition: "To gradually collect or build up over time in harmful quantities", translation: "tích tụ", examples: ["Plastic has accumulated in ocean gyres for decades because currents trap floating debris.", "Toxins accumulate in the bodies of marine animals that ingest microplastic particles."], timestamp: 1, contextSentence: "tons of our plastic debris has accumulated there because of swirling ocean currents." },
        { word: "microscopic", pronunciation: "/ˌmaɪkrəˈskɒpɪk/", definition: "Too small to be seen with the naked eye; visible only under a microscope", translation: "cực nhỏ, vi mô", examples: ["Plastic objects range in size from large debris to microscopic fragments invisible to the naked eye.", "Microscopic plastic particles have been found in the tissue of fish sold in supermarkets worldwide."], timestamp: 13, contextSentence: "they range in size from large debris to microscopic." },
        { word: "garbage patch", pronunciation: "/ˈɡɑːbɪdʒ pætʃ/", definition: "A large area of ocean where plastic waste concentrates due to circular ocean currents", translation: "vùng rác thải đại dương", examples: ["The Great Pacific Garbage Patch covers an area roughly twice the size of Texas.", "Cleaning up a single garbage patch would cost billions and fail to address the source of the problem."], timestamp: 25, contextSentence: "There are at least 4 other garbage patches like this in the world." },
        { word: "sediment", pronunciation: "/ˈsedɪmənt/", definition: "Material that settles at the bottom of a body of water; layers that record environmental history", translation: "trầm tích (đáy biển)", examples: ["Sea floor sediment cores show that microplastic levels have doubled every 15 years since the 1950s.", "Plastic buried in ocean sediment is largely invisible and extremely difficult to remove."], timestamp: 94, contextSentence: "This is clue number 1 in the case of the missing plastic: a sea floor sediment sample." },
        { word: "fragment", pronunciation: "/ˈfræɡmənt/", definition: "A small broken piece of a larger object; in plastic context, a piece produced by physical breakdown", translation: "mảnh vỡ nhỏ", examples: ["Plastic fragments smaller than 5 mm have been found in the digestive tracts of deep-sea creatures.", "Sunlight and wave action cause plastic objects to fragment into smaller and smaller pieces over time."], timestamp: 115, contextSentence: "the study authors found plastic fibers and fragments that were 1 millimeter or smaller in size." },
        { word: "microplastics", pronunciation: "/ˌmaɪkrəʊˈplæstɪks/", definition: "Plastic particles smaller than 5 millimetres, formed when larger plastics break down in the environment", translation: "vi nhựa", examples: ["Microplastics have been detected in human blood, sea salt, and the deepest ocean trenches.", "Washing a single synthetic garment can release hundreds of thousands of microplastic fibres into waterways."], timestamp: 147, contextSentence: "The sea sediment study looked at microplastics—particles smaller than 5 millimeters." },
        { word: "degrade", pronunciation: "/dɪˈɡreɪd/", definition: "To break down into smaller pieces or simpler compounds through physical or chemical processes", translation: "phân hủy", examples: ["Conventional plastic does not fully degrade — it merely fragments into smaller and smaller particles.", "Whether plastic degrades into harmless compounds or persists as microplastics depends on its chemical composition."], timestamp: 227, contextSentence: "large plastic objects don't just float on the surface or degrade into microplastic — some of them sink without breaking down." },
        { word: "dense", pronunciation: "/dens/", definition: "Having high mass relative to volume; in context, heavier than seawater and therefore capable of sinking", translation: "có tỷ trọng cao / nặng hơn nước", examples: ["About half of all plastic waste is more dense than seawater, allowing it to sink to the ocean floor.", "Dense plastic objects that reach the sea floor are largely beyond the reach of any existing clean-up technology."], timestamp: 227, contextSentence: "about 50% of plastic in landfills is more dense than seawater." },
        { word: "persistent", pronunciation: "/pəˈsɪstənt/", definition: "Remaining present and unchanged in the environment for a long time; resistant to natural breakdown", translation: "bền vững / khó phân hủy", examples: ["Plastic found floating in ocean gyres is surprisingly persistent, with some objects dating back to the 1970s.", "The persistent nature of synthetic polymers means that virtually every piece of plastic ever produced still exists in some form."], timestamp: 314, contextSentence: "the plastic that is accumulated at the surface of the ocean is actually very persistent." },
        { word: "shoreline", pronunciation: "/ˈʃɔːlaɪn/", definition: "The line where a body of water meets the land; the coastal zone where most plastic first enters the ocean", translation: "bờ biển / vùng ven biển", examples: ["Research suggests that most ocean plastic remains near shorelines rather than drifting to the open sea.", "Regular clean-up events along shorelines are one of the most cost-effective tools for preventing plastic from reaching deeper waters."], timestamp: 347, contextSentence: "a lot of debris actually stays close to shorelines around the world—hidden in plain sight." },
        { word: "food web", pronunciation: "/fuːd web/", definition: "A complex network of feeding relationships among organisms in an ecosystem; the pathway by which pollutants spread", translation: "mạng lưới thức ăn", examples: ["Once microplastics enter the food web via plankton, they travel up through fish, seabirds, and ultimately to humans.", "The contamination of the food web with microplastics raises serious questions about long-term human health risks."], timestamp: 445, contextSentence: "The microplastics becoming part of our food web and geologic record." },
      ],
      grammars: [
        {
          title: "Present Perfect for scientific discoveries and ongoing problems",
          explanation: "Video dùng present perfect để mô tả những phát hiện khoa học còn đang diễn ra và tích lũy theo thời gian — cấu trúc quan trọng trong Introduction khi trình bày quy mô vấn đề.",
          structure: "Subject + have/has + past participle (+ since / for / over the past...)",
          examples: [
            "Scientists have found microplastics in environments as remote as the Arctic and as deep as the Mariana Trench.",
            "Plastic debris has accumulated in ocean gyres for decades, forming the world's largest artificial ecosystems.",
            "Researchers have documented a doubling of microplastic levels in sea floor sediment roughly every 15 years since the 1950s.",
          ],
          timestamp: 159,
          contextSentence: "We've found these tiny particles floating throughout the ocean, And even in the guts of the ocean's tiniest creatures, like plankton.",
        },
        {
          title: "Modal verbs of possibility: might / could / may",
          explanation: "Video dùng modal verbs khi diễn đạt điều chưa chắc chắn về số phận của nhựa trong đại dương — cần thiết khi viết về hậu quả môi trường còn chưa được chứng minh hoàn toàn.",
          structure: "Subject + might/could/may + base verb | Subject + might/could + have + past participle",
          examples: [
            "Dense plastic objects that sink to the sea floor might remain intact for centuries without detection.",
            "Microplastics embedded in ocean sediment could be entering the food chain through bottom-feeding organisms.",
            "Van Sebille's model suggests that much of our plastic pollution may never reach the open ocean at all.",
          ],
          timestamp: 239,
          contextSentence: "even those other 50 percent may actually travel to the sea floor with time, because",
        },
        {
          title: "Cause-and-effect connectors: because / so / as a result",
          explanation: "Video liên tục giải thích tại sao nhựa đi đâu sau khi vào đại dương — cause-effect connectors là nền tảng của bài viết Band 5 về vấn đề môi trường.",
          structure: "Clause, because + reason | Cause, so + effect | Cause. As a result, + effect.",
          examples: [
            "Plastic accumulates in ocean gyres because circular currents trap floating debris in one location.",
            "Much of our plastic is denser than seawater, so it sinks rather than floating on the surface.",
            "Barnacles and other organisms colonise floating plastic, making it heavier — as a result, it eventually sinks.",
          ],
          timestamp: 249,
          contextSentence: "what we see is that the debris which is floating on the ocean surface becomes colonized with biota over time… barnacles, mussels, all sorts of different organisms… then it becomes heavier and heavier and then starts to sink.",
        },
        {
          title: "Passive voice for scientific observation and measurement",
          explanation: "Video mô tả các thí nghiệm và khảo sát khoa học bằng thể bị động — văn phong học thuật đặc trưng khi trình bày nghiên cứu, nhấn mạnh kết quả thay vì người làm.",
          structure: "Object + was/were/has been + past participle (+ by agent)",
          examples: [
            "A sediment core was taken from the Santa Barbara Basin to measure the historical accumulation of microplastics.",
            "Over 2,100 photographs were taken with a deep-sea camera, revealing plastic debris 2,500 metres below the Arctic surface.",
            "The production dates of debris in the Great Pacific Garbage Patch were analysed to determine how long plastic persists at sea.",
          ],
          timestamp: 94,
          contextSentence: "It was taken from the bottom of the Santa Barbara Basin, off the coast of California.",
        },
      ],
      notesContent: `## Cấu trúc Opinion Essay — Band 5.0

**Introduction**
- Paraphrase lại đề bài (đổi từ, không copy nguyên)
- Nêu rõ quan điểm của bạn: *"In my opinion, ..."* hoặc *"I strongly believe that ..."*

**Body 1 — Lý do / Luận điểm thứ nhất**
- Topic sentence: nêu luận điểm
- Supporting sentence: giải thích ngắn gọn
- Example: ví dụ từ cuộc sống thực hoặc số liệu đơn giản

**Body 2 — Lý do / Luận điểm thứ hai**
- Cấu trúc tương tự Body 1
- Dùng modal verbs để đưa ra đề xuất (should / must)

**Conclusion**
- Nhắc lại quan điểm bằng ngôn ngữ khác
- Khuyến nghị đơn giản, ngắn gọn

> **Mẹo Band 5:** Ưu tiên SỰ RÕ RÀNG hơn sự phức tạp. Một câu đơn giản nhưng đúng ngữ pháp tốt hơn một câu phức tạp nhưng sai.`,
    },

    // ── L2 — Band 5.0 — Deforestation / National Geographic ─────────────────
    {
      title: "Forests Are Disappearing — What Can We Do?",
      courseId: c1._id,
      targetBand: TargetBand.BAND_5_0,
      description: "TED-Ed phân tích liệu rừng Amazon có thể biến mất hoàn toàn không — nguyên nhân mất rừng, vai trò bể hấp thụ carbon và điểm tới hạn (tipping point) khi rừng chuyển thành savanna. Tập trung vào cách diễn đạt xu hướng đang diễn ra và quan hệ nhân quả đơn giản.",
      isPublished: true,
      videos: [
        {
          title: "Is the Amazon Rainforest Disappearing? | TED-Ed",
          videoUrl: "https://www.youtube.com/watch?v=Qxby1J5bnPQ",
          duration: 420,
          thumbnailUrl: "https://img.youtube.com/vi/Qxby1J5bnPQ/hqdefault.jpg",
        },
      ],
      vocabularies: [
        { word: "deforestation", pronunciation: "/diːˌfɒrɪˈsteɪʃn/", definition: "The large-scale clearing or removal of forested land, typically for agriculture or development", translation: "nạn phá rừng", examples: ["As of 2022, humans have deforested 17% of the Amazon — and scientists warn that a tipping point may be near.", "Deforestation releases centuries of stored carbon into the atmosphere in a matter of hours when trees are burned."], timestamp: 26, contextSentence: "humans have deforested 17% of the Amazon." },
        { word: "tipping point", pronunciation: "/ˈtɪpɪŋ pɔɪnt/", definition: "A critical threshold beyond which a system undergoes rapid, self-reinforcing, and potentially irreversible change", translation: "điểm tới hạn (ngưỡng không thể đảo ngược)", examples: ["Scientists warn that losing 25–40% of the Amazon could trigger a tipping point, transforming the forest into savanna permanently.", "The concept of a tipping point is central to climate risk assessment — once crossed, the damage cannot be undone."], timestamp: 26, contextSentence: "scientists warn that we may be approaching a tipping point." },
        { word: "transpiration", pronunciation: "/ˌtrænsˌpɪˈreɪʃn/", definition: "The process by which plants release water vapour through their leaves, contributing to rainfall and local cooling", translation: "sự thoát hơi nước của thực vật", examples: ["Through transpiration, the Amazon cycles approximately 20 trillion litres of water daily, generating the rainfall that sustains it.", "When trees are removed, transpiration stops — and without it, the local climate becomes hotter and drier."], timestamp: 71, contextSentence: "This process, known as transpiration, cools both the plant and the surrounding air." },
        { word: "evaporation", pronunciation: "/ɪˌvæpəˈreɪʃn/", definition: "The conversion of liquid water into vapour through heat energy, a key step in the water cycle", translation: "sự bốc hơi nước", examples: ["Leaves lose water through evaporation, cooling both the plant and the surrounding air in a process called transpiration.", "Reduced evaporation from deforested land disrupts rainfall patterns hundreds of kilometres away from the cleared area."], timestamp: 71, contextSentence: "The plants photosynthesize, opening their pores, and losing water to evaporation." },
        { word: "carbon sink", pronunciation: "/ˈkɑːbən sɪŋk/", definition: "A natural system — such as a forest or ocean — that absorbs more carbon dioxide from the atmosphere than it releases", translation: "bể hấp thụ carbon", examples: ["The Amazon is one of the world's largest natural carbon sinks, absorbing billions of tonnes of CO₂ annually.", "When the Amazon is burned or cleared, it shifts from a carbon sink to a carbon source, accelerating global warming."], timestamp: 161, contextSentence: "We'd lose one of the world's largest natural carbon sinks." },
        { word: "habitat loss", pronunciation: "/ˈhæbɪtæt lɒs/", definition: "The destruction or degradation of natural environments that species depend on for survival", translation: "mất môi trường sống", examples: ["Habitat loss caused by Amazon deforestation threatens 10% of all known species on Earth.", "Scientists regard habitat loss as the single greatest driver of species extinction globally."], timestamp: 179, contextSentence: "even a slight rise in global temperature can increase severe weather events and habitat loss." },
        { word: "rainfall", pronunciation: "/ˈreɪnfɔːl/", definition: "The total amount of rain that falls in an area over a given period; a key indicator of ecosystem health", translation: "lượng mưa", examples: ["Models predict that losing 40% of the Amazon would reduce rainfall in Argentina's agricultural heartland by 25%.", "Without the trees that drive the water cycle, rainfall in deforested regions drops dramatically within years."], timestamp: 99, contextSentence: "The local temperature would increase by several degrees and rainfall in the region would drop." },
        { word: "drought", pronunciation: "/draʊt/", definition: "A prolonged period of abnormally low rainfall, leading to water shortages and ecosystem stress", translation: "hạn hán", examples: ["Recent droughts in the Amazon have already triggered widespread fires and tree die-offs, foreshadowing future tipping points.", "A permanent reduction in rainfall due to deforestation would condemn the Amazon to recurrent devastating droughts."], timestamp: 223, contextSentence: "more vulnerable to drought and wildfires." },
        { word: "resilient", pronunciation: "/rɪˈzɪliənt/", definition: "Able to recover from disturbance and maintain normal function; resistant to collapse", translation: "có khả năng phục hồi", examples: ["So far the Amazon has remained resilient, but scientists warn this capacity has limits.", "Diverse ecosystems tend to be more resilient than monocultures, as biodiversity provides a buffer against shocks."], timestamp: 211, contextSentence: "the Amazon has remained resilient." },
        { word: "sustainable", pronunciation: "/səˈsteɪnəbl/", definition: "Meeting present needs without compromising the ability of future generations to meet theirs", translation: "bền vững", examples: ["Practising sustainable agriculture and fire management could allow the Amazon to generate more economic value, not less.", "A shift to sustainable land use requires both government regulation and consumer choices that reward responsible producers."], timestamp: 200, contextSentence: "by stopping deforestation and practicing fire management and sustainable agriculture." },
        { word: "stewardship", pronunciation: "/ˈstjuːədʃɪp/", definition: "The responsible management and protection of natural resources, especially by those who live in or depend on them", translation: "quản lý / bảo vệ có trách nhiệm", examples: ["Indigenous stewardship of Amazon land resulted in over 300 million metric tonnes of carbon being removed from the atmosphere.", "Effective environmental stewardship requires giving local and Indigenous communities legal ownership of the land they protect."], timestamp: 246, contextSentence: "native stewardship can have a huge impact." },
        { word: "ecosystem", pronunciation: "/ˈiːkəʊˌsɪstəm/", definition: "A complex community of living organisms interacting with each other and their physical environment as a unified system", translation: "hệ sinh thái", examples: ["When enough of the Amazon is cleared, large swaths of the ecosystem can die, triggering a chain reaction across the entire biome.", "Ecosystems provide services — clean water, stable rainfall, carbon storage — whose value to human societies far exceeds the revenue from exploiting them."], timestamp: 39, contextSentence: "when enough of the forest is lost that large swaths of the ecosystem die." },
      ],
      grammars: [
        {
          title: "Type 2 Conditional (If + past simple, + would) for hypothetical consequences",
          explanation: "Video mô tả điều sẽ xảy ra nếu Amazon biến mất — Type 2 Conditional là cấu trúc cốt lõi khi viết về hậu quả của suy thoái môi trường.",
          structure: "If + past simple, + would/could/might + base verb",
          examples: [
            "If the Amazon disappeared, there would be little transpiration to maintain the water cycle.",
            "If deforestation continued at the current rate, rainfall in Argentina's farming region could fall by 25%.",
            "If Indigenous communities lost legal protection of their land, carbon emissions from deforestation would rise significantly.",
          ],
          timestamp: 81,
          contextSentence: "If the rainforest disappeared, there would be little transpiration to feed the rain clouds.",
        },
        {
          title: "Present Perfect for current environmental state",
          explanation: "Video dùng present perfect để nhấn mạnh tác động hiện tại đang diễn ra — quan trọng trong phần Introduction khi trình bày quy mô vấn đề.",
          structure: "Subject + have/has + past participle (+ already / so far)",
          examples: [
            "Humans have already deforested 17% of the Amazon as of 2022, and the rate is accelerating.",
            "Scientists have identified a tipping point beyond which the forest cannot recover.",
            "During recent droughts, the Amazon has already started to show signs of the collapse scientists feared.",
          ],
          timestamp: 26,
          contextSentence: "humans have deforested 17% of the Amazon.",
        },
        {
          title: "Would + verb for hypothetical future consequences",
          explanation: "Cấu trúc này mô tả chuỗi hậu quả liên tiếp — rất hiệu quả khi viết về tác động dây chuyền của mất rừng trong bài Cause-Effect essay.",
          structure: "Subject + would + base verb | Subject + would + result in + noun",
          examples: [
            "Without transpiration from the trees, the local temperature would increase by several degrees.",
            "The complete disappearance of the Amazon would trigger a 20% reduction in rainfall across parts of the United States.",
            "The loss of the Amazon as a carbon sink would add an estimated 0.25°C to global warming targets.",
          ],
          timestamp: 99,
          contextSentence: "The local temperature would increase by several degrees and rainfall in the region would drop.",
        },
        {
          title: "Yet / Despite / While — concession and contrast",
          explanation: "Video thừa nhận giá trị kinh tế của phá rừng trước khi đưa ra phản bác — cấu trúc nhượng bộ-phản bác quan trọng cho bài Discuss Both Views.",
          structure: "Yet + main clause | Despite + noun/gerund, + clause | While + concession clause, + main clause",
          examples: [
            "Yet by stopping deforestation, researchers predict the Amazon could generate even more economic value than it currently does.",
            "Despite the short-term economic gains from clearing land, the long-term cost to global agriculture and climate stability is far greater.",
            "While exploiting the Amazon generates up to 98 billion USD annually, the hidden costs in climate disruption and biodiversity loss are incalculable.",
          ],
          timestamp: 200,
          contextSentence: "Yet by stopping deforestation and practicing fire management and sustainable agriculture, some researchers predict the region could generate even more wealth than it currently does.",
        },
      ],
      notesContent: `## 3 Cách Paraphrase Đề Bài — Band 5.0

Paraphrase là bước đầu tiên và quan trọng nhất trong phần Introduction. Tuyệt đối không copy nguyên câu từ đề bài.

**Cách 1 — Dùng từ đồng nghĩa**
- *cutting down trees* → *logging / deforestation*
- *harm the environment* → *damage the ecosystem / pose a threat to nature*
- *government should* → *authorities must / policymakers ought to*

**Cách 2 — Đổi dạng từ (Nominalization)**
- *destroy* (v) → *destruction* (n): *"The destruction of forests..."*
- *pollute* (v) → *pollution* (n): *"Air pollution is..."*
- *conserve* (v) → *conservation* (n): *"Conservation efforts..."*

**Cách 3 — Đổi cấu trúc câu (Active ↔ Passive)**
- Active: *"Humans are destroying the rainforest."*
- Passive: *"The rainforest is being destroyed by human activity."*

> **Bài tập:** Viết lại câu đề bài sau theo 3 cách trên:
> *"Some people believe that the government should ban deforestation completely."*`,
    },

    // ── L3 — Band 6.0 — Fossils 101 / National Geographic ───────────────────
    {
      title: "Fossils 101: How Life Becomes Stone",
      courseId: c1._id,
      targetBand: TargetBand.BAND_6_0,
      description: "National Geographic trình bày quá trình hóa thạch từ amber, than đá đến permineralization — cách thiên nhiên bảo tồn sự sống trong đá hàng triệu năm. Tập trung vào passive voice, định nghĩa khoa học và cấu trúc nhân quả phù hợp Band 6.0.",
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
        { word: "fossil", pronunciation: "/ˈfɒsl/", definition: "The preserved remains or impression of an ancient organism embedded in rock", translation: "hóa thạch", examples: ["Fossils are the primary evidence scientists use to reconstruct the history of life on Earth.", "Without the fossil record, our understanding of evolution and mass extinction events would be almost entirely theoretical."], timestamp: 19, contextSentence: "Fossils are remnants or impressions of ancient organisms that are naturally preserved in stone." },
        { word: "fossil record", pronunciation: "/ˈfɒsl ˈrekəd/", definition: "The collective body of all known fossils, which documents the history of life on Earth through geological time", translation: "hồ sơ hóa thạch / hồ sơ địa chất", examples: ["The fossil record provides a primary account of how life has changed over billions of years.", "Gaps in the fossil record make it difficult to trace the evolution of soft-bodied organisms that rarely fossilize."], timestamp: 31, contextSentence: "Together, they form the fossil record, a primary account that tells the story of life on Earth through stone." },
        { word: "fossilization", pronunciation: "/ˌfɒsəlaɪˈzeɪʃn/", definition: "The natural process by which organisms are preserved in stone or other materials after death", translation: "quá trình hóa thạch hóa", examples: ["Fossilization requires specific conditions — rapid burial, low oxygen, and the presence of mineralizing groundwater.", "Only a tiny fraction of organisms undergo fossilization; most decompose without leaving any trace."], timestamp: 44, contextSentence: "Fossilization or the process of preserving organisms in stone, can occur in countless ways." },
        { word: "body fossil", pronunciation: "/ˈbɒdi ˈfɒsl/", definition: "A fossil consisting of the actual physical remains of an organism, such as bones, shells, or teeth", translation: "hóa thạch thân (phần vật chất của sinh vật)", examples: ["Body fossils such as dinosaur bones allow palaeontologists to reconstruct the size, diet, and movement of ancient species.", "The discovery of exceptionally preserved body fossils in amber has provided detailed information about prehistoric insects."], timestamp: 31, contextSentence: "body fossils, which are the preserved remains of plants and animals." },
        { word: "trace fossil", pronunciation: "/treɪs ˈfɒsl/", definition: "A fossil that records an organism's behaviour — such as footprints, burrows, or feeding marks — rather than its physical remains", translation: "hóa thạch dấu vết (dấu chân, hang hốc)", examples: ["Trace fossils such as dinosaur footprints reveal information about how ancient animals moved and interacted.", "The presence of ancient burrowing trace fossils indicates that complex animal behaviour existed long before the first body fossils appeared."], timestamp: 31, contextSentence: "trace fossils, which are records of an animal's behavior, such as footprints." },
        { word: "amber", pronunciation: "/ˈæmbə/", definition: "Fossilized tree resin that can preserve organisms — especially insects — in extraordinary detail over millions of years", translation: "hổ phách (nhựa cây hóa thạch)", examples: ["Insects preserved in amber retain soft tissue structures that have long since decomposed in other fossil types.", "The recovery of DNA from organisms trapped in amber remains a subject of scientific debate and popular fascination."], timestamp: 73, contextSentence: "One special case involves trapping organisms, oftentimes insects, in amber." },
        { word: "resin", pronunciation: "/ˈrezɪn/", definition: "A sticky substance secreted by trees that can entrap organisms and eventually harden into amber", translation: "nhựa cây", examples: ["When an insect lands on tree resin, it can become permanently entrapped as the resin hardens around it.", "The chemical properties of tree resin create an oxygen-free environment that prevents the decay of entrapped organisms."], timestamp: 90, contextSentence: "The sap or resin forms a protective seal around the entrapped organism." },
        { word: "specimen", pronunciation: "/ˈspesɪmən/", definition: "An individual example of an organism or rock collected for scientific study or display", translation: "mẫu vật (khoa học)", examples: ["An exceptionally preserved fossil specimen can reveal anatomical details not visible in fragmented remains.", "Museum collections of fossil specimens allow researchers worldwide to study ancient organisms without conducting fieldwork."], timestamp: 61, contextSentence: "Fossilization that does not alter a specimen can help to preserve its original form and texture." },
        { word: "carbonization", pronunciation: "/ˌkɑːbənaɪˈzeɪʃn/", definition: "A fossilization process in which organic material is compressed until only a thin film of carbon remains", translation: "quá trình carbon hóa (than hóa)", examples: ["Carbonization is the process by which compressed plant material formed the coal deposits that now fuel the world's power stations.", "Fern fossils preserved by carbonization often retain such detail that individual cell walls remain visible under a microscope."], timestamp: 119, contextSentence: "carbonization transforms soft tissues into thin black films of carbon." },
        { word: "permineralization", pronunciation: "/ˌpɜːmɪnərəlaɪˈzeɪʃn/", definition: "The most common fossilization process, in which minerals fill the spaces within bone or wood, turning organic tissue to stone", translation: "quá trình khoáng hóa (hóa đá)", examples: ["Permineralization preserved the dinosaur bones on display in natural history museums worldwide.", "Through permineralization, a tree trunk can be transformed into solid stone while retaining its original cellular structure."], timestamp: 131, contextSentence: "one of the most common types of fossilization that changes a specimen is called permineralization." },
        { word: "crystalline", pronunciation: "/ˈkrɪstəlaɪn/", definition: "Having a regular, repeating molecular structure characteristic of minerals; describing the network of minerals that replace organic tissue in permineralization", translation: "có cấu trúc tinh thể", examples: ["Minerals build a crystalline network inside fossilized bone, preserving its shape while replacing organic material.", "The crystalline structure of quartz makes it one of the most stable and common minerals found in permineralized fossils."], timestamp: 162, contextSentence: "building a crystalline network in the empty cavities." },
        { word: "genetic material", pronunciation: "/dʒəˈnetɪk məˈtɪəriəl/", definition: "DNA or RNA — the molecular information that encodes the characteristics of an organism and can sometimes be recovered from exceptionally preserved fossils", translation: "vật liệu di truyền (DNA)", examples: ["Insects in amber have been so well preserved that their genetic material was partially extracted and sequenced.", "The extraction of genetic material from ancient specimens opens new possibilities for understanding evolutionary relationships."], timestamp: 194, contextSentence: "their genetic material was extracted and partially sequenced." },
      ],
      grammars: [
        {
          title: "Passive voice for scientific processes (no human agent needed)",
          explanation: "Video dùng bị động liên tục khi mô tả quá trình thiên nhiên — đặc trưng văn phong khoa học học thuật, nhấn mạnh quá trình thay vì ai thực hiện.",
          structure: "Subject + is/are/was/were + past participle | Subject + has/have been + past participle",
          examples: [
            "Fossils are naturally preserved in stone through geological processes spanning millions of years.",
            "The genetic material of insects preserved in amber has been extracted and partially sequenced by researchers.",
            "During permineralization, the pores of dead plant or animal material are filled by minerals carried in groundwater.",
          ],
          timestamp: 131,
          contextSentence: "one of the most common types of fossilization that changes a specimen is called permineralization.",
        },
        {
          title: "Definition sentences with relative clauses (X is/are + noun + that/which...)",
          explanation: "Video định nghĩa từng loại hóa thạch và quá trình hóa thạch hóa bằng câu định nghĩa với relative clause — cấu trúc cốt lõi trong bài viết học thuật khi giới thiệu thuật ngữ khoa học.",
          structure: "X is/are a/an + [category noun] + that/which + [defining clause]",
          examples: [
            "Fossils are the preserved remains of ancient organisms that provide scientists with evidence of past life on Earth.",
            "Permineralization is a geological process in which minerals gradually replace organic tissue, turning bone into stone.",
            "A trace fossil is a record of an organism's behaviour — such as a footprint or burrow — rather than its physical remains.",
          ],
          timestamp: 19,
          contextSentence: "Fossils are remnants or impressions of ancient organisms that are naturally preserved in stone.",
        },
        {
          title: "When + process clause — describing steps in a sequence",
          explanation: "Video dùng 'when' để nối từng bước trong quá trình hóa thạch — cấu trúc quan trọng khi viết description of a process trong Task 1 và Task 2 về chuỗi nhân quả.",
          structure: "When + subject + verb, + result clause | This process begins when + clause",
          examples: [
            "When an organism is covered in tree resin, it becomes entrapped as the resin forms a protective seal around it.",
            "When plant material is compressed under intense geological pressure, carbonization transforms it into a thin film of carbon.",
            "When minerals enter the pores of buried bone, they gradually build a crystalline network that preserves the original structure.",
          ],
          timestamp: 90,
          contextSentence: "This process begins when an organism is covered in tree sap.",
        },
        {
          title: "Over time + result — gradual change and transformation",
          explanation: "Video mô tả các quá trình diễn ra qua hàng triệu năm — cấu trúc 'over time' + kết quả rất phổ biến khi viết về thay đổi môi trường hoặc quá trình tự nhiên.",
          structure: "Over time, + subject + verb | Over millions of years, + clause",
          examples: [
            "Over time, the soft tree resin hardens and turns into amber, with the organism suspended within.",
            "Over millions of years, carbonized plant material accumulated in thick layers, eventually forming the coal deposits we mine today.",
            "Over geological timescales, the minerals deposited during permineralization turn soft organic tissue into durable stone.",
          ],
          timestamp: 90,
          contextSentence: "Over time, the soft resin hardens and turns into amber with the organism suspended within.",
        },
        {
          title: "Can + verb for scientific potential and capability",
          explanation: "Video dùng 'can' để nói về tiềm năng thông tin của hóa thạch — cấu trúc quan trọng khi viết về khả năng giải quyết vấn đề trong body paragraphs.",
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
      notesContent: `## Describing a Process — Band 6.0

Bài học này tập trung vào kỹ năng **mô tả quy trình** (process description) — một dạng bài quan trọng trong IELTS Task 1 và thường xuất hiện trong Task 2 khi giải thích cơ chế.

---

**Công thức mô tả quy trình (theo thứ tự):**

**① First / Initially / To begin with** — Bước đầu tiên
> *"Initially, when an organism dies and is rapidly buried, it is cut off from oxygen and the bacteria that cause decay."*

**② Subsequently / As a result / Over time** — Các bước tiếp theo
> *"Subsequently, mineral-rich groundwater seeps into the pores of the organism's skeleton. Over time, these minerals build a crystalline network, gradually replacing organic tissue."*

**③ Eventually / Finally / Ultimately** — Kết quả cuối cùng
> *"Eventually, the entire bone is replaced by stone, preserving its original structure in fossilized form — sometimes for hundreds of millions of years."*

---

**Passive Voice Cheat Sheet (cho Process description):**

| Active | Passive |
|--------|---------|
| Minerals fill the pores | The pores are filled by minerals |
| Pressure transforms the tissue | The tissue is transformed by pressure |
| Scientists extract the DNA | The DNA is extracted |
| Resin traps the insect | The insect is trapped in resin |

---

**Từ nối quan trọng cho Process essays:**
- Sequence: *first, then, next, subsequently, finally, ultimately*
- Result: *as a result, consequently, this leads to, this transforms into*
- Time: *over time, over millions of years, gradually, eventually*

> **Lưu ý Band 6+:** Tránh bắt đầu mỗi câu bằng "Then". Thay bằng: *"Following this stage..."* hoặc *"As a consequence..."*`,
    },

    // ── L4 — Band 6.0 — Ocean Plastic / Kurzgesagt ──────────────────────────
    {
      title: "The Plastic Crisis in Our Oceans",
      courseId: c1._id,
      targetBand: TargetBand.BAND_6_0,
      description: "Hành trình nhựa từ bờ biển vào chuỗi thức ăn, tác hại tích lũy đến hệ sinh thái biển và sức khỏe con người. Tập trung vào ngôn ngữ tương phản và cụm danh từ phức tạp.",
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
        { word: "polymer", pronunciation: "/ˈpɒlɪmə/", definition: "A large molecule made of long repeating chains of smaller units — the chemical structure that makes plastic durable and resistant to decay", translation: "polyme (chuỗi phân tử dài)", examples: ["Plastic is made from polymers — long repeating chains of molecule groups that resist biological breakdown.", "The polymer structure of plastic is what makes it so useful as a material, and so persistent as a pollutant."], timestamp: 72, contextSentence: "Plastic is made from polymers - long repeating chains of molecule groups." },
        { word: "crude oil", pronunciation: "/kruːd ɔɪl/", definition: "Raw petroleum extracted from underground, used as the primary raw material in conventional plastic production", translation: "dầu thô (nguyên liệu sản xuất nhựa)", examples: ["By breaking down crude oil and rearranging its components, chemists can form new synthetic polymers with extraordinary properties.", "As long as crude oil remains cheap, the financial incentive to manufacture virgin plastic rather than recycle will persist."], timestamp: 95, contextSentence: "By breaking down crude oil into its components and Rearranging them, we can form new synthetic polymers." },
        { word: "synthetic", pronunciation: "/sɪnˈθetɪk/", definition: "Made by chemical processes rather than occurring naturally; in context, describing man-made polymers that resist natural decomposition", translation: "tổng hợp / nhân tạo", examples: ["Synthetic polymers have extraordinary traits — they are lightweight, durable, and can be moulded into almost any shape.", "Unlike natural materials such as wood or cotton, synthetic plastics cannot be broken down by naturally occurring bacteria."], timestamp: 95, contextSentence: "Synthetic polymers have extraordinary traits." },
        { word: "mass-produced", pronunciation: "/ˌmæs prəˈdjuːst/", definition: "Manufactured in very large quantities using automated processes, making products cheap but generating enormous quantities of waste", translation: "sản xuất hàng loạt", examples: ["Plastic can be mass-produced quickly and cheaply, which is why it displaced natural materials across virtually every industry.", "The very qualities that make plastic suitable for mass production — durability and low cost — are what make it an environmental disaster."], timestamp: 105, contextSentence: "plastic can be easily mass-produced." },
        { word: "packaging", pronunciation: "/ˈpækɪdʒɪŋ/", definition: "Materials used to wrap, contain, or protect products, accounting for the largest share of single-use plastic waste", translation: "bao bì (đóng gói)", examples: ["Forty percent of all plastics are used for packaging, most of which is discarded within minutes of purchase.", "Redesigning packaging to minimise plastic content is one of the most impactful steps manufacturers can take."], timestamp: 170, contextSentence: "40% of plastics are used for packaging." },
        { word: "recycling", pronunciation: "/ˌriːˈsaɪklɪŋ/", definition: "The process of converting waste materials into new products; currently applied to only a small fraction of plastic produced", translation: "tái chế", examples: ["Only 9% of all plastic ever produced has been recycled — the vast majority ends up in landfill, incinerated, or discarded in the environment.", "Effective recycling requires not just consumer willingness but also investment in sorting, collection, and processing infrastructure."], timestamp: 210, contextSentence: "9% was recycled, 12% burnt." },
        { word: "microplastics", pronunciation: "/ˌmaɪkrəʊˈplæstɪks/", definition: "Plastic particles smaller than 5 millimetres, formed when larger plastics are broken down by sunlight, wave action, or physical wear", translation: "vi nhựa", examples: ["51 trillion microplastic particles are estimated to float in the world's oceans, where they are ingested by marine life at every level.", "Microplastics have been found in honey, beer, sea salt, tap water, and the human bloodstream."], timestamp: 267, contextSentence: "Microplastics are pieces smaller than 5 millimeters." },
        { word: "food chain", pronunciation: "/fuːd tʃeɪn/", definition: "A linear sequence of organisms in which each is eaten by the next, forming a pathway by which pollutants travel from small organisms to large ones", translation: "chuỗi thức ăn", examples: ["Microplastics travel up the food chain from zooplankton to small fish to predatory fish and ultimately to humans.", "Chemical additives in plastic become more concentrated at each step of the food chain through a process called biomagnification."], timestamp: 309, contextSentence: "It would be pretty bad if micro plastics are toxic, because they travel up the food chain." },
        { word: "single-use", pronunciation: "/ˌsɪŋɡl juːz/", definition: "Designed to be used once and then discarded — the dominant model of plastic packaging that drives most ocean pollution", translation: "dùng một lần rồi bỏ", examples: ["Making a single-use plastic bag requires surprisingly little energy — but disposing of it sustainably takes thousands of years.", "A global shift away from single-use packaging is essential if ocean plastic pollution is to be reduced at scale."], timestamp: 385, contextSentence: "making a single-use plastic bag requires so little energy and produces far lower carbon dioxide emissions." },
        { word: "trade-off", pronunciation: "/ˈtreɪd ɒf/", definition: "A balance between two desirable but incompatible goals, where improving one comes at the expense of the other", translation: "sự đánh đổi", examples: ["The environmental debate around plastic involves difficult trade-offs: plastic packaging reduces food waste but creates ocean pollution.", "Policymakers face complex trade-offs when designing plastic bans — alternatives often have higher carbon footprints."], timestamp: 398, contextSentence: "We're left with a complex process of trade-offs." },
        { word: "infrastructure", pronunciation: "/ˈɪnfrəstrʌktʃə/", definition: "The physical systems and facilities — roads, factories, collection points — required to handle waste effectively", translation: "cơ sở hạ tầng (thu gom, tái chế)", examples: ["Countries with inadequate waste management infrastructure lack the means to prevent plastic from entering rivers and oceans.", "Investing in recycling infrastructure in rapidly industrialising nations is at least as important as awareness campaigns in wealthy countries."], timestamp: 461, contextSentence: "the garbage disposal infrastructure couldn't keep up with collecting and recycling all the new waste." },
        { word: "indigestible", pronunciation: "/ˌɪndɪˈdʒestɪbl/", definition: "Impossible to break down and absorb through digestion; in context, describing plastic that accumulates in animals' stomachs", translation: "không tiêu hóa được", examples: ["Many seabirds and whales are found dead with stomachs full of indigestible plastic, starving despite appearing to have eaten.", "Because plastic is indigestible, it accumulates in the gut rather than providing nutrition, eventually causing fatal blockages."], timestamp: 239, contextSentence: "Many animals starve with stomachs full of indigestible trash." },
      ],
      grammars: [
        {
          title: "Present Perfect + statistics for shocking scale statements",
          explanation: "Kurzgesagt mở bài và kết luận bằng số liệu quy mô lớn dùng present perfect — kỹ thuật hiệu quả trong Introduction và Topic Sentences của Band 6.",
          structure: "By [year], + subject + had/has + past participle | Since [year], + subject + has/have + past participle + [statistic]",
          examples: [
            "Since its invention roughly 100 years ago, plastic has transformed virtually every aspect of modern life.",
            "We have produced approximately 8.3 billion metric tonnes of plastic — and more than 6.3 billion tonnes have already become waste.",
            "By 2015, 90% of seabirds had already ingested plastic at some point in their lives.",
          ],
          timestamp: 181,
          contextSentence: "Since its invention, we have produced about 8.3 billion metric tons of plastic.",
        },
        {
          title: "Contrast connectors: compared to / whereas / while — for trade-off arguments",
          explanation: "Video so sánh nhựa với các vật liệu thay thế, thừa nhận sự phức tạp — kỹ năng Band 6+ khi viết về trade-offs và lập luận hai chiều.",
          structure: "Compared to + noun, + clause | Whereas + clause, + clause | While + concession, + main point",
          examples: [
            "Making a single-use plastic bag produces far lower CO₂ emissions compared to manufacturing a cotton shopping bag.",
            "Whereas plastic packaging extends food shelf life and reduces food waste, its persistence in the environment poses enormous long-term risks.",
            "While banning plastic outright seems appealing, it ignores the complex trade-offs with alternatives that have their own environmental costs.",
          ],
          timestamp: 385,
          contextSentence: "making a single-use plastic bag requires so little energy and produces far lower carbon dioxide emissions compared to a reusable cotton bag.",
        },
        {
          title: "Relative clauses (which / that / where / whose) for defining and adding information",
          explanation: "Kurzgesagt dùng relative clauses để định nghĩa thuật ngữ khoa học và bổ sung thông tin — làm câu văn liền mạch và học thuật hơn.",
          structure: "Noun + which/that + verb | Noun + where/in which + clause",
          examples: [
            "Plastic is made from polymers — long repeating chains of molecule groups that are virtually indestructible by natural processes.",
            "The Yangtze River, which flushes 1.5 million tonnes of plastic into the ocean annually, is the world's most plastic-polluted waterway.",
            "Microplastics have been found in honey, sea salt, and tap water — environments where few consumers expect to encounter plastic contamination.",
          ],
          timestamp: 416,
          contextSentence: "one-third of all food that's produced is never eaten and ends up rotting away on landfills where it produces methane.",
        },
        {
          title: "Future predictions: will + verb / by [year] + will",
          explanation: "Video dùng dự đoán tương lai để nhấn mạnh tính cấp bách — cấu trúc quan trọng trong Conclusion khi đưa ra cảnh báo về hậu quả nếu không hành động.",
          structure: "Subject + will + verb (+ by [year]) | By [year], + subject + will have + past participle",
          examples: [
            "If current trends continue, plastic in the ocean will outweigh all the fish by 2050.",
            "Unless production is curbed significantly, global plastic waste will triple by mid-century.",
            "By 2100, virtually every seabird species will have been affected by plastic ingestion, according to current projections.",
          ],
          timestamp: 227,
          contextSentence: "it will outweigh all the fish in the ocean by 2050.",
        },
        {
          title: "Hedging language for scientific uncertainty: there is little science / inconclusive / might",
          explanation: "Video thận trọng khi nói về tác hại của microplastics vì khoa học chưa chắc chắn — kỹ năng quan trọng Band 6+ để thể hiện tư duy phê phán.",
          structure: "There is little/limited evidence that + clause | It remains inconclusive whether + clause | Research suggests that + clause, but + qualification",
          examples: [
            "There is limited scientific consensus on whether microplastics in food and water pose a direct threat to human health.",
            "It remains inconclusive whether the concentration of microplastics in the human body is sufficient to cause measurable harm.",
            "Research suggests that plastic additives like BPA may interfere with hormonal systems, but the long-term effects in humans remain unclear.",
          ],
          timestamp: 346,
          contextSentence: "There is little science about this so far and right now it's inconclusive.",
        },
      ],
      notesContent: `## Problem-Solution Essay — Band 6.0

**Lỗi phổ biến nhất của Band 5:** Đề xuất giải pháp quá chung chung.

❌ **Yếu:** *"The government should do something about plastic pollution."*

 **Mạnh:** *"Governments should introduce extended producer responsibility (EPR) legislation, which requires manufacturers to fund the collection and recycling of packaging they produce. This approach has proven effective in Germany, where EPR policies have helped achieve a recycling rate of over 65%."*

---

**Công thức giải pháp Band 6:**

Mỗi giải pháp = **GIẢI PHÁP CỤ THỂ** + **CƠ CHẾ** (tại sao nó hoạt động) + **BẰNG CHỨNG/VÍ DỤ**

| Phần | Ví dụ |
|------|-------|
| Giải pháp | *"Ban single-use plastics"* |
| Cơ chế | *"...which removes the most common source of ocean pollution at the production stage"* |
| Bằng chứng | *"...as demonstrated by Kenya, which saw a 50% reduction in plastic litter after its 2017 ban"* |

---

**Linking words cho Problem-Solution essay:**
- Problem: *"One of the most pressing issues is..." / "A significant challenge is..."*
- Solution: *"To address this, ... / One effective measure would be to..."*
- Justification: *"This is because... / This would result in..."*`,
    },

    // ── L5 — Band 7.0+ — Carbon Tax / TED Talk ──────────────────────────────
    {
      title: "Is It Too Late To Stop Climate Change?",
      courseId: c1._id,
      targetBand: TargetBand.BAND_7_PLUS,
      description: "Kurzgesagt phân tích liệu còn thời gian để hành động hay không — carbon budget, tipping points, khoảng cách giữa cam kết và thực tế, và vai trò của thay đổi hệ thống. Tập trung vào đảo ngữ, nhượng bộ-phản bác và danh hóa động từ.",
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
        { word: "greenhouse gases", pronunciation: "/ˈɡriːnhaʊs ɡæsɪz/", definition: "Gases such as CO₂ and methane that trap heat in the Earth's atmosphere, driving global warming", translation: "khí nhà kính", examples: ["Rapid climate change has been caused by the release of greenhouse gases — primarily CO₂ from burning fossil fuels.", "Reducing greenhouse gas concentrations in the atmosphere requires both eliminating emissions and scaling up natural carbon sinks."], timestamp: 13, contextSentence: "rapid climate change has been caused by the release of greenhouse gases." },
        { word: "emissions", pronunciation: "/ɪˈmɪʃnz/", definition: "The release of gases — especially CO₂ — into the atmosphere through human activities such as burning fossil fuels", translation: "phát thải khí nhà kính", examples: ["In 2019, global CO₂ emissions were 50% higher than in the year 2000, despite decades of awareness of the climate crisis.", "Decoupling economic growth from emissions growth is the central challenge of the green energy transition."], timestamp: 25, contextSentence: "in 2019 the world was emitting 50% more CO₂ than in the year 2000." },
        { word: "energy intensity", pronunciation: "/ˈenədʒi ɪnˈtensɪti/", definition: "The amount of energy required to produce one unit of economic output; a measure of how efficiently an economy uses energy", translation: "cường độ năng lượng (hiệu quả sử dụng năng lượng)", examples: ["Improving energy intensity — making economies more efficient — is one of the four main levers for reducing CO₂ emissions.", "Technological advances in building insulation and industrial processes have reduced energy intensity significantly over the past 30 years."], timestamp: 220, contextSentence: "Energy intensity describes how efficiently we use energy." },
        { word: "electrification", pronunciation: "/ɪˌlektrɪfɪˈkeɪʃn/", definition: "The process of transitioning systems that currently run on fossil fuels — vehicles, heating, industry — to run on electricity instead", translation: "điện khí hóa (chuyển sang dùng điện)", examples: ["The electrification of the transport sector, combined with a clean electricity grid, is one of the fastest ways to cut emissions.", "Electrification of industrial processes such as steel and cement production remains technologically challenging but essential for net zero."], timestamp: 268, contextSentence: "the electrification of the transportation and industrial sectors." },
        { word: "decouple", pronunciation: "/diːˈkʌpl/", definition: "To separate two things that were previously linked; in context, to achieve economic growth without increasing CO₂ emissions", translation: "tách rời (tăng trưởng kinh tế khỏi phát thải)", examples: ["There are signs that economic growth can be decoupled from CO₂ emissions, but we are not yet close to achieving this globally.", "Decoupling prosperity from fossil fuel use requires massive investment in clean energy and a fundamental redesign of industrial systems."], timestamp: 198, contextSentence: "There are some signs that growth can be decoupled from CO₂ emissions." },
        { word: "rebound effect", pronunciation: "/rɪˈbaʊnd ɪˈfekt/", definition: "A phenomenon where efficiency gains lead to increased consumption, partially or fully offsetting the environmental benefit", translation: "hiệu ứng bật lại (tiết kiệm → dùng nhiều hơn)", examples: ["The rebound effect means that making cars more fuel-efficient can actually increase total fuel consumption if it leads to more driving.", "Direct rebound effects undermine the impact of energy efficiency improvements, making regulatory standards essential alongside market incentives."], timestamp: 292, contextSentence: "Direct Rebound Effects. This means that once something becomes more efficient, it's used more." },
        { word: "carbon footprint", pronunciation: "/ˈkɑːbən ˈfʊtprɪnt/", definition: "The total amount of CO₂ and equivalent greenhouse gases produced by a person, organisation, or activity", translation: "dấu chân carbon", examples: ["Humanity's global carbon footprint is the product of population size, economic activity, energy efficiency, and the carbon intensity of energy.", "A programmer in a wealthy nation typically has a carbon footprint 50 times larger than a subsistence farmer in a developing country."], timestamp: 386, contextSentence: "Humanity's global carbon footprint is the CO₂ released per energy unit generated." },
        { word: "fossil fuels", pronunciation: "/ˈfɒsl fjuːəlz/", definition: "Non-renewable energy sources — coal, oil, and natural gas — formed from ancient organic material and the primary driver of CO₂ emissions", translation: "nhiên liệu hóa thạch", examples: ["Fossil fuels are the single greatest lever for reducing emissions — cutting their use is both the most impactful and most politically difficult action.", "Without fossil fuels, the industrial revolution as we know it would not have been possible — but their continued use threatens the stability of the climate system."], timestamp: 411, contextSentence: "Fossil fuels are the greatest lever humanity has right now." },
        { word: "subsidies", pronunciation: "/ˈsʌbsɪdiz/", definition: "Financial support provided by governments to reduce the cost of producing or consuming a good, in this context propping up fossil fuel industries", translation: "trợ cấp (của nhà nước cho nhiên liệu hóa thạch)", examples: ["Cutting subsidies to the fossil fuel industry and redirecting them to renewables is one of the highest-impact policy changes available.", "Global fossil fuel subsidies dwarf investment in renewable energy, creating a structural barrier to the clean energy transition."], timestamp: 446, contextSentence: "We can cut subsidies to the fossil fuel industry, and funnel them into renewables." },
        { word: "incentive", pronunciation: "/ɪnˈsentɪv/", definition: "A financial or regulatory mechanism that encourages a particular behaviour or investment choice", translation: "động lực / khuyến khích kinh tế", examples: ["Pricing carbon emissions harshly creates a powerful incentive for industry to switch to lower-emission alternatives.", "Without financial incentives, the transition to renewable energy will be slower than the climate requires — because inertia and vested interests will resist it."], timestamp: 456, contextSentence: "create strong incentives for the world's industries to transition." },
        { word: "carbon capture", pronunciation: "/ˈkɑːbən ˈkæptʃə/", definition: "Technology that removes CO₂ from the atmosphere or prevents it from entering it, typically by chemical processes or natural storage", translation: "thu giữ carbon", examples: ["Technologies like carbon capture could allow continued industrial activity while removing emissions, but costs remain high and scale is unproven.", "Carbon capture is not a substitute for reducing emissions — it is a supplementary tool that may help close the gap between pledges and targets."], timestamp: 480, contextSentence: "technologies like carbon capture, or a new generation of nuclear power plants." },
        { word: "net-zero", pronunciation: "/net ˈzɪərəʊ/", definition: "A state in which the greenhouse gases added to the atmosphere are balanced by an equivalent amount removed, resulting in no net increase", translation: "phát thải ròng bằng 0", examples: ["Over 130 countries have pledged to achieve net-zero emissions by 2050, but critics argue that many national plans lack credibility or funding.", "Reaching net-zero requires not only eliminating emissions but also deploying carbon removal at a scale that has never been attempted."], timestamp: 580, contextSentence: "the innovations that will lead the world to net-zero carbon emissions." },
      ],
      grammars: [
        {
          title: "The more... the more — correlative comparison for policy trade-offs",
          explanation: "Kurzgesagt dùng cấu trúc này để diễn đạt quan hệ tỷ lệ thuận giữa hành động và kết quả — đặc trưng văn phong học thuật Band 7+, rất hiệu quả trong Conclusion.",
          structure: "The more + subject + verb, the more + subject + verb | The less... the more...",
          examples: [
            "The less fossil fuel we burn in the next decade, the more time we give innovation and renewable deployment to catch up.",
            "The more we invest in clean energy infrastructure today, the greater our capacity to compensate for population and economic growth.",
            "The more coal power plants currently under construction are cancelled, the lower the lock-in of emissions for the next 30 years.",
          ],
          timestamp: 503,
          contextSentence: "The less fossil fuel we burn over the next few years, the more time we give innovation to catch up.",
        },
        {
          title: "Concession + rebuttal: Although / While / Even though... + however / yet / but",
          explanation: "Video thừa nhận sự phức tạp của vấn đề (tăng trưởng kinh tế, nghèo đói) trước khi đưa ra phản bác — cấu trúc thể hiện tư duy phê phán Band 7+.",
          structure: "Although/While + concession clause, + main point | Concession. However, + rebuttal.",
          examples: [
            "Although economic growth has lifted billions out of poverty, its continued dependence on fossil fuels makes climate targets nearly impossible to meet.",
            "While developing nations have contributed little to historical emissions, they are among the most vulnerable to the consequences of climate change.",
            "Even though efficiency improvements have reduced the carbon intensity of many industries, rebound effects have often eroded the net benefit.",
          ],
          timestamp: 198,
          contextSentence: "There are some signs that growth can be decoupled from CO₂ emissions but we're not close to that yet.",
        },
        {
          title: "Nominalization — converting verbs and adjectives into abstract nouns",
          explanation: "Video diễn đạt ý phức tạp bằng cụm danh từ học thuật — chuyển động từ sang danh từ tương đương để tăng độ súc tích và trang trọng.",
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
          title: "Without + gerund phrase — negative conditional for urgent action",
          explanation: "Cấu trúc 'Without + noun/gerund' diễn đạt điều kiện phủ định ngắn gọn hơn 'If we do not...' — thể hiện văn phong học thuật chắc chắn, phù hợp Band 7+.",
          structure: "Without + noun/gerund phrase, + main clause | Without + noun, it will be impossible/unlikely to + verb",
          examples: [
            "Without new technologies and innovation, it will be impossible to achieve a zero-carbon economy, even with aggressive efficiency improvements.",
            "Without decisive policy action to price carbon and phase out fossil fuel subsidies, the clean energy transition will proceed far too slowly.",
            "Without massive investment in energy efficiency today, the carbon savings required by 2050 targets cannot be achieved by renewable energy alone.",
          ],
          timestamp: 466,
          contextSentence: "Without new technologies and innovation, it will be impossible to achieve a zero CO₂ emission world.",
        },
        {
          title: "Hedging with uncertainty markers: there are signs that / it is still possible / arguably",
          explanation: "Video tránh tuyệt đối hóa khi đề cập đến dự đoán tương lai — kỹ năng quan trọng Band 7+ thể hiện tư duy khoa học thận trọng.",
          structure: "There are signs that + clause | It is still possible/likely that + clause | Arguably, + clause",
          examples: [
            "There are some signs that economic growth can be decoupled from CO₂ emissions, but we are not yet close to achieving this at scale.",
            "It is still very much possible to limit warming to 1.5°C, but it requires a pace of change without historical precedent.",
            "Arguably, the greatest barrier to climate action is not technological or economic — it is the political will to confront vested interests in fossil fuels.",
          ],
          timestamp: 557,
          contextSentence: "And it is still very much possible.",
        },
      ],
      notesContent: `## Discursive Essay — Band 7.0+

Một bài viết Band 7+ không chỉ trình bày ý kiến — nó **thể hiện tư duy phê phán**.

---

**Cấu trúc 4 đoạn nâng cao:**

**① Introduction — Thesis + Scope**
- Paraphrase ngắn gọn, tránh clichés (*"In today's modern world..."*)
- Thesis rõ ràng, có quan điểm: *"While the window for averting the worst climate outcomes is narrowing, the combination of systemic policy change and technological deployment makes meaningful action still possible."*
- Scope: *"This essay will examine both the structural barriers to action and the solutions that remain within reach..."*

**② Body 1 — Luận điểm chính (dùng nominalization)**
- Trình bày lập luận mạnh nhất, dùng cụm danh từ học thuật
- *"The elimination of fossil fuel subsidies and the implementation of carbon pricing would simultaneously remove structural market distortions and create incentives for clean energy investment..."*

**③ Body 2 — Concession + Rebuttal**
- Thừa nhận phản biện trước: *"Admittedly, critics argue that..."*
- Lật ngược: *"However, this objection overlooks the fact that..."*
- Đây là đoạn **quan trọng nhất** để đạt Band 7+

**④ Conclusion — Broader implication + Forward-looking**
- KHÔNG chỉ tóm tắt — mở rộng ra tầm quan trọng lớn hơn
- *"The question facing governments today is not whether the technology for decarbonisation exists — it does — but whether the political will to deploy it at scale can be generated before the remaining carbon budget is exhausted."*
- Forward-looking: *"Unless systemic barriers are dismantled within this decade, tipping points will be crossed and the window for meaningful intervention will close permanently."*

> ⚠️ **Tránh:** Kết bài bằng câu hỏi tu từ (*"So what should we do?"*) — đây là dấu hiệu của Band 5-6.`,
    },

    // ── L6 — Band 7.0+ — Christiana Figueres TED — Paris Agreement ──────────
    {
      title: "The Paris Agreement: Inside the World's Most Important Climate Deal",
      courseId: c1._id,
      targetBand: TargetBand.BAND_7_PLUS,
      description: "TED talk của Christiana Figueres — trưởng đàm phán khí hậu LHQ — kể lại hành trình 6 năm từ Copenhagen thất bại đến Thỏa thuận Paris 2015. Bà giải thích ba làn sóng thay đổi: công nghệ → kinh tế → chính trị và vai trò của optimism như vũ khí ngoại giao. Tập trung vào cấu trúc đối lập, điều kiện giả định và ngôn ngữ chuyển hóa đặc trưng Band 7+.",
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
        { word: "unanimously", pronunciation: "/juːˈnænɪməsli/", definition: "With complete agreement from all people involved — no dissenting vote", translation: "nhất trí (100% đồng thuận)", examples: ["In 2015, 195 governments unanimously decided to change the course of the global economy to protect the most vulnerable.", "Achieving a unanimously adopted international agreement on climate was regarded as impossible before Paris — a fact that makes the outcome all the more remarkable."], timestamp: 31, contextSentence: "unanimously decided to intentionally change the course of the global economy in order to protect the most vulnerable." },
        { word: "entrenched", pronunciation: "/ɪnˈtrentʃt/", definition: "Firmly established and very difficult to change — used of attitudes, divisions, or systemic problems", translation: "ăn sâu / cố hữu (khó thay đổi)", examples: ["Copenhagen failed primarily because of a deeply entrenched divide between developed and developing nations over historical responsibility for emissions.", "Entrenched vested interests in the fossil fuel industry have consistently obstructed meaningful climate legislation at the national level."], timestamp: 76, contextSentence: "primarily because of the deeply entrenched divide between the global North and the global South." },
        { word: "sovereign", pronunciation: "/ˈsɒvrɪn/", definition: "Having supreme authority and independence, especially a government's right to make its own decisions without external control", translation: "có chủ quyền / tự chủ (không ai có quyền ép buộc)", examples: ["Figueres had full responsibility to deliver a climate agreement, yet no authority, because governments are sovereign in every decision they take.", "The voluntary nature of Paris targets reflects the political reality that sovereign nations cannot be compelled to adopt binding emissions cuts."], timestamp: 223, contextSentence: "you have absolutely no authority, because governments are sovereign in every decision that they take." },
        { word: "optimism", pronunciation: "/ˈɒptɪmɪzəm/", definition: "In Figueres' framing: not naive positivity, but active courage, hope, trust, and solidarity — the belief that collective human action can solve shared problems", translation: "tinh thần lạc quan / niềm tin tích cực", examples: ["Figueres argues that optimism, understood as courage, hope, trust, and solidarity, was the decisive diplomatic tool that unlocked the Paris Agreement.", "Optimism in international negotiations is not wishful thinking but a strategic choice — the refusal to accept paralysis as inevitable."], timestamp: 264, contextSentence: "let's understand it in its broader sense. Let's understand it as courage, hope, trust, solidarity." },
        { word: "solidarity", pronunciation: "/ˌsɒlɪˈdærɪti/", definition: "Unity and mutual support among a group of people facing a common challenge — especially across national or political divides", translation: "tinh thần đoàn kết", examples: ["Climate action requires solidarity between rich and poor nations: those who caused the problem must support those most vulnerable to its consequences.", "Solidarity — the willingness to act collectively even when individual short-term costs are high — is the foundation of any effective international agreement."], timestamp: 264, contextSentence: "courage, hope, trust, solidarity, the fundamental belief that we humans can come together and can help each other." },
        { word: "paralysis", pronunciation: "/pəˈræləsɪs/", definition: "A state of total inability to act — in political contexts, a deadlock so complete that no progress is possible", translation: "tình trạng bế tắc / tê liệt (không hành động được)", examples: ["After Copenhagen, there was no way to escape the paralysis of international climate negotiations without fundamentally changing the tone of the conversation.", "Political paralysis on climate policy — caused by short-term electoral pressures and fossil fuel lobbying — has cost humanity decades of crucial transition time."], timestamp: 294, contextSentence: "there was no way we were going to get out of the paralysis of Copenhagen." },
        { word: "precipitate", pronunciation: "/prɪˈsɪpɪteɪt/", definition: "To cause something to happen suddenly or sooner than expected, especially a significant change", translation: "khởi phát / thúc đẩy (điều gì đó xảy ra nhanh hơn)", examples: ["Changes in the global economy were precipitated by thousands of people — entrepreneurs, investors, city leaders — who saw the economic case for clean energy.", "The dramatic drop in renewable energy costs, precipitated by sustained public and private investment, transformed the political calculus of the Paris negotiations."], timestamp: 321, contextSentence: "we began to see changes happening in many areas, precipitated by thousands of people, including many of you here today." },
        { word: "intrinsic", pronunciation: "/ɪnˈtrɪnsɪk/", definition: "Belonging to the fundamental nature of something — inherent value that exists independently of external factors", translation: "vốn có / nội tại (giá trị trong bản thân sự vật)", examples: ["There are not only economic advantages to the energy transition but also intrinsic benefits: cleaner air, better health, and more liveable cities.", "The intrinsic benefits of a decarbonized economy — improved public health, energy security, reduced geopolitical instability — extend far beyond the climate itself."], timestamp: 396, contextSentence: "there also are economic advantages and intrinsic benefits, because the dissemination of the clean technologies is going to bring us cleaner air, better health." },
        { word: "dissemination", pronunciation: "/dɪˌsemɪˈneɪʃn/", definition: "The widespread distribution of something — information, technology, or practices — to a large number of people or places", translation: "sự phổ biến rộng rãi (công nghệ, thông tin)", examples: ["The dissemination of clean technologies worldwide will deliver cleaner air, better health, and improved energy access to the developing world.", "Accelerating the dissemination of proven low-carbon technologies to emerging economies is more effective than waiting for each country to independently develop its own solutions."], timestamp: 396, contextSentence: "the dissemination of the clean technologies is going to bring us cleaner air, better health, better transportation, more livable cities." },
        { word: "decarbonized", pronunciation: "/diːˈkɑːbənaɪzd/", definition: "Describing an economy or system that has eliminated or dramatically reduced its carbon dioxide emissions", translation: "đã phi carbon hóa / không còn phụ thuộc nhiên liệu hóa thạch", examples: ["The national contributions on the table are only the first step toward a decarbonized, highly resilient global economy.", "A fully decarbonized economy is achievable within decades if current technological and investment trends continue — but only if political will keeps pace."], timestamp: 561, contextSentence: "into a decarbonized, highly resilient economy." },
        { word: "legally binding", pronunciation: "/ˈliːɡəli ˈbaɪndɪŋ/", definition: "Enforceable under law — creating obligations with legal consequences for non-compliance", translation: "có tính ràng buộc pháp lý", examples: ["Under the Paris Agreement, the measurement, reporting and verification of climate efforts, and the five-year checkpoints, are legally binding.", "The legally binding nature of the review process — even without binding targets — was a key diplomatic innovation that made universal participation possible."], timestamp: 575, contextSentence: "the measurement, reporting and verification of all of those efforts is legally binding." },
        { word: "zero-sum", pronunciation: "/ˈzɪərəʊ sʌm/", definition: "Describing a situation where one party's gain is exactly equal to another's loss — the opposite of a cooperative win-win framework", translation: "tư duy được mất (một bên được thì bên kia mất)", examples: ["Figueres argues that humanity must reinterpret the zero-sum mentality: in a climate crisis, your loss is no longer my gain — we are either all losers or all winners.", "Traditional geopolitics operates on a zero-sum logic that is fundamentally incompatible with global challenges like climate change, which require every nation to win together."], timestamp: 825, contextSentence: "we have got to reinterpret the zero-sum mentality." },
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
          timestamp: 44,
          contextSentence: "Now, that is a remarkable achievement. But it is even more remarkable if you consider where we had been just a few years ago.",
        },
        {
          title: "Second Conditional for hypothetical scenarios: If + past simple, + would",
          explanation: "Figueres uses a hypothetical question to make the audience imagine an impossible responsibility — a powerful rhetorical device. In IELTS, this structure is essential for exploring policy consequences and alternative scenarios.",
          structure: "If + past simple, + would/could/might + base verb",
          examples: [
            "If you were told your job was to save the planet with full responsibility but no authority, the only viable strategy would be to change the tone of the entire conversation.",
            "If governments were willing to adopt legally binding emissions targets, international climate agreements would have far greater credibility — but far fewer signatories.",
            "If renewable energy costs continued to fall at their current rate, a fully decarbonized global electricity grid could become affordable within two decades.",
          ],
          timestamp: 204,
          contextSentence: "what you would do if you were told your job is to save the planet.",
        },
        {
          title: "Not just X but also Y — expanding scope for inclusive arguments",
          explanation: "Dùng để mở rộng phạm vi lập luận vượt ra ngoài điều hiển nhiên — đặc biệt mạnh khi muốn cho thấy ảnh hưởng rộng hơn dự kiến (ví dụ: không chỉ các nhà hoạt động mà còn CEO dầu khí cũng ủng hộ chuyển đổi xanh).",
          structure: "It is not just + [obvious group/factor] + but also + [surprising/broader group/factor]",
          examples: [
            "It is not just climate activists but also major oil and gas executives who now acknowledge that the long-term viability of their industry depends on the energy transition.",
            "The benefits of cleaner energy are not just environmental but also economic: better health outcomes, reduced energy import costs, and new industrial employment.",
            "Climate change is not just an environmental challenge but also a security, economic, and human rights issue — requiring responses across every area of public policy.",
          ],
          timestamp: 452,
          contextSentence: "And it wasn't just the usual suspects.",
        },
        {
          title: "From X to Y — parallel structure for describing transformation",
          explanation: "Figueres uses this structure to describe the entire arc of climate diplomacy in one powerful sentence. 'From X to Y' is essential in IELTS for describing change over time, policy shifts, or historical transformations.",
          structure: "From + [starting point], to + [end point] | From + [negative state] to + [positive state]",
          examples: [
            "Climate diplomacy moved from the paralysis of Copenhagen to the unanimous adoption of Paris through six years of relentless, strategic optimism.",
            "The energy transition has shifted the debate from whether a low-carbon economy is possible to how quickly it can be achieved.",
            "Governments evolved from viewing climate action as an economic burden to recognising it as a national interest — a shift that made the Paris Agreement possible.",
          ],
          timestamp: 777,
          contextSentence: "we have come over the past six years from the impossible to the now unstoppable...from confrontation to collaboration.",
        },
        {
          title: "Either...or — reframing a binary choice to shift the argument",
          explanation: "Figueres ends her talk by collapsing the false zero-sum logic: in a shared planetary crisis, the choice is not between winners and losers but between collective survival and collective failure. This structure is powerful in IELTS conclusions.",
          structure: "We are either + [outcome A] + or + [outcome B] | It is either X or Y — there is no third option.",
          examples: [
            "On climate change, there is no middle ground: we are either all losers, or — if we act collectively — we can all be winners.",
            "Governments face a stark choice on the energy transition: either lead the shift to renewables and capture its economic benefits, or resist it and be left with stranded fossil fuel assets.",
            "Either the international community develops genuine mechanisms to hold nations accountable for their climate commitments, or the Paris Agreement will follow Kyoto into irrelevance.",
          ],
          timestamp: 849,
          contextSentence: "We're either all losers or we all can be winners.",
        },
      ],
      notesContent: `## Viết về Hợp tác Quốc tế — Band 7.0+

---

## Ba làn sóng thay đổi dẫn đến Paris (theo Figueres)

| Làn sóng | Nội dung | Ví dụ từ video |
|----------|----------|----------------|
| **1. Công nghệ** | Renewable energy giảm giá, tăng công suất | "clean technologies began to drop price and increase in capacity" |
| **2. Kinh tế** | Hiểu rằng chuyển đổi xanh = lợi ích kinh tế | "intrinsic benefits...cleaner air, better health, more livable cities" |
| **3. Chính trị** | Chính phủ nhận ra hành động khí hậu phù hợp lợi ích quốc gia | "189 countries sent their comprehensive climate change plans, based on their national interest" |

---

## Cấu trúc Conclusion Band 7+ — 3 Thành phần

**① Restate thesis bằng ngôn ngữ MỚI**

❌ Band 5-6: *"In conclusion, international cooperation on climate is important."*

 Band 7+: *"In conclusion, the journey from Copenhagen's paralysis to Paris's unanimous agreement demonstrates that seemingly impossible global challenges can be resolved — but only when optimism is treated not as naïve sentiment but as a strategic commitment to collective action."*

---

**② Broader Implication**

> *"The Paris Agreement's legally binding review process, without legally binding targets, was a deliberate compromise that traded enforceability for universality — a trade-off whose wisdom will be judged by whether the ratchet of five-year checkpoints can generate sufficient political momentum."*

---

**③ Forward-looking Statement**

> *"As Figueres argues, the zero-sum logic that has historically governed international relations is incompatible with planetary challenges: on climate, we are either all losers or we can all be winners — and only a dissemination of both clean technologies and cooperative optimism can determine which outcome prevails."*

---

> **Lưu ý:** Bài TED của Figueres là nguồn tuyệt vời cho IELTS vì nó kết hợp dữ liệu (195 quốc gia, 189 kế hoạch khí hậu, 5-year checkpoints) với lập luận triết học (zero-sum, solidarity, optimism) — đây chính xác là những gì examiner tìm kiếm ở Band 7+.`,
    },
  ]);

  console.log("📖 Lessons created:", lessons.length);
  await CourseModel.findByIdAndUpdate(c1._id, { totalLessons: lessons.length });
  const [l1, l2, l3, l4, l5, l6] = lessons;

  // ── 5. EXAM QUESTIONS ────────────────────────────────────────────────────────

  const [q1, q2, q3] = await ExamQuestionModel.insertMany([
    {
      title: "Recycling — Legal Requirement",
      topicId: t1._id,
      questionPrompt: "Some people claim that not enough of the waste from homes is recycled. They say that the only way to increase recycling is for governments to make it a legal requirement. To what extent do you agree or disagree?",
      suggestedOutline: "<p><strong>Dạng bài:</strong> Agree / Disagree &nbsp;|&nbsp; <strong>Lập trường:</strong> Đồng ý một phần</p>\n<p><strong>Mở bài:</strong> Paraphrase đề bài + nêu quan điểm — phần lớn đồng ý rằng luật bắt buộc là cần thiết, nhưng chưa đủ nếu thiếu các điều kiện đi kèm.</p>\n<p><strong>Thân bài 1 — Lý do ủng hộ luật bắt buộc:</strong></p>\n<ul>\n<li>Tái chế tự nguyện đã thất bại — thói quen cố hữu không thay đổi chỉ nhờ các chiến dịch nâng cao nhận thức</li>\n<li>Chỉ có nghĩa vụ ràng buộc pháp lý mới tạo đủ áp lực để thay đổi hành vi lâu dài</li>\n</ul>\n<p><strong>Thân bài 2 — Điều kiện cần đi kèm:</strong></p>\n<ul>\n<li>Luật phải đồng hành với đầu tư cơ sở hạ tầng thu gom và chương trình giáo dục cộng đồng</li>\n<li>Song song, cần hạn chế sản xuất bao bì dùng một lần không thể tái chế</li>\n</ul>\n<p><strong>Kết bài:</strong> Luật bắt buộc là bước khởi đầu cần thiết, nhưng phải kết hợp với đầu tư hạ tầng và giới hạn sản xuất bao bì không thân thiện với môi trường.</p>",
      difficultyLevel: 1,
      isPublished: true,
      attemptCount: 0,
    },
    {
      title: "Plastic Pollution — Causes and Solutions",
      topicId: t1._id,
      questionPrompt: "Plastic pollution has become a major problem affecting both marine ecosystems and human health. What are the main causes of this problem and what measures can be taken to address it?",
      suggestedOutline: "<p><strong>Dạng bài:</strong> Problems &amp; Solutions</p>\n<p><strong>Mở bài:</strong> Paraphrase đề bài + nêu cấu trúc bài (2 nguyên nhân chính, 2 giải pháp tương ứng).</p>\n<p><strong>Thân bài 1 — Nguyên nhân:</strong></p>\n<ul>\n<li>Sản xuất ồ ạt nhựa dùng một lần — được thiết kế để vứt bỏ nhưng cần 500–1.000 năm để phân hủy</li>\n<li>Hệ thống xử lý rác thải yếu kém ở các nước đang phát triển — phần lớn nhựa đại dương xuất phát từ sông ngòi ở Châu Á và Châu Phi</li>\n</ul>\n<p><strong>Thân bài 2 — Giải pháp:</strong></p>\n<ul>\n<li>Luật trách nhiệm mở rộng của nhà sản xuất → xóa bỏ sự đánh đổi giữa lợi nhuận doanh nghiệp và chi phí xã hội</li>\n<li>Đầu tư quốc tế vào cơ sở hạ tầng quản lý rác thải ở các nước đang phát triển</li>\n</ul>\n<p><strong>Kết bài:</strong> Giải quyết ô nhiễm nhựa đòi hỏi cải cách hệ thống song song với thay đổi hành vi cá nhân — không thể giải quyết bằng một biện pháp đơn lẻ.</p>",
      difficultyLevel: 2,
      isPublished: true,
      attemptCount: 0,
    },
    {
      title: "Species Loss vs. Other Environmental Problems",
      topicId: t1._id,
      questionPrompt: "Some people say that the main environmental problem of our time is the loss of particular species of plants and animals. Others say that there are more important environmental problems. Discuss both views and give your own opinion.",
      suggestedOutline: "<p><strong>Dạng bài:</strong> Discuss Both Views &amp; Opinion &nbsp;|&nbsp; <strong>Lập trường:</strong> Mất loài quan trọng, nhưng biến đổi khí hậu là mối đe dọa hệ thống cấp bách hơn</p>\n<p><strong>Mở bài:</strong> Paraphrase đề bài + nêu quan điểm cá nhân ngắn gọn.</p>\n<p><strong>Thân bài 1 — Quan điểm 1 (mất loài là vấn đề trung tâm):</strong></p>\n<ul>\n<li>Mất loài làm suy giảm đa dạng sinh học, khiến hệ sinh thái mất khả năng phục hồi</li>\n<li>Nguy cơ vượt qua điểm tới hạn không thể đảo ngược</li>\n<li>Giá trị vốn có của đa dạng sinh học tồn tại độc lập với lợi ích của con người</li>\n</ul>\n<p><strong>Thân bài 2 — Quan điểm 2 + Ý kiến bản thân (vấn đề hệ thống cấp bách hơn):</strong></p>\n<ul>\n<li>Biến đổi khí hậu, phá rừng, ô nhiễm nhựa là nguyên nhân gốc rễ dẫn đến mất loài</li>\n<li>Nhiên liệu hóa thạch phá hủy các bể hấp thụ carbon; cần cam kết ràng buộc pháp lý để hành động thực chất</li>\n<li>Tách rời tăng trưởng kinh tế khỏi phá hủy sinh thái là thách thức trọng tâm cần giải quyết</li>\n</ul>\n<p><strong>Kết bài:</strong> Hai vấn đề có liên hệ chặt chẽ — ưu tiên giải quyết các nguyên nhân mang tính hệ thống sẽ đồng thời giải quyết cả hai.</p>",
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
      targetBand: TargetBand.BAND_7_PLUS,
      overallBandScore: 7.0,
      authorName: "Zim.vn",
      isPublished: true,
      favoriteCount: 2,
      outlineContent: "<p><strong>Dạng bài:</strong> Discuss Both Views &amp; Opinion &nbsp;|&nbsp; <strong>Lập trường:</strong> Đồng ý với quan điểm thứ hai — các vấn đề khác cấp bách hơn mất loài</p>\n<p><strong>Mở bài:</strong> Diễn giải đề + nêu quan điểm rõ ràng — đồng ý rằng có những vấn đề môi trường cấp bách hơn.</p>\n<p><strong>Thân bài 1 — Quan điểm 1 (mất loài là vấn đề trung tâm):</strong></p>\n<ul>\n<li>Tác động đến đa dạng sinh học — từ kỹ thuật được giới thiệu ngay câu mở đoạn</li>\n<li>Rừng bị chặt phá → thiếu oxy và xói mòn đất (nguyên nhân → hậu quả)</li>\n<li>Động vật có nguy cơ tuyệt chủng bị săn trộm → phá vỡ hệ sinh thái</li>\n<li>Ví dụ chuỗi nhân quả đầy đủ: vây cá mập bị lấy → mất động vật săn mồi → chuỗi thức ăn gián đoạn → hệ sinh thái mất cân bằng</li>\n</ul>\n<p><strong>Thân bài 2 — Quan điểm 2 + Ý kiến cá nhân (vấn đề hệ thống cấp bách hơn):</strong></p>\n<ul>\n<li>Ô nhiễm và biến đổi khí hậu là nguyên nhân chính gây mất đa dạng sinh học</li>\n<li>Môi trường sống đang đứng trước nguy cơ bị hủy diệt (<em>on the brink of destruction</em>)</li>\n<li>Ô nhiễm nước và đất → động vật bị nhiễm độc → sức khỏe con người bị ảnh hưởng</li>\n<li>Biến đổi khí hậu → thiên tai xảy ra thường xuyên và khốc liệt hơn</li>\n</ul>\n<p><strong>Kết luận:</strong> Cả hai vấn đề đều cần được quan tâm; nỗ lực nên hướng đến tất cả thay vì chỉ tập trung vào tuyệt chủng loài.</p>",
      fullEssayContent: `Many people think that the loss of particular plants and animal species is the main environmental problem that humans are facing nowadays, while others believe that some other environmental issues are more alarming. I agree with the latter view and will analyse both views in the following essay.

On the one hand, the loss of animal and plant species is considered the main environmental problem because of its impact on our planet's biodiversity. Around the world, trees are being cut down for industrial and agriculture purposes. As a result, there will not be enough trees to produce oxygen for humans and prevent soil erosion. Meanwhile, endangered animals are being poached to serve people's needs, hence negatively affecting the whole ecosystem. For example, when sharks are killed for their fins, many types of aquatic species no longer have their natural predators to control their population. Consequently, the disappearance of predators disrupts the natural food chain and then leads to unbalanced underwater ecosystems.

On the other hand, there are more urgent environmental issues than the loss of plant and animal species. Those problems, which include pollution and climate change, are the main factors that cause the loss of biodiversity and put the natural habitat on the brink of destruction. Water and soil pollution caused by industrial and agricultural activities are poisoning a large number of species of marine and land animals, which means that human health is also negatively affected as those animals are humans' important food source. Moreover, changing weather patterns caused by climate change lead to more frequent occurrences of natural disasters such as droughts, floods and wildfires.

In conclusion, it is true that the loss of particular plants and animals should be paid great attention to, but other environmental issues should also be taken into consideration. I think we should put a great deal of effort into tackling all of those problems rather than only focusing on the animals and plants' extinction.`,
      highlightAnnotations: [
        {
          text: "biodiversity",
          highlightType: HighlightType.VOCABULARY,
          explanation: "'biodiversity' — từ kỹ thuật quan trọng nhất của chủ đề, dùng chính xác ngay câu mở Body 1 để nêu impact. Thay vì nói chung chung 'harmful to nature' hay 'animals and plants in general', 'biodiversity' gói gọn toàn bộ khái niệm đa dạng sinh học trong một từ duy nhất — đặc trưng Band 7.",
          color: "#fbbf24",
        },
        {
          text: "trees are being cut down for industrial and agriculture purposes",
          highlightType: HighlightType.GRAMMAR,
          explanation: "Passive continuous: 'are being cut down' — be + being + past participle — nhấn mạnh hoạt động đang xảy ra và chưa kết thúc. Dùng passive vì tác nhân (con người) ít quan trọng hơn đối tượng bị ảnh hưởng (cây cối). Bài dùng thêm 'are being poached' ở câu tiếp — thể hiện variety trong passive voice.",
          color: "#818cf8",
        },
        {
          text: "endangered animals are being poached",
          highlightType: HighlightType.VOCABULARY,
          explanation: "'poached' (săn trộm) chính xác hơn 'illegally killed/hunted'. 'Endangered' (bị đe dọa tuyệt chủng) là tính từ kỹ thuật chuẩn. Cả hai từ thể hiện kiến thức chuyên ngành về môi trường — examiners đánh giá cao technical vocabulary dùng đúng ngữ cảnh.",
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
          explanation: "Nominalization: 'disappear' (v) → 'the disappearance of' (n). Thay vì 'After predators disappear, the food chain is disrupted', bài dùng cụm danh từ làm chủ ngữ — gọn hơn, học thuật hơn. Đây là đặc trưng Band 7+: abstract noun phrase thay vì simple subject + verb.",
          color: "#818cf8",
        },
        {
          text: "Those problems, which include pollution and climate change,",
          highlightType: HighlightType.GRAMMAR,
          explanation: "Non-defining relative clause với dấu phẩy bao quanh: 'Those problems, which include pollution and climate change,' — bổ sung thông tin liệt kê ví dụ mà không cần câu riêng. Phân biệt với defining relative clause (không có dấu phẩy). Cách 'nén' thông tin vào một câu duy nhất của Band 6+.",
          color: "#818cf8",
        },
        {
          text: "are the main factors that cause the loss of biodiversity and put the natural habitat",
          highlightType: HighlightType.ARGUMENT,
          explanation: "Lập luận cốt lõi của Body 2 — không chỉ liệt kê 'vấn đề khác' mà tuyên bố rõ: ô nhiễm và biến đổi khí hậu là nguyên nhân gốc rễ gây mất đa dạng sinh học. Logic này vừa trả lời đề (other problems > species loss) vừa liên kết hai body paragraphs lại với nhau — cấu trúc lập luận Band 7.",
          color: "#f87171",
        },
        {
          text: "on the brink of destruction",
          highlightType: HighlightType.VOCABULARY,
          explanation: "'on the brink of destruction' — idiomatic expression đặc thù Environmental essays. Mạnh hơn 'in danger of being destroyed' hay 'almost destroyed'. 'Brink' (bờ vực) gợi sự cấp bách, nguy hiểm sắp xảy ra — tạo emotional weight cho lập luận mà không cần dùng từ cảm thán.",
          color: "#fbbf24",
        },
        {
          text: "which means that human health is also negatively affected as those animals are humans' important food source",
          highlightType: HighlightType.ARGUMENT,
          explanation: "Mở rộng impact: ô nhiễm → động vật bị nhiễm độc → con người ăn động vật → con người bị ảnh hưởng. 'Which means that' kết nối hậu quả môi trường trực tiếp với lợi ích con người — lập luận Band 7: không chỉ nói 'tốt cho thiên nhiên' mà chứng minh tại sao con người phải quan tâm.",
          color: "#f87171",
        },
      ],
    },

    // ── E2 — Band 8.0 — Problems-Solutions — Q2 (Plastic pollution) ────────────
    {
      title: "The Growing Crisis of Plastic Pollution: Problems and Solutions",
      topicId: t1._id,
      questionPrompt: "More and more plastic waste is polluting the world's cities, countryside, and oceans. What problems will it cause? What measures should be taken to solve these problems?",
      targetBand: TargetBand.BAND_7_PLUS,
      overallBandScore: 8.0,
      authorName: "study4.com",
      isPublished: true,
      favoriteCount: 1,
      outlineContent: "<p><strong>Dạng bài:</strong> Problems &amp; Solutions</p>\n<p><strong>Mở bài:</strong> Rác thải nhựa ngày càng ô nhiễm thành phố, nông thôn và đại dương — đây là mối lo ngại môi trường cấp bách. Bài sẽ thảo luận các vấn đề và đề xuất biện pháp giải quyết.</p>\n<p><strong>Thân bài 1 — Các vấn đề gây ra:</strong></p>\n<ul>\n<li>Động vật nhầm rác thải nhựa là thức ăn → nuốt vào, bị thương, thậm chí tử vong (đặc biệt động vật biển)</li>\n<li>Môi trường sống tự nhiên xuống cấp (bờ biển, sông ngòi) → mất vẻ đẹp cảnh quan và giá trị giải trí</li>\n<li>Tác động kinh tế-xã hội: ngành du lịch và cộng đồng địa phương bị ảnh hưởng nặng nề</li>\n</ul>\n<p><strong>Thân bài 2 — Biện pháp giải quyết:</strong></p>\n<ul>\n<li>Áp dụng kinh tế tuần hoàn: thiết kế nhựa để tái sử dụng, tái chế hoặc phân hủy sinh học; chính phủ và doanh nghiệp thúc đẩy bao bì thân thiện, đầu tư nghiên cứu và ban hành chính sách tái chế</li>\n<li>Nâng cao nhận thức cộng đồng: chiến dịch giáo dục về hậu quả môi trường và sức khỏe; khuyến khích giảm tiêu thụ nhựa, dùng đồ tái sử dụng và phân loại rác đúng cách</li>\n</ul>\n<p><strong>Kết luận:</strong> Kết hợp kinh tế tuần hoàn và nâng cao nhận thức cộng đồng sẽ mở ra tương lai bền vững hơn.</p>",
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
      targetBand: TargetBand.BAND_7_PLUS,
      overallBandScore: 7.5,
      authorName: "writing9.com",
      isPublished: true,
      favoriteCount: 0,
      outlineContent: "<p><strong>Dạng bài:</strong> Agree / Disagree &nbsp;|&nbsp; <strong>Lập trường:</strong> Không đồng ý — luật pháp đơn thuần không đủ để tăng tỉ lệ tái chế</p>\n<p><strong>Mở bài:</strong> Phản bác quan điểm cho rằng chỉ có luật pháp mới tăng được tỉ lệ tái chế — sẽ giải thích qua hai lập luận chính.</p>\n<p><strong>Thân bài 1 — Đầu tư cơ sở hạ tầng quan trọng hơn luật lệ:</strong></p>\n<ul>\n<li>Luật đơn thuần không hiệu quả nếu thiếu hạ tầng — người dân vẫn đổ rác trái phép (<em>fly-tip</em>)</li>\n<li>Chính phủ cần đầu tư: thùng rác riêng biệt, dịch vụ thu gom định kỳ, trung tâm tái chế</li>\n<li>Ví dụ: Thụy Điển với cơ chế đặt cọc-hoàn tiền (<em>deposit-refund scheme</em>) → một trong những quốc gia sạch nhất thế giới</li>\n<li>Kết quả: hạ tầng thân thiện môi trường tạo ra thay đổi hành vi bền vững lâu dài</li>\n</ul>\n<p><strong>Thân bài 2 — Nâng cao nhận thức cộng đồng:</strong></p>\n<ul>\n<li>Chiến dịch giáo dục thúc đẩy thay đổi hành vi mạnh hơn biện pháp cưỡng bức</li>\n<li>Khi người dân hiểu hậu quả của xả rác bừa bãi (hại động vật, ô nhiễm nước, đẩy nhanh biến đổi khí hậu) → tự nguyện thay đổi</li>\n<li>Dẫn chứng: nghiên cứu Mỹ 2023 — 56% hộ gia đình mua thùng tái chế sau chiến dịch giáo dục</li>\n</ul>\n<p><strong>Kết luận:</strong> Luật pháp có tác dụng nhất định nhưng không bền vững lâu dài; đầu tư vào giáo dục cộng đồng và hạ tầng xanh mới là chìa khóa thực sự.</p>",
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

  // ── 7. SUBMISSIONS (removed) ─────────────────────────────────────────────────

  const _submissionsPlaceholder = [
    // S1 — Minh, Q1 (Recycling), attempt 1, Band 5.5 — trước khi học
    {
      userId: u2._id,
      questionId: q1._id,
      essayContent: `In my opinion, recycling is very important for the environment. However, not enough people recycle waste from their homes. In this essay, I will discuss whether the government should make recycling a legal requirement.

Firstly, making recycling a legal requirement would be a good idea because many people are too lazy to recycle. If the government makes a law, people will have to follow it. For example, in some countries, people must separate their waste or they will have to pay a fine. This would make more people recycle.

Secondly, recycling is good for the environment because it reduces the amount of waste that goes to landfill. Plastic takes a very long time to break down, so it is important to recycle it instead of throwing it away. If we recycle more, we can reduce the amount of waste and protect nature and animals.

However, some people think that making recycling a legal requirement is too strict. They believe that people should have the freedom to choose. Also, some people do not have access to recycling facilities, so it would be unfair to punish them.

In conclusion, I agree that the government should make recycling a legal requirement because voluntary recycling is not working well enough. At the same time, the government should also invest in recycling facilities to make it easier for people to recycle.`,
      wordCount: 218,
      timeSpentSeconds: 2600,
      status: SubmissionStatus.COMPLETED,
      submittedAt: new Date(),
      attemptNumber: 1,
      aiResult: {
        taskResponseScore: 5.0,
        coherenceScore: 6.0,
        lexicalScore: 5.5,
        grammarScore: 5.5,
        overallBand: 5.5,
        generalFeedback: "Bài viết trả lời đúng đề và có cấu trúc cơ bản, nhưng từ vựng ở mức phổ thông — chưa sử dụng được các từ học thuật đặc thù về chủ đề môi trường. Lập luận chung chung, thiếu số liệu và ví dụ cụ thể. Cấu trúc câu đơn điệu và lặp lại. Đây là điểm khởi đầu tốt nhưng cần đầu tư nhiều hơn vào từ vựng và chiều sâu lập luận.",
        strengths: "Trả lời đúng yêu cầu đề (agree/disagree). Có cấu trúc cơ bản: intro, body, conclusion. Bày tỏ quan điểm cá nhân rõ ràng.",
        improvements: "Từ vựng cần học thuật hơn — tránh 'too lazy', 'very long time to break down', 'protect nature'. Cần số liệu cụ thể thay vì nói chung chung. Topic sentences cần rõ ràng và học thuật hơn.",
        processedAt: new Date(),
        errors: [
          {
            startIndex: 165,
            endIndex: 225,
            category: ErrorCategory.VOCABULARY,
            originalText: "many people are too lazy to recycle",
            suggestion: "voluntary recycling campaigns have consistently failed to achieve the participation rates required",
            explanation: "'Too lazy' là cách nói không học thuật và mang tính phán xét. Trong IELTS, hãy diễn đạt vấn đề hành vi bằng ngôn ngữ trung lập và học thuật hơn.",
            severity: "high",
          },
          {
            startIndex: 440,
            endIndex: 510,
            category: ErrorCategory.VOCABULARY,
            originalText: "bad for nature and animals",
            suggestion: "pose a serious threat to ecosystems and biodiversity",
            explanation: "'Bad for nature and animals' là cách nói Band 4. Hãy dùng 'ecosystems', 'biodiversity', 'pose a threat to' — đây là vocabulary cần thiết cho Band 6+.",
            severity: "high",
          },
          {
            startIndex: 280,
            endIndex: 340,
            category: ErrorCategory.GRAMMAR,
            originalText: "Scientists find microplastics in our food",
            suggestion: "Scientists have found microplastics in honey, sea salt, tap water, and human blood",
            explanation: "Present simple 'find' nên dùng Present Perfect 'have found' vì đây là phát hiện khoa học đang tiếp diễn. Thêm ví dụ cụ thể để tăng sức thuyết phục.",
            severity: "medium",
          },
          {
            startIndex: 650,
            endIndex: 730,
            category: ErrorCategory.COHERENCE,
            originalText: "Also, some people do not have access to recycling facilities, so it would be unfair to punish them.",
            suggestion: "Furthermore, the effectiveness of mandatory recycling depends on the availability of collection infrastructure — without adequate facilities, legal requirements become unenforceable.",
            explanation: "Ý tưởng đúng nhưng diễn đạt quá đơn giản. Body paragraph cần kết nối ý với lập luận chính (về infrastructure) thay vì chỉ nêu ra ý rời rạc.",
            severity: "medium",
          },
          {
            startIndex: 780,
            endIndex: 860,
            category: ErrorCategory.COHERENCE,
            originalText: "At the same time, the government should also invest in recycling facilities to make it easier for people to recycle.",
            suggestion: "Legal mandates must be accompanied by investment in collection infrastructure and restrictions on the production of non-recyclable packaging to form a coherent systemic response.",
            explanation: "Conclusion cần 'broader implication' — không chỉ nhắc lại giải pháp mà còn nêu tầm quan trọng rộng hơn. Dùng từ kỹ thuật 'infrastructure', 'non-recyclable packaging', 'systemic response'.",
            severity: "medium",
          },
        ],
      },
    },

    // S2 — Minh, Q2 (Plastic pollution), attempt 1, Band 6.0 — sau L1–L4
    {
      userId: u2._id,
      questionId: q2._id,
      essayContent: `Plastic pollution has become one of the most serious environmental problems today. It damages marine ecosystems and poses risks to human health. In this essay, I will discuss the main causes of plastic pollution and suggest some solutions.

The main cause of plastic pollution is the mass production of single-use plastic products such as packaging, bags, and bottles. These items are designed to be used once and thrown away, but they take hundreds of years to degrade. As a result, huge amounts of plastic debris accumulate in our oceans every year. Another important cause is the lack of proper waste management infrastructure in many developing countries. Without adequate waste collection systems, plastic waste ends up in rivers and eventually reaches the ocean.

To address this problem, governments should introduce legislation that makes manufacturers responsible for the plastic packaging they produce. This would eliminate the current trade-off, where companies profit from cheap plastic while society bears the cost of cleaning it up. In addition, developed countries should invest in waste management infrastructure in developing nations, as most ocean plastic comes from rivers in Asia and Africa.

In conclusion, plastic pollution is caused by overproduction and poor waste management. Solutions require both legislation to hold manufacturers accountable and international investment in infrastructure to prevent plastic from entering our waterways.`,
      wordCount: 212,
      timeSpentSeconds: 2400,
      status: SubmissionStatus.COMPLETED,
      submittedAt: new Date(),
      attemptNumber: 1,
      aiResult: {
        taskResponseScore: 6.0,
        coherenceScore: 6.0,
        lexicalScore: 6.0,
        grammarScore: 6.0,
        overallBand: 6.0,
        generalFeedback: "Tiến bộ rõ rệt về từ vựng so với bài trước — 'single-use', 'trade-off', 'infrastructure', 'debris' được dùng đúng ngữ cảnh. Lập luận có cấu trúc logic. Điểm hạn chế: relative clauses còn một lỗi, kết bài chưa có broader implication, microplastics chưa được phát triển đầy đủ. Đây là bài Band 6 điển hình: đúng nhưng chưa ấn tượng.",
        strengths: "Từ vựng cải thiện rõ: trade-off, infrastructure, single-use, debris dùng đúng ngữ cảnh. Cấu trúc Problem-Solution logic và dễ theo dõi. Có sử dụng contrast connector 'As a result'.",
        improvements: "Relative clauses cần chính xác hơn. Kết bài cần broader implication — không chỉ tóm tắt. 'Despite of' là lỗi sai phổ biến — 'Despite' không đi với 'of'.",
        processedAt: new Date(),
        errors: [
          {
            startIndex: 380,
            endIndex: 450,
            category: ErrorCategory.GRAMMAR,
            originalText: "plastic which it takes hundreds of years to degrade",
            suggestion: "plastic which takes hundreds of years to degrade",
            explanation: "Relative clause sai — 'which it takes' nên là 'which takes'. Khi dùng relative pronoun làm chủ ngữ, không cần thêm 'it'.",
            severity: "high",
          },
          {
            startIndex: 520,
            endIndex: 580,
            category: ErrorCategory.GRAMMAR,
            originalText: "Despite of the growing awareness",
            suggestion: "Despite the growing awareness",
            explanation: "'Despite' là giới từ — không đi với 'of'. Đây là lỗi rất phổ biến. 'Despite + noun/gerund' (không có 'of'). Phân biệt với 'In spite of + noun'.",
            severity: "high",
          },
          {
            startIndex: 720,
            endIndex: 800,
            category: ErrorCategory.COHERENCE,
            originalText: "Solutions require both legislation to hold manufacturers accountable and international investment in infrastructure.",
            suggestion: "Addressing plastic pollution requires treating it as a systemic failure of market design, not merely an individual behaviour problem — only legislative reform and international investment can correct the structural incentives that allow corporations to externalise environmental costs.",
            explanation: "Kết bài cần broader implication thay vì chỉ nhắc lại giải pháp. Hãy nêu tầm quan trọng lớn hơn — ví dụ: đây là vấn đề cấu trúc thị trường, không chỉ là vấn đề hành vi cá nhân.",
            severity: "medium",
          },
          {
            startIndex: 200,
            endIndex: 280,
            category: ErrorCategory.VOCABULARY,
            originalText: "microplastics are dangerous",
            suggestion: "microplastics — particles smaller than 5mm — have been detected in human blood, sea salt, and drinking water, with health consequences that remain, as yet, inconclusive but deeply concerning",
            explanation: "'Microplastics are dangerous' quá đơn giản. Dùng hedging language ('as yet, inconclusive but deeply concerning') và số liệu cụ thể để thể hiện tư duy phê phán Band 7+.",
            severity: "medium",
          },
        ],
      },
    },

    // S3 — Minh, Q1 (Recycling), attempt 2, Band 6.5 — sau E2+E3+flashcard
    {
      userId: u2._id,
      questionId: q1._id,
      essayContent: `The question of whether recycling should be made a legal requirement raises important issues about personal freedom, government responsibility, and environmental protection. I largely agree that legal requirements are necessary, though they must be accompanied by structural changes.

There is a strong case for making recycling legally binding. Entrenched habits of convenience are unlikely to change through voluntary campaigns alone, as decades of awareness-raising have demonstrated. When governments in countries such as Germany and South Korea introduced mandatory recycling schemes, participation rates rose significantly and recycling infrastructure became more efficient. A legally binding obligation also sends a clear signal to manufacturers that they must design products with end-of-life recovery in mind, and that the cost of disposal must be internalised rather than externalised to the public.

Admittedly, mandatory recycling alone cannot solve the problem. Single-use plastics continue to be produced at scale, and many households lack access to proper collection facilities. However, this is an argument for investing in infrastructure alongside legislation, not against the legislation itself. The key trade-off that policymakers must navigate is between enforcement and public acceptance — a tiered approach, combining legal requirements with education and investment, is likely to be most effective.

In conclusion, I believe that making recycling a legal requirement is a necessary step, but success depends on combining this mandate with investment in collection infrastructure and limits on the production of non-recyclable packaging.`,
      wordCount: 234,
      timeSpentSeconds: 2800,
      status: SubmissionStatus.COMPLETED,
      submittedAt: new Date(),
      attemptNumber: 2,
      aiResult: {
        taskResponseScore: 6.5,
        coherenceScore: 6.5,
        lexicalScore: 7.0,
        grammarScore: 6.0,
        overallBand: 6.5,
        generalFeedback: "Lexical Resource đã đạt Band 7 — 'legally binding', 'trade-off', 'infrastructure', 'entrenched' tất cả được dùng đúng và tự nhiên. Lập luận có chiều sâu hơn hẳn, concession-rebuttal rõ ràng. Điểm kéo xuống ở Grammar: perfect tenses còn một lỗi, và transition giữa các đoạn còn hơi abrupt. Tiếp tục luyện grammar và coherence để lên Band 7.",
        strengths: "Từ vựng học thuật xuất sắc: legally binding, trade-off, infrastructure, entrenched dùng chính xác và tự nhiên. Relative clauses chính xác hơn nhiều so với S2. Có số liệu cụ thể (Germany, South Korea) hỗ trợ lập luận.",
        improvements: "Perfect tenses cần chú ý subject-verb agreement. Cần smoother transitions giữa Body 1 và Body 2. Conclusion có thể có broader implication rõ hơn.",
        processedAt: new Date(),
        errors: [
          {
            startIndex: 420,
            endIndex: 500,
            category: ErrorCategory.GRAMMAR,
            originalText: "participation rates has risen significantly",
            suggestion: "participation rates rose significantly",
            explanation: "'Rates' là danh từ số nhiều → cần 'have risen', không phải 'has risen'. Hoặc dùng simple past 'rose' vì có time reference cụ thể ('when governments...introduced').",
            severity: "high",
          },
          {
            startIndex: 680,
            endIndex: 740,
            category: ErrorCategory.GRAMMAR,
            originalText: "many households lacks access",
            suggestion: "many households lack access",
            explanation: "Subject-verb agreement: 'households' (plural) → 'lack' (not 'lacks').",
            severity: "medium",
          },
          {
            startIndex: 830,
            endIndex: 920,
            category: ErrorCategory.COHERENCE,
            originalText: "The key trade-off that policymakers must navigate is between enforcement and public acceptance",
            suggestion: "The critical trade-off policymakers must navigate is between enforceability and public legitimacy: overly punitive regimes risk backlash, while purely incentive-based models fail to shift deeply entrenched behaviours.",
            explanation: "Ý tưởng rất tốt nhưng cần phát triển thêm. Giải thích cụ thể tại sao cả hai thái cực đều có vấn đề — đây là cách thể hiện 'nuanced argument' của Band 7+.",
            severity: "low",
          },
        ],
      },
    },

    // S4 — Minh, Q3 (Species loss), attempt 1, Band 7.0 — sau L5–L6 + E1
    {
      userId: u2._id,
      questionId: q3._id,
      essayContent: `The debate over which environmental crisis deserves the most urgent attention — whether species extinction or broader threats such as climate change — touches on a deeper question about symptoms versus systemic causes. I would argue that while biodiversity loss is undeniably serious, addressing its root causes is a more foundational priority.

Those who regard species extinction as the central environmental problem point to the cascade effects it triggers. The loss of a single species can destabilise entire ecosystems, making them less resilient and more vulnerable to collapse. Scientists warn that we may be approaching a tipping point beyond which ecosystem failure becomes self-reinforcing, particularly in tropical rainforests. That is a legitimate concern. But it is even more alarming when we consider that species loss is itself a symptom of deeper structural failures, not the root cause.

Admittedly, extinction is irreversible, and this permanence demands serious attention. However, the forces driving it — fossil fuel-dependent agriculture, the deterioration of carbon sinks, and entrenched economic systems that externalise environmental costs — are the same forces causing climate breakdown. The acceleration of biodiversity loss and the elimination of natural carbon sinks are not separate crises but two expressions of the same structural failure. Addressing this through legally binding emissions commitments and the decoupling of economic growth from ecological destruction would simultaneously protect biodiversity and stabilise the climate.

In conclusion, the most important environmental problem of our time is not any single symptom, but the systemic dependence on growth models that treat nature as a resource rather than a system to be sustained.`,
      wordCount: 258,
      timeSpentSeconds: 3100,
      status: SubmissionStatus.COMPLETED,
      submittedAt: new Date(),
      attemptNumber: 1,
      aiResult: {
        taskResponseScore: 7.0,
        coherenceScore: 7.0,
        lexicalScore: 7.0,
        grammarScore: 7.0,
        overallBand: 7.0,
        generalFeedback: "Đây là bước tiến lớn. Bài viết thể hiện rõ khả năng lập luận học thuật Band 7: nominalization nhất quán, emphatic reversal trong Body 1 rất ấn tượng, vocabulary Band 7+ (legally binding, entrenched, decouple, tipping point) dùng tự nhiên và chính xác. Kết bài có broader implication thực sự — không chỉ tóm tắt. Cần duy trì sự nhất quán của nominalization trong toàn bài để tiến lên Band 7.5.",
        strengths: "Nominalization thành thạo: 'the acceleration of biodiversity loss', 'the elimination of natural carbon sinks'. Emphatic reversal trong Body 1: 'That is a legitimate concern. But it is even more alarming...'. Từ vựng Band 7+: legally binding, entrenched, decouple, tipping point — tất cả dùng đúng ngữ cảnh. Concession + rebuttal rõ ràng và thuyết phục: 'Admittedly... However...'.",
        improvements: "Nominalization cần nhất quán xuyên suốt — có 1 câu dùng verb phrase thay vì noun phrase. Body 2 có thể bổ sung thêm ví dụ cụ thể (số liệu hoặc case study) để tăng Task Response.",
        processedAt: new Date(),
        errors: [
          {
            startIndex: 480,
            endIndex: 560,
            category: ErrorCategory.GRAMMAR,
            originalText: "making them less resilient and more vulnerable to collapse",
            suggestion: "reducing ecosystem resilience and increasing vulnerability to irreversible collapse",
            explanation: "Nominalization chưa hoàn chỉnh: 'making them less resilient' có thể chuyển thành 'reducing ecosystem resilience' — danh hóa 'resilient' thành 'resilience'. Nhất quán dùng nominalization ở cấp độ này sẽ đẩy Band Grammatical Range từ 7.0 lên 7.5.",
            severity: "low",
          },
          {
            startIndex: 150,
            endIndex: 200,
            category: ErrorCategory.SPELLING,
            originalText: "enviroment",
            suggestion: "environment",
            explanation: "Lỗi chính tả — 'enviroment' → 'environment'. Luôn kiểm tra các từ quan trọng trước khi nộp bài.",
            severity: "low",
          },
        ],
      },
    },

    // S5 — Lan, Q1 (Recycling), attempt 1, DRAFT ~130 từ
    {
      userId: u3._id,
      questionId: q1._id,
      essayContent: `Many people think that recycling is important for the environment, but not everyone does it. One solution that some people suggest is for governments to make recycling a legal requirement. In my opinion, this is a good idea because many people will not recycle unless they have to.

First of all, if recycling becomes a legal requirement, more people will participate. At the moment, many people choose not to recycle because it takes extra time and effort. However, if there is a law, they will have no choice. Countries like Germany have shown that when recycling is compulsory, the amount of recycled waste increases a lot.

Secondly, recycling can help to reduce waste and protect`,
      wordCount: 115,
      timeSpentSeconds: 0,
      status: SubmissionStatus.DRAFT,
      attemptNumber: 1,
    },
  ];

  // ── 8. FLASHCARD SET + FLASHCARDS ─────────────────────────────────────────

  const [fs1, fs2] = await FlashcardSetModel.insertMany([
    {
      userId: u2._id,
      title: "Từ vựng Môi trường Band 5–6",
      description: "12 từ vựng học thuật từ bài học L1–L4 về nhựa, hệ sinh thái và ô nhiễm. Ôn tập để dùng trong bài mẫu E2 và E3.",
    },
    {
      userId: u2._id,
      title: "Từ vựng & Cấu trúc Band 7+",
      description: "12 thẻ từ vựng nâng cao từ bài học L5–L6 về biến đổi khí hậu và Paris Agreement. Học sau khi đã nắm chắc FS1.",
    },
  ]);

  await FlashcardModel.insertMany([
    // ── FS1 — Band 5–6 — 12 thẻ từ L1–L4 ────────────────────────────────────
    {
      setId: fs1._id,
      frontContent: "microplastics",
      backContent: "<p><strong>Ý nghĩa:</strong> Vi nhựa — hạt nhựa nhỏ hơn 5mm, hình thành khi nhựa lớn hơn bị phân hủy dần trong môi trường</p>\n<p><strong>Cách đọc:</strong> /ˌmaɪkrəʊˈplæstɪks/</p>\n<p><strong>Ví dụ:</strong> <em>Microplastics have been detected in human blood, sea salt, and drinking water.</em></p>",
      reviewCount: 5,
      nextReviewDate: daysAgo(-3),
    },
    {
      setId: fs1._id,
      frontContent: "trade-off",
      backContent: "<p><strong>Ý nghĩa:</strong> Sự đánh đổi — cải thiện điều A thì phải chấp nhận mất mát điều B</p>\n<p><strong>Cách đọc:</strong> /ˈtreɪd ɒf/</p>\n<p><strong>Ví dụ:</strong> <em>There are complex trade-offs between economic growth and environmental protection.</em></p>",
      reviewCount: 4,
      nextReviewDate: daysAgo(-2),
    },
    {
      setId: fs1._id,
      frontContent: "ecosystem",
      backContent: "<p><strong>Ý nghĩa:</strong> Hệ sinh thái — cộng đồng sinh vật sống tương tác với nhau và với môi trường vật lý xung quanh</p>\n<p><strong>Cách đọc:</strong> /ˈiːkəʊˌsɪstəm/</p>\n<p><strong>Ví dụ:</strong> <em>Ocean ecosystems are severely threatened by plastic pollution and rising temperatures.</em></p>",
      reviewCount: 4,
      nextReviewDate: daysAgo(-2),
    },
    {
      setId: fs1._id,
      frontContent: "infrastructure",
      backContent: "<p><strong>Ý nghĩa:</strong> Cơ sở hạ tầng — hệ thống cơ sở vật chất cần thiết để xã hội vận hành</p>\n<p><strong>Cách đọc:</strong> /ˈɪnfrəstrʌktʃə/</p>\n<p><strong>Ví dụ:</strong> <em>Developing nations often lack the waste management infrastructure needed to prevent plastic from entering rivers.</em></p>",
      reviewCount: 3,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fs1._id,
      frontContent: "carbon sink",
      backContent: "<p><strong>Ý nghĩa:</strong> Bể hấp thụ carbon — hệ thống tự nhiên hấp thụ CO₂ nhiều hơn lượng nó thải ra</p>\n<p><strong>Cách đọc:</strong> /ˈkɑːbən sɪŋk/</p>\n<p><strong>Ví dụ:</strong> <em>The Amazon rainforest is one of the world's most important carbon sinks.</em></p>",
      reviewCount: 3,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fs1._id,
      frontContent: "tipping point",
      backContent: "<p><strong>Ý nghĩa:</strong> Điểm tới hạn — ngưỡng không thể đảo ngược, khi vượt qua thì hệ thống sụp đổ nhanh chóng</p>\n<p><strong>Cách đọc:</strong> /ˈtɪpɪŋ pɔɪnt/</p>\n<p><strong>Ví dụ:</strong> <em>Scientists warn we may be approaching a tipping point for Amazon deforestation.</em></p>",
      reviewCount: 3,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fs1._id,
      frontContent: "degrade",
      backContent: "<p><strong>Ý nghĩa:</strong> Phân hủy — bị phá vỡ thành các mảnh nhỏ hơn hoặc hợp chất đơn giản hơn</p>\n<p><strong>Cách đọc:</strong> /dɪˈɡreɪd/</p>\n<p><strong>Ví dụ:</strong> <em>Conventional plastic does not fully degrade — it merely fragments into smaller particles.</em></p>",
      reviewCount: 2,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fs1._id,
      frontContent: "single-use",
      backContent: "<p><strong>Ý nghĩa:</strong> Dùng một lần rồi bỏ — mô tả sản phẩm được thiết kế chỉ để sử dụng một lần duy nhất</p>\n<p><strong>Cách đọc:</strong> /ˌsɪŋɡl juːz/</p>\n<p><strong>Ví dụ:</strong> <em>A global shift away from single-use packaging is essential to reduce ocean pollution.</em></p>",
      reviewCount: 2,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fs1._id,
      frontContent: "resilient",
      backContent: "<p><strong>Ý nghĩa:</strong> Có khả năng phục hồi — có thể phục hồi sau gián đoạn và duy trì chức năng bình thường</p>\n<p><strong>Cách đọc:</strong> /rɪˈzɪliənt/</p>\n<p><strong>Ví dụ:</strong> <em>Diverse ecosystems tend to be more resilient than monocultures.</em></p>",
      reviewCount: 1,
      nextReviewDate: daysAgo(1),
    },
    {
      setId: fs1._id,
      frontContent: "debris",
      backContent: "<p><strong>Ý nghĩa:</strong> Mảnh vỡ, rác thải rải rác — đặc biệt là mảnh nhựa trôi nổi trong môi trường tự nhiên</p>\n<p><strong>Cách đọc:</strong> /ˈdebriː/</p>\n<p><strong>Ví dụ:</strong> <em>Plastic debris accumulates in ocean gyres due to circular currents.</em></p>",
      reviewCount: 1,
      nextReviewDate: daysAgo(1),
    },
    {
      setId: fs1._id,
      frontContent: "persistent",
      backContent: "<p><strong>Ý nghĩa:</strong> Bền vững, khó phân hủy — tồn tại lâu dài trong môi trường, kháng lại quá trình phân hủy tự nhiên</p>\n<p><strong>Cách đọc:</strong> /pəˈsɪstənt/</p>\n<p><strong>Ví dụ:</strong> <em>The persistent nature of synthetic polymers means virtually every piece of plastic ever made still exists.</em></p>",
      reviewCount: 0,
      nextReviewDate: daysAgo(2),
    },
    {
      setId: fs1._id,
      frontContent: "food chain",
      backContent: "<p><strong>Ý nghĩa:</strong> Chuỗi thức ăn — chuỗi tuần tự các sinh vật mà mỗi sinh vật là thức ăn của sinh vật tiếp theo</p>\n<p><strong>Cách đọc:</strong> /fuːd tʃeɪn/</p>\n<p><strong>Ví dụ:</strong> <em>Microplastics travel up the food chain from zooplankton to fish to humans.</em></p>",
      reviewCount: 0,
      nextReviewDate: daysAgo(2),
    },

    // ── FS2 — Band 7+ — 12 thẻ từ L5–L6 ──────────────────────────────────────
    {
      setId: fs2._id,
      frontContent: "net-zero",
      backContent: "<p><strong>Ý nghĩa:</strong> Phát thải ròng bằng 0 — lượng khí nhà kính thải ra được cân bằng hoàn toàn bởi lượng được loại bỏ</p>\n<p><strong>Cách đọc:</strong> /net ˈzɪərəʊ/</p>\n<p><strong>Ví dụ:</strong> <em>Reaching net-zero emissions by 2050 requires immediate and fundamental policy change.</em></p>",
      reviewCount: 2,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fs2._id,
      frontContent: "decouple",
      backContent: "<p><strong>Ý nghĩa:</strong> Tách rời — đạt tăng trưởng kinh tế mà không làm tăng lượng phát thải CO₂</p>\n<p><strong>Cách đọc:</strong> /diːˈkʌpl/</p>\n<p><strong>Ví dụ:</strong> <em>There are signs that economic growth can be decoupled from carbon output, but we are far from achieving this globally.</em></p>",
      reviewCount: 2,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fs2._id,
      frontContent: "legally binding",
      backContent: "<p><strong>Ý nghĩa:</strong> Có tính ràng buộc pháp lý — có thể thi hành theo luật, vi phạm sẽ kéo theo hậu quả pháp lý</p>\n<p><strong>Cách đọc:</strong> /ˈliːɡəli ˈbaɪndɪŋ/</p>\n<p><strong>Ví dụ:</strong> <em>Without legally binding commitments, countries can withdraw from climate pledges without consequence.</em></p>",
      reviewCount: 4,
      nextReviewDate: daysAgo(-2),
    },
    {
      setId: fs2._id,
      frontContent: "entrenched",
      backContent: "<p><strong>Ý nghĩa:</strong> Ăn sâu, cố hữu — được thiết lập vững chắc và rất khó thay đổi</p>\n<p><strong>Cách đọc:</strong> /ɪnˈtrentʃt/</p>\n<p><strong>Ví dụ:</strong> <em>Entrenched vested interests in the fossil fuel industry have obstructed meaningful climate legislation.</em></p>",
      reviewCount: 3,
      nextReviewDate: daysAgo(-1),
    },
    {
      setId: fs2._id,
      frontContent: "zero-sum",
      backContent: "<p><strong>Ý nghĩa:</strong> Tư duy được-mất — lợi ích của một bên bằng đúng tổn thất của bên kia, đối lập với win-win</p>\n<p><strong>Cách đọc:</strong> /ˈzɪərəʊ sʌm/</p>\n<p><strong>Ví dụ:</strong> <em>The zero-sum framing of climate policy ignores the intrinsic benefits of clean energy for all nations.</em></p>",
      reviewCount: 1,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fs2._id,
      frontContent: "dissemination",
      backContent: "<p><strong>Ý nghĩa:</strong> Sự phổ biến rộng rãi — phân phối thông tin, công nghệ hoặc thực hành đến nhiều người hoặc nhiều nơi</p>\n<p><strong>Cách đọc:</strong> /dɪˌsemɪˈneɪʃn/</p>\n<p><strong>Ví dụ:</strong> <em>The dissemination of clean technologies to developing nations requires coordinated international funding.</em></p>",
      reviewCount: 1,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fs2._id,
      frontContent: "carbon capture",
      backContent: "<p><strong>Ý nghĩa:</strong> Thu giữ carbon — công nghệ loại bỏ CO₂ khỏi bầu khí quyển hoặc ngăn không cho phát thải vào</p>\n<p><strong>Cách đọc:</strong> /ˈkɑːbən ˈkæptʃə/</p>\n<p><strong>Ví dụ:</strong> <em>Carbon capture is a supplementary tool — it cannot substitute for reducing emissions at source.</em></p>",
      reviewCount: 1,
      nextReviewDate: daysAgo(0),
    },
    {
      setId: fs2._id,
      frontContent: "rebound effect",
      backContent: "<p><strong>Ý nghĩa:</strong> Hiệu ứng bật lại — khi tăng hiệu quả dẫn đến tăng tiêu thụ, triệt tiêu một phần lợi ích môi trường</p>\n<p><strong>Cách đọc:</strong> /rɪˈbaʊnd ɪˈfekt/</p>\n<p><strong>Ví dụ:</strong> <em>The rebound effect means more fuel-efficient cars can paradoxically increase total fuel consumption.</em></p>",
      reviewCount: 0,
      nextReviewDate: daysAgo(1),
    },
    {
      setId: fs2._id,
      frontContent: "unanimously",
      backContent: "<p><strong>Ý nghĩa:</strong> Nhất trí — tất cả mọi người đồng ý, không có ai phản đối</p>\n<p><strong>Cách đọc:</strong> /juːˈnænɪməsli/</p>\n<p><strong>Ví dụ:</strong> <em>The Paris Agreement was unanimously adopted by 195 governments in December 2015.</em></p>",
      reviewCount: 0,
      nextReviewDate: daysAgo(1),
    },
    {
      setId: fs2._id,
      frontContent: "intrinsic",
      backContent: "<p><strong>Ý nghĩa:</strong> Vốn có, nội tại — thuộc về bản chất cơ bản của sự vật; giá trị tồn tại độc lập với yếu tố bên ngoài</p>\n<p><strong>Cách đọc:</strong> /ɪnˈtrɪnsɪk/</p>\n<p><strong>Ví dụ:</strong> <em>There are intrinsic benefits to the energy transition: cleaner air, better health, more liveable cities.</em></p>",
      reviewCount: 0,
      nextReviewDate: daysAgo(1),
    },
    {
      setId: fs2._id,
      frontContent: "fossil fuels",
      backContent: "<p><strong>Ý nghĩa:</strong> Nhiên liệu hóa thạch — than, dầu mỏ, khí tự nhiên; nguồn phát thải CO₂ chính của nhân loại</p>\n<p><strong>Cách đọc:</strong> /ˈfɒsl fjuːəlz/</p>\n<p><strong>Ví dụ:</strong> <em>Cutting subsidies to the fossil fuel industry is one of the highest-impact policy changes available.</em></p>",
      reviewCount: 0,
      nextReviewDate: daysAgo(2),
    },
    {
      setId: fs2._id,
      frontContent: "nominalization (Grammar)",
      backContent: "<p><strong>Ý nghĩa:</strong> Danh hóa — chuyển động từ hoặc tính từ thành danh từ để văn phong học thuật hơn</p>\n<p><strong>Cách dùng:</strong> implement → implementation, reduce → reduction, eliminate → elimination</p>\n<p><strong>Ví dụ:</strong> <em>The acceleration of biodiversity loss and the elimination of natural carbon sinks are not separate crises.</em></p>",
      reviewCount: 0,
      nextReviewDate: daysAgo(2),
    },
  ]);
  console.log("🃏 Flashcard Sets + Cards created:", fs1._id, fs2._id);

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
      title: "Từ vựng Band 6 từ video nhựa (L4)",
      userDraftNote: "<p><strong>Từ vựng chủ đề Plastic Pollution — L4</strong></p>\n<p>Những từ quan trọng nhất cần dùng trong bài Problem-Solution:</p>\n<ul>\n<li><p><strong>trade-off</strong> — sự đánh đổi, lợi ích A đổi bằng thiệt hại B: <em>a damaging trade-off between corporate profit and public cost</em></p></li>\n<li><p><strong>infrastructure</strong> — cơ sở hạ tầng, hệ thống cơ sở vật chất xã hội: <em>invest in waste management infrastructure in developing nations</em></p></li>\n<li><p><strong>single-use</strong> — dùng một lần rồi bỏ: <em>ban single-use plastic packaging at the source</em></p></li>\n<li><p><strong>microplastics</strong> — vi nhựa, hạt nhựa nhỏ hơn 5mm: <em>microplastics have been detected in human blood and drinking water</em></p></li>\n<li><p><strong>degrade</strong> — phân hủy, vỡ thành các mảnh nhỏ hơn: <em>conventional plastic does not fully degrade — it merely fragments</em></p></li>\n<li><p><strong>debris</strong> — mảnh vỡ, rác thải trôi nổi trong tự nhiên: <em>plastic debris accumulates in ocean gyres due to circular currents</em></p></li>\n</ul>\n<p><strong>Lưu ý:</strong> Bài mẫu E2 dùng <em>trade-off</em>, <em>infrastructure</em> và <em>single-use</em> trong cùng một đoạn Body 2 — xem cách chúng được kết nối bằng relative clause để học cách dùng tự nhiên.</p>",
    },
    {
      userId: u2._id,
      collectionId: nc1._id,
      title: "Nominalization — kỹ thuật Band 7+ từ L5",
      userDraftNote: "<p><strong>Nominalization — Kỹ thuật Band 7+ (L5)</strong></p>\n<p>Chuyển động từ / tính từ thành danh từ để câu văn học thuật hơn, súc tích hơn và tránh lặp cấu trúc chủ-vị đơn điệu.</p>\n<p><strong>So sánh trực tiếp:</strong></p>\n<ul>\n<li><p>❌ <em>We failed to implement the policy</em> →  <em>The failure to implement the policy...</em></p></li>\n<li><p>❌ <em>Countries reduce emissions slowly</em> →  <em>The slow reduction of emissions by countries...</em></p></li>\n<li><p>❌ <em>If we accelerate deforestation...</em> →  <em>The acceleration of deforestation...</em></p></li>\n<li><p>❌ <em>We eliminated natural carbon sinks</em> →  <em>The elimination of natural carbon sinks...</em></p></li>\n</ul>\n<p><strong>Bảng chuyển đổi hay dùng:</strong></p>\n<ul>\n<li><p>implement → <strong>implementation</strong></p></li>\n<li><p>reduce → <strong>reduction</strong></p></li>\n<li><p>invest → <strong>investment</strong></p></li>\n<li><p>emit → <strong>emission</strong></p></li>\n<li><p>eliminate → <strong>elimination</strong></p></li>\n<li><p>accelerate → <strong>acceleration</strong></p></li>\n<li><p>destroy → <strong>destruction</strong></p></li>\n<li><p>deteriorate → <strong>deterioration</strong></p></li>\n</ul>\n<p><strong>Trong bài mẫu E1 (Band 7.0):</strong> <em>The acceleration of biodiversity loss and the elimination of natural carbon sinks are not separate crises.</em> — hai nominalization làm chủ ngữ compound, câu trở nên súc tích và học thuật ngay lập tức.</p>",
    },
    {
      userId: u2._id,
      collectionId: nc1._id,
      title: "Emphatic reversal — cấu trúc L6 rất ấn tượng",
      userDraftNote: "<p><strong>Emphatic Concession Reversal — Kỹ thuật L6</strong></p>\n<p>Cấu trúc 'thừa nhận rồi nâng tầm' — tạo hiệu ứng tương phản mạnh mẽ, đặc trưng của bài Band 7+ trong Discuss Both Views và Agree/Disagree.</p>\n<p><strong>Pattern cơ bản:</strong></p>\n<p><em>That is [nhận xét]. But it is even more [nhận xét mạnh hơn] when/if you consider [lý do nâng tầm].</em></p>\n<p><strong>Ví dụ gốc từ video L6:</strong></p>\n<p><em>Now, that is a remarkable achievement. But it is even more remarkable if you consider where we had been just a few years ago.</em> — Christiana Figueres TED</p>\n<p><strong>Ứng dụng vào chủ đề môi trường:</strong></p>\n<ul>\n<li><p><em>Species loss is undeniably serious. But it is even more alarming when we consider that it is merely a symptom of deeper systemic failures.</em></p></li>\n<li><p><em>Banning plastic bags is a positive step. But it is even more meaningful when we consider that production-level regulation has never been attempted at scale.</em></p></li>\n</ul>\n<p><strong>Nên đặt cấu trúc này ở đâu:</strong></p>\n<ul>\n<li><p><strong>Đầu Body 2</strong> — để chuyển từ view 1 sang view 2 + own opinion một cách ấn tượng</p></li>\n<li><p><strong>Conclusion</strong> — để nâng broader implication lên một tầm mới trước câu kết</p></li>\n</ul>\n<p><strong>Lưu ý:</strong> Chỉ dùng tối đa 1 lần trong một bài — lạm dụng sẽ bị trừ điểm Coherence vì có vẻ giả tạo.</p>",
    },

    // ── NC2 — "Phân tích bài mẫu" ────────────────────────────────────────────
    {
      userId: u2._id,
      collectionId: nc2._id,
      title: "Phân tích bài mẫu E1 — Band 7.5",
      userDraftNote: "<p><strong>Bài mẫu E1 — Band 7.0 — Điểm hay cần học</strong></p>\n<p>Bài Discuss Both Views về mất loài vs. các vấn đề hệ thống. Đây là bài Band 7 điển hình: lập luận chặt, từ vựng đúng chỗ, grammar có variety.</p>\n<p><strong>Mở bài:</strong></p>\n<p>Không dùng clichés. Giới thiệu ngay hai quan điểm rồi chốt lập trường trong một câu: <em>I agree with the latter view and will analyse both views in the following essay.</em></p>\n<p><strong>Body 1 — Trình bày view 1 công bằng:</strong></p>\n<ul>\n<li><p>Từ kỹ thuật đặt ngay câu đầu: <em>its impact on our planet's biodiversity</em></p></li>\n<li><p>Passive continuous nói về quá trình đang xảy ra: <em>trees are being cut down</em>, <em>animals are being poached</em></p></li>\n<li><p>Chuỗi nhân quả đầy đủ 4 bước: sharks killed → no predators → food chain disrupted → ecosystem unbalanced</p></li>\n</ul>\n<p><strong>Body 2 — View 2 + Ý kiến cá nhân:</strong></p>\n<ul>\n<li><p>Nominalization làm chủ ngữ: <em>The disappearance of predators disrupts the natural food chain</em></p></li>\n<li><p>Non-defining relative clause bổ sung thông tin: <em>Those problems, which include pollution and climate change, are the main factors...</em></p></li>\n<li><p>Idiom học thuật: <em>on the brink of destruction</em> — mạnh hơn và trang trọng hơn 'about to be destroyed'</p></li>\n</ul>\n<p><strong>Từ vựng đáng ghi nhớ:</strong></p>\n<ul>\n<li><p><strong>biodiversity</strong> — đa dạng sinh học (dùng thay cho 'variety of species')</p></li>\n<li><p><strong>poached</strong> — bị săn trộm (chính xác hơn 'illegally killed/hunted')</p></li>\n<li><p><strong>on the brink of</strong> — đứng trước nguy cơ (mạnh hơn 'at risk of')</p></li>\n<li><p><strong>occurrences</strong> — dùng trong cụm: <em>more frequent occurrences of natural disasters</em></p></li>\n</ul>",
    },
    {
      userId: u2._id,
      collectionId: nc2._id,
      title: "Contrast connectors — tổng hợp từ L4 đến Band 7+",
      userDraftNote: "<p><strong>Contrast Connectors — Phân cấp theo Band Score</strong></p>\n<p>Để đạt điểm Coherence &amp; Cohesion cao cần variety — không dùng mãi 'However'. Dưới đây là phân cấp từ nối tương phản từ thấp đến cao:</p>\n<p><strong>Band 5–6 (cơ bản):</strong></p>\n<ul>\n<li><p><strong>However, / Nevertheless,</strong> — đặt đầu câu, theo sau dấu phẩy</p></li>\n<li><p><strong>Despite + danh từ</strong> — <em>Despite the benefits, plastic remains a serious threat.</em></p></li>\n<li><p><strong>Although + mệnh đề</strong> — <em>Although laws are necessary, they are insufficient alone.</em></p></li>\n</ul>\n<p><strong>Band 6–7 (trung cấp):</strong></p>\n<ul>\n<li><p><strong>Whereas + mệnh đề, + mệnh đề</strong> — <em>Whereas legislation creates compliance, education creates genuine commitment.</em></p></li>\n<li><p><strong>In spite of the fact that + mệnh đề</strong> — trang trọng hơn 'although', thường đặt đầu câu</p></li>\n<li><p><strong>Notwithstanding + danh từ</strong> — <em>Notwithstanding these limitations, the policy marks a significant step forward.</em></p></li>\n</ul>\n<p><strong>Band 7+ (nâng cao):</strong></p>\n<ul>\n<li><p><strong>Admittedly,... However,...</strong> — nhượng bộ rồi phản bác; thấy trong bài mẫu E1 và E3</p></li>\n<li><p><strong>While it is true that..., this does not mean that...</strong> — concession-rebuttal hoàn chỉnh trong một câu</p></li>\n<li><p><strong>That said, / That notwithstanding,</strong> — chuyển ý ngắn gọn sau khi nhường một điểm</p></li>\n</ul>\n<p><strong>Trong bài mẫu E2 (Band 8.0):</strong> Bài kết hợp <em>Despite</em> ở Body 1 và <em>Whereas</em> ở Body 2 để tạo variety — đây là cách làm của Band 8. Tránh dùng cùng một từ nối hai lần trong một bài.</p>",
    },
  ]);
  console.log("📒 Note Collections + Notes created:", nc1._id, nc2._id);

  // ── 10. FAVORITE ESSAY ────────────────────────────────────────────────────────

  await FavoriteEssayModel.insertMany([
    {
      userId: u2._id,
      essayId: e1._id,
      personalNote: "Bài này dùng 'entrenched' và 'legally binding' rất tự nhiên — xem lại Note 3 về emphatic reversal trong NC1. Nominalization 'the acceleration of biodiversity loss' là ví dụ hoàn hảo cho kỹ thuật L5.",
    },
    {
      userId: u2._id,
      essayId: e2._id,
      personalNote: "Cách dùng 'trade-off' trong Body 2 rất hay — 'eliminates the trade-off that currently protects corporate interests at public expense'. Dùng lại cấu trúc này trong bài S3 của mình.",
    },
  ]);
  console.log("⭐ Favorite Essays created (F1 + F2)");

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
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
