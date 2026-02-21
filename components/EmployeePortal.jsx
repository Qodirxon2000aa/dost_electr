import React, { useMemo, useState } from 'react';
import {
  CheckCircle2, BadgeDollarSign, Wallet,
  Building2, ChevronDown, Clock, X, TrendingUp
} from 'lucide-react';
import { api } from '../utils/api';

const EmployeePortal = ({ user, employees, attendance, payroll, objects, onRefresh }) => {
  const [loading, setLoading]                   = useState(false);
  const [selectedObjectId, setSelectedObjectId] = useState('');
  const [activeTab, setActiveTab]               = useState('history');
  const [expandedObj, setExpandedObj]           = useState(null);

  /* ── Xodim ── */
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
    return attendance.filter(a =>
      String(a.employeeId?._id || a.employeeId) === String(targetId)
    );
  }, [attendance, targetId]);

  const myPayroll = useMemo(() => {
    if (!targetId) return [];
    return payroll.filter(p =>
      String(p.employeeId?._id || p.employeeId) === String(targetId)
    );
  }, [payroll, targetId]);

  const approvedPayroll = useMemo(() =>
    myPayroll.filter(p => p.status === 'APPROVED'),
  [myPayroll]);

  const balanceInfo = useMemo(() => {
    const dailyRate   = Number(employeeData?.salaryRate) || 0;
    const workedDays  = myAttendance.filter(a => a.status === 'PRESENT').length;
    const totalEarned = workedDays * dailyRate;
    const totalTaken  = approvedPayroll.reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
    return { dailyRate, workedDays, totalEarned, totalTaken, remaining: totalEarned - totalTaken };
  }, [myAttendance, approvedPayroll, employeeData]);

  /* ── Obyektlar bo'yicha to'lovlar ── */
  const paymentsByObject = useMemo(() => {
    const map = {};
    approvedPayroll.forEach(p => {
      const key  = p.objectId ? String(p.objectId?._id || p.objectId) : '__none__';
      const name = p.objectName || "Belgilanmagan";
      if (!map[key]) map[key] = { name, payments: [], total: 0 };
      map[key].payments.push(p);
      map[key].total += Number(p.calculatedSalary) || 0;
    });
    return Object.entries(map)
      .map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => b.total - a.total);
  }, [approvedPayroll]);

  /* ── Check-in ── */
  const handleCheckIn = async () => {
    if (!employeeData)     return alert("Xodim ma'lumotlari topilmadi!");
    if (!targetId)         return alert("Foydalanuvchi ID aniqlanmadi!");
    if (!selectedObjectId) return alert("Obyektni tanlang!");

    const today       = new Date().toISOString().split('T')[0];
    const todayRecord = myAttendance.find(a => a.date === today);
    if (todayRecord?.status === 'PENDING') return alert("Bugun allaqachon bildirdingiz! Admin tasdiqlashini kuting.");
    if (todayRecord?.status === 'PRESENT') return alert("Bugun allaqachon tasdiqlangansiz ✅");

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
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center gap-3">
        <div className="text-slate-600 font-black uppercase text-sm">Xodim topilmadi</div>
        <div className="text-slate-700 text-xs">{user?.email || user?.name}</div>
      </div>
    );
  }

  const today    = new Date().toISOString().split('T')[0];
  const todayRec = myAttendance.find(a => a.date === today);
  const takenPct = balanceInfo.totalEarned > 0
    ? Math.min(Math.round((balanceInfo.totalTaken / balanceInfo.totalEarned) * 100), 100)
    : 0;

  /* ─── Inline mobile-first styles ─────────────────────────── */
  const css = `
    .ep-wrap{
      width:100%;
      max-width:480px;
      margin:0 auto;
      padding:12px 12px 100px;
      box-sizing:border-box;
      display:flex;
      flex-direction:column;
      gap:12px;
    }
    /* Çok küçük ekran ≤ 360px */
    @media(max-width:360px){
      .ep-wrap{padding:8px 8px 90px;gap:8px;}
      .ep-amount{font-size:1.4rem!important;}
      .ep-statval{font-size:0.8rem!important;}
      .ep-empname{font-size:0.9rem!important;}
      .ep-grid3{gap:5px!important;}
      .ep-padcard{padding:12px!important;}
    }
    /* Normal telefon 361–480 */
    @media(min-width:361px) and (max-width:480px){
      .ep-amount{font-size:1.7rem!important;}
    }
    /* Planshet / PC */
    @media(min-width:481px){
      .ep-wrap{max-width:500px;padding:20px 16px 80px;gap:14px;}
    }
    /* Smooth scroll listlar */
    .ep-list{
      max-height:400px;
      overflow-y:auto;
      -webkit-overflow-scrolling:touch;
    }
    .ep-list::-webkit-scrollbar{width:3px;}
    .ep-list::-webkit-scrollbar-track{background:transparent;}
    .ep-list::-webkit-scrollbar-thumb{background:#334155;border-radius:10px;}
  `;

  return (
    <>
      <style>{css}</style>

      <div className="ep-wrap">

        {/* ══════════════════════════════════════
            1. HEADER
        ══════════════════════════════════════ */}
        <div className="ep-padcard bg-slate-950 rounded-2xl border border-slate-800 p-4 shadow-xl">
          {/* Ism + badge */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="bg-yellow-500 rounded-xl flex items-center justify-center text-lg font-black text-slate-950 shadow-md shadow-yellow-500/20 shrink-0"
              style={{ width:44, height:44, minWidth:44 }}
            >
              {employeeData.name[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-yellow-500 font-black uppercase text-[8px] tracking-widest truncate">
                {employeeData.position}
              </p>
              <h1 className="ep-empname text-base font-black text-white italic uppercase truncate leading-tight">
                Salom, {employeeData.name.split(' ')[0]}!
              </h1>
            </div>
            {/* Bugungi holat */}
            <div className={`shrink-0 px-2 py-1 rounded-lg text-[7px] font-black uppercase border leading-none text-center ${
              todayRec?.status === 'PRESENT'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                : todayRec?.status === 'PENDING'
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}>
              {todayRec?.status === 'PRESENT' ? '✅ Tasdiqlandi'
               : todayRec?.status === 'PENDING' ? '⏳ Kutilmoqda'
               : "— Yo'q"}
            </div>
          </div>

          {/* Obyekt select */}
          <select
            value={selectedObjectId}
            onChange={e => setSelectedObjectId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 focus:border-yellow-500 text-white px-3 py-3 rounded-xl font-bold outline-none transition-all mb-2"
            style={{ fontSize:14 }}
          >
            <option value="">— Obyektni tanlang —</option>
            {objects.map(obj => (
              <option key={obj._id || obj.id} value={obj._id || obj.id}>{obj.name}</option>
            ))}
          </select>

          {/* Check-in tugma */}
          {todayRec?.status === 'PRESENT' ? (
            <div className="w-full py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 font-black rounded-xl flex items-center justify-center gap-2 text-xs">
              ✅ Bugun tasdiqlandi{todayRec.objectName ? ` — ${todayRec.objectName}` : ''}
            </div>
          ) : todayRec?.status === 'PENDING' ? (
            <div className="w-full py-3 bg-yellow-500/10 border border-yellow-500/30 text-yellow-500 font-black rounded-xl flex items-center justify-center text-xs text-center px-3">
              ⏳ Admin tasdiqlashini kutmoqda{todayRec.objectName ? ` • ${todayRec.objectName}` : ''}
            </div>
          ) : (
            <button
              onClick={handleCheckIn}
              disabled={loading || !selectedObjectId}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl transition-all uppercase tracking-wide shadow-lg shadow-emerald-500/10"
              style={{ fontSize:14 }}
            >
              {loading ? 'Yuborilmoqda...' : '✓  Ishga Keldim'}
            </button>
          )}
        </div>

        {/* ══════════════════════════════════════
            2. BALANS KARTASI
        ══════════════════════════════════════ */}
        <div className="ep-padcard bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 rounded-2xl border border-yellow-500/20 shadow-xl">
          {/* Yuqori: balans + stavka */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="bg-yellow-500/10 rounded-xl flex items-center justify-center border border-yellow-500/20 shrink-0"
                style={{ width:36, height:36 }}
              >
                <Wallet className="text-yellow-500" size={16}/>
              </div>
              <div className="min-w-0">
                <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest mb-0.5">
                  Mavjud Balans
                </p>
                <p
                  className={`ep-amount font-black italic leading-none ${
                    balanceInfo.remaining >= 0 ? 'text-yellow-500' : 'text-rose-500'
                  }`}
                  style={{ fontSize:'1.7rem' }}
                >
                  {balanceInfo.remaining.toLocaleString()}
                  <span className="text-xs text-slate-500 not-italic ml-1">UZS</span>
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[7px] text-slate-600 font-black uppercase">Kunlik</p>
              <p className="text-white font-black text-sm">{balanceInfo.dailyRate.toLocaleString()}</p>
              <p className="text-[7px] text-slate-600">UZS/kun</p>
            </div>
          </div>

          {/* 3 stat */}
          <div className="ep-grid3 grid grid-cols-3 gap-2 mb-3">
            {[
              { label:'Ish kunlari', val:balanceInfo.workedDays,                   unit:'kun', color:'text-white'       },
              { label:'Hisoblangan', val:balanceInfo.totalEarned.toLocaleString(), unit:'UZS', color:'text-emerald-400' },
              { label:'Olingan',     val:balanceInfo.totalTaken.toLocaleString(),  unit:'UZS', color:'text-rose-400'    },
            ].map(s => (
              <div key={s.label} className="bg-slate-900/60 rounded-xl border border-slate-800 p-2 text-center">
                <p className="text-[7px] text-slate-500 font-black uppercase mb-1 leading-tight">{s.label}</p>
                <p className={`ep-statval font-black text-sm leading-tight ${s.color}`}>{s.val}</p>
                <p className="text-[7px] text-slate-600 font-bold mt-0.5">{s.unit}</p>
              </div>
            ))}
          </div>

          {/* Progress */}
          {balanceInfo.totalEarned > 0 && (
            <>
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 rounded-full transition-all"
                  style={{ width:`${takenPct}%` }}
                />
              </div>
              <p className="text-[7px] text-slate-600 font-bold mt-1 text-right">
                {takenPct}% olingan
              </p>
            </>
          )}
        </div>

        {/* ══════════════════════════════════════
            3. TAB BAR
        ══════════════════════════════════════ */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1">
          {[
            { key:'history', label:"To'lovlar",  icon:<BadgeDollarSign size={13}/> },
            { key:'objects', label:'Obyektlar',  icon:<Building2 size={13}/>       },
            { key:'days',    label:'Davomat',    icon:<CheckCircle2 size={13}/>    },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg font-black uppercase transition-all active:scale-95 ${
                activeTab === tab.key
                  ? 'bg-yellow-500 text-slate-950'
                  : 'text-slate-500 hover:text-white hover:bg-slate-900'
              }`}
              style={{ fontSize:9 }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════
            4A. TO'LOVLAR TARIXI
        ══════════════════════════════════════ */}
        {activeTab === 'history' && (
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-white font-black uppercase text-xs tracking-widest italic">
                To'lovlar Tarixi
              </h3>
              <span className="text-[8px] font-black text-slate-500 bg-slate-800 px-2 py-1 rounded-lg">
                {myPayroll.length} ta
              </span>
            </div>
            <div className="ep-list divide-y divide-slate-900">
              {[...myPayroll].reverse().map(p => (
                <div
                  key={p._id || p.id}
                  className="flex justify-between items-center px-4 py-3.5 hover:bg-slate-900/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`shrink-0 rounded-xl flex items-center justify-center ${
                        p.status === 'PENDING'
                          ? 'bg-yellow-500/10 text-yellow-500'
                          : 'bg-emerald-500/10 text-emerald-500'
                      }`}
                      style={{ width:34, height:34 }}
                    >
                      <BadgeDollarSign size={14}/>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-black text-sm leading-tight truncate">
                        {p.date || p.month}
                      </p>
                      {p.objectName && (
                        <span className="text-[7px] text-blue-400 font-black bg-blue-500/10 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          {p.objectName}
                        </span>
                      )}
                      <p className={`text-[7px] font-black uppercase mt-0.5 ${
                        p.status === 'PENDING' ? 'text-yellow-500' : 'text-emerald-500'
                      }`}>
                        {p.status === 'PENDING' ? '⏳ Kutilmoqda' : '✅ Tasdiqlandi'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-sm font-black text-white italic leading-tight">
                      {(Number(p.calculatedSalary) || 0).toLocaleString()}
                    </p>
                    <p className="text-[7px] text-slate-600 font-bold">UZS</p>
                  </div>
                </div>
              ))}
              {myPayroll.length === 0 && (
                <div className="py-14 text-center text-slate-700 font-black uppercase text-xs">
                  To'lovlar tarixi yo'q
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            4B. OBYEKTLAR BO'YICHA TO'LOVLAR
        ══════════════════════════════════════ */}
        {activeTab === 'objects' && (
          <div className="space-y-3">

            {/* Mini xulosa */}
            {paymentsByObject.length > 0 && (
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="text-purple-400 shrink-0" size={14}/>
                  <h3 className="text-white font-black uppercase text-xs italic">Taqsimot xulosa</h3>
                </div>
                <div className="space-y-2.5">
                  {paymentsByObject.map(obj => {
                    const pct = balanceInfo.totalTaken > 0
                      ? Math.round((obj.total / balanceInfo.totalTaken) * 100) : 0;
                    return (
                      <div key={obj.id} className="flex items-center gap-2">
                        <div
                          className="bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center shrink-0"
                          style={{ width:26, height:26 }}
                        >
                          <Building2 className="text-blue-400" size={11}/>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-0.5 gap-1">
                            <span className="text-white font-black text-xs truncate">{obj.name}</span>
                            <span className="text-yellow-500 font-black text-xs shrink-0">
                              {obj.total.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width:`${pct}%` }}
                            />
                          </div>
                          <p className="text-[7px] text-slate-600 font-bold mt-0.5">
                            {pct}% • {obj.payments.length} ta to'lov
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Accordion — har bir obyekt */}
            {paymentsByObject.map(obj => (
              <div key={obj.id} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedObj(expandedObj === obj.id ? null : obj.id)}
                  className="w-full px-4 py-3.5 flex items-center gap-3 hover:bg-slate-900/30 transition-colors"
                >
                  <div
                    className="bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center shrink-0"
                    style={{ width:36, height:36 }}
                  >
                    <Building2 className="text-blue-400" size={15}/>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-white font-black text-sm truncate">{obj.name}</p>
                    <p className="text-slate-500 font-bold" style={{ fontSize:8 }}>
                      {obj.payments.length} ta to'lov
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-yellow-500 font-black text-sm italic">
                        {obj.total.toLocaleString()}
                      </p>
                      <p className="text-slate-600 font-bold" style={{ fontSize:7 }}>UZS jami</p>
                    </div>
                    <ChevronDown
                      size={14}
                      className={`text-slate-500 transition-transform ${
                        expandedObj === obj.id ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </button>

                {expandedObj === obj.id && (
                  <div className="border-t border-slate-800">
                    <div className="px-4 py-2 bg-slate-900/40">
                      <p className="text-slate-500 font-black uppercase tracking-widest" style={{ fontSize:7 }}>
                        Qachon • Qancha
                      </p>
                    </div>
                    <div className="ep-list divide-y divide-slate-900" style={{ maxHeight:280 }}>
                      {[...obj.payments]
                        .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
                        .map(p => (
                          <div
                            key={p._id || p.id}
                            className="flex justify-between items-center px-4 py-3 hover:bg-slate-900/20 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className="bg-emerald-500/10 rounded-lg flex items-center justify-center shrink-0"
                                style={{ width:30, height:30 }}
                              >
                                <BadgeDollarSign className="text-emerald-500" size={13}/>
                              </div>
                              <div className="min-w-0">
                                <p className="text-white font-black text-xs leading-tight">
                                  {p.date || p.month}
                                </p>
                                <p className="text-slate-500 font-bold" style={{ fontSize:7 }}>
                                  {p.type === 'QUICK_ADD' ? '⚡ Avans' : '💰 Oylik'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className="text-emerald-400 font-black text-sm italic">
                                {(Number(p.calculatedSalary) || 0).toLocaleString()}
                              </p>
                              <p className="text-slate-600 font-bold" style={{ fontSize:7 }}>UZS</p>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                    {/* Jami pastki qism */}
                    <div className="px-4 py-3 bg-slate-900/50 border-t border-slate-800 flex justify-between items-center">
                      <p className="text-slate-500 font-black uppercase" style={{ fontSize:8 }}>
                        Ushbu obyektdan jami:
                      </p>
                      <p className="text-yellow-500 font-black text-sm italic">
                        {obj.total.toLocaleString()}
                        <span className="text-slate-500 not-italic ml-1" style={{ fontSize:8 }}>UZS</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {paymentsByObject.length === 0 && (
              <div className="bg-slate-950 rounded-2xl border border-slate-800 py-14 text-center">
                <p className="text-slate-700 font-black uppercase text-xs">
                  Hali hech qaysi obyektdan to'lov yo'q
                </p>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════
            4C. DAVOMAT TARIXI
        ══════════════════════════════════════ */}
        {activeTab === 'days' && (
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="px-4 py-3 bg-slate-900/50 border-b border-slate-800 flex justify-between items-center">
              <h3 className="text-white font-black uppercase text-xs tracking-widest italic">
                Davomat Tarixi
              </h3>
              <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                {myAttendance.filter(a => a.status === 'PRESENT').length} kun
              </span>
            </div>
            <div className="ep-list divide-y divide-slate-900">
              {[...myAttendance].reverse().map(a => (
                <div
                  key={a._id || a.id}
                  className="flex justify-between items-center px-4 py-3.5 hover:bg-slate-900/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`shrink-0 rounded-xl flex items-center justify-center ${
                        a.status === 'PRESENT' ? 'bg-emerald-500/10 text-emerald-500'
                        : a.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-500'
                        : 'bg-slate-800 text-slate-500'
                      }`}
                      style={{ width:34, height:34 }}
                    >
                      {a.status === 'PRESENT' ? <CheckCircle2 size={14}/>
                       : a.status === 'PENDING' ? <Clock size={14}/>
                       : <X size={14}/>}
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-black text-sm leading-tight">{a.date}</p>
                      {a.objectName && (
                        <span className="text-[7px] text-blue-400 font-black bg-blue-500/10 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          {a.objectName}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 font-black uppercase px-2 py-1 rounded-lg border ${
                      a.status === 'PRESENT'
                        ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
                        : a.status === 'PENDING'
                        ? 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
                        : 'text-slate-500 bg-slate-800 border-slate-700'
                    }`}
                    style={{ fontSize:7 }}
                  >
                    {a.status === 'PRESENT' ? '✅ Keldi'
                     : a.status === 'PENDING' ? '⏳ Kutilmoqda'
                     : '❌ Kelmadi'}
                  </span>
                </div>
              ))}
              {myAttendance.length === 0 && (
                <div className="py-14 text-center text-slate-700 font-black uppercase text-xs">
                  Davomat tarixi yo'q
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </>
  );
};

export default EmployeePortal;