#!/usr/bin/env node
// Roda os exemplos das skills contra uma conta da Partners API.
// Use uma conta de teste sem fluxos de mensagem ativos: pedidos e carrinhos disparam os fluxos da conta.
// Contra a URL de produção, só roda com ZOPPY_SMOKE_ALLOW_PRODUCTION=1.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const REQUIRED_ENV = ['ZOPPY_PARTNERS_TOKEN', 'ZOPPY_ACCESS', 'ZOPPY_PARTNERS_BASE_URL'];
const PRODUCTION_HOST = 'api-partners.zoppy.com.br';

function examplesOf(skillDir) {
    const dir = join(skillDir, 'assets', 'examples');
    if (!existsSync(dir)) return [];
    return readdirSync(dir).filter((name) => name.endsWith('.mjs') || name.endsWith('.curl.sh')).sort().map((name) => join(dir, name));
}

function runExample(file) {
    const [command, args] = file.endsWith('.mjs') ? ['node', [file]] : ['bash', [file]];
    return spawnSync(command, args, { encoding: 'utf8', env: process.env, timeout: 120_000 });
}

function selectedSkills(root, only) {
    const skills = join(root, 'skills');
    if (!existsSync(skills)) return [];
    return readdirSync(skills).filter((name) => !only || name === only).sort().map((name) => join(skills, name));
}

function hostOf(url) {
    try {
        return new URL(url).hostname.toLowerCase();
    } catch {
        return '';
    }
}

function isBlockedProduction(env) {
    return hostOf(env.ZOPPY_PARTNERS_BASE_URL) === PRODUCTION_HOST && env.ZOPPY_SMOKE_ALLOW_PRODUCTION !== '1';
}

function main(argv) {
    const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
    if (missing.length) {
        console.error(`Defina as variáveis de ambiente: ${missing.join(', ')}`);
        process.exitCode = 2;
        return;
    }
    if (isBlockedProduction(process.env)) {
        console.error('O smoke cria pedidos e carrinhos que disparam os fluxos da conta. Rode em staging, ou defina ZOPPY_SMOKE_ALLOW_PRODUCTION=1 numa conta de teste sem fluxos de mensagem ativos.');
        process.exitCode = 2;
        return;
    }
    const only = argv.find((arg) => arg.startsWith('--skill='))?.split('=')[1];
    let failures = 0;
    for (const skillDir of selectedSkills(process.cwd(), only)) {
        for (const file of examplesOf(skillDir)) {
            const result = runExample(file);
            const ok = result.status === 0;
            failures += ok ? 0 : 1;
            console.log(`${ok ? 'OK     ' : 'FALHOU '} ${file.replace(`${process.cwd()}/`, '')}`);
            if (!ok) console.log(`${result.stdout}${result.stderr}`.trim().split('\n').map((line) => `    ${line}`).join('\n'));
        }
    }
    console.log(failures ? `${failures} exemplo(s) falharam` : 'smoke OK');
    process.exitCode = failures ? 1 : 0;
}

main(process.argv.slice(2));
