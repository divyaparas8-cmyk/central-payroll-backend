import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'central_dispatch_payroll_jwt_super_secret_key_2026_bermuda_live';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const SALT_ROUNDS = 10;

/**
 * Checks if a string is already a valid bcrypt hash
 */
export function isBcryptHash(str?: string): boolean {
  if (!str) return false;
  // Bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 characters long
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(str);
}

/**
 * Hash plain-text password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password) {
    password = 'ChangeMe123!';
  }
  // If already hashed, return as is
  if (isBcryptHash(password)) {
    return password;
  }
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare plain-text password with stored hash (supports safe fallback if legacy plaintext)
 */
export async function comparePassword(password: string, storedHashOrPlain: string): Promise<{ matched: boolean; needsRehash: boolean }> {
  if (!storedHashOrPlain || !password) {
    return { matched: false, needsRehash: false };
  }

  if (isBcryptHash(storedHashOrPlain)) {
    const matched = await bcrypt.compare(password, storedHashOrPlain);
    return { matched, needsRehash: false };
  }

  // Legacy fallback: plain text equality
  const matched = password === storedHashOrPlain;
  return { matched, needsRehash: matched };
}

/**
 * Generate real signed JWT token
 */
export function generateToken(payload: { id: string; username: string; role: string; displayName?: string; email?: string }): string {
  return jwt.sign(
    {
      id: payload.id,
      username: payload.username,
      role: payload.role,
      displayName: payload.displayName,
      email: payload.email
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN
    } as jwt.SignOptions
  );
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}
