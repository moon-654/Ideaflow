-- IdeaFlow Database Initialization Script
-- Run this script in SQL Server Management Studio to create the database and tables

-- Create Database
USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'IdeaFlowDB')
BEGIN
    CREATE DATABASE IdeaFlowDB;
END
GO

USE IdeaFlowDB;
GO

-- ============================================
-- 1. Departments Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'departments')
BEGIN
    CREATE TABLE departments (
        id NVARCHAR(50) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        manager_id NVARCHAR(50) NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    
    -- Insert default departments
    INSERT INTO departments (id, name) VALUES 
        ('dept1', N'생산관리팀'),
        ('dept2', N'인사팀'),
        ('dept3', N'IT지원팀'),
        ('dept4', N'영업팀');
END
GO

-- ============================================
-- 2. Users Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
BEGIN
    CREATE TABLE users (
        id NVARCHAR(50) PRIMARY KEY,
        name NVARCHAR(100) NOT NULL,
        email NVARCHAR(255) NULL,
        role NVARCHAR(50) DEFAULT 'User',
        department NVARCHAR(100) NULL,
        avatar_url NVARCHAR(500) NULL,
        can_dept_review BIT DEFAULT 0,
        email_pref_instant BIT DEFAULT 1,
        email_pref_daily BIT DEFAULT 0,
        is_deleted BIT DEFAULT 0,
        deleted_at DATETIME2 NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    
    CREATE INDEX idx_users_email ON users(email);
    CREATE INDEX idx_users_department ON users(department);
END
GO

-- ============================================
-- 3. Proposals Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'proposals')
BEGIN
    CREATE TABLE proposals (
        id NVARCHAR(50) PRIMARY KEY,
        proposal_number NVARCHAR(50) NOT NULL UNIQUE,
        title NVARCHAR(500) NOT NULL,
        summary NVARCHAR(MAX) NULL,
        status NVARCHAR(50) DEFAULT 'New',
        category NVARCHAR(100) NULL,
        target_department NVARCHAR(100) NULL,
        
        -- Content Details
        current_problem NVARCHAR(MAX) NULL,
        improvement_plan NVARCHAR(MAX) NULL,
        expected_effect NVARCHAR(MAX) NULL,
        expected_amount INT NULL,
        
        -- Review Data
        dept_review_comment NVARCHAR(MAX) NULL,
        grade_2nd NVARCHAR(50) NULL,
        reject_reason NVARCHAR(MAX) NULL,
        mileage_accrued INT DEFAULT 0,
        
        -- JSON Data Fields (for complex nested objects)
        score_1st_data NVARCHAR(MAX) NULL,
        aggregated_1st_data NVARCHAR(MAX) NULL,
        aggregated_2nd_data NVARCHAR(MAX) NULL,
        completion_report_data NVARCHAR(MAX) NULL,
        contributors_data NVARCHAR(MAX) NULL,
        execution_team_ratio INT NULL,
        
        -- Proposer Info (denormalized for performance)
        proposer_id NVARCHAR(50) NOT NULL,
        proposer_name NVARCHAR(100) NOT NULL,
        proposer_role NVARCHAR(50) NULL,
        proposer_department NVARCHAR(100) NULL,
        proposer_avatar NVARCHAR(500) NULL,
        
        -- Version Control
        current_version INT DEFAULT 1,
        can_edit_during_review BIT DEFAULT 0,
        
        -- Admin Management
        is_deleted BIT DEFAULT 0,
        is_archived BIT DEFAULT 0,
        is_hidden BIT DEFAULT 0,
        deleted_at DATETIME2 NULL,
        deleted_by NVARCHAR(50) NULL,
        deleted_reason NVARCHAR(MAX) NULL,
        archived_at DATETIME2 NULL,
        archived_by NVARCHAR(50) NULL,
        archived_reason NVARCHAR(MAX) NULL,
        
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    
    CREATE INDEX idx_proposals_status ON proposals(status);
    CREATE INDEX idx_proposals_proposer ON proposals(proposer_id);
    CREATE INDEX idx_proposals_department ON proposals(target_department);
    CREATE INDEX idx_proposals_created ON proposals(created_at);
END
GO

-- ============================================
-- 4. Reviews Table (Multi-reviewer evaluations)
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'reviews')
BEGIN
    CREATE TABLE reviews (
        id NVARCHAR(50) PRIMARY KEY,
        proposal_id NVARCHAR(50) NOT NULL,
        reviewer_id NVARCHAR(50) NOT NULL,
        reviewer_name NVARCHAR(100) NOT NULL,
        round NVARCHAR(10) NOT NULL, -- '1st' or '2nd'
        scores_data NVARCHAR(MAX) NULL, -- JSON: { criteriaId: score }
        total INT DEFAULT 0,
        comment NVARCHAR(MAX) NULL,
        evaluated_at DATETIME2 DEFAULT GETDATE(),
        
        CONSTRAINT FK_reviews_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(id)
    );
    
    CREATE INDEX idx_reviews_proposal ON reviews(proposal_id);
    CREATE INDEX idx_reviews_reviewer ON reviews(reviewer_id);
END
GO

-- ============================================
-- 5. Unified Comments Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'unified_comments')
BEGIN
    CREATE TABLE unified_comments (
        id NVARCHAR(50) PRIMARY KEY,
        proposal_id NVARCHAR(50) NOT NULL,
        author_id NVARCHAR(50) NOT NULL,
        author_name NVARCHAR(100) NOT NULL,
        author_role NVARCHAR(50) NULL,
        type NVARCHAR(50) DEFAULT 'general', -- general, review_1st, review_2nd, dept_review, supplement_request, reply
        parent_id NVARCHAR(50) NULL,
        content NVARCHAR(MAX) NOT NULL,
        visibility NVARCHAR(50) DEFAULT 'public', -- public, reviewers_only, admin_only
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 NULL,
        
        CONSTRAINT FK_comments_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(id)
    );
    
    CREATE INDEX idx_comments_proposal ON unified_comments(proposal_id);
