// Regras de negócio do POST /users (vendedor), provadas contra a Partners API.
// Erro: a API recusa (422) ou grava um valor que impede achar o vendedor. Aviso: a API aceita e grava
// algo que o integrador costuma não esperar.

const KNOWN_FIELDS = ['email', 'name', 'phone', 'password', 'nickName', 'revenueRecord'];
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};:'"|,.<>/?]).{6,}$/;
const MOBILE = /^([14689][0-9]|2[12478]|3([1-5]|[7-8])|5([13-5])|7[193-7])9[0-9]{8}$/;

const warning = (field, message) => ({ level: 'warning', field, message });
const error = (field, message) => ({ level: 'error', field, message });

function checkPassword(payload) {
    if (STRONG_PASSWORD.test(payload.password)) return [];
    return [error('password', 'senha fraca: a API responde 422 Password does not attend security standarts. Use 6 ou mais caracteres com minúscula, maiúscula, número e símbolo')];
}

function normalizedPhone(phone) {
    const digits = phone.replace(/\D/g, '').replace(/^0/, '');
    return digits.length === 13 && digits.startsWith('55') ? digits.slice(2) : digits;
}

function checkPhone(payload) {
    const normalized = normalizedPhone(payload.phone);
    if (!MOBILE.test(normalized)) return [error('phone', `${payload.phone} não é celular brasileiro com DDD e 9: a API responde 422 Invalid phone number.`)];
    if (normalized !== payload.phone) {
        return [error('phone', `gravado como veio ("${payload.phone}"): o pedido nunca acha esse vendedor por seller.phone, porque compara com ${normalized}. Envie "${normalized}"`)];
    }
    return [];
}

function checkUnknown(payload) {
    return Object.keys(payload)
        .filter((key) => !KNOWN_FIELDS.includes(key))
        .map((key) => warning(key, key === 'storeId' ? 'ignorado: a API não liga vendedor a loja; a loja vai em cada pedido' : 'campo desconhecido, ignorado pela API'));
}

export default function rules(payload) {
    return [...checkPassword(payload), ...checkPhone(payload), ...checkUnknown(payload)];
}
