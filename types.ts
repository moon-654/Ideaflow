import React from 'react';

export interface User {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  department: string;
  email?: string;
  canDeptReview?: boolean;
  emailPreferences?: {
    instant: boolean;
    daily: boolean;
  };
}

// Category for proposals
export interface Category {
  id: string;
  name: string;
  color: string; // tailwind color name like 'blue', 'green', etc.
}

// Evaluation criteria for 1st review
export interface EvaluationCriteria {
  id: string;
  name: string;
  maxPoints: number;
  description?: string;
}

// Grade for 2nd review
export interface Grade {
  id: string;
  name: string;
  mileagePoints: number;
  color: string;
  minScore?: number;  // Minimum score for this grade (e.g., 28 for S)
  maxScore?: number;  // Maximum score for this grade (e.g., 30 for S)
  rewardAmount?: number; // Reward amount in KRW
}

// 2nd Round Evaluation Criteria (5-point scale)
export interface Evaluation2ndCriteria {
  id: string;
  name: string;
  maxPoints: number; // Typically 5
  description?: string;
  labels?: { [score: number]: string }; // e.g., { 5: "아무도 눈치채지 못했다", 1: "모든 사람이 알고 있습니다" }
}

// Individual reviewer's evaluation record
export interface ReviewerEvaluation {
  id: string;
  reviewerId: string;
  reviewerName: string;
  evaluatedAt: string;
  round: '1st' | '2nd';
  scores: Record<string, number>; // criteriaId -> score
  total: number;
  comment?: string;
}

export type ProposalStatus =
  | 'New'           // Registered
  | 'Dept_Review'   // Assigned to Dept
  | '1st_Review'    // Passed Dept, waiting for screening
  | '2nd_Review'    // Passed 1st round, waiting for grading
  | 'Completed'     // Finalized (Awarded)
  | 'Rejected'      // Dropped at any stage
  | 'Modification_Requested'; // Returned to proposer for limits

export interface Proposal {
  id: string;
  proposalNumber?: string; // e.g. "AKC_IP-2025-001"
  title: string;
  summary: string;
  proposer: User;
  date: string;
  status: ProposalStatus;
  category: string; // Changed to string to support dynamic categories
  targetDepartment: string;

  // Content Details
  currentProblem?: string;
  improvementPlan?: string;
  expectedEffect?: string;

  // Evaluation Data (Legacy single-reviewer - deprecated)
  deptReviewComment?: string;
  score1st?: {
    [criteriaId: string]: number; // Dynamic criteria scores
  } & {
    total: number;
    passed: boolean;
  };
  grade2nd?: string; // Changed to string to support dynamic grades
  rejectReason?: string;

  // Multi-Reviewer Evaluation Data
  reviews1st?: ReviewerEvaluation[];
  reviews2nd?: ReviewerEvaluation[];
  aggregated1st?: {
    averageScores: Record<string, number>; // Average per criterion
    averageTotal: number;
    passed: boolean;
    reviewerCount: number;
  };
  aggregated2nd?: {
    averageScores: Record<string, number>;
    averageTotal: number;
    finalGrade: string;
    rewardAmount: number;
    reviewerCount: number;
  };

  // Mileage
  mileageAccrued?: number;

  // Comments (Legacy)
  comments?: Comment[];

  // Expected monetary effect
  expectedAmount?: number;

  // Unified Comment System
  unifiedComments?: UnifiedComment[];

  // Revision Management
  revisions?: ProposalRevision[];
  currentVersion?: number;
  canEditDuringReview?: boolean;  // Set to true when supplement requested

  // Supplement Requests
  supplementRequests?: SupplementRequest[];

  // Admin Management
  isDeleted?: boolean;
  isArchived?: boolean;
  isHidden?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deletedReason?: string;
  archivedAt?: string;
  archivedBy?: string;
  archivedReason?: string;

  // Co-Authors & Contribution
  coAuthors?: { id: string; name: string; department: string }[]; // Keeping for backward compatibility or display
  contributors?: Contributor[]; // [NEW] Full contribution tracking
  executionTeamRatio?: number; // [NEW] Ratio allocated to Execution Team (0-100)

  // File Attachments
  attachments?: ProposalAttachment[];

  // Completion Report
  completionReport?: CompletionReport;
}

// Proposal Attachment
export interface ProposalAttachment {
  id: string;
  fileName: string;
  filePath: string;
  url: string;
  size: number;
  mimeType: string;
  uploadedAt?: string;
}

