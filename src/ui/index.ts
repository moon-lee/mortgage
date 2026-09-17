import { MortgageOverviewView } from './mortgage-overview-view.js';
import { MortgageLedgerView } from './mortgage-ledger-view.js';
import { MortgageOffsetsView } from './mortgage-offsets-view.js';
import { MortgageRateHistoryView } from './mortgage-rate-history-view.js';
import { MortgageMonthEndForm } from './mortgage-month-end-form.js';
import { MortgageOrchestrator } from './mortgage-orchestrator.js';
import { MortgageAccountsView } from './mortgage-accounts-view.js';
import { ReorderCardsModal } from './reorder-cards-modal.js';

if (typeof customElements !== 'undefined') {
  if (!customElements.get('mortgage-overview'))
    customElements.define(
      'mortgage-overview',
      MortgageOverviewView as unknown as CustomElementConstructor,
    );
  if (!customElements.get('mortgage-ledger'))
    customElements.define(
      'mortgage-ledger',
      MortgageLedgerView as unknown as CustomElementConstructor,
    );
  if (!customElements.get('mortgage-offsets'))
    customElements.define(
      'mortgage-offsets',
      MortgageOffsetsView as unknown as CustomElementConstructor,
    );
  if (!customElements.get('mortgage-rate-history'))
    customElements.define(
      'mortgage-rate-history',
      MortgageRateHistoryView as unknown as CustomElementConstructor,
    );
  if (!customElements.get('mortgage-month-end-form'))
    customElements.define(
      'mortgage-month-end-form',
      MortgageMonthEndForm as unknown as CustomElementConstructor,
    );
  if (!customElements.get('mortgage-orchestrator'))
    customElements.define(
      'mortgage-orchestrator',
      MortgageOrchestrator as unknown as CustomElementConstructor,
    );
  if (!customElements.get('mortgage-accounts'))
    customElements.define(
      'mortgage-accounts',
      MortgageAccountsView as unknown as CustomElementConstructor,
    );
  if (!customElements.get('reorder-cards-modal'))
    customElements.define(
      'reorder-cards-modal',
      ReorderCardsModal as unknown as CustomElementConstructor,
    );
}
