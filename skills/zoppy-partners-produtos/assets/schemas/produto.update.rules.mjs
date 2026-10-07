// Regras do PUT /products/{id}: as do produto mais o efeito de campos ausentes no PUT.
import { productRules } from './produto.create.rules.mjs';

function checkCategoriesReplaced(payload) {
    const categories = payload.categories;
    if (Array.isArray(categories) && categories.length > 0) return [];
    return [{ level: 'warning', field: 'categories', message: 'o PUT substitui a lista: sem categories (ou com null ou []) o produto fica sem categorias' }];
}

function checkExternalIdOmitted(payload) {
    if (payload.externalId !== undefined) return [];
    return [{ level: 'warning', field: 'externalId', message: 'ausente no PUT: o valor gravado é mantido, mas a resposta do PUT vem sem externalId; leia de volta com GET' }];
}

export default function rules(payload) {
    return [...productRules(payload), ...checkCategoriesReplaced(payload), ...checkExternalIdOmitted(payload)];
}
