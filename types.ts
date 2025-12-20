import React from 'react';

export interface User {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  department: string;
}

export type ProposalStatus = 
  | 'New'           // Registered
  | 'Dept_Review'   // Assigned to Dept
  | '1st_Review'    // Passed Dept, waiting for screening
  | '2nd_Review'    // Passed 1st round, waiting for grading
  | 'Completed'     // Finalized (Awarded)
  | 'Rejected';     // Dropped at any stage

export interface Proposal {
  id: string;
  title: string;
  summary: string;
  proposer: User;
  date: string;
  status: ProposalStatus;
  category: 'Process' | 'Cost' | 'Safety' | 'Welfare' | 'IT' | 'Marketing';
  targetDepartment: string; // The department executing/reviewing
  
  // Evaluation Data
  deptReviewComment?: string;
  score1st?: {
    necessity: number; // e.g., 40pts
    feasibility: number; // e.g., 60pts
    total: number;
    passed: boolean;
  };
  grade2nd?: 'S' | 'A' | 'B' | 'C';
  
  // Mileage
  mileageAccrued?: number;
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
  status: 'Accrued' | 'Paid'; // Accrued = waiting, Paid = done
}

export interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  trendType?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  colorClass: string;
}