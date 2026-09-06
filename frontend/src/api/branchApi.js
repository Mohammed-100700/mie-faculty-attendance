import api from './axios';

export const getBranches = () => api.get('/branches');