const BASE_URL = 'https://nodirkhanov.uz/api';

const getToken = () => {
  try {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user).token : null;
  } catch {
    return null;
  }
};

const request = async (method, path, body = null) => {
  const token = getToken();
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);

  let data;
  try {
    data = await res.json();
  } catch {
    throw new Error('Server javobi noto\'g\'ri');
  }

  if (!res.ok) {
    // Backend ba'zan { message }, ba'zan { error } qaytaradi
    throw new Error(data.message || data.error || `Server xatosi: ${res.status}`);
  }

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
  addObjectIncome: (id, body) => request('PATCH',  `/objects/${id}/income`, body),

  // Logs
  getLogs: () => request('GET', '/logs'),
  createLog: (action, performer) => {
    // ── DEBUG (keyin o'chirasiz) ──
    console.log('=== createLog DEBUG ===');
    console.log('action:', JSON.stringify(action));
    console.log('performer:', JSON.stringify(performer));
    console.log('typeof action:', typeof action);

    if (!action || !String(action).trim()) {
      console.warn('createLog: action bo\'sh — yuborilmadi');
      return Promise.resolve();
    }

    const body = {
      action:    String(action).trim(),
      performer: String(performer || 'Sistema').trim(),
    };

    console.log('yuborilayotgan body:', JSON.stringify(body));
    // ── DEBUG tugadi ──

    return request('POST', '/logs', body);
  },
};  