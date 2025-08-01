
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { Wily } = require('../../CODE_REPLAY/reply');

// Load config function
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Check access permission based on bot mode
function checkAccess(senderNumber, config) {
    if (!config || !config.bot) return false;

    const botMode = config.bot.mode || 'self';
    const ownerNumber = config.bot.owner || '';
    const botNumber = config.bot.botNumber || '';

    // Remove @s.whatsapp.net if present
    const cleanSender = senderNumber.replace('@s.whatsapp.net', '');
    const cleanOwner = ownerNumber.replace('@s.whatsapp.net', '');
    const cleanBot = botNumber.replace('@s.whatsapp.net', '');

    if (botMode === 'self') {
        // Only owner and bot number can use
        return cleanSender === cleanOwner || cleanSender === cleanBot;
    } else if (botMode === 'public') {
        // Everyone can use
        return true;
    }

    return false;
}

// Function to clean up temporary files
function cleanupTempFiles() {
    try {
        const tempPath = './temp';
        if (fs.existsSync(tempPath)) {
            const files = fs.readdirSync(tempPath);
            files.forEach(file => {
                if (file.endsWith('.zip')) {
                    const filePath = path.join(tempPath, file);
                    const stats = fs.statSync(filePath);
                    const fileAge = Date.now() - stats.mtime.getTime();

                    // Delete files older than 1 hour
                    if (fileAge > 3600000) {
                        fs.unlinkSync(filePath);
                    }
                }
            });
        }
    } catch (error) {
        // Silent error handling
    }
}

// Create ZIP backup of session folder - FIXED VERSION
async function createSessionZip() {
    return new Promise((resolve, reject) => {
        const sessionPath = './sesi';
        const tempPath = './temp';

        // Create temp directory if it doesn't exist
        if (!fs.existsSync(tempPath)) {
            fs.mkdirSync(tempPath, { recursive: true });
        }

        const now = new Date();
        const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
        const timestamp = jakartaTime.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
        const zipFileName = `session_backup_${timestamp}.zip`;
        const zipPath = path.join(tempPath, zipFileName);

        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 6 },
            gzip: false,
            statConcurrency: 1
        });

        // Extended timeout for better reliability
        const timeout = setTimeout(() => {
            archive.abort();
            reject(new Error('Backup timeout - process took too long'));
        }, 180000); // 3 minutes timeout

        output.on('close', () => {
            clearTimeout(timeout);
            resolve({
                path: zipPath,
                filename: zipFileName,
                size: archive.pointer()
            });
        });

        archive.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });

        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                // Silent warning
            } else {
                clearTimeout(timeout);
                reject(err);
            }
        });

        archive.pipe(output);

        // Add session files with proper filtering
        if (fs.existsSync(sessionPath)) {
            const sessionFiles = fs.readdirSync(sessionPath);

            sessionFiles.forEach(file => {
                const filePath = path.join(sessionPath, file);

                try {
                    const stats = fs.statSync(filePath);

                    if (stats.isFile()) {
                        // Include essential files
                        if (file === 'creds.json' || 
                            file.startsWith('pre-key') ||
                            file.startsWith('sender-key') ||
                            file.startsWith('app-state')) {
                            archive.file(filePath, { name: `sesi/${file}` });
                        }
                    }
                } catch (fileError) {
                    // Skip problematic files silently
                }
            });
        }

        // Add config.json if exists
        if (fs.existsSync('./config.json')) {
            archive.file('./config.json', { name: 'config.json' });
        }

        // Finalize the archive
        archive.finalize();
    });
}

// Get session statistics
function getSessionStats() {
    const sessionPath = './sesi';
    if (!fs.existsSync(sessionPath)) {
        return { totalFiles: 0, totalFolders: 1, totalSize: 0, fileTypes: {} };
    }

    const files = fs.readdirSync(sessionPath);
    let totalSize = 0;
    const fileTypes = {};

    files.forEach(file => {
        try {
            const filePath = path.join(sessionPath, file);
            const stats = fs.statSync(filePath);
            totalSize += stats.size;

            const ext = path.extname(file).toLowerCase() || 'no-ext';
            fileTypes[ext] = (fileTypes[ext] || 0) + 1;
        } catch (error) {
            // Skip problematic files
        }
    });

    return {
        totalFiles: files.length,
        totalFolders: 1, // sesi folder
        totalSize: totalSize,
        fileTypes: fileTypes
    };
}

