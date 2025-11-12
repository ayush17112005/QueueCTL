import axios from "axios";

const API_BASE = "http://localhost:3001/api";

export const api = {
  getStatus: () => axios.get(`${API_BASE}/status`),

  getJobs: (state) => {
    const url = state ? `${API_BASE}/jobs?state=${state}` : `${API_BASE}/jobs`;
    return axios.get(url);
  },

  enqueueJob: (job) => axios.post(`${API_BASE}/jobs`, job),

  getDLQ: () => axios.get(`${API_BASE}/dlq`),

  retryJob: (jobId) => axios.post(`${API_BASE}/dlq/${jobId}/retry`),

  startWorkers: (count) => axios.post(`${API_BASE}/workers/start`, { count }),

  stopWorkers: () => axios.post(`${API_BASE}/workers/stop`),
};
