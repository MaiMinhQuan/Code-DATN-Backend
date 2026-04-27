const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const MONGODB_URI = "mongodb://localhost:27017/ielts-writing-db";
const SALT_ROUNDS = 10;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function countWords(text) {
  return text.trim().split(/\s+/).length;
}

const inDays = (n) => new Date(Date.now() + n * 86400000);

function ann(text, search, highlightType, explanation) {
  const startIndex = text.indexOf(search);
  if (startIndex === -1) return null;
  return { startIndex, endIndex: startIndex + search.length, highlightType, explanation };
}
function anns(text, ...defs) {
  return defs.map((d) => ann(text, ...d)).filter(Boolean);
}

// ─── Enums (mirrors backend src/common/enums/index.ts) ────────────────────────

const TargetBand = { BAND_5_0: "BAND_5_0", BAND_6_0: "BAND_6_0", BAND_7_PLUS: "BAND_7_PLUS" };
const UserRole = { STUDENT: "STUDENT", ADMIN: "ADMIN" };
const SubmissionStatus = { COMPLETED: "COMPLETED", DRAFT: "DRAFT" };
const ErrorCategory = {
  GRAMMAR: "GRAMMAR", VOCABULARY: "VOCABULARY", COHERENCE: "COHERENCE",
  TASK_RESPONSE: "TASK_RESPONSE", SPELLING: "SPELLING", PUNCTUATION: "PUNCTUATION",
};
const HighlightType = {
  VOCABULARY: "VOCABULARY", GRAMMAR: "GRAMMAR", STRUCTURE: "STRUCTURE", ARGUMENT: "ARGUMENT",
};

// ─── Models (strict:false — no validation needed in seed script) ──────────────

const mkSchema = () => new mongoose.Schema({}, { strict: false, timestamps: true });

const TopicModel        = mongoose.model("Topic",        mkSchema());
const UserModel         = mongoose.model("User",         mkSchema());
const ExamQuestionModel = mongoose.model("ExamQuestion", mkSchema());
const SampleEssayModel  = mongoose.model("SampleEssay",  mkSchema());
const CourseModel       = mongoose.model("Course",       mkSchema());
const LessonModel       = mongoose.model("Lesson",       mkSchema());
const FlashcardSetModel = mongoose.model("FlashcardSet", mkSchema());
const FlashcardModel    = mongoose.model("Flashcard",    mkSchema());
const NoteModel         = mongoose.model("NotebookNote", mkSchema());
const SubmissionModel   = mongoose.model("Submission",   mkSchema());

// ─── Main seed function ───────────────────────────────────────────────────────

