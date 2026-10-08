// @ts-check
import { storeRules } from './loja-regras.mjs';

/**
 * @param {import('./loja-regras.mjs').StorePayload} payload
 * @returns {import('../../scripts/validate.mjs').Issue[]}
 */
export default function rules(payload) {
    return storeRules(payload, 'update');
}
