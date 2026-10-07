// Regras de negócio do produto, provadas em staging. Usadas por produto.create e produto.update.
const KNOWN_FIELDS = new Set(['externalId', 'name', 'status', 'specification', 'price', 'categories', 'provider']);
const PROVIDER = /^[a-zA-Z0-9\-_]+$/;
const NAME_MAX = 255;
const PROVIDER_MAX = 50;

function issue(level, field, message) {
    return { level, field, message };
}

function checkIgnoredFields(payload) {
    return Object.keys(payload)
        .filter((key) => !KNOWN_FIELDS.has(key))
        .map((key) => issue('warning', key, 'campo ignorado pela API: não é gravado nem devolvido (a API não tem SKU, estoque, preço promocional, imagem, URL nem variações)'));
}

function checkName(name) {
    if (typeof name !== 'string') return [];
    const issues = [];
    if (name.length > NAME_MAX) issues.push(issue('warning', 'name', `nome com ${name.length} caracteres é cortado em ${NAME_MAX}; o reenvio do mesmo nome cria outro produto`));
    if (name !== name.trim()) issues.push(issue('warning', 'name', 'espaço no início ou no fim faz o nome contar como outro produto na deduplicação'));
    return issues;
}

function checkPrice(price) {
    if (typeof price !== 'number') return [];
    const float32 = Math.fround(price);
    if (!Number.isFinite(float32)) return [issue('error', 'price', "preço acima de 3.4e38: a API responde 200 e grava 3.40282e+38")];
    const stored = Number(float32.toPrecision(6));
    if (stored === price) return [];
    return [issue('warning', 'price', `preço gravado como float de 32 bits com 6 dígitos significativos: ${price} vira ${stored}`)];
}

function checkProvider(provider) {
    if (typeof provider !== 'string' || provider.length === 0) return [];
    const issues = [];
    if (!PROVIDER.test(provider)) issues.push(issue('error', 'provider', 'use só letras, números, hífen e underscore, sem espaço (a API responde 400)'));
    if (provider.length > PROVIDER_MAX) issues.push(issue('error', 'provider', `máximo de ${PROVIDER_MAX} caracteres (a API responde 400)`));
    if (provider !== provider.toLowerCase()) issues.push(issue('warning', 'provider', `gravado em minúsculas: "${provider.toLowerCase()}"`));
    return issues;
}

export function productRules(payload) {
    return [...checkIgnoredFields(payload), ...checkName(payload.name), ...checkPrice(payload.price), ...checkProvider(payload.provider)];
}

export default function rules(payload) {
    return productRules(payload);
}
