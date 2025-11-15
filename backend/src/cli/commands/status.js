import QueueDatabase from "../../storage/database.js";
import QueueManager from "../../queue/manager.js";
import Display from "../utils/display.js";

async function statusCommand() {
  try {
    const db = new QueueDatabase();
    const queueManager = new QueueManager(db);

    const { stats, activeWorkers } = queueManager.getStatus();

    console.log("");
    Display.statsTable(stats);
    console.log("");
    Display.info(`Active Workers: ${activeWorkers}`);
    console.log("");

    db.close();
  } catch (error) {
    Display.error(`Failed to get status: ${error.message}`);
    process.exit(1);
  }
}

export default statusCommand;
