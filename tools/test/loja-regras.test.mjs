// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storeRules } from '../../skills/zoppy-partners-lojas/assets/schemas/loja-regras.mjs';

/** @typedef {import('../../skills/zoppy-partners-lojas/assets/schemas/loja-regras.mjs').Issue} Issue */
/** @typedef {import('../../skills/zoppy-partners-lojas/assets/schemas/loja-regras.mjs').StorePayload} StorePayload */

/** @type {StorePayload} */
const valid = { externalId: 'store-1', name: 'Loja Principal', isEcommerce: true };

test('payload válido em modo create e em modo update devolve lista vazia', () => {
    assert.deepEqual(storeRules(valid, 'create'), []);
    assert.deepEqual(storeRules(valid, 'update'), []);
});

test('name com espaço no começo ou no fim gera aviso no campo name', () => {
    /** @type {Issue[]} */
    const leading = storeRules({ ...valid, name: ' Loja' }, 'create');
    assert.equal(leading.length, 1);
    assert.equal(leading[0].field, 'name');
    assert.equal(leading[0].level, 'warning');

    /** @type {Issue[]} */
    const trailing = storeRules({ ...valid, name: 'Loja ' }, 'create');
    assert.equal(trailing.length, 1);
    assert.equal(trailing[0].field, 'name');
    assert.equal(trailing[0].level, 'warning');
});

test('name com espaços repetidos no meio gera aviso no campo name', () => {
    /** @type {Issue[]} */
    const issues = storeRules({ ...valid, name: 'Loja  Principal' }, 'create');
    assert.equal(issues.length, 1);
    assert.equal(issues[0].field, 'name');
    assert.equal(issues[0].level, 'warning');
});

test('create sem externalId gera aviso em externalId e update sem externalId gera aviso próprio', () => {
    /** @type {Issue[]} */
    const createIssues = storeRules({ name: 'Loja Principal', isEcommerce: true }, 'create');
    /** @type {Issue | undefined} */
    const createExt = createIssues.find((issue) => issue.field === 'externalId');
    assert.ok(createExt);
    assert.equal(createExt.level, 'warning');
    assert.match(createExt.message, /cada POST cria uma loja nova/);

    /** @type {Issue[]} */
    const updateIssues = storeRules({ name: 'Loja Principal', isEcommerce: true }, 'update');
    /** @type {Issue | undefined} */
    const updateExt = updateIssues.find((issue) => issue.field === 'externalId');
    assert.ok(updateExt);
    assert.equal(updateExt.level, 'warning');
    assert.match(updateExt.message, /o PUT mantém o código gravado/);
});

test('update sem isEcommerce gera aviso em isEcommerce e create sem isEcommerce não gera', () => {
    /** @type {StorePayload} */
    const payload = { externalId: 'store-1', name: 'Loja Principal' };

    /** @type {Issue[]} */
    const updateIssues = storeRules(payload, 'update');
    /** @type {Issue[]} */
    const updateEcommerce = updateIssues.filter((issue) => issue.field === 'isEcommerce');
    assert.equal(updateEcommerce.length, 1);
    assert.equal(updateEcommerce[0].level, 'warning');

    /** @type {Issue[]} */
    const createIssues = storeRules(payload, 'create');
    /** @type {Issue[]} */
    const createEcommerce = createIssues.filter((issue) => issue.field === 'isEcommerce');
    assert.equal(createEcommerce.length, 0);
});

test('campo desconhecido gera um aviso por campo com o nome do campo', () => {
    /** @type {Issue[]} */
    const issues = storeRules({ ...valid, extraField: 'a', outroCampo: 1 }, 'create');
    assert.equal(issues.length, 2);
    /** @type {Issue | undefined} */
    const extra = issues.find((issue) => issue.field === 'extraField');
    /** @type {Issue | undefined} */
    const outro = issues.find((issue) => issue.field === 'outroCampo');
    assert.ok(extra);
    assert.equal(extra.level, 'warning');
    assert.ok(outro);
    assert.equal(outro.level, 'warning');
});

test('todo item devolvido tem level warning', () => {
    /** @type {Issue[]} */
    const updateIssues = storeRules({ name: ' Loja  Centro ', extra: 1 }, 'update');
    assert.ok(updateIssues.length > 0);
    assert.equal(updateIssues.every((issue) => issue.level === 'warning'), true);

    /** @type {Issue[]} */
    const createIssues = storeRules({ name: 'Loja', extra: 1 }, 'create');
    assert.ok(createIssues.length > 0);
    assert.equal(createIssues.every((issue) => issue.level === 'warning'), true);
});
