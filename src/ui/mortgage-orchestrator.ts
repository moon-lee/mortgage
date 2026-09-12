import { LitElement, css, html } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { updateLoan } from '../dao/loans.js';
import { createAccount, renameAccount, setAccountActive } from '../dao/accounts.js';
import { createRate, updateRate } from '../dao/rates.js';
import { deleteRepayment } from '../dao/repayments.js';
import { saveMonthEnd } from '../services/mortgage-service.js';
import { CANONICAL_CARD_ORDER, normalizeCardOrder, type OverviewCardId } from './overview-cards.js';
import { ExtensionLogger } from 'finance-logger';

const Base = typeof HTMLElement !== 'undefined' ? LitElement : (class {} as unknown as typeof LitElement);
const log = new ExtensionLogger('mortgage');

type Tag = 'mortgage-overview' | 'mortgage-ledger' | 'mortgage-offsets' | 'mortgage-rate-history' | 'mortgage-month-end-form' | 'mortgage-accounts' | 'reorder-cards-modal';

export class MortgageOrchestrator extends Base {
  static override styles = typeof HTMLElement !== 'undefined' ? [sharedStyles, css`#child{flex:1;min-height:0;display:block;overflow:hidden}`] as any : [];
  finance: any = null;
  view: Tag = 'mortgage-overview';
  mountData: Record<string, unknown> = {};
  error = '';
  cardOrder: OverviewCardId[] = [...CANONICAL_CARD_ORDER];
  private prefillDate = '';
  private returnTo: Tag = 'mortgage-ledger';

  async setFinance(f: any): Promise<void> {
    this.finance = f;
    await this.pushFinance();
  }

  async init(f: any, mount: Record<string, unknown> = {}): Promise<void> {
    this.finance = f;
    this.mountData = mount;
    // Target child arrives as mount.view (single-panel mounts) or legacy mount.viewId (dev dropdown).
    const v = (mount.view ?? mount.viewId) as string | undefined;
    if (v === 'mortgage' || v === 'mortgage-overview' || v === undefined) this.view = 'mortgage-overview';
    else if (v === 'mortgage-ledger') this.view = 'mortgage-ledger';
    else if (v === 'mortgage-offsets') this.view = 'mortgage-offsets';
    else if (v === 'mortgage-rates' || v === 'mortgage-rate-history') this.view = 'mortgage-rate-history';
    else if (v === 'mortgage-accounts') this.view = 'mortgage-accounts';
    try {
      const saved = await f.settings.get('mortgage.cardOrder');
      this.cardOrder = normalizeCardOrder(typeof saved === 'string' ? JSON.parse(saved) : saved);
    } catch { this.cardOrder = [...CANONICAL_CARD_ORDER]; }
    await this.pushFinance();
  }

  navigate(tag: Tag): void {
    this.view = tag;
    (this as any).requestUpdate?.();
    void this.pushFinance();
  }

  private child(): any {
    const root = (this as any).renderRoot as ShadowRoot | undefined;
    return root?.querySelector('#child');
  }

  private async pushFinance(): Promise<void> {
    (this as any).requestUpdate?.();
    await Promise.resolve();
    const c = this.child() as any;
    if (c && this.finance) {
      try {
        if ('cardOrder' in c) c.cardOrder = [...this.cardOrder];
      } catch { /* child without card order */ }
    }
    if (c && typeof c.setFinance === 'function' && this.finance) {
      try {
        if (this.view === 'mortgage-month-end-form' && typeof c.load === 'function' && this.prefillDate) {
          await c.setFinance(this.finance);
          await c.load(this.prefillDate);
        } else {
          await c.setFinance(this.finance);
        }
      } catch (e: any) {
        this.error = String(e?.message || e);
      }
    }
  }

  private async refresh(): Promise<void> {
    this.error = '';
    await this.pushFinance();
  }

  override connectedCallback(): void {
    super.connectedCallback?.();
    (this as any).addEventListener?.('monthend-add-request', (e: any) => { this.prefillDate = ''; this.returnTo = e?.detail?.source === 'mortgage-overview' ? 'mortgage-overview' : 'mortgage-ledger'; this.navigate('mortgage-month-end-form'); });
    (this as any).addEventListener?.('offset-edit-request', (e: any) => { this.prefillDate = String(e?.detail?.entry_date || ''); this.returnTo = 'mortgage-offsets'; this.navigate('mortgage-month-end-form'); });
    (this as any).addEventListener?.('monthend-cancel', () => this.navigate(this.returnTo));
    (this as any).addEventListener?.('monthend-save', (e: any) => void this.onSaveMonthEnd(e?.detail));
    (this as any).addEventListener?.('monthend-delete', (e: any) => void this.onDeleteMonth(e?.detail));
    (this as any).addEventListener?.('target-edit', (e: any) => void this.onTargetEdit(e?.detail));
    (this as any).addEventListener?.('rate-create', (e: any) => void this.onRateCreate(e?.detail));
    (this as any).addEventListener?.('rate-edit', (e: any) => void this.onRateEdit(e?.detail));
    (this as any).addEventListener?.('rate-form-cancel', () => void this.refresh());
    (this as any).addEventListener?.('rate-add-request', () => undefined);
    (this as any).addEventListener?.('rate-edit-request', () => undefined);
    (this as any).addEventListener?.('fy-changed', () => undefined);
    (this as any).addEventListener?.('reorder-cards', () => this.navigate('reorder-cards-modal'));
    (this as any).addEventListener?.('card-order-cancel', () => this.navigate('mortgage-overview'));
    (this as any).addEventListener?.('card-order-change', (e: any) => void this.onCardOrderChange(e?.detail));
    (this as any).addEventListener?.('account-create', (e: any) => void this.onAccountCreate(e?.detail));
    (this as any).addEventListener?.('account-edit', (e: any) => void this.onAccountEdit(e?.detail));
    (this as any).addEventListener?.('account-toggle', (e: any) => void this.onAccountToggle(e?.detail));
  }

