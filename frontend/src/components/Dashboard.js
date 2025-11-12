import React from "react";

export default function Dashboard({ status }) {
  if (!status) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <h2>📊 System Status</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{status.total}</div>
          <div className="stat-label">Total Jobs</div>
        </div>
        <div className="stat-card pending">
          <div className="stat-value">{status.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card processing">
          <div className="stat-value">{status.processing}</div>
          <div className="stat-label">Processing</div>
        </div>
        <div className="stat-card completed">
          <div className="stat-value">{status.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card failed">
          <div className="stat-value">{status.failed}</div>
          <div className="stat-label">Failed</div>
        </div>
        <div className="stat-card dead">
          <div className="stat-value">{status.dead}</div>
          <div className="stat-label">Dead (DLQ)</div>
        </div>
        <div className="stat-card workers">
          <div className="stat-value">{status.workers?.active || 0}</div>
          <div className="stat-label">Active Workers</div>
        </div>
      </div>
    </div>
  );
}
