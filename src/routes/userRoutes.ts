import { Router, Request, Response } from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { db } from '../db/database';
import { UserAccount } from '../types';

const router = Router();

// GET all users
router.get('/', async (req: Request, res: Response) => {
  try {
    const users = await mySQLDb.getUsers();
    res.json({ success: true, users });
  } catch (err) {
    const users = db.getUsers();
    res.json({ success: true, users });
  }
});

// GET single user by username
router.get('/:username', async (req: Request, res: Response) => {
  const { username } = req.params;
  try {
    const users = await mySQLDb.getUsers();
    const user = users.find(u => u.username.toLowerCase() === String(username).toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (err) {
    const users = db.getUsers();
    const user = users.find(u => u.username.toLowerCase() === String(username).toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, user });
  }
});

// POST create new user
router.post('/', async (req: Request, res: Response) => {
  const { id, username, displayName, email, role, status, password } = req.body;

  if (!username || !displayName || !email || !role) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const newUser: UserAccount = {
    id: id || `usr-${Date.now()}`,
    username,
    displayName,
    email,
    password: password || 'ChangeMe123!',
    role: role || 'staff',
    status: status || 'Active',
    createdAt: new Date().toISOString().split('T')[0]
  };

  try {
    await mySQLDb.saveUser(newUser);
    res.status(201).json({ success: true, user: newUser });
  } catch (err) {
    const users = db.getUsers();
    users.push(newUser);
    db.setUsers(users);
    res.status(201).json({ success: true, user: newUser });
  }
});

// PATCH toggle user status
router.patch('/:id/status', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body || {};
  try {
    await mySQLDb.toggleUserStatus(String(id), status);
    const users = db.getUsers();
    const user = users.find(u => u.id === id || u.username.toLowerCase() === String(id).toLowerCase());
    if (user) {
      user.status = status || (user.status === 'Active' ? 'Inactive' : 'Active');
      db.setUsers(users);
    }
    res.json({ success: true, message: 'User status updated' });
  } catch (err) {
    const users = db.getUsers();
    const user = users.find(u => u.id === id || u.username.toLowerCase() === String(id).toLowerCase());
    if (user) {
      user.status = status || (user.status === 'Active' ? 'Inactive' : 'Active');
      db.setUsers(users);
    }
    res.json({ success: true, message: 'User status updated' });
  }
});

export default router;
