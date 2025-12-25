import { Router } from 'express';
import sql from 'mssql';
import { getPool } from '../config/database';

const router = Router();

// Get all notifications
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT * FROM notifications 
            ORDER BY created_at DESC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
});

// Get notifications by user
router.get('/user/:userId', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('userId', sql.NVarChar, req.params.userId)
            .query(`
                SELECT * FROM notifications 
                WHERE user_id = @userId
                ORDER BY created_at DESC
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Get user notifications error:', error);
        res.status(500).json({ error: 'Failed to get user notifications' });
    }
});

// Create notification
router.post('/', async (req, res) => {
    try {
        const { id, userId, type, title, message, proposalId, proposalNumber, actionUrl } = req.body;
        const pool = await getPool();

        await pool.request()
            .input('id', sql.NVarChar, id)
            .input('userId', sql.NVarChar, userId)
            .input('type', sql.NVarChar, type)
            .input('title', sql.NVarChar, title)
            .input('message', sql.NVarChar, message)
            .input('proposalId', sql.NVarChar, proposalId || null)
            .input('proposalNumber', sql.NVarChar, proposalNumber || null)
            .input('actionUrl', sql.NVarChar, actionUrl || null)
            .query(`
                INSERT INTO notifications (id, user_id, type, title, message, proposal_id, proposal_number, action_url, is_read, created_at)
                VALUES (@id, @userId, @type, @title, @message, @proposalId, @proposalNumber, @actionUrl, 0, GETDATE())
            `);

        res.status(201).json({ success: true, id });
    } catch (error) {
        console.error('Create notification error:', error);
        res.status(500).json({ error: 'Failed to create notification' });
    }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.NVarChar, req.params.id)
            .query(`UPDATE notifications SET is_read = 1 WHERE id = @id`);

        res.json({ success: true });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});

// Mark all notifications as read for a user
router.put('/user/:userId/read-all', async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('userId', sql.NVarChar, req.params.userId)
            .query(`UPDATE notifications SET is_read = 1 WHERE user_id = @userId`);

        res.json({ success: true });
    } catch (error) {
        console.error('Mark all notifications read error:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
});

// Delete notification
router.delete('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.NVarChar, req.params.id)
            .query(`DELETE FROM notifications WHERE id = @id`);

        res.json({ success: true });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});

export default router;
