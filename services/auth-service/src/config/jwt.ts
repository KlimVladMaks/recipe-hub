import dotenv from 'dotenv';
dotenv.config();

export const jwtConfig = {
  secret: process.env.JWT_SECRET || 'default-secret',
  expiresIn: '1h',
};