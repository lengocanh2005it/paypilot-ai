/** Map tên ngân hàng phổ biến → BIN VietQR */
const BANK_BIN_MAP: Record<string, string> = {
  vietcombank: '970436',
  vcb: '970436',
  techcombank: '970407',
  tcb: '970407',
  bidv: '970418',
  vietinbank: '970415',
  vtb: '970415',
  agribank: '970405',
  mbbank: '970422',
  mb: '970422',
  acb: '970416',
  vpbank: '970432',
  tpbank: '970423',
  sacombank: '970403',
  hdbank: '970437',
};

export function resolveBankBin(bankName?: string | null): string {
  if (!bankName) return '970436';

  const normalized = bankName.toLowerCase().replace(/\s+/g, '');
  for (const [key, bin] of Object.entries(BANK_BIN_MAP)) {
    if (normalized.includes(key)) {
      return bin;
    }
  }

  return '970436';
}

export function buildVietQrImageUrl(params: {
  bankName?: string | null;
  accountNumber: string;
  amount?: number;
  transferContent?: string;
  accountHolderName?: string | null;
}): string {
  const bin = resolveBankBin(params.bankName);
  const base = `https://img.vietqr.io/image/${bin}-${params.accountNumber}-compact2.png`;
  const query = new URLSearchParams();

  if (params.amount !== undefined && params.amount > 0) {
    query.set('amount', String(Math.round(params.amount)));
  }
  if (params.transferContent) {
    query.set('addInfo', params.transferContent);
  }
  if (params.accountHolderName) {
    query.set('accountName', params.accountHolderName);
  }

  const qs = query.toString();
  return qs ? `${base}?${qs}` : base;
}
