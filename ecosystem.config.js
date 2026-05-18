module.exports = {
  apps: [
    {
      name: "stockflow-api",
      script: "src/server.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
      },
      error_file: "/var/log/stockflow/error.log",
      out_file: "/var/log/stockflow/out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
};
