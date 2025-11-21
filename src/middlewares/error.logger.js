// Error-logging middleware: logs errors with traceId then forwards to next error handler
export default function errorLogger(err, req, res, next) {
  try {
    const traceId = req?.traceId || req?.requestId || 'no-trace';
    console.error(`[ErrorLogger][${traceId}] Error encountered:`, err?.message || err);
    if (err?.stack) console.error(err.stack);
  } catch (loggingErr) {
    console.error('[ErrorLogger] failed to log error', loggingErr);
  }
  // forward to next error handler (global handler will send response)
  next(err);
}
