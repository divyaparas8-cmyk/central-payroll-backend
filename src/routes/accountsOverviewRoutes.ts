import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const customers = await mySQLDb.getCustomers();
    const invoices = await mySQLDb.getInvoices();
    const payments = await mySQLDb.getPayments();

    const openInvoices = invoices.filter(i => i.status === 'Owing' || Number(i.balance || 0) > 0);
    const accountsReceivable = openInvoices.reduce((sum, i) => sum + Number(i.balance || i.amount || 0), 0);
    const totalPaymentsReceived = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

    res.json({
      success: true,
      data: {
        totalCustomers: customers.length,
        activeCustomers: customers.filter(c => c.status === 'Active').length,
        inactiveCustomers: customers.filter(c => c.status === 'Inactive').length,
        totalInvoices: invoices.length,
        openInvoicesCount: openInvoices.length,
        accountsReceivable,
        totalPaymentsReceived,
        recentInvoices: invoices.slice(0, 10),
        recentPayments: payments.slice(0, 10)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
