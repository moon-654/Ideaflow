import { User, Proposal, MileageLog } from './types';

export const CURRENT_USER: User = {
  id: 'u1',
  name: '김관리',
  role: 'Admin',
  department: '혁신지원팀',
  avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBY2w23osiy74Bvxm40smWFOfYd33KbkjllxwhxMaw9IrxqBBEZBzPBLpvzrZRSPwuN2I-Q_EzJQX75ACYzC_MZartWpcPpepkDA24wNH7gE4l4OqJ6C5VOKI31qSYXqsoWIarcw_wfKMv_ay-1jlMBJRs1Chv0oJ3GPxHV_8ChMwgwhnjwZb-iwUfFj3cEREowcsTxKds2ZCXQaKiE6G2RB0o1c-kjzXlP-9Cl6fJo4nYUoyCieU19CCAzCgyrzFsGmFwOE7-jyvC6'
};

export const MOCK_PROPOSALS: Proposal[] = [
  {
    id: '#23-060',
    title: 'AI 기반 자재 재고 예측 시스템 도입',
    summary: 'LSTM 모델을 활용하여 원자재 소요량을 예측하고, 재고 유지 비용을 15% 절감하고자 함.',
    proposer: { id: 'u3', name: '박개발', role: '대리', avatarUrl: '', department: 'IT개발팀' },
    date: '2023-11-01',
    status: 'Dept_Review',
    category: 'IT',
    targetDepartment: '물류팀',
  },
  {
    id: '#23-059',
    title: 'B동 창고 에너지 절감형 조명 교체',
    summary: '모션 센서가 내장된 LED 조명으로 전면 교체하여 전기료 절감.',
    proposer: { id: 'u5', name: '이시설', role: '사원', avatarUrl: '', department: '시설관리팀' },
    date: '2023-10-29',
    status: '1st_Review',
    category: 'Cost',
    targetDepartment: '시설관리팀',
    deptReviewComment: '예산 확보 완료되었으며 즉시 실행 가능함.',
    score1st: { necessity: 0, feasibility: 0, total: 0, passed: false } // Initial state
  },
  {
    id: '#23-045',
    title: '사내 카페 일회용 컵 제로화 캠페인',
    summary: 'QR 체크아웃 방식의 다회용 컵 시스템 도입으로 쓰레기 처리 비용 절감.',
    proposer: { id: 'u2', name: '정운영', role: '과장', avatarUrl: '', department: '경영지원팀' },
    date: '2023-10-27',
    status: '2nd_Review',
    category: 'Cost',
    targetDepartment: '총무팀',
    deptReviewComment: '부서장 전결 승인 완료.',
    score1st: { necessity: 35, feasibility: 50, total: 85, passed: true },
    mileageAccrued: 3 // 1 (Reg) + 2 (Dept Pass)
  },
  {
    id: '#23-040',
    title: '안전 보호구 구매 업체 단일화',
    summary: '여러 업체로 분산된 안전 용품 구매처를 통합하여 대량 구매 할인 적용.',
    proposer: { id: 'u4', name: '최안전', role: '주임', avatarUrl: '', department: '안전환경팀' },
    date: '2023-10-15',
    status: 'Completed',
    category: 'Safety',
    targetDepartment: '구매팀',
    deptReviewComment: '비용 절감 효과가 매우 클 것으로 예상됨.',
    score1st: { necessity: 38, feasibility: 55, total: 93, passed: true },
    grade2nd: 'A',
    mileageAccrued: 53 // 1 + 2 + 50(A grade)
  }
];

export const MOCK_MILEAGE_LOGS: MileageLog[] = [
  { id: 'm1', userId: 'u4', userName: '최안전', department: '안전환경팀', proposalId: '#23-040', proposalTitle: '안전 보호구 구매 업체 단일화', type: 'Registration', points: 1, date: '2023-10-15', status: 'Paid' },
  { id: 'm2', userId: 'u4', userName: '최안전', department: '안전환경팀', proposalId: '#23-040', proposalTitle: '안전 보호구 구매 업체 단일화', type: 'Dept_Pass', points: 2, date: '2023-10-20', status: 'Paid' },
  { id: 'm3', userId: 'u4', userName: '최안전', department: '안전환경팀', proposalId: '#23-040', proposalTitle: '안전 보호구 구매 업체 단일화', type: 'Grade_A', points: 50, date: '2023-11-02', status: 'Accrued' },
  { id: 'm4', userId: 'u2', userName: '정운영', department: '경영지원팀', proposalId: '#23-045', proposalTitle: '사내 카페 일회용 컵 제로화', type: 'Dept_Pass', points: 2, date: '2023-10-28', status: 'Accrued' },
];

export const DEPARTMENT_STATS = [
  { name: '영업본부', proposals: 120, color: '#93c5fd' },
  { name: '연구소', proposals: 245, color: '#137fec' },
  { name: '인사/총무', proposals: 85, color: '#bfdbfe' },
];