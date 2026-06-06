type ReceiptData = {
    gym: { name: string; address?: string; logo?: string };
    client: { name: string; phoneNumber: string };
    payment: { amount: number; method: string; date: string; remarks?: string };
    membership?: { planName: string; startDate?: string; endDate?: string };
    balance: number;
    receiptNo: string;
    receiptConfig?: { signature?: string; footerNote?: string; showGymAddress?: boolean };
    status: 'PAID' | 'PARTIAL';
};

const fmtCur = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const generatePaymentReceiptHTML = (data: ReceiptData): string => {
    const { gym, client, payment, membership, balance, receiptNo, receiptConfig, status } = data;
    const statusColor = status === 'PAID' ? '#059669' : '#B45309';

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: -apple-system, sans-serif; margin: 0; padding: 24px; color: #111; }
  .card { max-width: 400px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; }
  .header { text-align: center; margin-bottom: 16px; }
  .logo { max-height: 48px; margin-bottom: 8px; }
  .badge { display: inline-block; background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  td { padding: 6px 0; font-size: 13px; border-bottom: 1px solid #F3F4F6; }
  .amt { font-size: 22px; font-weight: 700; text-align: center; margin: 16px 0; }
  .footer { text-align: center; font-size: 11px; color: #6B7280; margin-top: 16px; }
  .sig { max-height: 40px; margin-top: 12px; }
</style></head><body>
<div class="card">
  <div class="header">
    ${gym.logo ? `<img class="logo" src="${gym.logo}" />` : ''}
    <h2 style="margin:4px 0;font-size:18px">${gym.name}</h2>
    ${receiptConfig?.showGymAddress !== false && gym.address ? `<p style="font-size:11px;color:#6B7280;margin:0">${gym.address}</p>` : ''}
    <div style="margin-top:8px"><span class="badge">${status}</span></div>
  </div>
  <p style="font-size:11px;color:#6B7280;text-align:center">Receipt #${receiptNo}</p>
  <table>
    <tr><td>Client</td><td style="text-align:right;font-weight:600">${client.name}</td></tr>
    <tr><td>Phone</td><td style="text-align:right">${client.phoneNumber}</td></tr>
    ${membership ? `<tr><td>Plan</td><td style="text-align:right">${membership.planName}</td></tr>` : ''}
    ${membership?.startDate ? `<tr><td>Period</td><td style="text-align:right">${membership.startDate} - ${membership.endDate || ''}</td></tr>` : ''}
    <tr><td>Method</td><td style="text-align:right">${payment.method}</td></tr>
    <tr><td>Date</td><td style="text-align:right">${payment.date}</td></tr>
  </table>
  <div class="amt">${fmtCur(payment.amount)}</div>
  ${balance > 0 ? `<p style="text-align:center;font-size:12px;color:#B45309">Balance due: ${fmtCur(balance)}</p>` : ''}
  ${payment.remarks ? `<p style="font-size:11px;color:#6B7280;text-align:center">${payment.remarks}</p>` : ''}
  ${receiptConfig?.signature ? `<div style="text-align:right"><img class="sig" src="${receiptConfig.signature}" /></div>` : ''}
  <div class="footer">${receiptConfig?.footerNote || 'Thank you for training with us!'}</div>
</div></body></html>`;
};
