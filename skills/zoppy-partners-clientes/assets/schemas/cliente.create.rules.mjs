// Regras de negócio do POST /customers, provadas contra a Partners API.
// Cada aviso descreve algo que a API aceita (200) mas grava diferente do que o integrador espera.

const KNOWN_FIELDS = ['externalId', 'email', 'phone', 'firstName', 'lastName', 'birthDate', 'gender', 'address', 'customFields'];
const ADDRESS_TEXT_FIELDS = ['address1', 'address2', 'city', 'state', 'postcode', 'country'];
const ADDRESS_EXPECTED_FIELDS = ['address1', 'city', 'state', 'postcode'];
const BR_PHONE = /^(?:55)?(?:0?(\d{2}))(\d{4,5})(\d{4})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HAS_TIME = /\d{2}:\d{2}/;
const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/;

const warning = (field, message) => ({ level: 'warning', field, message });
const error = (field, message) => ({ level: 'error', field, message });

// Mesma normalização da API: só dígitos, tira um 0 inicial, aceita 55 e 0 antes do DDD,
// e acrescenta o 9 em celular de 8 dígitos (fixo começa com 2 a 5 e fica com 8).
export function normalizePhone(raw) {
    let digits = String(raw).replace(/\D/g, '');
    if (digits.startsWith('0')) digits = digits.substring(1);
    const match = digits.match(BR_PHONE);
    if (!match) return null;
    const [, ddd, firstPart, secondPart] = match;
    const isLandline = firstPart.length === 4 && /^[2-5]/.test(firstPart);
    const addedNine = firstPart.length === 4 && !isLandline;
    return { phone: `${ddd}${addedNine ? '9' : ''}${firstPart}${secondPart}`, addedNine };
}

function checkPhone(payload) {
    const normalized = normalizePhone(payload.phone);
    if (!normalized) return [error('phone', `a API responde 422 "Phone invalid": "${payload.phone}" não vira DDD + 8 ou 9 dígitos`)];
    const issues = [];
    const raw = payload.phone.trim();
    const digits = raw.replace(/\D/g, '');
    if (raw.startsWith('+') && !digits.startsWith('55')) {
        issues.push(warning('phone', `a API só entende telefone brasileiro; "${payload.phone}" seria gravado como ${normalized.phone} (lido como DDD ${normalized.phone.slice(0, 2)})`));
    }
    if (digits.startsWith('00') && !digits.substring(2).startsWith('55')) {
        issues.push(warning('phone', `"${payload.phone}" começa com 00: a API descarta os zeros e grava ${normalized.phone} (DDD ${normalized.phone.slice(0, 2)}); se 00 era discagem internacional, o número não é brasileiro`));
    }
    if (digits.length === 11 && digits.startsWith('55') && normalized.phone.startsWith('55')) {
        issues.push(warning('phone', `"${payload.phone}" tem 55 + DDD + 7 dígitos (falta um dígito); a API lê 55 como DDD e grava ${normalized.phone}`));
    }
    if (normalized.addedNine) issues.push(warning('phone', `celular com 8 dígitos: a API acrescenta o 9 e grava ${normalized.phone}`));
    return issues;
}

function checkEmail(payload) {
    if (payload.email === undefined || payload.email === null || payload.email === '') return [];
    if (typeof payload.email === 'string' && EMAIL.test(payload.email)) return [];
    return [warning('email', `a API não valida e-mail e grava como veio: ${JSON.stringify(payload.email)}`)];
}

function checkBirthDate(payload) {
    const value = payload.birthDate;
    if (value === undefined || value === null) return [];
    if (typeof value === 'number') return [warning('birthDate', 'número é lido como milissegundos desde 1970; prefira "YYYY-MM-DD"')];
    if (Number.isNaN(new Date(value).getTime())) return [error('birthDate', `a API responde 400 "birthDate must be a Date instance" para "${value}"; use "YYYY-MM-DD" ou ISO 8601`)];
    const datePart = value.match(/^(\d{4}-\d{2}-\d{2})$/)?.[1];
    if (datePart && new Date(value).toISOString().slice(0, 10) !== datePart) {
        return [error('birthDate', `data impossível: a API aceita "${value}" e grava ${new Date(value).toISOString().slice(0, 10)}`)];
    }
    if (HAS_TIME.test(value) && !HAS_ZONE.test(value)) return [warning('birthDate', `data com hora e sem fuso é lida no horário de Brasília e devolvida em UTC; use "YYYY-MM-DD"`)];
    return [];
}

function checkGender(payload) {
    const value = payload.gender;
    if (value === undefined || value === null || value === '') return [];
    if (['m', 'f'].includes(value.toLowerCase())) return [];
    return [warning('gender', `a API aceita qualquer texto e grava em maiúsculas ("${value.toUpperCase()}"); os valores documentados são m e f`)];
}

function checkNames(payload) {
    return ['firstName', 'lastName'].filter((field) => payload[field].trim() === '').map((field) => warning(field, 'a API aceita e grava o nome vazio'));
}

export function checkAddressTypes(payload) {
    const address = payload.address;
    const issues = [];
    for (const field of ADDRESS_TEXT_FIELDS) {
        const value = address[field];
        if (value !== undefined && value !== null && typeof value !== 'string') issues.push(warning(`address.${field}`, `a API não valida o tipo e grava ${JSON.stringify(value)} convertido em texto; mande texto`));
    }
    for (const field of ['latitude', 'longitude']) {
        const value = address[field];
        if (value !== undefined && value !== null && typeof value !== 'number') issues.push(warning(`address.${field}`, 'a API não valida o tipo; valor que não é número é gravado como 0'));
    }
    return issues;
}

function checkAddressOnCreate(payload) {
    const address = payload.address;
    return ADDRESS_EXPECTED_FIELDS.filter((field) => address[field] === undefined || address[field] === null || address[field] === '').map((field) => warning(`address.${field}`, 'a API aceita sem este campo e grava o endereço incompleto'));
}

function checkUnknownFields(payload) {
    return Object.keys(payload)
        .filter((field) => !KNOWN_FIELDS.includes(field))
        .map((field) => warning(field, 'a API ignora este campo: não é gravado nem devolvido'));
}

export function commonRules(payload) {
    return [...checkPhone(payload), ...checkEmail(payload), ...checkBirthDate(payload), ...checkGender(payload), ...checkNames(payload), ...checkAddressTypes(payload), ...checkUnknownFields(payload)];
}

function checkCoordinatesOnCreate(payload) {
    return ['latitude', 'longitude']
        .filter((field) => payload.address[field] !== undefined)
        .map((field) => warning(`address.${field}`, 'ignorado no POST; para gravar, mande de novo num PUT /customers/{id}'));
}

export default function rules(payload) {
    return [...commonRules(payload), ...checkAddressOnCreate(payload), ...checkCoordinatesOnCreate(payload)];
}
