import React, { useState } from 'react';
import { Search, Edit2, Trash2, X, UserPlus, Banknote, CheckCircle, Clock, Eye, EyeOff } from 'lucide-react';
import { api } from '../utils/api';

const EmployeeList = ({ employees, payroll, onAdd, onLog, onRefresh }) => {
  const [searchTerm, setSearchTerm]       = useState('');
  const [loading, setLoading]             = useState(false);
  const [showAddModal, setShowAddModal]   = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQuickPay, setShowQuickPay]   = useState(null);
  const [quickAmount, setQuickAmount]     = useState('');
  const [editEmp, setEditEmp]             = useState(null);
  const [editNewPass, setEditNewPass]     = useState('');   // yangi parol maydoni
  const [showPass, setShowPass]           = useState(false); // ko'rish/yashirish

  const [newEmp, setNewEmp] = useState({
    name: '', email: '', password: '', position: '',
    salaryType: 'DAILY', salaryRate: 0, currency: 'UZS',
  });

  const pendingRequests = payroll.filter(p => p.status === 'PENDING');

  const handleApprovePay = async (id, empName, amount) => {
    setLoading(true);
    try {
      await api.approvePayroll(id);
      onLog(`Tasdiqlandi: ${empName}ga ${Number(amount).toLocaleString()} UZS to'landi`);
      onRefresh();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.createEmployee({ ...newEmp, status: 'ACTIVE' });
      onLog(`Yangi xodim qo'shildi: ${newEmp.name}`);
      setShowAddModal(false);
      setNewEmp({ name: '', email: '', password: '', position: '', salaryType: 'DAILY', salaryRate: 0, currency: 'UZS' });
      onRefresh();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditEmployee = async (e) => {
    e.preventDefault();
    if (!editEmp?._id && !editEmp?.id) return;
    setLoading(true);
    const id = editEmp._id || editEmp.id;
    try {
      const updateData = {
        name:       editEmp.name,
        position:   editEmp.position,
        email:      editEmp.email,
        salaryType: editEmp.salaryType,
        salaryRate: Number(editEmp.salaryRate),
        currency:   editEmp.currency || 'UZS',
      };
      // Yangi parol kiritilgan bo'lsa qo'shiladi
      if (editNewPass.trim()) {
        updateData.password = editNewPass.trim();
      }
      await api.updateEmployee(id, updateData);
      onLog(`Xodim yangilandi: ${editEmp.name}`);
      setShowEditModal(false);
      setEditEmp(null);
      setEditNewPass('');
      setShowPass(false);
      onRefresh();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPay = async () => {
    if (!showQuickPay || !quickAmount) return;
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await api.createPayroll({
        employeeId:       showQuickPay._id || showQuickPay.id,
        employeeName:     showQuickPay.name,
        calculatedSalary: Number(quickAmount),
        amount:           Number(quickAmount),
        date:             today,
        month:            today.slice(0, 7),
        type:             'QUICK_ADD',
        status:           'APPROVED',
        paymentStatus:    'paid',
      });
      onLog(`${showQuickPay.name}ga ${Number(quickAmount).toLocaleString()} qo'shildi`);
      setShowQuickPay(null);
      setQuickAmount('');
      onRefresh();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteEmployee = async (id, name) => {
    if (!window.confirm(`${name}ni o'chirishga aminmisiz?`)) return;
    setLoading(true);
    try {
      await api.deleteEmployee(id);
      onLog(`Xodim o'chirildi: ${name}`);
      onRefresh();
    } catch (err) {
      alert('Xatolik: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (emp) => {
    setEditEmp({ ...emp });
    setEditNewPass('');
    setShowPass(false);
    setShowEditModal(true);
  };

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 pb-10">

      {/* ── SARLAVHA ── */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-black text-white italic">
          Xodimlar <span className="text-yellow-500">Boshqaruvi</span>
        </h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-yellow-500 text-slate-950 px-4 py-2.5 rounded-xl font-black text-xs hover:bg-yellow-400 active:scale-95 transition-all shadow-lg shadow-yellow-500/20 shrink-0"
        >
          <UserPlus size={16} />
          <span className="hidden sm:inline">Yangi Xodim</span>
          <span className="sm:hidden">Qo'shish</span>
        </button>
      </div>

      {/* ── PENDING TO'LOVLAR ── */}
      {pendingRequests.length > 0 && (
        <div className="bg-slate-950 border border-yellow-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="text-yellow-500 shrink-0" size={18} />
            <h2 className="text-sm font-black text-white uppercase tracking-widest">To'lov So'rovlari</h2>
            <span className="bg-yellow-500 text-slate-950 px-2 py-0.5 rounded-lg text-[10px] font-black ml-1">
              {pendingRequests.length}
            </span>
          </div>
          <div className="space-y-3">
            {pendingRequests.map(req => (
              <div
                key={req._id || req.id}
                className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between gap-3 hover:border-yellow-500/30 transition-all"
              >
                <div className="min-w-0">
                  <h4 className="text-white font-black text-sm truncate">{req.employeeName}</h4>
                  <p className="text-slate-500 text-[9px] font-bold uppercase">{req.date}</p>
                  <p className="text-yellow-500 font-black text-base mt-0.5">
                    {Number(req.calculatedSalary || req.amount).toLocaleString()}
                    <span className="text-[10px] text-slate-500 ml-1">UZS</span>
                  </p>
                </div>
                <button
                  onClick={() => handleApprovePay(req._id || req.id, req.employeeName, req.calculatedSalary || req.amount)}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 text-white font-black rounded-xl text-[10px] uppercase transition-all shrink-0"
                >
                  <CheckCircle size={14} /> To'lash
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SEARCH ── */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input
          type="text"
          placeholder="Xodimlarni qidirish..."
          className="w-full pl-11 pr-4 py-3.5 bg-slate-900 border border-slate-800 rounded-xl text-white text-sm outline-none focus:border-yellow-500 transition-colors font-bold placeholder:text-slate-700"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      {/* ── XODIMLAR GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredEmployees.map(emp => {
          const id = emp._id || emp.id;
          return (
            <div
              key={id}
              className="bg-slate-950 border border-slate-800 p-4 rounded-2xl hover:border-yellow-500/30 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  onClick={() => setShowQuickPay(emp)}
                  className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                >
                  <div className="w-10 h-10 shrink-0 bg-slate-900 rounded-xl flex items-center justify-center text-yellow-500 font-black border border-slate-800 text-sm">
                    {emp.name[0]}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-black text-sm truncate">{emp.name}</h3>
                    <p className="text-slate-500 text-[9px] font-bold uppercase tracking-wider truncate">{emp.position}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <button
                    onClick={() => openEdit(emp)}
                    className="p-2 text-slate-600 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    onClick={() => deleteEmployee(id, emp.name)}
                    className="p-2 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Login + stavka */}
              <div className="space-y-1.5">
                <div className="bg-slate-900/60 rounded-xl px-3 py-2 flex justify-between items-center border border-slate-800/50">
                  <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Login</span>
                  <span className="text-slate-300 font-black text-xs">{emp.email || '—'}</span>
                </div>
                <div className="bg-slate-900/60 rounded-xl px-3 py-2 flex justify-between items-center border border-slate-800/50">
                  <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">Parol</span>
                  <span className="text-slate-300 font-black text-xs font-mono">{emp.password || '—'}</span>
                </div>
                <div className="bg-slate-900/60 rounded-xl px-3 py-2 flex justify-between items-center border border-slate-800/50">
                  <span className="text-slate-500 text-[9px] font-black uppercase tracking-widest">
                    {emp.salaryType === 'DAILY' ? 'Kunlik' : 'Oylik'}
                  </span>
                  <span className="text-white font-black text-sm">
                    {(emp.salaryRate || 0).toLocaleString()}
                    <span className="text-yellow-500 text-[10px] ml-1">{emp.currency}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="py-16 text-center text-slate-700 font-black uppercase text-xs">
          Xodimlar topilmadi
        </div>
      )}

      {/* ── QUICK PAY MODAL ── */}
      {showQuickPay && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center backdrop-blur-md bg-slate-950/80">
          <div className="bg-slate-900 border border-emerald-500/20 rounded-t-[2rem] sm:rounded-[2rem] w-full sm:max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-lg font-black text-white italic">Avans Berish 💵</h3>
                <p className="text-slate-500 text-[9px] font-black uppercase mt-0.5">{showQuickPay.name}</p>
              </div>
              <button
                onClick={() => { setShowQuickPay(null); setQuickAmount(''); }}
                className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center transition-colors"
              >
                <X className="text-slate-400" size={16} />
              </button>
            </div>
            <div className="relative mb-4">
              <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
              <input
                autoFocus
                inputMode="numeric"
                type="number"
                className="w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-2xl text-2xl font-black text-emerald-400 outline-none transition-all"
                value={quickAmount}
                onChange={e => setQuickAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <button
              onClick={handleQuickPay}
              disabled={loading || !quickAmount}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-40 text-white font-black rounded-2xl transition-all uppercase tracking-widest text-sm"
            >
              {loading ? 'Yuborilmoqda...' : "To'lovni amalga oshirish"}
            </button>
          </div>
        </div>
      )}

      {/* ── ADD MODAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center backdrop-blur-md bg-slate-950/80">
          <div className="bg-slate-900 border border-slate-800 rounded-t-[2rem] sm:rounded-[2rem] w-full sm:max-w-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-white font-black text-lg italic">YANGI XODIM</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center"
              >
                <X className="text-slate-400" size={16} />
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="space-y-3">
              <input
                required
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-yellow-500 rounded-xl text-white font-bold text-sm outline-none transition-all placeholder:text-slate-700"
                placeholder="Ism sharifi"
                value={newEmp.name}
                onChange={e => setNewEmp({ ...newEmp, name: e.target.value })}
              />
              <input
                required
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-yellow-500 rounded-xl text-white font-bold text-sm outline-none transition-all placeholder:text-slate-700"
                placeholder="Lavozimi"
                value={newEmp.position}
                onChange={e => setNewEmp({ ...newEmp, position: e.target.value })}
              />
              <input
                required
                type="text"
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-yellow-500 rounded-xl text-white font-bold text-sm outline-none transition-all placeholder:text-slate-700"
                placeholder="Login"
                value={newEmp.email}
                onChange={e => setNewEmp({ ...newEmp, email: e.target.value })}
              />
              <input
                required
                type="text"
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-yellow-500 rounded-xl text-white font-bold text-sm outline-none transition-all placeholder:text-slate-700"
                placeholder="Parol"
                value={newEmp.password}
                onChange={e => setNewEmp({ ...newEmp, password: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  inputMode="numeric"
                  type="number"
                  className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-yellow-500 rounded-xl text-white font-bold text-sm outline-none transition-all placeholder:text-slate-700"
                  placeholder="Kunlik stavka"
                  onChange={e => setNewEmp({ ...newEmp, salaryRate: Number(e.target.value) })}
                />
                <select
                  className="bg-slate-950 border border-slate-800 focus:border-yellow-500 rounded-xl text-white px-4 font-bold text-sm outline-none transition-all"
                  value={newEmp.salaryType}
                  onChange={e => setNewEmp({ ...newEmp, salaryType: e.target.value })}
                >
                  <option value="DAILY">Kunlik</option>
                  <option value="MONTHLY">Oylik</option>
                </select>
              </div>
              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 active:scale-95 disabled:opacity-50 text-slate-950 font-black rounded-xl transition-all uppercase text-sm"
                >
                  {loading ? 'Saqlanmoqda...' : 'SAQLASH'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full py-3 text-slate-500 hover:text-white font-bold text-sm transition-colors"
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {showEditModal && editEmp && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center backdrop-blur-md bg-slate-950/80">
          <div className="bg-slate-900 border border-slate-800 rounded-t-[2rem] sm:rounded-[2rem] w-full sm:max-w-lg shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-white font-black text-lg italic">TAHRIRLASH</h2>
              <button
                onClick={() => { setShowEditModal(false); setEditEmp(null); setEditNewPass(''); setShowPass(false); }}
                className="w-9 h-9 bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center"
              >
                <X className="text-slate-400" size={16} />
              </button>
            </div>
            <form onSubmit={handleEditEmployee} className="space-y-3">
              <input
                required
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-white font-bold text-sm outline-none transition-all"
                placeholder="Ism sharifi"
                value={editEmp.name}
                onChange={e => setEditEmp({ ...editEmp, name: e.target.value })}
              />
              <input
                required
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-white font-bold text-sm outline-none transition-all"
                placeholder="Lavozimi"
                value={editEmp.position}
                onChange={e => setEditEmp({ ...editEmp, position: e.target.value })}
              />
              <input
                required
                type="text"
                className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-white font-bold text-sm outline-none transition-all"
                placeholder="Login"
                value={editEmp.email}
                onChange={e => setEditEmp({ ...editEmp, email: e.target.value })}
              />

              {/* ── JORIY PAROL (ko'rinib turadi) ── */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mb-0.5">
                    Joriy parol
                  </p>
                  <p className="text-white font-black text-sm font-mono">
                    {editEmp.password || '—'}
                  </p>
                </div>
                <span className="text-[8px] text-slate-600 font-bold uppercase bg-slate-800 px-2 py-1 rounded-lg">
                  Hozirgi
                </span>
              </div>

              {/* ── YANGI PAROL (ixtiyoriy) ── */}
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="w-full px-4 py-3.5 pr-12 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-white font-bold text-sm outline-none transition-all placeholder:text-slate-600"
                  placeholder="Yangi parol (ixtiyoriy)"
                  value={editNewPass}
                  onChange={e => setEditNewPass(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
              {editNewPass && (
                <p className="text-[9px] text-blue-400 font-bold px-1">
                  ✓ Yangi parol saqlanganda o'zgartiriladi
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <input
                  inputMode="numeric"
                  type="number"
                  className="w-full px-4 py-3.5 bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-white font-bold text-sm outline-none transition-all"
                  placeholder="Stavka"
                  value={editEmp.salaryRate}
                  onChange={e => setEditEmp({ ...editEmp, salaryRate: Number(e.target.value) })}
                />
                <select
                  className="bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-xl text-white px-4 font-bold text-sm outline-none transition-all"
                  value={editEmp.salaryType}
                  onChange={e => setEditEmp({ ...editEmp, salaryType: e.target.value })}
                >
                  <option value="DAILY">Kunlik</option>
                  <option value="MONTHLY">Oylik</option>
                </select>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 active:scale-95 disabled:opacity-50 text-white font-black rounded-xl transition-all uppercase text-sm"
                >
                  {loading ? 'Yangilanmoqda...' : 'SAQLASH'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditEmp(null); setEditNewPass(''); setShowPass(false); }}
                  className="w-full py-3 text-slate-500 hover:text-white font-bold text-sm transition-colors"
                >
                  Bekor qilish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeList;