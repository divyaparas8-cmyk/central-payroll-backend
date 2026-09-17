import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { Customer, Invoice, Payment, GeneralLedgerEntry } from '../types';

const router = express.Router();

// ==========================================
// CUSTOMERS
// ==========================================

router.get('/customers', async (req, res) => {
  try {
    const customers = await mySQLDb.getCustomers();
    res.json({ success: true, count: customers.length, data: customers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/customers/:id', async (req, res) => {
  try {
    const customer = await mySQLDb.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, data: customer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/customers', async (req, res) => {
  try {
    const c: Customer = req.body;
    if (!c.id) {
      c.id = 'cust-' + Date.now();
    }
    if (!c.name) {
      return res.status(400).json({ success: false, message: 'Customer name is required' });
    }
    const saved = await mySQLDb.saveCustomer(c);
    res.status(201).json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/customers/:id', async (req, res) => {
  try {
    const c: Customer = { ...req.body, id: req.params.id };
    const saved = await mySQLDb.saveCustomer(c);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/customers/:id', async (req, res) => {
  try {
    await mySQLDb.deleteCustomer(req.params.id);
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// INVOICES
// ==========================================

router.get('/invoices', async (req, res) => {
  try {
    const customerId = req.query.customerId as string;
    const invoices = await mySQLDb.getInvoices(customerId);
    res.json({ success: true, count: invoices.length, data: invoices });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/invoices/:id', async (req, res) => {
  try {
    const invoice = await mySQLDb.getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.json({ success: true, data: invoice });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/invoices', async (req, res) => {
  try {
    const inv: Invoice = req.body;
    if (!inv.id) {
      inv.id = 'inv-' + Date.now();
    }
    const saved = await mySQLDb.saveInvoice(inv);
    res.status(201).json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/invoices/:id', async (req, res) => {
  try {
    const inv: Invoice = { ...req.body, id: req.params.id };
    const saved = await mySQLDb.saveInvoice(inv);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/invoices/:id', async (req, res) => {
  try {
    await mySQLDb.deleteInvoice(req.params.id);
    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// PAYMENTS
// ==========================================

router.get('/payments', async (req, res) => {
  try {
    const customerId = req.query.customerId as string;
    const payments = await mySQLDb.getPayments(customerId);
    res.json({ success: true, count: payments.length, data: payments });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/payments', async (req, res) => {
  try {
    const p: Payment = req.body;
    if (!p.id) {
      p.id = 'pay-' + Date.now();
    }
    const saved = await mySQLDb.savePayment(p);
    res.status(201).json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/payments/:id', async (req, res) => {
  try {
    await mySQLDb.deletePayment(req.params.id);
    res.json({ success: true, message: 'Payment deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// GENERAL LEDGER
// ==========================================

router.get('/ledger', async (req, res) => {
  try {
    const { startDate, endDate, customerName, account, type } = req.query as Record<string, string>;
    const entries = await mySQLDb.getGeneralLedger({ startDate, endDate, customerName, account, type });
    res.json({ success: true, count: entries.length, data: entries });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/ledger', async (req, res) => {
  try {
    const entry: GeneralLedgerEntry = req.body;
    const saved = await mySQLDb.saveGeneralLedgerEntry(entry);
    res.status(201).json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
