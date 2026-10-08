// Regras de negócio de pedido (POST /orders e PUT /orders/{id}), provadas contra a Partners API.
// Erro: a API aceita (200) mas grava um valor errado. Aviso: a API aceita e grava algo que
// o integrador costuma não esperar.

const KNOWN_FIELDS = [
    'externalId', 'customerId', 'couponCode', 'storeId', 'store', 'status', 'subtotal', 'discount', 'shipping',
    'lineItems', 'createdAt', 'completedAt', 'updatedAt', 'seller', 'userId', 'provider', 'createCoupon', 'orderFromZoppy'
];
const UPDATE_IGNORED = ['externalId', 'customerId'];

const warning = (field, message) => ({ level: 'warning', field, message });
const error = (field, message) => ({ level: 'error', field, message });
const money = (value) => Number(value.toFixed(2));

function checkMissingValues(payload) {
    return ['discount', 'shipping']
        .filter((field) => payload[field] === undefined)
        .map((field) => error(field, `ausente: a API grava total 0 em vez de subtotal - discount - shipping. Envie ${field}: 0 quando não houver`));
}

function checkTotal(payload) {
    const { subtotal, discount, shipping } = payload;
    if (discount === undefined || shipping === undefined) return [];
    const total = money(subtotal - discount - shipping);
    if (total < 0) {
        return [error('subtotal', `subtotal ${subtotal} menor que discount + shipping (${money(discount + shipping)}): o total gravado fica ${total}. O subtotal deve vir com o frete somado (itens + shipping) e frete grátis vai como shipping 0`)];
    }
    if (shipping > 0 && discount >= money(subtotal - shipping)) {
        return [warning('shipping', `shipping ${shipping} com desconto cobrindo todos os itens: se o frete foi grátis ou zerado por cupom, envie shipping 0 e tire o frete do subtotal e do discount`)];
    }
    if (shipping > 0) {
        return [warning('subtotal', `conferência do frete: a Zoppy vai entender itens = ${money(subtotal - shipping)} e gravar total ${total} (itens com desconto, sem frete). Se ${money(subtotal - shipping)} é o valor dos itens, o payload está certo. Só se o valor dos itens for ${subtotal} (subtotal mandado sem o frete), corrija para subtotal ${money(subtotal + shipping)}`)];
    }
    return [];
}

function checkStatus(payload, mode) {
    if (payload.status !== 'processing') return [];
    const effect = mode === 'create' ? 'no POST a API grava on-hold' : 'no PUT a API grava processing como veio';
    return [warning('status', `processing: ${effect}. Use on-hold para aguardando pagamento e completed para pago ou confirmado`)];
}

function checkDates(payload, mode) {
    const issues = [];
    if (payload.createdAt === undefined && payload.completedAt !== undefined) {
        const effect = mode === 'create' ? 'a data do pedido vira a do completedAt' : 'o PUT troca a data do pedido pela do completedAt';
        issues.push(error('createdAt', `ausente com completedAt presente: ${effect} (data do pagamento, não da venda), e o pedido sai do período da venda no filtro after. Envie createdAt com a data da venda`));
    }
    if (payload.createdAt === undefined && payload.completedAt === undefined) {
        const fallback = mode === 'create' ? 'o momento do envio' : 'a data atual (mantida)';
        issues.push(warning('createdAt', `ausente: a data do pedido (a que o filtro after da listagem usa) vira ${fallback}. Envie a data da venda`));
    }
    if (payload.completedAt !== undefined && payload.status !== 'completed') {
        issues.push(warning('completedAt', `ignorado com status ${payload.status}: a API só grava completedAt com status completed`));
    }
    if (payload.status === 'completed' && payload.completedAt === undefined) {
        const effect = mode === 'create' ? 'o pedido fica sem completedAt' : 'a API mantém o completedAt anterior';
        issues.push(warning('completedAt', `ausente com status completed: ${effect}`));
    }
    return issues;
}

const filled = (value) => typeof value === 'string' && value !== '';

function checkEmptyStoreFields(store) {
    if (!store || typeof store !== 'object') return [];
    return ['externalId', 'name']
        .filter((field) => store[field] === '')
        .map((field) => error(`store.${field}`, `texto vazio não é ignorado: casa com uma loja de ${field === 'name' ? 'nome' : 'código'} vazio, se a conta tiver, e ganha do outro campo. Omita o campo`));
}

