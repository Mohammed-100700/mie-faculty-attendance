import api from './axios';

export const connectSheet = (data) => api.post('/marks-sheets', data);
export const getMySheet = () => api.get('/marks-sheets/my');
export const resetColumn = (colIndex) => api.put('/marks-sheets/reset-column', { colIndex });
export const disconnectSheet = () => api.delete('/marks-sheets');
