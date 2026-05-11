import bcrypt from 'bcryptjs';
import jwt, {Secret, SignOptions} from 'jsonwebtoken';

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'change_this_secret';
const JWT_EXPIRES_IN = (process.env.TOKEN_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

export function hashPassword(password: string) {
  return bcrypt.hashSync(password, 8);
}

export function comparePassword(password: string, hash: string) {
  return bcrypt.compareSync(password, hash);
}

export function createToken(userId: string) {
  return jwt.sign({userId}, JWT_SECRET, {expiresIn: JWT_EXPIRES_IN});
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET) as {userId: string};
}
