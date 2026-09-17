import { Router, Request, Response } from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { db } from '../db/database';
import { comparePassword, hashPassword, generateToken } from '../utils/authUtils';

const router = Router();

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username and password are required' });
  }

  let users: any[] = [];
  try {
    users = await mySQLDb.getUsers();
  } catch (err) {
    users = db.getUsers();
  }

  const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());

  if (!user) {
    return res.status(401).json({ success: false, error: 'Invalid username or password' });
  }

  // Validate Password with bcrypt comparison & legacy re-hash support
  const storedPassword = user.password || 'ChangeMe123!';
  const { matched, needsRehash } = await comparePassword(password, storedPassword);

  if (!matched) {
    return res.status(401).json({ success: false, error: 'Invalid username or password' });
  }

  // If password was legacy plain text, re-hash it with bcrypt immediately
  if (needsRehash) {
    user.password = await hashPassword(password);
  }

  if (user.status === 'Inactive') {
    return res.status(403).json({ success: false, error: 'Account is deactivated. Contact Super Admin.' });
  }

  user.lastLogin = new Date().toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });
  try {
    await mySQLDb.saveUser(user);
  } catch (err) {
    db.saveData();
  }

  // Generate real signed JWT token
  const token = generateToken({
    id: user.id,
    username: user.username,
    role: user.role,
    displayName: user.displayName,
    email: user.email
  });

  return res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      status: user.status,
      lastLogin: user.lastLogin
    },
    token
  });
});

export default router;
