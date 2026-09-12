import { LitElement, css, html } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { listAccounts } from '../dao/accounts.js';
import { listRepayments } from '../dao/repayments.js';
import { listBalancesForRepayment } from '../dao/offset-balances.js';
import { aud } from '../utils/format.js';

const Base = typeof HTMLElement !== 'undefined' ? LitElement : (class {} as unknown as typeof LitElement);

export class MortgageOffsetsView extends Base {
  static override styles = typeof HTMLElement !== 'undefined' ? [sharedStyles, css`
    .matrix-scroll{overflow-x:auto}
    .matrix-scroll table{min-width:960px}
    .hist-table{width:100%;border-collapse:collapse;table-layout:fixed}
    .hist-table thead th{font-size:var(--ff-font-sm);font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--ff-text-muted,#858585);text-align:left;padding:8px 10px;border-bottom:1px solid var(--ff-border,#3e3e3e);white-space:nowrap}
    .hist-table thead th.num{text-align:right}
    .hist-table tbody td{padding:9px 10px;border-bottom:1px solid var(--ff-border,#3e3e3e);font-size:var(--ff-font-base);white-space:nowrap}
    .hist-table tbody tr:nth-child(even){background:var(--ff-bg-subpanel,#2a2a2a)}
    .hist-table tbody tr:hover{background:var(--ff-bg-input-hover,#4a4a4a)}
    .hist-table tbody tr.latest{background:var(--ff-bg-input,#3c3c3c);box-shadow:inset 3px 0 0 var(--ff-accent,#007acc)}
    .hist-table td.num{text-align:right;font-variant-numeric:tabular-nums}
    .hist-table td.money{font-weight:700;color:var(--ff-text-strong,#fff)}
    .hist-table td.saving{font-weight:700;color:var(--ff-accent,#007acc)}
    .latest-tag{display:inline-block;margin-left:8px;font-size:var(--ff-font-sm);font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--ff-accent,#007acc)}
    .section-header{padding-top:4px;padding-bottom:4px}
    .stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    @media (max-width:640px){.stat-grid{grid-template-columns:1fr}}
    .stat{background:var(--ff-bg-subpanel,#2a2a2a);border:1px solid var(--ff-border,#3e3e3e);border-radius:6px;padding:12px 14px;min-width:0}
    .stat-label{font-size:var(--ff-font-sm);font-weight:600;text-transform:uppercase;letter-spacing:.3px;color:var(--ff-text-muted,#858585);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .stat-value{font-size:var(--ff-font-xl);font-weight:600;color:var(--ff-text-strong,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
    .stat-value.accent{color:var(--ff-accent,#007acc)}
  `] as any : [];
  finance: any = null;
  accounts: any[] = [];
  grid: Array<{ entry_date: string; repayment_id: number; balances: Record<number, number>; total: number }> = [];
  error = '';

  async setFinance(f: any): Promise<void> {
    this.finance = f;
    await this.load();
  }

  async load(): Promise<void> {
    if (!this.finance) return;
    try {
      this.error = '';
      this.accounts = await listAccounts(this.finance);
      const rows = await listRepayments(this.finance);
      this.grid = [];
      for (const r of rows) {
        const bals = await listBalancesForRepayment(this.finance, r.id);
        const byAccount: Record<number, number> = {};
        for (const b of bals) byAccount[b.account_id] = Number(b.balance || 0);
        this.grid.push({
          entry_date: r.entry_date,
          repayment_id: r.id,
          balances: byAccount,
          total: bals.reduce((s: number, b: any) => s + Number(b.balance || 0), 0),
        });
      }
    } catch (e: any) {
      this.error = String(e?.message || e);
    }
    (this as any).requestUpdate?.();
  }

  override render(): unknown {
    if (typeof HTMLElement === 'undefined') return html``;
    const ordered = [...this.grid].reverse();
    const latest: any = ordered.length ? ordered[0] : null;
    const mainAcct = this.accounts.find((a: any) => a.account_key === '0390');
    const mainBal = latest && mainAcct ? Number(latest.balances[mainAcct.id] ?? 0) : 0;
    const subBal = latest ? Number(latest.total || 0) - mainBal : 0;
    return html`
      <div class="view-scroll">
      <div class="topbar"><span class="crumb-current">Mortgage · Offsets</span><div class="spacer"></div>
        ${ordered.length ? html`<button class="filter-btn" @click=${() => this.dispatchEvent(new CustomEvent('offset-edit-request', { detail: { entry_date: ordered[0].entry_date }, bubbles: true, composed: true }))}>Edit ${ordered[0].entry_date}</button>` : ''}
      </div>
      <div class="view-container"><div class="view-container-inner">
        <h1>Offsets</h1>
        ${this.error ? html`<p class="field-error">Error: ${this.error}</p>` : ''}
        ${ordered.length ? html`<div class="section">
        <div class="section-header"><h3 class="section-title">Summary · ${latest.entry_date}</h3></div>
        <div class="section-body"><div class="stat-grid">
          <div class="stat"><div class="stat-label">Main Offset · 0390</div><div class="stat-value">${aud(mainBal)}</div></div>
          <div class="stat"><div class="stat-label">Sub Offset · combined</div><div class="stat-value">${aud(subBal)}</div></div>
          <div class="stat"><div class="stat-label">Total balance</div><div class="stat-value accent">${aud(latest.total)}</div></div>
        </div></div></div>` : ''}
        ${ordered.length ? html`<div class="section">
        <div class="section-header"><h3 class="section-title">Balances by date</h3><span class="section-badge">Total ${aud(ordered[0].total)}</span></div>
        <div class="table-wrap matrix-scroll"><table class="hist-table">
          <thead>
            <tr><th></th><th class="num">Main Offset Balance</th><th class="num" colspan="7">Sub Offset Balance</th><th class="num">Total</th><th></th></tr>
            <tr><th>Date</th>${this.accounts.map((a: any) => html`<th class="num">${a.account_key}<br><span style="font-weight:400;text-transform:none">${a.label}</span></th>`)}<th class="num"></th><th></th></tr>
          </thead>
          <tbody>${ordered.map((g: any) => html`<tr>
            <td>${g.entry_date}</td>
            ${this.accounts.map((a: any) => html`<td class="num">${aud(g.balances[a.id] ?? 0)}</td>`)}
            <td class="num saving">${aud(g.total)}</td>
            <td class="actions"><button class="btn-link" @click=${() => this.dispatchEvent(new CustomEvent('offset-edit-request', { detail: { entry_date: g.entry_date }, bubbles: true, composed: true }))}>Edit</button></td>
          </tr>`)}</tbody>
        </table></div></div>` : html`<p class="empty">No offset balances yet — add a month-end entry from the Ledger.</p>`}
      </div></div>
      </div>
    `;
  }
}
