import React, { useMemo, useState } from 'react';
import { CheckCircle2, BadgeDollarSign, Wallet } from 'lucide-react';
import { api } from '../utils/api';

const EmployeePortal = ({ user, employees, attendance, payroll, objects, onRefresh }) => {
  const [loading, setLoading]                   = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState('');

  const employeeData = useMemo(() => {
    if (!user || !employees.length) return null;
    return employees.find(e =>
      e._id   === user._id  ||
      e._id   === user.uid  ||
      e.uid   === user._id  ||
      e.uid   === user.uid  ||
      e.email === user.email
    ) || null;
  }, [employees, user]);

  const targetId = employeeData?._id || employeeData?.uid || null;

  const myAttendance = useMemo(() => {
    if (!targetId) return [];
    return attendance.filter(a => {
      const aId = a.employeeId?._id || a.employeeId;
      return String(aId) === String(targetId);
    });
  }, [attendance, targetId]);

  const myPayroll = useMemo(() => {
    if (!targetId) return [];
    return payroll.filter(p => {
      const pId = p.employeeId?._id || p.employeeId;
      return String(pId) === String(targetId);
    });
  }, [payroll, targetId]);

  const balanceInfo = useMemo(() => {
    const dailyRate   = Number(employeeData?.salaryRate) || 0;
    const workedDays  = myAttendance.filter(a => a.status === 'PRESENT').length;
    const totalEarned = workedDays * dailyRate;
    const totalTaken  = myPayroll
      .filter(p => p.status === 'APPROVED')
      .reduce((sum, p) => sum + (Number(p.calculatedSalary) || 0), 0);
    const remaining   = totalEarned - totalTaken;
    return { dailyRate, workedDays, totalEarned, totalTaken, remaining };
  }, [myAttendance, myPayroll, employeeData]);

  const handleCheckIn = async () => {
    if (!employeeData)     return alert("Xodim ma'lumotlari topilmadi!");
    if (!targetId)         return alert("Foydalanuvchi ID aniqlanmadi!");
    if (!selectedObjectId) return alert("Obyektni tanlang!");

    const today       = new Date().toISOString().split('T')[0];
    const todayRecord = myAttendance.find(a => a.date === today);

    if (todayRecord?.status === 'PENDING') return alert("Siz bugun allaqachon ishga kelganingizni bildirdingiz!");
    if (todayRecord?.status === 'PRESENT') return alert("Siz bugun allaqachon tasdiqlangansiz ✅");

    setLoading(true);
    try {
      const objName = objects.find(o => (o._id || o.id) === selectedObjectId)?.name || "Noma'lum";
      await api.upsertAttendance({
        employeeId: targetId,
        objectId:   selectedObjectId,
        objectName: objName,
        date:       today,
        status:     'PENDING',
        markedBy:   'employee',
      });
      alert("Ishga kelganingiz qayd etildi! Admin tasdiqlashini kuting.");
      onRefresh();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!employeeData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 gap-4">
        <div className="text-slate-600 font-black text-center uppercase text-sm">Xodim ma'lumotlari topilmadi</div>
        <div className="text-slate-700 text-xs text-center">Email: {user?.email}</div>
      </div>
    );
  }

  const today       = new Date().toISOString().split('T')[0];
  const todayRecord = myAttendance.find(a => a.date === today);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 p-3 pb-10">

      {/* ── HEADER ── */}
      <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 shrink-0 bg-yellow-500 rounded-2xl flex items-center justify-center text-2xl font-black text-slate-950 shadow-md shadow-yellow-500/20">
            {employeeData.name[0]}
          </div>
          <div className="min-w-0">
            <p className="text-yellow-500 font-black uppercase text-[9px] tracking-[0.2em] truncate">{employeeData.position}</p>
            <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase truncate">
              SALOM, {employeeData.name.split(' ')[0]}!
            </h1>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <select
            value={selectedObjectId}
            onChange={e => setSelectedObjectId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 text-white px-4 py-3.5 rounded-2xl font-bold text-sm outline-none focus:border-yellow-500 transition-all"
          >
            <option value="">— Obyektni tanlang —</option>
            {objects.map(obj => (
              <option key={obj._id || obj.id} value={obj._id || obj.id}>{obj.name}</option>
            ))}
          </select>

          {todayRecord?.status === 'PRESENT' ? (
            <div className="w-full py-3.5 bg-emerald-500/10 border border-emerald-500 text-emerald-500 font-black rounded-2xl flex items-center justify-center gap-2 text-sm">
              ✅ Bugun tasdiqlandi
            </div>
          ) : todayRecord?.status === 'PENDING' ? (
            <div className="w-full py-3.5 bg-yellow-500/10 border border-yellow-500 text-yellow-500 font-black rounded-2xl flex items-center justify-center gap-2 text-xs text-center">
              ⏳ Admin tasdiqlashini kutmoqda
            </div>
          ) : (
            <button
              onClick={handleCheckIn}
              disabled={loading || !selectedObjectId}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black rounded-2xl transition-all text-sm"
            >
              {loading ? 'Yuborilmoqda...' : '✓ ISHGA KELDIM'}
            </button>
          )}
        </div>
      </div>

      {/* ── BALANS KARTASI ── */}
      <div className="bg-gradient-to-br from-slate-950 to-slate-900 p-5 rounded-3xl border border-yellow-500/20 shadow-xl">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 shrink-0 bg-yellow-500/10 rounded-2xl flex items-center justify-center border border-yellow-500/20">
            <Wallet className="text-yellow-500" size={22} />
          </div>
          <div>
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Mavjud Balans</p>
            <p className={`text-3xl font-black italic leading-tight ${balanceInfo.remaining >= 0 ? 'text-yellow-500' : 'text-rose-500'}`}>
              {balanceInfo.remaining.toLocaleString()}
              <span className="text-sm text-slate-500 not-italic ml-1">UZS</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-center">
            <p className="text-[8px] text-slate-500 font-black uppercase tracking-wide mb-1">Ish kunlari</p>
            <p className="text-xl font-black text-white">{balanceInfo.workedDays}</p>
            <p className="text-[8px] text-slate-600 font-bold">kun</p>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-center">
            <p className="text-[8px] text-slate-500 font-black uppercase tracking-wide mb-1">Hisoblangan</p>
            <p className="text-lg font-black text-emerald-500 leading-tight">{balanceInfo.totalEarned.toLocaleString()}</p>
            <p className="text-[8px] text-slate-600 font-bold">UZS</p>
          </div>
          <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 text-center">
            <p className="text-[8px] text-slate-500 font-black uppercase tracking-wide mb-1">Olingan</p>
            <p className="text-lg font-black text-rose-400 leading-tight">{balanceInfo.totalTaken.toLocaleString()}</p>
            <p className="text-[8px] text-slate-600 font-bold">UZS</p>
          </div>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-950 p-4 rounded-3xl border border-slate-800 flex items-center gap-3 shadow-lg">
          <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-blue-500 bg-blue-500/10 border border-blue-500/20">
            <BadgeDollarSign size={18} />
          </div>
          <div className="min-w-0">
            <p className="text-[8px] text-slate-500 font-black uppercase tracking-wide">Kunlik stavka</p>
            <p className="text-base font-black text-white italic truncate">{balanceInfo.dailyRate.toLocaleString()}</p>
            <p className="text-[8px] text-slate-600">UZS</p>
          </div>
        </div>

        <div className="bg-slate-950 p-4 rounded-3xl border border-slate-800 flex items-center gap-3 shadow-lg">
          <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-emerald-500 bg-emerald-500/10 border border-emerald-500/20">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-[8px] text-slate-500 font-black uppercase tracking-wide">Ish kunlari</p>
            <p className="text-base font-black text-white italic">{balanceInfo.workedDays} KUN</p>
          </div>
        </div>
      </div>

      {/* ── TO'LOVLAR TARIXI ── */}
      <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-5 py-4 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-white font-black uppercase text-xs tracking-widest italic">To'lovlar Tarixi</h3>
          <span className="text-[9px] font-black text-slate-500 uppercase bg-slate-800 px-2 py-1 rounded-lg">
            {myPayroll.length} ta
          </span>
        </div>
        <div className="divide-y divide-slate-900 max-h-[400px] overflow-y-auto">
          {[...myPayroll].reverse().map(p => (
            <div
              key={p._id || p.id}
              className="flex justify-between items-center px-5 py-4 hover:bg-slate-900/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
                  p.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-emerald-500/10 text-emerald-500'
                }`}>
                  <BadgeDollarSign size={18} />
                </div>
                <div>
                  <span className="text-white font-black text-sm block leading-tight">{p.date || p.month}</span>
                  <span className={`text-[9px] font-black uppercase ${p.status === 'PENDING' ? 'text-yellow-500' : 'text-emerald-500'}`}>
                    {p.status === 'PENDING' ? '⏳ Kutilmoqda' : '✅ Tasdiqlandi'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-white italic block">
                  {(Number(p.calculatedSalary) || 0).toLocaleString()}
                  <span className="text-[9px] text-slate-500 not-italic ml-1">UZS</span>
                </span>
                <p className="text-[8px] text-slate-600 font-bold uppercase">⚡ Oylik</p>
              </div>
            </div>
          ))}
          {myPayroll.length === 0 && (
            <div className="py-16 text-center text-slate-700 font-black uppercase text-xs">
              To'lovlar tarixi yo'q
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeePortal;