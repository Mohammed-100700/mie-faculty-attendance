import api from './axios';

export const createClassLog = (data) => api.post('/class-logs', data);
export const getMyClassLogs = (params) => api.get('/class-logs/my', { params });
export const getClassLog = (id) => api.get(`/class-logs/${id}`);
export const updateClassLog = (id, data) => api.put(`/class-logs/${id}`, data);
export const deleteClassLog = (id) => api.delete(`/class-logs/${id}`);
