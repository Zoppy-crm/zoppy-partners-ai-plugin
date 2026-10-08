// @ts-check
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { lintSkill } from '../build.mjs';

const toolsDir = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string} root
 * @param {string} name
 * @param {string} frontmatter
 * @param {string} [body]
 * @returns {string}
 */
function makeSkill(root, name, frontmatter, body = 'Corpo.') {
    const dir = join(root, 'skills', name);
    mkdirSync(join(dir, 'assets', 'schemas'), { recursive: true });
    writeFileSync(join(dir, 'SKILL.md'), `---\n${frontmatter}\n---\n\n${body}\n`);
    return dir;
}

/** @returns {string} */
function makeRepo() {
    const root = mkdtempSync(join(tmpdir(), 'zp-'));
    cpSync(toolsDir, join(root, 'tools'), { recursive: true });
    return root;
}

test('skill válida não tem problemas', () => {
    const root = makeRepo();
    const dir = makeSkill(root, 'zoppy-partners-x', 'name: zoppy-partners-x\ndescription: Faz X. Use quando ... Não use para Y.');
    assert.deepEqual(lintSkill(dir), []);
});

test('name diferente da pasta, campo não portável e travessão', () => {
    const root = makeRepo();
    const dir = makeSkill(root, 'zoppy-partners-x', 'name: outra\ndescription: d\nwhen_to_use: x', 'texto — com travessão');
    const problems = lintSkill(dir).join('\n');
    assert.match(problems, /name/);
    assert.match(problems, /when_to_use/);
    assert.match(problems, /travessão/);
});

test('description sem aspas com ": " é YAML inválido e é barrada; entre aspas passa', () => {
    const root = makeRepo();
    const broken = makeSkill(root, 'zoppy-partners-x', 'name: zoppy-partners-x\ndescription: Faz X. Gatilhos: pedido, frete.');
    assert.match(lintSkill(broken).join('\n'), /YAML inválido/);
    const quoted = makeSkill(root, 'zoppy-partners-y', 'name: zoppy-partners-y\ndescription: "Faz Y. Gatilhos: pedido, frete."');
    assert.deepEqual(lintSkill(quoted), []);
});

test('token JWT em exemplo é barrado', () => {
    const root = makeRepo();
    const dir = makeSkill(root, 'zoppy-partners-x', 'name: zoppy-partners-x\ndescription: d');
    mkdirSync(join(dir, 'assets', 'examples'), { recursive: true });
    writeFileSync(join(dir, 'assets', 'examples', 'a.curl.sh'), 'curl -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6"');
    assert.match(lintSkill(dir).join('\n'), /segredo/);
});

test('build copia o validador e a cópia roda sozinha fora do repo', () => {
    const root = makeRepo();
    const dir = makeSkill(root, 'zoppy-partners-x', 'name: zoppy-partners-x\ndescription: d');
    writeFileSync(join(dir, 'assets', 'schemas', 'a.json'), '{"type":"object","required":["id"]}');
    execFileSync('node', [join(root, 'tools', 'build.mjs')], { cwd: root });
    const standalone = mkdtempSync(join(tmpdir(), 'agents-skills-'));
    cpSync(dir, join(standalone, 'zoppy-partners-x'), { recursive: true });
    const out = execFileSync('node', [join(standalone, 'zoppy-partners-x', 'scripts', 'validate.mjs'), '--schema=a', '{"id":1}'], { encoding: 'utf8' });
    assert.match(out, /OK/);
});

test('--check falha quando a cópia foi editada à mão', () => {
    const root = makeRepo();
    const dir = makeSkill(root, 'zoppy-partners-x', 'name: zoppy-partners-x\ndescription: d');
    writeFileSync(join(dir, 'assets', 'schemas', 'a.json'), '{"type":"object"}');
    execFileSync('node', [join(root, 'tools', 'build.mjs')], { cwd: root });
    const copy = join(root, 'skills', 'zoppy-partners-x', 'scripts', 'validate.mjs');
    writeFileSync(copy, `${readFileSync(copy, 'utf8')}\n// editado`);
    assert.throws(() => execFileSync('node', [join(root, 'tools', 'build.mjs'), '--check'], { cwd: root, stdio: 'pipe' }));
});

test('skill sem schemas não recebe validador e cópia antiga é removida', () => {
    const root = makeRepo();
    const dir = join(root, 'skills', 'zoppy-partners-x');
    mkdirSync(join(dir, 'scripts'), { recursive: true });
    writeFileSync(join(dir, 'SKILL.md'), '---\nname: zoppy-partners-x\ndescription: d\n---\n\nCorpo.\n');
    writeFileSync(join(dir, 'scripts', 'validate.mjs'), '// antigo');
    assert.throws(() => execFileSync('node', [join(root, 'tools', 'build.mjs'), '--check'], { cwd: root, stdio: 'pipe' }));
    execFileSync('node', [join(root, 'tools', 'build.mjs')], { cwd: root });
    assert.equal(existsSync(join(dir, 'scripts', 'validate.mjs')), false);
    execFileSync('node', [join(root, 'tools', 'build.mjs'), '--check'], { cwd: root });
});
