import React, { useState } from 'react';
import { UploadCloud, ChevronDown, DollarSign } from 'lucide-react';
import { useProposalStore } from '../context/ProposalContext';
import { useNavigate } from 'react-router-dom';
import { Proposal } from '../types';
import { toast } from 'sonner';
import RichTextEditor from '../components/RichTextEditor';
import { stripHtml } from '../utils/html';

const ProposalSubmit: React.FC = () => {
  const navigate = useNavigate();
  const { addProposal, currentUser, departments, settings } = useProposalStore();

  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [targetDepartment, setTargetDepartment] = useState('');
  const [currentProblem, setCurrentProblem] = useState('');
  const [improvementPlan, setImprovementPlan] = useState('');
  const [expectedEffect, setExpectedEffect] = useState('');
  const [expectedAmount, setExpectedAmount] = useState<string>('');

  // Format number with commas
  const formatAmount = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, '');
    if (!numericValue) return '';
    return parseInt(numericValue, 10).toLocaleString('ko-KR');
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatAmount(e.target.value);
    setExpectedAmount(formatted);
  };

  const parseAmount = (formatted: string): number | undefined => {
    if (!formatted) return undefined;
    return parseInt(formatted.replace(/,/g, ''), 10);
  };

  const handleSubmit = () => {
    // Check if editors have content (strip HTML to check for actual text)
    const hasProblem = stripHtml(currentProblem).length > 0;
    const hasPlan = stripHtml(improvementPlan).length > 0;
    const hasEffect = stripHtml(expectedEffect).length > 0;

    if (!category || !title || !targetDepartment || !hasProblem || !hasPlan || !hasEffect) {
      toast.error('모든 필수 항목을 입력해주세요.');
      return;
    }

    const newProposal: Proposal = {
      id: `#23-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      title,
      summary: stripHtml(currentProblem).substring(0, 200), // Plain text summary for lists
      proposer: currentUser,
      date: new Date().toISOString().split('T')[0],
      status: 'Dept_Review',
      category: category as any,
      targetDepartment: targetDepartment,
      currentProblem,
      improvementPlan,
      expectedEffect,
      expectedAmount: parseAmount(expectedAmount),
    };

    addProposal(newProposal);
    toast.success('제안이 성공적으로 등록되었습니다.');
    navigate('/');
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
        <a href="#" className="hover:text-primary">홈</a>
        <span className="text-slate-300">/</span>
        <a href="#" className="hover:text-primary">제안 관리</a>
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-primary">제안 등록</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">제안 등록</h1>
        <p className="text-slate-500 mt-2 text-lg">더 나은 회사를 만들기 위한 창의적인 아이디어를 공유해주세요.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-8 space-y-8">

          {/* Top Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-slate-900">
                카테고리 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 pl-4 pr-10 rounded-lg border border-gray-300 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none transition-all cursor-pointer"
                >
                  <option value="" disabled>카테고리 선택</option>
                  {(settings.categories || []).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="block text-sm font-bold text-slate-900">
                제목 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="명확하고 간결한 제목 (최대 50자)"
                className="w-full h-11 px-4 rounded-lg border border-gray-300 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            <div className="md:col-span-3 space-y-2">
              <label className="block text-sm font-bold text-slate-900">
                실행(검토) 부서 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  value={targetDepartment}
                  onChange={(e) => setTargetDepartment(e.target.value)}
                  className="w-full h-11 pl-4 pr-10 rounded-lg border border-gray-300 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none transition-all cursor-pointer"
                >
                  <option value="" disabled>실행 부서를 선택하세요</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
              </div>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Rich Text Editors */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="block text-sm font-bold text-slate-900">
                현황 및 문제점 <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-slate-400">현재의 문제점이나 제안 배경을 기술하세요.</span>
            </div>
            <RichTextEditor
              value={currentProblem}
              onChange={setCurrentProblem}
              placeholder="현황 및 문제점을 입력하세요..."
              minHeight="120px"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="block text-sm font-bold text-slate-900">
                개선 방안 <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-slate-400">구체적인 해결 방안을 기술하세요.</span>
            </div>
            <RichTextEditor
              value={improvementPlan}
              onChange={setImprovementPlan}
              placeholder="개선 방안을 입력하세요..."
              minHeight="200px"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="block text-sm font-bold text-slate-900">
                기대 효과 <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-slate-400">정량적(비용) 또는 정성적 효과를 기술하세요.</span>
            </div>
            <RichTextEditor
              value={expectedEffect}
              onChange={setExpectedEffect}
              placeholder="기대 효과를 입력하세요..."
              minHeight="120px"
            />
          </div>

          {/* Expected Amount */}
          <div className="space-y-2">
            <div className="flex justify-between items-end">
              <label className="block text-sm font-bold text-slate-900">
                예상 효과 금액
              </label>
              <span className="text-xs text-slate-400">연간 절감/수익 효과 (선택)</span>
            </div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={expectedAmount}
                  onChange={handleAmountChange}
                  placeholder="50,000,000"
                  className="w-full h-11 pl-10 pr-4 rounded-lg border border-gray-300 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-right"
                />
              </div>
              <span className="flex items-center px-4 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg border border-gray-300">
                원
              </span>
            </div>
          </div>

          {/* File Upload */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-900">첨부 파일</label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 hover:bg-primary/5 hover:border-primary/50 transition-all cursor-pointer group">
              <div className="p-3 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                <UploadCloud className="text-primary" size={32} />
              </div>
              <p className="font-medium text-slate-900">클릭하거나 파일을 이곳으로 드래그하세요</p>
              <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG, XLSX (최대 10MB)</p>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 px-8 py-5 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2.5 rounded-lg text-slate-600 font-medium hover:bg-slate-200 transition-colors"
          >
            취소
          </button>
          <button className="px-6 py-2.5 rounded-lg border border-primary text-primary font-medium hover:bg-primary/5 transition-colors">
            임시 저장
          </button>
          <button
            onClick={handleSubmit}
            className="px-8 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold shadow-lg shadow-primary/25 transition-all active:scale-95"
          >
            제안 제출
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProposalSubmit;
