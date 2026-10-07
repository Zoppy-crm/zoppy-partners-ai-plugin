// Regras de negócio do PUT /customers/{id}, provadas contra a Partners API.
import { commonRules } from './cliente.create.rules.mjs';

function checkGenderClear(payload) {
    if (payload.gender !== '') return [];
    return [{ level: 'warning', field: 'gender', message: 'texto vazio apaga o gênero do cliente; para manter, omita o campo' }];
}

function checkCoordinates(payload) {
    return ['latitude', 'longitude']
        .filter((field) => payload.address[field] !== undefined && payload.address[field] !== null && typeof payload.address[field] !== 'number')
        .map((field) => ({ level: 'warning', field: `address.${field}`, message: 'a API não valida o tipo; mande número' }));
}

export default function rules(payload) {
    return [...commonRules(payload), ...checkGenderClear(payload), ...checkCoordinates(payload)];
}
