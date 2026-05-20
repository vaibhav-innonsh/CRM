import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_crm_jwt_secret_token';

/**
 * Hash a plain text password using bcrypt
 * @param {string} password 
 * @returns {Promise<string>} hashed password
 */
export async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compare plain password with stored hashed password
 * @param {string} password 
 * @param {string} hashedPassword 
 * @returns {Promise<boolean>} match status
 */
export async function comparePassword(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Sign a new JWT session token
 * @param {object} payload - user data like id, email, role
 * @returns {string} signed JWT token
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d', // Session valid for 7 days
  });
}

/**
 * Verify a JWT session token
 * @param {string} token 
 * @returns {object|null} decoded payload or null if invalid
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Extracts and verifies JWT from Next.js request headers or cookies
 * @param {Request} req - Next.js App Router Request object
 * @returns {object|null} Decoded user object or null if unauthorized
 */
export function getUserFromRequest(req) {
  try {
    // 1. Check Authorization Header (Bearer token)
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      return verifyToken(token);
    }

    // 2. Check HTTP-only cookies
    const cookieHeader = req.headers.get('cookie') || '';
    const cookies = Object.fromEntries(
      cookieHeader.split(';').map((c) => c.trim().split('='))
    );
    const token = cookies['token'];

    if (token) {
      return verifyToken(token);
    }

    return null;
  } catch (error) {
    return null;
  }
}
