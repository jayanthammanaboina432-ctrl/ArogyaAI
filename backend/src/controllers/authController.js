import { User } from '../models/User.js';
import { signToken } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(req, res, next) {
  try {
    const name = (req.body.name || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const phone = (req.body.phone || '').trim();
    const password = req.body.password || '';

    if (!name || !email || !password) {
      throw new AppError(400, 'Name, email and password are required.');
    }
    if (!EMAIL_RE.test(email)) {
      throw new AppError(400, 'Please enter a valid email address.');
    }
    if (password.length < 6) {
      throw new AppError(400, 'Password must be at least 6 characters.');
    }

    const existing = await User.findOne({ email });
    if (existing) {
      throw new AppError(409, 'Email already registered.');
    }

    const user = new User({ name, email, phone });
    await user.setPassword(password);
    await user.save();

    const token = signToken(user._id.toString());
    res.status(201).json({ token, user: user.toSafeJSON() });
  } catch (err) {
    if (err.code === 11000) {
      return next(new AppError(409, 'Email already registered.'));
    }
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    if (!email || !password) {
      throw new AppError(400, 'Invalid email or password.');
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.verifyPassword(password))) {
      throw new AppError(401, 'Invalid email or password.');
    }

    const token = signToken(user._id.toString());
    res.json({ token, user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      throw new AppError(404, 'User not found.');
    }
    res.json({ user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}
