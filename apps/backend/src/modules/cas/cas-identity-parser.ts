import type { CasIdentityResponse } from './cas-client.service';

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickValue(source: unknown, keys: string[]): unknown {
  const record = asRecord(source);
  if (!record) {
    return undefined;
  }
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
}

function firstString(candidates: unknown[]): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
    if (typeof candidate === 'number') {
      return String(candidate);
    }
  }
  return null;
}

function firstObject(candidates: unknown[]): Record<string, unknown> | null {
  for (const candidate of candidates) {
    const record = asRecord(candidate);
    if (record) {
      return record;
    }
  }
  return null;
}

function pickFirstAccount(identity: unknown): Record<string, unknown> | null {
  const record = asRecord(identity);
  if (!record) {
    return null;
  }
  for (const key of ['accounts', 'bankAccs', 'bankAccounts', 'data']) {
    const list = record[key];
    if (Array.isArray(list) && list.length > 0) {
      const account = asRecord(list[0]);
      if (account) {
        return account;
      }
    }
  }
  return asRecord(record.account);
}

export function parseCasIdentity(identity: CasIdentityResponse): {
  accountNumber: string | null;
  accountHolderName: string | null;
  bankName: string | null;
  bankLogo: string | null;
} {
  // Cas/BankHub trả field không nhất quán giữa các ngân hàng (camelCase vs snake_case,
  // có khi lồng trong `account`/`accounts[]`/`bank`). Dò rộng để không rơi mất data.
  const account = pickFirstAccount(identity);
  const owner = firstObject([pickValue(identity, ['owner'])]);
  const fiService = firstObject([
    pickValue(identity, ['fiService', 'fi_service', 'fi']),
    pickValue(account, ['fiService', 'fi_service', 'fi']),
  ]);
  const bank = firstObject([pickValue(identity, ['bank']), pickValue(account, ['bank'])]);

  const accountNumber = firstString([
    pickValue(identity, ['accountNumber', 'account_number', 'accountNo', 'number']),
    pickValue(account, [
      'accountNumber',
      'account_number',
      'accountNo',
      'number',
      'bankSubAccId',
      'subAccId',
    ]),
  ]);

  const accountHolderName = firstString([
    pickValue(account, [
      'accountName',
      'account_name',
      'accountHolderName',
      'account_holder_name',
      'holderName',
      'bankAccountName',
      'name',
    ]),
    pickValue(owner, ['name', 'fullName', 'full_name', 'legalName', 'legal_name']),
    pickValue(identity, [
      'accountHolderName',
      'account_holder_name',
      'holderName',
      'accountName',
      'legalName',
      'fullName',
      'full_name',
      'name',
    ]),
  ]);

  const bankName = firstString([
    pickValue(fiService, ['name', 'shortName', 'brandName', 'brand_name', 'code', 'codeName']),
    pickValue(identity, ['bankName', 'bank_name', 'brandName', 'brand_name', 'fiName']),
    pickValue(account, ['bankName', 'bank_name', 'brandName', 'brand_name', 'fiName', 'fi_name']),
    pickValue(bank, ['name', 'shortName', 'brandName', 'brand_name', 'codeName', 'code_name']),
  ]);

  const bankLogo = firstString([
    pickValue(fiService, ['logo', 'logoUrl', 'logo_url', 'icon']),
    pickValue(bank, ['logo', 'logoUrl', 'logo_url', 'icon']),
    pickValue(account, ['bankLogo', 'bank_logo', 'logo']),
  ]);

  return { accountNumber, accountHolderName, bankName, bankLogo };
}
