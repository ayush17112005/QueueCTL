import { Command } from "commander";
import enqueueCommand from "./commands/enqueue.js";
import listCommand from "./commands/list.js";
import statusCommand from "./commands/status.js";
import { workerStartCommand, workerStopCommand } from "./commands/worker.js";

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

// Changed: worker-start instead of "worker start"
program
  .command("worker-start")
  .description("Start worker processes")
  .option("-c, --count <number>", "Number of workers to start", "1")
  .action(workerStartCommand);

// Changed: worker-stop instead of "worker stop"
program
  .command("worker-stop")
  .description("Stop all workers")
  .action(workerStopCommand);

program.parse(process.argv);
