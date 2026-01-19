module.exports = {
  apps: [
    {
      name: 'router-management-api',
      script: './dist/index.js',
      instances: 2, // For 1-2 core server, 2 instances is optimal
      exec_mode: 'cluster', // Enable cluster mode for load balancing

      // Environment variables
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },

      // Auto restart configuration
      autorestart: true,
      watch: false, // NEVER use watch in production
      max_memory_restart: '500M', // Restart if memory exceeds 500MB

      // Logging
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Advanced features
      kill_timeout: 5000, // Time to wait for graceful shutdown (5s)
      wait_ready: false, // Temporarily disabled to see actual error
      listen_timeout: 10000, // Max time to wait for app to listen

      // Restart strategy
      min_uptime: '10s', // Min uptime before considered started
      max_restarts: 10, // Max restarts within 1 minute before stopping

      // Source map support for better error traces
      source_map_support: true,

      // Disable automatic restart during specific hours (optional)
      // cron_restart: '0 0 * * *', // Restart every day at midnight

      // Environment-specific settings
      env: {
        NODE_ENV: 'development',
      },
    },
  ],

  // Deployment configuration (optional - for PM2 deploy command)
  deploy: {
    production: {
      user: 'deploy', // Change to your server username
      host: 'your-server.com', // Change to your server IP/domain
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/router-management.git', // Change to your repo
      path: '/var/www/router-management',
      'post-deploy': 'cd backend && npm install && npm run build && pm2 reload ecosystem.config.js --env production',
    },
  },
};
