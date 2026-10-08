// @ts-check
// Regras comuns aos dois tipos de cupom. Cada regra foi provada contra a API em staging.

/** @typedef {import('../../scripts/validate.mjs').Issue} Issue */
/**
 * Campos comuns ao cupom individual e ao compartilhado, depois do schema; campos fora do schema também chegam aqui.
 * @typedef {{ externalId?: string | number, code: string, amount: number | string, type?: string, expiryDate?: string, minPurchaseValue?: number | string, createOnProvider?: boolean, usageLimit?: number, usageLimitPerUser?: number, phone?: string | number } & Record<string, unknown>} CouponPayload
 */

/**
 * @param {Issue['level']} level
 * @param {string} field
 * @param {string} message
 * @returns {Issue}
 */
export function issue(level, field, message) {
    return { level, field, message };
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function onlyDigits(value) {
    return String(value ?? '').replace(/\D/g, '');
}

/**
 * @param {CouponPayload} payload
 * @returns {Issue[]}
 */
export function externalIdRules(payload) {
    if (payload.createOnProvider === true) {
        return [issue('warning', 'createOnProvider', 'createOnProvider não é coberto por esta skill e não foi validado; mande externalId e deixe createOnProvider de fora')];
    }
    if (payload.externalId === undefined || payload.externalId === null || payload.externalId === '' || payload.externalId === 0) {
        return [issue('error', 'externalId', 'obrigatório e diferente de 0: a API responde 422 "O Id externo do cupom deve ser informado."')];
    }
    return [];
}

/**
 * @param {CouponPayload} payload
 * @returns {Issue[]}
 */
export function amountRules(payload) {
    if (payload.amount === 0 || payload.amount === '') return [issue('error', 'amount', 'amount zero ou vazio: a API responde 422 "O valor do cupom deve ser informada."')];
    if (!(Number(payload.amount) > 0)) {
        return [issue('error', 'amount', `amount ${JSON.stringify(payload.amount)} não é maior que zero: a API responde 200 e grava esse valor como desconto. Mande número maior que zero`)];
    }
    if (typeof payload.amount === 'string') return [issue('warning', 'amount', `amount como texto (${JSON.stringify(payload.amount)}) é aceito, mas mande número JSON`)];
    return [];
}

/**
 * @param {CouponPayload} payload
 * @returns {Issue[]}
 */
export function defaultsRules(payload) {
    /** @type {Issue[]} */
    const issues = [];
    if (payload.expiryDate === undefined) issues.push(issue('warning', 'expiryDate', 'sem expiryDate o cupom vale até 2100-01-01; mande a validade que você quer'));
    if (payload.minPurchaseValue === undefined) {
        const assumed = payload.type === 'percent' ? '0' : `o próprio amount (${payload.amount})`;
        issues.push(issue('warning', 'minPurchaseValue', `sem minPurchaseValue a Zoppy grava ${assumed}; mande o valor mínimo de compra que você quer`));
    }
    if (payload.usageLimitPerUser !== undefined) issues.push(issue('warning', 'usageLimitPerUser', 'ignorado pela API: não é gravado e não limita usos por cliente'));
    return issues;
}
