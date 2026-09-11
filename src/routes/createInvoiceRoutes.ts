import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { Invoice } from '../types';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const customerId = req.query.customerId as string;
    const invoices = await mySQLDb.getInvoices(customerId);
    res.json({ success: true, count: invoices.length, invoices });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const invoice = await mySQLDb.getInvoiceById(req.params.id);
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    res.json({ success: true, invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const inv: Invoice = req.body;
    if (!inv.id) inv.id = 'inv-' + Date.now();
    const saved = await mySQLDb.saveInvoice(inv);
    res.status(201).json({ success: true, invoice: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const inv: Invoice = { ...req.body, id: req.params.id };
    const saved = await mySQLDb.saveInvoice(inv);
    res.json({ success: true, invoice: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await mySQLDb.deleteInvoice(req.params.id);
    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