  private async onCardOrderChange(order: unknown): Promise<void> {
    this.cardOrder = normalizeCardOrder(order);
    if (this.finance) {
      try {
        await this.finance.settings.set('mortgage.cardOrder', JSON.stringify(this.cardOrder));
      } catch (e: any) {
        log.error('persist cardOrder failed', { error: String(e?.message || e) });
      }
    }
    this.navigate('mortgage-overview');
  }

  private async onSaveMonthEnd(input: any): Promise<void> {
    if (!this.finance) return;
    try {
      await saveMonthEnd(this.finance, input);
      this.navigate(this.returnTo);
    } catch (e: any) {
      this.error = String(e?.message || e);
      log.error('saveMonthEnd failed', { error: this.error });
      (this as any).requestUpdate?.();
    }
  }

  private async onDeleteMonth(detail: any): Promise<void> {
    if (!this.finance) return;
    try {
      await deleteRepayment(this.finance, detail.id);
      await this.refresh();
    } catch (e: any) {
      this.error = String(e?.message || e);
      (this as any).requestUpdate?.();
    }
  }

  private async onTargetEdit(patch: any): Promise<void> {    if (!this.finance) return;
    try {
      await updateLoan(this.finance, patch);
      await this.refresh();
    } catch (e: any) {
      this.error = String(e?.message || e);
      (this as any).requestUpdate?.();
    }
  }

  private async onAccountCreate(input: any): Promise<void> {
    if (!this.finance) return;
    try {
      await createAccount(this.finance, input);
      await this.refresh();
    } catch (e: any) {
      this.error = String(e?.message || e);
      (this as any).requestUpdate?.();
    }
  }

  private async onAccountEdit(detail: any): Promise<void> {
    if (!this.finance) return;
    try {
      await renameAccount(this.finance, detail.id, detail.label);
      await this.refresh();
    } catch (e: any) {
      this.error = String(e?.message || e);
      (this as any).requestUpdate?.();
    }
  }

  private async onAccountToggle(detail: any): Promise<void> {
    if (!this.finance) return;
    try {
      await setAccountActive(this.finance, detail.id, Boolean(detail.active));
      await this.refresh();
    } catch (e: any) {
      this.error = String(e?.message || e);
      (this as any).requestUpdate?.();
    }
  }

  private async onRateCreate(input: any): Promise<void> {
    if (!this.finance) return;
    try {
      await createRate(this.finance, input);
      await this.refresh();
    } catch (e: any) {
      this.error = String(e?.message || e);
      (this as any).requestUpdate?.();
    }
  }

  private async onRateEdit(detail: any): Promise<void> {
    if (!this.finance) return;
    try {
      await updateRate(this.finance, detail.id, detail.patch);
      await this.refresh();
    } catch (e: any) {
      this.error = String(e?.message || e);
      (this as any).requestUpdate?.();
    }
  }

  override render(): unknown {
    if (typeof HTMLElement === 'undefined') return html``;
    return html`
      <div class="shell">
      ${this.error ? html`<div class="view-container"><div class="view-container-inner"><p class="field-error">Error: ${this.error}</p></div></div>` : ''}
      ${this.view === 'mortgage-overview' ? html`<mortgage-overview id="child"></mortgage-overview>` : ''}
      ${this.view === 'mortgage-ledger' ? html`<mortgage-ledger id="child"></mortgage-ledger>` : ''}
      ${this.view === 'mortgage-offsets' ? html`<mortgage-offsets id="child"></mortgage-offsets>` : ''}
      ${this.view === 'mortgage-rate-history' ? html`<mortgage-rate-history id="child"></mortgage-rate-history>` : ''}
      ${this.view === 'mortgage-month-end-form' ? html`<mortgage-month-end-form id="child"></mortgage-month-end-form>` : ''}
      ${this.view === 'mortgage-accounts' ? html`<mortgage-accounts id="child"></mortgage-accounts>` : ''}
      ${this.view === 'reorder-cards-modal' ? html`<reorder-cards-modal id="child" .cardOrder=${this.cardOrder}></reorder-cards-modal>` : ''}
      </div>
    `;
  }
}

export async function deleteMonth(finance: any, repaymentId: number): Promise<void> {
  await deleteRepayment(finance, repaymentId);
}
