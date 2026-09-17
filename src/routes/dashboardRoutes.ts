import express from 'express';
import { mySQLDb } from '../db/mysqlDatabase';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const employees = await mySQLDb.getEmployees();
    const activeEmployees = employees.filter(e => e.status === 'Active');
    const periods = await mySQLDb.getPayrollPeriods();
    const activePeriod = periods.find(p => p.status === 'Draft' || p.status === 'Calculated') || periods[0];
    const leaves = await mySQLDb.getLeaves();
    const customers = await mySQLDb.getCustomers();
    const invoices = await mySQLDb.getInvoices();

    const totalHours = activePeriod ? Number(activePeriod.totalHours || 0) : 0;
    const grossPayroll = activePeriod ? Number(activePeriod.totalGrossPayroll || 0) : 0;
    const netPayroll = activePeriod ? Number(activePeriod.totalNetPayroll || 0) : 0;

    const openInvoices = invoices.filter(i => i.status === 'Owing' || Number(i.balance || 0) > 0);
    const totalReceivables = openInvoices.reduce((sum, i) => sum + Number(i.balance || i.amount || 0), 0);

    res.json({
      success: true,
      data: {
        activeStaffCount: activeEmployees.length,
        totalEmployeesCount: employees.length,
        totalWeeklyHours: totalHours,
        grossPayroll,
        netPayroll,
        activePeriod,
        recentLeavesCount: leaves.length,
        totalCustomers: customers.length,
        openInvoicesCount: openInvoices.length,
        totalReceivables,
        employees,
        customers,
        leaves,
        serverTime: new Date().toISOString()
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
