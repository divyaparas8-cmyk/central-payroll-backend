import express, { Request, Response } from 'express';
import { db } from '../db/database';
import { mySQLDb } from '../db/mysqlDatabase';
import { UserAccount } from '../types';
import { comparePassword } from '../utils/authUtils';

const router = express.Router();

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

// POST change password (for logged-in user or super admin reset)
router.post('/change-password', async (req: Request, res: Response) => {
  const { userId, username, currentPassword, newPassword } = req.body;
  const targetIdentifier = userId || username;

  if (!targetIdentifier || !newPassword) {
    return res.status(400).json({ success: false, error: 'User ID / username and new password are required.' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ success: false, error: 'Password must be at least 4 characters long.' });
  }

  try {
    const user = await mySQLDb.getUserById(targetIdentifier);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    // If currentPassword is provided (self-service password change), verify it
    if (currentPassword && user.password) {
      const { matched } = await comparePassword(currentPassword, user.password);
      if (!matched) {
        return res.status(400).json({ success: false, error: 'Current password is incorrect.' });
      }
    }

    await mySQLDb.updateUserPassword(user.id, newPassword);

    // Also update in-memory fallback
    const memUsers = db.getUsers();
    const memUser = memUsers.find(u => u.id === user.id || u.username.toLowerCase() === user.username.toLowerCase());
    if (memUser) {
      memUser.password = newPassword;
      db.setUsers(memUsers);
    }

    return res.json({
      success: true,
      message: `Password updated successfully for ${user.displayName || user.username}`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE user account
router.delete('/:id', async (req: Request, res: Response) => {
  const id = req.params.id as string;
  try {
    await mySQLDb.deleteUser(id);
    const users = db.getUsers().filter(u => u.id !== id && u.username.toLowerCase() !== id.toLowerCase());
    db.setUsers(users);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err: any) {
    const users = db.getUsers().filter(u => u.id !== id && u.username.toLowerCase() !== id.toLowerCase());
    db.setUsers(users);
    res.json({ success: true, message: 'User deleted successfully' });
  }
});

export default router;
