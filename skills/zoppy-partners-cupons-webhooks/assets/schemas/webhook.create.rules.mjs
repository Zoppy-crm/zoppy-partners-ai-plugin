// @ts-check
/**
 * @param {{ event: string, url: string, bearerToken?: string } & Record<string, unknown>} payload
 * @returns {import('../../scripts/validate.mjs').Issue[]}
 */
export default function rules(payload) {
    if (typeof payload.url === 'string' && payload.url.length > 255) {
        return [{ level: 'error', field: 'url', message: `url com ${payload.url.length} caracteres: a API grava só os 255 primeiros, sem aviso` }];
    }
    if (payload.bearerToken !== undefined && payload.bearerToken !== '') return [];
    return [{ level: 'warning', field: 'bearerToken', message: 'sem bearerToken o cadastro fica sem token: se já existia um cadastro coupon_create com token, ele é substituído e o token é apagado' }];
}
