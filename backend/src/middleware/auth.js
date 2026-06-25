import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from './error.js';

// Verifies the Bearer token and attaches { id, role, email } to req.user.
export function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return next(new ApiError(401, 'Authentication required.'));
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired session. Please sign in again.'));
  }
}

// Restricts a route to one or more roles (e.g. requireRole('ADMIN')).
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new ApiError(401, 'Authentication required.'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    }
    next();
  };
}
