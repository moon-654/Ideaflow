import React, { useState } from 'react';
import { UploadCloud, ChevronDown, DollarSign, Sparkles, Loader2 } from 'lucide-react';
import { useProposalStore } from '../context/ProposalContext';
import { useNavigate } from 'react-router-dom';
import { Proposal } from '../types';
import { toast } from 'sonner';
import RichTextEditor from '../components/RichTextEditor';
import { stripHtml } from '../utils/html';
import { aiService } from '../services/aiService';

const ProposalSubmit: React.FC = () => {
  const navigate = useNavigate();
  const { addProposal, currentUser, departments, settings, proposals } = useProposalStore();

  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [targetDepartment, setTargetDepartment] = useState('');
  const [currentProblem, setCurrentProblem] = useState('');
  const [improvementPlan, setImprovementPlan] = useState('');
  const [expectedEffect, setExpectedEffect] = useState('');
  const [expectedAmount, setExpectedAmount] = useState<string>('');

  const [isRefining, setIsRefining] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

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

  // Test Data Generator
  const fillTestData = () => {
    setCategory(settings.categories?.[0]?.id || '1');
    setTitle('사내 카페테리아 일회용품 줄이기 캠페인');
    setTargetDepartment(departments[0]?.name || '총무팀');
    setCurrentProblem('현재 우리 회사 카페테리아에서 사용되는 종이컵과 플라스틱 빨대의 양이 너무 많습니다. 하루에 버려지는 쓰레기 양이 상당해요.');
    setImprovementPlan('모든 직원에게 회사 로고가 박힌 텀블러를 지급하고, 개인 컵 사용 시 음료 할인을 500원 해주는 제도를 도입합시다. 또한 종이컵 비치를 점진적으로 줄여나갑니다.');
    setExpectedEffect('연간 일회용품 구매 비용을 약 30% 절감할 수 있고, 회사의 친환경 이미지를 제고할 수 있습니다. 직원들의 환경 의식도 높아질 것입니다.');
    setExpectedAmount('5,000,000');
    toast.success('테스트 데이터가 입력되었습니다!');
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

  const handleAIRefine = async () => {
    if (!aiService.hasKey()) {
      toast.error('AI 기능을 사용하려면 프로필에서 API Key를 먼저 등록해주세요.');
      return;
    }

    const probText = stripHtml(currentProblem);
    const planText = stripHtml(improvementPlan);
    const effectText = stripHtml(expectedEffect);

    if (!probText && !planText && !effectText) {
      toast.error('내용을 먼저 입력해주세요.');
      return;
    }

    if (!window.confirm('AI가 내용을 전문적인 톤으로 다듬어줍니다. 기존 내용이 변경될 수 있습니다. (이미지는 유지됩니다) 진행하시겠습니까?')) {
      return;
    }

    // Extract images from original content to preserve them
    const extractImages = (html: string): string => {
      const imgMatches = html.match(/<img[^>]*>/g);
      return imgMatches ? imgMatches.join('') : '';
    };

    const problemImages = extractImages(currentProblem);
    const planImages = extractImages(improvementPlan);
    const effectImages = extractImages(expectedEffect);

    setIsRefining(true);
    try {
      const response = await aiService.refineDraft({
        problem: probText,
        plan: planText,
        effect: effectText
      });

      if (response.error) {
        toast.error(`AI 오류: ${response.error}`);
        return;
      }

      // Use robust parsing
      const result = aiService.parseJSON(response.text);

      // Apply refined text and re-append preserved images
      if (result.refinedProblem) setCurrentProblem(result.refinedProblem.replace(/\n/g, '<br/>') + problemImages);
      if (result.refinedPlan) setImprovementPlan(result.refinedPlan.replace(/\n/g, '<br/>') + planImages);
      if (result.refinedEffect) setExpectedEffect(result.refinedEffect.replace(/\n/g, '<br/>') + effectImages);

      toast.success('AI가 내용을 다듬었습니다! ✨');

    } catch (e) {
      console.error(e);
      toast.error('AI 응답을 처리하는 중 오류가 발생했습니다.');
    } finally {
      setIsRefining(false);
    }
  };

  const handleCheckDuplicates = async () => {
    if (!aiService.hasKey()) {
      toast.error('AI 기능을 사용하려면 프로필에서 API Key를 먼저 등록해주세요.');
      return;
    }

    if (!title && !currentProblem) {
      toast.error('제목과 현황(문제점)을 먼저 입력해주세요.');
      return;
    }

    setIsChecking(true);
    try {
      // Pass only ID and Title to save tokens
      const existing = proposals.map(p => ({ id: p.id, title: p.title }));

      const response = await aiService.checkDuplicates(
        title,
        stripHtml(currentProblem),
        existing
      );

      if (response.error) {
        toast.error(`AI 오류: ${response.error}`);
        return;
      }

      const cleanedText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
      const result = JSON.parse(cleanedText);

      if (result.isDuplicate) {
        toast.warning(`유사한 제안이 감지되었습니다! (ID: ${result.similarId})`);
        toast.message(`AI 분석: ${result.reason}`, { duration: 5000 });
      } else {
        toast.success('유사한 제안이 발견되지 않았습니다. (독창적인 아이디어입니다!)');
      }

    } catch (e) {
      console.error(e);
      toast.error('중복 검사 중 오류가 발생했습니다.');
    } finally {
      setIsChecking(false);
    }
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

          {/* AI Assist Bar */}
          <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">AI 작문 보조</p>
                <p className="text-xs text-slate-500">작성하신 내용을 더욱 전문적이고 논리적인 문장으로 다듬어드립니다.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCheckDuplicates}
                disabled={isChecking || isRefining}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
              >
                {isChecking ? <Loader2 size={16} className="animate-spin" /> : '🔍 중복 검사'}
              </button>
              <button
                onClick={handleAIRefine}
                disabled={isRefining || isChecking}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50 shadow-md shadow-purple-200"
              >
                {isRefining ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    다듬는 중...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    AI로 다듬기
                  </>
                )}
              </button>
            </div>
          </div>

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

      {/* Loading Overlay */}
      {isRefining && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center animate-fade-in backdrop-blur-sm">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 max-w-sm text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-purple-100 border-t-purple-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles size={24} className="text-purple-600 animate-pulse" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">AI가 제안을 분석 중입니다</h3>
              <p className="text-slate-500 text-sm mt-1">전문적인 비즈니스 표현으로 다듬고 있습니다...<br />잠시만 기다려주세요.</p>
            </div>
          </div>
        </div>
      )}

      {/* Dev Tool: Quick Test Button (Admin Only) */}
      {currentUser.role === 'Admin' && (
        <div className="fixed bottom-4 right-4 z-40">
          <button
            onClick={fillTestData}
            className="bg-slate-800 text-white px-3 py-1.5 rounded-full text-xs font-bold opacity-70 hover:opacity-100 transition-opacity flex items-center gap-2"
          >
            🧪 테스트 데이터 채우기
          </button>
        </div>
      )}

    </div>
  );
};

export default ProposalSubmit;
