import type { FinanceApi } from 'finance';
import { ExtensionLogger } from 'finance-logger';
import './styles/ext-tokens.css';
const logger = new ExtensionLogger('mortgage');
export async function registerUIComponents(): Promise<void> { if (typeof window !== 'undefined') await import('./ui/index.js'); }
let _finance: FinanceApi | null = null;
export async function activate(finance: FinanceApi, ctx: { viewId?: string } & Record<string, unknown> = {}): Promise<void> {
  _finance = finance;
  logger.info('activate mortgage', { viewId: ctx.viewId });
  finance.commands.registerCommand('mortgage.hello', 'Mortgage: Hello', () => {
    finance.ui?.requestMount('mortgage', { greeting: 'Hello from mortgage' });
  });
  // Example Domain Service — other extensions can call finance.services.invoke('mortgage','hello')
  // When you add tables (e.g. mortgage_items), add methods that use finance.db.table('mortgage_items').find/count/insert
  finance.services.register('mortgage', {
    hello: async (p?: unknown) => `Hello from mortgage: ${JSON.stringify(p ?? {})}`,
  });
  if (typeof window !== 'undefined') await import('./ui/index.js');
  if (ctx.viewId && typeof document !== 'undefined') {
    const app = document.getElementById('app');
    if (app) {
      const viewEl = document.createElement('mortgage-view') as any;
      app.innerHTML = '';
      app.appendChild(viewEl);
      queueMicrotask(() => { if (typeof viewEl.setFinance === 'function') viewEl.setFinance(finance); else viewEl.finance = finance; });
      setTimeout(() => { if (viewEl.finance == null && typeof viewEl.setFinance === 'function') viewEl.setFinance(finance); }, 50);
    }
  }
}
export function deactivate(): void { if (_finance) _finance.services.unregister('mortgage'); logger.info('deactivate mortgage'); }
