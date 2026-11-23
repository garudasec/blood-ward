const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let status = err.status || 'error';
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose CastError (e.g. malformed ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    status = 'fail';
    message = `Invalid format for ${err.path || 'identifier'}.`;
  }

  // Sanitize 500/internal errors in production to avoid leaking sensitive configuration, stack traces, or secrets
  if (process.env.NODE_ENV === 'production' && (!err.isOperational || statusCode >= 500)) {
    console.error(`[Server Error] ${statusCode} - ${err.message}`, err.stack);
    message = 'An unexpected server error occurred. Please try again later.';
  }

  const response = {
    success: false,
    status,
    message,
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    if (err.error) response.error = err.error;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
