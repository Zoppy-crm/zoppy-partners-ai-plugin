#!/usr/bin/env node
// Exemplo: criar, buscar, reenviar, atualizar e excluir um produto, conferindo cada leitura de volta.
// Requer ZOPPY_PARTNERS_TOKEN, ZOPPY_ACCESS e ZOPPY_PARTNERS_BASE_URL.
const missing = ['ZOPPY_PARTNERS_TOKEN', 'ZOPPY_ACCESS', 'ZOPPY_PARTNERS_BASE_URL'].filter((name) => !process.env[name]);
if (missing.length) {
    console.error(`Defina as variáveis de ambiente: ${missing.join(', ')}`);
    process.exit(2);
}

const BASE_URL = process.env.ZOPPY_PARTNERS_BASE_URL;

async function request(method, path, body) {
    const response = await fetch(`${BASE_URL}${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${process.env.ZOPPY_PARTNERS_TOKEN}`,
            'zoppy-access': process.env.ZOPPY_ACCESS,
            'Content-Type': 'application/json'
        },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    return { status: response.status, data: text ? JSON.parse(text) : null, text };
}

async function zoppy(method, path, body) {
    const { status, data, text } = await request(method, path, body);
    if (status >= 400) throw new Error(`${method} ${path} respondeu ${status}: ${text}`);
    return data;
}

function expectEqual(label, actual, expected) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label}: esperado ${JSON.stringify(expected)}, veio ${JSON.stringify(actual)}`);
}

const runId = `skills-test-zoppy-partners-produtos-${Date.now()}`;
let productId;

try {
    // 1. Criar. price é número JSON; provider vai em minúsculas na gravação.
    const created = await zoppy('POST', '/products', {
        externalId: `${runId}-sku`,
        name: `${runId} Camiseta Polo`,
        status: 'publish',
        specification: 'm',
        price: 89.9,
        categories: ['vestuario', 'masculino'],
        provider: 'Meu-Ecommerce'
    });
    productId = created.id;
    expectEqual('provider gravado', created.provider, 'meu-ecommerce');

    // 2. Ler de volta pelas três rotas de busca.
    const byId = await zoppy('GET', `/products/${productId}`);
    const byExternalId = await zoppy('GET', `/products/external/${encodeURIComponent(`${runId}-sku`)}`);
    const byName = await zoppy('GET', `/products/name/${encodeURIComponent(`${runId} Camiseta Polo`)}`);
    expectEqual('busca por externalId devolve o mesmo id', byExternalId.id, productId);
    expectEqual('busca por nome devolve o mesmo id', byName.id, productId);
    expectEqual('price lido', byId.price, 89.9);
    expectEqual('categories lidas', byId.categories, ['vestuario', 'masculino']);

    // 3. Reenviar o POST com o mesmo name e provider: devolve o produto existente e NÃO atualiza nada.
    const resent = await zoppy('POST', '/products', {
        externalId: `${runId}-sku`,
        name: `${runId} Camiseta Polo`,
        status: 'publish',
        price: 79.9,
        categories: ['vestuario', 'masculino'],
        provider: 'meu-ecommerce'
    });
    expectEqual('reenvio devolve o mesmo id', resent.id, productId);
    expectEqual('reenvio não muda o preço', resent.price, 89.9);

    // 4. Atualizar com PUT: corpo completo; categories substitui a lista inteira.
    await zoppy('PUT', `/products/${productId}`, {
        externalId: `${runId}-sku`,
        name: `${runId} Camiseta Polo Premium`,
        status: 'draft',
        specification: 'f',
        price: 99.9,
        categories: ['vestuario', 'feminino'],
        provider: 'meu-ecommerce'
    });
    const updated = await zoppy('GET', `/products/${productId}`);
    expectEqual('nome atualizado', updated.name, `${runId} Camiseta Polo Premium`);
    expectEqual('status atualizado', updated.status, 'draft');
    expectEqual('specification atualizada', updated.specification, 'f');
    expectEqual('price atualizado', updated.price, 99.9);
    expectEqual('categories substituídas', updated.categories, ['vestuario', 'feminino']);

    // 5. Excluir e conferir que some das buscas.
    const deleted = await zoppy('DELETE', `/products/${productId}`);
    expectEqual('DELETE result', deleted.result, true);
    const afterDelete = await request('GET', `/products/${productId}`);
    expectEqual('GET depois do DELETE', afterDelete.status, 404);
    productId = undefined;

    console.log(JSON.stringify({ ok: true, runId, criado: created.id, precoFinal: updated.price, categoriasFinais: updated.categories }));
} finally {
    if (productId) await request('DELETE', `/products/${productId}`);
}
