import express from "express";
import cors from "cors";
import 'dotenv/config';
import sequelize, { testConnection } from "./config/db.js";

// Import routes
import userRouter from "./routes/user.router.js";
import matRouter from "./routes/mat.router.js";
import productRouter from "./routes/product.router.js";
import stockRouter from "./routes/stock.router.js";
import saleRouter from "./routes/sale.router.js";
import billRouter from "./routes/bill.router.js";
import customerRouter from "./routes/customer.router.js";
import vendorRouter from "./routes/vendor.router.js";
import conversionRouter from "./routes/conversion.router.js";
import productionRouter from "./routes/production.router.js";
import stockCurrentRouter from "./routes/stockCurrent.routes.js";
// ... other route imports

// Request / tracing middlewares
import requestLogger from './middlewares/request.logger.js';
import idDisplayer from './middlewares/id.displayer.js';
import errorLogger from './middlewares/error.logger.js';
import cacheMiddleware from './middlewares/cache.middleware.js';
import './models/associations.js';

// Cron Jobs
import initMonthlySummaryCron from './tasks/monthlySummaryCron.js';




const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration (Option 3 - detect environment)
// Build allowed origins list from env (preferred) or sensible defaults.
// Normalize entries: strip quotes, add protocol if missing, remove paths, dedupe.
const parseAllowedOrigins = (raw) => {
    if (!raw) return [];
    const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
    const origins = parts.map(p => {
        // remove surrounding quotes if any
        let v = p.replace(/^\"+|\"+$/g, '').replace(/^\'+|\'+$/g, '');
        try {
            // Try to parse as URL; if it contains a path, URL.origin will strip it
            const u = new URL(v);
            return u.origin;
        } catch (e) {
            try {
                // Prepend http if protocol missing
                const u2 = new URL('http://' + v);
                return u2.origin;
            } catch (e2) {
                return null;
            }
        }
    }).filter(Boolean);
    // dedupe while preserving order
    return Array.from(new Set(origins));
};

let allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
if (!allowedOrigins || allowedOrigins.length === 0) {
    allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://ihsanmhd-mr.github.io'
    ];
}

app.use(cors({
    origin: (origin, callback) => {
        // Allow server-to-server or curl requests with no origin
        if (!origin) return callback(null, true);

        // In development allow local origins; in production allow ALLOWED_ORIGINS or GitHub Pages
        if (process.env.NODE_ENV === 'production') {
            const isGitHubPages = origin.endsWith('.github.io') || origin === 'https://ihsanmhd-mr.github.io';
            const allowed = allowedOrigins.includes(origin) || isGitHubPages;
            if (!allowed) return callback(new Error('CORS blocked'));
            return callback(null, true);
        }

        // development: allow specified local origins
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('CORS blocked in dev'));
    },
    credentials: true
}));

// Render sometimes strips headers; add a fallback that echoes origin when allowed
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
        res.header('Access-Control-Allow-Origin', '*');
    } else {
        // default to first allowed origin to avoid blocking proxies; override in production via env
        res.header('Access-Control-Allow-Origin', allowedOrigins[0] || '*');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

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







        // Global cache middleware for GET endpoints (caches responses)
        app.use(cacheMiddleware);

        // Routes
        app.use("/users", userRouter);
        app.use("/material", matRouter);
        app.use("/product", productRouter);
        app.use("/stock", stockRouter);
        app.use("/sales", saleRouter);
        app.use("/bills", billRouter);
        app.use("/customer", customerRouter);
        app.use("/vendor", vendorRouter);
        app.use("/conversion", conversionRouter);
        app.use("/production", productionRouter);
        app.use("/stock-current", stockCurrentRouter);
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
            
            // Initialize Cron Jobs
            if (process.env.ENABLE_CRON_JOBS !== 'false') {
                initMonthlySummaryCron();
            }
        });

    } catch (error) {
        console.error('Server initialization failed:', error);
        process.exit(1);
    }
};

initializeServer();