import { Proposal, User, EmailTemplate, EmailConfig, SettingsState, SystemLog } from '../types';

export interface EmailMessage {
    to: string;
    subject: string;
    body: string;
}

export const sendEmailViaBackend = async (message: EmailMessage, config: EmailConfig): Promise<{ success: boolean; error?: string }> => {
    try {
        const response = await fetch('http://localhost:5000/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                config,
                message
            }),
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to send email');
        }
        return { success: true };
    } catch (e) {
        console.error('Backend Email Error:', e);
        return { success: false, error: e instanceof Error ? e.message : 'Connection Refused (Is Python Server running?)' };
    }
};

export const getPendingTasksForUser = (user: User, proposals: Proposal[]): Proposal[] => {
    // Filter proposals based on what this user needs to review
    return proposals.filter(p => {
        // 1. Department Review
        if (p.status === 'Dept_Review') {
            // User must have permission AND be in the target department
            // (Or Admin can see all, but for email digest, we might restrict to dept members unless desired)
            if (user.canDeptReview && user.department === p.targetDepartment) {
                return true;
            }
        }

        // 2. 1st Review
        if (p.status === '1st_Review') { // Note: Check exact status string from types
            if (user.role === '1차 심의위원' || user.role === 'Reviewer') {
                return true;
            }
        }

        // 3. 2nd Review
        if (p.status === '2nd_Review') {
            if (user.role === '2차 심의위원') {
                return true;
            }
        }

        return false;
    });
};

export const generateDailyDigest = (
    users: User[],
    proposals: Proposal[],
    config: EmailConfig,
    template?: EmailTemplate // Optional custom template
): EmailMessage[] => {
    const messages: EmailMessage[] = [];

    users.forEach(user => {
        if (!user.email) return; // Skip if no email

        const pendingProposals = getPendingTasksForUser(user, proposals);
        if (pendingProposals.length === 0) return; // No tasks, no email

        // Construct Email
        const subject = `[IdeaFlow] ${user.name}님, 오늘 처리해야 할 심의가 ${pendingProposals.length}건 있습니다.`;

        let body = `안녕하세요, ${user.name}님.\n\n`;
        body += `현재 IdeaFlow 시스템에 대기 중인 심의/검토 건이 ${pendingProposals.length}건 있습니다.\n\n`;

        pendingProposals.forEach((p, index) => {
            body += `${index + 1}. [${p.category}] ${p.title} (상태: ${getTransactionName(p.status)})\n`;
        });

        body += `\n시스템에 접속하여 확인 부탁드립니다.\n`;
        // body += `<a href="${config.appUrl}">${config.appUrl}</a>`; // config needs appUrl?

        messages.push({
            to: user.email,
            subject,
            body
        });
    });

    return messages;
};

// Helper for display
const getTransactionName = (status: string) => {
    switch (status) {
        case 'Dept_Review': return '부서 검토';
        case '1st_Review': return '1차 심의';
        case '2nd_Review': return '2차 심의';
        default: return status;
    }
};

export const simulateSendEmail = async (message: EmailMessage): Promise<boolean> => {
    // Mock Sending
    console.log(`[Email Service] Sending to ${message.to}:`);
    console.log(`Subject: ${message.subject}`);
    console.log(`Body: ${message.body}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return true;
};

// --- Instant Notification Logic ---

export const sendInstantNotification = async (
    type: 'newProposal' | 'deptReview' | 'reject' | 'finalGrade',
    proposal: Proposal,
    context: {
        users: User[],
        config: EmailConfig,
        templates: EmailTemplate[],
        notifySettings: SettingsState['notifications'],
        addSystemLog: (log: SystemLog) => void
    }
) => {
    // 1. Check Toggle
    if (!context.notifySettings[type]) {
        // console.log(`[Notification] Skipped ${type} (Disabled by Global Settings)`);
        return;
    }

    // 2. Resolve Recipients
    let recipients: User[] = [];
    switch (type) {
        case 'newProposal':
            recipients = context.users.filter(u =>
                u.department === proposal.targetDepartment && u.canDeptReview
            );
            break;
        case 'deptReview': // Dept Passed -> Notify 1st Reviewers
            recipients = context.users.filter(u => u.role === '1차 심의위원' || u.role === 'Admin');
            break;
        case 'reject':
        case 'finalGrade':
            const target = context.users.find(u => u.id === proposal.proposer.id);
            if (target) recipients = [target];
            break;
    }

    if (recipients.length === 0) {
        // console.log(`[Notification] No recipients found for ${type}`);
        return;
    }

    // 3. Get Template
    const template = context.templates.find(t => t.id === type);
    if (!template) {
        context.addSystemLog({
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            user: 'System',
            action: 'Email Trigger Failed',
            details: `Template ${type} missing`,
            level: 'Warning'
        });
        return;
    }

    // 4. Send
    // console.log(`[Notification] Sending ${type} to ${recipients.length} recipients via Backend...`);

    for (const user of recipients) {
        if (!user.email) continue;

        // User Prevention Logic
        if (user.emailPreferences && user.emailPreferences.instant === false) {
            // console.log(`Skipped ${user.name} (User Pref)`);
            continue;
        }

        // Variable Replacement
        let subject = template.subject;
        let body = template.body;

        const vars: Record<string, string> = {
            '{userName}': user.name,
            '{proposerName}': proposal.proposer.name,
            '{title}': proposal.title,
            '{summary}': proposal.summary.substring(0, 50) + '...',
            '{dept}': proposal.targetDepartment,
            '{rejectReason}': proposal.rejectReason || '(사유 없음)',
            '{grade}': proposal.grade2nd || '-',
            // '{points}': '0' // ToDo
        };

        Object.entries(vars).forEach(([key, val]) => {
            subject = subject.replace(new RegExp(key, 'g'), val);
            body = body.replace(new RegExp(key, 'g'), val);
        });

        // Fire and forget (or await if critical)
        const result = await sendEmailViaBackend({ to: user.email, subject, body }, context.config);

        // Log Result
        context.addSystemLog({
            id: `mail-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            timestamp: new Date().toISOString(),
            user: 'System Bot',
            action: result.success ? 'Email Sent' : 'Email Failed',
            details: result.success
                ? `To: ${user.name} (${type})`
                : `To: ${user.name}, Error: ${result.error}`,
            level: result.success ? 'Info' : 'Error'
        });
    }
};
