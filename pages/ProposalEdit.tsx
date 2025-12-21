import { Contributor } from '../types'; // Ensure imported
import { UploadCloud, ChevronDown, DollarSign, Sparkles, Loader2, Users, Trash2, Search } from 'lucide-react';

const ProposalEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { proposals, updateProposal, departments, currentUser, settings, users } = useProposalStore();

    const [category, setCategory] = useState('');
    const [title, setTitle] = useState('');
    const [targetDepartment, setTargetDepartment] = useState('');
    const [currentProblem, setCurrentProblem] = useState('');
    const [improvementPlan, setImprovementPlan] = useState('');
    const [expectedEffect, setExpectedEffect] = useState('');
    const [expectedAmount, setExpectedAmount] = useState<string>('');
    // const [coAuthors, setCoAuthors] = useState<{ id: string; name: string; department: string }[]>([]); // Deprecated/Synced
    const [contributors, setContributors] = useState<Contributor[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    const [isRefining, setIsRefining] = useState(false);

    // Format number with commas
    const formatAmount = (value: number | undefined) => {
        if (!value) return '';
        return value.toLocaleString('ko-KR');
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const numericValue = e.target.value.replace(/[^\d]/g, '');
        if (!numericValue) {
            setExpectedAmount('');
            return;
        }
        setExpectedAmount(parseInt(numericValue, 10).toLocaleString('ko-KR'));
    };

    const parseAmount = (formatted: string): number | undefined => {
        if (!formatted) return undefined;
        return parseInt(formatted.replace(/,/g, ''), 10);
    };

    // Contribution Management Handlers
    const addCoAuthor = (user: { id: string; name: string; department: string }) => {
        setContributors(prev => {
            // Check if already exists
            if (prev.find(c => c.id === user.id)) return prev;

            const newContributor = {
                id: user.id,
                name: user.name,
                department: user.department,
                type: 'CoAuthor' as const,
                ratio: 0,
                hasAgreed: false
            };
            return [...prev, newContributor];
        });
        setSearchTerm(''); // Clear search after adding
    };

    const removeCoAuthor = (userId: string) => {
        setContributors(prev => {
            const removed = prev.find(c => c.id === userId);
            const remaining = prev.filter(c => c.id !== userId);
            if (removed && removed.ratio > 0) {
                // Return ratio to Proposer by default when removing
                return remaining.map(c =>
                    c.type === 'Proposer' ? { ...c, ratio: c.ratio + removed.ratio } : c
                );
            }
            return remaining;
        });
    };

    const [isAutoBalance, setIsAutoBalance] = useState(true);

    const updateContributorRatio = (userId: string, newRatio: number) => {
        // Clamp value between 0 and 100
        const clampedRatio = Math.max(0, Math.min(100, newRatio));

        setContributors(prev => {
            if (!isAutoBalance) {
                // Manual Mode: Just update the target
                return prev.map(c => c.id === userId ? { ...c, ratio: clampedRatio } : c);
            }

            const target = prev.find(c => c.id === userId);
            if (!target) return prev;
            if (target.ratio === clampedRatio) return prev;

            const others = prev.filter(c => c.id !== userId);
            const currentOthersTotal = others.reduce((sum, c) => sum + c.ratio, 0);
            const targetRemaining = 100 - clampedRatio;

            // Scenario 1: Others have 0 total ratio.
            if (currentOthersTotal === 0) {
                let victim = others.find(c => c.type === 'Proposer');
                if (!victim && userId !== 'execution-team-placeholder') victim = others.find(c => c.type === 'Execution');
                if (!victim) victim = others[0];

                if (victim) {
                    return prev.map(c => {
                        if (c.id === userId) return { ...c, ratio: clampedRatio };
                        if (c.id === victim!.id) return { ...c, ratio: targetRemaining };
                        return c;
                    });
                }
                return prev.map(c => c.id === userId ? { ...c, ratio: clampedRatio } : c);
            }

            // Scenario 2: Proportional Distribution
            const scale = targetRemaining / currentOthersTotal;

            let distributed = 0;
            const newContributors = prev.map(c => {
                if (c.id === userId) return { ...c, ratio: clampedRatio };

                const newVal = Math.floor(c.ratio * scale);
                if (c.id !== userId) distributed += newVal;

                return { ...c, ratio: newVal };
            });

            // Handle Rounding Errors (Ensure Sum is 100)
            const newSum = clampedRatio + distributed;
            const remainder = 100 - newSum;

            if (remainder !== 0) {
                const bestFit = newContributors.find(c => c.id !== userId && c.type === 'Proposer')
                    || newContributors.find(c => c.id !== userId && c.type === 'Execution')
                    || newContributors.find(c => c.id !== userId);

                if (bestFit) {
                    bestFit.ratio += remainder;
                }
            }

            return newContributors;
        });
    };

    useEffect(() => {
        const proposal = proposals.find(p => p.id === id);
        if (proposal) {
            // Verify ownership
            const isCoAuthor = proposal.coAuthors?.some(a => a.id === currentUser.id);
            const canEdit = proposal.proposer.id === currentUser.id || isCoAuthor || currentUser.role === 'Admin';

            if (!canEdit) {
                toast.error('수정 권한이 없습니다.');
                navigate('/');
                return;
            }

            setCategory(proposal.category);
            setTitle(proposal.title);
            setTargetDepartment(proposal.targetDepartment);
            setCurrentProblem(proposal.currentProblem || proposal.summary || '');
            setImprovementPlan(proposal.improvementPlan || '');
            setExpectedEffect(proposal.expectedEffect || '');
            setExpectedAmount(formatAmount(proposal.expectedAmount));
            // setCoAuthors(proposal.coAuthors || []);

            // Initialize Contributors
            if (proposal.contributors && proposal.contributors.length > 0) {
                setContributors(proposal.contributors);
            } else {
                // Migration existing coAuthors or just Proposer + Exec defaults
                const initialContributors: Contributor[] = [
                    {
                        id: proposal.proposer.id,
                        name: proposal.proposer.name,
                        department: proposal.proposer.department,
                        type: 'Proposer',
                        ratio: 70,
                        hasAgreed: false
                    }
                ];

                if (proposal.coAuthors) {
                    proposal.coAuthors.forEach(ca => {
                        initialContributors.push({
                            id: ca.id,
                            name: ca.name,
                            department: ca.department,
                            type: 'CoAuthor',
                            ratio: 0, // Default 0 for migration, user must adjust
                            hasAgreed: false
                        });
                    });
                }

                // Add Execution Team placeholder if not present?
                // Actually settings might not be enabled yet, but if editing we should check settings?
                // Logic: If feature is enabled, ensure Execution Team exists.
                initialContributors.push({
                    id: 'execution-team-placeholder',
                    name: '실행 부서',
                    department: proposal.targetDepartment || '실행 부서',
                    type: 'Execution',
                    ratio: 30,
                    hasAgreed: false
                });

                setContributors(initialContributors);
            }

        } else {
            toast.error('제안을 찾을 수 없습니다.');
            navigate('/');
        }
    }, [id, proposals, currentUser, navigate]);

    const handleSubmit = () => {
        const hasProblem = stripHtml(currentProblem).length > 0;
        const hasPlan = stripHtml(improvementPlan).length > 0;
        const hasEffect = stripHtml(expectedEffect).length > 0;

        if (!category || !title || !targetDepartment || !hasProblem || !hasPlan || !hasEffect) {
            toast.error('모든 필수 항목을 입력해주세요.');
            return;
        }

        // Validate Contribution
        if (settings.contribution.enabled) {
            const totalRatio = contributors.reduce((acc, c) => acc + c.ratio, 0);
            if (totalRatio !== 100) {
                toast.error(`기여도 합계는 100%여야 합니다. (현재: ${totalRatio}%)`);
                return;
            }
        }

        if (!id) return;

        // Sync contributors to coAuthors for backward compatibility
        const coAuthorsList = contributors
            .filter(c => c.type === 'CoAuthor')
            .map(c => ({ id: c.id, name: c.name, department: c.department }));

        const executionRatio = contributors.find(c => c.type === 'Execution')?.ratio || 0;

        updateProposal(id, {
            title,
            summary: stripHtml(currentProblem).substring(0, 200),
            category: category as any,
            targetDepartment: targetDepartment,
            currentProblem,
            improvementPlan,
            expectedEffect,
            expectedAmount: parseAmount(expectedAmount),
            coAuthors: coAuthorsList,
            contributors: contributors, // Save Full Contributors
            executionTeamRatio: executionRatio,
            status: 'Dept_Review',
            deptReviewComment: ''
        });

        toast.success('제안이 수정되어 재상정되었습니다.');
        navigate(`/proposals/${encodeURIComponent(id)}`);
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

    return (
        <div className="max-w-4xl mx-auto animate-fade-in pb-12">
            <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
                <span className="font-semibold text-primary">제안 수정</span>
            </nav>

            <div className="mb-8">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">제안 수정</h1>
                <p className="text-slate-500 mt-2 text-lg">반려 사유를 반영하여 내용을 보완해주세요.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-slate-900">카테고리</label>
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
                            <label className="block text-sm font-bold text-slate-900">제목</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full h-11 px-4 rounded-lg border border-gray-300 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            />
                        </div>

                        <div className="md:col-span-3 space-y-2">
                            <label className="block text-sm font-bold text-slate-900">실행(검토) 부서</label>
                            <div className="relative">
                                <select
                                    value={targetDepartment}
                                    onChange={(e) => setTargetDepartment(e.target.value)}
                                    className="w-full h-11 pl-4 pr-10 rounded-lg border border-gray-300 bg-white text-slate-900 focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none transition-all cursor-pointer"
                                >
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
                        <button
                            onClick={handleAIRefine}
                            disabled={isRefining}
                            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-purple-200"
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

                    {/* Contribution Management Section */}
                    {settings.contribution?.enabled && (
                        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <Users size={20} className="text-indigo-600" />
                                        공동 제안 및 기여도 설정
                                    </h3>
                                    <p className="text-sm text-slate-500">제안자, 공동 제안자, 그리고 실행 부서의 기여도를 설정합니다. (총합 100%)</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${contributors.reduce((acc, c) => acc + c.ratio, 0) === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        합계: {contributors.reduce((acc, c) => acc + c.ratio, 0)}%
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {contributors.map((contributor) => (
                                    <div key={contributor.id} className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                        <div className="w-1/3">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${contributor.type === 'Proposer' ? 'bg-blue-100 text-blue-700' : contributor.type === 'Execution' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'}`}>
                                                    {contributor.type === 'Proposer' ? '제안자' : contributor.type === 'Execution' ? '실행부서' : '공동제안자'}
                                                </span>
                                                <span className="font-bold text-slate-800">{contributor.name}</span>
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1 pl-1">{contributor.department}</div>
                                        </div>

                                        <div className="flex-1 flex items-center gap-4">
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                step="5"
                                                value={contributor.ratio}
                                                onChange={(e) => updateContributorRatio(contributor.id, parseInt(e.target.value))}
                                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                            />
                                            <div className="flex items-center gap-1 w-20">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    value={contributor.ratio}
                                                    onChange={(e) => updateContributorRatio(contributor.id, parseInt(e.target.value))}
                                                    className="w-16 px-2 py-1 text-right border border-gray-300 rounded font-bold text-indigo-600"
                                                />
                                                <span className="text-sm text-slate-500">%</span>
                                            </div>
                                        </div>

                                        {contributor.type === 'CoAuthor' && (
                                            <button
                                                onClick={() => removeCoAuthor(contributor.id)}
                                                className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {/* Add Co-Author Searchable Input */}
                                {(contributors.filter(c => c.type === 'CoAuthor').length < (settings.contribution?.maxCoAuthors || 3)) && (
                                    <div className="relative">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input
                                                type="text"
                                                placeholder="이름으로 참여자 검색..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="w-full h-10 pl-10 pr-4 rounded-lg border border-dashed border-gray-300 text-sm bg-slate-50 focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                            />
                                        </div>

                                        {searchTerm && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-xl z-20 max-h-60 overflow-y-auto">
                                                {users
                                                    .filter(u =>
                                                        u.id !== currentUser.id &&
                                                        !contributors.find(c => c.id === u.id) &&
                                                        (u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.department.includes(searchTerm))
                                                    )
                                                    .map(u => (
                                                        <button
                                                            key={u.id}
                                                            onClick={() => addCoAuthor(u)}
                                                            className="w-full px-4 py-2 text-left hover:bg-indigo-50 flex items-center justify-between group transition-colors"
                                                        >
                                                            <div>
                                                                <span className="font-bold text-slate-800">{u.name}</span>
                                                                <span className="text-xs text-slate-500 ml-2">{u.department}</span>
                                                            </div>
                                                            <span className="text-xs text-indigo-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">추가</span>
                                                        </button>
                                                    ))
                                                }
                                                {users.filter(u => u.id !== currentUser.id && !contributors.find(c => c.id === u.id) && (u.name.includes(searchTerm) || u.department.includes(searchTerm))).length === 0 && (
                                                    <div className="px-4 py-3 text-sm text-slate-400 text-center italic">
                                                        검색 결과가 없습니다.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-900">현황 및 문제점</label>
                        <RichTextEditor
                            value={currentProblem}
                            onChange={setCurrentProblem}
                            placeholder="현황 및 문제점을 입력하세요..."
                            minHeight="120px"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-900">개선 방안</label>
                        <RichTextEditor
                            value={improvementPlan}
                            onChange={setImprovementPlan}
                            placeholder="개선 방안을 입력하세요..."
                            minHeight="200px"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-900">기대 효과</label>
                        <RichTextEditor
                            value={expectedEffect}
                            onChange={setExpectedEffect}
                            placeholder="기대 효과를 입력하세요..."
                            minHeight="120px"
                        />
                    </div>

                    {/* Expected Amount */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-900">예상 효과 금액</label>
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

                </div>

                <div className="bg-slate-50 px-8 py-5 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-2.5 rounded-lg text-slate-600 font-medium hover:bg-slate-200 transition-colors"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="px-8 py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white font-bold shadow-lg shadow-primary/25 transition-all active:scale-95"
                    >
                        수정 완료 및 재상정
                    </button>
                </div>
            </div>


            {/* Loading Overlay */}
            {
                isRefining && (
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
                )
            }

        </div >
    );
};

export default ProposalEdit;

