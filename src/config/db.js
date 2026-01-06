import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Initialize dotenv
dotenv.config();

// Query logging with performance timing
const queryLogger = (query, timing) => {
  const executionTime = timing || 0;
  
  // Only log slow queries (> 100ms) in production
  if (process.env.NODE_ENV === 'production' && executionTime < 100) {
    return;
  }
  
  // Color code by performance
  const color = executionTime > 1000 ? '\x1b[31m' : executionTime > 500 ? '\x1b[33m' : '\x1b[32m';
  const reset = '\x1b[0m';
  
  if (process.env.LOG_SQL === 'true' || executionTime > 500) {
    console.log(`${color}[SQL ${executionTime}ms]${reset}`, query.substring(0, 200));
    if (executionTime > 1000) {
      console.warn('⚠️  SLOW QUERY DETECTED (>1s)');
    }
  }
};

// Support both cloud (DATABASE_URL) and local database configurations
let sequelize;
console.log('Database URL:', process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
    // Cloud database (Neon or similar)
    console.log('🌐 Using cloud database (DATABASE_URL)');
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: queryLogger,
        benchmark: true, // Enable timing
        pool: {
            max: 10, // Increased from 5
            min: 2,  // Increased from 0
            acquire: 30000,
            idle: 10000
        },
        ssl: true,
        native: false
    });
} else {
    // Local database
    const { DB_NAME, DB_USER, DB_PASS, DB_HOST, DB_PORT } = process.env;
    console.log('🏠 Using local database');
    sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
        host: DB_HOST || 'localhost',
        port: DB_PORT || 5432,
        dialect: 'postgres',
        logging: queryLogger,
        benchmark: true, // Enable timing
        pool: {
            max: 10, // Increased from 5
            min: 2,  // Increased from 0
            acquire: 30000,
            idle: 10000
        }
    });
}

// Test database connection function
export const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully');
        return true;
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        return false;
    }
};

// // Just syncs models without changing existing tables
// await sequelize.sync();
// // Drops all tables and recreates them
// await sequelize.sync({ force: true });
// // Modifies existing tables to match models
// await sequelize.sync({ alter: true });

export default sequelize;