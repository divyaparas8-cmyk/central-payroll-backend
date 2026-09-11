import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        organizationName: 'Central Dispatch Limited',
        country: 'Bermuda',
        currency: 'BMD',
        payFrequency: 'Weekly',
        weekStartsOn: 'Thursday',
        weekEndsOn: 'Wednesday',
        taxSystem: 'Bermuda Statutory Deduction Matrix Active'
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const settings = req.body;
    res.json({ success: true, message: 'Settings saved successfully', data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/settings/backup
router.get('/backup', async (req, res) => {
  try {
    const backup = await mySQLDb.backupAllData();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=CDL-Complete-Backup-${new Date().toISOString().slice(0,10)}.json`);
    res.json(backup);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/settings/restore
router.post('/restore', async (req, res) => {
  try {
    const backupData = req.body;
    await mySQLDb.restoreAllData(backupData);
    res.json({ success: true, message: 'Database and app state restored successfully!' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
