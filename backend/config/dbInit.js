import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'postgres';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432');
const dbName = process.env.DB_NAME || 'medicare';

const initDatabase = async () => {
  // Connect to the default 'postgres' database to check/create the target database
  const client = new pg.Client({
    user: dbUser,
    password: dbPassword,
    host: dbHost,
    port: dbPort,
    database: 'postgres'
  });

  try {
    console.log(`Connecting to PostgreSQL at ${dbHost}:${dbPort} as user "${dbUser}"...`);
    await client.connect();
    
    // Check if target database exists
    const checkQuery = `SELECT 1 FROM pg_database WHERE datname = $1`;
    const res = await client.query(checkQuery, [dbName]);
    
    if (res.rowCount === 0) {
      console.log(`Database "${dbName}" does not exist. Attempting to create it...`);
      // CREATE DATABASE cannot run inside a transaction block or with parameters, so we do standard string injection safely since we checked the variable
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database "${dbName}" created successfully.`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('\n=========================================================');
    console.error('[DATABASE CONNECTION ERROR]');
    console.error('Failed to connect to the PostgreSQL server.');
    console.error('Details:', error.message);
    console.error('---------------------------------------------------------');
    console.error('Please verify that:');
    console.error('  1. PostgreSQL is installed and active on your system.');
    console.error('  2. The credentials in backend/.env match your local setup.');
    console.error('  3. PostgreSQL is listening on port', dbPort);
    console.error('=========================================================\n');
    process.exit(1);
  }
};

initDatabase();
