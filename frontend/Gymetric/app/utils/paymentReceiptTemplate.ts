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

const fmtCur = (n: number) => `₹${n?.toLocaleString('en-IN')}`;

export const generatePaymentReceiptHTML = (data: ReceiptData): string => {
  const { gym, client, payment, membership, balance, receiptNo, receiptConfig, status } = data;
  const statusColor = status === 'PAID' ? '#059669' : '#B45309';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  @page { size: A4; margin: 0; }
  html, body { width: 100%; min-height: 100%; margin: 0; padding: 0; background: #F8FAFC; color: #111; }
  body { font-family: -apple-system, sans-serif; padding: 28px; box-sizing: border-box; }
  .sheet { width: 100%; min-height: calc(100vh - 56px); display: flex; align-items: stretch; justify-content: center; }
  .card { width: 100%; max-width: 760px; margin: 0 auto; border: 1px solid #E5E7EB; border-radius: 16px; padding: 28px; background: #FFFFFF; box-sizing: border-box; }
  .header { text-align: center; margin-bottom: 16px; }
  .logo { display: block; max-width: 220px; max-height: 96px; width: auto; height: auto; margin: 0 auto 10px; object-fit: contain; }
  .badge { display: inline-block; background: ${statusColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; }
  td { padding: 8px 0; font-size: 14px; border-bottom: 1px solid #F3F4F6; }
  .amt { font-size: 28px; font-weight: 700; text-align: center; margin: 20px 0 12px; }
  .footer { text-align: center; font-size: 12px; color: #6B7280; margin-top: 18px; }
  .sig-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
  .sig { display: block; max-height: 88px; max-width: 240px; width: auto; height: auto; object-fit: contain; }
</style></head><body>
<div class="sheet">
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
  ${receiptConfig?.signature ? `<div class="sig-wrap"><img class="sig" src="${receiptConfig.signature}" /></div>` : ''}
  <div class="footer">${receiptConfig?.footerNote || 'Thank you for training with us!'}</div>
</div>
</div></body></html>`;
};
