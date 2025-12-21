/**
 * Export Service - CSV Export Utility for Proposals and Mileage Logs
 */

import { Proposal, MileageLog } from '../types';

/**
 * Convert array of objects to CSV string
 */
export const convertToCSV = (data: Record<string, unknown>[], headers: { key: string; label: string }[]): string => {
    const csvRows: string[] = [];

    // Header row
    csvRows.push(headers.map(h => `"${h.label}"`).join(','));

    // Data rows
    for (const item of data) {
        const values = headers.map(h => {
            let value = item[h.key];
            if (value === null || value === undefined) value = '';
            if (typeof value === 'object') value = JSON.stringify(value);
            // Escape quotes and wrap in quotes
            return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
};

/**
 * Download a CSV file
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
    // Add BOM for Excel UTF-8 compatibility
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Export proposals to CSV
 */
export const exportProposalsToCSV = (proposals: Proposal[], filename?: string): void => {
    const headers = [
        { key: 'id', label: '제안번호' },
        { key: 'title', label: '제목' },
        { key: 'proposerName', label: '제안자' },
        { key: 'proposerDept', label: '제안자 부서' },
        { key: 'category', label: '카테고리' },
        { key: 'status', label: '상태' },
        { key: 'date', label: '등록일' },
        { key: 'targetDepartment', label: '실행 부서' },
        { key: 'expectedAmount', label: '예상 금액' },
        { key: 'summary', label: '요약' },
        { key: 'score1stTotal', label: '1차 심사 점수' },
        { key: 'score2ndTotal', label: '2차 심사 점수' },
        { key: 'grade2nd', label: '최종 등급' },
        { key: 'mileageAccrued', label: '적립 마일리지' },
        { key: 'isArchived', label: '보관 여부' },
        { key: 'isDeleted', label: '삭제 여부' },
    ];

    const data = proposals.map(p => ({
        id: p.id,
        title: p.title,
        proposerName: p.proposer?.name || '',
        proposerDept: p.proposer?.department || '',
        category: p.category,
        status: p.status,
        date: p.date,
        targetDepartment: p.targetDepartment || '',
        expectedAmount: p.expectedAmount || 0,
        summary: p.summary?.replace(/<[^>]*>/g, '') || '', // Strip HTML
        score1stTotal: p.aggregated1st?.averageTotal || p.score1st?.total || '',
        score2ndTotal: p.aggregated2nd?.averageTotal || p.score2nd?.total || '',
        grade2nd: p.grade2nd || '',
        mileageAccrued: p.mileageAccrued || 0,
        isArchived: p.isArchived ? 'Y' : 'N',
        isDeleted: p.isDeleted ? 'Y' : 'N',
    }));

    const csv = convertToCSV(data, headers);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, filename || `proposals_export_${timestamp}.csv`);
};

/**
 * Export mileage logs to CSV
 */
export const exportMileageLogsToCSV = (logs: MileageLog[], filename?: string): void => {
    const headers = [
        { key: 'id', label: '로그 ID' },
        { key: 'date', label: '날짜' },
        { key: 'userName', label: '사용자' },
        { key: 'userDept', label: '부서' },
        { key: 'type', label: '유형' },
        { key: 'points', label: '포인트' },
        { key: 'proposalId', label: '제안번호' },
        { key: 'proposalTitle', label: '제안 제목' },
        { key: 'description', label: '설명' },
    ];

    const data = logs.map(log => ({
        id: log.id,
        date: log.date,
        userName: log.user?.name || '',
        userDept: log.user?.department || '',
        type: log.type,
        points: log.points,
        proposalId: log.proposal?.id || '',
        proposalTitle: log.proposal?.title || '',
        description: log.description || '',
    }));

    const csv = convertToCSV(data, headers);
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, filename || `mileage_export_${timestamp}.csv`);
};

/**
 * Export selected proposals to CSV
 */
export const exportSelectedProposalsToCSV = (proposals: Proposal[], selectedIds: string[]): void => {
    const selected = proposals.filter(p => selectedIds.includes(p.id));
    exportProposalsToCSV(selected, `selected_proposals_${new Date().toISOString().slice(0, 10)}.csv`);
};
