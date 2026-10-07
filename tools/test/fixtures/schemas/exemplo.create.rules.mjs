export default function rules(payload) {
    if (payload.subtotal === 0) return [{ level: 'warning', field: 'subtotal', message: 'subtotal zerado' }];
    return [];
}
