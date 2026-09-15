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

    const asOfDate = (req.query.asOf as string) || new Date().toISOString().slice(0, 10);
    let overdueAmount = 0;
    let overdueCount = 0;

    openInvoices.forEach(inv => {
      const due = inv.dueDate || inv.date;
      const diffDays = Math.floor((new Date(asOfDate).getTime() - new Date(due).getTime()) / (1000 * 3600 * 24));
      const bal = Number(inv.balance || inv.amount || 0);

      if (diffDays > 0 && bal > 0) {
        overdueAmount += bal;
        overdueCount += 1;
      }
    });

    res.json({
      success: true,
      data: {
        totalCustomers: customers.length,
        activeCustomers: customers.filter(c => c.status === 'Active').length,
        inactiveCustomers: customers.filter(c => c.status === 'Inactive').length,
        totalInvoices: invoices.length,
        openInvoicesCount: openInvoices.length,
        accountsReceivable: Math.round(accountsReceivable * 100) / 100,
        overdue: Math.round(overdueAmount * 100) / 100,
        overdueAmount: Math.round(overdueAmount * 100) / 100,
        overdueCount,
        totalPaymentsReceived: Math.round(totalPaymentsReceived * 100) / 100,
        recentInvoices: invoices.slice(0, 10),
        recentPayments: payments.slice(0, 10)
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
