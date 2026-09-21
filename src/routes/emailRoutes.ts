import { Router, Request, Response } from 'express';
import { mySQLDb } from '../db/mysqlDatabase';
import { emailService } from '../services/emailService';

const router = Router();

// POST send email payslip
router.post('/payslip', async (req: Request, res: Response) => {
  const {
    recipientEmail,
    employeeName,
    periodDates,
    regularHours,
    regularPay,
    holidayHours,
    holidayPay,
    otherPay,
    deductions,
    grossPay,
    netPay,
    customMessage
  } = req.body;

  if (!recipientEmail || !recipientEmail.includes('@')) {
    return res.status(400).json({ success: false, error: 'A valid recipient email address is required.' });
  }

  // Attempt real email delivery
  const result = await emailService.sendPayslip({
    recipientEmail,
    employeeName: employeeName || 'Employee',
    periodDates,
    regularHours,
    regularPay,
    holidayHours,
    holidayPay,
    otherPay,
    deductions,
    grossPay,
    netPay,
    customMessage
  });

  if (!result.success) {
    mySQLDb.saveAuditLog({
      id: 'aud-' + Date.now(),
      action: 'PAYSLIP_EMAIL_FAILED',
      module: 'Payslips',
      user: (req as any).user?.username || 'Super Admin',
      role: (req as any).user?.role || 'superadmin',
      timestamp: new Date().toISOString(),
      details: `Failed to email payslip to ${recipientEmail}: ${result.error}`
    }).catch(err => console.warn('Could not save fail audit log:', err.message));

    return res.status(500).json({
      success: false,
      error: result.error || 'Failed to dispatch payslip email.'
    });
  }

  mySQLDb.saveAuditLog({
    id: 'aud-' + Date.now(),
    action: 'PAYSLIP_EMAILED',
    module: 'Payslips',
    user: (req as any).user?.username || 'Super Admin',
    role: (req as any).user?.role || 'superadmin',
    timestamp: new Date().toISOString(),
    details: `Payslip successfully emailed to ${recipientEmail} for ${employeeName || 'Employee'}`
  }).catch(err => console.warn('Could not save success audit log:', err.message));

  return res.json({
    success: true,
    message: `Payslip email successfully sent to ${recipientEmail}`,
    messageId: result.messageId,
    dispatchedAt: new Date().toISOString()
  });
});

// POST send customer invoice email
const handleSendInvoiceEmail = async (req: Request, res: Response) => {
  const { recipientEmail, customerName, invoiceNumber, amount, balance, dueDate, paymentLink, customMessage } = req.body;

  if (!recipientEmail || !recipientEmail.includes('@')) {
    return res.status(400).json({ success: false, error: 'A valid recipient email address is required.' });
  }

  // Attempt real email delivery
  const result = await emailService.sendInvoice({
    recipientEmail,
    customerName: customerName || 'Valued Customer',
    invoiceNumber: invoiceNumber || 'INV-1001',
    amount: Number(amount) || 0,
    balance: Number(balance) || 0,
    dueDate,
    paymentLink,
    customMessage
  });

  if (!result.success) {
    mySQLDb.saveAuditLog({
      id: 'aud-' + Date.now(),
      action: 'INVOICE_EMAIL_FAILED',
      module: 'Invoices',
      user: (req as any).user?.username || 'Administrator',
      role: (req as any).user?.role || 'admin',
      timestamp: new Date().toISOString(),
      details: `Failed to email invoice ${invoiceNumber} to ${recipientEmail}: ${result.error}`
    }).catch(err => console.warn('Could not save fail audit log:', err.message));

    return res.status(500).json({
      success: false,
      error: result.error || 'Failed to dispatch invoice email.'
    });
  }

  mySQLDb.saveAuditLog({
    id: 'aud-' + Date.now(),
    action: 'INVOICE_EMAILED',
    module: 'Invoices',
    user: (req as any).user?.username || 'Administrator',
    role: (req as any).user?.role || 'admin',
    timestamp: new Date().toISOString(),
    details: `Invoice ${invoiceNumber} ($${amount}) successfully emailed to ${recipientEmail} for ${customerName}`
  }).catch(err => console.warn('Could not save success audit log:', err.message));

  return res.json({
    success: true,
    message: `Invoice ${invoiceNumber || ''} successfully emailed to ${recipientEmail}`,
    recipient: recipientEmail,
    messageId: result.messageId,
    paymentLink: paymentLink || 'https://ridebermuda-prod.web.app/paylink',
    dispatchedAt: new Date().toISOString()
  });
};

router.post('/invoice', handleSendInvoiceEmail);
router.post('/send-invoice', handleSendInvoiceEmail);

export default router;
