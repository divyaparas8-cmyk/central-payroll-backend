import { Router, Request, Response } from 'express';

const router = Router();

// POST send email payslip
router.post('/payslip', (req: Request, res: Response) => {
  const { recipientEmail, employeeName, periodDates, customMessage } = req.body;

  if (!recipientEmail) {
    return res.status(400).json({ success: false, error: 'Recipient email is required' });
  }

  // Simulated email dispatch
  console.log(`[EMAIL SERVICE] Payslip dispatched to ${recipientEmail} for ${employeeName || 'Employee'} (${periodDates || 'Current Period'})`);

  res.json({
    success: true,
    message: `Payslip email successfully sent to ${recipientEmail}`,
    dispatchedAt: new Date().toISOString()
  });
});

export default router;
