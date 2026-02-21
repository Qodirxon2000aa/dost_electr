import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, CalendarCheck, CreditCard,
  LogOut, Menu, X, Zap, Building2, ShieldCheck, FileSpreadsheet
} from 'lucide-react';

import { api } from './utils/api';

import Dashboard       from './components/Dashboard';
import EmployeeList    from './components/EmployeeList';
import Attendance      from './components/Attendance';
import Payroll         from './components/Payroll';
import Login           from './components/Login';
import EmployeePortal  from './components/EmployeePortal';
import ObjectsManager  from './components/ObjectManager';
import Excel           from './components/Exel';

const App = () => {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isOnline, setIsOnline]           = useState(navigator.onLine);

  const [employees,  setEmployees]  = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payroll,    setPayroll]    = useState([]);
  const [logs,       setLogs]       = useState([]);
  const [objects,    setObjects]    = useState([]);

  // Internet holati
  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online',  on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Ma'lumotlarni API dan yuklash
  const loadData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [emps, att, pay, objs, lg] = await Promise.all([
        api.getEmployees(),
        api.getAttendance(),
        api.getPayroll(),
        api.getObjects(),
        api.getLogs(),
      ]);
      setEmployees(emps.data   || []);
      setAttendance(att.data   || []);
      setPayroll(pay.data      || []);
      setObjects(objs.data     || []);
      setLogs(lg.data          || []);
    } catch (err) {
      console.error('Ma\'lumot yuklashda xato:', err);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleLogin = (user) => {
    setCurrentUser(user);
    localStorage.setItem('currentUser', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const addLog = async (action) => {
    try {
      await api.createLog(action, currentUser?.name || 'Sistema');
      setLogs(prev => [{
        _id:       Date.now().toString(),
        action,
        performer: currentUser?.name || 'Sistema',
        createdAt: new Date().toISOString(),
      }, ...prev].slice(0, 50));
    } catch (e) {
      console.error('Log xatosi:', e);
    }
  };

  const isSuperAdmin   = currentUser?.role === 'SUPER_ADMIN';
  const isAdminOrSuper = isSuperAdmin || currentUser?.role === 'ADMIN';

  const NavItem = ({ to, icon, label }) => (
    <Link
      to={to}
      onClick={() => setIsSidebarOpen(false)}
      className="flex items-center gap-3 px-4 py-3 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-yellow-500 transition-all font-semibold"
    >
      {icon} <span>{label}</span>
    </Link>
  );

  return (
    <Router>
      <Routes>
        {/* Login sahifasi */}
        <Route
          path="/login"
          element={currentUser ? <Navigate to="/" /> : <Login onLogin={handleLogin} />}
        />

        {/* Asosiy layout */}
        <Route
          path="/*"
          element={
            currentUser ? (
              <div className="flex min-h-screen bg-slate-900 overflow-hidden">

                {/* ── SIDEBAR ── */}
                <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-950 border-r border-slate-800 flex flex-col transition-transform md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>

                  {/* Logo */}
                  <div className="flex items-center justify-between h-24 px-8 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                      <Zap className="w-8 h-8 text-yellow-500 fill-yellow-500" />
                      <span className="text-xl font-black text-white italic tracking-tighter uppercase">
                        Dost <span className="text-yellow-500">Electric</span>
                      </span>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400">
                      <X />
                    </button>
                  </div>

                  {/* Nav */}
                  <nav className="p-6 space-y-2 flex-1">
                    {isAdminOrSuper && (
                      <>
                        <NavItem
                          to="/"
                          icon={<LayoutDashboard size={20}/>}
                          label="Asosiy Panel"
                        />
                        <NavItem
                          to="/employees"
                          icon={<Users size={20}/>}
                          label="Xodimlar"
                        />
                        <NavItem
                          to="/payroll"
                          icon={<CreditCard size={20}/>}
                          label="Ish haqi"
                        />
                        {/* <NavItem
                          to="/excel"
                          icon={<FileSpreadsheet size={20}/>}
                          label="Hisobotlar"
                        /> */}
                        {isSuperAdmin && (
                          <NavItem
                            to="/objects"
                            icon={<Building2 size={20}/>}
                            label="Obyektlar"
                          />
                        )}
                      </>
                    )}
                  </nav>

                  {/* User info + logout */}
                  <div className="p-6 border-t border-slate-800 shrink-0">
                    <div className="mb-4 px-4 py-3 bg-slate-900 rounded-2xl border border-slate-800 flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 min-w-[40px] rounded-lg bg-yellow-500/10 text-yellow-500 flex items-center justify-center font-black border border-yellow-500/20">
                        {currentUser.name?.[0] || 'U'}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-bold text-slate-200 truncate">{currentUser.name}</p>
                        <p className="text-[10px] text-yellow-500 uppercase font-black tracking-widest">{currentUser.role}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full gap-3 px-4 py-3 text-rose-500 rounded-xl hover:bg-rose-500/10 transition-colors font-bold text-sm"
                    >
                      <LogOut size={18}/> Chiqish
                    </button>
                  </div>
                </aside>

                {/* Sidebar overlay (mobile) */}
                {isSidebarOpen && (
                  <div
                    className="fixed inset-0 z-40 bg-black/50 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                  />
                )}

                {/* ── MAIN ── */}
                <main className="flex-1 flex flex-col min-w-0 overflow-hidden">

                  {/* Header */}
                  <header className="h-24 bg-slate-950/50 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between px-8 shrink-0">
                    <button
                      onClick={() => setIsSidebarOpen(true)}
                      className="md:hidden p-2 text-slate-400"
                    >
                      <Menu />
                    </button>
                    <div className="flex items-center gap-4 ml-auto">
                      {isAdminOrSuper && (
                        <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-full text-[10px] font-black uppercase">
                          <ShieldCheck size={14}/> {isSuperAdmin ? 'Full Access' : 'View Access'}
                        </div>
                      )}
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-800 bg-slate-900/50">
                        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}/>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {isOnline ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </div>
                  </header>

                  {/* Page content */}
                  <div className="p-4 md:p-8 flex-1 overflow-y-auto">
                    <Routes>

                      {/* Index — admin yoki employee portal */}
                      <Route
                        index
                        element={
                          isAdminOrSuper
                            ? <Dashboard
                                employees={employees}
                                attendance={attendance}
                                payroll={payroll}
                                logs={logs}
                              />
                            : <EmployeePortal
                                user={currentUser}
                                employees={employees}
                                attendance={attendance}
                                payroll={payroll}
                                objects={objects}
                                onRefresh={loadData}
                              />
                        }
                      />

                      {/* Xodimlar */}
                      <Route
                        path="/employees"
                        element={
                          isAdminOrSuper
                            ? <EmployeeList
                                employees={employees}
                                payroll={payroll}
                                onLog={addLog}
                                onRefresh={loadData}
                              />
                            : <Navigate to="/" />
                        }
                      />

                      {/* Davomat */}
                      <Route
                        path="/attendance"
                        element={
                          isAdminOrSuper
                            ? <Attendance
                                employees={employees}
                                attendance={attendance}
                                userRole={currentUser.role}
                                onLog={addLog}
                                onRefresh={loadData}
                              />
                            : <Navigate to="/" />
                        }
                      />

                      {/* Ish haqi */}
                      <Route
                        path="/payroll"
                        element={
                          isAdminOrSuper
                            ? <Payroll
                                employees={employees}
                                attendance={attendance}
                                payroll={payroll}
                                objects={objects}
                                userRole={currentUser.role}
                                onLog={addLog}
                                onRefresh={loadData}
                              />
                            : <Navigate to="/" />
                        }
                      />

                      {/* Hisobotlar & Eksport */}
                      <Route
                        path="/excel"
                        element={
                          isAdminOrSuper
                            ? <Excel
                                employees={employees}
                                attendance={attendance}
                                payroll={payroll}
                                objects={objects}
                              />
                            : <Navigate to="/" />
                        }
                      />

                      {/* Obyektlar — faqat SUPER_ADMIN */}
                      <Route
                        path="/objects"
                        element={
                          isSuperAdmin
                            ? <ObjectsManager
                                objects={objects}
                                payroll={payroll}
                                userRole={currentUser.role}
                                onRefresh={loadData}
                              />
                            : <Navigate to="/" />
                        }
                      />

                      {/* Employee portal */}
                      <Route
                        path="/my-portal"
                        element={
                          <EmployeePortal
                            user={currentUser}
                            employees={employees}
                            attendance={attendance}
                            payroll={payroll}
                            objects={objects}
                            onRefresh={loadData}
                          />
                        }
                      />

                      {/* 404 fallback */}
                      <Route path="*" element={<Navigate to="/" />} />

                    </Routes>
                  </div>
                </main>
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
};

export default App;