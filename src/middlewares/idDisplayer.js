// Middleware to display traceId at request start and log exit with status and duration
export default function idDisplayer(req, res, next) {
  const traceId = req.traceId || req.requestId || 'no-trace';
  const start = Date.now();
  console.log(`[IdDisplay][${traceId}] Entering ${req.method} ${req.originalUrl}`);

  // On finish log status and duration
  const onFinish = () => {
    res.removeListener('finish', onFinish);
    res.removeListener('close', onClose);
    const duration = Date.now() - start;
    console.log(`[IdDisplay][${traceId}] Exiting ${req.method} ${req.originalUrl} - status=${res.statusCode} duration=${duration}ms`);
  };

  const onClose = () => {
    res.removeListener('finish', onFinish);
    res.removeListener('close', onClose);
    const duration = Date.now() - start;
    console.log(`[IdDisplay][${traceId}] Connection closed for ${req.method} ${req.originalUrl} - status=${res.statusCode} duration=${duration}ms`);
  };

  res.on('finish', onFinish);
  res.on('close', onClose);

  next();
}
