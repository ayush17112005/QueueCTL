import QueueDatabase from "../../storage/database.js";
import QueueManager from "../../queue/manager.js";
import Display from "../utils/display.js";

const enqueueCommand = async (jobJson) => {
  try {
    //Parse the Json input
    const jobData = JSON.parse(jobJson);

    //Initialize the database
    const db = new QueueDatabase();

    //Create the queueManager
    const queueManager = new QueueManager(db);

    //Enqueue the job
    const job = queueManager.enqueue(jobData);

    //Display the success message
    Display.success(`Job '${job.id}' enqueued successfully.`);

    db.close();
  } catch (err) {
    Display.error(`Failed to enqueue job: ${err.message}`);
    process.exit(1);
  }
};

export default enqueueCommand;
