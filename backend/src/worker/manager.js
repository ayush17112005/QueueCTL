//this fork is used to create a new Node.js process that runs another js file
import { fork } from "child_process";
import path from "path";
import { fileURLToPath } from "node:url";
import QueueDatabase from "../storage/database.js";

//Get currect file directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//WorkerManager- Manage multiple worker processes

class WorkerManager {
  constructor() {
    //this workers stores references to all spawned worker processes
    this.workers = []; //array of worker child processes
    this.db = new QueueDatabase(); //database instance for traciking workers
  }

  //Start multiple workers
  startWorkers(count = 1) {
    console.log(`\n Starting ${count} workers...\n`);
    for (let i = 0; i < count; i++) {
      this.startWorker(i + 1);
    }

    console.log(`${count} worker(s) started successfully!\n`);
    console.log("Press Ctrl+C to stop the workers.\n");

    //handle Ctrl + C event
    this.setupShutdownHandler();
  }

  //Start worker method for worker process
  startWorker(workerId) {
    //Path to the worker Process file
    const workerPath = path.join(__dirname, "process.js");

    //Fork a new Node.js process
    //this retuerns a ChildProcess object
    const worker = fork(workerPath, [workerId], {
      stdio: "inherit", //Show worker output in terminal
    });

    //Store worker reference
    this.workers.push({
      id: workerId,
      process: worker,
      pid: worker.pid,
    });

    //handle worker exit
    worker.on("exit", (code) => {
      console.log(`\n⚠️  Worker ${workerId} exited with code ${code}`);

      //Remove worker from the workers array
      this.workers = this.workers.filter((w) => w.id !== workerId);
    });

    console.log(`✅ Worker ${workerId} started with PID ${worker.pid}`);
  }

  //Stop all the workers gracefully
  stopWorkers() {
    console.log("\nStopping all workers...\n");

    //Send SIGTERM signal to each worker process
    this.workers.forEach((worker) => {
      console.log(`Stopping worker ${worker.id} with PID ${worker.pid}`);
      worker.process.kill("SIGTERM");
    });

    //Give workers some time say 5sec to finish current job
    setTimeout(() => {
      //Force kill any remaining workers
      this.workers.forEach((worker) => {
        if (worker.process.connected) {
          console.log(
            `Force stopping worker ${worker.id} with PID ${worker.pid}`
          );
          worker.process.kill("SIGKILL");
        }
      });

      //close the dabtabase connection
      this.db.close();

      console.log("\nAll workers stopped. Exiting now.");
      process.exit(0);
    }, 5000);
  }

  //Setup shutdown handler for Ctrl + C
  setupShutdownHandler() {
    process.on("SIGINT", () => {
      console.log("\nCaught interrupt signal (Ctrl+C)...");
      this.stopWorkers();
    });

    //kiss command
    process.on("SIGTERM", () => {
      console.log("\nCaught terminate signal (SIGTERM)...");
      this.stopWorkers();
    });
  }

  //Get count of the active workers
  getActiveWorkerCount() {
    //length of the workers array
    return this.workers.length;
  }

  //Get the worker info
  getWorkerInfo() {
    return this.workers.map((worker) => ({
      id: worker.id,
      pid: worker.pid,
      status: worker.process.connected ? "online" : "offline",
    }));
  }
}

export default WorkerManager;
