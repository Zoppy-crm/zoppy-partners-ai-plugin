// @ts-check
// Regras de negócio do POST /users (vendedor), provadas contra a Partners API.
// Erro: a API recusa (400 ou 422) ou grava um valor que atrapalha achar o vendedor no pedido. Aviso: a API aceita e grava
// algo que o integrador costuma não esperar.

const KNOWN_FIELDS = ['email', 'name', 'phone', 'password', 'nickName', 'revenueRecord'];
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};:'"|,.<>/?]).{6,}$/;
const MOBILE = /^([14689][0-9]|2[12478]|3([1-5]|[7-8])|5([13-5])|7[193-7])9[0-9]{8}$/;

/** @typedef {import('../../scripts/validate.mjs').Issue} Issue */
/**
 * Payload de vendedor que já passou pelo schema; campos fora do schema também chegam aqui.
 * @typedef {{ email: string, name: string, phone: string, password: string, nickName?: string, revenueRecord?: string } & Record<string, unknown>} SellerPayload
 */

/** @type {(field: string, message: string) => Issue} */
const warning = (field, message) => ({ level: 'warning', field, message });
/** @type {(field: string, message: string) => Issue} */
const error = (field, message) => ({ level: 'error', field, message });

/**
 * @param {SellerPayload} payload
 * @returns {Issue[]}
 */
function checkPassword(payload) {
    if (STRONG_PASSWORD.test(payload.password)) return [];
    return [error('password', 'senha fraca: a API responde 422 Password does not attend security standarts. Use 6 ou mais caracteres com minúscula, maiúscula, número e símbolo')];
}

// Como a API normaliza: só dígitos, sem 0 inicial e sem 55; celular de 8 dígitos ganha o 9.
/**
 * @param {string} phone
 * @returns {string}
 */
function normalizedPhone(phone) {
    let digits = phone.replace(/\D/g, '').replace(/^0/, '');
    if ((digits.length === 13 || digits.length === 12) && digits.startsWith('55')) digits = digits.slice(2);
    if (digits.length === 10 && !/[2-5]/.test(digits[2])) digits = `${digits.slice(0, 2)}9${digits.slice(2)}`;
    return digits;
}

/**
 * @param {SellerPayload} payload
 * @returns {Issue[]}
 */
function checkPhone(payload) {
    const normalized = normalizedPhone(payload.phone);
    if (!MOBILE.test(normalized)) return [error('phone', `${payload.phone} não é celular brasileiro com DDD: a API responde 422 Invalid phone number.`)];
    if (normalized !== payload.phone) {
        return [error('phone', `a API aceita (200) e grava como veio ("${payload.phone}"), e o pedido nunca acha esse vendedor por seller.phone, porque compara com ${normalized}. Envie "${normalized}"`)];
    }
    return [];
}

// O validador geral aceita qualquer domínio com ponto; a API é mais estrita.
/**
 * @param {SellerPayload} payload
 * @returns {Issue[]}
 */
function checkEmail(payload) {
    // split devolve ao menos um pedaço, então pop() sempre tem valor.
    const domain = /** @type {string} */ (payload.email.split('@').pop());
    if (/^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(domain)) return [];
    return [error('email', `domínio "${domain}" recusado pela API: 400 email must be an email`)];
}

/**
 * @param {SellerPayload} payload
 * @returns {Issue[]}
 */
function checkRevenueRecord(payload) {
    if (payload.revenueRecord !== '') return [];
    return [error('revenueRecord', 'vazio é gravado, e um pedido com seller.revenueRecord "" passa a cair neste vendedor. Omita o campo quando não houver código')];
}

/**
 * @param {SellerPayload} payload
 * @returns {Issue[]}
 */
function checkUnknown(payload) {
    return Object.keys(payload)
        .filter((key) => !KNOWN_FIELDS.includes(key))
        .map((key) => warning(key, key === 'storeId' ? 'descartado: a API não liga vendedor a loja; a loja vai em cada pedido' : 'campo não documentado: pode ser gravado no usuário ou descartado, sem aviso. Envie só os campos documentados'));
}

/**
 * @param {SellerPayload} payload
 * @returns {Issue[]}
 */
export default function rules(payload) {
    return [...checkEmail(payload), ...checkPassword(payload), ...checkPhone(payload), ...checkRevenueRecord(payload), ...checkUnknown(payload)];
}
