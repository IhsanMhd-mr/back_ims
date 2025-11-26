#!/usr/bin/env node
import fs from 'fs/promises';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const SQL_FILE = new URL('./20251126-add-bill-columns.sql', import.meta.url);

async function run() {
  try {
    const sql = await fs.readFile(SQL_FILE, 'utf8');

    const client = new Client({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASS,
      port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    });

    await client.connect();
    console.log('Connected to DB. Running migration SQL...');

    // Execute the SQL file as a single query
    await client.query(sql);
    console.log('Migration SQL executed successfully.');

    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message || err);
    process.exit(1);
  }
}

run();
