import { SampleView } from './mortgage-view';
if (typeof customElements !== 'undefined' && !customElements.get('mortgage-view')) customElements.define('mortgage-view', SampleView as unknown as CustomElementConstructor);
