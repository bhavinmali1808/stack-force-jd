module.exports = {
  apps: [
    {
      name: "mail-api",
      script: "src/index.js",
      instances: "max",       // Spawns 1 instance per CPU core (Cluster Mode)
      exec_mode: "cluster",   // Enables Node.js cluster load balancing
      env: {
        NODE_ENV: "production",
        PORT: 3001
      }
    },
    {
      name: "mail-worker",
      script: "src/workers/emailWorker.js",
      instances: 4,           // 4 parallel BullMQ worker processes pulling from Redis queue
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        EMAIL_CONCURRENCY: 5
      }
    }
  ]
};
