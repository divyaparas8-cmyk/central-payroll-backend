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
   * Builds an active Nodemailer transporter using .env or stored app_settings
   */
  private async getTransporter(): Promise<{ transporter: Transporter | null; fromAddress: string }> {
    dotenv.config();
    let host = process.env.SMTP_HOST || 'smtp.gmail.com';
    let port = Number(process.env.SMTP_PORT) || 465;
    let user = process.env.SMTP_USER || 'testak89193@gmail.com';
    let pass = (process.env.SMTP_PASS || 'hnbygghuxyqrucsj').replace(/\s+/g, '');
    let from = process.env.SMTP_FROM || `Central Dispatch <${user}>`;
    let secure = process.env.SMTP_SECURE === 'true' || port === 465;

    if (!host || !user || !pass) {
      return { transporter: null, fromAddress: from };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    return { transporter, fromAddress: from };
  }

  /**
   * Send Real Payslip Email
   */
  public async sendPayslip(options: PayslipEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { transporter, fromAddress } = await this.getTransporter();

    if (!transporter) {
      return {
        success: false,
        error: 'SMTP email credentials are not configured. Please add SMTP_HOST, SMTP_USER, and SMTP_PASS in .env or Settings.'
      };
    }

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
      <p>Weekly Employee Salary Statement</p>
    </div>
    <div class="content">
      <p>Dear <strong>${options.employeeName}</strong>,</p>
      <p>Your official salary statement for pay period <strong>${options.periodDates || 'Current Week'}</strong> is ready for your records.</p>
      
      ${options.customMessage ? `<div class="info-box">${options.customMessage}</div>` : ''}

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Hours</th>
              <th class="text-right">Amount</th>
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
              <td>Holiday Earnings</td>
              <td class="text-right">${options.holidayHours} hrs</td>
              <td class="text-right">${money(options.holidayPay)}</td>
            </tr>` : ''}
            ${options.otherPay ? `
            <tr>
              <td>Other Pay / Bonus</td>
              <td class="text-right">—</td>
              <td class="text-right">${money(options.otherPay)}</td>
            </tr>` : ''}
            <tr>
              <td><strong>Gross Pay</strong></td>
              <td class="text-right">—</td>
              <td class="text-right"><strong>${money(options.grossPay)}</strong></td>
            </tr>
            ${options.deductions ? `
            <tr>
              <td style="color: #dc2626;">Statutory Deductions & Taxes</td>
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

    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: options.recipientEmail,
        subject: `Central Dispatch Salary Statement — ${options.employeeName} (${options.periodDates || 'Weekly'})`,
        html
      });
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error('[EMAIL ERROR] Failed to send payslip email:', err);
      return { success: false, error: err.message || 'SMTP transport failed to deliver message.' };
    }
  }

  /**
   * Send Real Customer Invoice Email
   */
  public async sendInvoice(options: InvoiceEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const { transporter, fromAddress } = await this.getTransporter();

    if (!transporter) {
      return {
        success: false,
        error: 'SMTP email credentials are not configured. Please add SMTP_HOST, SMTP_USER, and SMTP_PASS in .env or Settings.'
      };
    }

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
    .invoice-badge { display: inline-block; background: #eef6ff; color: #1d4ed8; font-weight: 700; font-size: 12px; padding: 4px 10px; border-radius: 6px; margin-bottom: 12px; }
    .amount-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 20px; text-align: center; margin: 20px 0; }
    .amount-box span { font-size: 13px; font-weight: 600; color: #64748b; }
    .amount-box strong { display: block; font-size: 28px; font-weight: 900; color: #102a43; margin-top: 4px; }
    .btn-pay { display: inline-block; background: #1d4ed8; color: #ffffff !important; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-decoration: none; margin-top: 14px; }
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
      <p>Dear <strong>${options.customerName}</strong>,</p>
      <p>Please find attached your invoice details from Central Dispatch Limited.</p>

      ${options.customMessage ? `<div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:14px; margin:16px 0; font-size:13px; white-space: pre-wrap; line-height: 1.5; color: #1e293b;">${options.customMessage.replace(/\n/g, '<br/>')}</div>` : ''}

      <div class="amount-box">
        <span>TOTAL AMOUNT DUE</span>
        <strong>${money(options.amount)}</strong>
        ${options.dueDate ? `<p style="font-size:12px; color:#64748b; margin:6px 0 0 0;">Due Date: ${options.dueDate}</p>` : ''}
        <a href="${payLink}" class="btn-pay" target="_blank">Pay Online Securely &rarr;</a>
      </div>

      <p style="font-size: 12px; color: #64748b;">For payment inquiries or questions regarding this statement, please reach out to accounts@centraldispatch.bm or call (441) 295-4141.</p>
    </div>
    <div class="footer">
      Central Dispatch Limited • 3 Laffan Street, Hamilton HM 09, Bermuda<br>
      Customer Accounts & Billing Department
    </div>
  </div>
</body>
</html>
`;

    try {
      const info = await transporter.sendMail({
        from: fromAddress,
        to: options.recipientEmail,
        subject: `Invoice #${options.invoiceNumber} from Central Dispatch Limited ($${options.amount})`,
        html
      });
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error('[EMAIL ERROR] Failed to send invoice email:', err);
      return { success: false, error: err.message || 'SMTP transport failed to deliver invoice.' };
    }
  }
}

export const emailService = new EmailService();