async function seed() {
  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected\n");

  // ── 1. Topics ──────────────────────────────────────────────────────────────

  console.log("📁 Seeding Topics...");
  const topicRows = [
    { name: "Giáo dục",   description: "Hệ thống giáo dục, phương pháp học tập và vai trò của trường học.", orderIndex: 1 },
    { name: "Công nghệ",  description: "Tác động của công nghệ và internet đến cuộc sống hiện đại.",        orderIndex: 2 },
    { name: "Môi trường", description: "Biến đổi khí hậu, ô nhiễm và trách nhiệm bảo vệ môi trường.",      orderIndex: 3 },
    { name: "Sức khỏe",   description: "Chăm sóc sức khỏe, lối sống lành mạnh và hệ thống y tế.",          orderIndex: 4 },
    { name: "Xã hội",     description: "Các vấn đề xã hội, gia đình và lối sống hiện đại.",                 orderIndex: 5 },
    { name: "Kinh tế",    description: "Kinh tế toàn cầu, việc làm và bất bình đẳng thu nhập.",             orderIndex: 6 },
  ].map((t) => ({ ...t, slug: toSlug(t.name), isActive: true }));

  const topics = await TopicModel.insertMany(topicRows);
  const [tEdu, tTech, tEnv, tHealth, tSociety, tEconomy] = topics;
  console.log(`   ✓ ${topics.length} topics`);

  // ── 2. Users ───────────────────────────────────────────────────────────────

  console.log("👤 Seeding Users...");
  const hashAdmin   = await bcrypt.hash("123456",   SALT_ROUNDS);
  const hashStudent = await bcrypt.hash("123456", SALT_ROUNDS);

  const users = await UserModel.insertMany([
    { email: "admin@ielts.ai",    passwordHash: hashAdmin,   fullName: "Admin",        role: UserRole.ADMIN,   isActive: true },
    { email: "student@test.com",  passwordHash: hashStudent, fullName: "Nguyễn Văn A", role: UserRole.STUDENT, isActive: true },
    { email: "student2@test.com", passwordHash: hashStudent, fullName: "Trần Thị B",   role: UserRole.STUDENT, isActive: true },
  ]);
  const [, student1, student2] = users;
  console.log(`   ✓ ${users.length} users`);

  // ── 3. ExamQuestions ───────────────────────────────────────────────────────

  console.log("📝 Seeding ExamQuestions...");
  const questions = await ExamQuestionModel.insertMany([
    {
      title: "Đại học: Kỹ năng nghề nghiệp hay tri thức thuần túy?",
      topicId: tEdu._id,
      questionPrompt: "Some people think that universities should provide graduates with the knowledge and skills needed in the workplace. Others think that the true function of a university is to give access to knowledge for its own sake, regardless of whether the course is useful to an employer. Discuss both these views and give your own opinion.",
      suggestedOutline: "Intro: Introduce debate, state position\nBody 1: Arguments for workplace skills (job market, employer needs)\nBody 2: Arguments for knowledge for its own sake (research, intellectual growth)\nBody 3 (Opinion): Balance — universities should integrate both\nConclusion",
      difficultyLevel: 2, isPublished: true,
      tags: ["education", "university", "employment"],
    },
    {
      title: "Internet: Vấn đề và giải pháp",
      topicId: tTech._id,
      questionPrompt: "The internet has transformed the way information is shared and consumed, but it has also created problems that did not exist before. What are the most serious problems associated with the internet and what solutions can you suggest?",
      suggestedOutline: "Intro: Acknowledge transformation, mention problems\nBody 1: Problem 1 — Misinformation & fake news\nBody 2: Problem 2 — Cybercrime & privacy erosion\nBody 3: Solutions (digital literacy, regulation, personal security)\nConclusion",
      difficultyLevel: 3, isPublished: true,
      tags: ["technology", "internet", "problems", "solutions"],
    },
    {
      title: "Biến đổi khí hậu: Trách nhiệm cá nhân hay chính phủ?",
      topicId: tEnv._id,
      questionPrompt: "Some people believe that it is the responsibility of individuals to take action to prevent climate change. Others think it is the responsibility of governments and large companies. Discuss both views and give your own opinion.",
      suggestedOutline: "Intro\nBody 1: Individual responsibility (daily choices, consumer pressure)\nBody 2: Government & corporate responsibility (legislation, scale)\nOpinion: Shared responsibility, governments must lead\nConclusion",
      difficultyLevel: 3, isPublished: true,
      tags: ["environment", "climate change", "responsibility"],
    },
    {
      title: "Dân số già hóa: Vấn đề hay cơ hội?",
      topicId: tHealth._id,
      questionPrompt: "In many countries, people are living longer than ever before. Some people say an ageing population creates problems for governments. Other people think there are benefits if society has more elderly people. To what extent do the benefits outweigh the problems?",
      suggestedOutline: "Intro\nBody 1: Problems — healthcare costs, pension burden, shrinking workforce\nBody 2: Benefits — experience, volunteering, childcare support\nOpinion: Problems outweigh benefits in most cases\nConclusion",
      difficultyLevel: 2, isPublished: true,
      tags: ["health", "ageing", "society"],
    },
    {
      title: "Yếu tố ảnh hưởng đến sự phát triển của trẻ em",
      topicId: tSociety._id,
      questionPrompt: "Some people think the main factors influencing a child's development are things such as television, friends, and music. Others believe that the family still remains more important. Discuss both these views and give your own opinion.",
      suggestedOutline: "Intro\nBody 1: External influences (media, peers, music)\nBody 2: Family as primary foundation (values, emotional security)\nOpinion: Family is primary\nConclusion",
      difficultyLevel: 2, isPublished: true,
      tags: ["society", "children", "family", "development"],
    },
    {
      title: "AI trong việc ra quyết định",
      topicId: tTech._id,
      questionPrompt: "Artificial intelligence is increasingly being used to make important decisions. Some people believe that artificial intelligence can never be as good as humans at making these decisions. To what extent do you agree or disagree?",
      suggestedOutline: "Intro: Partial agreement\nBody 1: Where AI outperforms humans (data, speed)\nBody 2: Where human judgment is irreplaceable (ethics, empathy)\nConclusion: AI as support tool",
      difficultyLevel: 4, isPublished: true,
      tags: ["technology", "AI", "decision-making"],
    },
    {
      title: "Bất bình đẳng thu nhập: Công bằng hay động lực?",
      topicId: tEconomy._id,
      questionPrompt: "Some people think that a huge difference in pay between jobs is unfair. Others think that having high pay for the best jobs encourages everyone to work harder and brings benefits to the economy. Discuss both views and give your own opinion.",
      suggestedOutline: "Intro\nBody 1: Pay inequality is unfair\nBody 2: High pay motivates and drives growth\nOpinion\nConclusion",
      difficultyLevel: 3, isPublished: true,
      tags: ["economy", "income", "inequality"],
    },
    {
      title: "Trẻ em nên bắt đầu đi học từ bao giờ?",
      topicId: tEdu._id,
      questionPrompt: "Some people believe children should begin their formal education at a very early age. Others think children should not start school until they are older. Discuss both views and give your own opinion.",
      suggestedOutline: "Intro\nBody 1: Benefits of early education\nBody 2: Benefits of starting later\nOpinion\nConclusion",
      difficultyLevel: 1, isPublished: true,
      tags: ["education", "children", "early learning"],
    },
    {
      title: "Du lịch quốc tế và sự lây lan dịch bệnh",
      topicId: tEnv._id,
      questionPrompt: "With increasing global travel, it is now possible to spread diseases more quickly around the world. Some people think that international travel should be restricted. To what extent do you agree or disagree?",
      suggestedOutline: "Intro: Partial disagreement\nBody 1: Reasons to restrict (disease speed)\nBody 2: Reasons against restriction (economic, health monitoring)\nConclusion",
      difficultyLevel: 4, isPublished: true,
      tags: ["travel", "health", "globalisation"],
    },
    {
      title: "Xu hướng sống một mình: Tích cực hay tiêu cực?",
      topicId: tSociety._id,
      questionPrompt: "In some countries, the number of people choosing to live alone has increased significantly in recent years. Do you think this is a positive or negative development?",
      suggestedOutline: "Intro: Mixed development\nBody 1: Positive — independence, personal growth\nBody 2: Negative — loneliness, social fragmentation\nOpinion + Conclusion",
      difficultyLevel: 3, isPublished: true,
      tags: ["society", "lifestyle", "independence"],
    },
  ]);
  const [q1, q2, q3] = questions;
  console.log(`   ✓ ${questions.length} questions`);

  // ── 4. SampleEssays ────────────────────────────────────────────────────────

  console.log("📄 Seeding SampleEssays...");

  const se1 = `The debate over whether universities should prioritise vocational training or intellectual development has intensified in recent years. While both perspectives have considerable merit, I believe the most effective approach involves integrating workplace preparation with broader academic learning.

Those who advocate for practical education argue that the primary purpose of higher education is to equip students with marketable skills. In today's competitive job market, graduates face significant pressure to demonstrate immediate value to employers. Fields such as engineering, medicine and computer science illustrate how specialised technical training can translate directly into economic productivity. Furthermore, students who invest substantial time and money in university expect a tangible return on their investment in the form of career opportunities.

Conversely, supporters of knowledge for its own sake contend that universities serve a uniquely important societal role as centres of intellectual inquiry. History demonstrates that many transformative discoveries — from the theory of relativity to the structure of DNA — emerged from curiosity-driven research with no immediate practical application. Moreover, a purely vocational approach risks producing graduates who are technically competent but lack the critical thinking skills necessary to adapt in an ever-changing world.

In my view, the dichotomy between these positions is somewhat artificial. The most capable graduates typically possess both domain expertise and the intellectual flexibility that comes from broad-based learning. Universities should therefore design curricula that develop professional competencies alongside analytical reasoning, communication skills and ethical awareness.

In conclusion, while equipping students for the workplace is undeniably important, universities must preserve their commitment to developing well-rounded, intellectually curious graduates. These two goals are complementary rather than competing.`;

  const se2 = `The internet has undoubtedly transformed modern life, offering unprecedented access to information and communication. However, it has also given rise to serious social and technological problems that require urgent attention.

One of the most concerning issues is the rapid spread of misinformation. False news and conspiracy theories can travel across social media platforms within minutes, potentially influencing public opinion and even election outcomes. The COVID-19 pandemic demonstrated how health misinformation could cost lives when people followed unproven treatments promoted online.

Another significant problem is cybercrime and the erosion of privacy. As more personal and financial data is stored online, individuals become vulnerable to hacking, identity theft and fraud. Large-scale data breaches have affected millions of users worldwide, undermining trust in digital systems.

To address these issues, governments and technology companies must work together. Firstly, digital literacy programmes should be integrated into school curricula to teach young people how to evaluate online sources critically. Secondly, stricter regulations requiring social media platforms to remove harmful content more rapidly should be introduced. Finally, individuals should adopt stronger personal security practices, such as using complex passwords and two-factor authentication.

In conclusion, while the internet offers enormous benefits, its most serious problems — misinformation and cybercrime — pose genuine threats to society. A combination of education, regulation and personal responsibility offers the most effective path forward.`;

  const se3 = `Climate change represents one of the most pressing challenges of our era, and determining who bears primary responsibility for addressing it has become a source of significant debate. While individual actions certainly play a role, I would argue that systemic change driven by governments and corporations is ultimately more decisive.

Those who emphasise individual responsibility point to the cumulative impact of daily choices. By reducing meat consumption, minimising air travel and switching to renewable energy sources, ordinary citizens can collectively reduce carbon emissions. Environmental campaigns have demonstrated that consumer pressure can drive corporate behaviour change, illustrating the power of individual agency.

Nevertheless, the scale of the climate crisis demands interventions that far exceed what individuals can achieve alone. Governments possess the unique authority to implement binding legislation, carbon taxes and international agreements such as the Paris Accord. Similarly, large corporations are responsible for a disproportionate share of global emissions; a relatively small number of fossil fuel companies have contributed to over 70% of industrial greenhouse gas emissions. Meaningful change requires these entities to fundamentally restructure their operations.

In my opinion, the most effective response to climate change requires action at all levels simultaneously. Governments must create the regulatory framework and financial incentives that make sustainable choices accessible and affordable for ordinary people. At the same time, individual behavioural change helps to build the social and political will necessary for governments to act boldly.

In conclusion, while personal responsibility is valuable, the systemic nature of climate change means that governmental and corporate action is indispensable. A coordinated multilevel approach offers the greatest hope for meaningful progress.`;

  const se4 = `In many countries around the world, the population is getting older because people are living longer than before. This situation creates both problems and benefits for society, but I think the problems are more serious.

The main problems of an ageing population are related to healthcare and the economy. Older people need more medical care, which means governments have to spend more money on hospitals and doctors. Also, when there are more retired people and fewer young workers, it becomes difficult to pay for pension systems. Some countries like Japan and Germany are already experiencing these challenges.

On the other hand, there are some benefits of having more elderly people in society. Older people often have a lot of experience and wisdom that can be useful. Many retired people do volunteer work in their communities, which helps society. They also help to take care of grandchildren, which allows parents to continue working.

However, I believe that the problems caused by an ageing population are more serious than the benefits. The economic pressure on healthcare and pension systems is very significant, and it is difficult to solve these problems quickly. Young workers may have to pay higher taxes to support older generations, which could cause social tension.

In conclusion, although elderly people contribute to society in many ways, the challenges created by an ageing population are serious and require governments to plan carefully for the future.`;

  const se5 = `Child development is influenced by a complex interplay of factors, both within and outside the family unit. While external influences such as television, peer groups and popular music are undeniably powerful in shaping young minds, I believe that family remains the most fundamental influence on a child's character and values.

Television and digital media expose children to a wide range of values, lifestyles and behaviours. Research suggests that children who consume excessive screen time may develop shorter attention spans and more passive learning habits. Similarly, peer groups become increasingly influential during adolescence, when children begin to identify more strongly with their peers than with their parents.

Despite these external pressures, the family provides the foundational framework within which children interpret and respond to the outside world. Parents serve as primary role models, and the emotional security of a stable home environment has been shown to be one of the strongest predictors of healthy psychological development. Cultural values, moral principles and communication skills are largely transmitted through family interaction during the critical early years.

In my opinion, while television, friends and music can significantly influence a child's interests and social attitudes, the family's influence is deeper and more enduring. Children who grow up in supportive family environments are generally better equipped to navigate external pressures constructively.

In conclusion, both family and external factors shape child development, but the family's role as the primary provider of emotional security and core values remains paramount.`;

  const se6 = `The increasing deployment of artificial intelligence in high-stakes decision-making has provoked considerable debate about the relative capabilities of machines and humans. While I acknowledge that AI demonstrates remarkable proficiency in certain domains, I largely agree that human judgment retains indispensable qualities that AI cannot fully replicate.

AI systems undoubtedly excel in tasks that require processing vast quantities of data with speed and consistency. In medical diagnostics, for instance, AI algorithms have demonstrated the ability to detect cancerous cells in imaging scans with accuracy comparable to, and sometimes exceeding, that of experienced radiologists. In financial markets, algorithmic trading systems can analyse thousands of variables simultaneously and execute decisions far faster than any human trader.

Nevertheless, truly important decisions often involve dimensions that current AI systems are poorly equipped to handle. Questions of ethics, compassion and cultural sensitivity require a depth of contextual understanding that AI, however sophisticated, has yet to achieve. A judge sentencing a criminal, for example, must weigh not only legal precedents but also the unique human circumstances of the individual — a task demanding empathy and moral reasoning far beyond pattern recognition.

In my opinion, the most effective approach involves deploying AI as a decision-support tool rather than as an autonomous decision-maker. By combining AI's computational power with human wisdom and ethical judgment, organisations can achieve outcomes superior to either alone.

In conclusion, while AI has proven its value in specific, well-defined tasks, the complexity and ethical dimensions of truly important decisions mean that human oversight remains essential.`;

  await SampleEssayModel.insertMany([
    {
      title: "Bài mẫu Band 7: Đại học và kỹ năng nghề nghiệp",
      topicId: tEdu._id,
      questionPrompt: questions[0].questionPrompt,
      targetBand: TargetBand.BAND_7_PLUS,
      overallBandScore: 7.0,
      authorName: "IELTS Writing AI",
      isPublished: true,
      viewCount: 142, favoriteCount: 28,
      outlineContent: "Para 1: Introduce debate → thesis: balance is needed\nPara 2: Workplace skills argument + examples\nPara 3: Knowledge for its own sake — historical precedent\nPara 4 (Opinion): Both goals complementary\nPara 5: Conclusion",
      fullEssayContent: se1,
      highlightAnnotations: anns(se1,
        ["intensified in recent years",              HighlightType.VOCABULARY, "'intensified' — học thuật và cụ thể hơn 'become more popular' hay 'increased'"],
        ["Conversely, supporters of knowledge",      HighlightType.STRUCTURE,  "'Conversely' mở đầu đoạn phản luận — cohesive device hiệu quả để chuyển quan điểm"],
        ["the dichotomy between these positions is somewhat artificial", HighlightType.ARGUMENT, "Bác bỏ false dichotomy — kỹ thuật lập luận nâng cao, đặc trưng Band 7+"],
        ["domain expertise and the intellectual flexibility", HighlightType.VOCABULARY, "Nominalization 'expertise' và 'flexibility' — từ vựng học thuật chính xác Band 7+"],
        ["complementary rather than competing",      HighlightType.STRUCTURE,  "Parallel adjective structure ở câu kết — gọn, mạnh, để lại ấn tượng tốt với giám khảo"],
      ),
    },
    {
      title: "Bài mẫu Band 6: Internet và các vấn đề xã hội",
      topicId: tTech._id,
      questionPrompt: questions[1].questionPrompt,
      targetBand: TargetBand.BAND_6_0,
      overallBandScore: 6.0,
      authorName: "IELTS Writing AI",
      isPublished: true,
      viewCount: 98, favoriteCount: 15,
      outlineContent: "Para 1: Internet changed everything, but created problems\nPara 2: Problem 1 — Misinformation (COVID example)\nPara 3: Problem 2 — Cybercrime and privacy\nPara 4: Solutions (digital literacy, regulation, personal security)\nPara 5: Conclusion",
      fullEssayContent: se2,
      highlightAnnotations: anns(se2,
        ["the rapid spread of misinformation",       HighlightType.VOCABULARY, "'rapid spread of misinformation' — cụm danh từ học thuật, cách dùng đặc trưng Band 6"],
        ["Large-scale data breaches have affected millions", HighlightType.GRAMMAR, "Passive voice 'have affected' — đúng ngữ cảnh, không cần nêu chủ thể cụ thể"],
        ["To address these issues",                  HighlightType.STRUCTURE,  "'To address these issues' — cohesive opener chuyển sang đoạn giải pháp rất hiệu quả"],
        ["A combination of education, regulation and personal responsibility", HighlightType.ARGUMENT, "Kết luận liệt kê 3 yếu tố song song (tricolon) — tóm tắt lập luận gọn và thuyết phục"],
      ),
    },
    {
      title: "Bài mẫu Band 7.5: Trách nhiệm về biến đổi khí hậu",
      topicId: tEnv._id,
      questionPrompt: questions[2].questionPrompt,
      targetBand: TargetBand.BAND_7_PLUS,
      overallBandScore: 7.5,
      authorName: "IELTS Writing AI",
      isPublished: true,
      viewCount: 215, favoriteCount: 47,
      outlineContent: "Para 1: Both have roles — governments more decisive\nPara 2: Individual actions (daily choices, consumer pressure)\nPara 3: Governments & corporations must lead (Paris Accord, 70% statistic)\nPara 4: Multilevel approach\nPara 5: Conclusion",
      fullEssayContent: se3,
      highlightAnnotations: anns(se3,
        ["Climate change represents one of the most pressing challenges of our era", HighlightType.STRUCTURE, "Câu mở đầu nêu tầm quan trọng của vấn đề trước khi vào luận điểm — kỹ thuật đặc trưng Band 7+"],
        ["the cumulative impact of daily choices",   HighlightType.ARGUMENT,   "'cumulative impact' — lập luận rằng hành động nhỏ cộng dồn tạo hiệu ứng lớn; từ 'cumulative' nâng band"],
        ["a relatively small number of fossil fuel companies have contributed to over 70%", HighlightType.ARGUMENT, "Số liệu thống kê cụ thể 70% — bằng chứng thuyết phục nhất trong bài, dấu hiệu Band 7+"],
        ["the regulatory framework and financial incentives", HighlightType.VOCABULARY, "Colocation 'regulatory framework' + 'financial incentives' — từ vựng chính sách học thuật chuẩn"],
        ["A coordinated multilevel approach",        HighlightType.STRUCTURE,  "'Coordinated multilevel approach' — tóm tắt thesis bằng cụm danh từ học thuật thay vì lặp từ ngữ cũ"],
      ),
    },
    {
      title: "Bài mẫu Band 5.5: Dân số già hóa",
      topicId: tHealth._id,
      questionPrompt: questions[3].questionPrompt,
      targetBand: TargetBand.BAND_5_0,
      overallBandScore: 5.5,
      authorName: "IELTS Writing AI",
      isPublished: true,
      viewCount: 67, favoriteCount: 9,
      outlineContent: "Para 1: Introduction — ageing creates problems and benefits\nPara 2: Problems — healthcare costs, pension burden\nPara 3: Benefits — experience, volunteering, childcare\nPara 4: Opinion — problems are more serious\nPara 5: Conclusion",
      fullEssayContent: se4,
      highlightAnnotations: anns(se4,
        ["the population is getting older",          HighlightType.VOCABULARY, "⚠ 'getting older' — không học thuật. Nên dùng 'the population is ageing' (Band 6+)"],
        ["I think the problems are more serious",    HighlightType.STRUCTURE,  "⚠ 'I think' trong Introduction quá thông thường. Band 6+ nên dùng 'I would argue that' hoặc 'In my view'"],
        ["a lot of experience and wisdom",           HighlightType.VOCABULARY, "⚠ 'a lot of' — quá informal. Thay bằng 'considerable experience and wisdom' để tăng band"],
        ["very significant",                         HighlightType.VOCABULARY, "⚠ 'very significant' — tránh 'very' trong văn học thuật. Dùng 'highly significant' hoặc 'substantial'"],
        ["require governments to plan carefully for the future", HighlightType.STRUCTURE, "⚠ Câu kết thiếu tầm khái quát. Band 6+ nên có một broad statement hoặc call-to-action mạnh hơn"],
      ),
    },
    {
      title: "Bài mẫu Band 6.5: Ảnh hưởng đến sự phát triển của trẻ",
      topicId: tSociety._id,
      questionPrompt: questions[4].questionPrompt,
      targetBand: TargetBand.BAND_6_0,
      overallBandScore: 6.5,
      authorName: "IELTS Writing AI",
      isPublished: true,
      viewCount: 83, favoriteCount: 19,
      outlineContent: "Para 1: Both external and family influence — family is primary\nPara 2: External influences (media, peers, music)\nPara 3: Family as foundational framework\nPara 4: Opinion — family primary but external increasingly significant\nPara 5: Conclusion",
      fullEssayContent: se5,
      highlightAnnotations: anns(se5,
        ["a complex interplay of factors",           HighlightType.VOCABULARY, "'complex interplay of factors' — cụm danh từ phức hợp, cách dùng đặc trưng Band 6+"],
        ["the foundational framework",               HighlightType.VOCABULARY, "'foundational framework' — nominalization nâng văn phong, học thuật hơn 'basic structure'"],
        ["primary role models",                      HighlightType.VOCABULARY, "'primary role models' — 'primary' chính xác hơn 'main'; collocation chuẩn trong văn học thuật"],
        ["during the critical early years",          HighlightType.VOCABULARY, "'critical early years' — 'critical' mạnh hơn 'important'; nhấn mạnh tầm quan trọng giai đoạn đầu đời"],
        ["the family's role as the primary provider of emotional security", HighlightType.STRUCTURE, "Câu kết luận nêu rõ vai trò cụ thể — topic sentence style hiệu quả để đóng bài"],
      ),
    },
    {
      title: "Bài mẫu Band 7: AI và việc ra quyết định",
      topicId: tTech._id,
      questionPrompt: questions[5].questionPrompt,
      targetBand: TargetBand.BAND_7_PLUS,
      overallBandScore: 7.0,
      authorName: "IELTS Writing AI",
      isPublished: true,
      viewCount: 178, favoriteCount: 52,
      outlineContent: "Para 1: AI impressive but human judgment indispensable\nPara 2: AI advantages (data, speed, medical diagnostics)\nPara 3: Human superiority (ethics, empathy, judge example)\nPara 4: AI as support tool\nPara 5: Conclusion",
      fullEssayContent: se6,
      highlightAnnotations: anns(se6,
        ["The increasing deployment of artificial intelligence", HighlightType.VOCABULARY, "Nominalization 'deployment' thay vì 'use of AI' — từ vựng kỹ thuật học thuật đặc trưng Band 7"],
        ["remarkable proficiency in certain domains", HighlightType.VOCABULARY, "'remarkable proficiency' + 'domains' — colocation học thuật chính xác, không dùng 'very good at'"],
        ["accuracy comparable to, and sometimes exceeding, that of experienced radiologists", HighlightType.GRAMMAR, "Non-restrictive clause lồng nhau '...and sometimes exceeding...' — cấu trúc ngữ pháp phức tạp Band 7+"],
        ["empathy and moral reasoning far beyond pattern recognition", HighlightType.ARGUMENT, "Đối lập trực tiếp 'empathy/moral reasoning' với 'pattern recognition' — lập luận về giới hạn của AI sắc bén"],
        ["decision-support tool rather than as an autonomous decision-maker", HighlightType.STRUCTURE, "Cặp đối lập 'support tool vs autonomous decision-maker' trong luận điểm chính — rõ ràng và thuyết phục"],
      ),
    },
  ]);
  console.log(`   ✓ 6 sample essays`);

  // ── 5. Courses ─────────────────────────────────────────────────────────────

  console.log("📚 Seeding Courses...");
  const courses = await CourseModel.insertMany([
    {
      title: "Nền tảng IELTS Writing Task 2 — Band 5",
      description: "Khóa học dành cho người mới bắt đầu. Xây dựng nền tảng vững chắc về cấu trúc bài luận và từ vựng cơ bản.",
      // Course.topicId là embedded object (không phải ObjectId ref)
      topicId: { _id: tEdu._id, name: tEdu.name, slug: tEdu.slug },
      orderIndex: 1, isPublished: true, isActive: true, totalLessons: 3,
      instructorName: "Nguyễn Minh Tuấn",
    },
    {
      title: "IELTS Writing Task 2 Nâng Cao — Band 6",
      description: "Nâng cao khả năng lập luận, từ vựng học thuật và ngữ pháp phức tạp để đạt Band 6.",
      topicId: { _id: tTech._id, name: tTech.name, slug: tTech.slug },
      orderIndex: 2, isPublished: true, isActive: true, totalLessons: 3,
      instructorName: "Trần Hương Giang",
    },
    {
      title: "Viết Luận Học Thuật — Band 7+",
      description: "Chương trình chuyên sâu chinh phục Band 7+, tập trung tính mạch lạc và chiều sâu lập luận.",
      topicId: { _id: tEnv._id, name: tEnv.name, slug: tEnv.slug },
      orderIndex: 3, isPublished: true, isActive: true, totalLessons: 3,
      instructorName: "Lê Thành Đạt",
    },
  ]);
  const [c1, c2, c3] = courses;
  console.log(`   ✓ ${courses.length} courses`);

  // ── 6. Lessons ─────────────────────────────────────────────────────────────

  console.log("🎓 Seeding Lessons...");
  await LessonModel.insertMany([
    // ── Course 1 — Band 5 ──────────────────────────────────────────────────
    {
      title: "Hiểu đề bài và lập dàn ý cơ bản",
      courseId: c1._id, targetBand: TargetBand.BAND_5_0, orderIndex: 1, isPublished: true,
      description: "Học cách phân tích đề bài IELTS Task 2 và tạo dàn ý 5 đoạn chuẩn.",
      videos: [{ title: "Phân tích cấu trúc đề bài", videoUrl: "https://example.com/l1.mp4", duration: 840 }],
      vocabularies: [
        { word: "furthermore", definition: "In addition; besides",           examples: ["Furthermore, this policy has clear economic benefits."], translation: "hơn nữa" },
        { word: "however",     definition: "In contrast; on the other hand", examples: ["However, not everyone agrees with this view."],          translation: "tuy nhiên" },
        { word: "therefore",   definition: "For that reason; consequently",  examples: ["Therefore, governments must take urgent action."],        translation: "do đó" },
      ],
      grammars: [
        { title: "Topic Sentence", explanation: "Mỗi đoạn thân bài cần câu chủ đề nêu ý chính.", examples: ["Education plays a crucial role in economic development."], structure: "[Main idea] + [link to thesis]" },
      ],
      notesContent: "Cấu trúc 5 đoạn: Intro → Body 1 → Body 2 → (Body 3) → Conclusion\nMỗi body: topic sentence + explanation + example + mini-conclusion",
    },
    {
      title: "Viết đoạn mở bài và kết bài",
      courseId: c1._id, targetBand: TargetBand.BAND_5_0, orderIndex: 2, isPublished: true,
      description: "Các mẫu câu thông dụng để viết introduction và conclusion gây ấn tượng.",
      videos: [{ title: "Mẫu mở bài phổ biến", videoUrl: "https://example.com/l2.mp4", duration: 720 }],
      vocabularies: [
        { word: "controversial", definition: "Causing disagreement or debate", examples: ["This is a controversial issue in modern society."], translation: "gây tranh cãi" },
        { word: "significance",  definition: "Importance; meaning",           examples: ["The significance of education cannot be overstated."],  translation: "tầm quan trọng" },
      ],
      grammars: [
        { title: "Paraphrase đề bài trong Introduction", explanation: "Diễn đạt lại đề bài bằng từ đồng nghĩa — không chép nguyên văn.", examples: ["Q: 'Discuss both views' → Essay: 'This essay will examine both perspectives before presenting a personal view.'"], structure: "Paraphrase + Thesis statement" },
      ],
      notesContent: "Intro template: [General statement] + [Paraphrase question] + [Thesis]\nConclusion template: [Restate thesis] + [Summary] + [Final thought]",
    },
    {
      title: "Cách đưa ví dụ và lập luận",
      courseId: c1._id, targetBand: TargetBand.BAND_5_0, orderIndex: 3, isPublished: true,
      description: "Kỹ thuật hỗ trợ luận điểm bằng ví dụ cụ thể theo cấu trúc PEEL.",
      videos: [{ title: "Xây dựng lập luận PEEL", videoUrl: "https://example.com/l3.mp4", duration: 960 }],
      vocabularies: [
        { word: "illustrate", definition: "To explain using examples",        examples: ["This example illustrates the main point clearly."],               translation: "minh họa" },
        { word: "evidence",   definition: "Facts that help prove something",  examples: ["There is growing evidence that exercise improves mental health."], translation: "bằng chứng" },
      ],
      grammars: [
        { title: "For instance / For example", explanation: "Dùng để đưa ví dụ minh họa trong thân bài.", examples: ["For instance, studies show bilingual children perform better academically.", "For example, Japan's ageing population has strained its pension system."], structure: "For instance/example, [specific supporting example]." },
      ],
      notesContent: "PEEL: Point → Explain → Evidence/Example → Link back to topic sentence",
    },

    // ── Course 2 — Band 6 ──────────────────────────────────────────────────
    {
      title: "Từ vựng học thuật AWL cho Band 6",
      courseId: c2._id, targetBand: TargetBand.BAND_6_0, orderIndex: 1, isPublished: true,
      description: "Mở rộng vốn từ vựng Academic Word List cần thiết để đạt Band 6.",
      videos: [{ title: "Academic Word List Top 50", videoUrl: "https://example.com/l4.mp4", duration: 1200 }],
      vocabularies: [
        { word: "albeit",       definition: "Although; even though",               examples: ["The policy was successful, albeit controversial."],              translation: "mặc dù" },
        { word: "consequently", definition: "As a result; therefore",              examples: ["Consequently, many families struggle financially."],             translation: "do đó, vì vậy" },
        { word: "nonetheless",  definition: "In spite of what has just been said", examples: ["Nonetheless, there are compelling reasons to support this."],  translation: "tuy nhiên, dù vậy" },
        { word: "prevalent",    definition: "Widespread; common",                  examples: ["Obesity has become increasingly prevalent in developed nations."], translation: "phổ biến" },
      ],
      grammars: [
        { title: "Relative Clauses (Defining & Non-defining)", explanation: "Mệnh đề quan hệ giúp cung cấp thêm thông tin về danh từ.", examples: ["Countries that invest in education have stronger economies.", "Japan, which has one of the world's oldest populations, faces pension challenges."], structure: "Noun + who/which/that + verb..." },
      ],
      notesContent: "Band 6 vocabulary goal: Use a range of vocabulary including less common words with awareness of collocation.",
    },
    {
      title: "Chiến lược dạng Discuss Both Views",
      courseId: c2._id, targetBand: TargetBand.BAND_6_0, orderIndex: 2, isPublished: true,
      description: "Cách trả lời hiệu quả câu hỏi 'Discuss both views and give your own opinion'.",
      videos: [{ title: "Phân tích Discuss Both Views", videoUrl: "https://example.com/l5.mp4", duration: 1080 }],
      vocabularies: [
        { word: "proponent",       definition: "A person who supports something",       examples: ["Proponents of renewable energy argue it reduces emissions."],    translation: "người ủng hộ" },
        { word: "counterargument", definition: "An argument against another argument",  examples: ["A strong counterargument is that growth creates jobs."],          translation: "phản lập luận" },
        { word: "advocate",        definition: "To publicly support a cause or policy", examples: ["Many economists advocate for free trade policies."],              translation: "ủng hộ, vận động" },
      ],
      grammars: [
        { title: "Cấu trúc nhượng bộ (Concession)", explanation: "Thừa nhận quan điểm đối lập trước khi bác bỏ.", examples: ["While it is true that technology improves productivity, it has also created new problems.", "Although stricter laws may help, education is more effective."], structure: "While/Although [concession], [your main point]." },
      ],
      notesContent: "Structure: Intro → Body 1 (View A) → Body 2 (View B) → Body 3 (Your opinion + reasoning) → Conclusion",
    },
    {
      title: "Mạch lạc và liên kết (Coherence & Cohesion)",
      courseId: c2._id, targetBand: TargetBand.BAND_6_0, orderIndex: 3, isPublished: true,
      description: "Sử dụng linking words và cohesive devices để tạo bài viết mạch lạc.",
      videos: [{ title: "Linking Words Masterclass", videoUrl: "https://example.com/l6.mp4", duration: 900 }],
      vocabularies: [
        { word: "moreover",     definition: "In addition to what has been said",      examples: ["Moreover, studies indicate the trend is accelerating."],      translation: "hơn nữa, ngoài ra" },
        { word: "conversely",   definition: "Introducing a contrasting statement",    examples: ["Conversely, others argue regulation stifles innovation."],    translation: "ngược lại" },
        { word: "subsequently", definition: "After a particular thing has happened",  examples: ["The company subsequently announced significant job cuts."],    translation: "sau đó" },
      ],
      grammars: [
        { title: "Reference Words (this, these, such)", explanation: "Dùng từ tham chiếu để kết nối câu và tránh lặp từ.", examples: ["Education is vital for growth. This investment pays long-term dividends.", "Several studies have confirmed these findings."], structure: "this/these/such + [noun] → refers back to previously mentioned idea" },
      ],
      notesContent: "Coherence checklist:\n✓ Clear topic sentence\n✓ Logical idea progression\n✓ Appropriate linkers\n✓ Reference words used correctly",
    },

    // ── Course 3 — Band 7+ ─────────────────────────────────────────────────
    {
      title: "Tư duy phân tích và lập luận nâng cao",
      courseId: c3._id, targetBand: TargetBand.BAND_7_PLUS, orderIndex: 1, isPublished: true,
      description: "Phát triển tư duy phản biện và khả năng xây dựng lập luận nhiều tầng lớp.",
      videos: [{ title: "Critical Thinking for Band 7+", videoUrl: "https://example.com/l7.mp4", duration: 1380 }],
      vocabularies: [
        { word: "nuanced",      definition: "Having subtle distinctions",    examples: ["A nuanced understanding is essential for Band 7+."],      translation: "tinh tế, nhiều sắc thái" },
        { word: "multifaceted", definition: "Having many aspects or sides",  examples: ["Climate change is a multifaceted problem."],              translation: "đa chiều, nhiều mặt" },
        { word: "dichotomy",    definition: "A division into two contrasts", examples: ["The dichotomy between tradition and modernity is clear."], translation: "sự phân đôi, mâu thuẫn" },
      ],
      grammars: [
        { title: "Inversion for Emphasis", explanation: "Đảo ngữ trong văn viết học thuật để nhấn mạnh.", examples: ["Not only does education improve prospects, but it also develops critical thinking.", "Rarely have governments been so willing to invest in green energy."], structure: "Not only + auxiliary + subject + verb, but also..." },
      ],
      notesContent: "Band 7+ criteria:\n✓ Ideas well-developed and relevant\n✓ Skillful paragraphing\n✓ Wide vocabulary used flexibly\n✓ Full grammar range used accurately",
    },
    {
      title: "Từ vựng nâng cao và văn phong học thuật",
      courseId: c3._id, targetBand: TargetBand.BAND_7_PLUS, orderIndex: 2, isPublished: true,
      description: "Sử dụng từ vựng phức tạp và cấu trúc văn phong học thuật chuyên nghiệp.",
      videos: [{ title: "Advanced Academic Style", videoUrl: "https://example.com/l8.mp4", duration: 1140 }],
      vocabularies: [
        { word: "exacerbate", definition: "To make a problem worse",           examples: ["Poverty exacerbates social inequality."],                   translation: "làm trầm trọng thêm" },
        { word: "mitigate",   definition: "To make less severe",               examples: ["Governments must mitigate the effects of climate change."], translation: "giảm thiểu" },
        { word: "ubiquitous", definition: "Present everywhere",                examples: ["Smartphones have become ubiquitous in modern society."],    translation: "phổ biến khắp nơi" },
        { word: "paramount",  definition: "More important than anything else", examples: ["Environmental protection must be of paramount concern."],   translation: "tối quan trọng" },
      ],
      grammars: [
        { title: "Nominalization (Danh hóa)", explanation: "Biến động từ/tính từ thành danh từ để tạo văn phong trang trọng.", examples: ["Investigate → Investigation: The investigation revealed significant flaws.", "Develop → Development: Economic development must balance sustainability."], structure: "Verb/Adj → Noun (-tion, -ment, -ness, -ity)" },
      ],
      notesContent: "Avoid: very, a lot, get, big, bad, good\nUse: considerably, significantly, obtain, substantial, detrimental, beneficial",
    },
    {
      title: "Chiến lược làm bài thi trong 40 phút",
      courseId: c3._id, targetBand: TargetBand.BAND_7_PLUS, orderIndex: 3, isPublished: true,
      description: "Quản lý thời gian và chiến lược hoàn thành bài thi Band 7+ trong 40 phút.",
      videos: [{ title: "40-Minute Writing Strategy", videoUrl: "https://example.com/l9.mp4", duration: 1260 }],
      vocabularies: [
        { word: "succinctly", definition: "Briefly and clearly expressed", examples: ["State your thesis succinctly in the introduction."], translation: "ngắn gọn, súc tích" },
        { word: "discern",    definition: "To recognise or find out",      examples: ["Examiners can easily discern template phrases."],    translation: "nhận ra, phân biệt" },
      ],
      grammars: [
        { title: "Formal Conditional (Inversion)", explanation: "Câu điều kiện trang trọng bằng đảo ngữ — dấu hiệu Band 7+.", examples: ["Were governments to implement stricter regulations, emissions would fall significantly.", "Had more resources been invested in education, youth unemployment would be far lower."], structure: "Were + subject + to + inf, + [result clause]" },
      ],
      notesContent: "40-min plan:\n5min  — Analyse question & outline\n30min — Write (Intro 3 | Body×2-3: 8 each | Conclusion 3)\n5min  — Review grammar & spelling",
    },
  ]);
  console.log(`   ✓ 9 lessons`);

  // ── 7. FlashcardSets + Flashcards ──────────────────────────────────────────

  console.log("🗂️  Seeding FlashcardSets & Flashcards...");
  const sets = await FlashcardSetModel.insertMany([
    { userId: student1._id, title: "Từ vựng học thuật IELTS — Bộ 1", description: "Các từ vựng học thuật cơ bản thường gặp trong IELTS Writing Task 2." },
    { userId: student1._id, title: "Linking Words & Connectives",     description: "Từ nối và liên từ giúp bài viết mạch lạc hơn." },
    { userId: student2._id, title: "Chủ đề Môi trường",               description: "Từ vựng chuyên đề Environment cho IELTS Writing." },
  ]);
  const [set1, set2, set3] = sets;

  await FlashcardModel.insertMany([
    // ── Set 1 — Academic vocabulary ──
    { setId: set1._id, frontContent: "exacerbate",    backContent: "Nghĩa: làm trầm trọng thêm\nVí dụ: Poverty exacerbates social inequality.\nTừ loại: verb (transitive)",               reviewCount: 3, nextReviewDate: inDays(2) },
    { setId: set1._id, frontContent: "mitigate",      backContent: "Nghĩa: giảm thiểu\nVí dụ: Renewable energy can mitigate climate change.\nTừ loại: verb (transitive)",                reviewCount: 5, nextReviewDate: inDays(5) },
    { setId: set1._id, frontContent: "prevalent",     backContent: "Nghĩa: phổ biến\nVí dụ: Obesity is increasingly prevalent in urban areas.\nTừ loại: adjective",                       reviewCount: 2, nextReviewDate: inDays(1) },
    { setId: set1._id, frontContent: "detrimental",   backContent: "Nghĩa: có hại, bất lợi\nVí dụ: Excessive screen time is detrimental to children's health.\nAntonym: beneficial",      reviewCount: 0 },
    { setId: set1._id, frontContent: "paramount",     backContent: "Nghĩa: tối quan trọng\nVí dụ: Safety is of paramount importance.\nSynonym: supreme, foremost",                        reviewCount: 1, nextReviewDate: inDays(3) },
    { setId: set1._id, frontContent: "ubiquitous",    backContent: "Nghĩa: phổ biến khắp nơi\nVí dụ: Smartphones have become ubiquitous in modern society.\nTừ loại: adjective",          reviewCount: 4, nextReviewDate: inDays(7) },
    { setId: set1._id, frontContent: "indispensable", backContent: "Nghĩa: không thể thiếu\nVí dụ: Critical thinking is indispensable for academic success.\nSynonym: essential, vital",  reviewCount: 0 },
    { setId: set1._id, frontContent: "nuanced",       backContent: "Nghĩa: tinh tế, có sắc thái\nVí dụ: A nuanced analysis considers multiple perspectives.\nTừ loại: adjective",          reviewCount: 1, nextReviewDate: inDays(4) },

    // ── Set 2 — Linking words ──
    { setId: set2._id, frontContent: "Furthermore / Moreover",          backContent: "Thêm ý, bổ sung luận điểm\nVí dụ: Furthermore, research supports this claim.\nDùng khi: thêm điểm mạnh hơn vào lập luận",                            reviewCount: 6, nextReviewDate: inDays(8) },
    { setId: set2._id, frontContent: "Nevertheless / Nonetheless",      backContent: "Mặc dù vậy (thừa nhận & phản biện)\nVí dụ: Nevertheless, there are compelling counterarguments.\nDùng khi: chuyển tiếp sau khi thừa nhận điểm đối lập", reviewCount: 3, nextReviewDate: inDays(2) },
    { setId: set2._id, frontContent: "Consequently / As a result",      backContent: "Do đó, kết quả là\nVí dụ: Consequently, governments face significant challenges.\nDùng khi: nêu hệ quả/kết quả",                                       reviewCount: 7, nextReviewDate: inDays(10) },
    { setId: set2._id, frontContent: "Conversely / On the other hand",  backContent: "Ngược lại, mặt khác\nVí dụ: Conversely, some studies suggest the opposite.\nDùng khi: chuyển sang quan điểm trái chiều",                             reviewCount: 4, nextReviewDate: inDays(5) },
    { setId: set2._id, frontContent: "In light of this",                backContent: "Xét trong bối cảnh này\nVí dụ: In light of this evidence, stricter regulation seems necessary.\nDùng khi: đưa kết luận dựa trên bằng chứng vừa nêu",  reviewCount: 0 },
    { setId: set2._id, frontContent: "To this end",                     backContent: "Vì mục đích này\nVí dụ: To this end, governments must increase funding.\nDùng khi: giới thiệu giải pháp/hành động cụ thể",                           reviewCount: 2, nextReviewDate: inDays(2) },
    { setId: set2._id, frontContent: "Albeit",                          backContent: "Mặc dù (formal, trước adj/adv)\nVí dụ: The policy was successful, albeit controversial.\nDùng khi: thêm hạn chế vào nhận định",                       reviewCount: 1, nextReviewDate: inDays(1) },
    { setId: set2._id, frontContent: "By contrast",                     backContent: "Trái lại\nVí dụ: By contrast, developing nations lack infrastructure.\nDùng khi: so sánh hai tình huống trái ngược trực tiếp",                      reviewCount: 3, nextReviewDate: inDays(3) },

    // ── Set 3 — Environment vocabulary ──
    { setId: set3._id, frontContent: "greenhouse gas emissions", backContent: "Nghĩa: khí thải nhà kính\nVí dụ: Reducing greenhouse gas emissions is crucial to limiting global warming.", reviewCount: 4, nextReviewDate: inDays(3) },
    { setId: set3._id, frontContent: "carbon footprint",        backContent: "Nghĩa: dấu chân carbon\nVí dụ: Individuals can reduce their carbon footprint by using public transport.",   reviewCount: 5, nextReviewDate: inDays(6) },
    { setId: set3._id, frontContent: "biodiversity",            backContent: "Nghĩa: đa dạng sinh học\nVí dụ: Deforestation threatens biodiversity in tropical regions.",                 reviewCount: 2, nextReviewDate: inDays(1) },
    { setId: set3._id, frontContent: "sustainable development", backContent: "Nghĩa: phát triển bền vững\nVí dụ: The UN's 2030 Agenda promotes sustainable development goals.",           reviewCount: 6, nextReviewDate: inDays(9) },
    { setId: set3._id, frontContent: "renewable energy",        backContent: "Nghĩa: năng lượng tái tạo\nVí dụ: Investment in renewable energy creates jobs while reducing pollution.",   reviewCount: 3, nextReviewDate: inDays(4) },
  ]);
  console.log(`   ✓ ${sets.length} sets / 21 flashcards`);

  // ── 8. NotebookNotes ───────────────────────────────────────────────────────

  console.log("📓 Seeding NotebookNotes...");
  await NoteModel.insertMany([
    {
      userId: student1._id,
      title: "Mẹo viết Introduction Band 7+",
      userDraftNote: `# Cấu trúc Introduction hiệu quả

## 3 thành phần:
1. General statement — paraphrase chủ đề (KHÔNG chép nguyên văn)
2. Specific context — tại sao vấn đề này quan trọng
3. Thesis statement — nêu rõ quan điểm

## Template:
"The question of whether [topic] has become a subject of considerable debate. While some argue that [View A], others contend that [View B]. This essay will examine both perspectives before arguing that [position]."

## Cần tránh:
- "In today's world..." (quá cliché)
- Bắt đầu bằng "I think" ngay câu đầu
- Chép y chang câu hỏi`,
    },
    {
      userId: student1._id,
      title: "Lỗi ngữ pháp thường gặp của tôi",
      userDraftNote: `# Những lỗi cần sửa

## 1. Subject-Verb Agreement
❌ "The number of people are increasing"
✅ "The number of people is increasing"

## 2. Article (a/an/the)
❌ "Education is important for economy"
✅ "Education is important for the economy"
→ Dùng THE khi nói về khái niệm tổng quát

## 3. Modal + Base Verb
❌ "universities should aligns"
✅ "universities should align"

## 4. Parallel Structure
❌ "He enjoys reading, to write, and to swim"
✅ "He enjoys reading, writing, and swimming"`,
    },
    {
      userId: student1._id,
      title: "Từ vựng chủ đề Technology",
      userDraftNote: `# Technology Vocabulary

## Tích cực:
- unprecedented access to information
- revolutionise the way we + V
- enhance productivity / foster innovation
- bridge the digital divide

## Tiêu cực:
- raise serious privacy concerns
- exacerbate social isolation
- pose a threat to... / render... obsolete
- erode traditional values

## Opening phrases:
- "In the digital age, ..."
- "With the rapid advancement of technology, ..."
- "The proliferation of [tech] has..."`,
    },
    {
      userId: student2._id,
      title: "Ghi chú học Environment",
      userDraftNote: `# Environment Essay Notes

## Individual responsibility:
- Daily choices (diet, transport, consumption)
- Consumer pressure drives corporate change

## Government/Corporate responsibility:
- Scale exceeds individual capacity
- Only governments can implement binding legislation
- Top 100 companies = 71% of global emissions ← dùng số liệu này!

## Opinion template:
"While individual action is commendable, the systemic nature of [problem] demands governmental intervention. Without the right infrastructure, individuals cannot make sustainable choices regardless of their intentions."`,
    },
  ]);
  console.log(`   ✓ 4 notes`);

  // ── 9. Submissions ─────────────────────────────────────────────────────────

  console.log("📮 Seeding Submissions...");
  const now = new Date();

  const essay1 = `Some people believe that universities exist to provide students with the skills needed in the workplace. Others, however, think that the true purpose of a university is to develop knowledge for its own sake. Both views have considerable merit, but I believe a balanced approach is most effective.

Those who support practical, vocational education argue that graduates needs specific, job-ready skills to succeed in today's competitive labour market. Employers want workers who can immediately contribute to their organisation without requiring extensive on-the-job training. For example, medical and engineering students clearly benefit from hands-on practical training during their degree programmes.

However, university education offer far more than just preparation for employment. It develops critical thinking, creativity and the ability to analyse complex problems independently. Many of the world's most important scientific discoveries have emerged from pure academic research with no immediate commercial application. If universities focus exclusively on employment outcomes, they risk becoming mere vocational training centres.

In my opinion, the most effective university education combines both elements. Students should acquire relevant professional skills alongside a broad academic foundation. This prepare graduates not only for their first career role but also for adapting to new challenges throughout their working lives.

To conclude, while equipping students for the workplace is undeniably important, universities must not sacrifice their broader educational mission. The ideal university education develops graduates who are both professionally competent and intellectually curious.`;

  const essay2 = `The internet has without doubt transformed modern life, giving people unprecedented access to information and global communication. However, its rapid expansion has also created serious problems that society must urgently adress.

The most significant issue is the spread of misinformation and fake news. False information can circulate through social media platforms at extraordinary speed, potentially influencing public opinion and even electoral outcomes. The COVID-19 pandemic demonstrated graphically how health misinformation can cost lives when people follow unverified treatments promoted online.

A second major problem is cybercrime and the erosion of personal privacy. As increasing amounts of personal and financial data is stored online, individuals becomes more vulnerable to hacking, identity theft and fraud. High-profile data breaches affecting millions of users have become alarmingly routine.

To address these challenges, a coordinated response from governments, technology companies and individuals is required. Digital literacy programmes should be incorporated into school curricula. Meanwhile, regulators should require social media platforms to remove harmful content more rapidly. On an individual level, adopting stronger security practices such as two-factor authentication offers meaningful protection.

In conclusion, while the internet provides enormous benefits, the serious problems of misinformation and cybercrime require immediate and sustained attention from all stakeholders.`;

  const essay3 = `Climate change is one of the biggest problems facing humanity today. There is a debate about whether individuals or governments should take responsibility for solving this problem. In my opinion, both groups have important roles to play.

On one hand, individuals can make a significant difference through their daily choices. By reducing energy consumption, using public transport, eating less meat and recycling waste, ordinary people can collectively reduce their carbon footprint. Moreover, when enough consumers demand environmentally friendly products, companies are forced to change their practices.

On the other hand, the scale of the climate crisis means that individual actions alone are not enough. Governments have the power to introduce laws and regulations that can make a much bigger impact. For example, they can set targets for reducing carbon emissions, invest in renewable energy and provide financial incentives for green behaviour.

In conclusion, I believe that both individuals and governments must work together to tackle climate change. While personal choices matter, systemic change through government policy is ultimately more powerful. The most effective solution combines strong government action with widespread individual commitment to sustainable living.`;

  await SubmissionModel.insertMany([
    {
      userId: student1._id,
      questionId: q1._id,
      essayContent: essay1,
      wordCount: countWords(essay1),
      timeSpentSeconds: 2340,
      status: SubmissionStatus.COMPLETED,
      submittedAt: new Date(now.getTime() - 2 * 86400000),
      attemptNumber: 1,
      aiResult: {
        taskResponseScore: 6.0, coherenceScore: 5.5, lexicalScore: 5.5, grammarScore: 5.5,
        overallBand: 5.5,
        processedAt: new Date(now.getTime() - 2 * 86400000 + 45000),
        generalFeedback: "Bài viết có cấu trúc rõ ràng và đề cập đến cả hai quan điểm. Cần cải thiện sự chính xác ngữ pháp và mở rộng vốn từ vựng học thuật để đạt band cao hơn.",
        strengths: "Cấu trúc bài viết tốt với mở bài và kết bài rõ ràng. Đề cập đến cả hai quan điểm. Có ví dụ minh họa lập luận.",
        improvements: "Cần sửa các lỗi chia động từ (subject-verb agreement). Sử dụng từ vựng đa dạng hơn. Phát triển lập luận sâu hơn.",
        errors: [
          { startIndex: 370, endIndex: 376, category: ErrorCategory.GRAMMAR,     originalText: "needs",   suggestion: "need",          explanation: "Lỗi chia động từ: 'graduates' là chủ ngữ số nhiều → dùng 'need' (không phải 'needs').",          severity: "high"   },
          { startIndex: 560, endIndex: 565, category: ErrorCategory.GRAMMAR,     originalText: "offer",   suggestion: "offers",        explanation: "Lỗi chia động từ: 'university education' là số ít → cần 'offers'.",                           severity: "high"   },
          { startIndex: 890, endIndex: 897, category: ErrorCategory.GRAMMAR,     originalText: "prepare", suggestion: "prepares",      explanation: "Lỗi chia động từ: 'This' (số ít) → dùng 'prepares'.",                                        severity: "medium" },
          { startIndex: 183, endIndex: 195, category: ErrorCategory.VOCABULARY,  originalText: "considerable", suggestion: "substantial", explanation: "'substantial' mang sắc thái học thuật cao hơn trong ngữ cảnh này.",                  severity: "low"    },
        ],
      },
    },
    {
      userId: student1._id,
      questionId: q2._id,
      essayContent: essay2,
      wordCount: countWords(essay2),
      timeSpentSeconds: 2580,
      status: SubmissionStatus.COMPLETED,
      submittedAt: new Date(now.getTime() - 1 * 86400000),
      attemptNumber: 1,
      aiResult: {
        taskResponseScore: 6.5, coherenceScore: 6.5, lexicalScore: 6.0, grammarScore: 6.0,
        overallBand: 6.5,
        processedAt: new Date(now.getTime() - 1 * 86400000 + 38000),
        generalFeedback: "Bài viết trình bày vấn đề rõ ràng, cấu trúc tốt và từ vựng đa dạng hơn bài trước. Còn một số lỗi ngữ pháp và lỗi chính tả cần chú ý.",
        strengths: "Phát triển lập luận tốt với hai vấn đề chính được trình bày rõ ràng. Phần giải pháp chi tiết và thực tế. Từ vựng phong phú hơn.",
        improvements: "Rà soát kỹ lỗi chính tả. Chú ý subject-verb agreement trong mệnh đề phức. Thêm dẫn chứng cụ thể.",
        errors: [
          { startIndex: 107, endIndex: 120, category: ErrorCategory.VOCABULARY, originalText: "without doubt", suggestion: "undoubtedly",  explanation: "Dùng 'undoubtedly' thay 'without doubt' — học thuật hơn.",                            severity: "low"    },
          { startIndex: 93,  endIndex: 99,  category: ErrorCategory.SPELLING,   originalText: "adress",        suggestion: "address",       explanation: "Lỗi chính tả: 'address' (hai chữ 'd').",                                            severity: "medium" },
          { startIndex: 476, endIndex: 484, category: ErrorCategory.GRAMMAR,    originalText: "becomes",       suggestion: "become",        explanation: "Lỗi chia động từ: 'individuals' là số nhiều → dùng 'become'.",                      severity: "high"   },
        ],
      },
    },
    {
      userId: student2._id,
      questionId: q3._id,
      essayContent: essay3,
      wordCount: countWords(essay3),
      timeSpentSeconds: 1920,
      status: SubmissionStatus.COMPLETED,
      submittedAt: new Date(now.getTime() - 3 * 86400000),
      attemptNumber: 1,
      aiResult: {
        taskResponseScore: 5.5, coherenceScore: 6.0, lexicalScore: 5.5, grammarScore: 6.0,
        overallBand: 5.5,
        processedAt: new Date(now.getTime() - 3 * 86400000 + 52000),
        generalFeedback: "Bài viết có cấu trúc rõ ràng và trả lời được câu hỏi. Cần phát triển lập luận sâu hơn và dùng từ vựng phong phú, học thuật hơn.",
        strengths: "Cấu trúc rõ ràng, dễ theo dõi. Đề cập cả hai phía vấn đề. Kết bài tóm tắt tốt quan điểm.",
        improvements: "Lập luận còn đơn giản, thiếu ví dụ cụ thể. Từ vựng ở mức cơ bản. Cần phát triển thêm mỗi đoạn thân bài.",
        errors: [
          { startIndex: 17,  endIndex: 33,  category: ErrorCategory.VOCABULARY, originalText: "biggest problems",  suggestion: "most pressing challenges",      explanation: "'most pressing challenges' — cụm từ học thuật đặc trưng Band 6+.", severity: "medium" },
          { startIndex: 660, endIndex: 676, category: ErrorCategory.COHERENCE,  originalText: "much bigger impact", suggestion: "a significantly greater impact", explanation: "Tránh 'much bigger' trong văn học thuật. Dùng 'significantly greater'.", severity: "low"    },
        ],
      },
    },
  ]);
  console.log(`   ✓ 3 submissions`);

  // ── Summary ────────────────────────────────────────────────────────────────

  console.log("\n" + "═".repeat(52));
  console.log("✅ Seed completed!\n");
  console.log("📊 Summary:");
  console.log("   Topics         : 6");
  console.log("   Users          : 3");
  console.log("   ExamQuestions  : 10");
  console.log("   SampleEssays   : 6");
  console.log("   Courses        : 3");
  console.log("   Lessons        : 9  (3 per course)");
  console.log("   FlashcardSets  : 3");
  console.log("   Flashcards     : 21");
  console.log("   NotebookNotes  : 4");
  console.log("   Submissions    : 3  (2 × student1, 1 × student2)");
  console.log("\n🔑 Credentials:");
  console.log("   admin@ielts.ai    / 123456    (ADMIN)");
  console.log("   student@test.com  / 123456  (STUDENT)");
  console.log("   student2@test.com / 123456  (STUDENT)");
  console.log("═".repeat(52) + "\n");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err.message);
  mongoose.disconnect();
  process.exit(1);
});
