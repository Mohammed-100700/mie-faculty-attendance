import api from './axios';

export const getPendingLogs = () => api.get('/attendance/pending');
export const getAllLogs = () => api.get('/attendance/all');
export const approveLog = (id) => api.put(`/attendance/${id}/approve`);
export const rejectLog = (id, reason) => api.put(`/attendance/${id}/reject`, { rejectionReason: reason });
