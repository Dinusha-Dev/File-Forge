export type JobStatus = "pending" | "processing" | "done" | "error";

export interface FileProgress {
  filename: string;
  originalName: string;
  status: JobStatus;
  progress: number; // 0–100
  error?: string;
  outputFilename?: string;
}

export interface Job {
  id: string;
  type: "image-convert" | "pdf-merge" | "pdf-split" | "pdf-reorder";
  status: JobStatus;
  files: FileProgress[];
  createdAt: number;
  outputFilename?: string; // for single-output jobs (merge, reorder)
  error?: string;
}

const jobMap = new Map<string, Job>();

export function createJob(
  id: string,
  type: Job["type"],
  files: Omit<FileProgress, "status" | "progress">[]
): Job {
  const job: Job = {
    id,
    type,
    status: "pending",
    files: files.map((f) => ({ ...f, status: "pending", progress: 0 })),
    createdAt: Date.now(),
  };
  jobMap.set(id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobMap.get(id);
}

export function updateJobFile(
  jobId: string,
  filename: string,
  update: Partial<FileProgress>
): void {
  const job = jobMap.get(jobId);
  if (!job) return;
  const file = job.files.find((f) => f.filename === filename);
  if (file) Object.assign(file, update);

  // Recompute overall job status
  const statuses = job.files.map((f) => f.status);
  if (statuses.every((s) => s === "done")) {
    job.status = "done";
  } else if (statuses.some((s) => s === "error")) {
    job.status = "error";
  } else if (statuses.some((s) => s === "processing")) {
    job.status = "processing";
  }
  jobMap.set(jobId, job);
}

export function updateJob(jobId: string, update: Partial<Job>): void {
  const job = jobMap.get(jobId);
  if (!job) return;
  Object.assign(job, update);
  jobMap.set(jobId, job);
}

// Cleanup old jobs (>2 hours) from memory
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of jobMap.entries()) {
    if (now - job.createdAt > 2 * 60 * 60 * 1000) {
      jobMap.delete(id);
    }
  }
}, 10 * 60 * 1000);
