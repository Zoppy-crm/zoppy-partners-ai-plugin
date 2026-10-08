#!/usr/bin/env node
// GERADO por tools/build.mjs a partir de tools/validate.mjs. Não edite este arquivo.
// @ts-check
// Validador de payloads da Partners API da Zoppy. Sem dependências, Node 18+.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEFAULT_SCHEMAS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'schemas');
const SUPPORTED = new Set(['type', 'required', 'properties', 'additionalProperties', 'enum', 'items', 'minimum', 'minLength', 'format', 'description']);
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @typedef {'error' | 'warning'} IssueLevel
 * @typedef {{ level: IssueLevel, field: string, message: string }} Issue
 * @typedef {{ valid: boolean, issues: Issue[] }} ValidationResult
 * @typedef {(payload: unknown) => Issue[]} Rules
 */

/**
 * Schema lido do JSON: palavra-chave fora da lista abaixo é recusada por assertSupported.
 * @typedef {{
 *     type?: string | string[],
 *     required?: string[],
 *     properties?: Record<string, Schema>,
 *     additionalProperties?: boolean,
 *     enum?: unknown[],
 *     items?: Schema,
 *     minimum?: number,
 *     minLength?: number,
 *     format?: string,
 *     description?: string,
 *     [keyword: string]: unknown
 * }} Schema
 */

/**
 * @typedef {object} CliArgs
 * @property {boolean} json
 * @property {boolean} list
 * @property {string[]} positional
 * @property {string} [schema]
 * @property {string} [file]
 * @property {string} [schemasDir]
 * @property {boolean} [help]
 */

export class UsageError extends Error {}

/**
 * @param {unknown} value
 * @returns {string}
 */
function typeOf(value) {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

/**
 * @param {string} expected
 * @param {unknown} value
 * @returns {boolean}
 */
function matchesType(expected, value) {
    const actual = typeOf(value);
    if (expected === 'integer') return Number.isInteger(value);
    return expected === actual;
}

/**
 * @param {string} field
 * @param {string} message
 * @returns {Issue}
 */
function error(field, message) {
    return { level: 'error', field, message };
}

/** @param {Schema} schema */
function assertSupported(schema) {
    const unknown = Object.keys(schema).filter((key) => !SUPPORTED.has(key));
    if (unknown.length) throw new UsageError(`schema usa palavra-chave não suportada: ${unknown.join(', ')}`);
}

/**
 * @param {Schema} schema
 * @param {unknown} value
 * @param {string} path
 * @returns {Issue[]}
 */
function checkType(schema, value, path) {
    if (!schema.type) return [];
    const types = /** @type {string[]} */ ([]).concat(schema.type);
    if (types.some((type) => matchesType(type, value))) return [];
    return [error(path, `esperado ${types.join(' ou ')}, recebido ${typeOf(value)} (${JSON.stringify(value)})`)];
}

/**
 * @param {Schema} schema
 * @param {unknown} value
 * @param {string} path
 * @returns {Issue[]}
 */
function checkScalar(schema, value, path) {
    /** @type {Issue[]} */
    const issues = [];
    if (schema.enum && !schema.enum.includes(value)) issues.push(error(path, `valor ${JSON.stringify(value)} fora de: ${schema.enum.join(', ')}`));
    if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) issues.push(error(path, `mínimo ${schema.minimum}, recebido ${value}`));
    if (typeof value === 'string' && schema.minLength !== undefined && value.length < schema.minLength) issues.push(error(path, `mínimo de ${schema.minLength} caractere(s)`));
    if (typeof value === 'string' && schema.format === 'date-time' && !DATE_TIME.test(value)) issues.push(error(path, `data deve ser ISO 8601 com fuso, ex. 2026-09-05T10:26:00-03:00; recebido ${value}`));
    if (typeof value === 'string' && schema.format === 'email' && !EMAIL.test(value)) issues.push(error(path, `e-mail inválido: ${value}`));
    return issues;
}

/**
 * @param {Schema} schema
 * @param {Record<string, unknown>} value
 * @param {string} path
 * @returns {Issue[]}
 */
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

/**
 * @param {Schema} schema
 * @param {unknown[]} value
 * @param {string} path
 * @returns {Issue[]}
 */
function checkArray(schema, value, path) {
    const items = schema.items;
    if (!items) return [];
    return value.flatMap((item, index) => checkSchema(items, item, `${path}[${index}]`));
}

/**
 * @param {Schema} schema
 * @param {unknown} value
 * @param {string} [path]
 * @returns {Issue[]}
 */
export function checkSchema(schema, value, path = '') {
    assertSupported(schema);
    const typeIssues = checkType(schema, value, path);
    if (typeIssues.length) return typeIssues;
    if (typeOf(value) === 'object') return checkObject(schema, /** @type {Record<string, unknown>} */ (value), path);
    if (typeOf(value) === 'array') return checkArray(schema, /** @type {unknown[]} */ (value), path);
    return checkScalar(schema, value, path);
}

