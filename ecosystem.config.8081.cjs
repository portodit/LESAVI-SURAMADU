module.exports = {
  apps: [{
    name: 'lesavi-suramadu-8081',
    script: './start-api-8081.sh',
    cwd: '/home/ivalora/LESAVI-SURAMADU',
    interpreter: 'bash',
    env: {
      NODE_ENV: 'production',
    }
  }]
};
