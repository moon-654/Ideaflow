import { Router } from 'express';
import { getPool, sql } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// GET all departments
router.get('/', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
      SELECT id, name, manager_id as managerId
      FROM departments
      ORDER BY name
    `);
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching departments:', error);
        res.status(500).json({ error: 'Failed to fetch departments' });
    }
});

// POST create department
router.post('/', async (req, res) => {
    try {
        const { name, managerId } = req.body;
        const id = uuidv4();

        const pool = await getPool();
        await pool.request()
            .input('id', sql.NVarChar, id)
            .input('name', sql.NVarChar, name)
            .input('managerId', sql.NVarChar, managerId || null)
            .query(`
        INSERT INTO departments (id, name, manager_id)
        VALUES (@id, @name, @managerId)
      `);

        res.status(201).json({ id, name, managerId });
    } catch (error) {
        console.error('Error creating department:', error);
        res.status(500).json({ error: 'Failed to create department' });
    }
});

// DELETE department
router.delete('/:id', async (req, res) => {
    try {
        const pool = await getPool();
        await pool.request()
            .input('id', sql.NVarChar, req.params.id)
            .query('DELETE FROM departments WHERE id = @id');

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting department:', error);
        res.status(500).json({ error: 'Failed to delete department' });
    }
});

export default router;
