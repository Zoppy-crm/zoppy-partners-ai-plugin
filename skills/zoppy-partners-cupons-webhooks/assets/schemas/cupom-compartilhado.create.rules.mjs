import { amountRules, defaultsRules, externalIdRules, issue } from './cupom-regras.mjs';

const MAX_INT = 2147483647;

function sharedExternalIdRules(payload) {
    const value = payload.externalId;
    if (value === undefined || value === null || value === '' || payload.createOnProvider === true) return [];
    if (typeof value === 'string' && /^\d+$/.test(value)) {
        return Number(value) > MAX_INT
            ? [issue('error', 'externalId', `acima de ${MAX_INT}: a API grava ${MAX_INT} e o cupom não é achado pelo seu ID`)]
            : [issue('warning', 'externalId', 'externalId numérico em texto é gravado como número: as consultas devolvem 123, não "123"')];
    }
    if (typeof value === 'string') {
        return [issue('error', 'externalId', `o compartilhado guarda externalId como inteiro: ${JSON.stringify(value)} vira 0 com resposta 200, e a busca por ele devolve outro cupom. Mande um inteiro de 0 a ${MAX_INT}`)];
    }
    if (value > MAX_INT) return [issue('error', 'externalId', `acima de ${MAX_INT}: a API grava ${MAX_INT} e o cupom não é achado pelo seu ID`)];
    if (!Number.isInteger(value)) return [issue('warning', 'externalId', 'o compartilhado guarda externalId como inteiro; mande um inteiro')];
    return [];
}

function sharedRules(payload) {
    const issues = [];
    if (typeof payload.amount === 'number' && !Number.isInteger(payload.amount)) {
        issues.push(issue('warning', 'amount', `o compartilhado guarda amount como inteiro: ${payload.amount} vira ${Math.round(payload.amount)}`));
    }
    if (payload.usageLimit === undefined) issues.push(issue('warning', 'usageLimit', 'sem usageLimit o compartilhado aceita um único uso; mande o total de usos que você quer'));
    if (payload.phone !== undefined) issues.push(issue('warning', 'phone', 'ignorado: o cupom compartilhado não tem cliente e não aparece nas buscas por telefone'));
    return issues;
}

export default function rules(payload) {
    return [...externalIdRules(payload), ...sharedExternalIdRules(payload), ...amountRules(payload), ...defaultsRules(payload), ...sharedRules(payload)];
}
