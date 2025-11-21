import express from "express";
import cors from "cors";
import sequelize, { testConnection } from "./config/db.js";

// Import routes
import userRouter from "./routes/userRouter.js";
import matRouter from "./routes/matRouter.js";
import productRouter from "./routes/productRouter.js";
import stockRouter from "./routes/stockRouter.js";
import saleRouter from "./routes/saleRouter.js";
import billRouter from "./routes/billRouter.js";
// ... other route imports

// Request / tracing middlewares
import requestLogger from './middlewares/requestLogger.js';
import idDisplayer from './middlewares/idDisplayer.js';
import errorLogger from './middlewares/errorLogger.js';




const app = express();
const PORT = process.env.PORT || 3000;

// Define CORS options
// In development explicitly allow Vite dev server origins used by preview (4173) and dev (5173)
const DEV_FRONTEND_ORIGINS = (process.env.DEV_FRONTEND_ORIGINS || 'http://localhost:5173,http://localhost:4173')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like curl) or from allowed dev origins
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV === 'production') {
            const allowed = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : [];
            return callback(null, allowed.includes(origin));
        }
        // development - check against local allowed list
        return callback(null, DEV_FRONTEND_ORIGINS.includes(origin));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'X-Requested-With',
        'Authorization'
    ],
    // Allow credentials when we have a specific origin
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Request logger (assigns short requestId and logs basic request info)
app.use(requestLogger);
// Display trace id and timing for each request
app.use(idDisplayer);

// Initialize server with database connection
const initializeServer = async () => {
    try {
        // Test database connection
        const isConnected = await testConnection();
        if (!isConnected) {
            throw new Error('Database connection failed');
        }

        // Sync database models
        await sequelize.sync({ force: false });
        // await sequelize.sync({ force: false,alter: true });
        // await sequelize.sync({ alter: true });

        console.log('Database models synchronized');







        // Routes
        app.use("/users", userRouter);
        app.use("/material", matRouter);
        app.use("/product", productRouter);
        app.use("/stock", stockRouter);
        app.use("/sales", saleRouter);
        app.use("/bills", billRouter);
        // ... other routes

    // Error logger middleware: log error with traceId then forward to global handler
    app.use(errorLogger);

        // Global error handler - ensures a consistent error response and includes traceId for correlation
        app.use((err, req, res, next) => {
            const traceId = req?.traceId || req?.requestId || 'no-trace';
            console.error(`[GlobalError][${traceId}]`, err?.stack || err);
            res.status(500).json({
                success: false,
                message: 'Internal Server Error',
                traceId,
                error: process.env.NODE_ENV === 'development' ? String(err?.message || err) : undefined
            });
        });

        // Start server
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('Server initialization failed:', error);
        process.exit(1);
    }
};

initializeServer();