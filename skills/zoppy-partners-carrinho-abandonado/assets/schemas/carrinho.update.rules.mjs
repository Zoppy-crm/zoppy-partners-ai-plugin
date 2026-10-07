// Regras de negócio do PUT /abandoned-carts/:id.
import { blankUrl, lineItems, missingAmounts, negativeDiscount, negativeTotal, unknownFields } from './carrinho-regras.mjs';

const KNOWN = ['subtotal', 'discount', 'shipping', 'url', 'lineItems'];
const NOT_UPDATABLE = ['externalId', 'customerId', 'createdAt', 'updatedAt'];

function notUpdatable(payload) {
    return NOT_UPDATABLE.filter((field) => payload[field] !== undefined).map((field) => ({
        level: 'warning',
        field,
        message: 'ignorado no PUT (quando válido): o valor gravado na criação continua'
    }));
}

function missingLineItems(payload) {
    if (payload.lineItems !== undefined) return [];
    return [{ level: 'warning', field: 'lineItems', message: 'ausente: o PUT apaga os itens atuais e o carrinho fica sem itens. Mande a lista completa' }];
}

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
