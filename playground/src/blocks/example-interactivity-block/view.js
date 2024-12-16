import { store, getContext } from '@wordpress/interactivity';
import './style.pcss';
store('donation-calculator', {
  state: {
    get donation() {
      const context = getContext();
      return `$${context.contribution}`;
    },
    get trees() {
      const context = getContext();
      return Math.floor(context.contribution / context.price);
    },
    get show() {
      const context = getContext();
      return context.contribution > 0;
    },
  },
  actions: {
    calculate: e => {
      const context = getContext();
      context.contribution = Number(e.target.value);
    },
  },
});
