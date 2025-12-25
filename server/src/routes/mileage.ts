import { Router } from 'express';
import { getPool, sql } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET all mileage logs
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
      SELECT 
        id, user_id as userId, user_name as userName, department,
        proposal_id as proposalId, proposal_title as proposalTitle,
        type, points, date, status, description, batch_id as batchId
      FROM mileage_logs
      ORDER BY date DESC
    `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching mileage logs:', error);
        res.status(500).json({ error: 'Failed to fetch mileage logs' });
    }
});

// GET mileage logs by user
router.get('/user/:userId', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('userId', sql.NVarChar, req.params.userId)
            .query(`
        SELECT 
          id, user_id as userId, user_name as userName, department,
          proposal_id as proposalId, proposal_title as proposalTitle,
          type, points, date, status, description, batch_id as batchId
        FROM mileage_logs
        WHERE user_id = @userId
        ORDER BY date DESC
      `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching user mileage:', error);
        res.status(500).json({ error: 'Failed to fetch user mileage' });
    }
});

// POST create mileage log
router.post('/', async (req, res) => {
    try {
        const { userId, userName, department, proposalId, proposalTitle, type, points, description } = req.body;
        const id = uuidv4();
        const date = new Date().toISOString();

        const pool = await getPool();
        await pool.request()
            .input('id', sql.NVarChar, id)
            .input('userId', sql.NVarChar, userId)
            .input('userName', sql.NVarChar, userName)
            .input('department', sql.NVarChar, department)
            .input('proposalId', sql.NVarChar, proposalId || null)
            .input('proposalTitle', sql.NVarChar, proposalTitle || null)
            .input('type', sql.NVarChar, type)
            .input('points', sql.Int, points)
            .input('date', sql.NVarChar, date)
            .input('description', sql.NVarChar, description || null)
            .query(`
        INSERT INTO mileage_logs (id, user_id, user_name, department, proposal_id, proposal_title, type, points, date, status, description)
        VALUES (@id, @userId, @userName, @department, @proposalId, @proposalTitle, @type, @points, @date, 'Accrued', @description)
      `);

        res.status(201).json({ id, userId, userName, department, proposalId, proposalTitle, type, points, date, status: 'Accrued', description });
    } catch (error) {
        console.error('Error creating mileage log:', error);
        res.status(500).json({ error: 'Failed to create mileage log' });
    }
});

// PUT update mileage log (for status changes like void or payout)
router.put('/:id', async (req, res) => {
    try {
        const { status, batchId } = req.body;

        const pool = await getPool();
        await pool.request()
            .input('id', sql.NVarChar, req.params.id)
            .input('status', sql.NVarChar, status)
            .input('batchId', sql.NVarChar, batchId || null)
            .query(`
        UPDATE mileage_logs SET
          status = @status,
          batch_id = @batchId
        WHERE id = @id
      `);

        res.json({ success: true });
    } catch (error) {
        console.error('Error updating mileage log:', error);
        res.status(500).json({ error: 'Failed to update mileage log' });
    }
});

// POST process payout batch
router.post('/payout', async (req, res) => {
    try {
        const { logIds, processedBy } = req.body;
        const batchId = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${uuidv4().slice(0, 4)}`;
        const processedAt = new Date().toISOString();

        const pool = await getPool();

        // Update all logs in batch
        for (const logId of logIds) {
            await pool.request()
                .input('id', sql.NVarChar, logId)
                .input('batchId', sql.NVarChar, batchId)
                .query(`
          UPDATE mileage_logs SET
            status = 'Paid',
            batch_id = @batchId
          WHERE id = @id
        `);
        }

        // Get total amount
        const result = await pool.request()
            .input('batchId', sql.NVarChar, batchId)
            .query('SELECT SUM(points) as total FROM mileage_logs WHERE batch_id = @batchId');

        res.json({
            batchId,
            processedAt,
            processedBy,
            logCount: logIds.length,
            totalAmount: result.recordset[0].total
        });
    } catch (error) {
        console.error('Error processing payout:', error);
        res.status(500).json({ error: 'Failed to process payout' });
    }
});

export default router;