/**
 * @param {string} schemaName
 * @param {string} schemasDir
 * @returns {Schema}
 */
function loadSchema(schemaName, schemasDir) {
    const file = join(schemasDir, `${schemaName}.json`);
    if (!existsSync(file)) throw new UsageError(`schema "${schemaName}" não existe; use --list-schemas`);
    return JSON.parse(readFileSync(file, 'utf8'));
}

/**
 * @param {string} schemaName
 * @param {unknown} payload
 * @param {string} schemasDir
 * @returns {Promise<Issue[]>}
 */
async function runRules(schemaName, payload, schemasDir) {
    const file = join(schemasDir, `${schemaName}.rules.mjs`);
    if (!existsSync(file)) return [];
    /** @type {{ default: Rules }} */
    const { default: rules } = await import(pathToFileURL(file).href);
    return rules(payload);
}

/**
 * @param {string} schemaName
 * @param {unknown} payload
 * @param {string} [schemasDir]
 * @returns {Promise<ValidationResult>}
 */
export async function validate(schemaName, payload, schemasDir = DEFAULT_SCHEMAS_DIR) {
    const issues = checkSchema(loadSchema(schemaName, schemasDir), payload);
    if (!issues.length) issues.push(...(await runRules(schemaName, payload, schemasDir)));
    return { valid: !issues.some((issue) => issue.level === 'error'), issues };
}

/**
 * @param {string} schemasDir
 * @returns {string[]}
 */
function listSchemas(schemasDir) {
    return readdirSync(schemasDir).filter((name) => name.endsWith('.json')).map((name) => name.slice(0, -5));
}

/**
 * @param {string[]} argv
 * @returns {CliArgs}
 */
function parseArgs(argv) {
    /** @type {CliArgs} */
    const args = { json: false, list: false, positional: [] };
    for (const arg of argv) {
        const [key, value] = arg.split(/=(.*)/s);
        if (key === '--schema') args.schema = value;
        else if (key === '--file') args.file = value;
        else if (key === '--schemas-dir') args.schemasDir = value;
        else if (key === '--json') args.json = true;
        else if (key === '--list-schemas') args.list = true;
        else if (key === '--help' || key === '-h') args.help = true;
        else args.positional.push(arg);
    }
    return args;
}

/**
 * @param {string} path
 * @returns {string}
 */
function readPayloadFile(path) {
    try {
        return readFileSync(path, 'utf8');
    } catch (cause) {
        const failure = /** @type {NodeJS.ErrnoException} */ (cause);
        throw new UsageError(`não foi possível ler --file=${path} (${failure.code ?? failure.message}); o caminho é relativo à pasta onde você roda o comando`);
    }
}

/**
 * @param {CliArgs} args
 * @returns {unknown}
 */
function readPayload(args) {
    const raw = args.file ? readPayloadFile(args.file) : args.positional[0];
    if (!raw) throw new UsageError('informe o payload como argumento ou --file=<caminho>');
    try {
        return JSON.parse(raw);
    } catch (cause) {
        throw new UsageError(`payload não é JSON válido: ${/** @type {SyntaxError} */ (cause).message}`);
    }
}

/**
 * @param {ValidationResult} result
 * @param {boolean} asJson
 * @returns {void}
 */
function print(result, asJson) {
    if (asJson) return console.log(JSON.stringify(result, null, 2));
    if (!result.issues.length) return console.log('OK: payload válido');
    for (const issue of result.issues) console.log(`${issue.level === 'error' ? 'ERRO' : 'AVISO'} ${issue.field || '(raiz)'}: ${issue.message}`);
}

const USAGE = `uso: node scripts/validate.mjs --schema=<nome> '<json>'
     node scripts/validate.mjs --schema=<nome> --file=<caminho.json>
     node scripts/validate.mjs --list-schemas

Confere um payload da Partners API contra o schema desta skill antes do envio.
  --schema=<nome>   payload a conferir (veja --list-schemas)
  --file=<caminho>  lê o payload de um arquivo em vez do argumento
  --json            devolve o resultado em JSON
  --list-schemas    lista os schemas desta skill
  --help            mostra esta ajuda

Saída: 0 sem ERRO (pode ter AVISO), 1 com ERRO, 2 uso incorreto.`;

/**
 * @param {string[]} argv
 * @returns {Promise<void>}
 */
async function main(argv) {
    const args = parseArgs(argv);
    const schemasDir = args.schemasDir ?? DEFAULT_SCHEMAS_DIR;
    if (args.help) return console.log(USAGE);
    if (args.list) return console.log(listSchemas(schemasDir).join('\n'));
    if (!args.schema) throw new UsageError('informe --schema=<nome>; rode com --help para ver o uso');
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
