import { LitElement, css, html } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { getLoan } from '../dao/loans.js';
import { getSnapshot, getSnapshotHistory, getPaceHistory, getTargetEstimates, getYearly } from '../services/mortgage-service.js';
import { aud } from '../utils/format.js';
import { CANONICAL_CARD_ORDER, normalizeCardOrder, type OverviewCardId } from './overview-cards.js';

const Base = typeof HTMLElement !== 'undefined' ? LitElement : (class {} as unknown as typeof LitElement);

export class MortgageOverviewView extends Base {
  static override styles = typeof HTMLElement !== 'undefined' ? [sharedStyles, css`
    .stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
    @media (max-width:640px){.stat-grid{grid-template-columns:repeat(2,1fr)}}
    .stat{background:var(--ff-bg-subpanel,#2a2a2a);border:1px solid var(--ff-border,#3e3e3e);border-radius:6px;padding:12px 14px;min-width:0}
    .stat-label{font-size:var(--ff-font-sm);font-weight:600;text-transform:uppercase;letter-spacing:.3px;color:var(--ff-text-muted,#858585);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .stat-value{font-size:var(--ff-font-xl);font-weight:600;color:var(--ff-text-strong,#fff);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .header-actions{display:flex;align-items:center;gap:8px}
    .section-header{min-height:42px;padding-top:4px;padding-bottom:4px}
    .header-actions .btn{padding:2px 12px;font-size:var(--ff-font-sm)}
    .section-badge{font-size:var(--ff-font-xs,11px);padding:0 8px}
    .loan-badge,.rate-badge{font-size:var(--ff-font-sm);padding:1px 10px}
    .hist-table{width:100%;border-collapse:collapse;table-layout:fixed}
    .hist-table thead th{font-size:var(--ff-font-sm);font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--ff-text-muted,#858585);text-align:left;padding:8px 10px;border-bottom:1px solid var(--ff-border,#3e3e3e)}
    .hist-table thead th.num{text-align:right}
    .hist-table tbody td{padding:9px 10px;border-bottom:1px solid var(--ff-border,#3e3e3e);font-size:var(--ff-font-base);white-space:nowrap}
    .hist-table thead th{white-space:nowrap}
    .hist-table tbody tr:nth-child(even){background:var(--ff-bg-subpanel,#2a2a2a)}
    .hist-table tbody tr:hover{background:var(--ff-bg-input-hover,#4a4a4a)}
    .hist-table tbody tr.latest{background:var(--ff-bg-input,#3c3c3c);box-shadow:inset 3px 0 0 var(--ff-accent,#007acc)}
    .hist-table td.num{text-align:right;font-variant-numeric:tabular-nums}
    .hist-table td.money{font-weight:700;color:var(--ff-text-strong,#fff)}
    .hist-table td.saving{font-weight:700;color:var(--ff-accent,#007acc)}
    .hist-table td.down{font-weight:700;color:var(--ff-warning-text,#ffd866)}
    .rate-pill{display:inline-block;background:var(--ff-bg-input,#3c3c3c);border:1px solid var(--ff-accent,#007acc);color:var(--ff-accent,#007acc);border-radius:10px;padding:1px 9px;font-size:var(--ff-font-sm);font-weight:700;white-space:nowrap}
    .rate-badge{display:inline-block;font-weight:800;letter-spacing:.3px;color:var(--ff-accent,#007acc);background:var(--ff-bg-input,#3c3c3c);border:1px solid var(--ff-accent,#007acc);border-radius:12px;white-space:nowrap}
    .loan-badge{display:inline-block;font-weight:800;letter-spacing:.3px;color:var(--ff-accent,#007acc);background:var(--ff-bg-input,#3c3c3c);border:1px solid var(--ff-accent,#007acc);border-radius:12px;white-space:nowrap}
    .latest-tag{display:inline-block;margin-left:8px;font-size:var(--ff-font-sm);font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:var(--ff-accent,#007acc)}
    .order-stack{display:flex;flex-direction:column}
    .hist-table thead th{padding:6px 8px}
    .hist-table tbody td{padding:6px 8px}
    .muted{color:var(--ff-text-muted,#858585);font-size:var(--ff-font-sm)}
  `] as any : [];
  finance: any = null;
  loan: any = null;
  snapshot: any = null;
  history: any[] = [];
  targets: any = null;
  paceHistory: any[] = [];
  showPaceHistory = false;
  cardOrder: OverviewCardId[] = [...CANONICAL_CARD_ORDER];

  private cardIndex(id: OverviewCardId): number {
    const order = normalizeCardOrder(this.cardOrder);
    const i = order.indexOf(id);
    return i < 0 ? 99 : i;
  }
  yearly: any[] = [];
  error = '';
  editingLoan = false;
  editingTargets = false;
  showHistory = false;

