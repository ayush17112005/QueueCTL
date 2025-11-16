import QueueDatabase from "../storage/database.js";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

class Worker {
  constructor(workerId, database) {
    this.workerId = workerId;
    this.db = database;
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;

    console.log(`🚀 Worker ${this.workerId} started`);
    this.db.recoverStuckJobs(5);
    while (this.isRunning) {
      try {
        const job = await this.claimJob();

        if (job) {
          await this.executeJob(job);
        } else {
          await this.sleep(1000);
        }
      } catch (error) {
        console.error(`❌ Worker ${this.workerId} error:`, error.message);
        await this.sleep(1000);
      }
    }

    console.log(`🛑 Worker ${this.workerId} stopped`);
  }

  async claimJob() {
    const job = this.db.claimJob(this.workerId);

    if (job) {
      console.log(`📦 Worker ${this.workerId} claimed job: ${job.id}`);
    }

    return job;
  }

  async executeJob(job) {
    console.log(`⚙️  Worker ${this.workerId} executing: ${job.command}`);

    // Show attempt number if retrying
    if (job.attempts > 0) {
      console.log(
        `   ↻ Retry attempt ${job.attempts + 1}/${job.max_retries + 1}`
      );
    }

    try {
      // Execute the shell command
      const { stdout, stderr } = await execAsync(job.command, {
        timeout: 30000,
      });

      // SUCCESS!
      console.log(`✅ Job ${job.id} completed successfully`);

      this.db.updateJobState(job.id, "completed", {
        completed_at: new Date().toISOString(),
        exit_code: 0,
        output: stdout.trim(),
        error: stderr.trim(),
      });
    } catch (error) {
      // FAILED!
      const newAttempts = job.attempts + 1;

      console.log(
        `❌ Job ${job.id} failed (attempt ${newAttempts}/${
          job.max_retries + 1
        }): ${error.message}`
      );

      // Check if we should retry
      if (newAttempts <= job.max_retries) {
        // RETRY - Schedule for later
        const delay = this.db.scheduleRetry(job.id, newAttempts, error.message);
        console.log(`   ⏰ Will retry in ${delay} seconds...`);
      } else {
        // MAX RETRIES EXCEEDED - Send to Dead Letter Queue
        console.log(
          `   ☠️  Job ${job.id} moved to DEAD (max retries exceeded)`
        );

        this.db.updateJobState(job.id, "dead", {
          exit_code: error.code || 1,
          error: error.message,
          attempts: newAttempts,
          last_error: error.message,
        });
      }
    }
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  stop() {
    console.log(`🛑 Stopping worker ${this.workerId}...`);
    this.isRunning = false;
  }
}

export default Worker;
