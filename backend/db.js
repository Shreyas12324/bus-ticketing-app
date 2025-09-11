const { Sequelize } = require('sequelize');
const dns = require('dns');
// Force IPv4 resolution globally
if (typeof dns.setDefaultResultOrder === 'function') {
  try {
    dns.setDefaultResultOrder('ipv4first');
  } catch (_) {
    // ignore if not supported
  }
}

// Override DNS lookup to force IPv4
const originalLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  return originalLookup(hostname, { ...options, family: 4 }, callback);
};
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
    // Force IPv4 DNS resolution to avoid ENETUNREACH on IPv6-only addresses in some hosts
    lookup: (hostname, options, callback) => {
      return dns.lookup(hostname, { ...options, family: 4, all: false }, callback);
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


