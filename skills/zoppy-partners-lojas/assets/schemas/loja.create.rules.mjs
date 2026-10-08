import { storeRules } from './loja-regras.mjs';

export default function rules(payload) {
    return storeRules(payload, 'create');
}
