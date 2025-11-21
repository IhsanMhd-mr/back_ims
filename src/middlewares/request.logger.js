// Simple request logger middleware that assigns a short requestId,
// logs basic request info and sets X-Request-Id on the response.
export default function requestLogger(req, res, next) {
  try {
    const id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  req.requestId = id;
  // provide a more semantic alias used in responses and logs
  req.traceId = id;
    const remote = req.ip || req.connection?.remoteAddress || '-';
    const origin = req.get('origin') || '-';
    console.log(`[Req ${id}] ${new Date().toISOString()} ${req.method} ${req.originalUrl} from ${remote} Origin:${origin}`);
    // expose request id to client for easier correlation
  // expose request id to client for easier correlation
  res.setHeader('X-Request-Id', id);
  // also expose with a more semantic header name commonly used by tracing systems
  res.setHeader('X-Trace-Id', id);
  } catch (err) {
    // don't crash the request pipeline if logging fails
    console.error('[requestLogger] failed to attach request id', err?.message || err);
  } finally {
    next();
  }
}
