import api from './axios';

export const connectSheet = (data) => api.post('/marks-sheets', data);
export const getMySheet = () => api.get('/marks-sheets/my');
export const resetColumn = (colIndex, sheetName) => api.put('/marks-sheets/reset-column', { colIndex, sheetName });
export const disconnectSheet = () => api.delete('/marks-sheets');
