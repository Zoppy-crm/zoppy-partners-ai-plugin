#!/usr/bin/env node
// Gera scripts/validate.mjs de cada skill e confere o formato das skills.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const TOOLS_DIR = dirname(fileURLToPath(import.meta.url));
const ALLOWED_KEYS = new Set(['name', 'description', 'compatibility', 'metadata']);
const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const JWT = /eyJ[A-Za-z0-9_-]{20,}/;
const DASHES = /[—–]/;
const GENERATED_HEADER = '#!/usr/bin/env node\n// GERADO por tools/build.mjs a partir de tools/validate.mjs. Não edite este arquivo.\n';

export function generatedValidator() {
    const source = readFileSync(join(TOOLS_DIR, 'validate.mjs'), 'utf8');
    return GENERATED_HEADER + source.replace(/^#!.*\n/, '');
}

function parseFrontmatter(text) {
    const match = text.match(/^---\n([\s\S]*?)\n---\n/);
    if (!match) return null;
    const keys = {};
    let current = null;
    for (const line of match[1].split('\n')) {
        const top = line.match(/^([A-Za-z_][\w-]*):\s?(.*)$/);
        if (top) {
            current = top[1];
            keys[current] = top[2];
        } else if (current && /^\s+/.test(line)) {
            keys[current] = `${keys[current]} ${line.trim()}`.trim();
        }
    }
    return keys;
}

function cleanScalar(value) {
    return value.replace(/^[>|]-?\s*/, '').replace(/^['"]|['"]$/g, '').trim();
}

function filesUnder(dir) {
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const path = join(dir, entry.name);
        return entry.isDirectory() ? filesUnder(path) : [path];
    });
}

function lintFrontmatter(dir, keys) {
    if (!keys) return ['SKILL.md sem frontmatter'];
    const problems = Object.keys(keys).filter((key) => !ALLOWED_KEYS.has(key)).map((key) => `campo "${key}" não é do padrão aberto (use só name, description, compatibility, metadata)`);
    const name = cleanScalar(keys.name ?? '');
    const description = cleanScalar(keys.description ?? '');
    if (name !== basename(dir)) problems.push(`name "${name}" diferente da pasta "${basename(dir)}"`);
    if (!NAME.test(name) || name.length > 64) problems.push(`name "${name}" fora do padrão (minúsculas, números e hífen, até 64)`);
    if (/claude|anthropic/.test(name)) problems.push('name não pode conter claude/anthropic');
    if (description.length < 1 || description.length > 1024) problems.push(`description com ${description.length} caracteres (1 a 1024)`);
    return problems;
}

function lintText(dir) {
    const problems = [];
    const skillLines = readFileSync(join(dir, 'SKILL.md'), 'utf8').split('\n').length;
    if (skillLines >= 500) problems.push(`SKILL.md com ${skillLines} linhas (limite 499)`);
    const prose = [join(dir, 'SKILL.md'), ...filesUnder(join(dir, 'references'))];
    for (const file of prose) {
        const text = readFileSync(file, 'utf8');
        if (DASHES.test(text)) problems.push(`${basename(file)}: travessão encontrado`);
        const lines = text.split('\n');
        if (file.includes('references') && lines.length > 100 && !lines.slice(0, 10).some((line) => /^## Sumário/.test(line))) problems.push(`${basename(file)}: mais de 100 linhas sem "## Sumário" no topo`);
    }
    return problems;
}

function lintSecrets(dir) {
    const access = process.env.ZOPPY_ACCESS;
    return filesUnder(dir)
        .filter((file) => {
            const text = readFileSync(file, 'utf8');
            return JWT.test(text) || (access && text.includes(access));
        })
        .map((file) => `${basename(file)}: possível segredo versionado`);
}

function lintScripts(dir) {
    const scripts = [...filesUnder(join(dir, 'assets', 'examples')), ...filesUnder(join(dir, 'scripts'))].filter((file) => file.endsWith('.mjs'));
    return scripts.flatMap((file) => {
        try {
            execFileSync('node', ['--check', file], { stdio: 'pipe' });
            return [];
        } catch (cause) {
            return [`${basename(file)}: não compila (${String(cause.stderr).split('\n')[0]})`];
        }
    });
}

export function lintSkill(dir) {
    const skillFile = join(dir, 'SKILL.md');
    if (!existsSync(skillFile)) return ['SKILL.md ausente'];
    return [...lintFrontmatter(dir, parseFrontmatter(readFileSync(skillFile, 'utf8'))), ...lintText(dir), ...lintSecrets(dir), ...lintScripts(dir)];
}

function skillDirs(root) {
    const skills = join(root, 'skills');
    if (!existsSync(skills)) return [];
    return readdirSync(skills, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => join(skills, entry.name));
}

function hasSchemas(dir) {
    const schemas = join(dir, 'assets', 'schemas');
    return existsSync(schemas) && readdirSync(schemas).some((name) => name.endsWith('.json'));
}

function removeValidator(dir, check) {
    const target = join(dir, 'scripts', 'validate.mjs');
    if (!existsSync(target)) return [];
    if (check) return ['scripts/validate.mjs existe sem assets/schemas; rode npm run build'];
    rmSync(target);
    if (!readdirSync(dirname(target)).length) rmSync(dirname(target), { recursive: true });
    return [];
}

function syncValidator(dir, check) {
    if (!hasSchemas(dir)) return removeValidator(dir, check);
    const target = join(dir, 'scripts', 'validate.mjs');
    const expected = generatedValidator();
    if (check) return existsSync(target) && readFileSync(target, 'utf8') === expected ? [] : ['scripts/validate.mjs desatualizado; rode npm run build'];
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, expected, { mode: 0o755 });
    return [];
}

function main(argv) {
    const check = argv.includes('--check');
    const root = process.cwd();
    let failed = false;
    for (const dir of skillDirs(root)) {
        const problems = [...syncValidator(dir, check), ...lintSkill(dir)];
        for (const problem of problems) console.error(`${basename(dir)}: ${problem}`);
        failed ||= problems.length > 0;
    }
    if (failed) process.exitCode = 1;
    else console.log(check ? 'check OK' : 'build OK');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2));
