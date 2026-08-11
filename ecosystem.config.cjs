module.exports = {
  apps: [
    {
      name: 'zi-pay',
      cwd: './backend',
      script: 'dist/server.js',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 5001,
      },
      restart_delay: 3000,
      max_memory_restart: '512M',
      kill_timeout: 10000,
    },
  ],
};
