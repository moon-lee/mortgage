import type { FinanceApi } from 'finance';
import { ExtensionLogger } from 'finance-logger';
import './styles/ext-tokens.css';
import { seedMortgage } from './services/seed.js';
import {
  getSnapshot,
  getSummary,
  getYearly,
  saveMonthEnd,
} from './services/mortgage-service.js';
import { listRepayments } from './dao/repayments.js';

const logger = new ExtensionLogger('mortgage');

export async function registerUIComponents(): Promise<void> {
  if (typeof window !== 'undefined') await import('./ui/index.js');
}

let _finance: FinanceApi | null = null;

async function readMountData(
  finance: FinanceApi,
): Promise<Record<string, unknown>> {
  let financialYearStart = '07-01';
  let financialYearCurrent = '';
  let financeYearFilter = 5;
  try {
    const s = await finance.settings.get('core.financialYear.start');
    if (typeof s === 'string' && /^\d{2}-\d{2}$/.test(s))
      financialYearStart = s;
  } catch {
    /* default */
  }
  try {
    const c = await finance.settings.get('core.financialYear.current');
    if (typeof c === 'string') financialYearCurrent = c;
  } catch {
    /* default */
  }
  try {
    const f = await finance.settings.get('core.financeYear.filter');
    if (typeof f === 'number' && f > 0) financeYearFilter = f;
  } catch {
    /* default */
  }
  return { financialYearStart, financialYearCurrent, financeYearFilter };
}

function openView(tag: string): () => Promise<void> {
  return async () => {
    if (!_finance) return;
    const mountData = await readMountData(_finance);
    // Single panel identity ('mortgage' → tab always "Mortgage"); target child rides in mountData.view.
    // Retargets of the open panel arrive as DOM 'mount-update' (see panel branch below).
    await _finance.ui?.requestMount('mortgage', { view: tag, ...mountData });
  };
}

export async function activate(
  finance: FinanceApi,
  ctx: { viewId?: string } & Record<string, unknown> = {},
): Promise<void> {
  _finance = finance;
  logger.info('activate mortgage', { viewId: ctx.viewId });
  await seedMortgage(finance as any);

  finance.commands.registerCommand(
    'mortgage.show-overview',
    'Mortgage: Overview',
    openView('mortgage-overview'),
  );
  finance.commands.registerCommand(
    'mortgage.show-ledger',
    'Mortgage: Repayment Ledger',
    openView('mortgage-ledger'),
  );
  finance.commands.registerCommand(
    'mortgage.show-offsets',
    'Mortgage: Offsets',
    openView('mortgage-offsets'),
  );
  finance.commands.registerCommand(
    'mortgage.show-rates',
    'Mortgage: Rate History',
    openView('mortgage-rate-history'),
  );
  finance.commands.registerCommand(
    'mortgage.show-accounts',
    'Mortgage: Offset Accounts',
    openView('mortgage-accounts'),
  );

  finance.services.register('mortgage', {
    hello: async (p?: unknown) =>
      `Hello from mortgage: ${JSON.stringify(p ?? {})}`,
    snapshot: async () => getSnapshot(finance as any),
    summary: async () => getSummary(finance as any),
    ledger: async (p?: any) =>
      listRepayments(finance as any, (p as any)?.finance_year),
    yearly: async (p?: any) =>
      getYearly(finance as any, Number((p as any)?.lastN) || 5),
    saveMonthEnd: async (p?: any) =>
      saveMonthEnd(finance as any, (p as any)?.input ?? p),
  });

  if (typeof window !== 'undefined') await import('./ui/index.js');
  if (ctx.viewId && typeof document !== 'undefined') {
    const app = document.getElementById('app');
    if (app) {
      const el = document.createElement('mortgage-orchestrator') as any;
      app.innerHTML = '';
      app.appendChild(el);
      const baseData = {
        viewId: ctx.viewId,
        ...(ctx as Record<string, unknown>),
      };
      const mountEl = () => {
        if (typeof el.init === 'function') void el.init(finance, baseData);
        else if (typeof el.setFinance === 'function')
          void el.setFinance(finance);
        else el.finance = finance;
      };
      queueMicrotask(mountEl);
      setTimeout(() => {
        if (el.finance == null && typeof el.setFinance === 'function')
          void el.setFinance(finance);
      }, 50);
      // Retargets to the open panel (sidebar nav while mounted) arrive here from panel-bootstrap.
      app.addEventListener('mount-update', (e: Event) => {
        const detail = (e as CustomEvent).detail as Record<string, unknown>;
        if (typeof el.init === 'function')
          void el.init(finance, { ...baseData, ...(detail ?? {}) });
      });
    }
  }
}

export function deactivate(): void {
  if (_finance) _finance.services.unregister('mortgage');
  logger.info('deactivate mortgage');
}
