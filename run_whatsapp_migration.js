const db = require('./config/db');

async function runWhatsappMigration() {
    try {
        console.log('Running WhatsApp connections migration...');
        
        await db.query(`
            CREATE TABLE IF NOT EXISTS whatsapp_connections (
                id VARCHAR(36) PRIMARY KEY,
                clinic_id VARCHAR(100) NOT NULL UNIQUE,
                phone_number VARCHAR(30),
                status ENUM('DISCONNECTED', 'CONNECTING', 'QR_READY', 'AUTHENTICATING', 'CONNECTED', 'DISCONNECTING', 'ERROR') DEFAULT 'DISCONNECTED',
                session_data TEXT NULL,
                qr_code LONGTEXT NULL,
                last_error TEXT NULL,
                connected_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_whatsapp_clinic (clinic_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);

        console.log('✅ whatsapp_connections table created / verified successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
}

runWhatsappMigration();
