import http from 'http';

function get(url: string): Promise<any> {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
  });
}

async function verifyConsistency() {
  const ao = await get('http://localhost:5000/api/accounts-overview');
  const aging = await get('http://localhost:5000/api/aging');

  console.log('--- ACCOUNTS OVERVIEW METRICS ---');
  console.log('Total Accounts Receivable:', ao.data.accountsReceivable);
  console.log('Overdue Amount:', ao.data.overdueAmount);
  console.log('Overdue Invoices Count:', ao.data.overdueCount);

  console.log('\n--- A/R AGING SUMMARY METRICS ---');
  const agingTotal = aging.data.total;
  console.log('Current (0 days):', agingTotal.current);
  console.log('1-30 days:', agingTotal.d1_30);
  console.log('31-60 days:', agingTotal.d31_60);
  console.log('61-90 days:', agingTotal.d61_90);
  console.log('90+ days:', agingTotal.d90_plus);
  
  const agingOverdue = agingTotal.d1_30 + agingTotal.d31_60 + agingTotal.d61_90 + agingTotal.d90_plus;
  console.log('Total Overdue on Aging:', agingOverdue);

  console.log('\n--- VERIFICATION RESULT ---');
  if (ao.data.overdueAmount === agingOverdue) {
    console.log('🎉 SUCCESS: Accounts Overview ($' + ao.data.overdueAmount + ') is 100% in sync with A/R Aging ($' + agingOverdue + ')!');
  } else {
    console.error('❌ Mismatch detected!');
  }
}

verifyConsistency();
