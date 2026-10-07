import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const smoke = join(dirname(fileURLToPath(import.meta.url)), '..', 'smoke.mjs');
const env = { ...process.env, ZOPPY_PARTNERS_TOKEN: 't', ZOPPY_ACCESS: 'a', ZOPPY_PARTNERS_BASE_URL: 'http://x' };

function repoWith(files) {
    const root = mkdtempSync(join(tmpdir(), 'smoke-'));
    for (const [path, content] of Object.entries(files)) {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), content);
    }
    return root;
}

test('variável faltando falha antes de rodar qualquer exemplo', () => {
    const root = repoWith({ 'skills/a/assets/examples/01-x.mjs': 'process.exit(0)' });
    const r = spawnSync('node', [smoke], { cwd: root, env: { PATH: process.env.PATH }, encoding: 'utf8' });
    assert.equal(r.status, 2);
    assert.match(r.stderr, /ZOPPY_PARTNERS_TOKEN/);
});

test('todos ok sai 0; um falhando sai 1 e mostra o erro', () => {
    const ok = repoWith({ 'skills/a/assets/examples/01-x.mjs': 'console.log("{}")', 'skills/a/assets/examples/02-y.curl.sh': 'exit 0' });
    assert.equal(spawnSync('node', [smoke], { cwd: ok, env, encoding: 'utf8' }).status, 0);
    const bad = repoWith({ 'skills/a/assets/examples/01-x.mjs': 'throw new Error("total veio -24")' });
    const r = spawnSync('node', [smoke], { cwd: bad, env, encoding: 'utf8' });
    assert.equal(r.status, 1);
    assert.match(r.stdout + r.stderr, /total veio -24/);
});

test('--skill filtra', () => {
    const root = repoWith({ 'skills/a/assets/examples/01.mjs': 'throw new Error("a")', 'skills/b/assets/examples/01.mjs': '' });
    assert.equal(spawnSync('node', [smoke, '--skill=b'], { cwd: root, env, encoding: 'utf8' }).status, 0);
});