export interface CompletionReport {
  id: string;
  actualSavingAmount: number; // Annual saving amount in KRW
  evidenceDescription: string;
  evidenceAttachments: string[]; // URLs of attached files (mock)
  status: 'Pending' | 'Approved' | 'Rejected' | 'Partial';
  recognizedPercentage?: number; // 0, 80, 100 etc.
  finalRecognizedAmount?: number; // Calculated based on percentage
  reviewComment?: string; // Comment from the committee
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface Comment {
  id: string;
  proposalId: string;
  author: User;
  content: string;
  createdAt: string;
}

// Unified Comment System
export interface UnifiedComment {
  id: string;
  proposalId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  type: 'general' | 'review_1st' | 'review_2nd' | 'dept_review' | 'supplement_request' | 'reply';
  parentId?: string;  // For replies
  content: string;
  visibility: 'public' | 'reviewers_only' | 'admin_only';
  createdAt: string;
  updatedAt?: string;
}

// Proposal Revision for tracking changes
export interface ProposalRevision {
  id: string;
  proposalId: string;
  version: number;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  changeNote?: string;
  snapshot: {
    title: string;
    summary: string;
    currentProblem: string;
    improvementPlan: string;
    expectedEffect: string;
    expectedAmount?: number;
  };
}

// Supplement Request for revision workflow
export interface SupplementRequest {
  id: string;
  proposalId: string;
  requestedBy: string;
  requestedByName: string;
  requestedAt: string;
  deadline: string;  // ISO date string
  reason: string;
  status: 'pending' | 'completed' | 'expired';
  completedAt?: string;
  revisionId?: string;  // Links to the revision created
}

// In-app Notification
export interface Notification {
  id: string;
  recipientId: string;
  type: 'new_comment' | 'reply' | 'supplement_request' | 'supplement_completed' | 'review_feedback' | 'status_change';
  proposalId: string;
  proposalTitle: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;  // Navigation link
}


export interface MileageLog {
  id: string;
  userId: string;
  userName: string;
  department: string;
  proposalId?: string;
  proposalTitle?: string;
  type: 'Registration' | 'Dept_Pass' | 'Grade_S' | 'Grade_A' | 'Grade_B' | 'Grade_C' | 'Cost_Saving_Reward' | 'Bonus' | 'Penalty';
  points: number;
  date: string;
  status: 'Accrued' | 'Paid' | 'Cancelled';
  description?: string;
  batchId?: string; // Link to PayoutBatch
}

export interface PayoutBatch {
  id: string; // e.g., PO-20231221-01
  processedBy: string;
  processedAt: string;
  totalAmount: number;
  logCount: number;
  status: 'Completed';
  logs: string[]; // IDs of included logs
}

export interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  colorClass: string;
}

export interface Department {
  id: string;
  name: string;
  managerId?: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
  level: 'Info' | 'Warning' | 'Error';
}

export interface Project {
  id: string;
  name: string;
  identifier: string;
  description?: string;
  status: string;
}

export interface EmailConfig {
  deliveryMethod: 'smtp' | 'sendmail';
  smtpServer: string;
  smtpPort: string;
  smtpHeloDomain: string;
  smtpAuth: 'none' | 'plain' | 'login' | 'cram-md5';
  smtpUsername: string;
  smtpPassword?: string;
  enableStartTls: boolean;
  enableSsl: boolean;
}

export interface EmailTemplate {
  id: string; // 'newProposal', 'deptReview', 'reject', 'finalGrade'
  name: string; // Display name
  subject: string;
  body: string;
}

export interface SettingsState {
  emailConfig: EmailConfig;
  emailTemplates: EmailTemplate[];
  notifications: {
    newProposal: boolean;
    deptReview: boolean;
    reject: boolean;
    finalGrade: boolean;
  };
  mileageRules: {
    registration: number;
    deptPass: number;
    gradeS: number;
    gradeA: number;
    gradeB: number;
    gradeC: number;
  };

  openProject: {
    apiUrl: string;
    apiKey: string;
    lastSync: string | null;
    projects: Project[];
  };
  // New configurable settings
  categories: Category[];
  evaluationCriteria: EvaluationCriteria[];
  evaluationCutoff: number; // Minimum score to pass 1st review
  grades: Grade[];

  // 2nd Round Evaluation Criteria (5-point scale)
  evaluation2ndCriteria: Evaluation2ndCriteria[];

  // Blind Mode Settings
  blindMode: {
    evaluator: boolean; // Hide proposer info from evaluators
    proposer: boolean; // Hide evaluator info from proposers
  };

  // Required reviewers for grade confirmation (majority = totalReviewers / 2 + 1)
  totalReviewers1st: number;
  totalReviewers2nd: number;

  // Supplement Request Settings
  supplementDeadlineDays: number;  // Default 7 (1 week)

  // Contribution Management Settings
  contribution: {
    enabled: boolean;
    maxCoAuthors: number;
    description?: string;
  };
}

export interface Contributor {
  id: string; // userId
  name: string;
  department: string;
  type: 'Proposer' | 'CoAuthor' | 'Execution';
  ratio: number; // Percentage (0-100)
  hasAgreed: boolean; // For final reward confirmation
  agreedAt?: string;
}
