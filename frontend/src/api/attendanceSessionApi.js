import api from './axios';

export const createSession = (branch, batch, subject) =>
  api.post('/attendance-sessions', { branch, batch, subject });

export const createSessionFromSheet = ({
  workbookId,
  sheetIndex,
  branch,
  batch,
  subject,
}) =>
  api.post('/attendance-sessions', {
    workbookId,
    sheetIndex,
    branch,
    batch,
    subject,
  });

export const getMySessions = () =>
  api.get('/attendance-sessions/my');

export const getSession = (id) =>
  api.get(`/attendance-sessions/${id}`);

export const closeSession = (id) =>
  api.put(`/attendance-sessions/${id}/close`);

export const cancelSession = (id, reason) =>
  api.put(`/attendance-sessions/${id}/cancel`, { reason });

export const getCheckins = (id) =>
  api.get(`/attendance-sessions/${id}/checkins`);

export const getSessionByCode = (code) =>
  api.get(`/attendance-sessions/code/${code}`);

export const studentCheckin = (id, payload) =>
  api.post(`/attendance-sessions/${id}/checkin`, payload);

export const saveAttendance = (id, presentStudentRefs) =>
  api.put(`/attendance-sessions/${id}/attendance`, { presentStudentRefs });

export const getReports = (filter = {}) => {
  const { year, batch, branch, subject } = filter;
  return api.get('/attendance-sessions/reports', {
    params: { year, batch, branch, subject },
  });
};

export const getStudentReports = (filter = {}) => {
  const { year, batch, branch, subject } = filter;
  return api.get('/attendance-sessions/reports/students', {
    params: { year, batch, branch, subject },
  });
};
