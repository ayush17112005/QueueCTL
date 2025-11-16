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
    // Create jobs table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        command TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 3,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        claimed_by TEXT,
        claimed_at TEXT,
        completed_at TEXT,
        exit_code INTEGER,
        output TEXT,
        error TEXT
      )
    `);

    // Check if retry columns exist, add them if not
    try {
      this.db.exec(`
        ALTER TABLE jobs ADD COLUMN last_error TEXT;
      `);
      console.log("✓ Added last_error column");
    } catch (e) {
      // Column already exists, ignore
    }

    try {
      this.db.exec(`
        ALTER TABLE jobs ADD COLUMN retry_at TEXT;
      `);
      console.log("✓ Added retry_at column");
    } catch (e) {
      // Column already exists, ignore
    }

    try {
      this.db.exec(`
        ALTER TABLE jobs ADD COLUMN backoff_multiplier INTEGER DEFAULT 2;
      `);
      console.log("✓ Added backoff_multiplier column");
    } catch (e) {
      // Column already exists, ignore
    }

    console.log("✓ Database initialized");
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

  // Update job state
  updateJobState(jobId, state, fields = {}) {
    const updates = {
      state,
      updated_at: new Date().toISOString(),
      ...fields,
    };

    const columns = Object.keys(updates).join(" = ?, ") + " = ?";
    const values = [...Object.values(updates), jobId];

    const stmt = this.db.prepare(`
      UPDATE jobs SET ${columns} WHERE id = ?
    `);

    stmt.run(...values);
  }

  // ATOMIC: Claim a job for a worker (prevents race conditions!)
  claimJob(workerId) {
    const now = new Date().toISOString();

    // Find and claim a pending job in ONE atomic operation
    const stmt = this.db.prepare(`
      UPDATE jobs
      SET 
        state = 'processing',
        claimed_by = ?,
        claimed_at = ?,
        updated_at = ?
      WHERE id = (
        SELECT id FROM jobs
        WHERE state = 'pending'
        AND (retry_at IS NULL OR retry_at <= ?)
        ORDER BY created_at ASC
        LIMIT 1
      )
      RETURNING *
    `);

    return stmt.get(workerId, now, now, now);
  }

  // Calculate exponential backoff delay
  calculateRetryDelay(attempts, multiplier = 2) {
    // Exponential backoff: 2^attempts seconds
    // Attempt 0: 2^0 = 1 second
    // Attempt 1: 2^1 = 2 seconds
    // Attempt 2: 2^2 = 4 seconds
    // Attempt 3: 2^3 = 8 seconds
    const delaySeconds = Math.pow(multiplier, attempts);

    // Cap at 60 seconds max to avoid crazy long waits
    return Math.min(delaySeconds, 60);
  }

  // Schedule a job for retry with exponential backoff
  scheduleRetry(jobId, attempts, error) {
    const delay = this.calculateRetryDelay(attempts);
    const retryAt = new Date(Date.now() + delay * 1000).toISOString();
    const now = new Date().toISOString();

    // FIXED: Added retry_at to the UPDATE and correct parameter order
    const stmt = this.db.prepare(`
      UPDATE jobs 
      SET
        state = ?,
        attempts = ?,
        retry_at = ?,
        last_error = ?,
        updated_at = ?
      WHERE id = ?
    `);

    // FIXED: Parameters match the SQL placeholders in order
    stmt.run(
      "pending", // state
      attempts, // attempts
      retryAt, // retry_at  ← NOW INCLUDED!
      error, // last_error
      now, // updated_at
      jobId // id (WHERE clause)
    );

    console.log(
      `📅 Job ${jobId} scheduled for retry in ${delay} seconds (attempt ${attempts})`
    );

    return delay;
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

  // Auto-recover stuck jobs (been processing too long)
  recoverStuckJobs(timeoutMinutes = 5) {
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const cutoffTime = new Date(Date.now() - timeoutMs).toISOString();

    const stmt = this.db.prepare(`
    UPDATE jobs
    SET 
      state = 'pending',
      claimed_by = NULL,
      claimed_at = NULL,
      updated_at = ?
    WHERE state = 'processing'
    AND claimed_at < ?
  `);

    const result = stmt.run(new Date().toISOString(), cutoffTime);

    if (result.changes > 0) {
      console.log(
        `⚠️  Auto-recovered ${result.changes} stuck job(s) (processing > ${timeoutMinutes} min)`
      );
    }

    return result.changes;
  }

  // Close database connection
  close() {
    this.db.close();
  }
}

// Modern ES Module export
export default QueueDatabase;
