import mongoSanitize from 'express-mongo-sanitize';

const sanitizeMiddleware = (req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body);
  if (req.params) mongoSanitize.sanitize(req.params);
  if (req.query) mongoSanitize.sanitize(req.query);
  next();
};

export default sanitizeMiddleware;
