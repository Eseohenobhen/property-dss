import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { ApiError, asyncHandler } from '../middleware/error.js';
import { ok } from '../utils/serialize.js';
import { registerSchema, loginSchema } from '../utils/validation.js';

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

function publicUser(user) {
  return { id: user.id, fullName: user.fullName, email: user.email, role: user.role, createdAt: user.createdAt };
}

export const register = asyncHandler(async (req, res) => {
  const input = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ApiError(409, 'An account with that email already exists.');

  const passwordHash = await bcrypt.hash(input.password, 10);
  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      role: 'MANAGER',
    },
  });

  const token = signToken(user);
  ok(res, { token, user: publicUser(user) }, 201);
});

export const login = asyncHandler(async (req, res) => {
  const input = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw new ApiError(401, 'Invalid email or password.');

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'Invalid email or password.');

  const token = signToken(user);
  ok(res, { token, user: publicUser(user) });
});

export const me = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw new ApiError(404, 'User not found.');
  ok(res, { user: publicUser(user) });
});