END
GO

-- ============================================
-- 6. Proposal Revisions Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'proposal_revisions')
BEGIN
    CREATE TABLE proposal_revisions (
        id NVARCHAR(50) PRIMARY KEY,
        proposal_id NVARCHAR(50) NOT NULL,
        version INT NOT NULL,
        created_by NVARCHAR(50) NOT NULL,
        created_by_name NVARCHAR(100) NOT NULL,
        change_note NVARCHAR(MAX) NULL,
        snapshot_data NVARCHAR(MAX) NOT NULL, -- JSON snapshot of proposal at this version
        created_at DATETIME2 DEFAULT GETDATE(),
        
        CONSTRAINT FK_revisions_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(id)
    );
    
    CREATE INDEX idx_revisions_proposal ON proposal_revisions(proposal_id);
END
GO

-- ============================================
-- 7. Supplement Requests Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'supplement_requests')
BEGIN
    CREATE TABLE supplement_requests (
        id NVARCHAR(50) PRIMARY KEY,
        proposal_id NVARCHAR(50) NOT NULL,
        requested_by NVARCHAR(50) NOT NULL,
        requested_by_name NVARCHAR(100) NOT NULL,
        requested_at DATETIME2 DEFAULT GETDATE(),
        deadline NVARCHAR(50) NOT NULL,
        reason NVARCHAR(MAX) NOT NULL,
        status NVARCHAR(50) DEFAULT 'pending', -- pending, completed, expired
        completed_at DATETIME2 NULL,
        revision_id NVARCHAR(50) NULL,
        
        CONSTRAINT FK_supplements_proposal FOREIGN KEY (proposal_id) REFERENCES proposals(id)
    );
    
    CREATE INDEX idx_supplements_proposal ON supplement_requests(proposal_id);
END
GO

-- ============================================
-- 8. Mileage Logs Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'mileage_logs')
BEGIN
    CREATE TABLE mileage_logs (
        id NVARCHAR(50) PRIMARY KEY,
        user_id NVARCHAR(50) NOT NULL,
        user_name NVARCHAR(100) NOT NULL,
        department NVARCHAR(100) NULL,
        proposal_id NVARCHAR(50) NULL,
        proposal_title NVARCHAR(500) NULL,
        type NVARCHAR(50) NOT NULL, -- Registration, Dept_Pass, Grade_S, Grade_A, Grade_B, Grade_C, Cost_Saving_Reward, Bonus, Penalty
        points INT NOT NULL,
        date NVARCHAR(50) NOT NULL,
        status NVARCHAR(50) DEFAULT 'Accrued', -- Accrued, Paid, Cancelled
        description NVARCHAR(MAX) NULL,
        batch_id NVARCHAR(50) NULL,
        created_at DATETIME2 DEFAULT GETDATE()
    );
    
    CREATE INDEX idx_mileage_user ON mileage_logs(user_id);
    CREATE INDEX idx_mileage_proposal ON mileage_logs(proposal_id);
    CREATE INDEX idx_mileage_status ON mileage_logs(status);
