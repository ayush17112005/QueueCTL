import { Command } from "commander";
import enqueueCommand from "./commands/enqueue.js";
import listCommand from "./commands/list.js";
import statusCommand from "./commands/status.js";
import { workerStartCommand, workerStopCommand } from "./commands/worker.js";
import {
  dlqListCommand,
  dlqInspectCommand,
  dlqRetryCommand,
  dlqDeleteCommand,
  dlqRetryAllCommand,
  dlqClearCommand,
  dlqStatsCommand,
} from "./commands/dlq.js";

const program = new Command();

program
  .name("queuectl")
  .description("CLI-based background job queue system")
  .version("1.0.0");

program
  .command("enqueue <job>")
  .description("Add a new job to the queue")
  .action(enqueueCommand);

program
  .command("list")
  .description("List jobs in the queue")
  .option("-s, --state <state>", "Filter by state")
  .action(listCommand);

program
  .command("status")
  .description("Show queue status and statistics")
  .action(statusCommand);

program
  .command("worker-start")
  .description("Start worker processes")
  .option("-c, --count <number>", "Number of workers to start", "1")
  .action(workerStartCommand);

program
  .command("worker-stop")
  .description("Stop all workers")
  .action(workerStopCommand);

program
  .command("dlq-list")
  .description("List all dead jobs")
  .action(dlqListCommand);

program
  .command("dlq-inspect <job-id>")
  .description("Show detailed information about a dead job")
  .action(dlqInspectCommand);

program
  .command("dlq-retry <job-id>")
  .description("Retry a dead job (reset to pending)")
  .action(dlqRetryCommand);

program
  .command("dlq-delete <job-id>")
  .description("Permanently delete a dead job")
  .action(dlqDeleteCommand);

program
  .command("dlq-retry-all")
  .description("Retry all dead jobs")
  .action(dlqRetryAllCommand);

program
  .command("dlq-clear")
  .description("Clear entire Dead Letter Queue (delete all dead jobs)")
  .action(dlqClearCommand);

program
  .command("dlq-stats")
  .description("Show Dead Letter Queue statistics")
  .action(dlqStatsCommand);

program.parse(process.argv);
