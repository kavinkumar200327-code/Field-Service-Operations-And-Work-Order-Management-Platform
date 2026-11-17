import api from './axios';

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: (refreshToken) => api.post('/auth/logout', { refresh_token: refreshToken }),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/me', data),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const customersApi = {
  list: (params) => api.get('/customers', { params }),
  get: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.patch(`/customers/${id}`, data),
  getServiceHistory: (id) => api.get(`/customers/${id}/service-history`),
};

export const techniciansApi = {
  list: (params) => api.get('/technicians', { params }),
  get: (id) => api.get(`/technicians/${id}`),
  create: (data) => api.post('/technicians', data),
  update: (id, data) => api.patch(`/technicians/${id}`, data),
  getAvailability: (id) => api.get(`/technicians/${id}/availability`),
  addAvailability: (id, data) => api.post(`/technicians/${id}/availability`, data),
  getWorkOrders: (id, params) => api.get(`/technicians/${id}/work-orders`, { params }),
};

export const servicesApi = {
  list: (params) => api.get('/services', { params }),
  get: (id) => api.get(`/services/${id}`),
  create: (data) => api.post('/services', data),
  update: (id, data) => api.patch(`/services/${id}`, data),
  delete: (id) => api.delete(`/services/${id}`),
  listCategories: () => api.get('/services/categories'),
  createCategory: (data) => api.post('/services/categories', data),
};

export const serviceRequestsApi = {
  list: (params) => api.get('/service-requests', { params }),
  get: (id) => api.get(`/service-requests/${id}`),
  create: (data) => api.post('/service-requests', data),
  update: (id, data) => api.patch(`/service-requests/${id}`, data),
  cancel: (id, data) => api.post(`/service-requests/${id}/cancel`, data),
  convertToWorkOrder: (id, data) => api.post(`/service-requests/${id}/convert-to-work-order`, data),
};

export const workOrdersApi = {
  list: (params) => api.get('/work-orders', { params }),
  get: (id) => api.get(`/work-orders/${id}`),
  create: (data) => api.post('/work-orders', data),
  update: (id, data) => api.patch(`/work-orders/${id}`, data),
  cancel: (id, data) => api.post(`/work-orders/${id}/cancel`, data),
  assign: (id, data) => api.post(`/work-orders/${id}/assign`, data),
  reschedule: (id, data) => api.post(`/work-orders/${id}/reschedule`, data),
  start: (id) => api.post(`/work-orders/${id}/start`),
  hold: (id, data) => api.post(`/work-orders/${id}/hold`, data),
  resume: (id) => api.post(`/work-orders/${id}/resume`),
  complete: (id, data) => api.post(`/work-orders/${id}/complete`, data),
};

export const scheduleApi = {
  getSchedule: (params) => api.get('/schedule', { params }),
  getAvailability: (params) => api.get('/schedule/availability', { params }),
  getDispatchBoard: (params) => api.get('/dispatch/board', { params }),
};

export const partsApi = {
  list: (params) => api.get('/parts', { params }),
  get: (id) => api.get(`/parts/${id}`),
  create: (data) => api.post('/parts', data),
  update: (id, data) => api.patch(`/parts/${id}`, data),
  recordWorkOrderPart: (woId, data) => api.post(`/work-orders/${woId}/parts`, data),
  getWorkOrderParts: (woId) => api.get(`/work-orders/${woId}/parts`),
  returnWorkOrderPart: (woId, partId, data) => api.post(`/work-orders/${woId}/parts/${partId}/return`, data),
};

export const serviceReportsApi = {
  create: (woId, data) => api.post(`/work-orders/${woId}/reports`, data),
  getByWorkOrder: (woId) => api.get(`/work-orders/${woId}/reports`),
  getById: (id) => api.get(`/reports/${id}`),
  downloadPdf: (id) => api.get(`/reports/${id}/download`, { responseType: 'blob' }),
  uploadAttachment: (id, formData) => api.post(`/reports/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export const feedbackApi = {
  submit: (woId, data) => api.post(`/work-orders/${woId}/feedback`, data),
  getByWorkOrder: (woId) => api.get(`/work-orders/${woId}/feedback`),
  listAll: (params) => api.get('/feedback', { params }),
};

export const notificationsApi = {
  list: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
};

export const analyticsApi = {
  getOperationsDashboard: () => api.get('/dashboards/operations'),
  getDispatcherDashboard: () => api.get('/dashboards/dispatcher'),
  getTechnicianDashboard: () => api.get('/dashboards/technician'),
  getCustomerDashboard: () => api.get('/dashboards/customer'),
  getWorkOrdersReport: (params) => api.get('/reports/work-orders', { params }),
  getTechnicianPerformanceReport: (params) => api.get('/reports/technician-performance', { params }),
  getPartsConsumptionReport: (params) => api.get('/reports/parts-consumption', { params }),
  getOperationalCostsReport: () => api.get('/reports/operational-costs'),
  exportWorkOrdersCsv: (params) => api.get('/reports/work-orders', { params: { ...params, format: 'csv' }, responseType: 'blob' }),
  exportTechnicianPerformanceCsv: () => api.get('/reports/technician-performance', { params: { format: 'csv' }, responseType: 'blob' }),
  exportPartsConsumptionCsv: () => api.get('/reports/parts-consumption', { params: { format: 'csv' }, responseType: 'blob' }),
};
