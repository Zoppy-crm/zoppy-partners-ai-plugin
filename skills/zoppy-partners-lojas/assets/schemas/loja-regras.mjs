// @ts-check
// Regras de negócio de loja (POST /stores e PUT /stores/{id}), provadas contra a Partners API.
// Erro: a API aceita (200) mas grava um valor errado. Aviso: a API aceita e grava algo que
// o integrador costuma não esperar.

/** @typedef {import('../../scripts/validate.mjs').Issue} Issue */
/** @typedef {'create' | 'update'} Mode */
/**
 * Payload de loja que já passou pelo schema; campos fora do schema também chegam aqui.
 * @typedef {{ externalId?: string, name: string, isEcommerce?: boolean } & Record<string, unknown>} StorePayload
 */

const KNOWN_FIELDS = ['externalId', 'name', 'isEcommerce'];

/** @type {(field: string, message: string) => Issue} */
const warning = (field, message) => ({ level: 'warning', field, message });

/**
 * @param {StorePayload} payload
 * @returns {Issue[]}
 */
function checkName(payload) {
    const name = payload.name;
    if (name !== name.trim()) return [warning('name', 'espaço no começo ou no fim é gravado: um pedido que aponte a loja por store.name sem esses espaços não acha a loja e vai para a loja padrão "Integrador Externo". Tire os espaços e use storeId nos pedidos')];
    if (/\s{2,}/.test(name)) return [warning('name', 'espaços repetidos são gravados: store.name no pedido só acha a loja com os mesmos espaços. Use storeId nos pedidos')];
    return [];
}

/**
 * @param {StorePayload} payload
 * @param {Mode} mode
 * @returns {Issue[]}
 */
function checkExternalIdOnCreate(payload, mode) {
    if (mode !== 'create' || payload.externalId !== undefined) return [];
    return [warning('externalId', 'ausente: cada POST cria uma loja nova, mesmo com o mesmo nome. Mande o código da filial para reenviar sem duplicar')];
}

/**
 * @param {StorePayload} payload
 * @param {Mode} mode
 * @returns {Issue[]}
 */
function checkUpdate(payload, mode) {
    if (mode !== 'update') return [];
    /** @type {Issue[]} */
    const issues = [];
    if (payload.isEcommerce === undefined) issues.push(warning('isEcommerce', 'ausente: o PUT grava false (loja virtual vira loja física). Envie o valor atual'));
    if (payload.externalId === undefined) issues.push(warning('externalId', 'ausente: o PUT mantém o código gravado, mas a resposta vem sem o campo; confira com GET /stores/{id}'));
    return issues;
}

/**
 * @param {StorePayload} payload
 * @returns {Issue[]}
 */
function checkUnknown(payload) {
    return Object.keys(payload)
        .filter((key) => !KNOWN_FIELDS.includes(key))
        .map((key) => warning(key, 'campo desconhecido, ignorado pela API (a loja só tem externalId, name e isEcommerce)'));
}

/**
 * @param {StorePayload} payload
 * @param {Mode} mode
 * @returns {Issue[]}
 */
export function storeRules(payload, mode) {
    return [...checkName(payload), ...checkExternalIdOnCreate(payload, mode), ...checkUpdate(payload, mode), ...checkUnknown(payload)];
}
