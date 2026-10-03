import { LitElement, css, html } from 'lit';
import { sharedStyles } from '../styles/shared-styles.js';
import { listRates } from '../dao/rates.js';

const Base =
  typeof HTMLElement !== 'undefined'
    ? LitElement
    : (class {} as unknown as typeof LitElement);

export class MortgageRateHistoryView extends Base {
  static override styles =
    typeof HTMLElement !== 'undefined'
      ? ([
          sharedStyles,
          css`
            .hist-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            .hist-table thead th {
              font-size: var(--ff-font-sm);
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: var(--ff-text-muted, #858585);
              text-align: left;
              padding: 8px 10px;
              border-bottom: 1px solid var(--ff-border, #3e3e3e);
              white-space: nowrap;
            }
            .hist-table thead th.num {
              text-align: right;
            }
            .hist-table tbody td {
              padding: 9px 10px;
              border-bottom: 1px solid var(--ff-border, #3e3e3e);
              font-size: var(--ff-font-base);
              white-space: nowrap;
            }
            .hist-table tbody tr:nth-child(even) {
              background: var(--ff-bg-subpanel, #2a2a2a);
            }
            .hist-table tbody tr:hover {
              background: var(--ff-bg-input-hover, #4a4a4a);
            }
            .hist-table td.num {
              text-align: right;
              font-variant-numeric: tabular-nums;
            }
            .hist-table td.money {
              font-weight: 700;
              color: var(--ff-text-strong, #fff);
            }
            .muted {
              color: var(--ff-text-muted, #858585);
              font-size: var(--ff-font-sm);
            }
            .section-header {
              padding-top: 4px;
              padding-bottom: 4px;
            }
          `,
        ] as any)
      : [];
  finance: any = null;
  rows: any[] = [];
  editing: any = null;
  error = '';

  async setFinance(f: any): Promise<void> {
    this.finance = f;
    await this.load();
  }

  async load(): Promise<void> {
    if (!this.finance) return;
    try {
      this.error = '';
      this.rows = await listRates(this.finance);
      this.editing = null;
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

  private readForm(): any {
    const root = (this as any).renderRoot as ShadowRoot | undefined;
    const v = (id: string): string =>
      (root?.querySelector(id) as HTMLInputElement)?.value ?? '';
    return { effective_from: v('#r-from'), rate: Number(v('#r-rate')) };
  }

  override render(): unknown {
    if (typeof HTMLElement === 'undefined') return html``;
    return html`
      <div class="view-scroll">
        <div class="topbar">
          <span class="crumb-current">Mortgage · Rate History</span>
          <div class="spacer"></div>
          <button
            class="filter-btn"
            @click=${() => {
              this.editing = { mode: 'add' };
              (this as any).requestUpdate?.();
              this.emit('rate-add-request');
            }}
          >+ Add New Rate</button>
        </div>
        <div class="view-container">
          <div class="view-container-inner">
            <h1>Rate History</h1>
            ${this.error ? html`<p class="field-error">Error: ${this.error}</p>` : ''}
            <div class="section">
              <div class="section-header">
                <h3 class="section-title">Rates</h3>
                <span class="section-badge">${this.rows.length} rows</span>
              </div>
              <div class="table-wrap">
                <table class="hist-table">
                  <colgroup>
                    <col style="width:30%" />
                    <col style="width:30%" />
                    <col style="width:22%" />
                    <col style="width:18%" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>From</th>
                      <th>To</th>
                      <th class="num">Rate</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${this.rows.map(
                      (r: any) =>
                        html`<tr>
                          <td>${r.effective_from}</td>
                          <td>${r.effective_to ?? '—'}</td>
                          <td class="num money">
                            ${(Number(r.rate) * 100).toFixed(2)}%
                          </td>
                          <td class="actions">
                            <button
                              class="btn-link"
                              @click=${() => {
                                this.editing = { mode: 'edit', row: r };
                                (this as any).requestUpdate?.();
                                this.emit('rate-edit-request', { id: r.id });
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>`,
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            ${
              this.editing
                ? html`<div class="section">
                    <div class="section-header">
                      <h3 class="section-title">
                        ${this.editing.mode === 'add' ? 'Add rate' : 'Edit rate'}
                      </h3>
                    </div>
                    <div class="section-body">
                      <div class="grid-2">
                        <div class="field">
                          <label>From</label
                          ><input
                            id="r-from"
                            type="date"
                            .value=${this.editing.row?.effective_from ?? new Date().toISOString().slice(0, 10)}
                          />
                        </div>
                        <div class="field">
                          <label
                            >Rate decimal
                            <span class="label-sub">6.19% = 0.0619</span></label
                          ><input
                            id="r-rate"
                            type="number"
                            step="0.0001"
                            min="0"
                            max="1"
                            .value=${String(this.editing.row?.rate ?? '')}
                          />
                        </div>
                      </div>
                      ${this.editing.mode === 'edit' ? html`<p class="muted">Currently ends ${this.editing.row?.effective_to ?? 'open-ended'} — kept as-is.</p>` : ''}
                      <div class="footer">
                        <button
                          class="btn btn-secondary"
                          @click=${() => {
                            this.editing = null;
                            (this as any).requestUpdate?.();
                            this.emit('rate-form-cancel');
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          class="btn btn-primary"
                          @click=${() => {
                            const f = this.readForm();
                            if (this.editing.mode === 'add')
                              this.emit('rate-create', {
                                ...f,
                                effective_to: null,
                              });
                            else
                              this.emit('rate-edit', {
                                id: this.editing.row.id,
                                patch: f,
                              });
                          }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>`
                : ''
            }
          </div>
        </div>
      </div>
    `;
  }
}
