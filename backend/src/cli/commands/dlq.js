import QueueDatabase from "../../storage/database.js";
import Display from "../utils/display.js";
import Table from "cli-table3";

const db = new QueueDatabase();

// dlq list - List all dead jobs
const dlqListCommand = () => {
  const deadJobs = db.getDeadJobs();

  if (deadJobs.length === 0) {
    console.log("\n✨ Dead Letter Queue is empty! No failed jobs.\n");
    return;
  }

  console.log(`\n💀 Dead Letter Queue (${deadJobs.length} job(s))\n`);

  const table = new Table({
    head: ["ID", "Command", "Attempts", "Last Error", "Failed At"],
    colWidths: [25, 30, 10, 40, 20],
    wordWrap: true,
  });

  deadJobs.forEach((job) => {
    table.push([
      job.id,
      job.command.substring(0, 27) + (job.command.length > 27 ? "..." : ""),
      `${job.attempts}/${job.max_retries}`,
      job.last_error ? job.last_error.substring(0, 37) + "..." : "Unknown",
      new Date(job.updated_at).toLocaleString(),
    ]);
  });

  console.log(table.toString());
  console.log();
};

// dlq inspect <job-id> - Show full details of a dead job
const dlqInspectCommand = (jobId) => {
  if (!jobId) {
    console.error("❌ Error: Job ID is required");
    console.log("Usage: queuectl dlq inspect <job-id>");
    return;
  }

  const job = db.getDeadJob(jobId);

  if (!job) {
    console.error(`❌ Job '${jobId}' not found in Dead Letter Queue`);
    return;
  }

  console.log("\n💀 Dead Job Details\n");
  console.log("═".repeat(60));
  console.log(`ID:              ${job.id}`);
  console.log(`Command:         ${job.command}`);
  console.log(`State:           ${job.state}`);
  console.log(`Attempts:        ${job.attempts}/${job.max_retries}`);
  console.log(`Created At:      ${new Date(job.created_at).toLocaleString()}`);
  console.log(`Failed At:       ${new Date(job.updated_at).toLocaleString()}`);
  console.log(`Exit Code:       ${job.exit_code || "N/A"}`);
  console.log("─".repeat(60));
  console.log("Last Error:");
  console.log(job.last_error || job.error || "No error message available");
  console.log("─".repeat(60));
  if (job.output) {
    console.log("Output:");
    console.log(job.output);
    console.log("─".repeat(60));
  }
  console.log();
};

// dlq retry <job-id> - Retry a dead job
const dlqRetryCommand = (jobId) => {
  if (!jobId) {
    console.error("❌ Error: Job ID is required");
    console.log("Usage: queuectl dlq retry <job-id>");
    return;
  }

  try {
    const job = db.retryDeadJob(jobId);
    console.log(`\n✅ Job '${jobId}' moved from DEAD to PENDING`);
    console.log(`   Attempts reset to 0/${job.max_retries}`);
    console.log(`   Job will be picked up by next available worker\n`);
  } catch (error) {
    console.error(`\n❌ ${error.message}\n`);
  }
};

// dlq delete <job-id> - Delete a dead job permanently
const dlqDeleteCommand = (jobId) => {
  if (!jobId) {
    console.error("❌ Error: Job ID is required");
    console.log("Usage: queuectl dlq delete <job-id>");
    return;
  }

  try {
    db.deleteDeadJob(jobId);
    console.log(
      `\n✅ Job '${jobId}' permanently deleted from Dead Letter Queue\n`
    );
  } catch (error) {
    console.error(`\n❌ ${error.message}\n`);
  }
};

// dlq retry-all - Retry all dead jobs
const dlqRetryAllCommand = () => {
  const deadJobs = db.getDeadJobs();

  if (deadJobs.length === 0) {
    console.log("\n✨ Dead Letter Queue is empty! Nothing to retry.\n");
    return;
  }

  console.log(`\n⚠️  About to retry ${deadJobs.length} dead job(s)...`);

  const count = db.retryAllDeadJobs();

  console.log(`✅ Successfully moved ${count} job(s) from DEAD to PENDING`);
  console.log(`   Jobs will be picked up by available workers\n`);
};

// dlq clear - Clear entire DLQ
const dlqClearCommand = () => {
  const deadJobs = db.getDeadJobs();

  if (deadJobs.length === 0) {
    console.log("\n✨ Dead Letter Queue is already empty!\n");
    return;
  }

  console.log(
    `\n⚠️  About to permanently delete ${deadJobs.length} dead job(s)...`
  );
  console.log("⚠️  This action CANNOT be undone!\n");

  const count = db.clearDeadLetterQueue();

  console.log(`✅ Cleared Dead Letter Queue (deleted ${count} job(s))\n`);
};

// dlq stats - Show DLQ statistics
const dlqStatsCommand = () => {
  const stats = db.getDeadJobStats();

  console.log("\n💀 Dead Letter Queue Statistics\n");
  console.log(`Total Dead Jobs: ${stats.total}`);

  if (stats.total > 0) {
    console.log(
      `Oldest Dead Job: ${new Date(stats.oldestDeadJob).toLocaleString()}`
    );

    if (stats.commonErrors.length > 0) {
      console.log("\nMost Common Errors:");

      const table = new Table({
        head: ["Error", "Count"],
        colWidths: [60, 10],
      });

      stats.commonErrors.forEach((err) => {
        const errorMsg =
          err.last_error.substring(0, 57) +
          (err.last_error.length > 57 ? "..." : "");
        table.push([errorMsg, err.count]);
      });

      console.log(table.toString());
    }
  }

  console.log();
};

export {
  dlqListCommand,
  dlqInspectCommand,
  dlqRetryCommand,
  dlqDeleteCommand,
  dlqRetryAllCommand,
  dlqClearCommand,
  dlqStatsCommand,
};
