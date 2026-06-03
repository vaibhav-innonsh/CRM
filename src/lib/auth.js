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
    let decoded = null;

    // 1. Check Authorization Header (Bearer token)
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      decoded = verifyToken(token);
    } else {
      // 2. Check HTTP-only cookies
      const cookieHeader = req.headers.get('cookie') || '';
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map((c) => c.trim().split('='))
      );
      const token = cookies['token'];

      if (token) {
        decoded = verifyToken(token);
      }
    }

    if (decoded) {
      // STRICT MULTI-TENANT ISOLATION GATING:
      // Non-superadmins must have a valid orgId inside their session token to access any API.
      // If it is a legacy single-tenant session token without orgId, invalidate it immediately.
      if (!decoded.isSuperAdmin && !decoded.orgId) {
        console.warn(`⚠️ Security Alert: Rejected legacy token without orgId for user ${decoded.email}`);
        return null;
      }
      return decoded;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Verifies if the requester has active access to a specific CRM module
 * @param {object} decodedUser - Decoded JWT payload
 * @param {string} moduleName - Name of module to gate
 * @returns {boolean} Access status
 */
export function checkModuleAccess(decodedUser, moduleName) {
  if (!decodedUser) return false;
  if (decodedUser.isSuperAdmin) return true; // Super Admins bypass all module checks
  if (!decodedUser.enabledModules) return true; // Fallback for backward compatibility
  return decodedUser.enabledModules.includes(moduleName);
}

