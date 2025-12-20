import React, { useState } from 'react';
import { MOCK_MILEAGE_LOGS } from '../constants';
import { Download, RefreshCw, CheckCircle, Wallet, History, Send } from 'lucide-react';

const TYPE_MAP: Record<string, string> = {
  'Registration': '제안 등록',
  'Dept_Pass': '부서 심사 통과',
  'Grade_S': 'S등급 포상',
  'Grade_A': 'A등급 포상',
  'Grade_B': 'B등급 포상',
  'Grade_C': 'C등급 포상'
};

const Rewards: React.FC = () => {
  const [logs, setLogs] = useState(MOCK_MILEAGE_LOGS);

  const pendingPoints = logs.filter(l => l.status === 'Accrued').reduce((acc, curr) => acc + curr.points, 0);
  const totalPaid = logs.filter(l => l.status === 'Paid').reduce((acc, curr) => acc + curr.points, 0);

  const processPayout = () => {
    if(pendingPoints === 0) return;
    const confirm = window.confirm(`${pendingPoints} 포인트를 일괄 지급 처리하시겠습니까? \n모든 적립 상태가 '지급 완료'로 변경됩니다.`);
    if(confirm) {
      setLogs(prev => prev.map(l => l.status === 'Accrued' ? { ...l, status: 'Paid' } : l));
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">포상 및 마일리지</h1>
          <p className="text-slate-500 mt-1">제안 활동 포인트 현황 조회 및 지급 처리.</p>
        </div>
        <div className="flex gap-2">
           <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-slate-50">
            <Download size={16} /> 엑셀 다운로드
          </button>
        </div>
      </div>

      {/* Mileage Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-primary to-blue-600 p-6 rounded-xl shadow-lg text-white relative overflow-hidden">
          <div className="relative z-10">
             <div className="flex items-center gap-2 mb-2 opacity-90">
                <Wallet size={20} />
                <span className="text-sm font-bold uppercase tracking-wider">지급 대기 포인트</span>
             </div>
             <div className="text-4xl font-black">{pendingPoints.toLocaleString()} <span className="text-lg font-medium opacity-80">점</span></div>
          </div>
          <Wallet className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 rotate-12" />
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center">
           <div className="text-sm font-medium text-slate-500 mb-1">누적 지급 완료</div>
           <div className="text-3xl font-bold text-slate-900">{totalPaid.toLocaleString()} <span className="text-sm font-normal text-slate-400">점</span></div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center items-start">
           <div className="text-sm font-medium text-slate-500 mb-3">관리자 작업</div>
           <button 
             onClick={processPayout}
             disabled={pendingPoints === 0}
             className="w-full py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
           >
             <Send size={16} /> 일괄 지급 처리
           </button>
        </div>
      </div>

      {/* Point Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-slate-50/50 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 flex items-center gap-2"><History size={18} /> 마일리지 이력</h3>
          <span className="text-xs text-slate-500">지급 기준: 등록(1), 부서통과(2), S급(100), A급(50), B급(30), C급(10)</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-gray-200">
              <tr>
                <th className="p-4">날짜</th>
                <th className="p-4">사용자</th>
                <th className="p-4">사유 / 제안명</th>
                <th className="p-4">구분</th>
                <th className="p-4 text-right">포인트</th>
                <th className="p-4 text-center">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-slate-500 whitespace-nowrap">{log.date}</td>
                  <td className="p-4">
                    <div className="font-bold text-slate-900">{log.userName}</div>
                    <div className="text-xs text-slate-400">{log.department}</div>
                  </td>
                  <td className="p-4">
                    <div className="text-xs text-slate-400 font-mono mb-0.5">{log.proposalId}</div>
                    <div className="text-slate-700 font-medium truncate max-w-xs">{log.proposalTitle}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase border
                      ${log.type.includes('Grade') ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'}
                    `}>
                      {TYPE_MAP[log.type] || log.type}
                    </span>
                  </td>
                  <td className="p-4 text-right font-bold text-slate-900">+{log.points}</td>
                  <td className="p-4 text-center">
                    {log.status === 'Paid' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                        <CheckCircle size={12} /> 지급완료
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                        적립됨
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};

export default Rewards;
