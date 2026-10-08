// @ts-check
// Regras do PUT /products/{id}: as do produto mais o efeito de campos ausentes no PUT.
import { productRules } from './produto.create.rules.mjs';

/** @typedef {import('../../scripts/validate.mjs').Issue} Issue */
/** @typedef {import('./produto.create.rules.mjs').ProductPayload} ProductPayload */

/**
 * @param {ProductPayload} payload
 * @returns {Issue[]}
 */
function checkCategoriesReplaced(payload) {
    const categories = payload.categories;
    if (Array.isArray(categories) && categories.length > 0) return [];
    return [{ level: 'warning', field: 'categories', message: 'o PUT substitui a lista: sem categories (ou com null ou []) o produto fica sem categorias' }];
}

/**
 * @param {ProductPayload} payload
 * @returns {Issue[]}
 */
function checkExternalIdOmitted(payload) {
    if (payload.externalId !== undefined) return [];
    return [{ level: 'warning', field: 'externalId', message: 'ausente no PUT: o valor gravado é mantido, mas a resposta do PUT vem sem externalId; leia de volta com GET' }];
}

/**
 * @param {ProductPayload} payload
 * @returns {Issue[]}
 */
export default function rules(payload) {
    return [...productRules(payload), ...checkCategoriesReplaced(payload), ...checkExternalIdOmitted(payload)];
}
