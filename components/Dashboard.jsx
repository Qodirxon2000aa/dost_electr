import React, { useMemo, useState } from 'react';
import {
  Users, CalendarCheck, CreditCard, AlertCircle,
  Activity, TrendingUp, ChevronLeft, ChevronRight
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const getTodayStr = () => new Date().toISOString().split('T')[0];

const Dashboard = ({ employees, attendance, payroll, logs }) => {

  /* ── Rejim: 'single' | 'range' ── */
  const [mode,         setMode]        = useState('single');
  const [selectedDate, setSelectedDate] = useState(getTodayStr);
  const [rangeFrom,    setRangeFrom]   = useState(getTodayStr);
  const [rangeTo,      setRangeTo]     = useState(getTodayStr);

  /* Bugun */
  const todayStr = getTodayStr();
  const isToday  = selectedDate === todayStr;

  const goDay = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    const val = d.toISOString().split('T')[0];
    if (val > todayStr) return;
    setSelectedDate(val);
  };

  /* ── HISOBLAR ── */
  const stats = useMemo(() => {
    const activeEmployees = employees.filter(e => e.status === 'ACTIVE').length;

    /* Filtrlangan davomat yozuvlari */
    const filteredAtt = mode === 'single'
      ? attendance.filter(a => a.date === selectedDate)
      : attendance.filter(a => a.date >= rangeFrom && a.date <= rangeTo);

    const presentCount = filteredAtt.filter(a => a.status === 'PRESENT').length;
    const pendingCount = filteredAtt.filter(a => a.status === 'PENDING').length;
    const absentCount  = filteredAtt.filter(a => a.status === 'ABSENT').length;

    /* Nechta noyob xodim kelgan (range uchun) */
    const presentEmpIds = new Set(
      filteredAtt.filter(a => a.status === 'PRESENT')
        .map(a => String(a.employeeId?._id || a.employeeId))
    );

    /* Davomat % — single: bugungi; range: noyob xodimlar */
    const attendanceRate = activeEmployees > 0
      ? mode === 'single'
        ? Math.round((presentCount / activeEmployees) * 100)
        : Math.round((presentEmpIds.size / activeEmployees) * 100)
      : 0;

    /* Oylik — single: o'sha oy; range: oraliq oylar */
    const monthsInRange = mode === 'single'
      ? [selectedDate.slice(0, 7)]
      : (() => {
          const months = new Set();
          const cur = new Date(rangeFrom);
          const end = new Date(rangeTo);
          while (cur <= end) {
            months.add(cur.toISOString().slice(0, 7));
            cur.setDate(cur.getDate() + 1);
          }
          return [...months];
        })();

    const totalPayroll = payroll
      .filter(p => monthsInRange.includes(p.month) && p.status === 'APPROVED')
      .reduce((acc, p) => acc + (Number(p.calculatedSalary) || 0), 0);

    /* Pie data */
    const statusData = [
      { name: 'Kelgan',    value: presentCount,                                          color: '#10b981' },
      { name: 'Kelmagan',  value: Math.max(0, activeEmployees - presentEmpIds.size),     color: '#f43f5e' },
    ].filter(d => d.value > 0);

    /* Kun/oralig'i davomat jadvali */
    let dayAttendance;
    if (mode === 'single') {
      /* Barcha faol xodimlarni ko'rsat */
      dayAttendance = employees.filter(e => e.status === 'ACTIVE').map(emp => {
        const empId  = emp._id || emp.id;
        const record = attendance.find(a =>
          a.date === selectedDate &&
          String(a.employeeId?._id || a.employeeId) === String(empId)
        );
        return {
          _id:         record?._id || empId,
          empName:     emp.name,
          empPosition: emp.position || '',
          objectName:  record?.objectName || null,
          date:        selectedDate,
          status:      record?.status || 'NO_RECORD',
        };
      });
    } else {
      /* Range: barcha yozuvlarni sana bo'yicha sort */
      dayAttendance = filteredAtt
        .map(a => {
          const emp = employees.find(e =>
            String(e._id || e.id) === String(a.employeeId?._id || a.employeeId)
          );
          return {
            _id:         a._id || a.id,
            empName:     emp?.name    || a.employeeName || "Noma'lum",
            empPosition: emp?.position || '',
            objectName:  a.objectName || null,
            date:        a.date,
            status:      a.status,
          };
        })
        .sort((a, b) => b.date.localeCompare(a.date));
    }

    return {
      activeEmployees, presentCount, pendingCount, absentCount,
      presentEmpIds, attendanceRate, totalPayroll, statusData, dayAttendance,
      filteredAtt,
    };
  }, [employees, attendance, payroll, mode, selectedDate, rangeFrom, rangeTo]);

  /* Label */
  const dateLabel = mode === 'single'
    ? new Date(selectedDate).toLocaleDateString('uz-UZ', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
    : `${rangeFrom} → ${rangeTo}`;

  const rangeTitle = mode === 'single'
    ? (isToday ? 'Bugungi' : selectedDate)
    : `${rangeFrom} – ${rangeTo}`;

  return (
    <div className="space-y-4 pb-10 animate-in fade-in duration-700">

      {/* ── SARLAVHA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight italic uppercase">
            Tizim <span className="text-yellow-500">Ma'lumotlari</span>
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Sana yoki oraliq tanlang — ma'lumotlar ko'rinadi.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold text-slate-300 w-fit">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          {mode === 'single' ? (isToday ? 'Bugun' : 'Tanlangan sana') : 'Sana oralig\'i'}
        </div>
      </div>

      {/* ── SANA FILTR ── */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3">

        {/* Mode toggle */}
        <div className="flex bg-slate-900 p-1 rounded-xl gap-1 border border-slate-800">
          <button
            onClick={() => setMode('single')}
            className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase transition-all ${
              mode === 'single' ? 'bg-yellow-500 text-slate-950' : 'text-slate-500 hover:text-white'
            }`}
          >
            📅 Bir kun
          </button>
          <button
            onClick={() => setMode('range')}
            className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase transition-all ${
              mode === 'range' ? 'bg-yellow-500 text-slate-950' : 'text-slate-500 hover:text-white'
            }`}
          >
            📆 Oralig'i
          </button>
        </div>

        {/* Single mode */}
        {mode === 'single' && (
          <>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goDay(-1)}
                className="w-9 h-9 bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all"
              >
                <ChevronLeft size={16}/>
              </button>
              <div className="flex-1">
                <input
                  type="date"
                  value={selectedDate}
                  max={todayStr}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-yellow-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm outline-none transition-all"
                />
              </div>
              <button
                onClick={() => goDay(1)}
                disabled={isToday}
                className="w-9 h-9 bg-slate-900 hover:bg-slate-800 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all"
              >
                <ChevronRight size={16}/>
              </button>
              {!isToday && (
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className="px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 font-black text-[10px] rounded-xl uppercase transition-all active:scale-95"
                >
                  Bugun
                </button>
              )}
            </div>

            {/* Info */}
            <div className="bg-slate-900/50 rounded-xl px-4 py-2.5 border border-slate-800">
              <p className="text-white font-black text-sm capitalize">{dateLabel}</p>
              <p className="text-slate-500 text-[10px] font-bold mt-0.5">
                {stats.activeEmployees} ta xodim • {stats.presentCount} kelgan • {stats.pendingCount} kutilmoqda
              </p>
            </div>
          </>
        )}

        {/* Range mode */}
        {mode === 'range' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest block mb-1.5">
                  Boshlanish
                </label>
                <input
                  type="date"
                  value={rangeFrom}
                  max={rangeTo}
                  onChange={e => setRangeFrom(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-yellow-500 text-white px-3 py-2.5 rounded-xl font-bold text-sm outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[8px] text-slate-500 font-black uppercase tracking-widest block mb-1.5">
                  Tugash
                </label>
                <input
                  type="date"
                  value={rangeTo}
                  min={rangeFrom}
                  max={todayStr}
                  onChange={e => setRangeTo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-yellow-500 text-white px-3 py-2.5 rounded-xl font-bold text-sm outline-none transition-all"
                />
              </div>
            </div>

            {/* Tezkor oraliqlar */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '7 kun',  days: 7  },
                { label: '14 kun', days: 14 },
                { label: '30 kun', days: 30 },
                { label: 'Bu oy',  days: null },
              ].map(({ label, days }) => {
                const to   = todayStr;
                const from = (() => {
                  if (days === null) return todayStr.slice(0,7) + '-01';
                  const d = new Date(to);
                  d.setDate(d.getDate() - (days - 1));
                  return d.toISOString().split('T')[0];
                })();
                const isActive = rangeFrom === from && rangeTo === to;
                return (
                  <button
                    key={label}
                    onClick={() => { setRangeFrom(from); setRangeTo(to); }}
                    className={`py-2 rounded-xl text-[10px] font-black transition-all active:scale-95 ${
                      isActive
                        ? 'bg-yellow-500 text-slate-950'
                        : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Range summary */}
            <div className="bg-slate-900/50 rounded-xl px-4 py-2.5 border border-slate-800">
              <p className="text-white font-black text-sm">{rangeFrom} — {rangeTo}</p>
              <p className="text-slate-500 text-[10px] font-bold mt-0.5">
                {stats.filteredAtt.length} ta yozuv •{' '}
                {stats.presentEmpIds.size} noyob xodim kelgan •{' '}
                {stats.presentCount} ta PRESENT yozuv
              </p>
            </div>
          </>
        )}
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Users className="w-5 h-5 text-blue-500"/>}
          label="Xodimlar"
          value={stats.activeEmployees}
          trend="Faol"
          color="bg-blue-500/10"
        />
        <StatCard
          icon={<CalendarCheck className="w-5 h-5 text-emerald-500"/>}
          label="Davomat"
          value={`${stats.attendanceRate}%`}
          trend={mode === 'single' ? `${stats.presentCount} kelgan` : `${stats.presentEmpIds.size} xodim kelgan`}
          color="bg-emerald-500/10"
        />
        <StatCard
          icon={<CreditCard className="w-5 h-5 text-yellow-500"/>}
          label="Oylik maosh"
          value={stats.totalPayroll.toLocaleString()}
          trend={mode === 'single' ? selectedDate.slice(0,7) : `${rangeFrom.slice(0,7)} – ${rangeTo.slice(0,7)}`}
          color="bg-yellow-500/10"
        />
        <StatCard
          icon={<AlertCircle className="w-5 h-5 text-rose-500"/>}
          label="Amallar"
          value={logs.length}
          trend="Jami Amallar"
          color="bg-rose-500/10"
        />
      </div>

      {/* ── PIE CHART ── */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <h3 className="font-black text-slate-300 uppercase tracking-wider text-[10px] mb-4 text-center">
          {rangeTitle} Davomat Statistikasi
        </h3>
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="h-[180px] w-full sm:w-[180px] shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusData.length > 0 ? stats.statusData : [{ name:"Yo'q", value:1, color:'#1e293b' }]}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={70}
                  paddingAngle={stats.statusData.length > 1 ? 8 : 0}
                  dataKey="value"
                  stroke="none"
                >
                  {(stats.statusData.length > 0 ? stats.statusData : [{ color:'#1e293b' }]).map((entry, i) => (
                    <Cell key={i} fill={entry.color} cornerRadius={8}/>
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background:'#020617', border:'1px solid #1e293b', borderRadius:'12px', fontSize:'12px' }}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
              <span className="text-2xl font-black text-white">{stats.presentCount}</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Kelgan</span>
            </div>
          </div>
          <div className="w-full space-y-2">
            {stats.statusData.length > 0 ? stats.statusData.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }}/>
                  <span className="text-xs text-slate-400 font-bold uppercase">{s.name}</span>
                </div>
                <span className="text-sm font-black text-white">{s.value}</span>
              </div>
            )) : (
              <div className="p-4 text-center text-slate-700 font-black uppercase text-xs">Bu kunda davomat yo'q</div>
            )}
          </div>
        </div>
      </div>

      {/* ── DAVOMAT RO'YXATI ── */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-900 flex items-center justify-between">
          <h3 className="font-black text-slate-300 uppercase tracking-wider text-[10px]">
            {rangeTitle} Davomat
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
              {stats.presentCount} kelgan
            </span>
            <span className="text-[9px] font-black text-slate-500 bg-slate-900 px-2 py-1 rounded-lg">
              {mode === 'single' ? `${stats.activeEmployees} ta` : `${stats.filteredAtt.length} yozuv`}
            </span>
          </div>
        </div>

        <div className="divide-y divide-slate-900 max-h-[450px] overflow-y-auto">
          {stats.dayAttendance.length === 0 ? (
            <div className="py-14 text-center text-slate-600 font-black uppercase text-xs">
              Bu oraliqda davomat yo'q
            </div>
          ) : stats.dayAttendance.map((a) => (
            <div key={String(a._id) + (a.date || '')} className="flex items-center justify-between px-4 py-3 hover:bg-slate-900/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center font-black text-xs ${
                  a.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                  a.status === 'PENDING' ? 'bg-yellow-500/10  text-yellow-500  border border-yellow-500/20'  :
                  a.status === 'ABSENT'  ? 'bg-rose-500/10    text-rose-500    border border-rose-500/20'     :
                                          'bg-slate-800      text-slate-600   border border-slate-700'
                }`}>
                  {a.empName?.[0] || '?'}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-black text-sm truncate">{a.empName}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {mode === 'range' && a.date && (
                      <span className="text-[8px] text-slate-500 font-bold">{a.date}</span>
                    )}
                    <span className="text-[9px] text-slate-500 font-bold uppercase">{a.empPosition}</span>
                    {a.objectName && (
                      <span className="text-[9px] text-blue-400 font-black bg-blue-500/10 px-1.5 py-0.5 rounded">
                        {a.objectName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg shrink-0 ml-2 ${
                a.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-500' :
                a.status === 'PENDING' ? 'bg-yellow-500/10  text-yellow-500'  :
                a.status === 'ABSENT'  ? 'bg-rose-500/10    text-rose-500'    :
                                        'bg-slate-800      text-slate-600'
              }`}>
                {a.status === 'PRESENT' ? '✓ Keldi'   :
                 a.status === 'ABSENT'  ? '✗ Kelmadi' :
                 a.status === 'PENDING' ? '⏳ Kutilmoqda' :
                                         '— Belgilanmagan'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── ACTIVITY LOG ── */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-900 flex items-center justify-between">
          <h3 className="font-black text-slate-300 uppercase tracking-wider text-[10px]">Oxirgi Harakatlar</h3>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 rounded-full text-[9px] font-black text-emerald-500">
            <Activity className="w-3 h-3"/> LIVE
          </div>
        </div>
        <div className="divide-y divide-slate-900 max-h-[350px] overflow-y-auto">
          {logs.length > 0 ? logs.slice(0, 10).map((log) => (
            <ActivityCard key={log._id || log.id} log={log}/>
          )) : (
            <div className="py-14 text-center">
              <Activity className="w-8 h-8 text-slate-800 mx-auto mb-2"/>
              <span className="text-slate-600 text-xs font-bold">Ma'lumot topilmadi</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── Yordamchilar ── */
const StatCard = ({ icon, label, value, trend, color }) => (
  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-lg active:scale-[0.98] transition-all">
    <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center mb-3`}>{icon}</div>
    <div>
      <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block">{label}</span>
      <h4 className="text-xl font-black text-white leading-tight mt-0.5 truncate">{value}</h4>
      <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter mt-0.5">{trend}</p>
    </div>
  </div>
);

const ActivityCard = ({ log }) => {
  const formatTime = (ts) => {
    if (!ts) return "Noma'lum";
    const d = new Date(ts);
    return isNaN(d) ? String(ts) : d.toLocaleString('uz-UZ');
  };
  return (
    <div className="flex items-start gap-3 px-4 py-3.5 hover:bg-slate-900/30 transition-colors">
      <div className="w-8 h-8 shrink-0 rounded-lg bg-slate-900 flex items-center justify-center text-[10px] font-black text-yellow-500 border border-slate-800 uppercase mt-0.5">
        {log.performer?.[0] || 'S'}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-slate-300 truncate">{log.performer}</span>
          <span className="inline-flex px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-md text-[8px] font-black uppercase border border-emerald-500/20 shrink-0">
            Tasdiqlandi
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 leading-snug">{log.action}</p>
        <p className="text-[9px] text-slate-700 font-bold mt-0.5">{formatTime(log.createdAt)}</p>
      </div>
    </div>
  );
};

export default Dashboard;