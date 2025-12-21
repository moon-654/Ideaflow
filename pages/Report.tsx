import React, { useState, useMemo } from 'react';
import { useProposalStore } from '../context/ProposalContext';
import { Proposal } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Filter, Download, TrendingUp, Users, CheckCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

type DateFilterType = 'monthly' | 'quarterly' | 'fiscal' | 'custom';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Report: React.FC = () => {
    const { proposals, departments } = useProposalStore();

    // Filter State
    const [filterType, setFilterType] = useState<DateFilterType>('monthly');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedQuarter, setSelectedQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    // Date Logic
    const dateRange = useMemo(() => {
        let start = new Date();
        let end = new Date();

        switch (filterType) {
            case 'monthly':
                start = new Date(selectedYear, selectedMonth - 1, 1);
                end = new Date(selectedYear, selectedMonth, 0); // Last day of month
                end.setHours(23, 59, 59, 999);
                break;
            case 'quarterly':
                start = new Date(selectedYear, (selectedQuarter - 1) * 3, 1);
                end = new Date(selectedYear, selectedQuarter * 3, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'fiscal':
                // Fiscal Year: April 1st of selectedYear to March 31st of selectedYear + 1
                start = new Date(selectedYear, 3, 1); // April 1st
                end = new Date(selectedYear + 1, 2, 31); // March 31st next year
                end.setHours(23, 59, 59, 999);
                break;
            case 'custom':
                if (customStartDate && customEndDate) {
                    start = new Date(customStartDate);
                    end = new Date(customEndDate);
                    end.setHours(23, 59, 59, 999);
                } else {
                    // Default to last 30 days if not set
                    start = new Date();
                    start.setDate(start.getDate() - 30);
                }
                break;
        }
        return { start, end };
    }, [filterType, selectedYear, selectedMonth, selectedQuarter, customStartDate, customEndDate]);

    // Data Filtering
    const filteredProposals = useMemo(() => {
        return proposals.filter(p => {
            const pDate = new Date(p.date); // Assumes p.date is ISO or YYYY-MM-DD
            return pDate >= dateRange.start && pDate <= dateRange.end;
        });
    }, [proposals, dateRange]);

    // Statistics Calculation
    const stats = useMemo(() => {
        const total = filteredProposals.length;
        const completed = filteredProposals.filter(p => p.status === 'Completed').length;
        const rejected = filteredProposals.filter(p => p.status === 'Rejected').length;
        const inProgress = total - completed - rejected;

        const adoptionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0.0';

        // By Department
        const deptCounts: Record<string, number> = {};
        // Initialize with 0 for all departments
        departments.forEach(d => deptCounts[d.name] = 0);

        filteredProposals.forEach(p => {
            const dept = p.proposer.department;
            deptCounts[dept] = (deptCounts[dept] || 0) + 1;
        });

        const deptData = Object.entries(deptCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count); // High to low

        // Trend Data (Group by Month for Fiscal/Year, Day for Month/Custom short)
        // Simplified: Group by Month always if range > 1 month, else by day?
        // Let's stick to Monthly grouping for trends for now unless range is very short.
        const trendMap: Record<string, number> = {};
        filteredProposals.forEach(p => {
            const d = new Date(p.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            trendMap[key] = (trendMap[key] || 0) + 1;
        });

        // Fill gaps? For simplicity, just show present data sorted.
        const trendData = Object.entries(trendMap)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return {
            total,
            completed,
            rejected,
            inProgress,
            adoptionRate,
            deptData,
            trendData
        };
    }, [filteredProposals, departments]);

    return (
        <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-12">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">통계 및 보고서</h1>
                    <p className="text-slate-500 mt-1">제안 활동 및 성과 지표를 분석합니다.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                        title="엑셀 다운로드 (준비중)"
                        onClick={() => toast.info('엑셀 다운로드 기능은 준비 중입니다.')}
                    >
                        <Download size={20} />
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2 mr-4">
                        <Filter size={18} className="text-slate-400" />
                        <span className="font-bold text-slate-700 text-sm">기간 설정</span>
                    </div>

                    <div className="flex bg-slate-100 rounded-lg p-1">
                        {(['monthly', 'quarterly', 'fiscal', 'custom'] as DateFilterType[]).map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${filterType === type
                                        ? 'bg-white text-primary shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {type === 'monthly' && '월별'}
                                {type === 'quarterly' && '분기별'}
                                {type === 'fiscal' && '회계연도'}
                                {type === 'custom' && '직접입력'}
                            </button>
                        ))}
                    </div>

                    {/* Dynamic Controls based on filter type */}
                    <div className="flex items-center gap-2">
                        {(filterType === 'monthly' || filterType === 'quarterly' || filterType === 'fiscal') && (
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="px-3 py-1.5 border border-gray-300 rounded text-sm font-medium focus:ring-primary focus:border-primary"
                            >
                                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                                    <option key={year} value={year}>{year}년</option>
                                ))}
                            </select>
                        )}

                        {filterType === 'monthly' && (
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="px-3 py-1.5 border border-gray-300 rounded text-sm font-medium focus:ring-primary focus:border-primary"
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                    <option key={month} value={month}>{month}월</option>
                                ))}
                            </select>
                        )}

                        {filterType === 'quarterly' && (
                            <div className="flex bg-slate-50 rounded border border-gray-200">
                                {[1, 2, 3, 4].map(q => (
                                    <button
                                        key={q}
                                        onClick={() => setSelectedQuarter(q)}
                                        className={`px-3 py-1.5 text-xs font-bold border-r border-gray-200 last:border-0 hover:bg-slate-100 ${selectedQuarter === q ? 'bg-primary/10 text-primary' : 'text-slate-500'
                                            }`}
                                    >
                                        {q}분기
                                    </button>
                                ))}
                            </div>
                        )}

                        {filterType === 'custom' && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="px-3 py-1.5 border border-gray-300 rounded text-sm"
                                />
                                <span className="text-slate-400">~</span>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="px-3 py-1.5 border border-gray-300 rounded text-sm"
                                />
                            </div>
                        )}
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-slate-500 flex items-center gap-2">
                    <Calendar size={14} />
                    조회 기간: <span className="font-bold text-slate-700">{dateRange.start.toLocaleDateString()} ~ {dateRange.end.toLocaleDateString()}</span>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <FileText size={18} />
                        </div>
                        <span className="text-sm font-bold text-slate-500">총 제안</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900">{stats.total}건</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                            <CheckCircle size={18} />
                        </div>
                        <span className="text-sm font-bold text-slate-500">채택 완료</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900">{stats.completed}건</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                            <TrendingUp size={18} />
                        </div>
                        <span className="text-sm font-bold text-slate-500">채택률</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900">{stats.adoptionRate}%</div>
                </div>
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                            <Users size={18} />
                        </div>
                        <span className="text-sm font-bold text-slate-500">참여 부서</span>
                    </div>
                    <div className="text-2xl font-black text-slate-900">{stats.deptData.filter(d => d.count > 0).length}개</div>
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <TrendingUp size={18} className="text-slate-400" /> 월별 제안 추이
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={stats.trendData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line type="monotone" dataKey="count" name="제안 수" stroke="#2563eb" strokeWidth={3} dot={{ strokeWidth: 2, r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Users size={18} className="text-slate-400" /> 부서별 참여 현황 (Top 5)
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.deptData.slice(0, 5)} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" allowDecimals={false} hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="count" name="제안 수" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Status Distribution */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 mb-6">제안 상태 분포</h3>
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                    <div className="w-full md:w-1/2 h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: '대기/진행중', value: stats.inProgress },
                                        { name: '채택 완료', value: stats.completed },
                                        { name: '반려', value: stats.rejected },
                                    ]}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {[stats.inProgress, stats.completed, stats.rejected].map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={['#94a3b8', '#10b981', '#ef4444'][index]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="w-full md:w-1/2 space-y-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-slate-400"></div>
                                <span className="font-medium text-slate-700">심의 대기 / 진행중</span>
                            </div>
                            <span className="font-bold text-slate-900">{stats.inProgress}건</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                <span className="font-medium text-green-700">채택 완료 (최종 승인)</span>
                            </div>
                            <span className="font-bold text-green-900">{stats.completed}건</span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                <span className="font-medium text-red-700">반려됨</span>
                            </div>
                            <span className="font-bold text-red-900">{stats.rejected}건</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Report;
