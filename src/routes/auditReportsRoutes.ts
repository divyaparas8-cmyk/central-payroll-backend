import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { AuditLogItem } from '../types';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const logs = await mySQLDb.getAuditLogs();
    res.json({ success: true, count: logs.length, auditLogs: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const log: AuditLogItem = req.body;
    if (!log.id) log.id = 'aud-' + Date.now();
    if (!log.timestamp) log.timestamp = new Date().toISOString();
    await mySQLDb.saveAuditLog(log);
    res.status(201).json({ success: true, auditLog: log });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
