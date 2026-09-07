import api from './axios';

// GET /api/admin/dashboard
export const getDashboard = () => api.get('/admin/dashboard');

// GET /api/admin/users
export const getUsers = () => api.get('/admin/users');

// POST /api/admin/users
export const createUser = (data) => api.post('/admin/users', data);

// PUT /api/admin/users/:id
export const updateUser = (id, data) => api.put(`/admin/users/${id}`, data);

// PATCH /api/admin/users/:id/status
export const updateStatus = (id, isActive) => api.patch(`/admin/users/${id}/status`, { isActive });

// PATCH /api/admin/users/:id/reset-password
export const resetPassword = (id, temporaryPassword) =>
  api.patch(`/admin/users/${id}/reset-password`, { temporaryPassword });