  async setFinance(f: any): Promise<void> {
    this.finance = f;
    await this.load();
  }

  async load(): Promise<void> {
    if (!this.finance) return;
    try {
      this.error = '';
      this.loan = await getLoan(this.finance);
      this.snapshot = await getSnapshot(this.finance);
      this.history = await getSnapshotHistory(this.finance);
      this.targets = await getTargetEstimates(this.finance);
      this.paceHistory = await getPaceHistory(this.finance);
      this.yearly = await getYearly(this.finance, 5);
    } catch (e: any) {
      this.error = String(e?.message || e);
    }
    (this as any).requestUpdate?.();
  }

  private emit(name: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
  }

  private saveTargets(): void {
    const root = (this as any).renderRoot as ShadowRoot | undefined;
    const q = (id: string): number => MortgageOverviewView.rawNumber((root?.querySelector(id) as HTMLInputElement)?.value);
    this.emit('target-edit', { target_amount_offset: q('#t-offset'), target_amount_subtotal: q('#t-subtotal') });
  }

  private static rawNumber(text: string): number {
    return Number(String(text ?? '').replace(/[^0-9.\-]/g, ''));
  }

  private static grouped(value: unknown): string {
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    return n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private moneyFocus(e: Event): void {
    const input = e.target as HTMLInputElement;
    const n = MortgageOverviewView.rawNumber(input.value);
    input.value = Number.isFinite(n) ? String(n) : '';
    input.select?.();
  }

  private moneyBlur(e: Event): void {
    const input = e.target as HTMLInputElement;
    input.value = MortgageOverviewView.grouped(MortgageOverviewView.rawNumber(input.value));
  }

  private saveLoan(): void {
    const root = (this as any).renderRoot as ShadowRoot | undefined;
    const q = (id: string): number => MortgageOverviewView.rawNumber((root?.querySelector(id) as HTMLInputElement)?.value);
    this.emit('target-edit', {
      property_value: q('#l-property'),
      deposit_amount: q('#l-deposit'),
      loan_amount: q('#l-loan'),
      set_payment: q('#l-set'),
    });
  }

  override render(): unknown {
    if (typeof HTMLElement === 'undefined') return html``;
    const loan = this.loan || {};
    const snap = this.snapshot || {};
    const t = this.targets || {};
    return html`
      <div class="view-scroll">
      <div class="topbar"><span class="crumb-current">Mortgage · Overview</span><div class="spacer"></div>
        <button class="filter-btn" @click=${() => this.emit('reorder-cards')}>⇅ Cards</button>
        <button class="filter-btn" @click=${() => this.emit('monthend-add-request')}>Add month-end entry</button></div>
      <div class="view-container"><div class="view-container-inner order-stack">
        ${this.error ? html`<div class="section"><div class="section-body"><p class="field-error">Error: ${this.error}</p></div></div>` : ''}
        <div class="section" style="order:${this.cardIndex('loan')}">
          <div class="section-header"><h3 class="section-title">Loan setup</h3><div class="header-actions"><span class="loan-badge">${aud(loan.loan_amount ?? 0)} over ${loan.term_years ?? 30}yrs</span><button class="btn btn-secondary" @click=${() => { this.editingLoan = !this.editingLoan; (this as any).requestUpdate?.(); }}>${this.editingLoan ? 'Cancel' : 'Set loan'}</button></div></div>
          <div class="section-body">
            ${this.editingLoan ? html`
            <div class="grid-2">
              <div class="field"><label>Property <span class="label-sub">AUD</span></label><input id="l-property" type="text" inputmode="decimal" .value=${MortgageOverviewView.grouped(loan.property_value ?? 0)} @focus=${(e: Event) => this.moneyFocus(e)} @blur=${(e: Event) => this.moneyBlur(e)}></div>
              <div class="field"><label>Deposit <span class="label-sub">AUD</span></label><input id="l-deposit" type="text" inputmode="decimal" .value=${MortgageOverviewView.grouped(loan.deposit_amount ?? 0)} @focus=${(e: Event) => this.moneyFocus(e)} @blur=${(e: Event) => this.moneyBlur(e)}></div>
              <div class="field"><label>Loan <span class="label-sub">AUD</span></label><input id="l-loan" type="text" inputmode="decimal" .value=${MortgageOverviewView.grouped(loan.loan_amount ?? 0)} @focus=${(e: Event) => this.moneyFocus(e)} @blur=${(e: Event) => this.moneyBlur(e)}></div>
              <div class="field"><label>Set payment <span class="label-sub">AUD / mo</span></label><input id="l-set" type="text" inputmode="decimal" .value=${MortgageOverviewView.grouped(loan.set_payment ?? 0)} @focus=${(e: Event) => this.moneyFocus(e)} @blur=${(e: Event) => this.moneyBlur(e)}></div>
            </div>
            <div class="footer"><button class="btn btn-primary" @click=${() => { this.editingLoan = false; this.saveLoan(); }}>Save loan</button></div>
            ` : html`
            <div class="stat-grid">
              <div class="stat"><div class="stat-label">Property</div><div class="stat-value">${aud(loan.property_value ?? 0)}</div></div>
              <div class="stat"><div class="stat-label">Deposit</div><div class="stat-value">${aud(loan.deposit_amount ?? 0)}</div></div>
              <div class="stat"><div class="stat-label">Loan</div><div class="stat-value">${aud(loan.loan_amount ?? 0)}</div></div>
              <div class="stat"><div class="stat-label">Set / mo</div><div class="stat-value">${aud(loan.set_payment ?? 0)}</div></div>
            </div>
            `}
          </div>
        </div>
        <div class="section" style="order:${this.cardIndex('snapshot')}">
          <div class="section-header"><h3 class="section-title">Daily interest snapshot</h3><div class="header-actions">${snap.rate != null ? html`<span class="rate-badge">Rate @ ${(Number(snap.rate) * 100).toFixed(2)}%</span>` : ''}<button class="btn btn-secondary" @click=${() => { this.showHistory = !this.showHistory; (this as any).requestUpdate?.(); }}>${this.showHistory ? 'Hide history' : 'History'}</button></div></div>
          <div class="section-body">
            ${snap.entry_date ? html`
            <div class="table-wrap"><table class="hist-table">
              <colgroup><col style="width:18%"><col style="width:14%"><col style="width:14%"><col style="width:15%"><col style="width:10%"><col style="width:14%"><col style="width:15%"></colgroup>
              <thead><tr><th>As at</th><th class="num">Loan</th><th class="num">Offset</th><th class="num">Net loan</th><th>Rate</th><th class="num">Daily</th><th class="num">Monthly</th></tr></thead>
              <tbody><tr class="latest">
                <td>${snap.entry_date}<span class="latest-tag">latest</span></td>
                <td class="num">${aud(snap.loan)}</td><td class="num">${aud(snap.offset_total)}</td>
                <td class="num money">${aud(Number(snap.loan) - Number(snap.offset_total))}</td>
                <td>${snap.rate == null ? '—' : html`<span class="rate-pill">${(Number(snap.rate) * 100).toFixed(2)}%</span>`}</td>
                <td class="num money">${aud(snap.daily)}</td><td class="num saving">${aud(snap.monthly)}</td>
              </tr></tbody>
            </table></div>
            ${this.showHistory && (this.history || []).length ? html`<div class="table-wrap" style="margin-top:12px"><table class="hist-table">
              <colgroup><col style="width:15%"><col style="width:15%"><col style="width:15%"><col style="width:15%"><col style="width:12%"><col style="width:14%"><col style="width:14%"></colgroup>
              <thead><tr><th>Date</th><th class="num">Loan</th><th class="num">Offset</th><th class="num">Net loan</th><th>Rate</th><th class="num">Daily</th><th class="num">Monthly</th></tr></thead>
              <tbody>${[...this.history].reverse().map((h: any, i: number) => html`<tr class=${i === 0 ? 'latest' : ''}>
                <td>${h.entry_date}${i === 0 ? html`<span class="latest-tag">latest</span>` : ''}</td>
                <td class="num">${aud(h.loan)}</td><td class="num">${aud(h.offset_total)}</td><td class="num money">${aud(Number(h.loan) - Number(h.offset_total))}</td>
                <td>${h.rate == null ? '—' : html`<span class="rate-pill">${(Number(h.rate) * 100).toFixed(2)}%</span>`}</td>
                <td class="num money">${aud(h.daily)}</td><td class="num saving">${aud(h.monthly)}</td>
              </tr>`)}</tbody>
            </table></div>` : ''}
            ` : html`<span class="empty">No snapshots yet — add a month-end entry.</span>`}
          </div>
        </div>
        <div class="section" style="order:${this.cardIndex('targets')}">
          <div class="section-header"><h3 class="section-title">Savings targets</h3><div class="header-actions"><button class="btn btn-secondary" @click=${() => { this.showPaceHistory = !this.showPaceHistory; (this as any).requestUpdate?.(); }}>${this.showPaceHistory ? 'Hide pace history' : 'Pace history'}</button><button class="btn btn-secondary" @click=${() => { this.editingTargets = !this.editingTargets; (this as any).requestUpdate?.(); }}>${this.editingTargets ? 'Cancel' : 'Set target'}</button></div></div>
          <div class="section-body">
            ${this.editingTargets ? html`
            <div class="grid-2">
              <div class="field"><label>Main Offset target <span class="label-sub">AUD</span></label><input id="t-offset" type="text" inputmode="decimal" .value=${MortgageOverviewView.grouped(t.target_offset ?? 100000)} @focus=${(e: Event) => this.moneyFocus(e)} @blur=${(e: Event) => this.moneyBlur(e)}></div>
              <div class="field"><label>Sub Offset target <span class="label-sub">AUD</span></label><input id="t-subtotal" type="text" inputmode="decimal" .value=${MortgageOverviewView.grouped(t.target_subtotal ?? 100000)} @focus=${(e: Event) => this.moneyFocus(e)} @blur=${(e: Event) => this.moneyBlur(e)}></div>
            </div>
            <div class="footer"><button class="btn btn-primary" @click=${() => { this.editingTargets = false; this.saveTargets(); }}>Save targets</button></div>
            ` : html`
            <div class="table-wrap"><table class="hist-table">
              <colgroup><col style="width:18%"><col style="width:41%"><col style="width:41%"></colgroup>
              <thead><tr><th></th><th class="num">Main Offset <span class="muted">0390</span></th><th class="num">Sub Offset <span class="muted">combined</span></th></tr></thead>
              <tbody>
              <tr><td>Target</td><td class="num money">${aud(t.target_offset ?? 100000)}</td><td class="num money">${aud(t.target_subtotal ?? 100000)}</td></tr>
              <tr><td title="Straight-line pace over full history plus estimated period at that pace">Avg · period</td><td class="num">${aud(t.avg_offset ?? 0)}/mo · ${t.period_offset ?? ''}</td><td class="num">${aud(t.avg_subtotal ?? 0)}/mo · ${t.period_subtotal ?? ''}</td></tr>
              <tr><td title="Target date plus trailing-12m pace (mean of month-to-month changes over the last 12 snapshots)">Date · trail</td><td class="num">${t.date_offset ?? ''} · ${aud(t.trail_avg_offset ?? 0)}/mo</td><td class="num">${t.date_subtotal ?? ''} · ${aud(t.trail_avg_subtotal ?? 0)}/mo</td></tr>
              </tbody>
            </table></div>
            ${this.showPaceHistory && (this.paceHistory || []).length ? html`<div class="table-wrap" style="margin-top:12px"><table class="hist-table">
              <colgroup><col style="width:16%"><col style="width:14%"><col style="width:14%"><col style="width:14%"><col style="width:14%"><col style="width:14%"><col style="width:14%"></colgroup>
              <thead><tr><th>Date</th><th class="num">Main bal</th><th class="num">Main Δ</th><th class="num">Main pace</th><th class="num">Sub bal</th><th class="num">Sub Δ</th><th class="num">Sub pace</th></tr></thead>
              <tbody>${[...this.paceHistory].reverse().map((p: any, i: number) => html`<tr class=${i === 0 ? 'latest' : ''}>
                <td>${p.entry_date}${i === 0 ? html`<span class="latest-tag">latest</span>` : ''}</td>
                <td class="num">${aud(p.main_balance)}</td><td class=${Number(p.main_change) < 0 ? 'num down' : 'num'} title="Month change">${aud(p.main_change)}</td><td class="num money">${aud(p.main_pace)}</td>
                <td class="num">${aud(p.sub_balance)}</td><td class=${Number(p.sub_change) < 0 ? 'num down' : 'num'} title="Month change">${aud(p.sub_change)}</td><td class="num money">${aud(p.sub_pace)}</td>
              </tr>`)}</tbody>
            </table></div>` : ''}
            `}
          </div>
        </div>
        <div class="section" style="order:${this.cardIndex('yearly')}">
          <div class="section-header"><h3 class="section-title">Yearly Repayment Summary</h3></div>
          <div class="section-body">
          <div class="table-wrap"><table class="hist-table">
            <colgroup><col style="width:24%"><col style="width:20%"><col style="width:20%"><col style="width:18%"><col style="width:18%"></colgroup>
            <thead><tr><th>Finance Year</th><th class="num">Paid</th><th class="num">Interest</th><th class="num">P-ratio</th><th class="num">I-ratio</th></tr></thead>
            <tbody>${[...(this.yearly || [])].reverse().map((y: any, i: number) => html`<tr class=${i === 0 ? 'latest' : ''}>
              <td>${y.finance_year}${i === 0 ? html`<span class="latest-tag">current</span>` : ''}</td><td class="num">${aud(y.paid)}</td><td class="num">${aud(y.interest)}</td>
              <td class="num saving">${(Number(y.principal_ratio) * 100).toFixed(1)}%</td>
              <td class="num">${((1 - Number(y.principal_ratio)) * 100).toFixed(1)}%</td>
            </tr>`)}</tbody>
          </table></div>
          </div>
        </div>
      </div></div>
      </div>
    `;
  }
}
