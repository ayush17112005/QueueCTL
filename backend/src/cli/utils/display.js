import Table from "cli-table3";
import chalk from "chalk";

// Display utility class for formatted output
class Display {
  // Show success message (green checkmark)
  static success(message) {
    console.log(chalk.green("✓"), message);
  }

  // Show error message (red X)
  static error(message) {
    console.log(chalk.red("✗"), message);
  }

  // Show info message (blue i)
  static info(message) {
    console.log(chalk.blue("ℹ"), message);
  }

  // Display jobs as a table
  static jobsTable(jobs) {
    // If no jobs, show message
    if (jobs.length === 0) {
      console.log(chalk.yellow("No jobs found"));
      return;
    }

    // Create table
    const table = new Table({
      head: [
        chalk.cyan("ID"),
        chalk.cyan("Command"),
        chalk.cyan("State"),
        chalk.cyan("Attempts"),
        chalk.cyan("Created At"),
      ],
      colWidths: [20, 30, 12, 10, 20],
    });

    // Add each job as a row
    jobs.forEach((job) => {
      table.push([
        job.id,
        this.truncate(job.command, 27),
        this.colorState(job.state),
        `${job.attempts}/${job.max_retries}`,
        this.formatDate(job.created_at),
      ]);
    });

    console.log(table.toString());
  }

  // Display stats as a table
  static statsTable(stats) {
    const table = new Table({
      head: ["State", "Count"],
      style: { head: ["cyan"] },
    });

    // Make sure we include all states
    const stateCounts = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      dead: 0, // ← Make sure this is here!
      ...stats,
    };

    Object.entries(stateCounts).forEach(([state, count]) => {
      table.push([state, count]);
    });

    console.log(table.toString());
  }

  // Color the state based on its value
  static colorState(state) {
    const colors = {
      pending: chalk.yellow,
      processing: chalk.blue,
      completed: chalk.green,
      failed: chalk.red,
      dead: chalk.gray,
    };

    return (colors[state] || chalk.white)(state);
  }

  // Truncate long strings
  static truncate(str, length) {
    if (str.length <= length) return str;
    return str.substring(0, length - 3) + "...";
  }

  // Format ISO date to readable format
  static formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
}

// Modern export
export default Display;
