import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet, Download, Users, CreditCard, Building2,
  CalendarCheck, TrendingUp, Filter, CheckCircle, Zap,
  BarChart3, FileText, Clock, Star
} from 'lucide-react';

/* ─────────────────────────────────────────────
   SheetJS — dinamik yuklanadi (bitta XLSX uchun)
   ───────────────────────────────────────────── */
let _XLSX = null;
const loadXLSX = () => new Promise((res, rej) => {
  if (_XLSX) return res(_XLSX);
  if (window.XLSX) { _XLSX = window.XLSX; return res(_XLSX); }
  const s = document.createElement('script');
  s.src = 'https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js';
  s.onload  = () => { _XLSX = window.XLSX; res(_XLSX); };
  s.onerror = () => rej(new Error('SheetJS yuklanmadi — internet aloqasini tekshiring'));
  document.head.appendChild(s);
});

/* ─────────────────────────────────────────────
   CSV (alohida hisobot uchun fallback saqlanadi)
   ───────────────────────────────────────────── */
const toCSV = (rows) =>
  rows.map(row =>
    row.map(cell => {
      const v = cell === null || cell === undefined ? '' : String(cell);
      return v.includes(',') || v.includes('"') || v.includes('\n')
        ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(',')
  ).join('\n');

const downloadCSV = (rows, filename) => {
  const csv  = '\uFEFF' + toCSV(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const downloadJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

const now = () => new Date().toLocaleDateString('uz-UZ');

/* ─────────────────────────────────────────────
   MAIN COMPONENT
   ───────────────────────────────────────────── */
const Excel = ({ employees = [], attendance = [], payroll = [], objects = [] }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [downloading, setDownloading]       = useState(null);
  const [filterMonth, setFilterMonth]       = useState(new Date().toISOString().slice(0, 7));
  const [filterObj, setFilterObj]           = useState('');

  const approvedPayroll = useMemo(() => payroll.filter(p => p.status === 'APPROVED'), [payroll]);

  // ── HISOBOT GENERATORLARI ──────────────────────────

  const reports = useMemo(() => [

    // ══ XODIMLAR ══
    {
      id: 'employees_full', category: 'employees',
      title: "Xodimlar to'liq ma'lumoti",
      desc:  'Barcha xodimlar: ism, lavozim, stavka, holat',
      icon:  <Users size={18}/>, color: 'blue', format: 'CSV',
      count: employees.length,
      rows: () => {
        const headers = ['#', 'Ism', 'Lavozim', 'Email', 'Kunlik stavka (UZS)', 'Tur', 'Holat', "Qo'shilgan sana"];
        const rows    = employees.map((e, i) => [
          i + 1, e.name, e.position || '—', e.email || '—',
          e.salaryRate || 0,
          e.salaryType === 'DAILY' ? 'Kunlik' : 'Oylik',
          e.status === 'ACTIVE' ? 'Faol' : 'Nofaol',
          e.createdAt ? new Date(e.createdAt).toLocaleDateString('uz-UZ') : '—',
        ]);
        return [headers, ...rows];
      },
      generate() { downloadCSV(this.rows(), `xodimlar_${now()}.csv`); },
    },

    {
      id: 'employees_salary_summary', category: 'employees',
      title: 'Xodimlar ish haqi xulosasi',
      desc:  'Kim qancha ishladi, qancha oldi, qancha qoldi',
      icon:  <TrendingUp size={18}/>, color: 'emerald', format: 'CSV',
      count: employees.filter(e => e.status === 'ACTIVE').length,
      rows: () => {
        const headers = ['#', 'Xodim', 'Lavozim', 'Ish kunlari', 'Kunlik stavka', 'Hisoblangan (UZS)', 'Olingan (UZS)', 'Qoldiq (UZS)', 'Obyektlar'];
        const rows = employees.filter(e => e.status === 'ACTIVE').map((emp, i) => {
          const empId    = emp._id || emp.id;
          const worked   = attendance.filter(a => String(a.employeeId?._id || a.employeeId) === String(empId) && a.status === 'PRESENT').length;
          const earned   = worked * (Number(emp.salaryRate) || 0);
          const taken    = approvedPayroll.filter(p => String(p.employeeId?._id || p.employeeId) === String(empId)).reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
          const objNames = [...new Set(approvedPayroll.filter(p => String(p.employeeId?._id || p.employeeId) === String(empId)).map(p => p.objectName).filter(Boolean))].join(', ');
          return [i+1, emp.name, emp.position || '—', worked, emp.salaryRate || 0, earned, taken, earned - taken, objNames || '—'];
        });
        return [headers, ...rows];
      },
      generate() { downloadCSV(this.rows(), `xodimlar_xulosa_${now()}.csv`); },
    },

    // ══ TO'LOVLAR ══
    {
      id: 'payroll_all', category: 'payroll',
      title: "Barcha to'lovlar tarixi",
      desc:  "Barcha vaqt davomida amalga oshirilgan to'lovlar",
      icon:  <CreditCard size={18}/>, color: 'yellow', format: 'CSV',
      count: approvedPayroll.length,
      rows: () => {
        const headers = ['#', 'Xodim', 'Summa (UZS)', 'Obyekt', 'Sana', 'Oy', 'Tur'];
        const rows    = approvedPayroll.map((p, i) => [
          i+1, p.employeeName || '—', Number(p.calculatedSalary) || 0,
          p.objectName || '—', p.date || '—', p.month || '—',
          p.type === 'DAILY_PAY' ? 'Oylik' : p.type === 'QUICK_ADD' ? 'Avans' : p.type || '—',
        ]);
        const total = approvedPayroll.reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
        return [headers, ...rows, [], ['', 'JAMI SUMMA', total]];
      },
      generate() { downloadCSV(this.rows(), `toliq_toliq_tarix_${now()}.csv`); },
    },

    {
      id: 'payroll_monthly', category: 'payroll',
      title: `${filterMonth} oyi to'lovlari`,
      desc:  "Tanlangan oy uchun to'lovlar ro'yxati",
      icon:  <CalendarCheck size={18}/>, color: 'orange', format: 'CSV',
      count: approvedPayroll.filter(p => p.month === filterMonth).length,
      rows: () => {
        const monthly = approvedPayroll.filter(p => p.month === filterMonth);
        const headers = ['#', 'Xodim', 'Summa (UZS)', 'Obyekt', 'Sana', 'Tur'];
        const rows    = monthly.map((p, i) => [i+1, p.employeeName, Number(p.calculatedSalary)||0, p.objectName||'—', p.date||'—', p.type === 'DAILY_PAY' ? 'Oylik' : 'Avans']);
        const total   = monthly.reduce((s, p) => s + (Number(p.calculatedSalary)||0), 0);
        return [headers, ...rows, [], ['', 'OY JAMI', total]];
      },
      generate() { downloadCSV(this.rows(), `toliq_${filterMonth}_${now()}.csv`); },
    },

    {
      id: 'payroll_by_object', category: 'payroll',
      title: "Obyektlar bo'yicha to'lovlar",
      desc:  "Har bir obyekt uchun xarajatlar xulosasi",
      icon:  <Building2 size={18}/>, color: 'purple', format: 'CSV',
      count: objects.length,
      rows: () => {
        const headers    = ['#', 'Obyekt', "Jami to'lovlar", 'Xarajat (UZS)', 'Byudjet (UZS)', 'Qoldiq (UZS)', 'Xodimlar soni'];
        const rows       = objects.map((obj, i) => {
          const objId  = obj._id || obj.id;
          const objPay = approvedPayroll.filter(p => String(p.objectId?._id || p.objectId) === String(objId));
          const total  = objPay.reduce((s, p) => s + (Number(p.calculatedSalary)||0), 0);
          const empCnt = new Set(objPay.map(p => String(p.employeeId?._id || p.employeeId))).size;
          const budget = Number(obj.totalBudget) || 0;
          return [i+1, obj.name, objPay.length, total, budget, budget - total, empCnt];
        });
        const grandTotal = objects.reduce((s, obj) => {
          const objId = obj._id || obj.id;
          return s + approvedPayroll.filter(p => String(p.objectId?._id || p.objectId) === String(objId)).reduce((ss, p) => ss + (Number(p.calculatedSalary)||0), 0);
        }, 0);
        return [headers, ...rows, [], ['', 'JAMI', '', grandTotal]];
      },
      generate() { downloadCSV(this.rows(), `obyektlar_xarajat_${now()}.csv`); },
    },

    // ══ DAVOMAT ══
    {
      id: 'attendance_full', category: 'attendance',
      title: "Davomat to'liq ro'yxat",
      desc:  'Barcha tasdiqlangan davomat yozuvlari',
      icon:  <CheckCircle size={18}/>, color: 'teal', format: 'CSV',
      count: attendance.filter(a => a.status === 'PRESENT').length,
      rows: () => {
        const present = attendance.filter(a => a.status === 'PRESENT');
        const headers = ['#', 'Xodim', 'Sana', 'Obyekt', 'Holat'];
        const rows    = present.map((a, i) => {
          const emp = employees.find(e => String(e._id || e.id) === String(a.employeeId?._id || a.employeeId));
          return [i+1, emp?.name || a.employeeName || '—', a.date || '—', a.objectName || '—', 'KELDI'];
        });
        return [headers, ...rows];
      },
      generate() { downloadCSV(this.rows(), `davomat_${now()}.csv`); },
    },

    {
      id: 'attendance_by_employee', category: 'attendance',
      title: "Xodimlar davomat xulosasi",
      desc:  "Har bir xodim uchun ish kunlari statistikasi",
      icon:  <BarChart3 size={18}/>, color: 'cyan', format: 'CSV',
      count: employees.filter(e => e.status === 'ACTIVE').length,
      rows: () => {
        const headers = ['#', 'Xodim', 'Lavozim', 'Ish kunlari', 'Keldi', 'Kelmadi', 'Davomat %'];
        const rows    = employees.filter(e => e.status === 'ACTIVE').map((emp, i) => {
          const empId  = emp._id || emp.id;
          const empAtt = attendance.filter(a => String(a.employeeId?._id || a.employeeId) === String(empId));
          const came   = empAtt.filter(a => a.status === 'PRESENT').length;
          const total  = empAtt.length;
          return [i+1, emp.name, emp.position || '—', total, came, total - came, total > 0 ? Math.round((came / total) * 100) + '%' : '0%'];
        });
        return [headers, ...rows];
      },
      generate() { downloadCSV(this.rows(), `davomat_xulosa_${now()}.csv`); },
    },

    // ══ OBYEKTLAR ══
    {
      id: 'objects_budget', category: 'objects',
      title: "Obyektlar byudjet hisoboti",
      desc:  'Barcha obyektlar byudjet va xarajatlar holati',
      icon:  <Building2 size={18}/>, color: 'rose', format: 'CSV',
      count: objects.length,
      rows: () => {
        const headers = ['#', 'Obyekt', 'Holat', 'Byudjet (UZS)', 'Xarajat (UZS)', 'Qoldiq (UZS)', "Foydalanish %", "To'lovlar soni"];
        const rows    = objects.map((obj, i) => {
          const objId = obj._id || obj.id;
          const spent = approvedPayroll.filter(p => String(p.objectId?._id || p.objectId) === String(objId)).reduce((s, p) => s + (Number(p.calculatedSalary)||0), 0);
          const budget= Number(obj.totalBudget) || 0;
          const pct   = budget > 0 ? Math.round((spent / budget) * 100) : 0;
          const cnt   = approvedPayroll.filter(p => String(p.objectId?._id || p.objectId) === String(objId)).length;
          return [i+1, obj.name, obj.status === 'active' ? 'Faol' : 'Nofaol', budget, spent, budget - spent, `${pct}%`, cnt];
        });
        return [headers, ...rows];
      },
      generate() { downloadCSV(this.rows(), `obyektlar_byudjet_${now()}.csv`); },
    },

    // ══ YIG'MA ══
    {
      id: 'full_summary', category: 'summary',
      title: "Umumiy moliya xulosasi",
      desc:  "Kompaniya bo'yicha to'liq moliyaviy hisobot",
      icon:  <Star size={18}/>, color: 'amber', format: 'CSV', badge: 'PRO',
      count: null,
      rows: () => {
        const totalEmp    = employees.filter(e => e.status === 'ACTIVE').length;
        const totalPay    = approvedPayroll.reduce((s, p) => s + (Number(p.calculatedSalary)||0), 0);
        const totalBudget = objects.reduce((s, o) => s + (Number(o.totalBudget)||0), 0);
        const totalDays   = attendance.filter(a => a.status === 'PRESENT').length;
        return [
          ['UMUMIY MOLIYA XULOSASI', '', now()], [],
          ["ASOSIY KO'RSATKICHLAR", 'Qiymat', ''],
          ['Faol xodimlar', totalEmp, 'kishi'],
          ["Jami to'lovlar", totalPay, 'UZS'],
          ['Jami byudjet', totalBudget, 'UZS'],
          ["Umumiy davomat", totalDays, 'kun-kishi'],
          ['Faol obyektlar', objects.filter(o => o.status === 'active').length, 'ta'],
          [], ["OBYEKTLAR BO'YICHA"],
          ['Obyekt', "Byudjet", 'Xarajat', 'Qoldiq', 'Holat'],
          ...objects.map(obj => {
            const oid   = obj._id || obj.id;
            const spent = approvedPayroll.filter(p => String(p.objectId?._id || p.objectId) === String(oid)).reduce((s, p) => s + (Number(p.calculatedSalary)||0), 0);
            const bal   = (Number(obj.totalBudget)||0) - spent;
            return [obj.name, Number(obj.totalBudget)||0, spent, bal, bal < 0 ? 'LIMIT OSHDI' : 'OK'];
          }),
          [], ["XODIMLAR REYTINGI (ENG KO'P OLGAN)"],
          ["Xodim", "Jami olingan (UZS)", "To'lovlar soni"],
          ...employees.map(emp => {
            const eid   = emp._id || emp.id;
            const taken = approvedPayroll.filter(p => String(p.employeeId?._id || p.employeeId) === String(eid)).reduce((s, p) => s + (Number(p.calculatedSalary)||0), 0);
            const cnt   = approvedPayroll.filter(p => String(p.employeeId?._id || p.employeeId) === String(eid)).length;
            return [emp.name, taken, cnt];
          }).sort((a, b) => b[1] - a[1]),
        ];
      },
      generate() { downloadCSV(this.rows(), `umumiy_xulosa_${now()}.csv`); },
    },

    {
      id: 'full_json', category: 'summary',
      title: "To'liq JSON eksport",
      desc:  "Barcha ma'lumotlar JSON formatida (developer uchun)",
      icon:  <FileText size={18}/>, color: 'slate', format: 'JSON', badge: 'DEV',
      count: null,
      rows: () => null,
      generate() {
        downloadJSON({
          exportDate: new Date().toISOString(),
          summary: { employees: employees.length, attendance: attendance.length, payroll: approvedPayroll.length, objects: objects.length },
          employees, attendance, payroll: approvedPayroll, objects,
        }, `full_export_${now()}.json`);
      },
    },

    // ══ FILTRLI ══
    {
      id: 'payroll_by_obj_filter', category: 'filtered',
      title: "Obyekt bo'yicha to'lovlar",
      desc:  "Tanlangan obyekt uchun barcha to'lovlar",
      icon:  <Filter size={18}/>, color: 'indigo', format: 'CSV',
      count: filterObj ? approvedPayroll.filter(p => String(p.objectId?._id || p.objectId) === String(filterObj)).length : null,
      rows: () => {
        if (!filterObj) return null;
        const obj     = objects.find(o => (o._id || o.id) === filterObj);
        const data    = approvedPayroll.filter(p => String(p.objectId?._id || p.objectId) === String(filterObj));
        const headers = ['#', 'Xodim', 'Summa (UZS)', 'Sana', 'Oy'];
        const rows    = data.map((p, i) => [i+1, p.employeeName||'—', Number(p.calculatedSalary)||0, p.date||'—', p.month||'—']);
        const total   = data.reduce((s, p) => s + (Number(p.calculatedSalary)||0), 0);
        return [headers, ...rows, [], ['', 'JAMI', total]];
      },
      generate() {
        if (!filterObj) return alert("Yuqoridagi filtrdan obyektni tanlang!");
        const obj = objects.find(o => (o._id || o.id) === filterObj);
        downloadCSV(this.rows(), `${obj?.name || 'obyekt'}_toliq_${now()}.csv`);
      },
    },

    {
      id: 'monthly_obj_filter', category: 'filtered',
      title: "Oy + Obyekt kombinatsiyasi",
      desc:  "Tanlangan oy va obyekt kesishmasidagi to'lovlar",
      icon:  <Filter size={18}/>, color: 'pink', format: 'CSV',
      count: filterObj
        ? approvedPayroll.filter(p => p.month === filterMonth && String(p.objectId?._id || p.objectId) === String(filterObj)).length
        : approvedPayroll.filter(p => p.month === filterMonth).length,
      rows: () => {
        const data    = approvedPayroll.filter(p => p.month === filterMonth && (!filterObj || String(p.objectId?._id || p.objectId) === String(filterObj)));
        const headers = ['#', 'Xodim', 'Summa (UZS)', 'Obyekt', 'Sana'];
        const rows    = data.map((p, i) => [i+1, p.employeeName||'—', Number(p.calculatedSalary)||0, p.objectName||'—', p.date||'—']);
        const total   = data.reduce((s, p) => s + (Number(p.calculatedSalary)||0), 0);
        return [headers, ...rows, [], ['', 'JAMI', total]];
      },
      generate() {
        const obj = filterObj ? objects.find(o => (o._id || o.id) === filterObj) : null;
        downloadCSV(this.rows(), `${filterMonth}_${obj?.name || 'barchasi'}_${now()}.csv`);
      },
    },

  ], [employees, attendance, approvedPayroll, objects, filterMonth, filterObj]);

  /* ── Barcha hisobotlarni BITTA XLSX ga — to'g'ridan-to'g'ri hisoblash ── */
  const downloadAllAsOneXLSX = async () => {
    setDownloading('all');
    try {
      const XLSX = await loadXLSX();
      const wb   = XLSX.utils.book_new();

      const addSheet = (name, rows) => {
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
      };

      // ── 1. Xodimlar to'liq ──
      addSheet("Xodimlar", [
        ['#', 'Ism', 'Lavozim', 'Email', 'Kunlik stavka (UZS)', 'Tur', 'Holat', "Qo'shilgan sana"],
        ...employees.map((e, i) => [
          i+1, e.name || '—', e.position || '—', e.email || '—',
          Number(e.salaryRate) || 0,
          e.salaryType === 'DAILY' ? 'Kunlik' : 'Oylik',
          e.status === 'ACTIVE' ? 'Faol' : 'Nofaol',
          e.createdAt ? new Date(e.createdAt).toLocaleDateString('uz-UZ') : '—',
        ]),
      ]);

      // ── 2. Ish haqi xulosasi ──
      const salaryRows = employees
        .filter(e => e.status === 'ACTIVE')
        .map((emp, i) => {
          const eid      = String(emp._id || emp.id || '');
          const worked   = approvedPayroll.filter(p => String(p.employeeId?._id || p.employeeId) === eid && p.status === 'APPROVED').length > 0
            ? attendance.filter(a => String(a.employeeId?._id || a.employeeId) === eid && a.status === 'PRESENT').length
            : attendance.filter(a => String(a.employeeId?._id || a.employeeId) === eid && a.status === 'PRESENT').length;
          const earned   = worked * (Number(emp.salaryRate) || 0);
          const taken    = approvedPayroll
            .filter(p => String(p.employeeId?._id || p.employeeId) === eid)
            .reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
          const objNames = [...new Set(
            approvedPayroll
              .filter(p => String(p.employeeId?._id || p.employeeId) === eid)
              .map(p => p.objectName).filter(Boolean)
          )].join(', ');
          return [i+1, emp.name, emp.position || '—', worked, Number(emp.salaryRate)||0, earned, taken, earned - taken, objNames || '—'];
        });
      addSheet("Ish haqi xulosasi", [
        ['#', 'Xodim', 'Lavozim', 'Ish kunlari', 'Kunlik stavka', 'Hisoblangan (UZS)', 'Olingan (UZS)', 'Qoldiq (UZS)', 'Obyektlar'],
        ...salaryRows,
        [],
        ['', 'JAMI HISOBLANGAN', '', '', '',
          salaryRows.reduce((s, r) => s + (Number(r[5]) || 0), 0),
          salaryRows.reduce((s, r) => s + (Number(r[6]) || 0), 0),
          salaryRows.reduce((s, r) => s + (Number(r[7]) || 0), 0),
        ],
      ]);

      // ── 3. Barcha to'lovlar ──
      const allPayTotal = approvedPayroll.reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
      addSheet("Barcha toliqlar", [
        ['#', 'Xodim', 'Summa (UZS)', 'Obyekt', 'Sana', 'Oy', 'Tur'],
        ...approvedPayroll.map((p, i) => [
          i+1,
          p.employeeName || '—',
          Number(p.calculatedSalary) || 0,
          p.objectName || '—',
          p.date || '—',
          p.month || '—',
          p.type === 'DAILY_PAY' ? 'Oylik' : p.type === 'ADVANCE' ? 'Avans' : p.type || '—',
        ]),
        [],
        ['', 'JAMI SUMMA (UZS)', allPayTotal],
      ]);

      // ── 4. Oylar bo'yicha to'lovlar ──
      const monthMap = {};
      approvedPayroll.forEach(p => {
        const m = p.month || (p.date ? p.date.slice(0,7) : null);
        if (!m) return;
        if (!monthMap[m]) monthMap[m] = { total: 0, count: 0, emps: new Set() };
        monthMap[m].total += Number(p.calculatedSalary) || 0;
        monthMap[m].count += 1;
        monthMap[m].emps.add(String(p.employeeId?._id || p.employeeId));
      });
      addSheet("Oylar boyicha", [
        ['Oy', "Jami to'lovlar (UZS)", "To'lovlar soni", 'Xodimlar soni'],
        ...Object.entries(monthMap)
          .sort(([a],[b]) => a.localeCompare(b))
          .map(([m, d]) => [m, d.total, d.count, d.emps.size]),
        [],
        ['JAMI', approvedPayroll.reduce((s,p)=>s+(Number(p.calculatedSalary)||0),0), approvedPayroll.length],
      ]);

      // ── 5. Obyektlar xarajat ──
      const objRows = objects.map((obj, i) => {
        const oid    = String(obj._id || obj.id || '');
        const objPay = approvedPayroll.filter(p => String(p.objectId?._id || p.objectId) === oid);
        const total  = objPay.reduce((s, p) => s + (Number(p.calculatedSalary)||0), 0);
        const empCnt = new Set(objPay.map(p => String(p.employeeId?._id || p.employeeId))).size;
        const budget = Number(obj.totalBudget) || 0;
        const pct    = budget > 0 ? Math.round((total/budget)*100) : 0;
        return [i+1, obj.name, obj.status === 'active' ? 'Faol' : 'Nofaol',
          budget, total, budget - total, pct + '%', objPay.length, empCnt,
          budget > 0 && total > budget ? 'LIMIT OSHDI' : 'OK'];
      });
      addSheet("Obyektlar xarajat", [
        ['#', 'Obyekt', 'Holat', 'Byudjet (UZS)', 'Xarajat (UZS)', 'Qoldiq (UZS)', 'Foydalanish %', "To'lovlar soni", 'Xodimlar soni', 'Status'],
        ...objRows,
        [],
        ['', 'JAMI', '', objects.reduce((s,o)=>s+(Number(o.totalBudget)||0),0),
          objRows.reduce((s,r)=>s+(Number(r[4])||0),0)],
      ]);

      // ── 6. Davomat to'liq ──
      const presentAtt = attendance.filter(a => a.status === 'PRESENT');
      addSheet("Davomat toliq", [
        ['#', 'Xodim', 'Lavozim', 'Sana', 'Obyekt', 'Belgilagan'],
        ...presentAtt.map((a, i) => {
          const emp = employees.find(e => String(e._id || e.id) === String(a.employeeId?._id || a.employeeId));
          return [
            i+1,
            emp?.name || a.employeeName || '—',
            emp?.position || '—',
            a.date || '—',
            a.objectName || '—',
            a.markedBy === 'admin' ? 'Admin' : 'Xodim',
          ];
        }),
        [],
        ['JAMI:', presentAtt.length, 'ta yozuv'],
      ]);

      // ── 7. Davomat xulosasi (xodim bo'yicha) ──
      addSheet("Davomat xulosasi", [
        ['#', 'Xodim', 'Lavozim', 'Jami kunlar', 'Keldi', 'Kelmadi', 'Davomat %'],
        ...employees.filter(e => e.status === 'ACTIVE').map((emp, i) => {
          const eid    = String(emp._id || emp.id || '');
          const empAtt = attendance.filter(a => String(a.employeeId?._id || a.employeeId) === eid);
          const came   = empAtt.filter(a => a.status === 'PRESENT').length;
          const total  = empAtt.length;
          return [i+1, emp.name, emp.position || '—', total, came, total - came,
            total > 0 ? Math.round((came/total)*100) + '%' : '0%'];
        }),
      ]);

      // ── 8. Umumiy moliya xulosasi ──
      const totalEmp    = employees.filter(e => e.status === 'ACTIVE').length;
      const totalPayAll = approvedPayroll.reduce((s,p) => s+(Number(p.calculatedSalary)||0), 0);
      const totalBudget = objects.reduce((s,o) => s+(Number(o.totalBudget)||0), 0);
      const totalDays   = attendance.filter(a => a.status === 'PRESENT').length;
      addSheet("Umumiy xulosa", [
        ['UMUMIY MOLIYA XULOSASI', '', now()],
        [],
        ["KO'RSATKICH", 'QIYMAT', 'BIRLIK'],
        ['Faol xodimlar', totalEmp, 'kishi'],
        ["Jami to'lovlar", totalPayAll, 'UZS'],
        ['Jami byudjet', totalBudget, 'UZS'],
        ['Byudjet qoldig\'i', totalBudget - totalPayAll, 'UZS'],
        ["Davomat kunlari", totalDays, 'kun'],
        ['Faol obyektlar', objects.filter(o => o.status === 'active').length, 'ta'],
        ["To'lovlar soni", approvedPayroll.length, 'ta'],
        [],
        ["OBYEKTLAR BO'YICHA"],
        ['Obyekt', 'Byudjet', 'Xarajat', 'Qoldiq', 'Holat'],
        ...objects.map(obj => {
          const oid   = String(obj._id || obj.id || '');
          const spent = approvedPayroll.filter(p => String(p.objectId?._id || p.objectId) === oid).reduce((s,p)=>s+(Number(p.calculatedSalary)||0),0);
          const bal   = (Number(obj.totalBudget)||0) - spent;
          return [obj.name, Number(obj.totalBudget)||0, spent, bal, bal < 0 ? 'LIMIT OSHDI' : 'OK'];
        }),
        [],
        ["XODIMLAR REYTINGI (ENG KO'P OLGAN)"],
        ['Xodim', 'Lavozim', 'Jami olingan (UZS)', "To'lovlar soni", 'Ish kunlari'],
        ...employees.map(emp => {
          const eid   = String(emp._id || emp.id || '');
          const taken = approvedPayroll.filter(p => String(p.employeeId?._id || p.employeeId) === eid).reduce((s,p)=>s+(Number(p.calculatedSalary)||0),0);
          const cnt   = approvedPayroll.filter(p => String(p.employeeId?._id || p.employeeId) === eid).length;
          const days  = attendance.filter(a => String(a.employeeId?._id || a.employeeId) === eid && a.status === 'PRESENT').length;
          return [emp.name, emp.position || '—', taken, cnt, days];
        }).sort((a, b) => b[2] - a[2]),
      ]);

      // ── 9. Filtrli: tanlangan oy ──
      const monthlyPay = approvedPayroll.filter(p => p.month === filterMonth);
      const monthlyTotal = monthlyPay.reduce((s,p)=>s+(Number(p.calculatedSalary)||0),0);
      addSheet(`${filterMonth} oy`, [
        [`OY: ${filterMonth}`, `Jami: ${monthlyTotal.toLocaleString()} UZS`],
        [],
        ['#', 'Xodim', 'Summa (UZS)', 'Obyekt', 'Sana', 'Tur'],
        ...monthlyPay.map((p, i) => [
          i+1, p.employeeName || '—', Number(p.calculatedSalary)||0,
          p.objectName || '—', p.date || '—',
          p.type === 'DAILY_PAY' ? 'Oylik' : 'Avans',
        ]),
        [],
        ['', 'OY JAMI (UZS)', monthlyTotal],
      ]);

      XLSX.writeFile(wb, `Barcha_Hisobotlar_${now().replace(/\./g, '-')}.xlsx`);
    } catch (e) {
      alert('Xatolik: ' + e.message);
      console.error(e);
    }
    setDownloading(null);
  };

  const categories = [
    { key: 'all',        label: 'Barchasi',  icon: <Zap size={13}/>           },
    { key: 'employees',  label: 'Xodimlar',  icon: <Users size={13}/>         },
    { key: 'payroll',    label: "To'lovlar", icon: <CreditCard size={13}/>    },
    { key: 'attendance', label: 'Davomat',   icon: <CalendarCheck size={13}/> },
    { key: 'objects',    label: 'Obyektlar', icon: <Building2 size={13}/>     },
    { key: 'summary',    label: 'Xulosa',    icon: <Star size={13}/>          },
    { key: 'filtered',   label: 'Filtrli',   icon: <Filter size={13}/>        },
  ];

  const filtered = activeCategory === 'all' ? reports : reports.filter(r => r.category === activeCategory);

  const colorMap = {
    blue:    'bg-blue-500/10 border-blue-500/20 text-blue-400',
    emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    yellow:  'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
    orange:  'bg-orange-500/10 border-orange-500/20 text-orange-400',
    purple:  'bg-purple-500/10 border-purple-500/20 text-purple-400',
    teal:    'bg-teal-500/10 border-teal-500/20 text-teal-400',
    cyan:    'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
    rose:    'bg-rose-500/10 border-rose-500/20 text-rose-400',
    amber:   'bg-amber-500/10 border-amber-500/20 text-amber-400',
    slate:   'bg-slate-700/30 border-slate-600/30 text-slate-400',
    indigo:  'bg-indigo-500/10 border-indigo-500/20 text-indigo-400',
    pink:    'bg-pink-500/10 border-pink-500/20 text-pink-400',
  };
  const btnColor = {
    blue:    'bg-blue-500 hover:bg-blue-400 shadow-blue-500/20',
    emerald: 'bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20',
    yellow:  'bg-yellow-500 hover:bg-yellow-400 shadow-yellow-500/20 !text-slate-950',
    orange:  'bg-orange-500 hover:bg-orange-400 shadow-orange-500/20',
    purple:  'bg-purple-500 hover:bg-purple-400 shadow-purple-500/20',
    teal:    'bg-teal-500 hover:bg-teal-400 shadow-teal-500/20',
    cyan:    'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/20',
    rose:    'bg-rose-500 hover:bg-rose-400 shadow-rose-500/20',
    amber:   'bg-amber-500 hover:bg-amber-400 shadow-amber-500/20 !text-slate-950',
    slate:   'bg-slate-600 hover:bg-slate-500 shadow-slate-500/20',
    indigo:  'bg-indigo-500 hover:bg-indigo-400 shadow-indigo-500/20',
    pink:    'bg-pink-500 hover:bg-pink-400 shadow-pink-500/20',
  };

  const handleDownload = async (report) => {
    setDownloading(report.id);
    await new Promise(r => setTimeout(r, 400));
    try { report.generate(); } catch (e) { alert('Xatolik: ' + e.message); }
    setDownloading(null);
  };

  const totalPaid   = approvedPayroll.reduce((s, p) => s + (Number(p.calculatedSalary)||0), 0);
  const totalBudget = objects.reduce((s, o) => s + (Number(o.totalBudget)||0), 0);

  return (
    <div className="space-y-6 pb-10">

      {/* ── SARLAVHA ── */}
      <div className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-3xl border border-slate-800 p-6 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }}/>
        <div className="absolute top-3 right-5 text-[80px] leading-none opacity-5 select-none">📊</div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center">
              <FileSpreadsheet className="text-yellow-500" size={22}/>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white italic uppercase tracking-tight">
                Hisobotlar <span className="text-yellow-500">&</span> Eksport
              </h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                CSV · JSON · Excel formatida yuklab olish
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Xodimlar',     val: employees.filter(e=>e.status==='ACTIVE').length, unit: 'ta faol',   color: 'text-blue-400'    },
              { label: "To'lovlar",    val: approvedPayroll.length,                           unit: 'ta amalga', color: 'text-yellow-400'  },
              { label: 'Jami berildi', val: totalPaid.toLocaleString(),                        unit: 'UZS',       color: 'text-emerald-400' },
              { label: 'Jami byudjet', val: totalBudget.toLocaleString(),                      unit: 'UZS',       color: 'text-purple-400'  },
            ].map(s => (
              <div key={s.label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3 text-center">
                <p className="text-[8px] text-slate-500 font-black uppercase mb-1">{s.label}</p>
                <p className={`font-black text-sm leading-tight ${s.color}`}>{s.val}</p>
                <p className="text-[8px] text-slate-600 font-bold mt-0.5">{s.unit}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FILTRLAR ── */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-3">
        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-2">
          <Filter size={11}/> Hisobot filtrlari
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[8px] text-slate-500 font-black uppercase block mb-1.5">Oy filtri</label>
            <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-yellow-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm outline-none transition-all"/>
          </div>
          <div>
            <label className="text-[8px] text-slate-500 font-black uppercase block mb-1.5">Obyekt filtri</label>
            <select value={filterObj} onChange={e => setFilterObj(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-yellow-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm outline-none transition-all">
              <option value="">— Barcha obyektlar —</option>
              {objects.map(o => <option key={o._id||o.id} value={o._id||o.id}>{o.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── KATEGORIYALAR ── */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map(cat => (
          <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-[9px] uppercase whitespace-nowrap transition-all active:scale-95 shrink-0 ${
              activeCategory === cat.key
                ? 'bg-yellow-500 text-slate-950'
                : 'bg-slate-950 border border-slate-800 text-slate-500 hover:text-white hover:border-slate-600'
            }`}>
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* ── HISOBOTLAR GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map(report => {
          const isLoading = downloading === report.id;
          const iconCls   = colorMap[report.color] || colorMap.slate;
          const btnCls    = btnColor[report.color]  || btnColor.slate;
          return (
            <div key={report.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 hover:border-slate-700 transition-all">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border ${iconCls}`}>
                  {report.icon}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {report.badge && (
                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-full border ${
                      report.badge === 'PRO' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-slate-700/50 border-slate-600 text-slate-400'
                    }`}>{report.badge}</span>
                  )}
                  <span className="text-[7px] font-black px-1.5 py-0.5 rounded border bg-slate-900 border-slate-700 text-slate-500">
                    {report.format}
                  </span>
                </div>
              </div>
              <h3 className="text-white font-black text-sm mb-1">{report.title}</h3>
              <p className="text-slate-500 text-[10px] font-bold leading-relaxed mb-3">{report.desc}</p>
              {report.count !== null && (
                <div className="mb-3 flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${iconCls.split(' ')[2].replace('text-', 'bg-')}`}/>
                  <span className="text-[9px] text-slate-500 font-bold">{report.count} ta yozuv</span>
                </div>
              )}
              <button onClick={() => handleDownload(report)} disabled={!!downloading}
                className={`w-full py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-lg text-white ${btnCls}`}>
                {isLoading
                  ? <><Clock size={13} className="animate-spin"/> Tayyorlanmoqda...</>
                  : <><Download size={13}/> Yuklab olish</>
                }
              </button>
            </div>
          );
        })}
      </div>

      {/* ── HAMMASINI BITTA XLSX GA ── */}
      <div className="bg-gradient-to-r from-yellow-500/5 via-slate-950 to-slate-950 border border-yellow-500/20 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-white font-black text-sm mb-0.5">
              🗂 Barcha hisobotlarni yuklab olish
            </h3>
            <p className="text-slate-500 text-[10px] font-bold">
              {reports.filter(r => r.format !== 'JSON').length} ta hisobot •{' '}
              <span className="text-emerald-400 font-black">bitta XLSX fayl</span> •{' '}
              har biri alohida sheet
            </p>
          </div>
          <button
            onClick={downloadAllAsOneXLSX}
            disabled={!!downloading}
            className="px-6 py-3 bg-yellow-500 hover:bg-yellow-400 active:scale-95 disabled:opacity-50 text-slate-950 font-black rounded-xl text-[10px] uppercase flex items-center gap-2 transition-all shadow-lg shadow-yellow-500/20 shrink-0"
          >
            {downloading === 'all'
              ? <><Clock size={14} className="animate-spin"/> Yuklanmoqda...</>
              : <><Download size={14}/> Barcha_Hisobotlar.xlsx</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default Excel;