import api from './axios';

export const getSubjects = () => api.get('/subjects');
export const createSubject = (data) => api.post('/subjects', data);
export const seedSubjects = () => api.post('/subjects/seed');
