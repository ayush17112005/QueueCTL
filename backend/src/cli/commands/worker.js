import WorkerManager from "../../worker/manager.js";

//Worker Start Command
const workerStartCommand = async (options) => {
  const count = parseInt(options.count) || 1;

  const manager = new WorkerManager();
  manager.startWorkers(count);

  //Keep the process running
  //Workers run in background, main process just wait
  process.stdin.resume();
};

//Worker stop Command
const workerStopCommand = async () => {
  console.log(
    "⚠️  To stop workers, press Ctrl+C in the terminal where they are running"
  );
  console.log("   Or use: kill <PID>");
};

export { workerStartCommand, workerStopCommand };
