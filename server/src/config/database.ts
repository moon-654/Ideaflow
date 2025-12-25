import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const config: sql.config = {
    server: process.env.DB_SERVER || '(local)\\SQLEXPRESS',
    database: process.env.DB_NAME || 'IdeaFlowDB',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    options: {
        encrypt: false, // For local development
        trustServerCertificate: true, // For self-signed certs
        enableArithAbort: true,
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
    },
};

let pool: sql.ConnectionPool | null = null;

export async function getPool(): Promise<sql.ConnectionPool> {
    if (!pool) {
        pool = await sql.connect(config);
        console.log('✅ Connected to SQL Server');
    }
    return pool;
}

export async function closePool(): Promise<void> {
    if (pool) {
        await pool.close();
        pool = null;
        console.log('❌ SQL Server connection closed');
    }
}

export { sql };
