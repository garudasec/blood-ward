import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import AppError from '../utils/appError.js';

export const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.token;

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Authentication required. Please log in.', 401));
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return next(new AppError('Server authentication misconfigured.', 500));
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return next(new AppError('Invalid or expired session. Please log in again.', 401));
    }

    const currentUser = await User.findById(decoded.id);

    if (!currentUser) {
      return next(new AppError('The user belonging to this session no longer exists.', 401));
    }

    if (currentUser.isBlocked) {
      return next(new AppError('Your account has been blocked by system administration.', 403));
    }

    req.user = currentUser;
    next();
  } catch (error) {
    next(error);
  }
};
