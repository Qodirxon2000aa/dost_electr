import React, { useState, useMemo } from 'react';
import {
  Banknote, Trash2, DollarSign, CheckCircle, Calendar,
  ChevronDown, UserCheck, X, Award, Building2, Users,
  BarChart3, ClipboardList, Plus
} from 'lucide-react';
import { api } from '../utils/api';

const MONTH_LABELS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentyabr','Oktyabr','Noyabr','Dekabr'];
const MONTH_SHORT  = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];

const Payroll = ({ employees, attendance, payroll, objects = [], onLog, onRefresh }) => {
  const [activeTab, setActiveTab]               = useState('salary');
  const [financeView, setFinanceView]           = useState('overview');
  const [selectedMonth, setSelectedMonth]       = useState(new Date().toISOString().slice(0, 7));
  const [expandedMonth, setExpandedMonth]       = useState(null);
  const [expandedObject, setExpandedObject]     = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const [showSalaryModal, setShowSalaryModal]   = useState(false);
  const [salaryEmp, setSalaryEmp]               = useState(null);
  const [salaryAmount, setSalaryAmount]         = useState('');
  const [salaryObjectId, setSalaryObjectId]     = useState('');
  const [salaryLoading, setSalaryLoading]       = useState(false);

  /* ══════════════════════════════════════
     DAVOMAT+ STATE
  ══════════════════════════════════════ */
  const [manualEmpId,   setManualEmpId]   = useState('');
  const [manualObjId,   setManualObjId]   = useState('');
  const [manualDate,    setManualDate]    = useState(new Date().toISOString().split('T')[0]);
  const [manualLoading, setManualLoading] = useState(false);
  const [manualMsg,     setManualMsg]     = useState(null); // { type:'ok'|'err', text }

  const pendingAttendance = attendance.filter(a => a.status === 'PENDING');

  /* ── HISOB-KITOBLAR ── */
  const approvedPayroll = useMemo(() => payroll.filter(p => p.status === 'APPROVED'), [payroll]);

  const currentMonthPayroll = useMemo(() =>
    approvedPayroll.filter(p => p.month === selectedMonth),
  [approvedPayroll, selectedMonth]);

  const currentMonthTotal = useMemo(() =>
    currentMonthPayroll.reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0),
  [currentMonthPayroll]);

  const allTimeTotal = useMemo(() =>
    approvedPayroll.reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0),
  [approvedPayroll]);

  const objectStats = useMemo(() => {
    return objects.map(obj => {
      const objId    = obj._id || obj.id;
      const payments = approvedPayroll.filter(p =>
        String(p.objectId?._id || p.objectId) === String(objId)
      );
      const total      = payments.reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
      const budget     = Number(obj.totalBudget) || 0;
      const balance    = budget - total;
      const empIds     = [...new Set(payments.map(p => String(p.employeeId?._id || p.employeeId)))];
      const pct        = budget > 0 ? Math.min(Math.round((total / budget) * 100), 100) : 0;
      const isNegative = budget > 0 && balance < 0;
      return { obj, objId, total, budget, balance, empIds, pct, isNegative, payments };
    }).sort((a, b) => b.total - a.total);
  }, [objects, approvedPayroll]);

  const employeeStats = useMemo(() => {
    return employees
      .filter(e => e.status === 'ACTIVE')
      .map(emp => {
        const empId    = emp._id || emp.id;
        const payments = approvedPayroll.filter(p =>
          String(p.employeeId?._id || p.employeeId) === String(empId)
        );
        const totalTaken  = payments.reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
        const workedDays  = attendance.filter(a =>
          String(a.employeeId?._id || a.employeeId) === String(empId) && a.status === 'PRESENT'
        ).length;
        const totalEarned = workedDays * (Number(emp.salaryRate) || 0);
        const remaining   = totalEarned - totalTaken;
        const objNames    = [...new Set(payments.map(p => p.objectName).filter(Boolean))];
        return { emp, empId, totalTaken, totalEarned, remaining, workedDays, objNames, payments };
      })
      .sort((a, b) => b.totalTaken - a.totalTaken);
  }, [employees, attendance, approvedPayroll]);

  const topEmployee = employeeStats[0] || null;
  const topObject   = objectStats[0]   || null;

  const filteredHistoryByDate = useMemo(() => {
    const filtered = approvedPayroll.filter(p => {
      if (!selectedEmployee) return true;
      return String(p.employeeId?._id || p.employeeId) === String(selectedEmployee);
    });
    const grouped = {};
    filtered.forEach(p => {
      const key = p.date || p.month || "Noma'lum";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });
    return Object.entries(grouped).sort(([a], [b]) => b.localeCompare(a));
  }, [approvedPayroll, selectedEmployee]);

  const selectedEmpStats = useMemo(() => {
    if (!selectedEmployee) return null;
    return employeeStats.find(s => String(s.empId) === String(selectedEmployee)) || null;
  }, [selectedEmployee, employeeStats]);

  /* Tanlangan xodimning o'sha kundagi davomati */
  const manualExistingAtt = useMemo(() => {
    if (!manualEmpId || !manualDate) return null;
    return attendance.find(a =>
      String(a.employeeId?._id || a.employeeId) === String(manualEmpId) &&
      a.date === manualDate
    ) || null;
  }, [attendance, manualEmpId, manualDate]);

  /* Ko'rsatiladigan kundagi barcha davomat */
  const manualDateAtts = useMemo(() => {
    if (!manualDate) return [];
    return [...attendance]
      .filter(a => a.date === manualDate)
      .sort((a, b) => (a.status === 'PRESENT' ? -1 : 1));
  }, [attendance, manualDate]);

  const getEmpBalance = (emp) => {
    const empId      = emp._id || emp.id;
    const dailyRate  = Number(emp.salaryRate) || 0;
    const workedDays = attendance.filter(a => {
      const aId = a.employeeId?._id || a.employeeId;
      return String(aId) === String(empId) && a.status === 'PRESENT';
    }).length;
    const totalEarned = workedDays * dailyRate;
    const totalTaken  = approvedPayroll.filter(p => {
      const pId = p.employeeId?._id || p.employeeId;
      return String(pId) === String(empId);
    }).reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
    return { workedDays, totalEarned, totalTaken, remaining: totalEarned - totalTaken, dailyRate };
  };

  const openSalaryModal = (emp) => {
    setSalaryEmp(emp); setSalaryAmount(''); setSalaryObjectId(''); setShowSalaryModal(true);
  };
  const closeSalaryModal = () => {
    setShowSalaryModal(false); setSalaryEmp(null); setSalaryAmount(''); setSalaryObjectId('');
  };

  const handleGiveSalary = async () => {
    if (!salaryEmp || !salaryAmount || Number(salaryAmount) <= 0) return alert("Summani kiriting!");
    if (!salaryObjectId) return alert("Obyektni tanlang!");
    setSalaryLoading(true);
    try {
      const today   = new Date().toISOString().split('T')[0];
      const objName = objects.find(o => (o._id || o.id) === salaryObjectId)?.name || '';
      await api.createPayroll({
        employeeId: salaryEmp._id || salaryEmp.id, employeeName: salaryEmp.name,
        calculatedSalary: Number(salaryAmount), amount: Number(salaryAmount),
        date: today, month: today.slice(0, 7), type: 'DAILY_PAY',
        status: 'APPROVED', paymentStatus: 'paid',
        objectId: salaryObjectId, objectName: objName,
      });
      onLog(`${salaryEmp.name}ga ${Number(salaryAmount).toLocaleString()} UZS oylik berildi (${objName})`);
      closeSalaryModal(); onRefresh();
    } catch (err) { alert('Xatolik: ' + err.message); }
    finally { setSalaryLoading(false); }
  };

  const handleApproveAttendance = async (id) => {
    try { await api.approveAttendance(id); onLog("Davomat tasdiqlandi."); onRefresh(); }
    catch { alert("Xatolik!"); }
  };

  const handleRejectPayroll = async (id) => {
    if (!window.confirm("O'chirilsinmi?")) return;
    try { await api.deletePayroll(id); onLog("To'lov o'chirildi."); onRefresh(); }
    catch { alert("Xatolik!"); }
  };

  const handleRejectAttendance = async (id) => {
    if (!window.confirm("O'chirilsinmi?")) return;
    try { await api.deleteAttendance(id); onLog("Davomat o'chirildi."); onRefresh(); }
    catch { alert("Xatolik!"); }
  };

  /* ══════════════════════════════════════
     ADMIN — MANUAL DAVOMAT QO'SHISH
  ══════════════════════════════════════ */
  const handleManualAttendance = async () => {
    if (!manualEmpId) return setManualMsg({ type: 'err', text: "Xodimni tanlang!" });
    if (!manualObjId) return setManualMsg({ type: 'err', text: "Obyektni tanlang!" });
    if (!manualDate)  return setManualMsg({ type: 'err', text: "Sanani kiriting!" });

    setManualLoading(true);
    setManualMsg(null);
    try {
      const emp     = employees.find(e => (e._id || e.id) === manualEmpId);
      const obj     = objects.find(o => (o._id || o.id) === manualObjId);
      const objName = obj?.name || '';

      await api.upsertAttendance({
        employeeId: manualEmpId,
        objectId:   manualObjId,
        objectName: objName,
        date:       manualDate,
        status:     'PRESENT',   // to'g'ridan-to'g'ri PRESENT — so'rovsiz
        markedBy:   'admin',
      });

      onLog(`${emp?.name || ''} — ${manualDate} (${objName}) admin tomonidan qo'shildi`);
      setManualMsg({ type: 'ok', text: `✅ ${emp?.name} — ${manualDate} muvaffaqiyatli tasdiqlandi` });
      setManualEmpId('');
      setManualObjId('');
      onRefresh();
    } catch (err) {
      setManualMsg({ type: 'err', text: err.message });
    } finally {
      setManualLoading(false);
    }
  };

  const changeYear = (delta) => {
    const [year, month] = selectedMonth.split('-');
    const newYear = Number(year) + delta;
    if (newYear > new Date().getFullYear()) return;
    setSelectedMonth(`${newYear}-${month}`);
  };

  const selectedYear     = selectedMonth.slice(0, 4);
  const selectedMonthIdx = Number(selectedMonth.slice(5, 7)) - 1;

  return (
    <div className="space-y-4 pb-10">

      {/* ══════════════════════════════════════
          TAB NAVIGATSIYA
      ══════════════════════════════════════ */}
      <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-xl gap-1">
        <TabBtn active={activeTab === 'salary'}     onClick={() => setActiveTab('salary')}
          icon={<Banknote size={14}/>}       label="Oylik" />
        <TabBtn active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')}
          icon={<CheckCircle size={14}/>}    label="Davomat" badge={pendingAttendance.length} />
        <TabBtn active={activeTab === 'manual'}     onClick={() => setActiveTab('manual')}
          icon={<ClipboardList size={14}/>}  label="Davomat+" accent />
        <TabBtn active={activeTab === 'finance'}    onClick={() => setActiveTab('finance')}
          icon={<DollarSign size={14}/>}     label="Moliya" />
      </div>

      {/* ══════════════════════════════════════
          OYLIK BERISH
      ══════════════════════════════════════ */}
      {activeTab === 'salary' && (
        <div className="space-y-3">
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="text-yellow-500 shrink-0" size={18}/>
              <div>
                <h2 className="text-white font-black italic uppercase text-sm">Oylik Berish</h2>
                <p className="text-slate-500 text-[9px] font-black uppercase">Xodimni tanlang va oylik bering</p>
              </div>
            </div>
          </div>
          {employees.filter(e => e.status === 'ACTIVE').length === 0 ? (
            <Empty text="Faol xodimlar yo'q"/>
          ) : employees.filter(e => e.status === 'ACTIVE').map(emp => {
            const bal = getEmpBalance(emp);
            return (
              <div key={emp._id || emp.id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-500 font-black text-base">
                      {emp.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-black italic uppercase text-sm truncate">{emp.name}</p>
                      <p className="text-slate-500 text-[9px] font-bold uppercase">{emp.position}</p>
                    </div>
                  </div>
                  <button onClick={() => openSalaryModal(emp)}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-slate-950 font-black rounded-xl text-[10px] uppercase transition-all shrink-0 ml-3 shadow-md shadow-yellow-500/20">
                    💵 Berish
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label:'Ish kunlari', val:bal.workedDays,                   unit:'kun', color:'text-white'       },
                    { label:'Hisoblangan', val:bal.totalEarned.toLocaleString(), unit:'UZS', color:'text-emerald-500' },
                    { label:'Qoldiq',      val:bal.remaining.toLocaleString(),   unit:'UZS', color:bal.remaining>=0?'text-yellow-500':'text-rose-500' },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-center">
                      <p className="text-[8px] text-slate-500 font-black uppercase mb-0.5">{s.label}</p>
                      <p className={`font-black text-sm leading-tight ${s.color}`}>{s.val}</p>
                      <p className="text-[8px] text-slate-600">{s.unit}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════
          DAVOMAT — PENDING SO'ROVLAR
      ══════════════════════════════════════ */}
      {activeTab === 'attendance' && (
        <div className="space-y-3">
          {pendingAttendance.length === 0 ? (
            <Empty text="Yangi davomat so'rovi yo'q"/>
          ) : pendingAttendance.map(a => {
            const id  = a._id || a.id;
            const emp = employees.find(e =>
              String(e._id || e.id) === String(a.employeeId?._id || a.employeeId)
            );
            return (
              <div key={id} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-white font-black italic truncate">{emp?.name || "Noma'lum"}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[9px] text-blue-400 font-black uppercase bg-blue-500/10 px-2 py-0.5 rounded">
                        {a.objectName || '—'}
                      </span>
                      <span className="text-[9px] text-slate-500 font-bold">{a.date}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-3 shrink-0">
                    <button onClick={() => handleApproveAttendance(id)}
                      className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white active:scale-95 transition-all">
                      <CheckCircle size={18}/>
                    </button>
                    <button onClick={() => handleRejectAttendance(id)}
                      className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white active:scale-95 transition-all">
                      <Trash2 size={18}/>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════
          DAVOMAT+ — ADMIN MANUAL QO'SHISH
      ══════════════════════════════════════ */}
      {activeTab === 'manual' && (
        <div className="space-y-3">

          {/* Header */}
          <div className="bg-slate-950 rounded-2xl border border-emerald-500/20 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 shrink-0 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center">
                <ClipboardList className="text-emerald-500" size={18}/>
              </div>
              <div>
                <h2 className="text-white font-black italic uppercase text-sm">Davomat Qo'shish</h2>
                <p className="text-slate-500 text-[9px] font-black uppercase tracking-wide">
                  So'rovsiz — admin to'g'ridan-to'g'ri tasdiqlaydi
                </p>
              </div>
            </div>
          </div>

          {/* ── FORM ── */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-3 shadow-xl">

            {/* Xodim */}
            <div>
              <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest block mb-1.5">
                Xodim
              </label>
              <select
                value={manualEmpId}
                onChange={e => { setManualEmpId(e.target.value); setManualMsg(null); }}
                className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 text-white px-4 py-3 rounded-xl font-bold text-sm outline-none transition-all"
              >
                <option value="">— Xodimni tanlang —</option>
                {employees.filter(e => e.status === 'ACTIVE').map(e => (
                  <option key={e._id || e.id} value={e._id || e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            {/* Obyekt */}
            <div>
              <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest block mb-1.5">
                Obyekt
              </label>
              <select
                value={manualObjId}
                onChange={e => { setManualObjId(e.target.value); setManualMsg(null); }}
                className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 text-white px-4 py-3 rounded-xl font-bold text-sm outline-none transition-all"
              >
                <option value="">— Obyektni tanlang —</option>
                {objects.map(o => (
                  <option key={o._id || o.id} value={o._id || o.id}>{o.name}</option>
                ))}
              </select>
            </div>

           {/* Sana */}
<div>
  <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest block mb-1.5">
    Sana
  </label>
  <input
    type="date"
    value={manualDate}
    // max olib tashlandi → endi kelajak sanani ham tanlash mumkin
    onChange={e => {
      setManualDate(e.target.value);
      setManualMsg(null);
    }}
    className="w-full bg-slate-900 border border-slate-700 
               focus:border-slate-500 focus:ring-0
               text-white px-4 py-3 rounded-xl 
               font-bold text-sm outline-none transition-colors"
  />
</div>

            {/* Tanlangan xodimning o'sha kundagi holati */}
            {manualExistingAtt && (
              <div className={`rounded-xl px-4 py-3 border font-bold text-sm ${
                manualExistingAtt.status === 'PRESENT'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
              }`}>
                {manualExistingAtt.status === 'PRESENT'
                  ? `✅ Bu xodim ${manualDate} kuni allaqachon tasdiqlangan — ${manualExistingAtt.objectName || ''}`
                  : `⏳ Bu xodim so'rov yuborgan (${manualExistingAtt.objectName || ''}) — "Tasdiqlash" bosib yangilang`
                }
              </div>
            )}

            {/* Natija xabar */}
            {manualMsg && (
              <div className={`rounded-xl px-4 py-3 border font-bold text-sm ${
                manualMsg.type === 'ok'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {manualMsg.text}
              </div>
            )}

            {/* Tugma */}
            <button
              onClick={handleManualAttendance}
              disabled={manualLoading || !manualEmpId || !manualObjId || !manualDate}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all uppercase tracking-widest text-sm shadow-lg shadow-emerald-500/10 flex items-center justify-center gap-2"
            >
              {manualLoading
                ? 'Saqlanmoqda...'
                : <><Plus size={16}/> Davomatni Tasdiqlash</>
              }
            </button>
          </div>

          {/* ── KUN DAVOMATI RO'YXATI ── */}
          {manualDateAtts.length > 0 && (
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-white font-black uppercase text-xs italic">
                  📅 {manualDate} — Davomat
                </h3>
                <div className="flex gap-2">
                  <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                    {manualDateAtts.filter(a => a.status === 'PRESENT').length} keldi
                  </span>
                  {manualDateAtts.filter(a => a.status === 'PENDING').length > 0 && (
                    <span className="text-[8px] font-black text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/20">
                      {manualDateAtts.filter(a => a.status === 'PENDING').length} kutilmoqda
                    </span>
                  )}
                </div>
              </div>
              <div className="divide-y divide-slate-900 max-h-[380px] overflow-y-auto">
                {manualDateAtts.map(a => {
                  const id  = a._id || a.id;
                  const emp = employees.find(e =>
                    String(e._id || e.id) === String(a.employeeId?._id || a.employeeId)
                  );
                  return (
                    <div key={id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-900/20 transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center font-black text-sm border ${
                          a.status === 'PRESENT'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                            : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                        }`}>
                          {emp?.name?.[0] || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white font-black text-sm truncate">{emp?.name || "Noma'lum"}</p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {a.objectName && (
                              <span className="text-[7px] text-blue-400 font-black bg-blue-500/10 px-1.5 py-0.5 rounded">
                                {a.objectName}
                              </span>
                            )}
                            <span className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded ${
                              a.status === 'PRESENT'
                                ? 'text-emerald-500 bg-emerald-500/10'
                                : 'text-yellow-500 bg-yellow-500/10'
                            }`}>
                              {a.status === 'PRESENT' ? '✅ Tasdiqlandi' : '⏳ Kutilmoqda'}
                            </span>
                            {a.markedBy === 'admin' && (
                              <span className="text-[7px] text-purple-400 font-black bg-purple-500/10 px-1.5 py-0.5 rounded">
                                👤 Admin
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0 ml-2">
                        {a.status === 'PENDING' && (
                          <button
                            onClick={() => handleApproveAttendance(id)}
                            className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white active:scale-95 transition-all"
                            title="Tasdiqlash"
                          >
                            <CheckCircle size={15}/>
                          </button>
                        )}
                        <button
                          onClick={() => handleRejectAttendance(id)}
                          className="p-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 hover:text-white active:scale-95 transition-all"
                          title="O'chirish"
                        >
                          <Trash2 size={15}/>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          MOLIYA
      ══════════════════════════════════════ */}
      {activeTab === 'finance' && (
        <div className="space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-yellow-500/10 to-slate-950 p-4 rounded-2xl border border-yellow-500/20 shadow-xl">
              <p className="text-[8px] text-yellow-500/70 font-black uppercase tracking-widest mb-1">Jami to'lovlar</p>
              <p className="text-2xl font-black text-yellow-500 italic leading-tight">{allTimeTotal.toLocaleString()}</p>
              <p className="text-[9px] text-slate-500 font-bold mt-0.5">UZS — barcha vaqt</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-slate-950 p-4 rounded-2xl border border-blue-500/20 shadow-xl">
              <p className="text-[8px] text-blue-400/70 font-black uppercase tracking-widest mb-1">Jami tranzaksiya</p>
              <p className="text-2xl font-black text-blue-400 italic leading-tight">{approvedPayroll.length}</p>
              <p className="text-[9px] text-slate-500 font-bold mt-0.5">ta to'lov amalga oshirildi</p>
            </div>
          </div>

          {(topEmployee || topObject) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {topEmployee && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/20 shadow-xl relative overflow-hidden">
                  <div className="absolute top-2 right-3 text-amber-500/10 text-6xl font-black leading-none select-none">🏆</div>
                  <div className="flex items-center gap-2 mb-3">
                    <Award className="text-amber-500 shrink-0" size={14}/>
                    <p className="text-[8px] text-amber-500 font-black uppercase tracking-widest">Eng ko'p olgan xodim</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 shrink-0 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center text-amber-500 font-black text-base">
                      {topEmployee.emp.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-black text-sm truncate">{topEmployee.emp.name}</p>
                      <p className="text-amber-500 font-black text-base italic">{topEmployee.totalTaken.toLocaleString()} UZS</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-1 flex-wrap">
                    {topEmployee.objNames.map((n, i) => (
                      <span key={i} className="text-[8px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded font-bold">{n}</span>
                    ))}
                  </div>
                </div>
              )}
              {topObject && topObject.total > 0 && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-purple-500/20 shadow-xl relative overflow-hidden">
                  <div className="absolute top-2 right-3 text-purple-500/10 text-6xl font-black leading-none select-none">🏗</div>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="text-purple-400 shrink-0" size={14}/>
                    <p className="text-[8px] text-purple-400 font-black uppercase tracking-widest">Eng ko'p xarajat qilingan</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 shrink-0 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 font-black text-base">
                      {topObject.obj.name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-black text-sm truncate">{topObject.obj.name}</p>
                      <p className="text-purple-400 font-black text-base italic">{topObject.total.toLocaleString()} UZS</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-[8px] text-slate-500 font-bold">{topObject.empIds.length} ta xodimga berildi</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 overflow-x-auto">
            {[
              { key:'overview',   icon:<BarChart3 size={12}/>, label:'Oy tahlili' },
              { key:'byObject',   icon:<Building2 size={12}/>, label:'Obyektlar'  },
              { key:'byEmployee', icon:<Users size={12}/>,     label:'Xodimlar'   },
              { key:'history',    icon:<Calendar size={12}/>,  label:'Tarix'      },
            ].map(({ key, icon, label }) => (
              <button key={key} onClick={() => setFinanceView(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-black text-[9px] uppercase transition-all whitespace-nowrap ${
                  financeView === key ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-900'
                }`}>
                {icon} {label}
              </button>
            ))}
          </div>

          {/* OY TAHLILI */}
          {financeView === 'overview' && (
            <div className="space-y-4">
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 shadow-xl">
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-3">Oy tanlang</p>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {MONTH_SHORT.map((label, i) => {
                    const val        = `${selectedYear}-${String(i+1).padStart(2,'0')}`;
                    const isSelected = selectedMonth === val;
                    const monthTotal = approvedPayroll.filter(p => p.month === val)
                      .reduce((s,p) => s+(Number(p.calculatedSalary)||0), 0);
                    return (
                      <button key={i} onClick={() => setSelectedMonth(val)}
                        className={`py-2 rounded-xl text-[10px] font-black transition-all active:scale-95 relative ${
                          isSelected ? 'bg-yellow-500 text-slate-950' : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'
                        }`}>
                        {label}
                        {monthTotal > 0 && !isSelected && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full"/>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-4">
                  <button onClick={() => changeYear(-1)} className="w-8 h-8 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white font-black active:scale-95 transition-all">‹</button>
                  <span className="text-white font-black text-sm">{selectedYear}</span>
                  <button onClick={() => changeYear(1)} disabled={Number(selectedYear) >= new Date().getFullYear()} className="w-8 h-8 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 font-black active:scale-95 transition-all">›</button>
                </div>
              </div>

              <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 bg-slate-900/30">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="text-yellow-500 shrink-0" size={18}/>
                      <div>
                        <h2 className="text-white font-black italic uppercase text-sm">{MONTH_LABELS[selectedMonthIdx]} {selectedYear}</h2>
                        <p className="text-slate-500 text-[9px] font-black uppercase">{currentMonthPayroll.length} ta to'lov</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-500 font-black uppercase">Jami</p>
                      <p className="text-lg font-black text-yellow-500 italic leading-tight">{currentMonthTotal.toLocaleString()} <span className="text-[10px] text-slate-500">UZS</span></p>
                    </div>
                  </div>
                </div>
                {currentMonthPayroll.length > 0 && (() => {
                  const empMonthMap = {};
                  currentMonthPayroll.forEach(p => {
                    const name = p.employeeName || '?';
                    if (!empMonthMap[name]) empMonthMap[name] = { total:0, objs:new Set() };
                    empMonthMap[name].total += Number(p.calculatedSalary)||0;
                    if (p.objectName) empMonthMap[name].objs.add(p.objectName);
                  });
                  const sorted = Object.entries(empMonthMap).sort(([,a],[,b]) => b.total - a.total);
                  const maxVal = sorted[0]?.[1].total || 1;
                  return (
                    <div className="p-4 space-y-2">
                      <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-3">Bu oy xodimlar reytingi</p>
                      {sorted.map(([name, data], i) => (
                        <div key={name} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`text-[8px] font-black w-4 shrink-0 ${i===0?'text-yellow-500':i===1?'text-slate-400':i===2?'text-amber-700':'text-slate-600'}`}>#{i+1}</span>
                              <span className="text-white font-black text-xs truncate">{name}</span>
                              <div className="flex gap-1 flex-wrap">
                                {[...data.objs].map((o,j) => <span key={j} className="text-[7px] text-blue-400 bg-blue-500/10 px-1 rounded font-bold">{o}</span>)}
                              </div>
                            </div>
                            <span className="text-yellow-500 font-black text-xs shrink-0 ml-2">{data.total.toLocaleString()}</span>
                          </div>
                          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${i===0?'bg-yellow-500':'bg-slate-600'}`} style={{width:`${(data.total/maxVal)*100}%`}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div className="divide-y divide-slate-900 max-h-[300px] overflow-y-auto">
                  {currentMonthPayroll.length === 0
                    ? <div className="py-12 text-center text-slate-700 font-black uppercase text-xs">Bu oyda to'lovlar yo'q</div>
                    : currentMonthPayroll.map(rec => {
                      const id = rec._id || rec.id;
                      return (
                        <div key={id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-900/20 transition-colors">
                          <div className="min-w-0 flex-1">
                            <p className="text-white font-black italic uppercase text-sm truncate">{rec.employeeName}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[9px] text-slate-500">{rec.date || rec.month}</span>
                              {rec.objectName && <span className="text-[9px] text-blue-400 font-black bg-blue-500/10 px-1.5 py-0.5 rounded">{rec.objectName}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-3 shrink-0">
                            <p className="text-base font-black text-emerald-500 italic">
                              {(Number(rec.calculatedSalary)||0).toLocaleString()}
                              <span className="text-[9px] text-slate-600 ml-1 not-italic">UZS</span>
                            </p>
                            <button onClick={() => handleRejectPayroll(id)} className="text-slate-700 hover:text-rose-500 active:scale-95 transition-colors"><Trash2 size={16}/></button>
                          </div>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
            </div>
          )}

          {/* OBYEKTLAR */}
          {financeView === 'byObject' && (
            <div className="space-y-3">
              {objectStats.filter(s => s.total > 0 || s.budget > 0).length === 0
                ? <Empty text="Hali to'lovlar yo'q"/>
                : objectStats.map(({ obj, objId, total, budget, balance, empIds, pct, isNegative, payments }) => {
                  const isExpanded = expandedObject === objId;
                  const empBreakdown = (() => {
                    const map = {};
                    payments.forEach(p => { const n=p.employeeName||'?'; if(!map[n])map[n]=0; map[n]+=Number(p.calculatedSalary)||0; });
                    return Object.entries(map).sort(([,a],[,b]) => b-a);
                  })();
                  return (
                    <div key={objId} className={`bg-slate-950 border rounded-2xl transition-all ${isNegative?'border-rose-500/30':isExpanded?'border-blue-500/30':'border-slate-800'}`}>
                      <button onClick={() => setExpandedObject(isExpanded?null:objId)} className="w-full p-4 text-left">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border font-black text-base ${isNegative?'bg-rose-500/10 border-rose-500/20 text-rose-500':'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>{obj.name[0]}</div>
                            <div className="min-w-0">
                              <p className="text-white font-black text-sm truncate">{obj.name}</p>
                              <p className="text-slate-500 text-[9px] font-bold">{empIds.length} ta xodim • {payments.length} ta to'lov</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-white font-black text-sm italic">{total.toLocaleString()}</p>
                              <p className="text-[8px] text-slate-600">UZS berildi</p>
                            </div>
                            <ChevronDown size={14} className={`text-slate-500 transition-transform ${isExpanded?'rotate-180':''}`}/>
                          </div>
                        </div>
                        {budget > 0 && (
                          <>
                            <div className="grid grid-cols-3 gap-2 mb-2">
                              {[
                                {label:'Byudjet', val:budget.toLocaleString(), cls:'text-white', bg:'bg-slate-900/60 border-slate-800'},
                                {label:'Xarajat', val:total.toLocaleString(),  cls:'text-yellow-500', bg:'bg-slate-900/60 border-slate-800'},
                                {label:'Qoldiq',  val:(isNegative?'−':'')+Math.abs(balance).toLocaleString(), cls:isNegative?'text-rose-500':'text-emerald-500', bg:isNegative?'bg-rose-500/10 border-rose-500/20':'bg-emerald-500/10 border-emerald-500/20'},
                              ].map(s => (
                                <div key={s.label} className={`p-2 rounded-xl border text-center ${s.bg}`}>
                                  <p className="text-[7px] text-slate-500 font-black uppercase mb-0.5">{s.label}</p>
                                  <p className={`font-black text-xs ${s.cls}`}>{s.val}</p>
                                </div>
                              ))}
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${isNegative?'bg-rose-500':'bg-blue-500'}`} style={{width:`${isNegative?100:pct}%`}}/>
                            </div>
                            <p className="text-[8px] text-slate-600 font-bold mt-1">{pct}% ishlatildi {isNegative&&'⚠ Limit oshdi'}</p>
                          </>
                        )}
                      </button>
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-2">
                          <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Xodimlar bo'yicha taqsimot</p>
                          {empBreakdown.map(([name, amount]) => {
                            const ep = total > 0 ? Math.round((amount/total)*100) : 0;
                            return (
                              <div key={name} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 shrink-0 bg-slate-800 rounded-lg flex items-center justify-center text-yellow-500 font-black text-[10px] border border-slate-700">{name[0]}</div>
                                    <span className="text-white font-black text-xs truncate">{name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 ml-2">
                                    <span className="text-[9px] text-slate-500 font-bold">{ep}%</span>
                                    <span className="text-emerald-500 font-black text-xs">{amount.toLocaleString()} UZS</span>
                                  </div>
                                </div>
                                <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full" style={{width:`${ep}%`}}/>
                                </div>
                              </div>
                            );
                          })}
                          <div className="mt-3 pt-3 border-t border-slate-800">
                            <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-2">So'nggi to'lovlar</p>
                            <div className="space-y-1 max-h-[200px] overflow-y-auto">
                              {[...payments].reverse().slice(0,10).map(p => (
                                <div key={p._id||p.id} className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-slate-900/30">
                                  <div className="min-w-0">
                                    <p className="text-white font-black text-xs truncate">{p.employeeName}</p>
                                    <p className="text-slate-600 text-[8px] font-bold">{p.date}</p>
                                  </div>
                                  <p className="text-yellow-500 font-black text-xs shrink-0 ml-2">{(Number(p.calculatedSalary)||0).toLocaleString()} UZS</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              }
            </div>
          )}

          {/* XODIMLAR */}
          {financeView === 'byEmployee' && (
            <div className="space-y-3">
              {employeeStats.length === 0
                ? <Empty text="Faol xodimlar yo'q"/>
                : employeeStats.map(({ emp, empId, totalTaken, totalEarned, remaining, workedDays, objNames, payments }, idx) => {
                  const earnedPct = totalEarned > 0 ? Math.min(Math.round((totalTaken/totalEarned)*100),100) : 0;
                  const objBreakdown = (() => {
                    const map = {};
                    payments.forEach(p => { const n=p.objectName||'Belgilanmagan'; if(!map[n])map[n]=0; map[n]+=Number(p.calculatedSalary)||0; });
                    return Object.entries(map).sort(([,a],[,b]) => b-a);
                  })();
                  return (
                    <div key={empId} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-black text-base border ${idx===0?'bg-amber-500/10 border-amber-500/20 text-amber-500':idx===1?'bg-slate-400/10 border-slate-400/20 text-slate-400':'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'}`}>{emp.name[0]}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-white font-black italic uppercase text-sm truncate">{emp.name}</p>
                            {idx < 3 && <span className="text-[8px]">{idx===0?'🥇':idx===1?'🥈':'🥉'}</span>}
                          </div>
                          <p className="text-slate-500 text-[9px] font-bold uppercase">{emp.position} • {workedDays} kun</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-yellow-500 font-black text-base italic leading-tight">{totalTaken.toLocaleString()}</p>
                          <p className="text-[8px] text-slate-600">UZS oldi</p>
                        </div>
                      </div>
                      <div className="mb-3 space-y-1">
                        <div className="flex justify-between text-[8px] font-black uppercase">
                          <span className="text-slate-500">Olingan / Hisoblangan</span>
                          <span className={remaining>=0?'text-emerald-500':'text-rose-500'}>Qoldiq: {remaining.toLocaleString()} UZS</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${remaining<0?'bg-rose-500':'bg-emerald-500'}`} style={{width:`${earnedPct}%`}}/>
                        </div>
                        <div className="flex justify-between text-[8px] text-slate-600 font-bold">
                          <span>{earnedPct}% olindi</span>
                          <span>Jami: {totalEarned.toLocaleString()} UZS</span>
                        </div>
                      </div>
                      {objBreakdown.length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[8px] text-slate-500 font-black uppercase tracking-wide">Obyektlar bo'yicha:</p>
                          {objBreakdown.map(([objName, amount]) => {
                            const p2 = totalTaken > 0 ? Math.round((amount/totalTaken)*100) : 0;
                            return (
                              <div key={objName} className="flex items-center gap-2">
                                <span className="text-[8px] text-blue-400 font-black bg-blue-500/10 px-1.5 py-0.5 rounded shrink-0 w-28 truncate">{objName}</span>
                                <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full" style={{width:`${p2}%`}}/>
                                </div>
                                <span className="text-[8px] text-white font-black shrink-0">{amount.toLocaleString()}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              }
            </div>
          )}

          {/* TARIX */}
          {financeView === 'history' && (
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 bg-slate-900/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className="text-blue-500 shrink-0" size={18}/>
                    <div>
                      <h2 className="text-white font-black italic uppercase text-sm">Barcha Tarix</h2>
                      <p className="text-slate-500 text-[9px] font-black uppercase">{approvedPayroll.length} ta</p>
                    </div>
                  </div>
                  <p className="text-yellow-500 font-black text-sm italic">{allTimeTotal.toLocaleString()} <span className="text-[9px] text-slate-500">UZS</span></p>
                </div>
                <select value={selectedEmployee} onChange={e => { setSelectedEmployee(e.target.value); setExpandedMonth(null); }}
                  className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs outline-none focus:border-blue-500 transition-all">
                  <option value="">— Barcha xodimlar —</option>
                  {employees.map(emp => <option key={emp._id||emp.id} value={emp._id||emp.id}>{emp.name}</option>)}
                </select>
              </div>
              {selectedEmpStats && (
                <div className="px-4 py-3 bg-blue-500/5 border-b border-slate-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 shrink-0 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-500 font-black text-base">{selectedEmpStats.emp?.name?.[0]||'?'}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-black uppercase text-sm">{selectedEmpStats.emp?.name}</p>
                      <p className="text-slate-500 text-[9px] font-bold uppercase">{selectedEmpStats.emp?.position}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-yellow-500 font-black text-base italic">{selectedEmpStats.totalTaken.toLocaleString()}</p>
                      <p className="text-[8px] text-slate-500">UZS jami</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      {label:"To'lovlar",   val:`${selectedEmpStats.payments.length} ta`,           color:'text-white'},
                      {label:"Hisoblangan", val:selectedEmpStats.totalEarned.toLocaleString(),       color:'text-emerald-500'},
                      {label:"Qoldiq",      val:selectedEmpStats.remaining.toLocaleString(),         color:selectedEmpStats.remaining>=0?'text-yellow-500':'text-rose-500'},
                    ].map(s => (
                      <div key={s.label} className="bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800 text-center">
                        <p className="text-[7px] text-slate-500 font-black uppercase mb-0.5">{s.label}</p>
                        <p className={`font-black text-xs ${s.color}`}>{s.val}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                {filteredHistoryByDate.length === 0
                  ? <div className="py-16 text-center text-slate-700 font-black uppercase text-xs">To'lovlar tarixi yo'q</div>
                  : filteredHistoryByDate.map(([date, records]) => {
                    const dayTotal   = records.reduce((s,r) => s+(Number(r.calculatedSalary)||0),0);
                    const isExpanded = expandedMonth === date;
                    return (
                      <div key={date} className="border border-slate-800 rounded-xl overflow-hidden">
                        <button onClick={() => setExpandedMonth(isExpanded?null:date)}
                          className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-900/50 hover:bg-slate-900 active:bg-slate-800 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 shrink-0 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
                              <Calendar className="text-blue-500" size={14}/>
                            </div>
                            <div className="text-left">
                              <p className="text-white font-black text-sm">{date}</p>
                              <p className="text-slate-500 text-[9px] font-bold uppercase">{records.length} ta to'lov</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-yellow-500 font-black text-base italic leading-tight">{dayTotal.toLocaleString()}</p>
                              <p className="text-[8px] text-slate-600 font-bold uppercase">UZS</p>
                            </div>
                            <ChevronDown size={16} className={`text-slate-500 transition-transform duration-300 shrink-0 ${isExpanded?'rotate-180':''}`}/>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="divide-y divide-slate-900">
                            {records.map(rec => {
                              const id = rec._id||rec.id;
                              return (
                                <div key={id} className="flex items-center justify-between px-4 py-3 bg-slate-950/60 hover:bg-slate-900/20 transition-colors">
                                  <div className="flex items-center gap-3 min-w-0 flex-1">
                                    <div className="w-7 h-7 shrink-0 bg-slate-800 rounded-lg flex items-center justify-center text-yellow-500 font-black text-xs border border-slate-700">{rec.employeeName?.[0]||'?'}</div>
                                    <div className="min-w-0">
                                      <p className="text-white font-black text-sm uppercase italic truncate">{rec.employeeName}</p>
                                      {rec.objectName && <span className="text-[8px] text-blue-400 font-black bg-blue-500/10 px-1.5 py-0.5 rounded mt-0.5 inline-block">{rec.objectName}</span>}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 ml-2 shrink-0">
                                    <p className="text-emerald-500 font-black text-sm">{(Number(rec.calculatedSalary)||0).toLocaleString()}<span className="text-[9px] text-slate-600 ml-1">UZS</span></p>
                                    <button onClick={() => handleRejectPayroll(id)} className="text-slate-700 hover:text-rose-500 active:scale-95 transition-colors"><Trash2 size={15}/></button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                }
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          OYLIK BERISH MODALI
      ══════════════════════════════════════ */}
      {showSalaryModal && salaryEmp && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center backdrop-blur-md bg-slate-950/80">
          <div className="bg-slate-900 border border-yellow-500/20 rounded-t-[2rem] sm:rounded-[2rem] w-full sm:max-w-md p-6 shadow-2xl max-h-[95vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-xl font-black text-white italic">💵 Oylik Berish</h3>
                <p className="text-slate-500 text-[9px] font-black uppercase mt-0.5">{salaryEmp.name}</p>
              </div>
              <button onClick={closeSalaryModal} className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors">
                <X className="text-slate-400" size={16}/>
              </button>
            </div>
            {(() => {
              const bal = getEmpBalance(salaryEmp);
              return (
                <div className="bg-slate-950 rounded-2xl p-4 mb-4 border border-slate-800 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-[9px] font-black uppercase">Ish kunlari</span>
                    <span className="text-white font-black text-sm">{bal.workedDays} kun</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 text-[9px] font-black uppercase">Hisoblangan</span>
                    <span className="text-emerald-500 font-black text-sm">{bal.totalEarned.toLocaleString()} UZS</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800">
                    <span className="text-slate-500 text-[9px] font-black uppercase">Qoldiq balans</span>
                    <span className={`font-black text-base italic ${bal.remaining>=0?'text-yellow-500':'text-rose-500'}`}>{bal.remaining.toLocaleString()} UZS</span>
                  </div>
                </div>
              );
            })()}
            <div className="mb-4">
              <label className="text-slate-500 text-[9px] font-black uppercase tracking-widest block mb-2">Qaysi obyektdan</label>
              <select value={salaryObjectId} onChange={e => setSalaryObjectId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-yellow-500 text-white px-4 py-3 rounded-2xl font-bold text-sm outline-none transition-all">
                <option value="">— Obyektni tanlang —</option>
                {objects.map(obj => <option key={obj._id||obj.id} value={obj._id||obj.id}>{obj.name}</option>)}
              </select>
              {salaryObjectId && (() => {
                const obj   = objects.find(o => (o._id||o.id) === salaryObjectId);
                if (!obj) return null;
                const budget = Number(obj.totalBudget)||0;
                const spent  = approvedPayroll.filter(p => String(p.objectId?._id||p.objectId)===String(obj._id||obj.id)).reduce((s,p)=>s+(Number(p.calculatedSalary)||0),0);
                const balance = budget-spent; const hasBudget=budget>0; const isNeg=hasBudget&&balance<0;
                const pct = hasBudget?Math.min(Math.round((spent/budget)*100),100):0;
                return (
                  <div className="mt-3 bg-slate-950 rounded-2xl border border-slate-800 p-3 space-y-2">
                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{obj.name} — moliya holati</p>
                    {hasBudget ? (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            {label:'Byudjet',val:budget.toLocaleString(),cls:'text-white',bg:'bg-slate-900/60 border-slate-800'},
                            {label:'Xarajat',val:spent.toLocaleString(), cls:'text-yellow-500',bg:'bg-slate-900/60 border-slate-800'},
                            {label:'Qoldiq', val:(isNeg?'−':'')+Math.abs(balance).toLocaleString(),cls:isNeg?'text-rose-500':'text-emerald-500',bg:isNeg?'bg-rose-500/10 border-rose-500/20':'bg-emerald-500/10 border-emerald-500/20'},
                          ].map(s=><div key={s.label} className={`p-2 rounded-xl border text-center ${s.bg}`}><p className="text-[7px] text-slate-500 font-black uppercase mb-0.5">{s.label}</p><p className={`font-black text-xs ${s.cls}`}>{s.val}</p></div>)}
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden"><div className={`h-full rounded-full ${isNeg?'bg-rose-500':'bg-emerald-500'}`} style={{width:`${isNeg?100:pct}%`}}/></div>
                        <div className="flex justify-between">
                          <span className="text-[8px] text-slate-600 font-bold">{pct}% ishlatildi</span>
                          {isNeg&&<span className="text-[8px] text-rose-500 font-black">⚠ Limit oshdi</span>}
                        </div>
                      </>
                    ) : <p className="text-slate-600 text-[9px] font-black uppercase text-center py-1">Jami xarajat: <span className="text-yellow-500">{spent.toLocaleString()} UZS</span></p>}
                  </div>
                );
              })()}
            </div>
            <div className="mb-4">
              <label className="text-slate-500 text-[9px] font-black uppercase tracking-widest block mb-2">Beriladigan summa (UZS)</label>
              <div className="relative">
                <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500" size={20}/>
                <input autoFocus inputMode="numeric" type="number" min="1"
                  value={salaryAmount} onChange={e => setSalaryAmount(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && handleGiveSalary()}
                  placeholder="0"
                  className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 focus:border-yellow-500 rounded-2xl text-2xl font-black text-white outline-none transition-all"/>
              </div>
            </div>
            {(() => {
              const bal = getEmpBalance(salaryEmp);
              return bal.remaining > 0 ? (
                <div className="grid grid-cols-4 gap-2 mb-5">
                  {[25,50,75,100].map(pct => {
                    const amt = Math.floor(bal.remaining*pct/100);
                    return <button key={pct} onClick={() => setSalaryAmount(String(amt))} className="py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-400 hover:text-white rounded-xl text-[10px] font-black transition-all">{pct}%</button>;
                  })}
                </div>
              ) : <div className="mb-5"/>;
            })()}
            <button onClick={handleGiveSalary}
              disabled={salaryLoading || !salaryAmount || Number(salaryAmount)<=0 || !salaryObjectId}
              className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black rounded-2xl transition-all uppercase tracking-widest text-sm shadow-lg shadow-yellow-500/20">
              {salaryLoading?'Yuborilmoqda...':Number(salaryAmount)>0?`${Number(salaryAmount).toLocaleString()} UZS Berish`:'Oylik Berish'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Yordamchi komponentlar ── */
const TabBtn = ({ active, onClick, icon, label, badge, accent }) => (
  <button onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-3 rounded-xl font-black text-[9px] uppercase transition-all whitespace-nowrap ${
      active
        ? accent ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                 : 'bg-blue-600 text-white shadow-lg'
        : accent ? 'text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/20'
                 : 'text-slate-500 hover:text-white hover:bg-slate-900'
    }`}>
    {icon}
    <span>{label}</span>
    {badge > 0 && (
      <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${active?'bg-white/20 text-white':'bg-yellow-500/20 text-yellow-500'}`}>
        {badge}
      </span>
    )}
  </button>
);

const Empty = ({ text }) => (
  <div className="bg-slate-950 rounded-2xl border border-slate-800 p-12 text-center text-slate-700 font-black uppercase text-xs">
    {text}
  </div>
);

export default Payroll;