const { Sequelize } = require('sequelize');
require('dotenv').config();

// Initialize Sequelize with Supabase Postgres connection string
const sequelize = new Sequelize(process.env.SUPABASE_DB_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    // Sync models; in dev this creates tables if they don't exist
    await sequelize.sync();
    console.log('Database connected and models synchronized');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
}

module.exports = {
  sequelize,
  initializeDatabase,
};