function checkEmptyStoreId(payload, mode) {
    if (payload.storeId !== '') return [];
    const store = payload.store;
    if (store && typeof store === 'object' && (filled(store.externalId) || filled(store.name))) return [warning('storeId', 'vazio é ignorado: vale o store. Omita o campo')];
    if (mode === 'update') return [warning('storeId', 'vazio: no PUT, sem store, a loja do pedido é mantida. Omita o campo')];
    return [error('storeId', 'vazio: no POST, sem store, o pedido vai para a loja padrão "Integrador Externo". Envie o id da loja ou omita o campo')];
}

function checkStore(payload, mode) {
    const store = payload.store;
    const issues = [...checkEmptyStoreId(payload, mode), ...checkEmptyStoreFields(store)];
    if (filled(payload.storeId)) return issues;
    const usable = store && typeof store === 'object' && (filled(store.externalId) || filled(store.name));
    const sent = store !== undefined && store !== null;
    if (!usable && sent) {
        const effect = mode === 'update' ? 'tira o pedido da loja atual e o grava na loja padrão "Integrador Externo"' : 'grava o pedido na loja padrão "Integrador Externo"';
        return [...issues, warning('store', `sem name nem externalId preenchidos: ${effect} (200, sem erro). Envie o storeId da filial (skill zoppy-partners-lojas)`)];
    }
    if (!usable) {
        if (mode !== 'create') return issues;
        return [...issues, warning('storeId', 'sem storeId nem store: o pedido vai para a loja padrão "Integrador Externo" (200, sem erro). Envie o storeId da filial (skill zoppy-partners-lojas)')];
    }
    if (filled(store.externalId)) return issues;
    const effect = mode === 'update' ? 'tira o pedido da loja atual e o grava na loja padrão "Integrador Externo"' : 'grava o pedido na loja padrão "Integrador Externo"';
    return [...issues, warning('store', `só store.name: prefira storeId. O nome precisa bater com espaços (maiúsculas e acentos não importam), com duas lojas de mesmo nome o pedido vai para uma delas sem garantia de qual, e nome sem correspondência ${effect} sem erro`)];
}

function checkCouponOnUpdate(payload, mode) {
    if (mode !== 'update' || payload.couponCode === undefined) return [];
    if (payload.couponCode === '') return [warning('couponCode', 'vazio: o PUT apaga o cupom gravado no pedido. Para manter o cupom, omita o campo')];
    return [warning('couponCode', 'no PUT o cupom precisa existir na Zoppy, senão 422 Coupon code not found e nada é gravado (cupom do seu sistema ou giftback já excluído). Se não tiver certeza, omita o campo: ausente mantém o cupom gravado')];
}

function checkCoupon(payload) {
    if (!payload.couponCode || payload.discount !== 0) return [];
    return [warning('discount', 'couponCode com discount 0: se o cupom existir na Zoppy, ela preenche o discount com o valor do cupom e o subtotal lido de volta aumenta. Envie o desconto real')];
}

function checkLineItems(payload, mode) {
    const issues = [];
    (payload.lineItems ?? []).forEach((item, index) => {
        if (!Number.isInteger(item.quantity)) issues.push(warning(`lineItems[${index}].quantity`, `${item.quantity} não é inteiro: a API arredonda`));
    });
    if (mode === 'update' && payload.lineItems === undefined) {
        issues.push(warning('lineItems', 'ausente: o PUT apaga todos os itens do pedido. Reenvie os itens'));
    }
    return issues;
}

function checkIgnoredFields(payload, mode) {
    const issues = [];
    if (payload.total !== undefined) issues.push(warning('total', 'a API ignora total e calcula subtotal - discount - shipping'));
    if (payload.items !== undefined) issues.push(warning('items', 'a API ignora items; os itens vão em lineItems'));
    if (mode === 'update') {
        for (const field of UPDATE_IGNORED.filter((name) => payload[name] !== undefined)) {
            issues.push(warning(field, 'o PUT ignora este campo; ele não muda depois de criado'));
        }
    }
    if (payload.createCoupon !== undefined) issues.push(warning('createCoupon', 'não tem efeito no pedido; nenhum cupom é criado por ele'));
    const unknown = Object.keys(payload).filter((key) => !KNOWN_FIELDS.includes(key) && key !== 'total' && key !== 'items');
    for (const key of unknown) issues.push(warning(key, 'campo desconhecido, ignorado pela API'));
    return issues;
}

export function orderRules(payload, mode) {
    return [
        ...checkMissingValues(payload),
        ...checkTotal(payload),
        ...checkStatus(payload, mode),
        ...checkDates(payload, mode),
        ...checkStore(payload, mode),
        ...checkCoupon(payload),
        ...checkCouponOnUpdate(payload, mode),
        ...checkLineItems(payload, mode),
        ...checkIgnoredFields(payload, mode)
    ];
}
