import { orderRules } from './pedido-regras.mjs';

export default function rules(payload) {
    return orderRules(payload, 'create');
}
