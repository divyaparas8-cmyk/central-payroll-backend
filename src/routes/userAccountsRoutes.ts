import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { UserAccount } from '../types';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const users = await mySQLDb.getUsers();
    res.json({ success: true, count: users.length, users });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const user: UserAccount = req.body;
    if (!user.id) user.id = 'usr-' + Date.now();
    await mySQLDb.saveUser(user);
    res.status(201).json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await mySQLDb.toggleUserStatus(req.params.id, status);
    res.json({ success: true, message: 'User status updated' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST change password / reset password
router.post('/change-password', async (req, res) => {
  const { userId, username, currentPassword, newPassword } = req.body;
  const targetIdentifier = userId || username;

  if (!targetIdentifier || !newPassword) {
    return res.status(400).json({ success: false, error: 'User identifier and new password are required.' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ success: false, error: 'Password must be at least 4 characters long.' });
  }

  try {
    const user = await mySQLDb.getUserById(targetIdentifier);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found in MySQL database.' });
    }

    if (currentPassword && user.password && user.password !== currentPassword) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect.' });
    }

    await mySQLDb.updateUserPassword(user.id, newPassword);

    await mySQLDb.saveAuditLog({
      id: 'aud-' + Date.now(),
      action: 'PASSWORD_CHANGED',
      module: 'User Accounts',
      user: user.username,
      role: user.role,
      timestamp: new Date().toISOString(),
      details: `Password changed for user ${user.username}`
    });

    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST set password (for self-service link / setup link)
router.post('/set-password', async (req, res) => {
  const { username, email, token, newPassword } = req.body;
  const target = username || email;

  if (!target || !newPassword) {
    return res.status(400).json({ success: false, error: 'Username or email and new password are required.' });
  }

  if (newPassword.length < 4) {
    return res.status(400).json({ success: false, error: 'Password must be at least 4 characters long.' });
  }

  try {
    const user = await mySQLDb.getUserById(target);
    if (!user) {
      return res.status(404).json({ success: false, error: `User account '${target}' not found.` });
    }

    await mySQLDb.updateUserPassword(user.id, newPassword);

    await mySQLDb.saveAuditLog({
      id: 'aud-' + Date.now(),
      action: 'PASSWORD_RESET_SELF_SERVICE',
      module: 'User Accounts',
      user: user.username,
      role: user.role,
      timestamp: new Date().toISOString(),
      details: `Password updated via setup/reset link for user ${user.username}`
    });

    return res.json({
      success: true,
      message: `Password set successfully for ${user.displayName || user.username}. You can now sign in.`
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
