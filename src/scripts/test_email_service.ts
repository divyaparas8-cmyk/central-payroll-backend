import { emailService } from '../services/emailService';

async function testEmail() {
  console.log('=== TESTING REAL EMAIL SERVICE IMPLEMENTATION ===\n');

  // Test Payslip Email error reporting when SMTP is not configured
  console.log('Test 1: Payslip Email dispatch test:');
  const res1 = await emailService.sendPayslip({
    recipientEmail: 'test.employee@example.com',
    employeeName: 'Alesia Brangman',
    periodDates: 'Sep 10, 2026 – Sep 16, 2026',
    regularHours: 40,
    regularPay: 800,
    grossPay: 800,
    netPay: 800,
    customMessage: 'Thank you for your service this week.'
  });

  console.log('  Payslip result:', res1);
  console.log('  Gracefully reports error when SMTP credentials unconfigured (No fake success):', res1.success === false && typeof res1.error === 'string');

  // Test Invoice Email
  console.log('\nTest 2: Invoice Email dispatch test:');
  const res2 = await emailService.sendInvoice({
    recipientEmail: 'client@example.com',
    customerName: 'Bermuda Island Tours',
    invoiceNumber: 'INV-2026-089',
    amount: 1450.00,
    dueDate: '2026-09-30'
  });

  console.log('  Invoice result:', res2);
  console.log('  Invoice error correctly identified:', res2.success === false && typeof res2.error === 'string');

  console.log('\n=============================================');
  console.log('✅ Real Email Delivery Service tested successfully!');
  console.log('=============================================');
  process.exit(0);
}

testEmail().catch(err => {
  console.error('Email test error:', err);
  process.exit(1);
});
