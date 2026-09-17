import { LitElement, css, html } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import {
  CANONICAL_CARD_ORDER,
  CARD_LABELS,
  normalizeCardOrder,
  type OverviewCardId,
} from './overview-cards.js';

const Base =
  typeof HTMLElement !== 'undefined'
    ? LitElement
    : (class {} as unknown as typeof LitElement);

/** Dashboard-pattern reorder modal: up/down arrows, reset, save → `card-order-change`. */
export class ReorderCardsModal extends Base {
  static override styles =
    typeof HTMLElement !== 'undefined'
      ? ([
          sharedStyles,
          css`
            .item {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 12px;
              padding: 6px 10px;
              border: 1px solid var(--ff-bg-input, #3c3c3c);
              border-left: 4px solid var(--ff-bg-input, #3c3c3c);
              border-radius: 4px;
              margin-bottom: 6px;
            }
            .item.first {
              border-left-color: var(--ff-teal, #4ec9b0);
            }
            .item.last {
              border-left-color: var(--ff-accent, #007acc);
            }
            .item .label {
              flex: 1;
            }
            .up {
              background: var(--ff-accent, #007acc);
              color: var(--ff-text-strong, #fff);
            }
            .down {
              background: var(--ff-accent-hover, #1177bb);
              color: var(--ff-text-strong, #fff);
            }
          `,
        ] as any)
      : [];

  cardOrder: OverviewCardId[] = [...CANONICAL_CARD_ORDER];
  private order: OverviewCardId[] = [...CANONICAL_CARD_ORDER];

  override connectedCallback(): void {
    (super.connectedCallback as (() => void) | undefined)?.();
    this.order = normalizeCardOrder(this.cardOrder);
  }

  private move(index: number, dir: -1 | 1): void {
    const target = index + dir;
    if (target < 0 || target >= this.order.length) return;
    const next = this.order.slice();
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item as OverviewCardId);
    this.order = next;
    (this as any).requestUpdate?.();
  }

  private emit(name: string, detail?: unknown): void {
    this.dispatchEvent(
      new CustomEvent(name, { detail, bubbles: true, composed: true }),
    );
  }

  override render(): unknown {
    if (typeof HTMLElement === 'undefined') return html``;
    return html`
      <div class="backdrop">
        <div class="modal" role="dialog" aria-label="Reorder cards">
          <h2>Reorder Cards</h2>
          ${this.order.map(
            (id, i) =>
              html` <div
                class="item ${i === 0 ? 'first' : ''} ${i === this.order.length - 1 ? 'last' : ''}"
              >
                <span class="label">${CARD_LABELS[id] ?? id}</span>
                <button
                  class="up"
                  ?disabled=${i === 0}
                  @click=${() => this.move(i, -1)}
                >
                  ▲
                </button>
                <button
                  class="down"
                  ?disabled=${i === this.order.length - 1}
                  @click=${() => this.move(i, 1)}
                >
                  ▼
                </button>
              </div>`,
          )}
          <div class="modal-actions">
            <button
              class="ghost"
              @click=${() => this.emit('card-order-cancel')}
            >
              Cancel
            </button>
            <button
              class="ghost"
              @click=${() => {
                this.order = [...CANONICAL_CARD_ORDER];
                (this as any).requestUpdate?.();
              }}
            >
              Reset to default
            </button>
            <button
              class="primary"
              @click=${() => this.emit('card-order-change', [...this.order])}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
