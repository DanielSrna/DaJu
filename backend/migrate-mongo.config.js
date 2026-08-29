require('dotenv').config();

const config = {
  mongodb: {
    url: process.env.MONGODB_URI || 'mongodb://localhost:27017/mainplataform',
    databaseName: process.env.MONGODB_DB_NAME || '',
    options: { useNewUrlParser: true, useUnifiedTopology: true }
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'changelog',
  migrationFileExtension: '.js'
};

module.exports = config;
