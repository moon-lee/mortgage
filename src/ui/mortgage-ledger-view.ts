import { LitElement, css, html } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { listRepayments } from '../dao/repayments.js';
import { aud } from '../utils/format.js';

const Base = typeof HTMLElement !== 'undefined' ? LitElement : (class {} as unknown as typeof LitElement);

export class MortgageLedgerView extends Base {
  static override styles = typeof HTMLElement !== 'undefined' ? [sharedStyles, css`
    .hist-table{width:100%;border-collapse:collapse;table-layout:fixed}
    .hist-table thead th{font-size:var(--ff-font-sm);font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--ff-text-muted,#858585);text-align:left;padding:8px 10px;border-bottom:1px solid var(--ff-border,#3e3e3e);white-space:nowrap}
    .hist-table thead th.num{text-align:right}
    .hist-table tbody td{padding:9px 10px;border-bottom:1px solid var(--ff-border,#3e3e3e);font-size:var(--ff-font-base);white-space:nowrap}
    .hist-table tbody tr:nth-child(even){background:var(--ff-bg-subpanel,#2a2a2a)}
    .hist-table tbody tr:hover{background:var(--ff-bg-input-hover,#4a4a4a)}
    .hist-table tbody tr.latest{background:var(--ff-bg-input,#3c3c3c);box-shadow:inset 3px 0 0 var(--ff-accent,#007acc)}
    .hist-table tbody tr.fy-edge{background-color:var(--ff-bg-input,#3c3c3c)}
    .fy-tag{display:inline-block;margin-left:8px;font-size:var(--ff-font-sm);font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--ff-text-muted,#858585)}
    .hist-table td.num{text-align:right;font-variant-numeric:tabular-nums}
    .hist-table td.money{font-weight:700;color:var(--ff-text-strong,#fff)}
    .hist-table td.down{font-weight:700;color:var(--ff-warning-text,#ffd866)}
    .hist-table td.saving{font-weight:700;color:var(--ff-accent,#007acc)}
    .section-header{padding-top:4px;padding-bottom:4px}
    .latest-tag{display:inline-block;margin-left:8px;font-size:var(--ff-font-sm);font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--ff-accent,#007acc)}
    .ledger-scroll{overflow-x:auto}
    .ledger-scroll table{min-width:960px}
  `] as any : [];
  finance: any = null;
  rows: any[] = [];
  fy = '';
  error = '';

  async setFinance(f: any): Promise<void> {
    this.finance = f;
    await this.load();
  }

  async load(): Promise<void> {
    if (!this.finance) return;
    try {
      this.error = '';
      this.rows = await listRepayments(this.finance, this.fy || undefined);
    } catch (e: any) {
      this.error = String(e?.message || e);
    }
    (this as any).requestUpdate?.();
  }

  private emit(name: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  override render(): unknown {
    if (typeof HTMLElement === 'undefined') return html``;
    return html`
      <div class="view-scroll">
      <div class="topbar"><span class="crumb-current">Mortgage · Repayment Ledger</span><div class="spacer"></div>
        <select class="filter-btn" @change=${(e: any) => { this.fy = (e.target as HTMLSelectElement).value; this.emit('fy-changed', { fy: this.fy }); this.load(); }}>
          <option value="">All FYs</option>
          ${[...new Set(this.rows.map((r: any) => r.finance_year))].map((f: string) => html`<option value=${f} ?selected=${this.fy === f}>${f}</option>`)}
        </select>
        <button class="filter-btn" @click=${() => this.emit('monthend-add-request')}>Add month-end entry</button></div>
      <div class="view-container"><div class="view-container-inner">
        <h1>Repayment Ledger</h1>
        ${this.error ? html`<p class="field-error">Error: ${this.error}</p>` : ''}
        <div class="section">
          <div class="section-header"><h3 class="section-title">Snapshots</h3><span class="section-badge">${this.rows.length} rows</span></div>
          <div class="table-wrap ledger-scroll"><table class="hist-table">
            <colgroup><col style="width:15%"><col style="width:13%"><col style="width:14%"><col style="width:12%"><col style="width:12%"><col style="width:11%"><col style="width:11%"><col style="width:12%"></colgroup>
            <thead><tr><th>Date</th><th class="num">Sched bal</th><th class="num">Actual</th><th class="num">FY interest</th><th class="num">FY offset</th><th class="num">Interest</th><th class="num">Extra</th><th></th></tr></thead>
            <tbody>${(() => { const ordered = [...this.rows].reverse(); return ordered.map((r: any, i: number) => {
              const newerFy = i > 0 ? ordered[i - 1].finance_year : r.finance_year;
              const olderFy = i < ordered.length - 1 ? ordered[i + 1].finance_year : r.finance_year;
              const isEnd = newerFy !== r.finance_year;
              const isStart = olderFy !== r.finance_year;
              const edge = isEnd || isStart;
              return html`<tr class=${(i === 0 ? 'latest ' : '') + (edge ? 'fy-edge' : '')}>
              <td>${r.entry_date}${i === 0 ? html`<span class="latest-tag">latest</span>` : ''}${isEnd && i !== 0 ? html`<span class="fy-tag">FY end</span>` : ''}${isStart ? html`<span class="fy-tag">FY start</span>` : ''}</td><td class="num">${aud(r.scheduled_balance)}</td>
              <td class="num money">${aud(r.actual_balance)}</td><td class=${isEnd ? 'num saving' : isStart ? 'num down' : 'num'}>${aud(r.fy_interest)}</td><td class=${isEnd ? 'num saving' : isStart ? 'num down' : 'num'}>${aud(r.offset_saving_fy)}</td>
              <td class="num">${aud(r.interest_charged)}</td>
              <td class=${Number(r.extra_paid) < 0 ? 'num down' : 'num'}>${aud(r.extra_paid)}</td>
              <td class="actions"><button class="btn-link" @click=${() => this.emit('offset-edit-request', { entry_date: r.entry_date })}>Edit</button><button class="btn-link danger" @click=${() => { if (confirm('Delete ' + r.entry_date + ' and its offset balances?')) this.emit('monthend-delete', { id: r.id }); }}>Delete</button></td>
            </tr>`; }); })()}</tbody>
          </table></div>
        </div>
        ${this.rows.length === 0 ? html`<p class="empty">No snapshots yet.</p>` : ''}
      </div></div>
      </div>
    `;
  }
}
