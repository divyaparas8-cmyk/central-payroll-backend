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

export default router;
