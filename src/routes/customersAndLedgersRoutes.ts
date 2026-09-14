import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { Customer } from '../types';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const status = req.query.status as string;
    const search = req.query.search as string;
    let customers = await mySQLDb.getCustomers();

    // Ensure strict Alphabetical A-to-Z sort
    customers.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));

    if (status && status !== 'All') {
      customers = customers.filter(c => c.status?.toLowerCase() === status.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase().trim();
      customers = customers.filter(c => 
        (c.name && c.name.toLowerCase().includes(q)) || 
        (c.customerName && c.customerName.toLowerCase().includes(q)) ||
        (c.phone && c.phone.toLowerCase().includes(q)) || 
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.billingAddress && c.billingAddress.toLowerCase().includes(q)) ||
        (c.id && c.id.toLowerCase().includes(q))
      );
    }

    res.json({ success: true, count: customers.length, customers });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const customer = await mySQLDb.getCustomerById(req.params.id);
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
    res.json({ success: true, customer });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const c: Customer = req.body;
    if (!c.id) c.id = 'cust-' + Date.now();
    if (!c.name) return res.status(400).json({ success: false, message: 'Customer name is required' });
    const saved = await mySQLDb.saveCustomer(c);
    res.status(201).json({ success: true, customer: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const c: Customer = { ...req.body, id: req.params.id };
    const saved = await mySQLDb.saveCustomer(c);
    res.json({ success: true, customer: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await mySQLDb.deleteCustomer(req.params.id);
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
