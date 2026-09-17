import { LitElement, css, html } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { listActiveAccounts } from '../dao/accounts.js';
import { listRepayments } from '../dao/repayments.js';
import { listBalancesForRepayment } from '../dao/offset-balances.js';
import { computeFinanceYear } from '../utils/finance-year.js';
import { aud } from '../utils/format.js';

const Base =
  typeof HTMLElement !== 'undefined'
    ? LitElement
    : (class {} as unknown as typeof LitElement);

interface Derived {
  actual_repayment: number;
  scheduled_payment: number;
  interest_charged: number;
  base_amount: number;
  fee: number;
  total_paid: number;
  extra_paid: number;
  fromDate: string;
  fyFirst: boolean;
}

/**
 * Month-end entry — 5 bank inputs (date, scheduled + actual balance, FY interest,
 * FY offset saving) + offset balances. Flows (F/G/H/I/K/L) derive live from the
 * previous snapshot using the sheet formulas (F=Eprev−E, G=Bprev−B, H=C−Cprev
 * or H=C in an FY-first month, I=H+G, K=I+8, L=F−G). First snapshot ever has no
 * previous row, so all fields stay manual.
 */
export class MortgageMonthEndForm extends Base {
  static override styles =
    typeof HTMLElement !== 'undefined'
      ? ([
          sharedStyles,
          css`
            .derived-table {
              width: 100%;
              border-collapse: collapse;
            }
            .derived-table td {
              padding: 7px 10px;
              border-bottom: 1px solid var(--ff-border, #3e3e3e);
              font-size: var(--ff-font-base);
            }
            .derived-table td:last-child {
              text-align: right;
            }
            .derived-table tr:last-child td {
              border-bottom: none;
            }
            .derived-table td.num {
              text-align: right;
              font-variant-numeric: tabular-nums;
              font-weight: 600;
            }
            .header-actions {
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .section-header {
              padding-top: 4px;
              padding-bottom: 4px;
            }
            .code-in {
              display: inline-block;
              font-size: var(--ff-font-sm);
              font-weight: 800;
              letter-spacing: 0.3px;
              color: var(--ff-accent, #007acc);
              background: var(--ff-bg-input, #3c3c3c);
              border: 1px solid var(--ff-accent, #007acc);
              border-radius: 9px;
              padding: 0 7px;
              white-space: nowrap;
            }
            .code-out {
              display: inline-block;
              font-size: var(--ff-font-sm);
              font-weight: 800;
              letter-spacing: 0.3px;
              color: var(--ff-teal, #4ec9b0);
              background: var(--ff-bg-input, #3c3c3c);
              border: 1px solid var(--ff-teal, #4ec9b0);
              border-radius: 9px;
              padding: 0 7px;
              white-space: nowrap;
            }
            .two-col {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 4px 16px;
            }
            .two-col .inline-field-input {
              flex: 0 0 190px;
              width: 190px;
              min-width: 0;
            }
            @media (max-width: 900px) {
              .two-col {
                grid-template-columns: 1fr;
              }
            }
          `,
        ] as any)
      : [];
  finance: any = null;
  accounts: any[] = [];
  rows: any[] = [];
  prefill: Record<string, number> = {};
  prevValues: Record<string, number> = {};
  fyStart = '07-01';
  error = '';
  /** User overrides for derived flows (raw strings); empty = follow live calculation. */
  drafts: Record<string, string> = {};
  private bankTouched = false;

  private touchBank(): void {
    this.bankTouched = true;
    this.refreshDerived();
  }

  async setFinance(f: any): Promise<void> {
    this.finance = f;
    await this.load();
  }

