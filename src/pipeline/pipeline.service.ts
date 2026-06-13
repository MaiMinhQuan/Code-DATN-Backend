import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs/promises";
import { PipelineJob } from "@/schemas/pipeline-job.schema";
import { CreatePipelineJobDto } from "./dto/create-pipeline-job.dto";
import { UpdateCandidatesDto } from "./dto/update-candidates.dto";
import { UpdateLessonsDto } from "./dto/update-lessons.dto";
import { SubmissionsGateway } from "@/websocket/gateways/submissions.gateway";

@Injectable()
export class PipelineService {
  constructor(
    @InjectModel(PipelineJob.name) private jobModel: Model<PipelineJob>,
    private readonly gateway: SubmissionsGateway,
  ) {}

  private get pipelineDir(): string {
    return path.join(process.cwd(), "pipeline");
  }

  private get pythonExe(): string {
    return process.env.PYTHON_PATH ?? "python";
  }

  private toSlug(topic: string): string {
    return topic.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  }

  async create(dto: CreatePipelineJobDto) {
    const job = new this.jobModel({
      topic: dto.topic,
      maxVideos: dto.maxVideos ?? 8,
      maxEssays: dto.maxEssays ?? 8,
      skipEssays: dto.skipEssays ?? false,
      status: "pending",
      currentStep: 0,
      logs: [],
    });
    await job.save();
    const jobId = (job._id as any).toString();

    this.runMainPipeline(jobId, job.topic, job.maxVideos, job.maxEssays, job.skipEssays).catch((err) => {
      console.error(`[Pipeline] Job ${jobId} failed:`, err.message);
    });

    return { jobId };
  }

  async findAll() {
    return this.jobModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    const job = await this.jobModel.findById(id).exec();
    if (!job) throw new NotFoundException("Không tìm thấy pipeline job");
    return job;
  }

  async findCandidates(jobId: string) {
    const job = await this.findOne(jobId);
    const filePath = path.join(this.pipelineDir, "output", `step5_candidates_${this.toSlug(job.topic)}.json`);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(content);
      return data.candidates ?? [];
    } catch {
      throw new NotFoundException("Chưa có file candidates. Hãy chờ bước 5 scrape hoàn tất.");
    }
  }

  async updateCandidates(jobId: string, dto: UpdateCandidatesDto) {
    const job = await this.findOne(jobId);
    const filePath = path.join(this.pipelineDir, "output", `step5_candidates_${this.toSlug(job.topic)}.json`);

    let data: any;
    try {
      data = JSON.parse(await fs.readFile(filePath, "utf-8"));
    } catch {
      throw new NotFoundException("Không tìm thấy file candidates");
    }

    data.candidates = data.candidates.map((c: any, i: number) => ({
      ...c,
      approved: dto.approvedIndexes.includes(i),
    }));

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    return { updated: dto.approvedIndexes.length };
  }

  async findLessons(jobId: string) {
    const job = await this.findOne(jobId);
    const filePath = path.join(this.pipelineDir, "output", `step4_${this.toSlug(job.topic)}.json`);
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(content);
      return data.lessons ?? [];
    } catch {
      throw new NotFoundException("Chưa có file step4. Hãy chờ bước 4 hoàn tất.");
    }
  }

  async updateLessons(jobId: string, dto: UpdateLessonsDto) {
    const job = await this.findOne(jobId);
    const filePath = path.join(this.pipelineDir, "output", `step4_${this.toSlug(job.topic)}.json`);

    let data: any;
    try {
      data = JSON.parse(await fs.readFile(filePath, "utf-8"));
    } catch {
      throw new NotFoundException("Không tìm thấy file step4");
    }

    data.lessons = data.lessons.map((item: any, i: number) => ({
      ...item,
      approved: dto.approvedIndexes.includes(i),
    }));

    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    return { updated: dto.approvedIndexes.length };
  }

  async analyze(jobId: string) {
    const job = await this.findOne(jobId);
    await this.jobModel.findByIdAndUpdate(jobId, { status: "analyzing" });

    this.spawnProcess(jobId, [
      "main.py", "--topic", job.topic,
      "--step", "5", "--phase", "analyze",
    ], "ready_to_seed").catch((err) => {
      console.error(`[Pipeline] Analyze ${jobId} failed:`, err.message);
    });

    return { started: true };
  }

  async seed(jobId: string) {
    const job = await this.findOne(jobId);
    await this.jobModel.findByIdAndUpdate(jobId, { status: "seeding" });

    this.spawnProcess(jobId, [
      "main.py", "--topic", job.topic, "--step", "6",
    ], "done").catch((err) => {
      console.error(`[Pipeline] Seed ${jobId} failed:`, err.message);
    });

    return { started: true };
  }

  // Bước 1→4, rồi bước 5 scrape (nếu không skipEssays)
  private async runMainPipeline(
    jobId: string,
    topic: string,
    maxVideos: number,
    maxEssays: number,
    skipEssays: boolean = false,
  ): Promise<void> {
    await this.jobModel.findByIdAndUpdate(jobId, { status: "running" });

    await this.spawnProcess(jobId, [
      "main.py", "--topic", topic,
      "--max-videos", maxVideos.toString(), "--step", "4",
    ], "running");

    if (skipEssays) {
      // Bỏ qua bước 5 scrape → chuyển thẳng sang waiting_review
      await this.jobModel.findByIdAndUpdate(jobId, { status: "waiting_review" });
    } else {
      await this.spawnProcess(jobId, [
        "main.py", "--topic", topic,
        "--step", "5", "--phase", "scrape",
        "--max-essays", maxEssays.toString(),
      ], "waiting_review");
    }
  }

  // Dùng lại ở giai đoạn 5 (analyze) và 6 (seed)
  spawnProcess(jobId: string, args: string[], successStatus: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(this.pythonExe, args, {
        cwd: this.pipelineDir,
        env: { ...process.env },
      });

      let lineBuffer = "";

      const handleLine = (line: string) => {
        if (!line.trim()) return;

        const stepMatch = line.match(/\[ Bước (\d+)/);
        const update: any = { $push: { logs: line } };
        if (stepMatch) {
          update.$set = { currentStep: parseInt(stepMatch[1]) };
        }

        this.jobModel.findByIdAndUpdate(jobId, update).exec();
        this.gateway.emitPipelineProgress(jobId, {
          jobId,
          message: line,
          step: stepMatch ? parseInt(stepMatch[1]) : undefined,
        });
      };

      proc.stdout.on("data", (chunk: Buffer) => {
        lineBuffer += chunk.toString();
        const lines = lineBuffer.split("\n");
        lineBuffer = lines.pop() ?? "";
        lines.forEach((l) => handleLine(l));
      });

      proc.stderr.on("data", (chunk: Buffer) => {
        handleLine(`[stderr] ${chunk.toString().trim()}`);
      });

      proc.on("close", (code) => {
        if (lineBuffer.trim()) handleLine(lineBuffer.trim());

        setTimeout(async () => {
          if (code === 0) {
            await this.jobModel.findByIdAndUpdate(jobId, { status: successStatus });
            resolve();
          } else {
            await this.jobModel.findByIdAndUpdate(jobId, { status: "failed" });
            reject(new Error(`Python exited with code ${code}`));
          }
        }, 200);
      });

      proc.on("error", async (err) => {
        await this.jobModel.findByIdAndUpdate(jobId, {
          status: "failed",
          $push: { logs: `[error] ${err.message}` },
        });
        reject(err);
      });
    });
  }
}
