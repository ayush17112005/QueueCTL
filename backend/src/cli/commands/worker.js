import QueueDatabase from "../../storage/database.js";
import Worker from "../../worker/worker.js";

// Command to start a single worker
async function workerCommand(options) {
  console.log("Starting worker...\n");

  // Initialize database
  const db = new QueueDatabase();

  // Create worker
  const worker = new Worker("worker-1", db);

  // Handle Ctrl+C gracefully
  process.on("SIGINT", () => {
    console.log("\n\n⚠️  Received shutdown signal...");
    worker.stop();

    // Give worker time to finish current job
    setTimeout(() => {
      db.close();
      process.exit(0);
    }, 2000);
  });

  // Start the worker (runs forever until Ctrl+C)
  await worker.start();

  // Cleanup when worker stops
  db.close();
}

export default workerCommand;