  async load(prefillDate?: string): Promise<void> {
    if (!this.finance) return;
    try {
      this.error = '';
      this.accounts = await listActiveAccounts(this.finance);
      this.rows = await listRepayments(this.finance);
      try {
        const s = await this.finance.settings.get('core.financialYear.start');
        if (typeof s === 'string' && /^\d{2}-\d{2}$/.test(s)) this.fyStart = s;
      } catch {
        /* default */
      }
      this.prefill = {};
      this.prevValues = {};
      const target = prefillDate
        ? this.rows.find((r: any) => r.entry_date === prefillDate)
        : this.rows[this.rows.length - 1];
      if (target) {
        this.prevValues = {
          entry_date: target.entry_date,
          scheduled_balance: Number(target.scheduled_balance),
          actual_balance: Number(target.actual_balance),
          fy_interest: Number(target.fy_interest),
          offset_saving_fy: Number(target.offset_saving_fy),
          fee: Number(target.fee ?? 8),
        };
        const bals = await listBalancesForRepayment(this.finance, target.id);
        for (const b of bals) {
          const a = this.accounts.find((x: any) => x.id === b.account_id);
          if (a) this.prefill[a.account_key] = Number(b.balance);
        }
      }
    } catch (e: any) {
      this.error = String(e?.message || e);
    }
    (this as any).requestUpdate?.();
  }

