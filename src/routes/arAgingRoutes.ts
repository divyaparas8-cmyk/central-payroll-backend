import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const asOfDate = (req.query.asOf as string) || new Date().toISOString().slice(0, 10);
    const customers = await mySQLDb.getCustomers();
    const invoices = await mySQLDb.getInvoices();

    const summaries = customers.map(c => {
      const custInvoices = invoices.filter(i => i.customerId === c.id && (i.status === 'Owing' || Number(i.balance || 0) > 0));
      let current = 0, d1_30 = 0, d31_60 = 0, d61_90 = 0, d90_plus = 0;

      custInvoices.forEach(inv => {
        const due = inv.dueDate || inv.date;
        const diffDays = Math.floor((new Date(asOfDate).getTime() - new Date(due).getTime()) / (1000 * 3600 * 24));
        const bal = Number(inv.balance || inv.amount || 0);

        if (diffDays <= 0) current += bal;
        else if (diffDays <= 30) d1_30 += bal;
        else if (diffDays <= 60) d31_60 += bal;
        else if (diffDays <= 90) d61_90 += bal;
        else d90_plus += bal;
      });

      const total = current + d1_30 + d31_60 + d61_90 + d90_plus;
      return { customerId: c.id, customerName: c.name, current, d1_30, d31_60, d61_90, d90_plus, total };
    }).filter(s => s.total > 0);

    const rawTotal = summaries.reduce((acc, s) => ({
      current: acc.current + s.current,
      d1_30: acc.d1_30 + s.d1_30,
      d31_60: acc.d31_60 + s.d31_60,
      d61_90: acc.d61_90 + s.d61_90,
      d90_plus: acc.d90_plus + s.d90_plus,
      total: acc.total + s.total
    }), { current: 0, d1_30: 0, d31_60: 0, d61_90: 0, d90_plus: 0, total: 0 });

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const total = {
      customerId: 'TOTAL',
      customerName: 'TOTAL',
      current: round2(rawTotal.current),
      d1_30: round2(rawTotal.d1_30),
      d31_60: round2(rawTotal.d31_60),
      d61_90: round2(rawTotal.d61_90),
      d90_plus: round2(rawTotal.d90_plus),
      total: round2(rawTotal.total)
    };

    res.json({ success: true, data: { asOfDate, summaries, total } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
