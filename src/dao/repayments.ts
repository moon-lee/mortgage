export interface RepaymentRow {
  id: number;
  entry_date: string;
  finance_year: string;
  scheduled_balance: number;
  actual_balance: number;
  fy_interest: number;
  offset_saving_fy: number;
  actual_repayment: number;
  scheduled_payment: number;
  interest_charged: number;
  base_amount: number;
  fee: number;
  total_paid: number;
  extra_paid: number;
}

export async function listRepayments(finance: any, financeYear?: string): Promise<RepaymentRow[]> {
  const filter = financeYear ? { finance_year: financeYear } : {};
  const rows = (await finance.db.table('mortgage_repayments').find(filter)) as RepaymentRow[];
  return rows.slice().sort((a, b) => (a.entry_date < b.entry_date ? -1 : 1));
}

export async function getLatest(finance: any): Promise<RepaymentRow | null> {
  const rows = await listRepayments(finance);
  return rows.length ? rows[rows.length - 1] : null;
}

export async function deleteRepayment(finance: any, id: number): Promise<void> {
  await finance.db.table('mortgage_offset_balances').delete({ repayment_id: id });
  await finance.db.table('mortgage_repayments').delete({ id });
}
