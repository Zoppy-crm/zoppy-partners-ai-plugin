// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../validate.mjs';
import { orderRules } from '../../skills/zoppy-partners-pedidos/assets/schemas/pedido-regras.mjs';

/** @typedef {import('../../skills/zoppy-partners-pedidos/assets/schemas/pedido-regras.mjs').OrderPayload} OrderPayload */

const schemasDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'skills', 'zoppy-partners-pedidos', 'assets', 'schemas');

/** @type {OrderPayload} */
const delivered = {
    status: 'completed',
    subStatus: 'delivered',
    subtotal: 100,
    discount: 0,
    shipping: 0,
    lineItems: [],
    createdAt: '2026-11-04T10:00:00-03:00',
    completedAt: '2026-11-04T10:05:00-03:00'
};

/** @type {(issues: { field: string }[]) => string[]} */
const fields = (issues) => issues.map((issue) => issue.field);

test('subStatus delivered com completed passa no schema e nas regras, sem aviso de campo desconhecido', async () => {
    const result = await validate('pedido.update', delivered, schemasDir);
    assert.equal(result.valid, true);
    assert.equal(fields(result.issues).includes('subStatus'), false);
});

test('subStatus null passa no schema do PUT', async () => {
    const result = await validate('pedido.update', { ...delivered, subStatus: null }, schemasDir);
    assert.equal(result.valid, true);
});

test('subStatus fora de delivered é erro de schema', async () => {
    const result = await validate('pedido.create', { ...delivered, externalId: 'p-1', customerId: 'c-1', subStatus: 'shipped' }, schemasDir);
    assert.equal(result.valid, false);
    assert.equal(result.issues[0].field, 'subStatus');
});

test('delivered com status diferente de completed é erro nas regras, no POST e no PUT', () => {
    for (const status of ['on-hold', 'processing', 'canceled']) {
        for (const mode of /** @type {const} */ (['create', 'update'])) {
            const issues = orderRules({ ...delivered, status }, mode).filter((issue) => issue.field === 'subStatus');
            assert.equal(issues.length, 1);
            assert.equal(issues[0].level, 'error');
            assert.match(issues[0].message, /subStatus requires status completed/);
        }
    }
});

test('PUT sem subStatus não gera aviso de subStatus', () => {
    const { subStatus, ...withoutSubStatus } = delivered;
    assert.equal(subStatus, 'delivered');
    const issues = orderRules({ ...withoutSubStatus, status: 'on-hold' }, 'update');
    assert.equal(fields(issues).includes('subStatus'), false);
});
