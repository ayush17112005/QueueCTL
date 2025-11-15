// QueueManager handles business logic for jobs
class QueueManager {
  // Constructor receives database instance
  constructor(database) {
    this.db = database;
  }

  // Add a new job to the queue
  enqueue(jobData) {
    // Validate: job must have a command
    if (!jobData.command) {
      throw new Error("Job must have a command");
    }

    // Create job object with defaults
    const job = {
      id: jobData.id || this.generateJobId(),
      command: jobData.command,
      state: "pending",
      attempts: 0,
      max_retries: jobData.max_retries || 3,
    };

    // Insert into database
    const inserted = this.db.insertJob(job);

    //return the inserted row
    return inserted;
  }

  // List jobs (with optional state filter)
  list(state = null) {
    const filters = {};

    if (state) {
      filters.state = state;
    }

    return this.db.listJobs(filters);
  }

  // Get queue status and stats
  getStatus() {
    const stats = this.db.getStats();

    // TODO: Get active workers count (Sprint 2)
    const activeWorkers = 0;

    return {
      stats,
      activeWorkers,
    };
  }

  // List Dead Letter Queue (failed jobs)
  listDLQ() {
    return this.db.listJobs({ state: "dead" });
  }

  // Retry a job from DLQ
  retryFromDLQ(jobId) {
    const job = this.db.getJob(jobId);

    // Validate job exists
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    // Validate job is in DLQ
    if (job.state !== "dead") {
      throw new Error(
        `Job ${jobId} is not in DLQ (current state: ${job.state})`
      );
    }

    // Reset the job
    this.db.updateJobState(jobId, "pending", {
      attempts: 0,
      next_retry_at: null,
      error: null,
    });

    return this.db.getJob(jobId);
  }

  // Generate unique job ID
  generateJobId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `job_${timestamp}_${random}`;
  }
}

// Modern export
export default QueueManager;
