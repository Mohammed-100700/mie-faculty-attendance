import api from './axios';

export const generateQR = (branch) => api.post('/qr/generate', { branch });
export const verifyQR = (token) => api.post('/qr/verify', { token });
export const getBranchQRCodes = () => api.get('/qr/branches');
