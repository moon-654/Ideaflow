import { Router } from 'express';
import sql from 'mssql';
import { getPool } from '../config/database';

const router = Router();

// Get all system logs
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT * FROM system_logs 
            ORDER BY timestamp DESC
        `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({ error: 'Failed to get logs' });
    }
});

// Get logs by level (Info, Warning, Error)
router.get('/level/:level', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('level', sql.NVarChar, req.params.level)
            .query(`
                SELECT * FROM system_logs 
                WHERE level = @level
                ORDER BY timestamp DESC
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Get logs by level error:', error);
        res.status(500).json({ error: 'Failed to get logs' });
    }
});

// Create log entry
router.post('/', async (req, res) => {
    try {
        const { id, user, action, details, level } = req.body;
        const pool = await getPool();

        await pool.request()
            .input('id', sql.NVarChar, id)
            .input('user', sql.NVarChar, user)
            .input('action', sql.NVarChar, action)
            .input('details', sql.NVarChar, details)
            .input('level', sql.NVarChar, level || 'Info')
            .query(`
                INSERT INTO system_logs (id, [user], action, details, level, timestamp)
                VALUES (@id, @user, @action, @details, @level, GETDATE())
            `);

        res.status(201).json({ success: true, id });
    } catch (error) {
        console.error('Create log error:', error);
        res.status(500).json({ error: 'Failed to create log' });
    }
});

// Delete old logs (cleanup)
router.delete('/cleanup/:days', async (req, res) => {
    try {
        const days = parseInt(req.params.days) || 30;
        const pool = await getPool();

        const result = await pool.request()
            .input('days', sql.Int, days)
            .query(`
                DELETE FROM system_logs 
                WHERE timestamp < DATEADD(day, -@days, GETDATE())
            `);

        res.json({ success: true, deletedCount: result.rowsAffected[0] });
    } catch (error) {
        console.error('Cleanup logs error:', error);
        res.status(500).json({ error: 'Failed to cleanup logs' });
    }
});

export default router;
