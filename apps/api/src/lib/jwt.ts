import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret';

export function signAccess(
  payload: object,
  expiresIn: SignOptions['expiresIn'] = '15m'
) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function signRefresh(
  payload: object,
  expiresIn: SignOptions['expiresIn'] = '30d'
) {
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn });
}

export function verifyAccess(token: string) {
  return jwt.verify(token, JWT_SECRET);
}

export function verifyRefresh(token: string) {
  return jwt.verify(token, JWT_REFRESH_SECRET);
}