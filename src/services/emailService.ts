import nodemailer, { Transporter } from 'nodemailer';
import dotenv from 'dotenv';
import { mySQLDb } from '../db/mysqlDatabase';

dotenv.config();

export interface PayslipEmailOptions {
  recipientEmail: string;
  employeeName: string;
  periodDates?: string;
  regularHours?: number;
  regularPay?: number;
  holidayHours?: number;
  holidayPay?: number;
  otherPay?: number;
  deductions?: number;
  grossPay?: number;
  netPay?: number;
  customMessage?: string;
}

export interface InvoiceEmailOptions {
  recipientEmail: string;
  customerName: string;
  invoiceNumber: string;
  amount: number;
  balance?: number;
  dueDate?: string;
  paymentLink?: string;
  customMessage?: string;
}

class EmailService {
  /**
   * Primary SMTP Transporter
   */
  private getPrimaryTransporter(): { transporter: Transporter | null; fromAddress: string } {
    dotenv.config();
    const host = (process.env.SMTP_HOST || 'smtp.office365.com').trim();
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = (process.env.SMTP_USER || 'info@bermudaislandtaxi.com').trim();
    const pass = (process.env.SMTP_PASS || 'Courts96!').trim();
    const from = process.env.SMTP_FROM || `"Central Dispatch Limited" <${user}>`;

    if (!user || !pass) {
      return { transporter: null, fromAddress: from };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 5000,
      greetingTimeout: 4000,
      socketTimeout: 8000
    });

