import api from './axios';

export const getWorkbook = () => api.get('/workbook');
export const addSheet = (batch, branch, subject, year) => api.post('/workbook/sheets', { batch, branch, subject, year });
export const deleteSheet = (sheetIndex) => api.delete(`/workbook/sheets/${sheetIndex}`);
export const addTest = (sheetIndex, testName, maxMarks, assessmentDate) => api.post(`/workbook/sheets/${sheetIndex}/tests`, { testName, maxMarks, assessmentDate });
export const deleteTest = (sheetIndex, testIndex) => api.delete(`/workbook/sheets/${sheetIndex}/tests/${testIndex}`);
export const addStudent = (sheetIndex, name, ncukId) => api.post(`/workbook/sheets/${sheetIndex}/students`, { name, ncukId });
export const deleteStudent = (sheetIndex, studentIndex) => api.delete(`/workbook/sheets/${sheetIndex}/students/${studentIndex}`);
export const updateMark = (sheetIndex, studentIndex, colIndex, value) => api.put(`/workbook/sheets/${sheetIndex}/students/${studentIndex}/marks/${colIndex}`, { value });
export const toggleTestApproval = (sheetIndex, testIndex) => api.put(`/workbook/sheets/${sheetIndex}/tests/${testIndex}/toggle`);
export const syncMarks = () => api.post('/workbook/sync-marks');
export const updateStudentNcukId = (sheetIndex, studentIndex, ncukId) => api.put(`/workbook/sheets/${sheetIndex}/students/${studentIndex}/ncukId`, { ncukId });
export const getAllWorkbooks = () => api.get('/workbook/all');