async function sendSessionBackup(client, msg) {
    try {
        const config = loadConfig();
        if (!config) {
            return;
        }

        // Get sender number
        const senderNumber = msg.key.participant || msg.key.remoteJid;
        const cleanSender = senderNumber.replace('@s.whatsapp.net', '');

        // Check access permission
        if (!checkAccess(senderNumber, config)) {
            return; // No response for unauthorized users
        }

        // Check bot connection status
        if (!client || !client.user) {
            const connectionError = `╭━━━『 ❌ BOT CONNECTION ERROR 』━━━❀
┃ 
┃ ❌ *Bot tidak terhubung dengan baik!*
┃ 
┃ 🔍 *Status:* Bot offline atau koneksi bermasalah
┃ ⚠️  *Solusi:* Tunggu bot reconnect atau restart
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀`;

            return await Wily(connectionError, msg, client);
        }

        // Check if session directory exists
        const sessionPath = './sesi';
        if (!fs.existsSync(sessionPath)) {
            const errorMessage = `╭━━━『 ❌ BACKUP SESSION GAGAL 』━━━❀
┃ 
┃ ❌ *Folder Session Tidak Ditemukan!*
┃ 
┃ 📂 *Path:* ./sesi/
┃ ⚠️  *Status:* Session belum tersedia atau terhapus
┃ 
┃ 💡 *Solusi:*
┃ ▫️ Pastikan bot sudah login
┃ ▫️ Coba restart bot jika perlu
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀`;

            return await Wily(errorMessage, msg, client);
        }

        // Send processing message using Wily
        const processingMsg = `╭━━━『 🔄 MEMPROSES BACKUP 』━━━❀
┃ 
┃ ⏳ *Sedang Membuat Backup ZIP...*
┃ 
┃ 🔧 *Proses:*
┃ ▫️ Mengumpulkan file session... 📂
┃ ▫️ Kompresi optimized (level 6) 🗜️
┃ ▫️ Filtering file penting saja ⚡
┃ ▫️ Mempersiapkan pengiriman 📤
┃ 
┃ ⚡ *Estimasi: 60-180 detik*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀`;

        await Wily(processingMsg, msg, client);

        // Get target number from config
        const targetNumber = config.backupTarget || config.bot.owner || '6289688206739';
        const targetJid = targetNumber.includes('@') ? targetNumber : `${targetNumber}@s.whatsapp.net`;

        // Get session statistics
        const sessionStats = getSessionStats();

        // Create ZIP backup with better error handling
        let zipInfo;
        try {
            zipInfo = await createSessionZip();
        } catch (zipError) {
            const zipErrorMsg = `╭━━━『 ❌ BACKUP SESSION GAGAL 』━━━❀
┃ 
┃ ❌ *Gagal membuat ZIP backup!*
┃ 
┃ 🔍 *Detail Error:*
┃ ▫️ ${zipError.message}
┃ 
┃ 💡 *Solusi:*
┃ ▫️ Coba lagi dalam beberapa saat
┃ ▫️ Pastikan ada ruang disk yang cukup
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀`;

            return await Wily(zipErrorMsg, msg, client);
        }

        // Get current time info
        const now = new Date();
        const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));

        const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                           'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

        const dayName = dayNames[jakartaTime.getDay()];
        const date = jakartaTime.getDate();
        const monthName = monthNames[jakartaTime.getMonth()];
        const year = jakartaTime.getFullYear();
        const time = jakartaTime.toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit',
            timeZone: 'Asia/Jakarta' 
        });

        // Sensor number function
        function sensorNumber(number) {
            const clean = number.replace('@s.whatsapp.net', '');
            if (clean.length < 6) return clean;
            const start = clean.substring(0, 6);
            const end = clean.substring(clean.length - 3);
            return `${start}***${end}`;
        }

        // Format file size
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        // Caption for the ZIP file (without filename display)
        const zipCaption = `╭━━━『 📦 WhatsApp Bot Session Backup 』━━━❀
┃ 
┃ 🤖 *Bot Session ZIP Backup*
┃ 
┃ 📅 *Backup Info*
┃ ▫️ Tanggal: ${dayName}, ${date} ${monthName} ${year}
┃ ▫️ Waktu: ${time} WIB 🇮🇩
┃ ▫️ Size: ${formatFileSize(zipInfo.size)}
┃ 
┃ 📊 *Contents*
┃ ▫️ Session Files: ${sessionStats.totalFiles} files
┃ ▫️ Session Folders: ${sessionStats.totalFolders} folder
┃ ▫️ Config File: ✅ Included
┃ ▫️ Total Data: ${formatFileSize(sessionStats.totalSize)}
┃ ▫️ Compression: Maximum Level
┃ 
┃ 🔐 *Security*
┃ ▫️ Requester: ${sensorNumber(cleanSender)}
┃ ▫️ Bot Mode: ${config.bot.mode.toUpperCase()}
┃ ▫️ Bot Number: ${sensorNumber(config.bot.botNumber)}
┃ ▫️ Authorization: ✅ Verified
┃ 
┃ ⚠️  *PENTING:*
┃ ▫️ File ini berisi data sensitif bot
┃ ▫️ Simpan dengan aman dan jangan bagikan
┃ ▫️ Gunakan untuk restore session
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

🔒 *Backup Session ZIP - Handle with Care!*`;

        // Send ZIP file with improved retry mechanism
        let zipSent = false;
        let retryCount = 0;
        const maxRetries = 3;

        while (!zipSent && retryCount < maxRetries) {
            try {
                retryCount++;

                // Check file size
                const fileSizeBytes = zipInfo.size;
                const fileSizeMB = fileSizeBytes / (1024 * 1024);

                if (fileSizeMB > 100) {
                    throw new Error(`File terlalu besar: ${fileSizeMB.toFixed(2)}MB (Maksimal 100MB)`);
                }

                // Check if file still exists
                if (!fs.existsSync(zipInfo.path)) {
                    throw new Error('ZIP file tidak ditemukan atau sudah terhapus');
                }

                await client.sendMessage(targetJid, {
                    document: fs.readFileSync(zipInfo.path),
                    fileName: zipInfo.filename,
                    mimetype: 'application/zip',
                    caption: zipCaption
                }, {
                    timeout: 180000 // 3 minutes timeout
                });

                zipSent = true;

            } catch (sendError) {
                if (retryCount >= maxRetries) {
                    throw new Error(`Gagal mengirim ZIP setelah ${maxRetries} percobaan: ${sendError.message}`);
                }

                // Wait before retry with exponential backoff
                const delay = Math.min(10000 * retryCount, 30000); // Max 30 seconds
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        // Create success message using Wily
        const successMessage = `╭━━━『 📦 SESSION BACKUP BERHASIL 』━━━❀
┃ 
┃ ✅ *ZIP Backup Berhasil Dikirim!*
┃ 
┃ 📅 *Informasi Waktu*
┃ ▫️ Tanggal: ${dayName}, ${date} ${monthName} ${year}
┃ ▫️ Waktu: ${time} WIB 🇮🇩
┃ ▫️ Timezone: Asia/Jakarta
┃ 
┃ 📦 *Detail ZIP Backup*
┃ ▫️ ZIP Size: ${formatFileSize(zipInfo.size)}
┃ ▫️ Compression: ✅ Level 6
┃ ▫️ Contents: Session + Config
┃ 
┃ 📤 *Target Backup*
┃ ▫️ Tujuan: ${sensorNumber(targetNumber)}
┃ ▫️ Status: Terkirim ✅
┃ ▫️ Format: ZIP Archive 📦
┃ 
┃ 📊 *Statistik Session*
┃ ▫️ Total File: ${sessionStats.totalFiles} file
┃ ▫️ Total Folder: ${sessionStats.totalFolders} folder
┃ ▫️ Total Size: ${formatFileSize(sessionStats.totalSize)}
┃ ▫️ JSON Files: ${sessionStats.fileTypes['.json'] || 0}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

🚀 *ZIP backup berhasil dikirim ke ${sensorNumber(targetNumber)}!*`;

        // Send confirmation to requester using Wily
        await Wily(successMessage, msg, client);

        // Clean up temporary ZIP file after successful send
        setTimeout(() => {
            try {
                if (fs.existsSync(zipInfo.path)) {
                    fs.unlinkSync(zipInfo.path);
                }
            } catch (cleanupError) {
                // Silent cleanup error
            }
        }, 60000); // 1 minute delay to ensure file was sent

    } catch (error) {
        const errorMessage = `╭━━━『 ❌ BACKUP SESSION GAGAL 』━━━❀
┃ 
┃ ❌ *Terjadi Kesalahan!*
┃ 
┃ 🔍 *Detail Error:*
┃ ▫️ ${error.message || 'Unknown error'}
┃ 
┃ 💡 *Solusi:*
┃ ▫️ Periksa koneksi internet
┃ ▫️ Pastikan folder session ada
┃ ▫️ Coba lagi dalam beberapa saat
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀`;

        try {
            await Wily(errorMessage, msg, client);
        } catch (replyError) {
            // Silent error
        }
    }
}

function handleBackupCommand(client, msg) {
    const config = loadConfig();
    if (!config) return;

    const senderNumber = msg.key.participant || msg.key.remoteJid;

    // Check access permission first
    if (!checkAccess(senderNumber, config)) {
        return; // No response for unauthorized users
    }

    const messageText = msg.message?.conversation?.toLowerCase() || 
                       msg.message?.extendedTextMessage?.text?.toLowerCase() || '';

    // Check for backup commands
    if (messageText === '.backupsesi' || messageText === '.backup' || messageText === '.getsesi') {
        // Clean up old temp files first
        cleanupTempFiles();
        sendSessionBackup(client, msg);
    }

    // Add command to manually clean temp files
    if (messageText === '.cleantemp' || messageText === '.cleanbkp') {
        cleanupTempFiles();

        const cleanupMsg = `╭━━━『 🧹 CLEANUP TEMP FILES 』━━━❀
┃ 
┃ ✅ *Pembersihan Berhasil!*
┃ 
┃ 📂 *Target:* ./temp/*.zip
┃ 🗑️ *Status:* File temporary dibersihkan
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀`;

        Wily(cleanupMsg, msg, client);
    }
}

module.exports = {
    sendSessionBackup,
    handleBackupCommand
};
