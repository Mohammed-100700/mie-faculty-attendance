import api from './axios';

export const getWorkbook = () => api.get('/workbook');
export const updateStaffEmail = (staffEmail) => api.put('/workbook/staff-email', { staffEmail });
export const addSheet = (batch, branch, subject) => api.post('/workbook/sheets', { batch, branch, subject });
export const deleteSheet = (sheetIndex) => api.delete(`/workbook/sheets/${sheetIndex}`);
export const addTest = (sheetIndex, testName) => api.post(`/workbook/sheets/${sheetIndex}/tests`, { testName });
export const deleteTest = (sheetIndex, testIndex) => api.delete(`/workbook/sheets/${sheetIndex}/tests/${testIndex}`);
export const addStudent = (sheetIndex, name) => api.post(`/workbook/sheets/${sheetIndex}/students`, { name });
export const deleteStudent = (sheetIndex, studentIndex) => api.delete(`/workbook/sheets/${sheetIndex}/students/${studentIndex}`);
export const updateMark = (sheetIndex, studentIndex, colIndex, value) => api.put(`/workbook/sheets/${sheetIndex}/students/${studentIndex}/marks/${colIndex}`, { value });
export const toggleTestApproval = (sheetIndex, testIndex) => api.put(`/workbook/sheets/${sheetIndex}/tests/${testIndex}/toggle`);
export const sendEmail = (sheetIndex) => api.post(`/workbook/sheets/${sheetIndex}/send`);
