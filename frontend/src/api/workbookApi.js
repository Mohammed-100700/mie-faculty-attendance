import api from './axios';

export const getWorkbook = () => api.get('/workbook');
export const updateStaffEmail = (staffEmail) => api.put('/workbook/staff-email', { staffEmail });
export const addSheet = (name) => api.post('/workbook/sheets', { name });
export const deleteSheet = (sheetIndex) => api.delete(`/workbook/sheets/${sheetIndex}`);
export const addTest = (sheetIndex, branchName, subjectName, testName) =>
  api.post(`/workbook/sheets/${sheetIndex}/tests`, { branchName, subjectName, testName });
export const deleteTest = (sheetIndex, branchName, subjectName, testIndex) =>
  api.delete(`/workbook/sheets/${sheetIndex}/tests/${branchName}/${subjectName}/${testIndex}`);
export const addStudent = (sheetIndex, name) =>
  api.post(`/workbook/sheets/${sheetIndex}/students`, { name });
export const deleteStudent = (sheetIndex, studentIndex) =>
  api.delete(`/workbook/sheets/${sheetIndex}/students/${studentIndex}`);
export const updateMark = (sheetIndex, studentIndex, colIndex, value) =>
  api.put(`/workbook/sheets/${sheetIndex}/students/${studentIndex}/marks/${colIndex}`, { value });
export const toggleTestApproval = (sheetIndex, branchName, subjectName, testIndex) =>
  api.put(`/workbook/sheets/${sheetIndex}/tests/toggle`, { branchName, subjectName, testIndex });
export const sendEmail = (sheetIndex) => api.post(`/workbook/sheets/${sheetIndex}/send`);
