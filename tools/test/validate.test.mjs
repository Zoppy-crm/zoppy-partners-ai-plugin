// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, checkSchema } from '../validate.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, 'fixtures', 'schemas');
const cli = join(here, '..', 'validate.mjs');
const ok = { externalId: 'p-1', subtotal: 10 };

/**
 * @param {string[]} args
 * @returns {{ code: number | null, out: string }}
 */
function run(args) {
    try {
        return { code: 0, out: execFileSync('node', [cli, `--schemas-dir=${dir}`, ...args], { encoding: 'utf8' }) };
    } catch (e) {
        const failure = /** @type {{ status: number | null, stdout: string, stderr: string }} */ (e);
        return { code: failure.status, out: `${failure.stdout}${failure.stderr}` };
    }
}

test('payload válido passa', async () => {
    assert.deepEqual(await validate('exemplo.create', ok, dir), { valid: true, issues: [] });
});

test('obrigatório ausente é erro com o nome do campo', async () => {
    const r = await validate('exemplo.create', { externalId: 'p-1' }, dir);
    assert.equal(r.valid, false);
    assert.deepEqual(r.issues.map((i) => [i.level, i.field]), [['error', 'subtotal']]);
});

test('número como string é erro de tipo', async () => {
    const r = await validate('exemplo.create', { ...ok, subtotal: '199.90' }, dir);
    assert.equal(r.issues[0].field, 'subtotal');
    assert.match(r.issues[0].message, /number/);
});

test('data sem fuso é erro de formato', async () => {
    const r = await validate('exemplo.create', { ...ok, createdAt: '2026-09-05 10:26' }, dir);
    assert.equal(r.issues[0].field, 'createdAt');
});

test('data ISO com fuso passa', async () => {
    const r = await validate('exemplo.create', { ...ok, createdAt: '2026-09-05T10:26:00-03:00' }, dir);
    assert.equal(r.valid, true);
});

test('enum, minimum, additionalProperties e itens aninhados', async () => {
    const r = await validate('exemplo.create', { ...ok, subtotal: -1, status: 'cancelled', extra: 1, lineItems: [{}] }, dir);
    assert.deepEqual(r.issues.map((i) => i.field).sort(), ['extra', 'lineItems[0].productId', 'status', 'subtotal']);
});

test('tipo múltiplo aceita null', async () => {
    assert.equal((await validate('exemplo.create', { ...ok, email: null }, dir)).valid, true);
});

test('regra de negócio vira aviso e não invalida', async () => {
    const r = await validate('exemplo.create', { ...ok, subtotal: 0 }, dir);
    assert.equal(r.valid, true);
    assert.deepEqual(r.issues, [{ level: 'warning', field: 'subtotal', message: 'subtotal zerado' }]);
});

test('palavra-chave não suportada no schema lança', () => {
    assert.throws(() => checkSchema({ type: 'string', pattern: 'x' }, 'a'), /pattern/);
});

test('CLI: exit 0, 1 e 2', () => {
    assert.equal(run(['--schema=exemplo.create', JSON.stringify(ok)]).code, 0);
    assert.equal(run(['--schema=exemplo.create', '{"externalId":"p"}']).code, 1);
    assert.equal(run(['--schema=nao-existe', '{}']).code, 2);
    assert.equal(run(['--schema=exemplo.create', '{json quebrado']).code, 2);
});

test('CLI: --list-schemas e --json', () => {
    assert.match(run(['--list-schemas']).out, /exemplo\.create/);
    const parsed = JSON.parse(run(['--json', '--schema=exemplo.create', '{"externalId":"p"}']).out);
    assert.equal(parsed.valid, false);
});

test('CLI: --help sai 0 com o uso', () => {
    const result = run(['--help']);
    assert.equal(result.code, 0);
    assert.match(result.out, /--schema=<nome>/);
});

test('CLI: --file inexistente é uso incorreto com mensagem, sem stack', () => {
    const result = run(['--schema=exemplo.create', '--file=nao-existe.json']);
    assert.equal(result.code, 2);
    assert.match(result.out, /não foi possível ler --file=nao-existe\.json \(ENOENT\)/);
    assert.doesNotMatch(result.out, /at readFileSync/);
});

const couponSchemas = join(here, '..', '..', 'skills', 'zoppy-partners-cupons-webhooks', 'assets', 'schemas');
const coupon = { externalId: 'c-1', code: 'C1', type: 'percent', amount: 10, minPurchaseValue: 0, expiryDate: '2026-12-31T23:59:59-03:00', awaitingOrder: false };
/** @type {(r: import('../validate.mjs').ValidationResult) => string[]} */
const phoneWarnings = (r) => r.issues.filter((i) => i.field === 'phone').map((i) => i.message);

test('cupom: celular de 10 dígitos sem o 9 avisa com o telefone do cadastro do cliente', async () => {
    const r = await validate('cupom.create', { ...coupon, phone: '1190007400' }, couponSchemas);
    assert.equal(r.valid, true);
    const [message] = phoneWarnings(r);
    assert.match(message, /celular com 8 dígitos/);
    assert.match(message, /11990007400/);
});

test('cupom: celular com o 9 e fixo de 10 dígitos não avisam', async () => {
    assert.deepEqual(phoneWarnings(await validate('cupom.create', { ...coupon, phone: '11990007400' }, couponSchemas)), []);
    assert.deepEqual(phoneWarnings(await validate('cupom.create', { ...coupon, phone: '1133334444' }, couponSchemas)), []);
});

test('cupom: 55 na frente e celular sem o 9 também avisa', async () => {
    const [message] = phoneWarnings(await validate('cupom.create', { ...coupon, phone: '551190007400' }, couponSchemas));
    assert.match(message, /11990007400/);
});
