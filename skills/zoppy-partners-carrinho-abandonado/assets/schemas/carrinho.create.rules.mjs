// Regras de negócio do POST /abandoned-carts.
import { blankUrl, lineItems, missingAmounts, negativeDiscount, negativeTotal, unknownFields } from './carrinho-regras.mjs';

const KNOWN = ['externalId', 'customerId', 'subtotal', 'discount', 'shipping', 'url', 'lineItems', 'createdAt', 'updatedAt'];

function missingExternalId(payload) {
    if (payload.externalId !== undefined) return [];
    return [{ level: 'warning', field: 'externalId', message: 'sem externalId cada envio cria um carrinho novo e não dá para buscar por /abandoned-carts/external/:externalId' }];
}

function ignoredUpdatedAt(payload) {
    if (payload.updatedAt === undefined) return [];
    return [{ level: 'warning', field: 'updatedAt', message: 'ignorado: a API grava o momento do recebimento como updatedAt' }];
}

function missingCreatedAt(payload) {
    if (payload.createdAt !== undefined) return [];
    return [{ level: 'warning', field: 'createdAt', message: 'ausente: a data do carrinho vira o momento do recebimento. Mande a data real do abandono' }];
}

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