  private emit(name: string, detail?: unknown): void {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true }),
    );
  }

  private static rawNumber(text: string): number {
    return Number(String(text ?? '').replace(/[^0-9.\-]/g, ''));
  }

  private static grouped(value: unknown): string {
    const n = Number(value);
    if (!Number.isFinite(n)) return '';
    return n.toLocaleString('en-AU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private moneyFocus(e: Event): void {
    const input = e.target as HTMLInputElement;
    const n = MortgageMonthEndForm.rawNumber(input.value);
    input.value = Number.isFinite(n) ? String(n) : '';
    input.select?.();
    this.refreshDerived();
  }

  private moneyBlur(e: Event): void {
    const input = e.target as HTMLInputElement;
    input.value = MortgageMonthEndForm.grouped(
      MortgageMonthEndForm.rawNumber(input.value),
    );
    this.refreshDerived();
  }

  private field(id: string): string {
    const root = (this as any).renderRoot as ShadowRoot | undefined;
    return (root?.querySelector(id) as HTMLInputElement)?.value ?? '';
  }

  private num(id: string): number {
    return MortgageMonthEndForm.rawNumber(this.field(id));
  }

  /** Previous snapshot strictly before the entered date (sheet row above). */
  private prevFor(date: string): any {
    const earlier = this.rows.filter((r: any) => r.entry_date < date);
    return earlier.length ? earlier[earlier.length - 1] : null;
  }

  private derived(): Derived | null {
    const date = this.field('#m-date') || new Date().toISOString().slice(0, 10);
    const prev = this.prevFor(date);
    if (!prev) return null;
    const b = this.num('#m-sched-bal');
    const e = this.num('#m-actual-bal');
    const c = this.num('#m-fy-int');
    const feeRaw = this.field('#m-fee');
    const fee = feeRaw === '' ? 8 : this.num('#m-fee');
    if (![b, e, c, fee].every(Number.isFinite)) return null;
    const actual_repayment = Number(prev.actual_balance) - e;
    const scheduled_payment = Number(prev.scheduled_balance) - b;
    const sameFy =
      computeFinanceYear(date, this.fyStart) === String(prev.finance_year);
    const interest_charged = sameFy ? c - Number(prev.fy_interest) : c;
    const base_amount = interest_charged + scheduled_payment;
    return {
      actual_repayment: Math.round(actual_repayment * 100) / 100,
      scheduled_payment: Math.round(scheduled_payment * 100) / 100,
      interest_charged: Math.round(interest_charged * 100) / 100,
      base_amount: Math.round(base_amount * 100) / 100,
      fee,
      total_paid: Math.round((base_amount + fee) * 100) / 100,
      extra_paid:
        Math.round((actual_repayment - scheduled_payment) * 100) / 100,
      fromDate: String(prev.entry_date),
      fyFirst: !sameFy,
    };
  }

  private refreshDerived(): void {
    (this as any).requestUpdate?.();
  }

  private draftInput(e: Event, key: string): void {
    this.drafts[key] = (e.target as HTMLInputElement).value;
  }

  private draftFocus(e: Event, key: string): void {
    const input = e.target as HTMLInputElement;
    const n = MortgageMonthEndForm.rawNumber(input.value);
    input.value = Number.isFinite(n) ? String(n) : '';
    input.select?.();
    this.drafts[key] = input.value;
  }

  private draftBlur(e: Event, key: string): void {
    const input = e.target as HTMLInputElement;
    input.value = MortgageMonthEndForm.grouped(
      MortgageMonthEndForm.rawNumber(input.value),
    );
    this.drafts[key] = input.value;
  }

  private draftValue(key: string, computed: number): string {
    if (this.drafts[key] !== undefined) return this.drafts[key];
    if (!this.bankTouched) return '0.00';
    return MortgageMonthEndForm.grouped(computed);
  }

  private collect(): any {
    const d = this.derived();
    const feeRaw = this.field('#m-fee');
    const feeForm = feeRaw === '' ? 8 : MortgageMonthEndForm.rawNumber(feeRaw);
    const root = (this as any).renderRoot as ShadowRoot | undefined;
    const flow = (key: string, fallback: number): number => {
      if (this.drafts[key] !== undefined && this.drafts[key] !== '')
        return MortgageMonthEndForm.rawNumber(this.drafts[key]);
      return fallback;
    };
    const off: Record<string, number> = {};
    for (const a of this.accounts)
      off[a.account_key] = MortgageMonthEndForm.rawNumber(
        (root?.querySelector('#off-' + a.account_key) as HTMLInputElement)
          ?.value,
      );
    return {
      entry_date:
        this.field('#m-date') || new Date().toISOString().slice(0, 10),
      scheduled_balance: this.num('#m-sched-bal'),
      actual_balance: this.num('#m-actual-bal'),
      fy_interest: this.num('#m-fy-int'),
      offset_saving_fy: this.num('#m-off-fy'),
      actual_repayment: d
        ? flow('f', d.actual_repayment)
        : this.num('#m-actual-repay'),
      scheduled_payment: d
        ? flow('g', d.scheduled_payment)
        : this.num('#m-sched-pay'),
      interest_charged: d
        ? flow('h', d.interest_charged)
        : this.num('#m-int-charged'),
      base_amount: d
        ? flow('i', d.base_amount)
        : this.num('#m-base') || 3899.36,
      fee: d ? d.fee : Number.isFinite(feeForm) ? feeForm : 8,
      total_paid: d ? flow('k', d.total_paid) : this.num('#m-total'),
      extra_paid: d
        ? flow('l', d.extra_paid)
        : this.field('#m-extra') === ''
          ? 0
          : this.num('#m-extra'),
      offsets: off,
    };
  }

  override render(): unknown {
    if (typeof HTMLElement === 'undefined') return html``;
    const today = new Date().toISOString().slice(0, 10);
    const d = this.derived();
    const pv = this.prevValues;
    return html`
      <div class="view-scroll">
        <div class="topbar">
          <span class="crumb-current">Mortgage · Month-end entry</span>
          <div class="spacer"></div>
        </div>
        <div class="view-container">
          <div class="view-container-inner">
            <h1>Month-end entry</h1>
            ${this.error ? html`<p class="field-error">Error: ${this.error}</p>` : ''}
            <div class="section">
              <div class="section-header">
                <h3 class="section-title">Bank figures</h3>
                <span class="section-badge">5 inputs · flows auto-fill</span>
              </div>
              <div class="section-body">
                <div class="two-col">
                  <div class="inline-field">
                    <label
                      >Snapshot date
                      <span class="label-sub">normally month-end</span></label
                    ><input
                      class="inline-field-input"
                      id="m-date"
                      type="date"
                      .value=${today}
                      @change=${() => this.touchBank()}
                    />
                  </div>
                  <div class="inline-field">
                    <label
                      >Scheduled balance <span class="code-in">SB</span>
                      <span class="label-sub"
                        >· prev ${aud(pv.scheduled_balance ?? 0)}</span
                      ></label
                    ><input
                      class="inline-field-input"
                      id="m-sched-bal"
                      type="text"
                      inputmode="decimal"
                      .value=${MortgageMonthEndForm.grouped(pv.scheduled_balance ?? 0)}
                      @focus=${(e: Event) => this.moneyFocus(e)}
                      @blur=${(e: Event) => this.moneyBlur(e)}
                      @input=${() => this.touchBank()}
                    />
                  </div>
                  <div class="inline-field">
                    <label
                      >Actual balance <span class="code-in">AB</span>
                      <span class="label-sub"
                        >· prev ${aud(pv.actual_balance ?? 0)}</span
                      ></label
                    ><input
                      class="inline-field-input"
                      id="m-actual-bal"
                      type="text"
                      inputmode="decimal"
                      .value=${MortgageMonthEndForm.grouped(pv.actual_balance ?? 0)}
                      @focus=${(e: Event) => this.moneyFocus(e)}
                      @blur=${(e: Event) => this.moneyBlur(e)}
                      @input=${() => this.touchBank()}
                    />
                  </div>
                  <div class="inline-field">
                    <label
                      >FY interest <span class="code-in">FI</span>
                      <span class="label-sub"
                        >· prev ${aud(pv.fy_interest ?? 0)}</span
                      ></label
                    ><input
                      class="inline-field-input"
                      id="m-fy-int"
                      type="text"
                      inputmode="decimal"
                      .value=${MortgageMonthEndForm.grouped(pv.fy_interest ?? 0)}
                      @focus=${(e: Event) => this.moneyFocus(e)}
                      @blur=${(e: Event) => this.moneyBlur(e)}
                      @input=${() => this.touchBank()}
                    />
                  </div>
                  <div class="inline-field">
                    <label
                      >FY offset saving <span class="code-in">FO</span>
                      <span class="label-sub"
                        >· prev ${aud(pv.offset_saving_fy ?? 0)}</span
                      ></label
                    ><input
                      class="inline-field-input"
                      id="m-off-fy"
                      type="text"
                      inputmode="decimal"
                      .value=${MortgageMonthEndForm.grouped(pv.offset_saving_fy ?? 0)}
                      @focus=${(e: Event) => this.moneyFocus(e)}
                      @blur=${(e: Event) => this.moneyBlur(e)}
                    />
                  </div>
                  <div class="inline-field">
                    <label
                      >Bank fee <span class="code-in">FE</span>
                      <span class="label-sub"
                        >· prev ${aud(pv.fee ?? 8)}</span
                      ></label
                    ><input
                      class="inline-field-input"
                      id="m-fee"
                      type="text"
                      inputmode="decimal"
                      .value=${MortgageMonthEndForm.grouped(pv.fee ?? 8)}
                      @focus=${(e: Event) => this.moneyFocus(e)}
                      @blur=${(e: Event) => this.moneyBlur(e)}
                      @input=${() => this.touchBank()}
                    />
                  </div>
                </div>
              </div>
            </div>
            ${
              d
                ? html`<div class="section">
                    <div class="section-header">
                      <h3 class="section-title">Calculated flows</h3>
                      <span class="section-badge"
                        >from
                        ${d.fromDate}${d.fyFirst ? ' · FY-first month' : ''}</span
                      >
                    </div>
                    <div class="section-body">
                      <div class="two-col">
                        <div class="inline-field">
                          <label
                            >Actual repayment
                            <span class="code-out"
                              >AR = ABprev − AB</span
                            ></label
                          ><input
                            class="inline-field-input"
                            type="text"
                            inputmode="decimal"
                            .value=${this.draftValue('f', d.actual_repayment)}
                            @input=${(e: Event) => this.draftInput(e, 'f')}
                            @focus=${(e: Event) => this.draftFocus(e, 'f')}
                            @blur=${(e: Event) => this.draftBlur(e, 'f')}
                          />
                        </div>
                        <div class="inline-field">
                          <label
                            >Scheduled
                            <span class="code-out"
                              >SP = SBprev − SB</span
                            ></label
                          ><input
                            class="inline-field-input"
                            type="text"
                            inputmode="decimal"
                            .value=${this.draftValue('g', d.scheduled_payment)}
                            @input=${(e: Event) => this.draftInput(e, 'g')}
                            @focus=${(e: Event) => this.draftFocus(e, 'g')}
                            @blur=${(e: Event) => this.draftBlur(e, 'g')}
                          />
                        </div>
                        <div class="inline-field">
                          <label
                            >Interest charged
                            <span class="code-out"
                              >${d.fyFirst ? 'IN = FI (FY-first month)' : 'IN = FI − FIprev'}</span
                            ></label
                          ><input
                            class="inline-field-input"
                            type="text"
                            inputmode="decimal"
                            .value=${this.draftValue('h', d.interest_charged)}
                            @input=${(e: Event) => this.draftInput(e, 'h')}
                            @focus=${(e: Event) => this.draftFocus(e, 'h')}
                            @blur=${(e: Event) => this.draftBlur(e, 'h')}
                          />
                        </div>
                        <div class="inline-field">
                          <label
                            >Base
                            <span class="code-out">BA = IN + SP</span></label
                          ><input
                            class="inline-field-input"
                            type="text"
                            inputmode="decimal"
                            .value=${this.draftValue('i', d.base_amount)}
                            @input=${(e: Event) => this.draftInput(e, 'i')}
                            @focus=${(e: Event) => this.draftFocus(e, 'i')}
                            @blur=${(e: Event) => this.draftBlur(e, 'i')}
                          />
                        </div>
                        <div class="inline-field">
                          <label
                            >Total paid
                            <span class="code-out">TP = BA + fee</span></label
                          ><input
                            class="inline-field-input"
                            type="text"
                            inputmode="decimal"
                            .value=${this.draftValue('k', d.total_paid)}
                            @input=${(e: Event) => this.draftInput(e, 'k')}
                            @focus=${(e: Event) => this.draftFocus(e, 'k')}
                            @blur=${(e: Event) => this.draftBlur(e, 'k')}
                          />
                        </div>
                        <div class="inline-field">
                          <label
                            >Extra paid
                            <span class="code-out">XP = AR − SP</span></label
                          ><input
                            class="inline-field-input"
                            type="text"
                            inputmode="decimal"
                            .value=${this.draftValue('l', d.extra_paid)}
                            @input=${(e: Event) => this.draftInput(e, 'l')}
                            @focus=${(e: Event) => this.draftFocus(e, 'l')}
                            @blur=${(e: Event) => this.draftBlur(e, 'l')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>`
                : html`<div class="section">
                    <div class="section-header">
                      <h3 class="section-title">Flows — first snapshot</h3>
                      <span class="section-badge"
                        >no previous row · manual</span
                      >
                    </div>
                    <div class="section-body">
                      <div class="grid-2">
                        <div class="field">
                          <label
                            >Actual repayment
                            <span class="code-out">AR</span></label
                          ><input
                            id="m-actual-repay"
                            type="number"
                            min="0"
                            value="0"
                          />
                        </div>
                        <div class="field">
                          <label
                            >Scheduled <span class="code-out">SP</span></label
                          ><input
                            id="m-sched-pay"
                            type="number"
                            min="0"
                            value="0"
                          />
                        </div>
                        <div class="field">
                          <label
                            >Interest charged
                            <span class="code-out">IN</span></label
                          ><input
                            id="m-int-charged"
                            type="number"
                            min="0"
                            value="0"
                          />
                        </div>
                        <div class="field">
                          <label>Base <span class="code-out">BA</span></label
                          ><input
                            id="m-base"
                            type="number"
                            min="0"
                            value="3899.36"
                          />
                        </div>
                        <div class="field">
                          <label
                            >Total paid <span class="code-out">TP</span></label
                          ><input
                            id="m-total"
                            type="number"
                            min="0"
                            value="3907.36"
                          />
                        </div>
                        <div class="field">
                          <label
                            >Extra paid <span class="code-out">XP</span></label
                          ><input id="m-extra" type="number" value="0" />
                        </div>
                      </div>
                    </div>
                  </div>`
            }
            <div class="section">
              <div class="section-header">
                <h3 class="section-title">Offsets</h3>
                <span class="section-badge"
                  >all ${this.accounts.length} required · prefilled</span
                >
              </div>
              <div class="section-body">
                <div class="two-col">
                  ${this.accounts.map(
                    (a: any) =>
                      html`<div class="inline-field">
                        <label
                          >${a.account_key}
                          <span class="label-sub">${a.label}</span></label
                        >
                        <input
                          class="inline-field-input"
                          id=${'off-' + a.account_key}
                          type="text"
                          inputmode="decimal"
                          .value=${MortgageMonthEndForm.grouped(this.prefill[a.account_key] ?? 0)}
                          @focus=${(e: Event) => this.moneyFocus(e)}
                          @blur=${(e: Event) => this.moneyBlur(e)}
                        />
                      </div>`,
                  )}
                </div>
              </div>
            </div>
            <div class="footer">
              <button
                class="btn btn-secondary"
                @click=${() => this.emit('monthend-cancel')}
              >
                Cancel</button
              ><button
                class="btn btn-primary"
                @click=${() => this.emit('monthend-save', this.collect())}
              >
                Save month-end
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
