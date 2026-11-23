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
