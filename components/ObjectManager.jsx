import React, { useState } from 'react';
import { Building2, Plus, Trash2, ShieldCheck, TrendingDown, ChevronDown, PlusCircle, History } from 'lucide-react';
import { api } from '../utils/api';

const ObjectsManager = ({ objects, payroll, userRole, onRefresh }) => {
  const [showForm, setShowForm]           = useState(false);
  const [newName, setNewName]             = useState('');
  const [newBudget, setNewBudget]         = useState('');
  const [expandedId, setExpandedId]       = useState(null);
  const [incomeObjId, setIncomeObjId]     = useState(null);
  const [incomeAmount, setIncomeAmount]   = useState('');
  const [incomeComment, setIncomeComment] = useState('');
  const [incomeLoading, setIncomeLoading] = useState(false);
  const [historyObjId, setHistoryObjId]   = useState(null);

  const isSuper = userRole === 'SUPER_ADMIN';

  const getObjectSpent = (objId) => {
    if (!payroll || !payroll.length) return 0;
    return payroll
      .filter(p =>
        p.status === 'APPROVED' &&
        String(p.objectId?._id || p.objectId) === String(objId)
      )
      .reduce((s, p) => s + (Number(p.calculatedSalary) || 0), 0);
  };

  const handleAdd = async () => {
    if (!isSuper || !newName.trim()) return;
    try {
      await api.createObject({
        name:        newName.trim(),
        totalBudget: Number(newBudget) || 0,
        status:      'active',
      });
      setNewName('');
      setNewBudget('');
      setShowForm(false);
      onRefresh();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Obyektni o'chirishga aminmisiz?")) return;
    try {
      await api.deleteObject(id);
      setExpandedId(null);
      onRefresh();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    }
  };

  const handleAddIncome = async (objId) => {
    const amount = Number(incomeAmount);
    if (!amount || isNaN(amount) || amount <= 0) return alert("Summani kiriting!");
    setIncomeLoading(true);
    try {
      await api.addObjectIncome(objId, {
        amount:  amount,
        comment: incomeComment.trim(),
      });
      setIncomeAmount('');
      setIncomeComment('');
      setIncomeObjId(null);
      onRefresh();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    } finally {
      setIncomeLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(prev => prev === id ? null : id);
    setIncomeObjId(null);
    setHistoryObjId(null);
    setIncomeAmount('');
    setIncomeComment('');
  };

  return (
    <div className="space-y-4 pb-10">

      {/* ── SARLAVHA ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-white flex items-center gap-3 italic">
          <Building2 className="text-yellow-500 shrink-0" size={24} />
          OBYEKTLAR
          <span className="text-slate-700">|</span>
          <span className="text-yellow-500">{objects.length}</span>
        </h2>
        <div className="flex items-center gap-2">
          {isSuper && (
            <span className="px-3 py-1.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 w-fit">
              <ShieldCheck size={12}/> Super Admin
            </span>
          )}
          {isSuper && (
            <button
              onClick={() => setShowForm(f => !f)}
              className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 active:scale-95 text-slate-950 font-black rounded-xl text-[10px] uppercase flex items-center gap-2 transition-all"
            >
              <Plus size={14}/> Qo'shish
            </button>
          )}
        </div>
      </div>

      {/* ── QO'SHISH FORMASI ── */}
      {isSuper && showForm && (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-3">
          <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Yangi obyekt ma'lumotlari</p>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Obyekt nomi (masalan: Tashkent City)"
            className="w-full bg-slate-900 text-white px-4 py-3.5 rounded-xl font-bold text-sm outline-none border border-slate-800 focus:border-yellow-500 transition-all placeholder:text-slate-700"
          />
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs">UZS</span>
            <input
              value={newBudget}
              onChange={e => setNewBudget(e.target.value)}
              inputMode="numeric"
              type="number"
              placeholder="Boshlang'ich byudjet (ixtiyoriy)"
              className="w-full bg-slate-900 text-white pl-12 pr-4 py-3.5 rounded-xl font-bold text-sm outline-none border border-slate-800 focus:border-yellow-500 transition-all placeholder:text-slate-700"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="flex-1 py-3.5 bg-yellow-500 hover:bg-yellow-400 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-black rounded-xl text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
            >
              <Plus size={16}/> Saqlash
            </button>
            <button
              onClick={() => { setShowForm(false); setNewName(''); setNewBudget(''); }}
              className="px-5 py-3.5 bg-slate-900 text-slate-400 rounded-xl border border-slate-800 font-black text-xs active:scale-95 transition-all"
            >
              Bekor
            </button>
          </div>
        </div>
      )}

      {/* ── OBYEKTLAR RO'YXATI ── */}
      {objects.length === 0 ? (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-12 text-center">
          <Building2 className="text-slate-800 mx-auto mb-3" size={40} />
          <p className="text-slate-700 font-black uppercase text-xs">Obyektlar yo'q</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {objects.map(obj => {
            const id          = obj._id || obj.id;
            const spent       = getObjectSpent(id);
            const budget      = Number(obj.totalBudget) || 0;
            const balance     = budget - spent;
            const hasBudget   = budget > 0;
            const isNegative  = hasBudget && balance < 0;
            const pct         = hasBudget ? Math.min(Math.round((spent / budget) * 100), 100) : 0;
            const isExpanded  = expandedId === id;
            const showIncome  = incomeObjId === id;
            const showHistory = historyObjId === id;
            const history     = obj.incomeHistory || [];

            return (
              <div
                key={id}
                className={`bg-slate-950 border rounded-2xl transition-all ${
                  isNegative ? 'border-rose-500/40' : isExpanded ? 'border-yellow-500/30' : 'border-slate-800'
                }`}
              >
                {/* ── Karta — bosganda expand ── */}
                <button
                  onClick={() => toggleExpand(id)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border ${
                        isNegative
                          ? 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                          : 'bg-slate-800 border-slate-700 text-yellow-500'
                      }`}>
                        <Building2 size={18}/>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-black text-sm truncate">{obj.name}</p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase">
                          {obj.status === 'active' ? '🟢 Faol' : '🔴 Nofaol'}
                        </p>
                      </div>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-slate-500 shrink-0 mt-1 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </div>

                  {/* Moliya */}
                  {hasBudget ? (
                    <>
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800 text-center">
                          <p className="text-[7px] text-slate-500 font-black uppercase mb-0.5">Byudjet</p>
                          <p className="text-white font-black text-xs">{budget.toLocaleString()}</p>
                        </div>
                        <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800 text-center">
                          <p className="text-[7px] text-slate-500 font-black uppercase mb-0.5">Xarajat</p>
                          <p className="text-yellow-500 font-black text-xs">{spent.toLocaleString()}</p>
                        </div>
                        <div className={`p-2 rounded-xl border text-center ${
                          isNegative ? 'bg-rose-500/10 border-rose-500/20' : 'bg-emerald-500/10 border-emerald-500/20'
                        }`}>
                          <p className="text-[7px] text-slate-500 font-black uppercase mb-0.5">Qoldiq</p>
                          <p className={`font-black text-xs ${isNegative ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {isNegative ? '−' : ''}{Math.abs(balance).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isNegative ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${isNegative ? 100 : pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[8px] text-slate-600 font-bold">{pct}% ishlatildi</span>
                        {isNegative && (
                          <span className="text-[8px] text-rose-500 font-black flex items-center gap-1">
                            <TrendingDown size={9}/> Limit oshdi
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="bg-slate-900/40 rounded-xl p-2.5 border border-slate-800 text-center">
                      <p className="text-[8px] text-slate-500 font-black uppercase mb-0.5">Jami xarajat</p>
                      <p className="text-yellow-500 font-black text-sm">
                        {spent.toLocaleString()} <span className="text-[9px] text-slate-600">UZS</span>
                      </p>
                    </div>
                  )}
                </button>

                {/* ── KENGAYTIRILGAN PANEL ── */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3 border-t border-slate-800 pt-3">

                    {/* Tugmalar */}
                    <div className="flex gap-2">
                      {isSuper && (
                        <button
                          onClick={() => {
                            setIncomeObjId(showIncome ? null : id);
                            setHistoryObjId(null);
                            setIncomeAmount('');
                            setIncomeComment('');
                          }}
                          className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                            showIncome
                              ? 'bg-emerald-500 text-white'
                              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                        >
                          <PlusCircle size={13}/> Kirim qo'shish
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setHistoryObjId(showHistory ? null : id);
                          setIncomeObjId(null);
                        }}
                        className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                          showHistory
                            ? 'bg-blue-500 text-white'
                            : 'bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20'
                        }`}
                      >
                        <History size={13}/> Kirim tarixi
                      </button>
                      {isSuper && (
                        <button
                          onClick={() => handleDelete(id)}
                          className="w-10 h-10 shrink-0 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center hover:bg-rose-500 hover:text-white active:scale-95 transition-all"
                        >
                          <Trash2 size={15}/>
                        </button>
                      )}
                    </div>

                    {/* Kirim qo'shish formasi */}
                    {showIncome && isSuper && (
                      <div className="bg-slate-900 rounded-xl border border-emerald-500/20 p-3 space-y-2">
                        <p className="text-[8px] text-emerald-500 font-black uppercase tracking-widest">
                          Byudjetga kirim qo'shish
                        </p>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-black">UZS</span>
                          <input
                            autoFocus
                            inputMode="numeric"
                            type="number"
                            min="1"
                            value={incomeAmount}
                            onChange={e => setIncomeAmount(e.target.value)}
                            placeholder="Summa"
                            className="w-full bg-slate-950 text-white pl-10 pr-3 py-3 rounded-xl font-black text-sm outline-none border border-slate-800 focus:border-emerald-500 transition-all placeholder:text-slate-700"
                          />
                        </div>
                        <input
                          value={incomeComment}
                          onChange={e => setIncomeComment(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddIncome(id)}
                          placeholder="Izoh (ixtiyoriy)"
                          className="w-full bg-slate-950 text-white px-3 py-3 rounded-xl font-bold text-sm outline-none border border-slate-800 focus:border-emerald-500 transition-all placeholder:text-slate-700"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddIncome(id)}
                            disabled={incomeLoading || !incomeAmount || Number(incomeAmount) <= 0}
                            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 text-white font-black rounded-xl text-[10px] uppercase transition-all"
                          >
                            {incomeLoading ? 'Saqlanmoqda...' : "+ Qo'shish"}
                          </button>
                          <button
                            onClick={() => { setIncomeObjId(null); setIncomeAmount(''); setIncomeComment(''); }}
                            className="px-4 py-2.5 bg-slate-800 text-slate-400 rounded-xl font-black text-[10px] active:scale-95 transition-all"
                          >
                            Bekor
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Kirim tarixi */}
                    {showHistory && (
                      <div className="bg-slate-900 rounded-xl border border-blue-500/20 overflow-hidden">
                        <div className="px-3 py-2 border-b border-slate-800">
                          <p className="text-[8px] text-blue-400 font-black uppercase tracking-widest">
                            Kirim tarixi — {history.length} ta
                          </p>
                        </div>
                        <div className="max-h-[200px] overflow-y-auto divide-y divide-slate-800">
                          {history.length === 0 ? (
                            <div className="py-6 text-center text-slate-700 font-black uppercase text-[9px]">
                              Kirimlar yo'q
                            </div>
                          ) : [...history].reverse().map((h, i) => (
                            <div key={i} className="flex items-center justify-between px-3 py-2.5">
                              <div className="min-w-0">
                                <p className="text-emerald-500 font-black text-sm">
                                  +{Number(h.amount).toLocaleString()}
                                  <span className="text-[9px] text-slate-600 ml-1">UZS</span>
                                </p>
                                {h.comment && (
                                  <p className="text-slate-500 text-[9px] font-bold truncate">{h.comment}</p>
                                )}
                              </div>
                              <span className="text-[8px] text-slate-600 font-bold shrink-0 ml-2">
                                {new Date(h.createdAt).toLocaleDateString('uz-UZ')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ObjectsManager;