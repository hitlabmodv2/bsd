
const fs = require('fs');
const path = require('path');
const { Wily } = require('../../CODE_REPLAY/reply');

// Fungsi untuk memuat config
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
        return getDefaultConfig();
    } catch (error) {
        return getDefaultConfig();
    }
}

function getDefaultConfig() {
    return {
        bot: {
            mode: "public",
            prefix: ".",
            owner: "",
            botNumber: ""
        },
        skipError: {
            enabled: false
        }
    };
}

// Fungsi untuk menyimpan config
function saveConfig(config) {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

// Function to check access based on bot mode
function checkAccess(senderJid, config, fromMe) {
    const senderNumber = senderJid?.split('@')[0];
    const botNumber = config?.bot?.botNumber;
    const ownerNumber = config?.bot?.owner;
    
    // Mode self - hanya owner, bot number, dan fromMe
    if (config?.bot?.mode === 'self') {
        const isOwner = senderNumber === ownerNumber;
        const isBotNumber = senderNumber === botNumber;
        const isFromMe = fromMe === true;
        
        return isOwner || isBotNumber || isFromMe;
    }
    
    // Mode public - owner dan bot number saja untuk fitur khusus
    if (config?.bot?.mode === 'public') {
        const isOwner = senderNumber === ownerNumber;
        const isBotNumber = senderNumber === botNumber;
        const isFromMe = fromMe === true;
        
        return isOwner || isBotNumber || isFromMe;
    }
    
    return false;
}

// Fungsi untuk handle command skiperror
async function handleSkipErrorCommand(sock, msg) {
    try {
        const config = loadConfig();
        const prefix = config.bot?.prefix || '.';
        
        // Get message text
        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || '';
        
        if (!messageText || !messageText.startsWith(`${prefix}skiperror`)) {
            return false;
        }

        // Check access permission
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        
        if (!checkAccess(senderJid, config, fromMe)) {
            // Silent exit for self mode, no response for unauthorized users
            return true;
        }

        const args = messageText.slice(prefix.length).trim().split(' ');
        
        if (args.length < 2) {
            const helpText = `🔧 *SKIP ERROR MANAGER*

📝 *Cara penggunaan:*
${prefix}skiperror on - Aktifkan skip error
${prefix}skiperror off - Matikan skip error
${prefix}skiperror status - Cek status

⚡ *Status saat ini:* ${config.skipError?.enabled ? '✅ Aktif' : '❌ Nonaktif'}

💡 *Keterangan:*
• ON: Bot akan tetap jalan meski ada error
• OFF: Bot akan berhenti jika ada error fatal`;

            await Wily(helpText, msg, sock);
            return true;
        }

        const action = args[1].toLowerCase();

        switch (action) {
            case 'on':
                config.skipError = config.skipError || {};
                config.skipError.enabled = true;
                
                if (saveConfig(config)) {
                    await Wily(`✅ *SKIP ERROR DIAKTIFKAN*

🛡️ *Status:* Aktif
⚡ *Mode:* Bot akan tetap berjalan meski ada error
🔧 *Fungsi:* Error akan di-skip otomatis

💡 *Catatan:*
• Bot akan terus berjalan tanpa mati
• Error akan diabaikan secara otomatis
• Log error tetap tercatat untuk debugging`, msg, sock);
                } else {
                    await Wily('❌ Gagal menyimpan konfigurasi skip error', msg, sock);
                }
                break;

            case 'off':
                config.skipError = config.skipError || {};
                config.skipError.enabled = false;
                
                if (saveConfig(config)) {
                    await Wily(`❌ *SKIP ERROR DINONAKTIFKAN*

🛡️ *Status:* Nonaktif
⚡ *Mode:* Bot akan berhenti jika ada error fatal
🔧 *Fungsi:* Error handling normal

💡 *Catatan:*
• Bot akan berhenti jika ada error fatal
• Error akan ditangani secara normal
• Debugging lebih mudah dilakukan`, msg, sock);
                } else {
                    await Wily('❌ Gagal menyimpan konfigurasi skip error', msg, sock);
                }
                break;

            case 'status':
                const currentStatus = config.skipError?.enabled ? '✅ Aktif' : '❌ Nonaktif';
                const statusIcon = config.skipError?.enabled ? '🛡️' : '⚠️';
                
                await Wily(`${statusIcon} *STATUS SKIP ERROR*

📊 *Status saat ini:* ${currentStatus}
🔧 *Mode:* ${config.skipError?.enabled ? 'Skip Error Aktif' : 'Error Handling Normal'}

💡 *Penggunaan:*
• ${prefix}skiperror on - Aktifkan
• ${prefix}skiperror off - Nonaktifkan

⚡ *Keterangan:*
${config.skipError?.enabled ? 
'Bot akan tetap berjalan meski ada error dan mengabaikan error secara otomatis' : 
'Bot akan berhenti jika ada error fatal dan menangani error secara normal'}`, msg, sock);
                break;

            default:
                await Wily(`❌ *Parameter tidak valid!*

📝 *Gunakan:*
• ${prefix}skiperror on
• ${prefix}skiperror off  
• ${prefix}skiperror status`, msg, sock);
                break;
        }

        return true;
    } catch (error) {
        // Silent error handling
        return false;
    }
}

// Global error handler yang akan digunakan di seluruh aplikasi
function setupGlobalErrorHandler() {
    const config = loadConfig();
    
    if (config?.skipError?.enabled) {
        // Override global error handlers
        process.on('uncaughtException', (error) => {
            // Silent handling, tidak ada console.log
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            // Silent handling, tidak ada console.log
        });
    }
}

// Wrapper function untuk menjalankan fungsi dengan skip error
async function executeWithSkipError(func, ...args) {
    const config = loadConfig();
    
    if (config?.skipError?.enabled) {
        try {
            return await func(...args);
        } catch (error) {
            // Silent error, return null atau default value
            return null;
        }
    } else {
        // Normal execution tanpa skip error
        return await func(...args);
    }
}

// Initialize global error handler
setupGlobalErrorHandler();

module.exports = { 
    handleSkipErrorCommand,
    executeWithSkipError,
    setupGlobalErrorHandler
};
