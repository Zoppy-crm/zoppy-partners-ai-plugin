// @ts-check
// Regras de negócio do PUT /customers/{id}, provadas contra a Partners API.
import { commonRules } from './cliente.create.rules.mjs';

/** @typedef {import('../../scripts/validate.mjs').Issue} Issue */
/** @typedef {import('./cliente.create.rules.mjs').CustomerPayload} CustomerPayload */

/** @type {(field: string, message: string) => Issue} */
const warning = (field, message) => ({ level: 'warning', field, message });
const CLEARED_BY_NULL = ['address1', 'city', 'state', 'postcode'];

/**
 * @param {CustomerPayload} payload
 * @returns {Issue[]}
 */
function checkClearing(payload) {
    /** @type {Issue[]} */
    const issues = [];
    if (payload.gender === '') issues.push(warning('gender', 'texto vazio apaga o gênero do cliente; para manter, omita o campo'));
    if (payload.email === '') issues.push(warning('email', 'texto vazio apaga o e-mail do cliente; para manter, omita o campo ou mande null'));
    if (payload.externalId === '') issues.push(warning('externalId', 'texto vazio desfaz o vínculo com o seu id; o externalId antigo deixa de ser encontrado'));
    if (payload.address.address2 === '') issues.push(warning('address.address2', 'texto vazio apaga o complemento; para manter, omita o campo'));
    for (const field of CLEARED_BY_NULL) {
        if (payload.address[field] === null) issues.push(warning(`address.${field}`, 'null apaga este campo; para manter, omita o campo'));
    }
    return issues;
}

/**
 * @param {CustomerPayload} payload
 * @returns {Issue[]}
 */
function checkOmittedAddress(payload) {
    return CLEARED_BY_NULL.filter((field) => payload.address[field] === undefined).map((field) =>
        warning(`address.${field}`, 'omitido no PUT: a API mantém o valor atual, mas a resposta do PUT mostra o campo ausente ou vazio; confira com GET')
    );
}

/**
 * @param {CustomerPayload} payload
 * @returns {Issue[]}
 */
export default function rules(payload) {
    return [...commonRules(payload), ...checkClearing(payload), ...checkOmittedAddress(payload)];
}
