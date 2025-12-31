import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Initialize dotenv
dotenv.config();

// Support both cloud (DATABASE_URL) and local database configurations
let sequelize;
console.log('Database URL:', process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
    // Cloud database (Neon or similar)
    console.log('🌐 Using cloud database (DATABASE_URL)');
    sequelize = new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false, // Set to console.log to see SQL queries
        pool: {
            max: 5,
            min: 0,
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
        logging: false, // Set to console.log to see SQL queries
        pool: {
            max: 5,
            min: 0,
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