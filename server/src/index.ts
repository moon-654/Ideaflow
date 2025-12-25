import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { getPool, closePool } from './config/database.js';

// Import routes
import healthRouter from './routes/health.js';
import usersRouter from './routes/users.js';
import proposalsRouter from './routes/proposals.js';
import mileageRouter from './routes/mileage.js';
import settingsRouter from './routes/settings.js';
import filesRouter from './routes/files.js';
import departmentsRouter from './routes/departments.js';
import notificationsRouter from './routes/notifications.js';
import logsRouter from './routes/logs.js';
import payoutsRouter from './routes/payouts.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files for uploads
const uploadPath = process.env.UPLOAD_PATH || 'C:\\\\IdeaFlow\\\\uploads';
app.use('/uploads', express.static(uploadPath));

// Routes
app.use('/api/health', healthRouter);
app.use('/api/users', usersRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/mileage', mileageRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/files', filesRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/payouts', payoutsRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: err.message });
});

// Start server
async function startServer() {
    try {
        // Test database connection
        await getPool();

        app.listen(PORT, () => {
            console.log(`🚀 IdeaFlow API Server running on http://localhost:${PORT}`);
            console.log(`📁 Upload path: ${uploadPath}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await closePool();
    process.exit(0);
});

startServer();
