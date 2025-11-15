import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

// Create our Database class
class QueueDatabase {
  // Constructor runs when we do: new QueueDatabase()
  constructor(dbPath = "./data/queue.db") {
    // Make sure the 'data' folder exists
    const dir = path.dirname(dbPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Open/create the database file
    this.db = new Database(dbPath);

    // Use WAL mode for better concurrency
    this.db.pragma("journal_mode = WAL");

    // Create tables
    this.migrate();
  }

  // Create database tables
  migrate() {
    // Create jobs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        command TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        next_retry_at TEXT,
        
        worker_id TEXT,
        started_at TEXT,
        completed_at TEXT,
        
        exit_code INTEGER,
        output TEXT,
        error TEXT
      )
    `);

    // Create config table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    // Create indexes for faster searching
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_jobs_state ON jobs(state);
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_jobs_next_retry ON jobs(next_retry_at);
    `);

    // console.log("✓ Database initialized");
  }

  // Add a new job to database
  insertJob(job) {
    // Prepare SQL statement
    const stmt = this.db.prepare(`
      INSERT INTO jobs (
        id, command, state, attempts, max_retries,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Get current time
    const now = new Date().toISOString();

    // Execute the insert
    stmt.run(
      job.id,
      job.command,
      job.state || "pending",
      job.attempts || 0,
      job.max_retries || 3,
      now,
      now
    );

    // Return the complete job
    return this.getJob(job.id);
  }

  // Get a single job by ID
  getJob(jobId) {
    const stmt = this.db.prepare("SELECT * FROM jobs WHERE id = ?");
    return stmt.get(jobId);
  }

  // List jobs with optional filters
  listJobs(filters = {}) {
    // Start building the query
    let query = "SELECT * FROM jobs";
    const params = [];

    // Add WHERE clause if filtering by state
    if (filters.state) {
      query += " WHERE state = ?";
      params.push(filters.state);
    }

    // Sort by newest first
    query += " ORDER BY created_at DESC";

    // Add limit if specified
    if (filters.limit) {
      query += " LIMIT ?";
      params.push(filters.limit);
    }

    // Execute and return results
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }

  // Update a job's state and metadata
  updateJobState(jobId, state, metadata = {}) {
    // Combine state and metadata
    const updates = {
      state: state,
      updated_at: new Date().toISOString(),
      ...metadata,
    };

    // Build dynamic SQL
    const fields = Object.keys(updates)
      .map((key) => `${key} = ?`)
      .join(", ");
    const values = Object.values(updates);

    // Execute update
    const stmt = this.db.prepare(`
      UPDATE jobs SET ${fields} WHERE id = ?
    `);

    stmt.run(...values, jobId);

    return this.getJob(jobId);
  }

  // ATOMIC: Claim a job for a worker (prevents race conditions!)
  claimJob(workerId) {
    const now = new Date().toISOString();

    // Find and claim a pending job in ONE atomic operation
    const stmt = this.db.prepare(`
      UPDATE jobs 
      SET 
        state = 'processing',
        worker_id = ?,
        started_at = ?,
        updated_at = ?
      WHERE id = (
        SELECT id FROM jobs 
        WHERE state = 'pending' 
          AND (next_retry_at IS NULL OR next_retry_at <= ?)
        ORDER BY created_at ASC
        LIMIT 1
      )
      RETURNING *
    `);
    //returns the updated job row with RETURNING *
    //function return the updated job object
    return stmt.get(workerId, now, now, now);
  }

  // Get statistics (count by state)
  getStats() {
    const stmt = this.db.prepare(`
      SELECT 
        state,
        COUNT(*) as count
      FROM jobs
      GROUP BY state
    `);

    const rows = stmt.all();

    // Initialize stats
    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      dead: 0,
    };

    // Fill in actual counts
    rows.forEach((row) => {
      stats[row.state] = row.count;
    });

    return stats;
  }

  // Get config value
  getConfig(key) {
    const stmt = this.db.prepare("SELECT value FROM config WHERE key = ?");
    const row = stmt.get(key);
    return row ? row.value : null;
  }

  // Set config value
  setConfig(key, value) {
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO config (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);

    stmt.run(key, value, now);
  }

  // Close database connection
  close() {
    this.db.close();
  }
}

// Modern ES Module export
export default QueueDatabase;
