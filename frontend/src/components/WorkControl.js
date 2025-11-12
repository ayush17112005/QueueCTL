import React, { useState } from "react";
import { api } from "../services/api";

export default function WorkerControl({ status, onUpdate }) {
  const [workerCount, setWorkerCount] = useState(1);

  const handleStart = async () => {
    try {
      await api.startWorkers(parseInt(workerCount));
      alert(`Started ${workerCount} worker(s)`);
      onUpdate();
    } catch (error) {
      alert("Error starting workers: " + error.message);
    }
  };

  const handleStop = async () => {
    try {
      await api.stopWorkers();
      alert("Stopping workers...");
      onUpdate();
    } catch (error) {
      alert("Error stopping workers: " + error.message);
    }
  };

  return (
    <div className="worker-control">
      <h2>⚙️ Worker Control</h2>
      <div className="worker-info">
        <p>
          Active Workers: <strong>{status?.workers?.active || 0}</strong>
        </p>
        <p>
          Processing Jobs: <strong>{status?.workers?.processing || 0}</strong>
        </p>
      </div>
      <div className="worker-actions">
        <div className="form-group">
          <label>Number of Workers:</label>
          <input
            type="number"
            value={workerCount}
            onChange={(e) => setWorkerCount(e.target.value)}
            min="1"
            max="10"
          />
        </div>
        <button onClick={handleStart} className="btn btn-success">
          Start Workers
        </button>
        <button onClick={handleStop} className="btn btn-danger">
          Stop All Workers
        </button>
      </div>
    </div>
  );
}
