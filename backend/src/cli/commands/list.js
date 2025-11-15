import QueueDatabase from "../../storage/database.js";
import QueueManager from "../../queue/manager.js";
import Display from "../utils/display.js";

const listCommand = async (options) => {
  try {
    //Initialize the database
    const db = new QueueDatabase();
    const queueManager = new QueueManager(db);

    //get jobs
    const jobs = queueManager.list(options.state);

    //Display as table
    Display.jobsTable(jobs);

    db.close();
  } catch (err) {
    console.log("Error listing jobs:", err);
    Display.error(`Failed to list jobs: ${err.message}`);
    process.exit(1);
  }
};

export default listCommand;
