const BASE_URL = process.env.REACT_APP_API_URL || 'https://nodirkhanov.uz/api';

const request = async (method, path, body = null) => {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Server xatosi');
  return data;
};

export const api = {
  // Auth
  login: (body) => request('POST', '/auth/login', body),

  // Employees
  getEmployees:   ()         => request('GET',    '/employees'),
  createEmployee: (body)     => request('POST',   '/employees', body),
  updateEmployee: (id, body) => request('PUT',    `/employees/${id}`, body),
  deleteEmployee: (id)       => request('DELETE', `/employees/${id}`),

  // Attendance
  getAttendance: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/attendance${q ? '?' + q : ''}`);
  },
  upsertAttendance:  (body) => request('POST',   '/attendance', body),
  approveAttendance: (id)   => request('PATCH',  `/attendance/${id}/approve`),
  deleteAttendance:  (id)   => request('DELETE', `/attendance/${id}`),

  // Payroll
  getPayroll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request('GET', `/payroll${q ? '?' + q : ''}`);
  },
  createPayroll:  (body) => request('POST',   '/payroll', body),
  approvePayroll: (id)   => request('PATCH',  `/payroll/${id}/approve`),
  deletePayroll:  (id)   => request('DELETE', `/payroll/${id}`),

  // Objects
  getObjects:      ()         => request('GET',    '/objects'),
  createObject:    (body)     => request('POST',   '/objects', body),
  deleteObject:    (id)       => request('DELETE', `/objects/${id}`),
  addObjectIncome: (id, body) => request('PATCH',  `/objects/${id}/income`, body), // ← body qo'shildi

  // Logs
  getLogs:   ()                           => request('GET',  '/logs'),
  createLog: (action, performer = 'admin') => request('POST', '/logs', { action, performer }),
};