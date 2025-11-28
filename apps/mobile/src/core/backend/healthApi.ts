import { api } from '@core/http/httpClient';

export async function pingApi(): Promise<void> {
  try {
    const r = await api.get('/healthz');
    console.log('API /healthz ->', r.status, r.data);
  } catch (e) {
    console.log('API ping failed', e);
  }
}
