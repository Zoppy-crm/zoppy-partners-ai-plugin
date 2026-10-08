// @ts-check
// Regras de negócio do PUT /abandoned-carts/:id.
import { blankUrl, lineItems, missingAmounts, negativeDiscount, negativeTotal, unknownFields } from './carrinho-regras.mjs';

/** @typedef {import('../../scripts/validate.mjs').Issue} Issue */
/** @typedef {import('./carrinho-regras.mjs').CartPayload} CartPayload */

const KNOWN = ['subtotal', 'discount', 'shipping', 'url', 'lineItems'];
const NOT_UPDATABLE = ['externalId', 'customerId', 'createdAt', 'updatedAt'];

/**
 * @param {CartPayload} payload
 * @returns {Issue[]}
 */
function notUpdatable(payload) {
    return NOT_UPDATABLE.filter((field) => payload[field] !== undefined).map((field) => ({
        level: 'warning',
        field,
        message: 'ignorado no PUT (quando válido): o valor gravado na criação continua'
    }));
}

/**
 * @param {CartPayload} payload
 * @returns {Issue[]}
 */
function missingLineItems(payload) {
    if (payload.lineItems !== undefined) return [];
    return [{ level: 'warning', field: 'lineItems', message: 'ausente: o PUT apaga os itens atuais e o carrinho fica sem itens. Mande a lista completa' }];
}

/**
 * @param {CartPayload} payload
 * @returns {Issue[]}
 */
export default function rules(payload) {
    return [
        ...missingAmounts(payload),
        ...negativeTotal(payload),
        ...negativeDiscount(payload),
        ...blankUrl(payload),
        ...lineItems(payload),
        ...missingLineItems(payload),
        ...notUpdatable(payload),
        ...unknownFields(payload, [...KNOWN, ...NOT_UPDATABLE])
    ];
}
