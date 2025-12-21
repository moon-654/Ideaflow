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

  // Evaluation Data
  deptReviewComment?: string;
  score1st?: {
    [criteriaId: string]: number; // Dynamic criteria scores
  } & {
    total: number;
    passed: boolean;
  };
  grade2nd?: string; // Changed to string to support dynamic grades
  rejectReason?: string;

  // Mileage
  mileageAccrued?: number;

  // Comments
  comments?: Comment[];

  // Expected monetary effect
  expectedAmount?: number;
}

export interface Comment {
  id: string;
  proposalId: string;
  author: User;
  content: string;
  createdAt: string;
}

export interface MileageLog {
  id: string;
  userId: string;
  userName: string;
  department: string;
  proposalId: string;
  proposalTitle: string;
  type: 'Registration' | 'Dept_Pass' | 'Grade_S' | 'Grade_A' | 'Grade_B' | 'Grade_C';
  points: number;
  date: string;
  status: 'Accrued' | 'Paid';
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
}
