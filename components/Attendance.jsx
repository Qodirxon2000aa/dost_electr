import React, { useState } from 'react';
import { CheckCircle2, CalendarCheck, XCircle, Building2 } from 'lucide-react';
import { api } from '../utils/api';

const Attendance = ({ employees, attendance, onLog, userRole }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const markAttendance = async (empId, status, extra = {}) => {
    try {
      await api.upsertAttendance({
        employeeId: empId,
        date: selectedDate,
        status,
        markedBy: 'admin',
        ...extra,
      });
      const emp = employees.find(e => e._id === empId || e.id === empId);
      onLog(`${emp?.name} - ${status === 'PRESENT' ? 'BOR' : "YO'Q"} deb tasdiqlandi`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-950 p-6 rounded-[2.5rem] border border-slate-800">
        <div>
          <h1 className="text-3xl font-black text-white italic">
            DAVOMAT <span className="text-yellow-500 underline">SO'ROVLARI</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
            Xodimlardan kelgan tasdiqlar
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-2xl border border-slate-800">
          <CalendarCheck className="text-yellow-500 ml-2" size={20} />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-white p-2 outline-none font-black"
          />
        </div>
      </div>

      <div className="grid gap-4">
        {employees.map((emp) => {
          const empId = emp._id || emp.id;
          const record = attendance.find(
            (a) => (a.employeeId?._id || a.employeeId) === empId && a.date === selectedDate
          );
          const isPending = record?.status === 'PENDING';
          const isPresent = record?.status === 'PRESENT';
          const isAbsent  = record?.status === 'ABSENT';
          const hasRecord = !!record;

          return (
            <div
              key={empId}
              className={`flex flex-col md:flex-row items-center justify-between p-6 rounded-[2.5rem] border transition-all duration-300 ${
                isPending ? 'bg-yellow-500/10 border-yellow-500 shadow-lg' : 'bg-slate-950 border-slate-900'
              }`}
            >
              <div className="flex items-center gap-5 w-full md:w-auto">
                <div
                  className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center font-black text-2xl border transition-colors ${
                    isPresent ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                    : isAbsent ? 'bg-rose-500/20 border-rose-500 text-rose-500'
                    : 'bg-slate-900 border-slate-700 text-slate-500'
                  }`}
                >
                  {emp.name[0]}
                </div>
                <div>
                  <h4 className={`text-xl font-black ${hasRecord ? 'text-white' : 'text-slate-600'}`}>
                    {emp.name}
                  </h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[9px] text-slate-500 uppercase font-black bg-slate-900 px-2 py-1 rounded">
                      {emp.position}
                    </span>
                    {record?.objectName && (
                      <span className="flex items-center gap-1 text-[9px] text-blue-400 font-black uppercase">
                        <Building2 size={12} /> {record.objectName}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6 md:mt-0 w-full md:w-auto">
                <button
                  onClick={() => markAttendance(empId, 'PRESENT', {
                    objectId: record?.objectId,
                    objectName: record?.objectName,
                  })}
                  className={`flex-1 md:flex-none px-8 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${
                    isPresent ? 'bg-emerald-600 text-white shadow-lg'
                    : 'bg-slate-900 text-emerald-500 hover:bg-emerald-500/10 border border-emerald-500/20'
                  }`}
                >
                  <CheckCircle2 size={16} /> {isPending ? 'TASDIQLASH' : 'BOR'}
                </button>
                <button
                  onClick={() => markAttendance(empId, 'ABSENT')}
                  className={`flex-1 md:flex-none px-8 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${
                    isAbsent ? 'bg-rose-600 text-white shadow-lg'
                    : 'bg-slate-900 text-rose-500 hover:bg-rose-500/10 border border-rose-500/20'
                  }`}
                >
                  <XCircle size={16} /> YO'Q
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Attendance;