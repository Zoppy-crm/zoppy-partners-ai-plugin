import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { lintSkill } from '../build.mjs';

const toolsDir = join(dirname(fileURLToPath(import.meta.url)), '..');

function makeSkill(root, name, frontmatter, body = 'Corpo.') {
    const dir = join(root, 'skills', name);
    mkdirSync(join(dir, 'assets', 'schemas'), { recursive: true });
    writeFileSync(join(dir, 'SKILL.md'), `---\n${frontmatter}\n---\n\n${body}\n`);
    return dir;
}

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
    makeSkill(root, 'zoppy-partners-x', 'name: zoppy-partners-x\ndescription: d');
    execFileSync('node', [join(root, 'tools', 'build.mjs')], { cwd: root });
    const copy = join(root, 'skills', 'zoppy-partners-x', 'scripts', 'validate.mjs');
    writeFileSync(copy, `${readFileSync(copy, 'utf8')}\n// editado`);
    assert.throws(() => execFileSync('node', [join(root, 'tools', 'build.mjs'), '--check'], { cwd: root, stdio: 'pipe' }));
});
