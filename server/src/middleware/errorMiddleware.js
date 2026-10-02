const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  const response = {
    success: false,
    status,
    message: err.message || 'Internal Server Error',
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    if (err.error) response.error = err.error;
  }

  res.status(statusCode).json(response);
};

export default errorHandler;
