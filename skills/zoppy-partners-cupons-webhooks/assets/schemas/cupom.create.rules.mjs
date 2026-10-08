import { amountRules, defaultsRules, externalIdRules, issue, onlyDigits } from './cupom-regras.mjs';

const BR_PHONE = /^(?:55)?(?:0?(\d{2}))(\d{4,5})(\d{4})$/;

function phoneFormatRules(payload, digits) {
    if (typeof payload.phone === 'number') return [issue('warning', 'phone', 'telefone como número JSON é aceito e gravado com os dígitos, mas mande texto, ex. "11987654321"')];
    if (digits !== payload.phone) return [issue('warning', 'phone', 'o telefone é gravado como veio, com a formatação; GET e PUT por /phone/{phone} só acham o cupom com o mesmo texto. Prefira só dígitos, ex. 11987654321')];
    return [];
}

// Mesma leitura do validador de cliente: celular de 8 dígitos (fixo começa com 2 a 5) ganha o 9
// no cadastro do cliente, mas o cupom grava o telefone como chega.
function missingNineRules(digits) {
    const match = digits.replace(/^0/, '').match(BR_PHONE);
    if (!match) return [];
    const [, ddd, firstPart, secondPart] = match;
    if (firstPart.length !== 4 || /^[2-5]/.test(firstPart)) return [];
    const customerPhone = `${ddd}9${firstPart}${secondPart}`;
    return [issue('warning', 'phone', `celular com 8 dígitos: no cadastro do cliente a API acrescenta o 9 e grava ${customerPhone}, mas o cupom fica com o telefone como veio e não aparece nas buscas pelo telefone do cliente. Mande o telefone que a Zoppy devolveu no cadastro do cliente (customer.phone)`)];
}

function phoneRules(payload) {
    const digits = onlyDigits(payload.phone);
    if (digits.length < 10) return [issue('error', 'phone', `telefone com ${digits.length} dígito(s); a API responde 422 "O número de celular do cupom é invalido." (mínimo 10 dígitos)`)];
    return [...phoneFormatRules(payload, digits), ...missingNineRules(digits)];
}

function individualRules(payload) {
    const issues = [];
    if (typeof payload.externalId === 'string' && payload.externalId.length > 255) {
        issues.push(issue('error', 'externalId', `externalId com ${payload.externalId.length} caracteres: a API corta em 255 sem avisar e a busca pelo valor inteiro não acha o cupom`));
    }
    if (typeof payload.externalId === 'number') issues.push(issue('warning', 'externalId', 'externalId numérico é gravado como texto: as consultas devolvem "123", não 123'));
    if (payload.awaitingOrder === undefined) {
        issues.push(issue('warning', 'awaitingOrder', 'sem awaitingOrder vale true: um pedido desse telefone que chegar sem couponCode consome este cupom e ganha o desconto dele. Mande false se o cupom só deve ser baixado pelo código'));
    }
    if (payload.usageLimit !== undefined) issues.push(issue('warning', 'usageLimit', 'ignorado no cupom individual: ele sempre tem um uso. Para vários usos no mesmo código, use POST /coupons/shared'));
    if (payload.description !== undefined) issues.push(issue('warning', 'description', 'ignorado pela API: a descrição não é gravada'));
    return issues;
}

export default function rules(payload) {
    return [...externalIdRules(payload), ...amountRules(payload), ...phoneRules(payload), ...defaultsRules(payload), ...individualRules(payload)];
}
