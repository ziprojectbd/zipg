import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('zi-pay-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = localStorage.getItem('zi-pay-refresh');
      if (refreshToken && error.config && !(error.config as any)._retry) {
        (error.config as any)._retry = true;
        try {
          const { data } = await axios.post(`${API_URL}/api/auth/refresh-token`, { refreshToken });
          if (data.success) {
            localStorage.setItem('zi-pay-token', data.data.accessToken);
            localStorage.setItem('zi-pay-refresh', data.data.refreshToken);
            error.config.headers.Authorization = `Bearer ${data.data.accessToken}`;
            return api(error.config);
          }
        } catch {
          localStorage.removeItem('zi-pay-token');
          localStorage.removeItem('zi-pay-refresh');
          window.location.href = '/admin/login';
        }
      }
      if (!(error.config as any)?._retry) {
        localStorage.removeItem('zi-pay-token');
        localStorage.removeItem('zi-pay-refresh');
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  login: (email: string, password: string) => api.post('/api/auth/login', { email, password }),
  refreshToken: (refreshToken: string) => api.post('/api/auth/refresh-token', { refreshToken }),
  logout: (refreshToken?: string) => api.post('/api/auth/logout', { refreshToken }),
  me: () => api.get('/api/auth/me'),
};

export const dashboardApi = {
  overview: () => api.get('/api/admin/dashboard/overview'),
  revenue: (params?: Record<string, string>) => api.get('/api/admin/analytics/revenue', { params }),
  providers: (params?: Record<string, string>) => api.get('/api/admin/analytics/providers', { params }),
  successRate: (params?: Record<string, string>) => api.get('/api/admin/analytics/success-rate', { params }),
};

export const paymentApi = {
  list: (params?: Record<string, string>) => api.get('/api/payments/admin/payments', { params }),
  get: (id: string) => api.get(`/api/payments/admin/payments/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.put(`/api/payments/admin/payments/${id}`, data),
  stats: () => api.get('/api/payments/admin/stats'),
};

export const publicPaymentApi = {
  create: (data: { amount: number; provider: string; trxId: string; customerName?: string; customerPhone?: string; currency?: string; description?: string; merchantName?: string; merchantAccount?: string; orderId?: string; callbackUrl?: string }) =>
    api.post('/api/payments/public/create', data),
  status: (requestId: string) => api.get(`/api/payments/public/status/${requestId}`),
  invoice: (requestId: string) => api.get(`/api/payments/public/request/${requestId}`),
};

export const deviceApi = {
  list: (params?: Record<string, string>) => api.get('/api/admin/devices', { params }),
  get: (deviceId: string) => api.get(`/api/admin/devices/${deviceId}`),
  update: (deviceId: string, data: Record<string, unknown>) => api.put(`/api/admin/devices/${deviceId}`, data),
  delete: (deviceId: string) => api.delete(`/api/admin/devices/${deviceId}`),
  stats: () => api.get('/api/admin/devices/stats'),
};

export const apiKeyApi = {
  list: (params?: Record<string, string>) => api.get('/api/admin/api-keys', { params }),
  create: (data: { name: string; merchantId: string; merchantName: string; permissions?: string[] }) =>
    api.post('/api/admin/api-keys', data),
  get: (id: string) => api.get(`/api/admin/api-keys/${id}`),
  regenerate: (id: string) => api.post(`/api/admin/api-keys/${id}/regenerate`),
  revoke: (id: string) => api.post(`/api/admin/api-keys/${id}/revoke`),
};

export const webhookApi = {
  list: (params?: Record<string, string>) => api.get('/api/webhooks', { params }),
  create: (data: { url: string; events: string[]; secret?: string }) => api.post('/api/webhooks', data),
  get: (id: string) => api.get(`/api/webhooks/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.put(`/api/webhooks/${id}`, data),
  delete: (id: string) => api.delete(`/api/webhooks/${id}`),
  deliveries: (id: string, params?: Record<string, string>) => api.get(`/api/webhooks/${id}/deliveries`, { params }),
};

export const settingsApi = {
  getPay: () => api.get('/api/admin/settings/pay'),
  updatePay: (data: Record<string, unknown>) => api.put('/api/admin/settings/pay', data),
  getSystem: () => api.get('/api/admin/settings/system'),
  updateSystem: (data: Record<string, unknown>) => api.put('/api/admin/settings/system', data),
  getPublicPay: () => api.get('/api/public/pay-settings'),
};

export const userApi = {
  list: (params?: Record<string, string>) => api.get('/api/admin/users', { params }),
  create: (data: { email: string; password: string; name: string; role: string }) =>
    api.post('/api/admin/users', data),
  get: (id: string) => api.get(`/api/admin/users/${id}`),
  update: (id: string, data: Record<string, unknown>) => api.put(`/api/admin/users/${id}`, data),
  delete: (id: string) => api.delete(`/api/admin/users/${id}`),
};

export const paymentMethodApi = {
  list: () => api.get('/api/admin/payment-methods'),
  update: (code: string, data: Record<string, unknown>) => api.put(`/api/admin/payment-methods/${code}`, data),
};

export const activityLogApi = {
  list: (params?: Record<string, string>) => api.get('/api/admin/activity-logs', { params }),
};
