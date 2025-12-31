import StockSummaryService from '../services/stockSummary.service.js';

/**
 * Monthly Stock Summary Cron Job
 * 
 * Runs on the 1st of every month at 2:00 AM
 * Generates summaries for the PREVIOUS month
 * 
 * Uses setInterval with daily check instead of node-cron
 */

const CRON_HOUR = 2; // 2 AM
const CRON_DAY = 1;  // 1st of month

/**
 * Calculate the previous month and year
 * If current date is Jan 1, 2025 → returns { month: 12, year: 2024 }
 */
const getPreviousMonth = () => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    if (currentMonth === 1) {
        return { month: 12, year: currentYear - 1 };
    }
    return { month: currentMonth - 1, year: currentYear };
};

/**
 * Run the monthly summary generation
 */
const runMonthlySummaryJob = async () => {
    const startTime = new Date();
    const { month, year } = getPreviousMonth();

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[CRON] Monthly Summary Job Started`);
    console.log(`[CRON] Run Time: ${startTime.toISOString()}`);
    console.log(`[CRON] Generating summaries for: ${year}-${String(month).padStart(2, '0')}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
        const result = await StockSummaryService.generateAllMonthlySummaries({
            month,
            year,
            createdBy: null // System generated
        });

        const endTime = new Date();
        const duration = (endTime - startTime) / 1000;

        console.log(`\n${'='.repeat(60)}`);
        console.log(`[CRON] Monthly Summary Job Completed`);
        console.log(`[CRON] Duration: ${duration.toFixed(2)} seconds`);
        console.log(`[CRON] Result: ${result.message}`);
        console.log(`${'='.repeat(60)}\n`);

        return result;
    } catch (error) {
        console.error(`\n${'='.repeat(60)}`);
        console.error(`[CRON] Monthly Summary Job FAILED`);
        console.error(`[CRON] Error: ${error.message}`);
        console.error(`${'='.repeat(60)}\n`);
        throw error;
    }
};

/**
 * Check if it's time to run the cron job
 */
const checkAndRun = async () => {
    const now = new Date();
    const day = now.getDate();
    const hour = now.getHours();

    // Run on 1st of month at 2 AM
    if (day === CRON_DAY && hour === CRON_HOUR) {
        console.log(`[CRON] Scheduled time reached: ${now.toISOString()}`);
        await runMonthlySummaryJob();
    }
};

let cronInterval = null;

/**
 * Initialize the cron job (checks every hour)
 */
const initMonthlySummaryCron = () => {
    console.log(`[CRON] Monthly Summary Cron initialized`);
    console.log(`[CRON] Schedule: Day ${CRON_DAY} at ${CRON_HOUR}:00`);
    console.log(`[CRON] Next run: 1st of next month at ${CRON_HOUR}:00 AM`);

    // Check every hour
    cronInterval = setInterval(checkAndRun, 60 * 60 * 1000); // 1 hour

    // Also check immediately on startup
    checkAndRun();

    return cronInterval;
};

/**
 * Stop the cron job
 */
const stopMonthlySummaryCron = () => {
    if (cronInterval) {
        clearInterval(cronInterval);
        console.log(`[CRON] Monthly Summary Cron stopped`);
    }
};

/**
 * Manual trigger for testing (can be called from API)
 */
const triggerManualRun = async ({ month = null, year = null } = {}) => {
    if (!month || !year) {
        const prev = getPreviousMonth();
        month = prev.month;
        year = prev.year;
    }

    console.log(`[CRON] Manual trigger for ${year}-${String(month).padStart(2, '0')}`);
    
    return await StockSummaryService.generateAllMonthlySummaries({
        month,
        year,
        createdBy: null
    });
};

export {
    initMonthlySummaryCron,
    stopMonthlySummaryCron,
    runMonthlySummaryJob,
    triggerManualRun,
    getPreviousMonth
};

export default initMonthlySummaryCron;
