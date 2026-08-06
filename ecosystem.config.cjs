module.exports = {
  apps: [
    {
      name: 'zi-pay',
      cwd: './backend',
      script: 'dist/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      restart_delay: 3000,
      max_memory_restart: '512M',
    },
  ],
};

