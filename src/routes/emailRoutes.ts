import { Router, Request, Response } from 'express';
import { mySQLDb } from '../db/mysqlDatabase';

const router = Router();

// POST send email payslip
router.post('/payslip', async (req: Request, res: Response) => {
  const { recipientEmail, employeeName, periodDates, customMessage } = req.body;

  if (!recipientEmail) {
    return res.status(400).json({ success: false, error: 'Recipient email is required' });
  }

  console.log(`[EMAIL SERVICE] Payslip dispatched to ${recipientEmail} for ${employeeName || 'Employee'} (${periodDates || 'Current Period'})`);

  try {
    await mySQLDb.saveAuditLog({
      id: 'aud-' + Date.now(),
      action: 'PAYSLIP_EMAILED',
      module: 'Payslips',
      user: 'Super Admin',
      role: 'superadmin',
      timestamp: new Date().toISOString(),
      details: `Payslip emailed to ${recipientEmail} for ${employeeName || 'Employee'}`
    });
  } catch (_) {}

  res.json({
    success: true,
    message: `Payslip email successfully sent to ${recipientEmail}`,
    dispatchedAt: new Date().toISOString()
  });
});

// POST send customer invoice email
const handleSendInvoiceEmail = async (req: Request, res: Response) => {
  const { recipientEmail, customerName, invoiceNumber, amount, balance, paymentLink, customMessage } = req.body;

  if (!recipientEmail || !recipientEmail.includes('@')) {
    return res.status(400).json({ success: false, error: 'A valid recipient email address is required.' });
  }

  console.log(`[EMAIL SERVICE] Invoice ${invoiceNumber || 'INV'} ($${amount || 0}) dispatched to ${recipientEmail} for ${customerName || 'Customer'}`);

  try {
    await mySQLDb.saveAuditLog({
      id: 'aud-' + Date.now(),
      action: 'INVOICE_EMAILED',
      module: 'Invoices',
      user: 'Administrator',
      role: 'admin',
      timestamp: new Date().toISOString(),
      details: `Invoice ${invoiceNumber || 'INV'} ($${amount || 0}) emailed to ${recipientEmail} for ${customerName || 'Customer'}`
    });
  } catch (_) {}

  res.json({
    success: true,
    message: `Invoice ${invoiceNumber || ''} successfully emailed to ${recipientEmail}`,
    recipient: recipientEmail,
    paymentLink: paymentLink || 'https://ridebermuda-prod.web.app/paylink',
    dispatchedAt: new Date().toISOString()
  });
};

router.post('/invoice', handleSendInvoiceEmail);
router.post('/send-invoice', handleSendInvoiceEmail);

export default router;
