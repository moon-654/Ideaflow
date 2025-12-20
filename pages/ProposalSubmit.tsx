import React, { useState } from 'react';
import { UploadCloud, X, Bold, Italic, List, ListOrdered, ChevronDown } from 'lucide-react';

const ProposalSubmit: React.FC = () => {
  const [category, setCategory] = useState('');

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
                  <option value="process">프로세스 개선</option>
                  <option value="cost">원가 절감</option>
                  <option value="safety">안전/환경</option>
                  <option value="welfare">복리후생</option>
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
                placeholder="명확하고 간결한 제목 (최대 50자)"
                className="w-full h-11 px-4 rounded-lg border border-gray-300 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Editors */}
          {[
            { label: '현황 및 문제점', hint: '현재의 문제점이나 제안 배경을 기술하세요.', minH: 'min-h-[120px]' },
            { label: '개선 방안', hint: '구체적인 해결 방안을 기술하세요.', minH: 'min-h-[200px]' },
            { label: '기대 효과', hint: '정량적(비용) 또는 정성적 효과를 기술하세요.', minH: 'min-h-[120px]' }
          ].map((section, idx) => (
            <div key={idx} className="space-y-2">
              <div className="flex justify-between items-end">
                <label className="block text-sm font-bold text-slate-900">
                  {section.label} <span className="text-red-500">*</span>
                </label>
                <span className="text-xs text-slate-400">{section.hint}</span>
              </div>
              <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                <div className="flex items-center gap-1 bg-slate-50 border-b border-gray-200 px-2 py-1.5">
                  <button className="p-1.5 text-slate-500 hover:bg-slate-200 rounded"><Bold size={16} /></button>
                  <button className="p-1.5 text-slate-500 hover:bg-slate-200 rounded"><Italic size={16} /></button>
                  <div className="w-px h-4 bg-gray-300 mx-1"></div>
                  <button className="p-1.5 text-slate-500 hover:bg-slate-200 rounded"><List size={16} /></button>
                  <button className="p-1.5 text-slate-500 hover:bg-slate-200 rounded"><ListOrdered size={16} /></button>
                </div>
                <textarea 
                  className={`w-full p-4 border-none focus:ring-0 resize-y ${section.minH} placeholder:text-slate-300 bg-white text-slate-900`} 
                  placeholder="내용을 입력하세요..."
                ></textarea>
              </div>
            </div>
          ))}

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
          <button className="px-6 py-2.5 rounded-lg text-slate-600 font-medium hover:bg-slate-200 transition-colors">
            취소
          </button>
          <button className="px-6 py-2.5 rounded-lg border border-primary text-primary font-medium hover:bg-primary/5 transition-colors">
            임시 저장
          </button>
          <button className="px-8 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold shadow-lg shadow-primary/25 transition-all active:scale-95">
            제안 제출
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProposalSubmit;