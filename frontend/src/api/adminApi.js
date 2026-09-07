import api from './axios';

// GET /api/admin/dashboard
export const getDashboard = () => api.get('/admin/dashboard');

// GET /api/admin/branches
export const getAdminBranches = () => api.get('/admin/branches');

// POST /api/admin/branches
export const createBranch = (data) => api.post('/admin/branches', data);

// PUT /api/admin/branches/:id
export const updateBranch = (id, data) => api.put(`/admin/branches/${id}`, data);

// PATCH /api/admin/branches/:id/status
export const updateBranchStatus = (id, isActive) => api.patch(`/admin/branches/${id}/status`, { isActive });

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