-- Fix Korean Encoding - Complete Reset
-- This script fixes the database collation and re-inserts Korean data

USE IdeaFlowDB;
GO

-- ============================================
-- Step 1: Clear and re-insert departments
-- ============================================
DELETE FROM departments;
GO

-- Use explicit Unicode literals with NVARCHAR
INSERT INTO departments (id, name) 
SELECT N'dept1', CAST(N'생산관리팀' AS NVARCHAR(100))
UNION ALL SELECT N'dept2', CAST(N'인사팀' AS NVARCHAR(100))
UNION ALL SELECT N'dept3', CAST(N'IT지원팀' AS NVARCHAR(100))
UNION ALL SELECT N'dept4', CAST(N'영업팀' AS NVARCHAR(100));
GO

-- Verify departments
SELECT * FROM departments;
GO

-- ============================================
-- Step 2: Clear and re-insert settings
-- ============================================
DELETE FROM settings WHERE setting_key IN ('categories', 'grades');
GO

-- Categories with Korean
INSERT INTO settings (setting_key, setting_value)
VALUES (N'categories', N'[{"id":"process","name":"공정개선","color":"blue"},{"id":"quality","name":"품질향상","color":"green"},{"id":"safety","name":"안전개선","color":"red"},{"id":"cost","name":"원가절감","color":"orange"}]');
GO

-- Grades with Korean
INSERT INTO settings (setting_key, setting_value)
VALUES (N'grades', N'[{"id":"S","name":"S등급","mileagePoints":500,"color":"purple","minScore":28,"rewardAmount":300000},{"id":"A","name":"A등급","mileagePoints":300,"color":"blue","minScore":23,"rewardAmount":200000},{"id":"B","name":"B등급","mileagePoints":200,"color":"green","minScore":18,"rewardAmount":100000},{"id":"C","name":"C등급","mileagePoints":100,"color":"gray","minScore":0,"rewardAmount":50000}]');
GO

-- Verify settings
SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('categories', 'grades');
GO

PRINT 'Done. Refresh browser.';
GO
