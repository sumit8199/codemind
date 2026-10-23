import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { getDatabase } from '../db/index.js';
import { User } from '../types/index.js';

export class AuthService {
  static async register(email: string, password: string, displayName?: string): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
    const db = await getDatabase();
    const existing = await db.getUserByEmail(email);
    if (existing) {
      throw new Error('USER_ALREADY_EXISTS');
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user = await db.createUser({
      id: uuidv4(),
      email,
      password_hash,
      display_name: displayName || null,
    });

    const token = this.generateToken(user.id, user.email);
    const { password_hash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  static async login(email: string, password: string): Promise<{ user: Omit<User, 'password_hash'>; token: string }> {
    const db = await getDatabase();
    const user = await db.getUserByEmail(email);
    if (!user) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const token = this.generateToken(user.id, user.email);
    const { password_hash: _, ...safeUser } = user;
    return { user: safeUser, token };
  }

  static generateToken(userId: string, email: string): string {
    return jwt.sign(
      { sub: userId, email },
      config.JWT_ACCESS_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN }
    );
  }

  static verifyToken(token: string): { sub: string; email: string } {
    return jwt.verify(token, config.JWT_ACCESS_SECRET) as { sub: string; email: string };
  }
}
