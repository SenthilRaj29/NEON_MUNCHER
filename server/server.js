import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import crypto from 'node:crypto';

const app = express();
const port = Number(process.env.PORT || 3000);
const jwtSecret = process.env.JWT_SECRET;
if (!process.env.MONGODB_URI || !jwtSecret) throw new Error('MONGODB_URI and JWT_SECRET are required');

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5500' }));
app.use(express.json());

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 24 },
  passwordHash: { type: String, required: true },
  resetCodeHash: { type: String },
  resetCodeExpiresAt: { type: Date },
  progress: {
    unlockedLevel: { type: Number, default: 1 },
    highScores: { type: Map, of: Number, default: {} },
    controlScheme: { type: String, enum: ['arrows', 'wasd', 'both'], default: 'both' }
  }
}, { timestamps: true });
const User = mongoose.model('User', userSchema);

function publicUser(user) {
  return { id: user.id, name: user.username, username: user.username, provider: 'password', progress: user.progress };
}
function issueToken(user) { return jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: '30d' }); }
function authRequired(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    req.userId = jwt.verify(token, jwtSecret).sub;
    next();
  } catch { res.status(401).json({ message: 'Please sign in again.' }); }
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '');
    if (username.length < 3 || password.length < 8) return res.status(400).json({ message: 'Username needs 3 characters and password needs 8.' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, passwordHash });
    res.status(201).json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 400).json({ message: error.code === 11000 ? 'That username is already taken.' : 'Unable to register.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const user = await User.findOne({ username: String(req.body.username || '').trim() });
  if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.passwordHash))) return res.status(401).json({ message: 'Username or password is incorrect.' });
  res.json({ token: issueToken(user), user: publicUser(user) });
});

app.post('/api/auth/forgot-password', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const user = await User.findOne({ username });
  if (!user) return res.json({ message: 'If that account exists, reset instructions were sent.' });
  const resetCode = crypto.randomInt(100000, 999999).toString();
  user.resetCodeHash = await bcrypt.hash(resetCode, 10);
  user.resetCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await user.save();
  res.json({ message: 'Reset code generated. It expires in 15 minutes.', resetCode });
});

app.post('/api/auth/reset-password', async (req, res) => {
  const username = String(req.body.username || '').trim();
  const code = String(req.body.code || '').trim();
  const password = String(req.body.password || '');
  const user = await User.findOne({ username });
  if (!user || !user.resetCodeHash || !user.resetCodeExpiresAt || user.resetCodeExpiresAt < new Date() || !(await bcrypt.compare(code, user.resetCodeHash))) return res.status(400).json({ message: 'Reset code is invalid or expired.' });
  if (password.length < 8) return res.status(400).json({ message: 'Password needs at least 8 characters.' });
  user.passwordHash = await bcrypt.hash(password, 12);
  user.resetCodeHash = undefined;
  user.resetCodeExpiresAt = undefined;
  await user.save();
  res.json({ message: 'Password reset. Return to login.' });
});

app.get('/api/progress', authRequired, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json({ progress: user.progress });
});

app.put('/api/progress', authRequired, async (req, res) => {
  const progress = req.body.progress || {};
  const user = await User.findByIdAndUpdate(req.userId, { progress }, { new: true, runValidators: true });
  if (!user) return res.status(404).json({ message: 'User not found.' });
  res.json({ progress: user.progress });
});

await mongoose.connect(process.env.MONGODB_URI);
app.listen(port, () => console.log(`Neon Muncher API listening on http://localhost:${port}`));
