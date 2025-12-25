import { Router } from 'express';
import sql from 'mssql';
import { getPool } from '../config/database';

const router = Router();

// Get all payout batches
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT * FROM payout_batches 
            ORDER BY processed_at DESC
        `);

        // Parse JSON fields
        const batches = result.recordset.map((batch: any) => ({
            ...batch,
            logIds: JSON.parse(batch.log_ids || '[]')
        }));

        res.json(batches);
    } catch (error) {
        console.error('Get payout batches error:', error);
        res.status(500).json({ error: 'Failed to get payout batches' });
    }
});

// Get payout batch by ID
router.get('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('id', sql.NVarChar, req.params.id)
            .query(`SELECT * FROM payout_batches WHERE id = @id`);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Payout batch not found' });
        }

        const batch = {
            ...result.recordset[0],
            logIds: JSON.parse(result.recordset[0].log_ids || '[]')
        };

        res.json(batch);
    } catch (error) {
        console.error('Get payout batch error:', error);
        res.status(500).json({ error: 'Failed to get payout batch' });
    }
});

// Create payout batch
router.post('/', async (req, res) => {
    try {
        const { id, logIds, totalAmount, processedBy } = req.body;
        const pool = await getPool();

        await pool.request()
            .input('id', sql.NVarChar, id)
            .input('logIds', sql.NVarChar, JSON.stringify(logIds))
            .input('totalAmount', sql.Int, totalAmount)
            .input('processedBy', sql.NVarChar, processedBy)
            .query(`
                INSERT INTO payout_batches (id, log_ids, total_amount, processed_by, processed_at, status)
                VALUES (@id, @logIds, @totalAmount, @processedBy, GETDATE(), 'Processed')
            `);

        res.status(201).json({ success: true, id });
    } catch (error) {
        console.error('Create payout batch error:', error);
        res.status(500).json({ error: 'Failed to create payout batch' });
    }
});

// Update payout batch status
router.put('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const pool = await getPool();

        await pool.request()
            .input('id', sql.NVarChar, req.params.id)
            .input('status', sql.NVarChar, status)
            .query(`UPDATE payout_batches SET status = @status WHERE id = @id`);

        res.json({ success: true });
    } catch (error) {
        console.error('Update payout batch error:', error);
        res.status(500).json({ error: 'Failed to update payout batch' });
    }
});

export default router;
