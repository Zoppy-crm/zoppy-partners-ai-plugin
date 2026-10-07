#!/usr/bin/env node
// Validador de payloads da Partners API da Zoppy. Sem dependências, Node 18+.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_SCHEMAS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'schemas');
const SUPPORTED = new Set(['type', 'required', 'properties', 'additionalProperties', 'enum', 'items', 'minimum', 'minLength', 'format', 'description']);
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class UsageError extends Error {}

function typeOf(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

function matchesType(expected, value) {
    const actual = typeOf(value);
    if (expected === 'integer') return Number.isInteger(value);
    return expected === actual;
}

function error(field, message) {
    return { level: 'error', field, message };
}

function assertSupported(schema) {
    const unknown = Object.keys(schema).filter((key) => !SUPPORTED.has(key));
    if (unknown.length) throw new UsageError(`schema usa palavra-chave não suportada: ${unknown.join(', ')}`);
}

function checkType(schema, value, path) {
    if (!schema.type) return [];
    const types = [].concat(schema.type);
    if (types.some((type) => matchesType(type, value))) return [];
    return [error(path, `esperado ${types.join(' ou ')}, recebido ${typeOf(value)} (${JSON.stringify(value)})`)];
}

function checkScalar(schema, value, path) {
    const issues = [];
    if (schema.enum && !schema.enum.includes(value)) issues.push(error(path, `valor ${JSON.stringify(value)} fora de: ${schema.enum.join(', ')}`));
    if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) issues.push(error(path, `mínimo ${schema.minimum}, recebido ${value}`));
    if (typeof value === 'string' && schema.minLength !== undefined && value.length < schema.minLength) issues.push(error(path, `mínimo de ${schema.minLength} caractere(s)`));
    if (typeof value === 'string' && schema.format === 'date-time' && !DATE_TIME.test(value)) issues.push(error(path, `data deve ser ISO 8601 com fuso, ex. 2026-09-05T10:26:00-03:00; recebido ${value}`));
    if (typeof value === 'string' && schema.format === 'email' && !EMAIL.test(value)) issues.push(error(path, `e-mail inválido: ${value}`));
    return issues;
}

function checkObject(schema, value, path) {
    const prefix = path ? `${path}.` : '';
    const properties = schema.properties ?? {};
    const issues = (schema.required ?? []).filter((key) => value[key] === undefined).map((key) => error(`${prefix}${key}`, 'campo obrigatório ausente'));
    for (const [key, child] of Object.entries(value)) {
        if (properties[key]) issues.push(...checkSchema(properties[key], child, `${prefix}${key}`));
        else if (schema.additionalProperties === false) issues.push(error(`${prefix}${key}`, 'campo não aceito pela API'));
    }
    return issues;
}

function checkArray(schema, value, path) {
    if (!schema.items) return [];
    return value.flatMap((item, index) => checkSchema(schema.items, item, `${path}[${index}]`));
}

export function checkSchema(schema, value, path = '') {
    assertSupported(schema);
    const typeIssues = checkType(schema, value, path);
    if (typeIssues.length) return typeIssues;
    if (typeOf(value) === 'object') return checkObject(schema, value, path);
    if (typeOf(value) === 'array') return checkArray(schema, value, path);
    return checkScalar(schema, value, path);
}

function loadSchema(schemaName, schemasDir) {
    const file = join(schemasDir, `${schemaName}.json`);
    if (!existsSync(file)) throw new UsageError(`schema "${schemaName}" não existe; use --list-schemas`);
    return JSON.parse(readFileSync(file, 'utf8'));
}

async function runRules(schemaName, payload, schemasDir) {
    const file = join(schemasDir, `${schemaName}.rules.mjs`);
    if (!existsSync(file)) return [];
    const { default: rules } = await import(pathToFileURL(file).href);
    return rules(payload);
}

export async function validate(schemaName, payload, schemasDir = DEFAULT_SCHEMAS_DIR) {
    const issues = checkSchema(loadSchema(schemaName, schemasDir), payload);
    if (!issues.length) issues.push(...(await runRules(schemaName, payload, schemasDir)));
    return { valid: !issues.some((issue) => issue.level === 'error'), issues };
}

function listSchemas(schemasDir) {
    return readdirSync(schemasDir).filter((name) => name.endsWith('.json')).map((name) => name.slice(0, -5));
}

function parseArgs(argv) {
    const args = { json: false, list: false, positional: [] };
    for (const arg of argv) {
        const [key, value] = arg.split(/=(.*)/s);
        if (key === '--schema') args.schema = value;
        else if (key === '--file') args.file = value;
        else if (key === '--schemas-dir') args.schemasDir = value;
        else if (key === '--json') args.json = true;
        else if (key === '--list-schemas') args.list = true;
        else args.positional.push(arg);
    }
    return args;
}

function readPayload(args) {
    const raw = args.file ? readFileSync(args.file, 'utf8') : args.positional[0];
    if (!raw) throw new UsageError('informe o payload como argumento ou --file=<caminho>');
    try {
        return JSON.parse(raw);
    } catch (cause) {
        throw new UsageError(`payload não é JSON válido: ${cause.message}`);
    }
}

function print(result, asJson) {
    if (asJson) return console.log(JSON.stringify(result, null, 2));
    if (!result.issues.length) return console.log('OK: payload válido');
    for (const issue of result.issues) console.log(`${issue.level === 'error' ? 'ERRO' : 'AVISO'} ${issue.field || '(raiz)'}: ${issue.message}`);
}

async function main(argv) {
    const args = parseArgs(argv);
    const schemasDir = args.schemasDir ?? DEFAULT_SCHEMAS_DIR;
    if (args.list) return console.log(listSchemas(schemasDir).join('\n'));
    if (!args.schema) throw new UsageError('uso: validate.mjs --schema=<nome> \'<json>\' | --file=<caminho> | --list-schemas [--json]');
    const result = await validate(args.schema, readPayload(args), schemasDir);
    print(result, args.json);
    process.exitCode = result.valid ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    main(process.argv.slice(2)).catch((cause) => {
        console.error(cause instanceof UsageError ? `uso incorreto: ${cause.message}` : cause);
        process.exitCode = 2;
    });
}
