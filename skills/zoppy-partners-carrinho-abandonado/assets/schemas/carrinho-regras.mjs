// Regras de negócio comuns ao carrinho abandonado, usadas por carrinho.create.rules.mjs e carrinho.update.rules.mjs.
// Cada regra aqui foi conferida contra a Partners API (resposta e leitura de volta).

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function error(field, message) {
    return { level: 'error', field, message };
}

function warning(field, message) {
    return { level: 'warning', field, message };
}

export function missingAmounts(payload) {
    return ['discount', 'shipping']
        .filter((field) => payload[field] === undefined)
        .map((field) => error(field, `campo ausente: a API aceita, mas grava o total do carrinho como 0. Mande ${field}: 0 quando não houver valor`));
}

export function negativeTotal(payload) {
    const total = payload.subtotal - (payload.discount ?? 0) - (payload.shipping ?? 0);
    if (total >= 0) return [];
    return [error('subtotal', `total gravado seria subtotal - discount - shipping = ${total}, negativo. O subtotal deve ser o valor bruto com o frete incluído`)];
}

export function negativeDiscount(payload) {
    if (typeof payload.discount !== 'number' || payload.discount >= 0) return [];
    return [warning('discount', `desconto negativo (${payload.discount}) é aceito e soma ao total gravado, que fica maior que o subtotal`)];
}

export function unknownFields(payload, known) {
    return Object.keys(payload)
        .filter((field) => !known.includes(field))
        .map((field) => warning(field, 'campo ignorado pela API nesta operação (não é gravado nem devolvido)'));
}

const PARTIAL_WRITE = 'a API responde 500 depois de gravar: ficam só os itens anteriores a este (no PUT, valores e url já foram trocados e os itens antigos apagados)';

function productIdIssues(item, path) {
    if (item.productId === undefined) return [error(`${path}.productId`, `ausente: ${PARTIAL_WRITE}`)];
    if (typeof item.productId === 'string' && UUID.test(item.productId)) return [];
    return [warning(`${path}.productId`, 'precisa ser o id Zoppy (UUID) de um produto já criado; com o externalId do produto, id inexistente ou null o item é descartado sem erro')];
}

function quantityIssues(quantity, path) {
    const field = `${path}.quantity`;
    if (quantity === undefined) return [warning(field, 'ausente: o item é gravado com quantidade null')];
    if (typeof quantity === 'string' && !Number.isFinite(Number(quantity))) return [error(field, `"${quantity}" não é número: a API grava quantidade 0`)];
    if (typeof quantity === 'string') return [warning(field, `string "${quantity}": a API grava como número; mande número`)];
    if (typeof quantity !== 'number') return [warning(field, `deveria ser número (recebido ${JSON.stringify(quantity)})`)];
    if (quantity < 0) return [warning(field, `quantidade negativa é gravada como veio (${quantity})`)];
    if (!Number.isInteger(quantity)) return [warning(field, `decimal é arredondado ao gravar (${quantity})`)];
    return [];
}

function lineItemIssues(item, index) {
    const path = `lineItems[${index}]`;
    if (item === null || typeof item !== 'object') return [error(path, `item ${JSON.stringify(item)} não é objeto: ${PARTIAL_WRITE}`)];
    return [...productIdIssues(item, path), ...quantityIssues(item.quantity, path)];
}

export function lineItems(payload) {
    if (!Array.isArray(payload.lineItems)) return [];
    return payload.lineItems.flatMap((item, index) => lineItemIssues(item, index));
}

export function blankUrl(payload) {
    if (typeof payload.url !== 'string' || payload.url.trim().length > 0) return [];
    return [error('url', 'URL vazia ou só com espaços: a API grava url vazia e o carrinho fica sem link de recuperação')];
}
