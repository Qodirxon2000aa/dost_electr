import React, { useState, useMemo } from 'react';
import { Banknote, Trash2, DollarSign, CheckCircle, Calendar, ChevronDown, UserCheck, X, TrendingUp, Award, Building2, Users, BarChart3, PieChart } from 'lucide-react';
import { api } from '../utils/api';

const MONTH_LABELS = ['Yanvar','Fevral','Mart','Aprel','May','Iyun','Iyul','Avgust','Sentyabr','Oktyabr','Noyabr','Dekabr'];
const MONTH_SHORT  = ['Yan','Fev','Mar','Apr','May','Iyn','Iyl','Avg','Sen','Okt','Noy','Dek'];

const Payroll = ({ employees, attendance, payroll, objects = [], onLog, onRefresh }) => {
  const [activeTab, setActiveTab]               = useState('salary');
  const [financeView, setFinanceView]           = useState('overview'); // 'overview' | 'byObject' | 'byEmployee' | 'history'
  const [selectedMonth, setSelectedMonth]       = useState(new Date().toISOString().slice(0, 7));
  const [expandedMonth, setExpandedMonth]       = useState(null);
  const [expandedObject, setExpandedObject]     = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const [showSalaryModal, setShowSalaryModal]   = useState(false);
  const [salaryEmp, setSalaryEmp]               = useState(null);
  const [salaryAmount, setSalaryAmount]         = useState('');
  const [salaryObjectId, setSalaryObjectId]     = useState('');
  const [salaryLoading, setSalaryLoading]       = useState(false);

  const pendingAttendance = attendance.filter(a => a.status === 'PENDING');

  // ── HISOB-KITOBLAR ──
  const approvedPayroll = useMemo(() => payroll.filter(p => p.status === 'APPROVED'), [payroll]);

  const currentMonthPayroll = useMemo(() =>
    approvedPayroll.filter(p => p.month === selectedMonth),
  [approvedPayroll, selectedMonth]);

  const currentMonthTotal = useMemo(() =>
    currentMonthPayroll.reduce((sum, p) => sum + (Number(p.calculatedSalary) || 0), 0),
  [currentMonthPayroll]);

  const allTimeTotal = useMemo(() =>
    approvedPayroll.reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0),
  [approvedPayroll]);

  // Obyekt bo'yicha statistika
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

  // Xodim bo'yicha statistika
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
  const topObject   = objectStats[0] || null;

  const filteredHistoryByDate = useMemo(() => {
    const filtered = approvedPayroll.filter(p => {
      if (!selectedEmployee) return true;
      const pId = p.employeeId?._id || p.employeeId;
      return String(pId) === String(selectedEmployee);
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
    setSalaryEmp(emp);
    setSalaryAmount('');
    setSalaryObjectId('');
    setShowSalaryModal(true);
  };

  const closeSalaryModal = () => {
    setShowSalaryModal(false);
    setSalaryEmp(null);
    setSalaryAmount('');
    setSalaryObjectId('');
  };

  const handleGiveSalary = async () => {
    if (!salaryEmp || !salaryAmount || Number(salaryAmount) <= 0) return alert("Summani kiriting!");
    if (!salaryObjectId) return alert("Obyektni tanlang!");
    setSalaryLoading(true);
    try {
      const today   = new Date().toISOString().split('T')[0];
      const objName = objects.find(o => (o._id || o.id) === salaryObjectId)?.name || '';
      await api.createPayroll({
        employeeId:       salaryEmp._id || salaryEmp.id,
        employeeName:     salaryEmp.name,
        calculatedSalary: Number(salaryAmount),
        amount:           Number(salaryAmount),
        date:             today,
        month:            today.slice(0, 7),
        type:             'DAILY_PAY',
        status:           'APPROVED',
        paymentStatus:    'paid',
        objectId:         salaryObjectId,
        objectName:       objName,
      });
      onLog(`${salaryEmp.name}ga ${Number(salaryAmount).toLocaleString()} UZS oylik berildi (${objName})`);
      closeSalaryModal();
      onRefresh();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    } finally {
      setSalaryLoading(false);
    }
  };

  const handleApproveAttendance = async (id) => {
    try {
      await api.approveAttendance(id);
      onLog("Davomat tasdiqlandi.");
      onRefresh();
    } catch { alert("Xatolik!"); }
  };

  const handleRejectPayroll = async (id) => {
    if (!window.confirm("O'chirilsinmi?")) return;
    try {
      await api.deletePayroll(id);
      onLog("To'lov o'chirildi.");
      onRefresh();
    } catch { alert("Xatolik!"); }
  };

  const handleRejectAttendance = async (id) => {
    if (!window.confirm("O'chirilsinmi?")) return;
    try {
      await api.deleteAttendance(id);
      onLog("Davomat o'chirildi.");
      onRefresh();
    } catch { alert("Xatolik!"); }
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

      {/* ── TAB NAVIGATSIYA ── */}
      <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-xl overflow-x-auto gap-1">
        <TabBtn active={activeTab === 'salary'}     onClick={() => setActiveTab('salary')}
          icon={<Banknote size={15}/>} label="Oylik Berish" />
        <TabBtn active={activeTab === 'attendance'} onClick={() => setActiveTab('attendance')}
          icon={<CheckCircle size={15}/>} label="Davomat" badge={pendingAttendance.length} />
        <TabBtn active={activeTab === 'finance'}    onClick={() => setActiveTab('finance')}
          icon={<DollarSign size={15}/>} label="Moliya" />
      </div>

      {/* ── OYLIK BERISH ── */}
      {activeTab === 'salary' && (
        <div className="space-y-3">
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <UserCheck className="text-yellow-500 shrink-0" size={18} />
              <div>
                <h2 className="text-white font-black italic uppercase text-sm">Oylik Berish</h2>
                <p className="text-slate-500 text-[9px] font-black uppercase">Xodimni tanlang va oylik bering</p>
              </div>
            </div>
          </div>

          {employees.filter(e => e.status === 'ACTIVE').length === 0 ? (
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-12 text-center text-slate-700 font-black uppercase text-xs">
              Faol xodimlar yo'q
            </div>
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
                  <button
                    onClick={() => openSalaryModal(emp)}
                    className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-slate-950 font-black rounded-xl text-[10px] uppercase transition-all shrink-0 ml-3 shadow-md shadow-yellow-500/20"
                  >
                    💵 Berish
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-center">
                    <p className="text-[8px] text-slate-500 font-black uppercase mb-0.5">Ish kunlari</p>
                    <p className="text-white font-black text-base">{bal.workedDays}</p>
                    <p className="text-[8px] text-slate-600">kun</p>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-center">
                    <p className="text-[8px] text-slate-500 font-black uppercase mb-0.5">Hisoblangan</p>
                    <p className="text-emerald-500 font-black text-sm leading-tight">{bal.totalEarned.toLocaleString()}</p>
                    <p className="text-[8px] text-slate-600">UZS</p>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-center">
                    <p className="text-[8px] text-slate-500 font-black uppercase mb-0.5">Qoldiq</p>
                    <p className={`font-black text-sm leading-tight ${bal.remaining >= 0 ? 'text-yellow-500' : 'text-rose-500'}`}>
                      {bal.remaining.toLocaleString()}
                    </p>
                    <p className="text-[8px] text-slate-600">UZS</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── DAVOMATNI TASDIQLASH ── */}
      {activeTab === 'attendance' && (
        <div className="space-y-3">
          {pendingAttendance.length === 0 ? (
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-12 text-center text-slate-700 font-black uppercase text-xs">
              Yangi davomat yo'q
            </div>
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

      {/* ══════════════════════════════════════════
          ── MOLIYA TAHLILI (YANGI TO'LIQ VERSIYA)
      ══════════════════════════════════════════ */}
      {activeTab === 'finance' && (
        <div className="space-y-4">

          {/* ── UMUMIY SUMMARY KARTALAR ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-yellow-500/10 to-slate-950 p-4 rounded-2xl border border-yellow-500/20 shadow-xl">
              <p className="text-[8px] text-yellow-500/70 font-black uppercase tracking-widest mb-1">Jami to'lovlar</p>
              <p className="text-2xl font-black text-yellow-500 italic leading-tight">
                {allTimeTotal.toLocaleString()}
              </p>
              <p className="text-[9px] text-slate-500 font-bold mt-0.5">UZS — barcha vaqt</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-slate-950 p-4 rounded-2xl border border-blue-500/20 shadow-xl">
              <p className="text-[8px] text-blue-400/70 font-black uppercase tracking-widest mb-1">Jami tranzaksiya</p>
              <p className="text-2xl font-black text-blue-400 italic leading-tight">
                {approvedPayroll.length}
              </p>
              <p className="text-[9px] text-slate-500 font-bold mt-0.5">ta to'lov amalga oshirildi</p>
            </div>
          </div>

          {/* ── TOP REKORDLAR ── */}
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
                    <p className="text-[8px] text-purple-400 font-black uppercase tracking-widest">Eng ko'p xarajat qilingan obyekt</p>
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

          {/* ── VIEW SWITCH ── */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 overflow-x-auto">
            {[
              { key: 'overview',    icon: <BarChart3 size={12}/>,  label: 'Oy tahlili'    },
              { key: 'byObject',    icon: <Building2 size={12}/>,  label: 'Obyektlar'     },
              { key: 'byEmployee',  icon: <Users size={12}/>,      label: 'Xodimlar'      },
              { key: 'history',     icon: <Calendar size={12}/>,   label: 'Tarix'         },
            ].map(({ key, icon, label }) => (
              <button key={key} onClick={() => setFinanceView(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-black text-[9px] uppercase transition-all whitespace-nowrap ${
                  financeView === key ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white hover:bg-slate-900'
                }`}>
                {icon} {label}
              </button>
            ))}
          </div>

          {/* ════════════════════════════
              OY TAHLILI
          ════════════════════════════ */}
          {financeView === 'overview' && (
            <div className="space-y-4">
              {/* Month filter */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 shadow-xl">
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-3">Oy tanlang</p>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {MONTH_SHORT.map((label, i) => {
                    const val        = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
                    const isSelected = selectedMonth === val;
                    const monthTotal = approvedPayroll
                      .filter(p => p.month === val)
                      .reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
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
                  <button onClick={() => changeYear(-1)}
                    className="w-8 h-8 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white font-black active:scale-95 transition-all">‹</button>
                  <span className="text-white font-black text-sm">{selectedYear}</span>
                  <button onClick={() => changeYear(1)} disabled={Number(selectedYear) >= new Date().getFullYear()}
                    className="w-8 h-8 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 font-black active:scale-95 transition-all">›</button>
                </div>
              </div>

              {/* Oy summary */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 bg-slate-900/30">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="text-yellow-500 shrink-0" size={18} />
                      <div>
                        <h2 className="text-white font-black italic uppercase text-sm">
                          {MONTH_LABELS[selectedMonthIdx]} {selectedYear}
                        </h2>
                        <p className="text-slate-500 text-[9px] font-black uppercase">{currentMonthPayroll.length} ta to'lov</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-500 font-black uppercase">Jami</p>
                      <p className="text-lg font-black text-yellow-500 italic leading-tight">
                        {currentMonthTotal.toLocaleString()} <span className="text-[10px] text-slate-500">UZS</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bu oyda xodimlar mini reyting */}
                {currentMonthPayroll.length > 0 && (() => {
                  const empMonthMap = {};
                  currentMonthPayroll.forEach(p => {
                    const name = p.employeeName || '?';
                    if (!empMonthMap[name]) empMonthMap[name] = { total: 0, objs: new Set() };
                    empMonthMap[name].total += Number(p.calculatedSalary) || 0;
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
                              <span className={`text-[8px] font-black w-4 shrink-0 ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-700' : 'text-slate-600'}`}>
                                #{i+1}
                              </span>
                              <span className="text-white font-black text-xs truncate">{name}</span>
                              <div className="flex gap-1 flex-wrap">
                                {[...data.objs].map((o, j) => (
                                  <span key={j} className="text-[7px] text-blue-400 bg-blue-500/10 px-1 rounded font-bold">{o}</span>
                                ))}
                              </div>
                            </div>
                            <span className="text-yellow-500 font-black text-xs shrink-0 ml-2">{data.total.toLocaleString()}</span>
                          </div>
                          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${i === 0 ? 'bg-yellow-500' : 'bg-slate-600'}`}
                              style={{ width: `${(data.total / maxVal) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                <div className="divide-y divide-slate-900 max-h-[300px] overflow-y-auto">
                  {currentMonthPayroll.length === 0 ? (
                    <div className="py-12 text-center text-slate-700 font-black uppercase text-xs">Bu oyda to'lovlar yo'q</div>
                  ) : currentMonthPayroll.map(rec => {
                    const id = rec._id || rec.id;
                    return (
                      <div key={id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-900/20 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-black italic uppercase text-sm truncate">{rec.employeeName}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[9px] text-slate-500">{rec.date || rec.month}</span>
                            {rec.objectName && (
                              <span className="text-[9px] text-blue-400 font-black bg-blue-500/10 px-1.5 py-0.5 rounded">
                                {rec.objectName}
                              </span>
                            )}
                            <span className="text-[9px] font-black text-slate-500 uppercase bg-slate-900 px-2 py-0.5 rounded border border-slate-800">⚡ Oylik</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 ml-3 shrink-0">
                          <p className="text-base font-black text-emerald-500 italic">
                            {(Number(rec.calculatedSalary) || 0).toLocaleString()}
                            <span className="text-[9px] text-slate-600 ml-1 not-italic">UZS</span>
                          </p>
                          <button onClick={() => handleRejectPayroll(id)} className="text-slate-700 hover:text-rose-500 active:scale-95 transition-colors">
                            <Trash2 size={16}/>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════
              OBYEKTLAR BO'YICHA
          ════════════════════════════ */}
          {financeView === 'byObject' && (
            <div className="space-y-3">
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
                <div className="flex items-center gap-3">
                  <Building2 className="text-blue-400 shrink-0" size={16}/>
                  <div>
                    <h2 className="text-white font-black italic uppercase text-sm">Obyektlar bo'yicha tahlil</h2>
                    <p className="text-slate-500 text-[9px] font-black uppercase">Har bir obyekt uchun to'liq moliya</p>
                  </div>
                </div>
              </div>

              {objectStats.filter(s => s.total > 0 || s.budget > 0).length === 0 ? (
                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-12 text-center text-slate-700 font-black uppercase text-xs">
                  Hali to'lovlar yo'q
                </div>
              ) : objectStats.map(({ obj, objId, total, budget, balance, empIds, pct, isNegative, payments }) => {
                const isExpanded = expandedObject === objId;
                // Shu obyektda kim qancha olgan
                const empBreakdown = (() => {
                  const map = {};
                  payments.forEach(p => {
                    const name = p.employeeName || '?';
                    if (!map[name]) map[name] = 0;
                    map[name] += Number(p.calculatedSalary) || 0;
                  });
                  return Object.entries(map).sort(([,a],[,b]) => b - a);
                })();

                return (
                  <div key={objId} className={`bg-slate-950 border rounded-2xl transition-all ${
                    isNegative ? 'border-rose-500/30' : isExpanded ? 'border-blue-500/30' : 'border-slate-800'
                  }`}>
                    <button onClick={() => setExpandedObject(isExpanded ? null : objId)} className="w-full p-4 text-left">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border font-black text-base ${
                            isNegative ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                          }`}>
                            {obj.name[0]}
                          </div>
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
                          <ChevronDown size={14} className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                        </div>
                      </div>

                      {budget > 0 && (
                        <>
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800 text-center">
                              <p className="text-[7px] text-slate-500 font-black uppercase mb-0.5">Byudjet</p>
                              <p className="text-white font-black text-xs">{budget.toLocaleString()}</p>
                            </div>
                            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800 text-center">
                              <p className="text-[7px] text-slate-500 font-black uppercase mb-0.5">Xarajat</p>
                              <p className="text-yellow-500 font-black text-xs">{total.toLocaleString()}</p>
                            </div>
                            <div className={`p-2 rounded-xl border text-center ${isNegative ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                              <p className="text-[7px] text-slate-500 font-black uppercase mb-0.5">Qoldiq</p>
                              <p className={`font-black text-xs ${isNegative ? 'text-rose-500' : 'text-emerald-500'}`}>
                                {isNegative ? '−' : ''}{Math.abs(balance).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${isNegative ? 'bg-rose-500' : 'bg-blue-500'}`}
                              style={{ width: `${isNegative ? 100 : pct}%` }}/>
                          </div>
                          <p className="text-[8px] text-slate-600 font-bold mt-1">{pct}% ishlatildi {isNegative && '⚠ Limit oshdi'}</p>
                        </>
                      )}
                    </button>

                    {/* Kengaytirilgan — xodimlar breakdown */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-2">
                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Xodimlar bo'yicha taqsimot</p>
                        {empBreakdown.length === 0 ? (
                          <p className="text-slate-700 text-xs text-center py-4 font-black uppercase">Ma'lumot yo'q</p>
                        ) : empBreakdown.map(([name, amount], i) => {
                          const empPct = total > 0 ? Math.round((amount / total) * 100) : 0;
                          return (
                            <div key={name} className="space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-6 h-6 shrink-0 bg-slate-800 rounded-lg flex items-center justify-center text-yellow-500 font-black text-[10px] border border-slate-700">
                                    {name[0]}
                                  </div>
                                  <span className="text-white font-black text-xs truncate">{name}</span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                  <span className="text-[9px] text-slate-500 font-bold">{empPct}%</span>
                                  <span className="text-emerald-500 font-black text-xs">{amount.toLocaleString()} UZS</span>
                                </div>
                              </div>
                              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${empPct}%` }}/>
                              </div>
                            </div>
                          );
                        })}

                        {/* To'lovlar tarixi */}
                        <div className="mt-3 pt-3 border-t border-slate-800">
                          <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-2">So'nggi to'lovlar</p>
                          <div className="space-y-1 max-h-[200px] overflow-y-auto">
                            {[...payments].reverse().slice(0, 10).map(p => (
                              <div key={p._id || p.id} className="flex justify-between items-center py-1.5 px-2 rounded-lg hover:bg-slate-900/30">
                                <div className="min-w-0">
                                  <p className="text-white font-black text-xs truncate">{p.employeeName}</p>
                                  <p className="text-slate-600 text-[8px] font-bold">{p.date}</p>
                                </div>
                                <p className="text-yellow-500 font-black text-xs shrink-0 ml-2">
                                  {(Number(p.calculatedSalary) || 0).toLocaleString()} UZS
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ════════════════════════════
              XODIMLAR BO'YICHA
          ════════════════════════════ */}
          {financeView === 'byEmployee' && (
            <div className="space-y-3">
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
                <div className="flex items-center gap-3">
                  <Users className="text-emerald-500 shrink-0" size={16}/>
                  <div>
                    <h2 className="text-white font-black italic uppercase text-sm">Xodimlar bo'yicha tahlil</h2>
                    <p className="text-slate-500 text-[9px] font-black uppercase">Kim qaysi obyektdan qancha olgan</p>
                  </div>
                </div>
              </div>

              {employeeStats.length === 0 ? (
                <div className="bg-slate-950 rounded-2xl border border-slate-800 p-12 text-center text-slate-700 font-black uppercase text-xs">
                  Faol xodimlar yo'q
                </div>
              ) : employeeStats.map(({ emp, empId, totalTaken, totalEarned, remaining, workedDays, objNames, payments }, idx) => {
                const earnedPct = totalEarned > 0 ? Math.min(Math.round((totalTaken / totalEarned) * 100), 100) : 0;
                // Obyektlar bo'yicha breakdown
                const objBreakdown = (() => {
                  const map = {};
                  payments.forEach(p => {
                    const name = p.objectName || 'Belgilanmagan';
                    if (!map[name]) map[name] = 0;
                    map[name] += Number(p.calculatedSalary) || 0;
                  });
                  return Object.entries(map).sort(([,a],[,b]) => b - a);
                })();

                return (
                  <div key={empId} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-lg">
                    {/* Xodim header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-black text-base border ${
                        idx === 0 ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
                        idx === 1 ? 'bg-slate-400/10 border-slate-400/20 text-slate-400' :
                        'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                      }`}>
                        {emp.name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-black italic uppercase text-sm truncate">{emp.name}</p>
                          {idx < 3 && <span className="text-[8px]">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>}
                        </div>
                        <p className="text-slate-500 text-[9px] font-bold uppercase">{emp.position} • {workedDays} kun ishladi</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-yellow-500 font-black text-base italic leading-tight">{totalTaken.toLocaleString()}</p>
                        <p className="text-[8px] text-slate-600">UZS oldi</p>
                      </div>
                    </div>

                    {/* Progress — qancha oldi vs hisoblangan */}
                    <div className="mb-3 space-y-1">
                      <div className="flex justify-between text-[8px] font-black uppercase">
                        <span className="text-slate-500">Olingan / Hisoblangan</span>
                        <span className={remaining >= 0 ? 'text-emerald-500' : 'text-rose-500'}>
                          Qoldiq: {remaining.toLocaleString()} UZS
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${remaining < 0 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${earnedPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] text-slate-600 font-bold">
                        <span>{earnedPct}% olindi</span>
                        <span>Jami: {totalEarned.toLocaleString()} UZS</span>
                      </div>
                    </div>

                    {/* Obyektlar bo'yicha taqsimot */}
                    {objBreakdown.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-wide">Obyektlar bo'yicha:</p>
                        {objBreakdown.map(([objName, amount]) => {
                          const pct = totalTaken > 0 ? Math.round((amount / totalTaken) * 100) : 0;
                          return (
                            <div key={objName} className="flex items-center gap-2">
                              <span className="text-[8px] text-blue-400 font-black bg-blue-500/10 px-1.5 py-0.5 rounded shrink-0 w-28 truncate">{objName}</span>
                              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }}/>
                              </div>
                              <span className="text-[8px] text-white font-black shrink-0">{amount.toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {payments.length === 0 && (
                      <p className="text-center text-slate-700 font-black uppercase text-[9px] py-2">Hali to'lov yo'q</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ════════════════════════════
              TO'LIQ TARIX
          ════════════════════════════ */}
          {financeView === 'history' && (
            <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
              <div className="p-4 border-b border-slate-800 bg-slate-900/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className="text-blue-500 shrink-0" size={18} />
                    <div>
                      <h2 className="text-white font-black italic uppercase text-sm">Barcha Tarix</h2>
                      <p className="text-slate-500 text-[9px] font-black uppercase">Sana bo'yicha guruhlangan • {approvedPayroll.length} ta</p>
                    </div>
                  </div>
                  <p className="text-yellow-500 font-black text-sm italic">{allTimeTotal.toLocaleString()} <span className="text-[9px] text-slate-500">UZS</span></p>
                </div>
                <select
                  value={selectedEmployee}
                  onChange={e => { setSelectedEmployee(e.target.value); setExpandedMonth(null); }}
                  className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs outline-none focus:border-blue-500 transition-all"
                >
                  <option value="">— Barcha xodimlar —</option>
                  {employees.map(emp => (
                    <option key={emp._id || emp.id} value={emp._id || emp.id}>{emp.name}</option>
                  ))}
                </select>
              </div>

              {selectedEmpStats && (
                <div className="px-4 py-3 bg-blue-500/5 border-b border-slate-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 shrink-0 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-500 font-black text-base">
                      {selectedEmpStats.emp?.name?.[0] || '?'}
                    </div>
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
                    <div className="bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800 text-center">
                      <p className="text-[7px] text-slate-500 font-black uppercase mb-0.5">To'lovlar</p>
                      <p className="text-white font-black">{selectedEmpStats.payments.length} ta</p>
                    </div>
                    <div className="bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800 text-center">
                      <p className="text-[7px] text-slate-500 font-black uppercase mb-0.5">Hisoblangan</p>
                      <p className="text-emerald-500 font-black text-xs">{selectedEmpStats.totalEarned.toLocaleString()}</p>
                    </div>
                    <div className="bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800 text-center">
                      <p className="text-[7px] text-slate-500 font-black uppercase mb-0.5">Qoldiq</p>
                      <p className={`font-black text-xs ${selectedEmpStats.remaining >= 0 ? 'text-yellow-500' : 'text-rose-500'}`}>
                        {selectedEmpStats.remaining.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                {filteredHistoryByDate.length === 0 ? (
                  <div className="py-16 text-center text-slate-700 font-black uppercase text-xs">To'lovlar tarixi yo'q</div>
                ) : filteredHistoryByDate.map(([date, records]) => {
                  const dayTotal   = records.reduce((s, r) => s + (Number(r.calculatedSalary) || 0), 0);
                  const isExpanded = expandedMonth === date;
                  return (
                    <div key={date} className="border border-slate-800 rounded-xl overflow-hidden">
                      <button onClick={() => setExpandedMonth(isExpanded ? null : date)}
                        className="w-full flex items-center justify-between px-4 py-3.5 bg-slate-900/50 hover:bg-slate-900 active:bg-slate-800 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 shrink-0 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center">
                            <Calendar className="text-blue-500" size={14} />
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
                          <ChevronDown size={16} className={`text-slate-500 transition-transform duration-300 shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="divide-y divide-slate-900">
                          {records.map(rec => {
                            const id = rec._id || rec.id;
                            return (
                              <div key={id} className="flex items-center justify-between px-4 py-3 bg-slate-950/60 hover:bg-slate-900/20 transition-colors">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className="w-7 h-7 shrink-0 bg-slate-800 rounded-lg flex items-center justify-center text-yellow-500 font-black text-xs border border-slate-700">
                                    {rec.employeeName?.[0] || '?'}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-white font-black text-sm uppercase italic truncate">{rec.employeeName}</p>
                                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                      {rec.objectName && (
                                        <span className="text-[8px] text-blue-400 font-black bg-blue-500/10 px-1.5 py-0.5 rounded">
                                          {rec.objectName}
                                        </span>
                                      )}
                                      <span className="text-[9px] font-black text-slate-500 uppercase bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">⚡ Oylik</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 ml-2 shrink-0">
                                  <p className="text-emerald-500 font-black text-sm">
                                    {(Number(rec.calculatedSalary) || 0).toLocaleString()}
                                    <span className="text-[9px] text-slate-600 ml-1">UZS</span>
                                  </p>
                                  <button onClick={() => handleRejectPayroll(id)} className="text-slate-700 hover:text-rose-500 active:scale-95 transition-colors">
                                    <Trash2 size={15}/>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── OYLIK BERISH MODALI ── */}
      {showSalaryModal && salaryEmp && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center backdrop-blur-md bg-slate-950/80">
          <div className="bg-slate-900 border border-yellow-500/20 rounded-t-[2rem] sm:rounded-[2rem] w-full sm:max-w-md p-6 shadow-2xl max-h-[95vh] overflow-y-auto">

            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-xl font-black text-white italic">💵 Oylik Berish</h3>
                <p className="text-slate-500 text-[9px] font-black uppercase mt-0.5">{salaryEmp.name}</p>
              </div>
              <button onClick={closeSalaryModal}
                className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors">
                <X className="text-slate-400" size={16} />
              </button>
            </div>

            {/* Xodim balansi */}
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
                    <span className={`font-black text-base italic ${bal.remaining >= 0 ? 'text-yellow-500' : 'text-rose-500'}`}>
                      {bal.remaining.toLocaleString()} UZS
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Obyekt tanlash */}
            <div className="mb-4">
              <label className="text-slate-500 text-[9px] font-black uppercase tracking-widest block mb-2">
                Qaysi obyektdan berilmoqda
              </label>
              <select
                value={salaryObjectId}
                onChange={e => setSalaryObjectId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-yellow-500 text-white px-4 py-3 rounded-2xl font-bold text-sm outline-none transition-all"
              >
                <option value="">— Obyektni tanlang —</option>
                {objects.map(obj => (
                  <option key={obj._id || obj.id} value={obj._id || obj.id}>{obj.name}</option>
                ))}
              </select>

              {salaryObjectId && (() => {
                const obj    = objects.find(o => (o._id || o.id) === salaryObjectId);
                if (!obj) return null;
                const budget = Number(obj.totalBudget) || 0;
                const spent  = approvedPayroll
                  .filter(p => String(p.objectId?._id || p.objectId) === String(obj._id || obj.id))
                  .reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
                const balance    = budget - spent;
                const hasBudget  = budget > 0;
                const isNegative = hasBudget && balance < 0;
                const pct        = hasBudget ? Math.min(Math.round((spent / budget) * 100), 100) : 0;
                return (
                  <div className="mt-3 bg-slate-950 rounded-2xl border border-slate-800 p-3 space-y-2">
                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">{obj.name} — moliya holati</p>
                    {hasBudget ? (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800 text-center">
                            <p className="text-[7px] text-slate-500 font-black uppercase mb-0.5">Byudjet</p>
                            <p className="text-white font-black text-xs">{budget.toLocaleString()}</p>
                          </div>
                          <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800 text-center">
                            <p className="text-[7px] text-slate-500 font-black uppercase mb-0.5">Xarajat</p>
                            <p className="text-yellow-500 font-black text-xs">{spent.toLocaleString()}</p>
                          </div>
                          <div className={`p-2 rounded-xl border text-center ${isNegative ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                            <p className="text-[7px] text-slate-500 font-black uppercase mb-0.5">Qoldiq</p>
                            <p className={`font-black text-xs ${isNegative ? 'text-rose-500' : 'text-emerald-500'}`}>
                              {isNegative ? '−' : ''}{Math.abs(balance).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isNegative ? 'bg-rose-500' : 'bg-emerald-500'}`}
                            style={{ width: `${isNegative ? 100 : pct}%` }}/>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[8px] text-slate-600 font-bold">{pct}% ishlatildi</span>
                          {isNegative && <span className="text-[8px] text-rose-500 font-black">⚠ Limit oshdi</span>}
                        </div>
                      </>
                    ) : (
                      <p className="text-slate-600 text-[9px] font-black uppercase text-center py-1">
                        Jami xarajat: <span className="text-yellow-500">{spent.toLocaleString()} UZS</span>
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Summa input */}
            <div className="mb-4">
              <label className="text-slate-500 text-[9px] font-black uppercase tracking-widest block mb-2">
                Beriladigan summa (UZS)
              </label>
              <div className="relative">
                <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-yellow-500" size={20} />
                <input
                  autoFocus
                  inputMode="numeric"
                  type="number"
                  min="1"
                  value={salaryAmount}
                  onChange={e => setSalaryAmount(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGiveSalary()}
                  placeholder="0"
                  className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 focus:border-yellow-500 rounded-2xl text-2xl font-black text-white outline-none transition-all"
                />
              </div>
            </div>

            {/* Tez tanlash % */}
            {(() => {
              const bal = getEmpBalance(salaryEmp);
              return bal.remaining > 0 ? (
                <div className="grid grid-cols-4 gap-2 mb-5">
                  {[25, 50, 75, 100].map(pct => {
                    const amt = Math.floor(bal.remaining * pct / 100);
                    return (
                      <button key={pct} onClick={() => setSalaryAmount(String(amt))}
                        className="py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-400 hover:text-white rounded-xl text-[10px] font-black transition-all">
                        {pct}%
                      </button>
                    );
                  })}
                </div>
              ) : <div className="mb-5" />;
            })()}

            <button
              onClick={handleGiveSalary}
              disabled={salaryLoading || !salaryAmount || Number(salaryAmount) <= 0 || !salaryObjectId}
              className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black rounded-2xl transition-all uppercase tracking-widest text-sm shadow-lg shadow-yellow-500/20"
            >
              {salaryLoading ? 'Yuborilmoqda...' :
                Number(salaryAmount) > 0 ? `${Number(salaryAmount).toLocaleString()} UZS Berish` : 'Oylik Berish'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TabBtn = ({ active, onClick, icon, label, badge }) => (
  <button onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 rounded-xl font-black text-[10px] uppercase transition-all whitespace-nowrap ${
      active ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-slate-900'
    }`}>
    {icon}
    <span>{label}</span>
    {badge > 0 && (
      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-yellow-500/20 text-yellow-500'}`}>
        {badge}
      </span>
    )}
  </button>
);

export default Payroll;