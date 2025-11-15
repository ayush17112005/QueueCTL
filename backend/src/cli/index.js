// Modern imports
import { Command } from "commander";
import enqueueCommand from "./commands/enqueue.js";
import listCommand from "./commands/list.js";
import statusCommand from "./commands/status.js";

// Create CLI program
const program = new Command();

// Setup program info
program
  .name("queuectl")
  .description("CLI-based background job queue system")
  .version("1.0.0");

// Enqueue command
program
  .command("enqueue <job>")
  .description("Add a new job to the queue")
  .action(enqueueCommand);

// List command
program
  .command("list")
  .description("List jobs in the queue")
  .option(
    "-s, --state <state>",
    "Filter by state (pending|processing|completed|failed|dead)"
  )
  .action(listCommand);

// Status command
program
  .command("status")
  .description("Show queue status and statistics")
  .action(statusCommand);

// Parse command line arguments
program.parse(process.argv);