    return { transporter, fromAddress: from };
  }

  /**
   * High-deliverability Backup SMTP Transporter
   */
  private getBackupTransporter(): { transporter: Transporter; fromAddress: string } {
    const user = 'testak89193@gmail.com';
    const pass = 'hnbygghuxyqrucsj';
    const from = `"Central Dispatch Limited" <${user}>`;

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 6000,
      greetingTimeout: 5000,
      socketTimeout: 10000
    });

    return { transporter, fromAddress: from };
  }

  /**
   * Send Real Payslip Email
   */
  public async sendPayslip(options: PayslipEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const money = (v?: number) => `$${(Number(v) || 0).toFixed(2)}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #0f172a; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: #102a43; padding: 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 13px; color: #94a3b8; }
    .content { padding: 24px; }
    .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 20px; font-size: 13px; line-height: 1.5; }
    .table-container { margin: 20px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { background: #f1f5f9; padding: 10px 14px; text-align: left; font-weight: 700; color: #334155; border-bottom: 1px solid #e2e8f0; }
    td { padding: 10px 14px; border-bottom: 1px solid #f1f5f9; }
    .text-right { text-align: right; }
    .net-pay-row { background: #eef6ff; font-weight: 800; font-size: 15px; color: #1d4ed8; }
    .footer { background: #f8fafc; padding: 18px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Central Dispatch Limited</h1>
      <p>Official Payroll Statement & Remittance Advice</p>
    </div>
    <div class="content">
      <div class="info-box">
        <strong>Employee Name:</strong> ${options.employeeName}<br>
        <strong>Pay Period:</strong> ${options.periodDates || 'Current Pay Period'}<br>
        <strong>Date Dispatched:</strong> ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
      </div>

      ${options.customMessage ? `<p style="font-size: 13px; color: #475569; font-style: italic; background: #fffbe0; padding: 10px 14px; border-radius: 6px; border: 1px solid #fed7aa;">${options.customMessage}</p>` : ''}

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Earnings & Breakdown</th>
              <th class="text-right">Hours</th>
              <th class="text-right">Amount (BMD)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Regular Earnings</td>
              <td class="text-right">${options.regularHours || 0} hrs</td>
              <td class="text-right">${money(options.regularPay)}</td>
            </tr>
            ${options.holidayHours ? `
            <tr>
              <td>Public Holiday Premium Pay</td>
              <td class="text-right">${options.holidayHours} hrs</td>
              <td class="text-right">${money(options.holidayPay)}</td>
            </tr>` : ''}
            ${options.otherPay ? `
            <tr>
              <td>Other Additional Pay</td>
              <td class="text-right">—</td>
              <td class="text-right">${money(options.otherPay)}</td>
            </tr>` : ''}
            <tr style="font-weight: 600; background: #fafafa;">
              <td>Gross Pay Total</td>
              <td class="text-right">—</td>
              <td class="text-right">${money(options.grossPay)}</td>
            </tr>
            ${options.deductions ? `
            <tr>
              <td>Statutory & Voluntary Deductions</td>
              <td class="text-right">—</td>
              <td class="text-right" style="color: #dc2626;">-${money(options.deductions)}</td>
            </tr>` : ''}
            <tr class="net-pay-row">
              <td>Net Salary Dispatched</td>
              <td class="text-right">—</td>
              <td class="text-right">${money(options.netPay)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style="font-size: 12px; color: #64748b;">If you have any questions regarding this statement, please contact the Payroll Department at info@bermudaislandtaxi.com or (441) 295-4141.</p>
    </div>
    <div class="footer">
      Central Dispatch Limited • 3 Laffan Street, Hamilton HM 09, Bermuda<br>
      Automated Payroll & Dispatch Notification System
    </div>
  </div>
</body>
</html>
`;

    const mailOptions = {
      to: options.recipientEmail,
      subject: `Central Dispatch Salary Statement — ${options.employeeName} (${options.periodDates || 'Weekly'})`,
      html
    };

    // 1. Try Primary
    const primary = this.getPrimaryTransporter();
    if (primary.transporter) {
      try {
        const info = await primary.transporter.sendMail({
          from: primary.fromAddress,
          ...mailOptions
        });
        console.log(`[EMAIL DISPATCH SUCCESS] Payslip sent via primary to ${options.recipientEmail} | ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
      } catch (err: any) {
        console.warn('[EMAIL WARNING] Primary SMTP failed, trying backup transporter:', err.message);
      }
    }

    // 2. Fallback to Backup Transporter
    try {
      const backup = this.getBackupTransporter();
      const info = await backup.transporter.sendMail({
        from: backup.fromAddress,
        ...mailOptions
      });
      console.log(`[EMAIL DISPATCH SUCCESS] Payslip sent via backup to ${options.recipientEmail} | ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (backupErr: any) {
      console.error('[EMAIL ERROR] All SMTP transports failed for payslip:', backupErr);
      return { success: false, error: backupErr.message || 'SMTP transport failed to deliver payslip.' };
    }
  }

  /**
   * Send Real Customer Invoice Email
   */
  public async sendInvoice(options: InvoiceEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const money = (v?: number) => `$${(Number(v) || 0).toFixed(2)}`;
    const payLink = options.paymentLink || 'https://ridebermuda-prod.web.app/paylink';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #0f172a; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
    .header { background: #102a43; padding: 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 22px; letter-spacing: -0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 13px; color: #94a3b8; }
    .content { padding: 24px; }
    .invoice-badge { display: inline-block; background: #eef6ff; color: #1d4ed8; font-weight: 700; font-size: 12px; padding: 5px 12px; border-radius: 6px; margin-bottom: 16px; border: 1px solid #bfdbfe; }
    .msg-body { font-size: 13.5px; line-height: 1.6; color: #334155; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px; white-space: pre-wrap; }
    .amount-box { background: #ffffff; border: 2px solid #102a43; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
    .amount-box span { font-size: 12px; font-weight: 700; color: #64748b; letter-spacing: 0.05em; }
    .amount-box strong { display: block; font-size: 28px; font-weight: 900; color: #102a43; margin-top: 4px; }
    .btn-pay { display: inline-block; background: #1d4ed8; color: #ffffff !important; font-weight: 800; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none; margin-top: 14px; }
    .footer { background: #f8fafc; padding: 18px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Central Dispatch Limited</h1>
      <p>Customer Statement & Invoice Notice</p>
    </div>
    <div class="content">
      <div class="invoice-badge">INVOICE #${options.invoiceNumber}</div>

      ${options.customMessage 
        ? `<div class="msg-body">${options.customMessage.replace(/\n/g, '<br/>')}</div>` 
        : `<p>Dear <strong>${options.customerName}</strong>,</p><p>Please find attached your invoice details from Central Dispatch Limited.</p>`
      }

      <div class="amount-box">
        <span>TOTAL AMOUNT DUE</span>
        <strong>${money(options.amount)}</strong>
        ${options.dueDate ? `<p style="font-size:12px; color:#64748b; margin:6px 0 0 0;">Due Date: ${options.dueDate}</p>` : ''}
        <a href="${payLink}" class="btn-pay" target="_blank">Pay Online Securely &rarr;</a>
      </div>

      <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 16px;">For billing inquiries, please contact accounts@centraldispatch.bm or (441) 295-4141.</p>
    </div>
    <div class="footer">
      Central Dispatch Limited • 3 Laffan Street, Hamilton HM 09, Bermuda<br>
      Automated Customer Billing & Dispatch Notification
    </div>
  </div>
</body>
</html>
`;

    const text = `Central Dispatch Limited - Customer Invoice #${options.invoiceNumber}\n\nDear ${options.customerName},\n\nInvoice Number: ${options.invoiceNumber}\nTotal Amount Due: ${money(options.amount)}\n${options.dueDate ? `Due Date: ${options.dueDate}\n` : ''}\n${options.customMessage ? `${options.customMessage}\n\n` : ''}Pay Online Securely: ${payLink}\n\nCentral Dispatch Limited • 3 Laffan Street, Hamilton HM 09, Bermuda\naccounts@centraldispatch.bm • (441) 295-4141`;

    const mailOptions = {
      to: options.recipientEmail,
      subject: `Invoice #${options.invoiceNumber} from Central Dispatch Limited ($${options.amount})`,
      text,
      html
    };

    // 1. Try Primary
    const primary = this.getPrimaryTransporter();
    if (primary.transporter) {
      try {
        const info = await primary.transporter.sendMail({
          from: primary.fromAddress,
          replyTo: primary.fromAddress,
          ...mailOptions
        });
        console.log(`[EMAIL DISPATCH SUCCESS] Invoice #${options.invoiceNumber} dispatched via primary to ${options.recipientEmail} | ID: ${info.messageId}`);
        return { success: true, messageId: info.messageId };
      } catch (err: any) {
        console.warn('[EMAIL WARNING] Primary SMTP failed for invoice, trying backup transporter:', err.message);
      }
    }

    // 2. Fallback to Backup
    try {
      const backup = this.getBackupTransporter();
      const info = await backup.transporter.sendMail({
        from: backup.fromAddress,
        replyTo: backup.fromAddress,
        ...mailOptions
      });
      console.log(`[EMAIL DISPATCH SUCCESS] Invoice #${options.invoiceNumber} dispatched via backup to ${options.recipientEmail} | ID: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (backupErr: any) {
      console.error('[EMAIL ERROR] All SMTP transports failed for invoice:', backupErr);
      return { success: false, error: backupErr.message || 'SMTP transport failed to deliver invoice.' };
    }
  }
}

export const emailService = new EmailService();
