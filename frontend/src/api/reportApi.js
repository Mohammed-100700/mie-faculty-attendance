import api from './axios';

export const getMonthlyReport = (month, year) =>
  api.get('/reports/monthly', { params: { month, year } });
export const getSummary = () => api.get('/reports/summary');
export const getBranchSummary = (month, year) =>
  api.get('/reports/branch-summary', { params: { month, year } });
export const getSubjectSummary = (month, year) =>
  api.get('/reports/subject-summary', { params: { month, year } });