END
GO

-- ============================================
-- 9. Notifications Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'notifications')
BEGIN
    CREATE TABLE notifications (
        id NVARCHAR(50) PRIMARY KEY,
        recipient_id NVARCHAR(50) NOT NULL,
        type NVARCHAR(50) NOT NULL,
        proposal_id NVARCHAR(50) NULL,
        proposal_title NVARCHAR(500) NULL,
        message NVARCHAR(MAX) NOT NULL,
        read BIT DEFAULT 0,
        link NVARCHAR(500) NULL,
        created_at DATETIME2 DEFAULT GETDATE()
    );
    
    CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
    CREATE INDEX idx_notifications_read ON notifications(read);
END
GO

-- ============================================
-- 10. Settings Table (Key-Value store)
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'settings')
BEGIN
    CREATE TABLE settings (
        setting_key NVARCHAR(100) PRIMARY KEY,
        setting_value NVARCHAR(MAX) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE(),
        updated_at DATETIME2 DEFAULT GETDATE()
    );
    
    -- Insert default settings
    INSERT INTO settings (setting_key, setting_value) VALUES 
        ('mileageRules', '{"registration":50,"deptPass":100,"gradeS":500,"gradeA":300,"gradeB":200,"gradeC":100}'),
        ('evaluationCutoff', '60'),
        ('totalReviewers1st', '3'),
        ('totalReviewers2nd', '3'),
        ('supplementDeadlineDays', '7'),
        ('blindMode', '{"evaluator":true,"proposer":true}'),
        ('categories', '[{"id":"process","name":"공정개선","color":"blue"},{"id":"quality","name":"품질향상","color":"green"},{"id":"safety","name":"안전개선","color":"red"},{"id":"cost","name":"원가절감","color":"orange"}]'),
        ('grades', '[{"id":"S","name":"S등급","mileagePoints":500,"color":"purple","minScore":28},{"id":"A","name":"A등급","mileagePoints":300,"color":"blue","minScore":23},{"id":"B","name":"B등급","mileagePoints":200,"color":"green","minScore":18},{"id":"C","name":"C등급","mileagePoints":100,"color":"gray","minScore":0}]');
END
GO

-- ============================================
-- 11. Files Table (Attachment metadata)
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'files')
BEGIN
    CREATE TABLE files (
        id NVARCHAR(50) PRIMARY KEY,
        proposal_id NVARCHAR(50) NULL,
        file_name NVARCHAR(500) NOT NULL,
        stored_name NVARCHAR(500) NOT NULL,
        file_path NVARCHAR(1000) NOT NULL,
        mime_type NVARCHAR(100) NULL,
        file_size INT NULL,
        uploaded_at DATETIME2 DEFAULT GETDATE()
    );
    
    CREATE INDEX idx_files_proposal ON files(proposal_id);
END
GO

-- ============================================
-- 12. System Logs Table
-- ============================================
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'system_logs')
BEGIN
    CREATE TABLE system_logs (
        id NVARCHAR(50) PRIMARY KEY,
        timestamp DATETIME2 DEFAULT GETDATE(),
        user_id NVARCHAR(50) NULL,
        user_name NVARCHAR(100) NULL,
        action NVARCHAR(100) NOT NULL,
        details NVARCHAR(MAX) NULL,
        level NVARCHAR(20) DEFAULT 'Info' -- Info, Warning, Error
    );
    
    CREATE INDEX idx_logs_timestamp ON system_logs(timestamp);
    CREATE INDEX idx_logs_level ON system_logs(level);
END
GO

PRINT N'✅ IdeaFlow 데이터베이스 초기화 완료!';
PRINT N'테이블: departments, users, proposals, reviews, unified_comments, proposal_revisions, supplement_requests, mileage_logs, notifications, settings, files, system_logs';
GO
