import AppError from '../utils/appError.js';

const notFoundHandler = (req, res, next) => {
  const msg = 'Cannot ' + req.method + ' ' + req.originalUrl + ' - Route not found';
  next(new AppError(msg, 404));
};

export default notFoundHandler;
