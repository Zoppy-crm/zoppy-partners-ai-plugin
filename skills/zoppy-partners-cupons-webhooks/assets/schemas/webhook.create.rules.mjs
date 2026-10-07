export default function rules(payload) {
    if (payload.bearerToken !== undefined && payload.bearerToken !== '') return [];
    return [{ level: 'warning', field: 'bearerToken', message: 'sem bearerToken o cadastro fica sem token: se já existia um cadastro coupon_create com token, ele é substituído e o token é apagado' }];
}
