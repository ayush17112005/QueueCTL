import QueueDatabase from "../storage/database.js";
import Worker from "./worker.js";

// console.log("-----------------Lets see whats in process----------");
// console.log(process);
// console.log("---------------------------------------------------");

// Get worker ID from command line argument
const workerId = process.argv[2] || "1";

// Initialize database
const db = new QueueDatabase();

// Create worker instance
const worker = new Worker(`worker-${workerId}`, db);

// Handle shutdown signals
//Process here is the inbuitl Node.js global object
process.on("SIGTERM", () => {
  console.log(`\n🛑 Worker ${workerId} received shutdown signal`);
  worker.stop();

  setTimeout(() => {
    db.close();
    process.exit(0);
  }, 1000);
});

process.on("SIGINT", () => {
  console.log(`\n🛑 Worker ${workerId} received Ctrl+C`);
  worker.stop();

  setTimeout(() => {
    db.close();
    process.exit(0);
  }, 1000);
});

// Start the worker
console.log(`Starting worker process ${workerId}...`);
worker.start().catch((error) => {
  console.error(`Worker ${workerId} crashed:`, error);
  db.close();
  process.exit(1);
});
