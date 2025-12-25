import { Router } from 'express';
import { getPool, sql } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Helper to generate proposal number
async function generateProposalNumber(pool: any): Promise<string> {
    const year = new Date().getFullYear();
    const result = await pool.request()
        .input('year', sql.Int, year)
        .query(`
      SELECT COUNT(*) as count FROM proposals 
      WHERE YEAR(created_at) = @year
    `);
    const count = result.recordset[0].count + 1;
    return `AKC_IP-${year}-${String(count).padStart(3, '0')}`;
}

// GET all proposals
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
      SELECT 
        p.id, p.proposal_number as proposalNumber, p.title, p.summary,
        p.status, p.category, p.target_department as targetDepartment,
        p.current_problem as currentProblem, p.improvement_plan as improvementPlan,
        p.expected_effect as expectedEffect, p.expected_amount as expectedAmount,
        p.dept_review_comment as deptReviewComment, p.grade_2nd as grade2nd,
        p.reject_reason as rejectReason, p.mileage_accrued as mileageAccrued,
        p.current_version as currentVersion, p.can_edit_during_review as canEditDuringReview,
        p.is_deleted as isDeleted, p.is_archived as isArchived, p.is_hidden as isHidden,
        p.created_at as date,
        p.proposer_id, p.proposer_name, p.proposer_role, p.proposer_department, p.proposer_avatar
      FROM proposals p
      WHERE p.is_deleted = 0
      ORDER BY p.created_at DESC
    `);

        // Transform to match frontend format
        const proposals = result.recordset.map(p => ({
            ...p,
            proposer: {
                id: p.proposer_id,
                name: p.proposer_name,
                role: p.proposer_role,
                department: p.proposer_department,
                avatarUrl: p.proposer_avatar
            }
        }));

        res.json(proposals);
    } catch (error) {
        console.error('Error fetching proposals:', error);
        res.status(500).json({ error: 'Failed to fetch proposals' });
    }
});

// GET single proposal by ID
router.get('/:id', async (req, res) => {
    try {
        const pool = await getPool();

        // Get proposal
        const proposalResult = await pool.request()
            .input('id', sql.NVarChar, req.params.id)
            .query(`
        SELECT 
          p.id, p.proposal_number as proposalNumber, p.title, p.summary,
          p.status, p.category, p.target_department as targetDepartment,
          p.current_problem as currentProblem, p.improvement_plan as improvementPlan,
          p.expected_effect as expectedEffect, p.expected_amount as expectedAmount,
          p.dept_review_comment as deptReviewComment, p.grade_2nd as grade2nd,
          p.reject_reason as rejectReason, p.mileage_accrued as mileageAccrued,
          p.current_version as currentVersion, p.can_edit_during_review as canEditDuringReview,
          p.is_deleted as isDeleted, p.is_archived as isArchived, p.is_hidden as isHidden,
          p.created_at as date,
          p.proposer_id, p.proposer_name, p.proposer_role, p.proposer_department, p.proposer_avatar,
          p.score_1st_data, p.aggregated_1st_data, p.aggregated_2nd_data,
          p.completion_report_data, p.contributors_data, p.execution_team_ratio as executionTeamRatio
        FROM proposals p
        WHERE p.id = @id
      `);

        if (proposalResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Proposal not found' });
        }

        const p = proposalResult.recordset[0];

        // Get reviews
        const reviewsResult = await pool.request()
            .input('proposalId', sql.NVarChar, req.params.id)
            .query(`
        SELECT id, reviewer_id as reviewerId, reviewer_name as reviewerName,
               evaluated_at as evaluatedAt, round, scores_data, total, comment
        FROM reviews
        WHERE proposal_id = @proposalId
        ORDER BY evaluated_at DESC
      `);

        const reviews1st = reviewsResult.recordset
            .filter(r => r.round === '1st')
            .map(r => ({ ...r, scores: JSON.parse(r.scores_data || '{}') }));
        const reviews2nd = reviewsResult.recordset
            .filter(r => r.round === '2nd')
            .map(r => ({ ...r, scores: JSON.parse(r.scores_data || '{}') }));

        // Get comments
        const commentsResult = await pool.request()
            .input('proposalId', sql.NVarChar, req.params.id)
            .query(`
        SELECT id, proposal_id as proposalId, author_id as authorId,
               author_name as authorName, author_role as authorRole,
               type, parent_id as parentId, content, visibility,
               created_at as createdAt, updated_at as updatedAt
        FROM unified_comments
        WHERE proposal_id = @proposalId
        ORDER BY created_at ASC
      `);

        // Get revisions
        const revisionsResult = await pool.request()
            .input('proposalId', sql.NVarChar, req.params.id)
            .query(`
        SELECT id, proposal_id as proposalId, version, created_at as createdAt,
               created_by as createdBy, created_by_name as createdByName,
               change_note as changeNote, snapshot_data
        FROM proposal_revisions
        WHERE proposal_id = @proposalId
        ORDER BY version DESC
      `);

        const revisions = revisionsResult.recordset.map(r => ({
            ...r,
            snapshot: JSON.parse(r.snapshot_data || '{}')
        }));

        // Get supplement requests
        const supplementsResult = await pool.request()
            .input('proposalId', sql.NVarChar, req.params.id)
            .query(`
        SELECT id, proposal_id as proposalId, requested_by as requestedBy,
               requested_by_name as requestedByName, requested_at as requestedAt,
               deadline, reason, status, completed_at as completedAt, revision_id as revisionId
        FROM supplement_requests
        WHERE proposal_id = @proposalId
        ORDER BY requested_at DESC
      `);

        // Build full proposal object
        const proposal = {
            ...p,
            proposer: {
                id: p.proposer_id,
                name: p.proposer_name,
                role: p.proposer_role,
                department: p.proposer_department,
                avatarUrl: p.proposer_avatar
            },
            reviews1st,
            reviews2nd,
            unifiedComments: commentsResult.recordset,
            revisions,
            supplementRequests: supplementsResult.recordset,
            score1st: p.score_1st_data ? JSON.parse(p.score_1st_data) : undefined,
            aggregated1st: p.aggregated_1st_data ? JSON.parse(p.aggregated_1st_data) : undefined,
            aggregated2nd: p.aggregated_2nd_data ? JSON.parse(p.aggregated_2nd_data) : undefined,
            completionReport: p.completion_report_data ? JSON.parse(p.completion_report_data) : undefined,
            contributors: p.contributors_data ? JSON.parse(p.contributors_data) : undefined,
        };

        res.json(proposal);
    } catch (error) {
        console.error('Error fetching proposal:', error);
        res.status(500).json({ error: 'Failed to fetch proposal' });
    }
});

// POST create proposal
router.post('/', async (req, res) => {
    try {
        const {
            title, summary, proposer, category, targetDepartment,
            currentProblem, improvementPlan, expectedEffect, expectedAmount,
            coAuthors, contributors, executionTeamRatio
        } = req.body;

        const pool = await getPool();
        const id = uuidv4();
        const proposalNumber = await generateProposalNumber(pool);
        const status = targetDepartment ? 'Dept_Review' : 'New';

        await pool.request()
            .input('id', sql.NVarChar, id)
            .input('proposalNumber', sql.NVarChar, proposalNumber)
            .input('title', sql.NVarChar, title)
            .input('summary', sql.NVarChar(sql.MAX), summary)
            .input('status', sql.NVarChar, status)
            .input('category', sql.NVarChar, category)
            .input('targetDepartment', sql.NVarChar, targetDepartment)
            .input('currentProblem', sql.NVarChar(sql.MAX), currentProblem)
            .input('improvementPlan', sql.NVarChar(sql.MAX), improvementPlan)
            .input('expectedEffect', sql.NVarChar(sql.MAX), expectedEffect)
            .input('expectedAmount', sql.Int, expectedAmount || null)
            .input('proposerId', sql.NVarChar, proposer.id)
            .input('proposerName', sql.NVarChar, proposer.name)
            .input('proposerRole', sql.NVarChar, proposer.role)
            .input('proposerDepartment', sql.NVarChar, proposer.department)
            .input('proposerAvatar', sql.NVarChar, proposer.avatarUrl || '')
            .input('contributorsData', sql.NVarChar(sql.MAX), contributors ? JSON.stringify(contributors) : null)
            .input('executionTeamRatio', sql.Int, executionTeamRatio || null)
            .query(`
        INSERT INTO proposals (
          id, proposal_number, title, summary, status, category, target_department,
          current_problem, improvement_plan, expected_effect, expected_amount,
          proposer_id, proposer_name, proposer_role, proposer_department, proposer_avatar,
          contributors_data, execution_team_ratio, current_version
        ) VALUES (
          @id, @proposalNumber, @title, @summary, @status, @category, @targetDepartment,
          @currentProblem, @improvementPlan, @expectedEffect, @expectedAmount,
          @proposerId, @proposerName, @proposerRole, @proposerDepartment, @proposerAvatar,
          @contributorsData, @executionTeamRatio, 1
        )
      `);

        res.status(201).json({
            id,
            proposalNumber,
            title,
            summary,
            status,
            category,
            targetDepartment,
            currentProblem,
            improvementPlan,
            expectedEffect,
            expectedAmount,
            proposer,
            date: new Date().toISOString(),
            currentVersion: 1
        });
    } catch (error) {
        console.error('Error creating proposal:', error);
        res.status(500).json({ error: 'Failed to create proposal' });
    }
});

// PUT update proposal
router.put('/:id', async (req, res) => {
    try {
        const updates = req.body;
        const pool = await getPool();

        // Build dynamic update query
        const updateFields: string[] = [];
        const request = pool.request().input('id', sql.NVarChar, req.params.id);

        if (updates.title !== undefined) {
            updateFields.push('title = @title');
            request.input('title', sql.NVarChar, updates.title);
        }
        if (updates.summary !== undefined) {
            updateFields.push('summary = @summary');
            request.input('summary', sql.NVarChar(sql.MAX), updates.summary);
        }
        if (updates.status !== undefined) {
            updateFields.push('status = @status');
            request.input('status', sql.NVarChar, updates.status);
        }
        if (updates.category !== undefined) {
            updateFields.push('category = @category');
            request.input('category', sql.NVarChar, updates.category);
        }
        if (updates.targetDepartment !== undefined) {
            updateFields.push('target_department = @targetDepartment');
            request.input('targetDepartment', sql.NVarChar, updates.targetDepartment);
        }
        if (updates.currentProblem !== undefined) {
            updateFields.push('current_problem = @currentProblem');
            request.input('currentProblem', sql.NVarChar(sql.MAX), updates.currentProblem);
        }
        if (updates.improvementPlan !== undefined) {
            updateFields.push('improvement_plan = @improvementPlan');
            request.input('improvementPlan', sql.NVarChar(sql.MAX), updates.improvementPlan);
        }
        if (updates.expectedEffect !== undefined) {
            updateFields.push('expected_effect = @expectedEffect');
            request.input('expectedEffect', sql.NVarChar(sql.MAX), updates.expectedEffect);
        }
        if (updates.expectedAmount !== undefined) {
            updateFields.push('expected_amount = @expectedAmount');
            request.input('expectedAmount', sql.Int, updates.expectedAmount);
        }
        if (updates.deptReviewComment !== undefined) {
            updateFields.push('dept_review_comment = @deptReviewComment');
            request.input('deptReviewComment', sql.NVarChar(sql.MAX), updates.deptReviewComment);
        }
        if (updates.grade2nd !== undefined) {
            updateFields.push('grade_2nd = @grade2nd');
            request.input('grade2nd', sql.NVarChar, updates.grade2nd);
        }
        if (updates.rejectReason !== undefined) {
            updateFields.push('reject_reason = @rejectReason');
            request.input('rejectReason', sql.NVarChar(sql.MAX), updates.rejectReason);
        }
        if (updates.mileageAccrued !== undefined) {
            updateFields.push('mileage_accrued = @mileageAccrued');
            request.input('mileageAccrued', sql.Int, updates.mileageAccrued);
        }
        if (updates.score1st !== undefined) {
            updateFields.push('score_1st_data = @score1stData');
            request.input('score1stData', sql.NVarChar(sql.MAX), JSON.stringify(updates.score1st));
        }
        if (updates.aggregated1st !== undefined) {
            updateFields.push('aggregated_1st_data = @aggregated1stData');
            request.input('aggregated1stData', sql.NVarChar(sql.MAX), JSON.stringify(updates.aggregated1st));
        }
        if (updates.aggregated2nd !== undefined) {
            updateFields.push('aggregated_2nd_data = @aggregated2ndData');
            request.input('aggregated2ndData', sql.NVarChar(sql.MAX), JSON.stringify(updates.aggregated2nd));
        }
        if (updates.completionReport !== undefined) {
            updateFields.push('completion_report_data = @completionReportData');
            request.input('completionReportData', sql.NVarChar(sql.MAX), JSON.stringify(updates.completionReport));
        }
        if (updates.contributors !== undefined) {
            updateFields.push('contributors_data = @contributorsData');
            request.input('contributorsData', sql.NVarChar(sql.MAX), JSON.stringify(updates.contributors));
        }
        if (updates.executionTeamRatio !== undefined) {
            updateFields.push('execution_team_ratio = @executionTeamRatio');
            request.input('executionTeamRatio', sql.Int, updates.executionTeamRatio);
        }
        if (updates.canEditDuringReview !== undefined) {
            updateFields.push('can_edit_during_review = @canEditDuringReview');
            request.input('canEditDuringReview', sql.Bit, updates.canEditDuringReview);
        }
        if (updates.isDeleted !== undefined) {
            updateFields.push('is_deleted = @isDeleted');
            request.input('isDeleted', sql.Bit, updates.isDeleted);
        }
        if (updates.isArchived !== undefined) {
            updateFields.push('is_archived = @isArchived');
            request.input('isArchived', sql.Bit, updates.isArchived);
        }
        if (updates.isHidden !== undefined) {
            updateFields.push('is_hidden = @isHidden');
            request.input('isHidden', sql.Bit, updates.isHidden);
        }

        updateFields.push('updated_at = GETDATE()');

        if (updateFields.length > 0) {
            await request.query(`
        UPDATE proposals SET ${updateFields.join(', ')}
        WHERE id = @id
      `);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating proposal:', error);
        res.status(500).json({ error: 'Failed to update proposal' });
    }
});

// POST add review evaluation
router.post('/:id/reviews', async (req, res) => {
    try {
        const { reviewerId, reviewerName, round, scores, total, comment } = req.body;
        const proposalId = req.params.id;
        const id = uuidv4();

        const pool = await getPool();
        await pool.request()
            .input('id', sql.NVarChar, id)
            .input('proposalId', sql.NVarChar, proposalId)
            .input('reviewerId', sql.NVarChar, reviewerId)
            .input('reviewerName', sql.NVarChar, reviewerName)
            .input('round', sql.NVarChar, round)
            .input('scoresData', sql.NVarChar(sql.MAX), JSON.stringify(scores))
            .input('total', sql.Int, total)
            .input('comment', sql.NVarChar(sql.MAX), comment || null)
            .query(`
        INSERT INTO reviews (id, proposal_id, reviewer_id, reviewer_name, round, scores_data, total, comment)
        VALUES (@id, @proposalId, @reviewerId, @reviewerName, @round, @scoresData, @total, @comment)
      `);

        res.status(201).json({ id, proposalId, reviewerId, reviewerName, round, scores, total, comment, evaluatedAt: new Date().toISOString() });
    } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).json({ error: 'Failed to add review' });
    }
});

// POST add unified comment
router.post('/:id/comments', async (req, res) => {
    try {
        const { authorId, authorName, authorRole, type, parentId, content, visibility } = req.body;
        const proposalId = req.params.id;
        const id = uuidv4();

        const pool = await getPool();
        await pool.request()
            .input('id', sql.NVarChar, id)
            .input('proposalId', sql.NVarChar, proposalId)
            .input('authorId', sql.NVarChar, authorId)
            .input('authorName', sql.NVarChar, authorName)
            .input('authorRole', sql.NVarChar, authorRole)
            .input('type', sql.NVarChar, type || 'general')
            .input('parentId', sql.NVarChar, parentId || null)
            .input('content', sql.NVarChar(sql.MAX), content)
            .input('visibility', sql.NVarChar, visibility || 'public')
            .query(`
        INSERT INTO unified_comments (id, proposal_id, author_id, author_name, author_role, type, parent_id, content, visibility)
        VALUES (@id, @proposalId, @authorId, @authorName, @authorRole, @type, @parentId, @content, @visibility)
      `);

        res.status(201).json({ id, proposalId, authorId, authorName, authorRole, type, parentId, content, visibility, createdAt: new Date().toISOString() });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
});

// POST create revision
router.post('/:id/revisions', async (req, res) => {
    try {
        const { createdBy, createdByName, changeNote, snapshot } = req.body;
        const proposalId = req.params.id;
        const id = uuidv4();

        const pool = await getPool();

        // Get current version
        const versionResult = await pool.request()
            .input('proposalId', sql.NVarChar, proposalId)
            .query('SELECT ISNULL(MAX(version), 0) + 1 as nextVersion FROM proposal_revisions WHERE proposal_id = @proposalId');
        const version = versionResult.recordset[0].nextVersion;

        await pool.request()
            .input('id', sql.NVarChar, id)
            .input('proposalId', sql.NVarChar, proposalId)
            .input('version', sql.Int, version)
            .input('createdBy', sql.NVarChar, createdBy)
            .input('createdByName', sql.NVarChar, createdByName)
            .input('changeNote', sql.NVarChar(sql.MAX), changeNote || null)
            .input('snapshotData', sql.NVarChar(sql.MAX), JSON.stringify(snapshot))
            .query(`
        INSERT INTO proposal_revisions (id, proposal_id, version, created_by, created_by_name, change_note, snapshot_data)
        VALUES (@id, @proposalId, @version, @createdBy, @createdByName, @changeNote, @snapshotData)
      `);

        // Update proposal version
        await pool.request()
            .input('proposalId', sql.NVarChar, proposalId)
            .input('version', sql.Int, version)
            .query('UPDATE proposals SET current_version = @version WHERE id = @proposalId');

        res.status(201).json({ id, proposalId, version, createdBy, createdByName, changeNote, snapshot, createdAt: new Date().toISOString() });
    } catch (error) {
        console.error('Error creating revision:', error);
        res.status(500).json({ error: 'Failed to create revision' });
    }
});

// POST create supplement request
router.post('/:id/supplements', async (req, res) => {
    try {
        const { requestedBy, requestedByName, deadline, reason } = req.body;
        const proposalId = req.params.id;
        const id = uuidv4();

        const pool = await getPool();
        await pool.request()
            .input('id', sql.NVarChar, id)
            .input('proposalId', sql.NVarChar, proposalId)
            .input('requestedBy', sql.NVarChar, requestedBy)
            .input('requestedByName', sql.NVarChar, requestedByName)
            .input('deadline', sql.NVarChar, deadline)
            .input('reason', sql.NVarChar(sql.MAX), reason)
            .query(`
        INSERT INTO supplement_requests (id, proposal_id, requested_by, requested_by_name, deadline, reason, status)
        VALUES (@id, @proposalId, @requestedBy, @requestedByName, @deadline, @reason, 'pending')
      `);

        // Update proposal to allow editing
        await pool.request()
            .input('proposalId', sql.NVarChar, proposalId)
            .query('UPDATE proposals SET can_edit_during_review = 1 WHERE id = @proposalId');

        res.status(201).json({ id, proposalId, requestedBy, requestedByName, deadline, reason, status: 'pending', requestedAt: new Date().toISOString() });
    } catch (error) {
        console.error('Error creating supplement request:', error);
        res.status(500).json({ error: 'Failed to create supplement request' });
    }
});

// DELETE proposal (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const { reason, deletedBy } = req.body;

        const pool = await getPool();
        await pool.request()
            .input('id', sql.NVarChar, req.params.id)
            .input('reason', sql.NVarChar(sql.MAX), reason || null)
            .input('deletedBy', sql.NVarChar, deletedBy || null)
            .query(`
        UPDATE proposals SET 
          is_deleted = 1, 
          deleted_at = GETDATE(),
          deleted_by = @deletedBy,
          deleted_reason = @reason
        WHERE id = @id
      `);

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting proposal:', error);
        res.status(500).json({ error: 'Failed to delete proposal' });
    }
});

export default router;
