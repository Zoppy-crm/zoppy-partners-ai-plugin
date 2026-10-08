// @ts-check
import { orderRules } from './pedido-regras.mjs';

/**
 * @param {import('./pedido-regras.mjs').OrderPayload} payload
 * @returns {import('../../scripts/validate.mjs').Issue[]}
 */
export default function rules(payload) {
    return orderRules(payload, 'create');
}
