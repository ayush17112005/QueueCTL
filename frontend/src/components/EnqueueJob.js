import React, { useState } from "react";
import { api } from "../services/api";

export default function EnqueueJob({ onJobEnqueued }) {
  const [command, setCommand] = useState("");
  const [maxRetries, setMaxRetries] = useState(3);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.enqueueJob({
        command,
        max_retries: parseInt(maxRetries),
      });
      setCommand("");
      alert("Job enqueued successfully!");
      onJobEnqueued();
    } catch (error) {
      alert("Error enqueueing job: " + error.message);
    }
  };

  return (
    <div className="enqueue-section">
      <h2>➕ Enqueue New Job</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Command:</label>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="e.g., echo 'Hello World'"
            required
          />
        </div>
        <div className="form-group">
          <label>Max Retries:</label>
          <input
            type="number"
            value={maxRetries}
            onChange={(e) => setMaxRetries(e.target.value)}
            min="0"
            max="10"
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Enqueue Job
        </button>
      </form>
    </div>
  );
}
