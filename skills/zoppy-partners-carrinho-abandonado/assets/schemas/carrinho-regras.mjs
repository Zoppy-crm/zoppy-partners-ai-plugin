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

export function unknownFields(payload, known) {
    return Object.keys(payload)
        .filter((field) => !known.includes(field))
        .map((field) => warning(field, 'campo ignorado pela API nesta operação (não é gravado nem devolvido)'));
}

function lineItemIssues(item, index) {
    const path = `lineItems[${index}]`;
    const issues = [];
    if (item.productId === undefined) {
        issues.push(error(`${path}.productId`, 'ausente: a API responde 500, mas o carrinho já fica gravado, sem este item e sem os seguintes'));
    } else if (typeof item.productId !== 'string' || !UUID.test(item.productId)) {
        issues.push(warning(`${path}.productId`, 'precisa ser o id Zoppy (UUID) de um produto já criado; com o externalId do produto ou id inexistente o item é descartado sem erro'));
    }
    if (typeof item.quantity !== 'number') issues.push(warning(`${path}.quantity`, `deveria ser número; a API grava o item mesmo assim (recebido ${JSON.stringify(item.quantity)})`));
    else if (item.quantity < 0) issues.push(warning(`${path}.quantity`, `quantidade negativa é gravada como veio (${item.quantity})`));
    return issues;
}

export function lineItems(payload) {
    if (!Array.isArray(payload.lineItems)) return [];
    return payload.lineItems.flatMap((item, index) => lineItemIssues(item ?? {}, index));
}

export function blankUrl(payload) {
    if (typeof payload.url !== 'string' || payload.url.length === 0 || payload.url.trim().length > 0) return [];
    return [warning('url', 'URL só com espaços é aceita e gravada vazia: o carrinho fica sem link de recuperação')];
}
