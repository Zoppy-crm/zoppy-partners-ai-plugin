// @ts-check
// Regras de negócio do POST /abandoned-carts.
import { blankUrl, lineItems, missingAmounts, negativeDiscount, negativeTotal, unknownFields } from './carrinho-regras.mjs';

/** @typedef {import('../../scripts/validate.mjs').Issue} Issue */
/** @typedef {import('./carrinho-regras.mjs').CartPayload & { externalId?: string, customerId: string }} CartCreatePayload */

const KNOWN = ['externalId', 'customerId', 'subtotal', 'discount', 'shipping', 'url', 'lineItems', 'createdAt', 'updatedAt'];

/**
 * @param {CartCreatePayload} payload
 * @returns {Issue[]}
 */
function missingExternalId(payload) {
    if (payload.externalId !== undefined) return [];
    return [{ level: 'warning', field: 'externalId', message: 'sem externalId cada envio cria um carrinho novo e não dá para buscar por /abandoned-carts/external/:externalId' }];
}

/**
 * @param {CartCreatePayload} payload
 * @returns {Issue[]}
 */
function ignoredUpdatedAt(payload) {
    if (payload.updatedAt === undefined) return [];
    return [{ level: 'warning', field: 'updatedAt', message: 'ignorado: a API grava o momento do recebimento como updatedAt' }];
}

/**
 * @param {CartCreatePayload} payload
 * @returns {Issue[]}
 */
function missingCreatedAt(payload) {
    if (payload.createdAt !== undefined) return [];
    return [{ level: 'warning', field: 'createdAt', message: 'ausente: a data do carrinho vira o momento do recebimento, e um pedido feito entre o abandono e o envio não barra a recuperação. Mande o momento do abandono; se o seu sistema não guarda esse momento, mande a última atualização do carrinho no seu sistema. Não invente horário' }];
}

/**
 * @param {CartCreatePayload} payload
 * @returns {Issue[]}
 */
export default function rules(payload) {
    return [
        ...missingAmounts(payload),
        ...negativeTotal(payload),
        ...negativeDiscount(payload),
        ...blankUrl(payload),
        ...lineItems(payload),
        ...missingExternalId(payload),
        ...missingCreatedAt(payload),
        ...ignoredUpdatedAt(payload),
        ...unknownFields(payload, KNOWN)
    ];
}
