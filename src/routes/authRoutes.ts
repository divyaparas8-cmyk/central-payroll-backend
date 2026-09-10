import { Router, Request, Response } from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { db } from '../db/database';

const router = Router();

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username) {
    return res.status(400).json({ success: false, error: 'Username is required' });
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

  // Validate Password
  const expectedPassword = user.password || 'ChangeMe123!';
  if (password !== expectedPassword) {
    return res.status(401).json({ success: false, error: 'Invalid username or password' });
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
    token: `jwt-token-${user.id}-${Date.now()}`
  });
});

export default router;
