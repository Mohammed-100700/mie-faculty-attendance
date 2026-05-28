import api from './axios';

export const createSession = (branch, batch, subject) =>
  api.post('/attendance-sessions', { branch, batch, subject });

export const getMySessions = () =>
  api.get('/attendance-sessions/my');

export const getSession = (id) =>
  api.get(`/attendance-sessions/${id}`);

export const closeSession = (id) =>
  api.put(`/attendance-sessions/${id}/close`);

export const getCheckins = (id) =>
  api.get(`/attendance-sessions/${id}/checkins`);

export const getSessionByCode = (code) =>
  api.get(`/attendance-sessions/code/${code}`);

export const studentCheckin = (id, studentName, studentId) =>
  api.post(`/attendance-sessions/${id}/checkin`, { studentName, studentId });

// Reports (Executive Office)
export const getReports = (batch, branch, subject) =>
  api.get('/attendance-sessions/reports', { params: { batch, branch, subject } });
