export interface OffsetBalanceRow {
  id: number;
  repayment_id: number;
  account_id: number;
  balance: number;
}

export async function listBalancesForRepayment(finance: any, repaymentId: number): Promise<OffsetBalanceRow[]> {
  return (await finance.db.table('mortgage_offset_balances').find({ repayment_id: repaymentId })) as OffsetBalanceRow[];
}

export async function sumBalancesForRepayment(finance: any, repaymentId: number): Promise<number> {
  const rows = await listBalancesForRepayment(finance, repaymentId);
  return rows.reduce((s, r) => s + Number(r.balance || 0), 0);
}
