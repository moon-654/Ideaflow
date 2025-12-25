import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getPool, sql } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configure multer storage
const uploadPath = process.env.UPLOAD_PATH || 'C:\\IdeaFlow\\uploads';

// Ensure upload directory exists
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const proposalId = req.body.proposalId || 'general';
        const destPath = path.join(uploadPath, 'proposals', proposalId);

        if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
        }
        cb(null, destPath);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with original extension
        const ext = path.extname(file.originalname);
        const uniqueName = `${uuidv4()}${ext}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// POST upload file
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { proposalId } = req.body;
        const fileId = uuidv4();
        const relativePath = path.join('proposals', proposalId || 'general', req.file.filename);

        const pool = await getPool();
        await pool.request()
            .input('id', sql.NVarChar, fileId)
            .input('proposalId', sql.NVarChar, proposalId || null)
            .input('fileName', sql.NVarChar, req.file.originalname)
            .input('storedName', sql.NVarChar, req.file.filename)
            .input('filePath', sql.NVarChar, relativePath)
            .input('mimeType', sql.NVarChar, req.file.mimetype)
            .input('fileSize', sql.Int, req.file.size)
            .query(`
        INSERT INTO files (id, proposal_id, file_name, stored_name, file_path, mime_type, file_size)
        VALUES (@id, @proposalId, @fileName, @storedName, @filePath, @mimeType, @fileSize)
      `);

        res.status(201).json({
            id: fileId,
            fileName: req.file.originalname,
            filePath: relativePath,
            url: `/uploads/${relativePath.replace(/\\/g, '/')}`,
            size: req.file.size,
            mimeType: req.file.mimetype
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// POST upload multiple files
router.post('/upload-multiple', upload.array('files', 10), async (req, res) => {
    try {
        if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const { proposalId } = req.body;
        const pool = await getPool();
        const uploadedFiles: { id: string; fileName: string; filePath: string; url: string; size: number; mimeType: string }[] = [];

        for (const file of req.files as Express.Multer.File[]) {
            const fileId = uuidv4();
            const relativePath = path.join('proposals', proposalId || 'general', file.filename);

            await pool.request()
                .input('id', sql.NVarChar, fileId)
                .input('proposalId', sql.NVarChar, proposalId || null)
                .input('fileName', sql.NVarChar, file.originalname)
                .input('storedName', sql.NVarChar, file.filename)
                .input('filePath', sql.NVarChar, relativePath)
                .input('mimeType', sql.NVarChar, file.mimetype)
                .input('fileSize', sql.Int, file.size)
                .query(`
          INSERT INTO files (id, proposal_id, file_name, stored_name, file_path, mime_type, file_size)
          VALUES (@id, @proposalId, @fileName, @storedName, @filePath, @mimeType, @fileSize)
        `);

            uploadedFiles.push({
                id: fileId,
                fileName: file.originalname,
                filePath: relativePath,
                url: `/uploads/${relativePath.replace(/\\/g, '/')}`,
                size: file.size,
                mimeType: file.mimetype
            });
        }

        res.status(201).json(uploadedFiles);
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({ error: 'Failed to upload files' });
    }
});

// GET files by proposal ID
router.get('/proposal/:proposalId', async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request()
            .input('proposalId', sql.NVarChar, req.params.proposalId)
            .query(`
        SELECT 
          id, proposal_id as proposalId, file_name as fileName, 
          file_path as filePath, mime_type as mimeType, file_size as fileSize,
          uploaded_at as uploadedAt
        FROM files
        WHERE proposal_id = @proposalId
        ORDER BY uploaded_at DESC
      `);

        // Add URL to each file
        const files = result.recordset.map(f => ({
            ...f,
            url: `/uploads/${f.filePath.replace(/\\/g, '/')}`
        }));

        res.json(files);
    } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
});

// DELETE file
router.delete('/:id', async (req, res) => {
    try {
        const pool = await getPool();

        // Get file info first
        const result = await pool.request()
            .input('id', sql.NVarChar, req.params.id)
            .query('SELECT file_path FROM files WHERE id = @id');

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        const filePath = path.join(uploadPath, result.recordset[0].file_path);

        // Delete from DB
        await pool.request()
            .input('id', sql.NVarChar, req.params.id)
            .query('DELETE FROM files WHERE id = @id');

        // Delete physical file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
});

export default router;
