export interface AccountRow {
  id: number;
  account_key: string;
  label: string;
  sort_order: number;
  is_active: boolean;
}

export const SEED_ACCOUNTS: ReadonlyArray<{ account_key: string; label: string; sort_order: number }> = [
  { account_key: '0390', label: 'Offset', sort_order: 1 },
  { account_key: '3564', label: 'My Trans', sort_order: 2 },
  { account_key: '5272', label: 'Emergency', sort_order: 3 },
  { account_key: '3545', label: 'Car', sort_order: 4 },
  { account_key: '9722', label: 'Emergency 2', sort_order: 5 },
  { account_key: '8107', label: 'Solar', sort_order: 6 },
  { account_key: '4323', label: 'Investment', sort_order: 7 },
  { account_key: '0743', label: 'My Childs', sort_order: 8 },
];

export async function listAccounts(finance: any): Promise<AccountRow[]> {
  const rows = (await finance.db.table('mortgage_accounts').find({})) as AccountRow[];
  return rows
    .map((r) => ({ ...r, is_active: r.is_active ? true : false }))
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function listActiveAccounts(finance: any): Promise<AccountRow[]> {
  return (await listAccounts(finance)).filter((a) => a.is_active);
}

export async function createAccount(finance: any, input: { account_key: string; label: string }): Promise<number> {
  const key = String(input.account_key || '').trim();
  const label = String(input.label || '').trim();
  if (!key) throw new Error('ValidationFailed: account key is required (e.g. 0390)');
  if (!label) throw new Error('ValidationFailed: account label is required');
  const existing = await listAccounts(finance);
  if (existing.some((a) => a.account_key === key)) throw new Error('ValidationFailed: account key ' + key + ' already exists');
  const sort = existing.reduce((m, a) => Math.max(m, Number(a.sort_order) || 0), 0) + 1;
  const res = await finance.db.table('mortgage_accounts').insert({ account_key: key, label, sort_order: sort, is_active: true });
  return res.id as number;
}

export async function renameAccount(finance: any, id: number, label: string): Promise<void> {
  const name = String(label || '').trim();
  if (!name) throw new Error('ValidationFailed: account label is required');
  const existing = (await finance.db.table('mortgage_accounts').findOne({ id })) as AccountRow | null;
  if (!existing) throw new Error('ValidationFailed: account not found');
  await finance.db.table('mortgage_accounts').update({ id }, { label: name });
}

/** Deactivate only — rows are never deleted; balance history points at them. */
export async function setAccountActive(finance: any, id: number, active: boolean): Promise<void> {
  const existing = (await finance.db.table('mortgage_accounts').findOne({ id })) as AccountRow | null;
  if (!existing) throw new Error('ValidationFailed: account not found');
  if (!active) {
    const actives = await listActiveAccounts(finance);
    if (actives.length <= 1 && actives.some((a) => a.id === id)) {
      throw new Error('ValidationFailed: cannot deactivate the last active account');
    }
  }
  await finance.db.table('mortgage_accounts').update({ id }, { is_active: active });
}

export async function ensureAccounts(finance: any): Promise<AccountRow[]> {
  const existing = await listAccounts(finance);
  if (existing.length >= 8) return existing;
  const have = new Set(existing.map((r) => r.account_key));
  for (const s of SEED_ACCOUNTS) {
    if (!have.has(s.account_key)) {
      await finance.db.table('mortgage_accounts').insert({ ...s, is_active: true });
    }
  }
  return listAccounts(finance);
}
