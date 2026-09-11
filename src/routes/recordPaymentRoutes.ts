import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { Payment } from '../types';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const customerId = req.query.customerId as string;
    const payments = await mySQLDb.getPayments(customerId);
    res.json({ success: true, count: payments.length, payments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const p: Payment = req.body;
    if (!p.id) p.id = 'pay-' + Date.now();
    const saved = await mySQLDb.savePayment(p);
    res.status(201).json({ success: true, payment: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await mySQLDb.deletePayment(req.params.id);
    res.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
