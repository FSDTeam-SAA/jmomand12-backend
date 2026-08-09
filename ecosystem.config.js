module.exports = {
  apps: [
    {
      name: 'discount-api',
      script: 'dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      max_memory_restart: '2048M',
      env: {
        NODE_ENV: 'production',
        PORT: '5001',
      },
    },
  ],
};
