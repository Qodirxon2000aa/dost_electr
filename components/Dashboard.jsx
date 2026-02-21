import React, { useMemo, useState } from 'react';
import { Users, CalendarCheck, CreditCard, AlertCircle, Activity, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const Dashboard = ({ employees, attendance, payroll, logs }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const goDay = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const activeEmployees = employees.filter(e => e.status === 'ACTIVE').length;
    const currentMonth    = selectedDate.slice(0, 7);

    const presentOnDate = attendance.filter(a => a.date === selectedDate && a.status === 'PRESENT').length;
    const pendingOnDate = attendance.filter(a => a.date === selectedDate && a.status === 'PENDING').length;
    const absentOnDate  = attendance.filter(a => a.date === selectedDate && a.status === 'ABSENT').length;

    const attendanceRate = activeEmployees > 0
      ? Math.round((presentOnDate / activeEmployees) * 100) : 0;

    const totalPayrollMonth = payroll
      .filter(p => p.month === currentMonth && p.status === 'APPROVED')
      .reduce((acc, curr) => acc + (Number(curr.calculatedSalary) || 0), 0);

    const statusData = [
      { name: 'Kelgan',     value: presentOnDate,                                                              color: '#10b981' },
     
      { name: 'Kelmagan',   value: Math.max(0, activeEmployees - presentOnDate - pendingOnDate - absentOnDate), color: '#f43f5e' },
    ].filter(d => d.value > 0);

    // Barcha faol xodimlarni ko'rsatish — yozuv bo'lmasa NO_RECORD
    const dayAttendance = employees
      .filter(e => e.status === 'ACTIVE')
      .map(emp => {
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
          status:      record?.status || 'NO_RECORD',
        };
      });

    return {
      activeEmployees, presentOnDate, pendingOnDate, absentOnDate,
      totalPayrollMonth, attendanceRate, statusData, dayAttendance
    };
  }, [employees, attendance, payroll, selectedDate]);

  const formatSelectedDate = () => {
    const d = new Date(selectedDate);
    return d.toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const noRecordCount = stats.dayAttendance.filter(a => a.status === 'NO_RECORD').length;

  return (
    <div className="space-y-4 pb-10 animate-in fade-in duration-700">

      {/* ── SARLAVHA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight italic uppercase">
            Tizim <span className="text-yellow-500">Ma'lumotlari</span>
          </h1>
          <p className="text-slate-500 text-xs font-medium mt-0.5">
            Sanani tanlang — o'sha kundagi ma'lumotlar ko'rinadi.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-950 rounded-xl border border-slate-800 text-xs font-bold text-slate-300 w-fit">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          {isToday ? 'Bugun' : 'Tanlangan sana'}
        </div>
      </div>

      {/* ── KALENDAR FILTER ── */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 shadow-xl">
        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-3">Sana tanlang</p>

        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => goDay(-1)}
            className="w-9 h-9 bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex-1">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full bg-slate-900 border border-slate-700 focus:border-yellow-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm outline-none transition-all"
            />
          </div>

          <button
            onClick={() => goDay(1)}
            disabled={isToday}
            className="w-9 h-9 bg-slate-900 hover:bg-slate-800 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed border border-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-all"
          >
            <ChevronRight size={16} />
          </button>

          {!isToday && (
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-500 font-black text-[10px] rounded-xl uppercase transition-all active:scale-95"
            >
              Bugun
            </button>
          )}
        </div>

        {/* Tanlangan sana ko'rinishi */}
        <div className="bg-slate-900/50 rounded-xl px-4 py-2.5 border border-slate-800 mb-3">
          <p className="text-white font-black text-sm capitalize">{formatSelectedDate()}</p>
          <p className="text-slate-500 text-[10px] font-bold mt-0.5">
            {stats.activeEmployees} ta xodim • {stats.presentOnDate} kelgan • {stats.pendingOnDate}  belgilanmagan
          </p>
        </div>

        {/* Tezkor sana tugmalari */}
        <div className="grid grid-cols-4 gap-2">
          {[-3, -2, -1, 0].map(delta => {
            const d   = new Date();
            d.setDate(d.getDate() + delta);
            const val = d.toISOString().split('T')[0];
            const label = delta === 0 ? 'Bugun'
              : delta === -1 ? 'Kecha'
              : delta === -2 ? '2 kun'
              : '3 kun';
            const isSelected = selectedDate === val;
            return (
              <button
                key={delta}
                onClick={() => setSelectedDate(val)}
                className={`py-2 rounded-xl text-[10px] font-black transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-yellow-500 text-slate-950'
                    : 'bg-slate-900 text-slate-500 hover:text-white border border-slate-800'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={<Users className="w-5 h-5 text-blue-500" />}        label="Xodimlar"    value={stats.activeEmployees}                trend="Faol"                          color="bg-blue-500/10" />
        <StatCard icon={<CalendarCheck className="w-5 h-5 text-emerald-500" />} label="Davomat" value={`${stats.attendanceRate}%`}           trend={`${stats.presentOnDate} kelgan`} color="bg-emerald-500/10" />
        <StatCard icon={<CreditCard className="w-5 h-5 text-yellow-500" />} label="Oylik maosh" value={stats.totalPayrollMonth.toLocaleString()} trend={`${selectedDate.slice(0, 7)} oy`} color="bg-yellow-500/10" />
        <StatCard icon={<AlertCircle className="w-5 h-5 text-rose-500" />}  label="Amallar"     value={logs.length}                          trend="Jami Amallar"                      color="bg-rose-500/10" />
      </div>

      {/* ── PIE CHART ── */}
      <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <h3 className="font-black text-slate-300 uppercase tracking-wider text-[10px] mb-4 text-center">
          {isToday ? 'Bugungi' : selectedDate} Davomat Statistikasi
        </h3>
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="h-[180px] w-full sm:w-[180px] shrink-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusData.length > 0 ? stats.statusData : [{ name: "Yo'q", value: 1, color: '#1e293b' }]}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={70}
                  paddingAngle={stats.statusData.length > 1 ? 8 : 0}
                  dataKey="value"
                  stroke="none"
                >
                  {(stats.statusData.length > 0 ? stats.statusData : [{ color: '#1e293b' }]).map((entry, i) => (
                    <Cell key={i} fill={entry.color} cornerRadius={8} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
              <span className="text-2xl font-black text-white">{stats.presentOnDate}</span>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Kelgan</span>
            </div>
          </div>

          <div className="w-full space-y-2">
            {stats.statusData.length > 0 ? stats.statusData.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
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

      {/* ── KUN DAVOMAT RO'YXATI ── */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-900 flex items-center justify-between">
          <h3 className="font-black text-slate-300 uppercase tracking-wider text-[10px]">
            {isToday ? 'Bugungi' : selectedDate} Davomat
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">{stats.presentOnDate} kelgan</span>
            <span className="text-[9px] font-black text-slate-500 bg-slate-900 px-2 py-1 rounded-lg">{stats.activeEmployees} ta</span>
          </div>
        </div>

        <div className="divide-y divide-slate-900 max-h-[400px] overflow-y-auto">
          {stats.dayAttendance.map((a) => (
            <div key={String(a._id)} className="flex items-center justify-between px-4 py-3 hover:bg-slate-900/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar */}
                <div className={`w-8 h-8 shrink-0 rounded-xl flex items-center justify-center font-black text-xs ${
                  a.status === 'PRESENT'   ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                  a.status === 'PENDING'   ? 'bg-yellow-500/10  text-yellow-500  border border-yellow-500/20'  :
                  a.status === 'ABSENT'    ? 'bg-rose-500/10    text-rose-500    border border-rose-500/20'     :
                                            'bg-slate-800      text-slate-600   border border-slate-700'
                }`}>
                  {a.empName?.[0] || '?'}
                </div>

                <div className="min-w-0">
                  <p className="text-white font-black text-sm truncate">{a.empName}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[9px] text-slate-500 font-bold uppercase">{a.empPosition}</span>
                    {a.objectName && (
                      <span className="text-[9px] text-blue-400 font-black bg-blue-500/10 px-1.5 py-0.5 rounded">
                        {a.objectName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status badge */}
              <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg shrink-0 ml-2 ${
                a.status === 'PRESENT'   ? 'bg-emerald-500/10 text-emerald-500' :
                a.status === 'PENDING'   ? 'bg-yellow-500/10  text-yellow-500'  :
                a.status === 'ABSENT'    ? 'bg-rose-500/10    text-rose-500'    :
                                          'bg-slate-800      text-slate-600'
              }`}>
                {a.status === 'PRESENT'  ? '✓ Keldi'         :
                
                 a.status === 'ABSENT'   ? '✗ Kelmadi'       :
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
            <Activity className="w-3 h-3" /> LIVE
          </div>
        </div>
        <div className="divide-y divide-slate-900 max-h-[350px] overflow-y-auto">
          {logs.length > 0 ? logs.slice(0, 10).map((log) => (
            <ActivityCard key={log._id || log.id} log={log} />
          )) : (
            <div className="py-14 text-center">
              <Activity className="w-8 h-8 text-slate-800 mx-auto mb-2" />
              <span className="text-slate-600 text-xs font-bold">Ma'lumot topilmadi</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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