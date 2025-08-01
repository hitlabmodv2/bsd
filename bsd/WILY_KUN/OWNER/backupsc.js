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
function checkAccess(senderNumber, config, fromMe = false) {
    if (!config || !config.bot) return false;

    const botMode = config.bot.mode || 'self';
    const ownerNumber = config.bot.owner || '';
    const botNumber = config.bot.botNumber || '';

    // Remove @s.whatsapp.net if present
    const cleanSender = senderNumber.replace('@s.whatsapp.net', '');
    const cleanOwner = ownerNumber.replace('@s.whatsapp.net', '');
    const cleanBot = botNumber.replace('@s.whatsapp.net', '');

    if (botMode === 'self') {
        // Only owner and bot number can use, plus fromMe
        return fromMe || cleanSender === cleanOwner || cleanSender === cleanBot;
    } else if (botMode === 'public') {
        // Everyone can use
        return true;
    }

    return false;
}

// Create ZIP backup of source code - OPTIMIZED VERSION
async function createSourceCodeZip() {
    return new Promise((resolve, reject) => {
        const tempPath = './temp';

        // Create temp directory if it doesn't exist
        if (!fs.existsSync(tempPath)) {
            fs.mkdirSync(tempPath, { recursive: true });
        }

        // Generate version number based on existing files
        let versionNumber = 1;
        try {
            const existingFiles = fs.readdirSync(tempPath).filter(file => 
                file.startsWith('Auto_Read_Story_V') && file.endsWith('.zip')
            );

            if (existingFiles.length > 0) {
                const versions = existingFiles.map(file => {
                    const match = file.match(/V(\d+)_/);
                    return match ? parseInt(match[1]) : 0;
                });
                versionNumber = Math.max(...versions) + 1;
            }
        } catch (error) {
            // If can't read temp directory, just use version 1
        }

        const now = new Date();
        const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
        const dateStr = jakartaTime.toLocaleDateString('id-ID').replace(/\//g, '-');
        const timeStr = jakartaTime.toLocaleTimeString('id-ID', { hour12: false }).replace(/:/g, '');

        const zipFileName = `Auto_Read_Story_V${versionNumber}_${dateStr}_${timeStr}.zip`;
        const zipPath = path.join(tempPath, zipFileName);

        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 5 }, // Reduced compression for speed
            gzip: false,
            statConcurrency: 1, // Process files one at a time
            store: false // Don't store large files uncompressed
        });

        // Timeout handler
        const timeout = setTimeout(() => {
            archive.abort();
            reject(new Error('Source code backup timeout - process took too long'));
        }, 120000); // 2 minute timeout

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

        // Optimized file processing with priority-based inclusion
        const priorityFiles = ['package.json', 'config.json', 'index.js', 'Wilykun.js'];
        const priorityDirs = ['WILY_KUN', 'CODE_REPLAY', 'CODE_WARNA', 'MENU', 'EMOJI'];

        // Skip these heavy directories entirely
        const excludeDirs = ['node_modules', 'temp', 'sesi', '.git', 'coverage', 'dist', 'build', 'attached_assets'];
        const allowedExtensions = ['.js', '.json', '.md'];

        // Optimized file processing function
        const addToArchive = (currentPath, archivePath = '', depth = 0) => {
            // Limit recursion depth to prevent deep scanning
            if (depth > 10) return;

            try {
                const items = fs.readdirSync(currentPath);

                // Process priority files first
                items.forEach(item => {
                    if (priorityFiles.includes(item)) {
                        const fullPath = path.join(currentPath, item);
                        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
                            archive.file(fullPath, { name: archivePath ? path.join(archivePath, item) : item });
                        }
                    }
                });

                // Process directories and other files
                items.forEach(item => {
                    // Skip if already processed as priority file
                    if (priorityFiles.includes(item)) return;

                    const fullPath = path.join(currentPath, item);
                    const relativePath = archivePath ? path.join(archivePath, item) : item;

                    // Skip excluded directories
                    if (excludeDirs.includes(item)) return;

                    // Skip hidden files and temporary files
                    if (item.startsWith('.') || item.includes('~') || 
                        item.endsWith('.bak') || item.endsWith('.tmp') ||
                        item.endsWith('.log') || item.endsWith('.backup')) return;

                    try {
                        const stats = fs.statSync(fullPath);

                        if (stats.isDirectory()) {
                            // Only process priority directories or limit depth
                            if (priorityDirs.includes(item) || depth < 3) {
                                addToArchive(fullPath, relativePath, depth + 1);
                            }
                        } else {
                            // Only include essential file types
                            const ext = path.extname(item).toLowerCase();
                            if (allowedExtensions.includes(ext) && stats.size < 5 * 1024 * 1024) { // Max 5MB per file
                                archive.file(fullPath, { name: relativePath });
                            }
                        }
                    } catch (error) {
                        // Skip files that can't be accessed
                    }
                });
            } catch (error) {
                // Skip directories that can't be read
            }
        };

        // Start the optimized archiving process
        addToArchive('./');

        // Finalize with progress tracking
        setTimeout(() => {
            archive.finalize();
        }, 100); // Small delay to ensure all files are queued
    });
}

// Get source code statistics
function getSourceCodeStats() {
    let totalFiles = 0;
    let totalFolders = 0;
    let totalSize = 0;
    const fileTypes = {};

    const excludeDirs = ['node_modules', 'temp', 'sesi', '.git', 'coverage', 'dist', 'build', 'attached_assets'];
    const allowedExtensions = ['.js', '.json', '.md', '.txt', '.html', '.css', '.py', '.php', '.java', '.cpp', '.c', '.h'];
    const importantFiles = ['README', 'LICENSE', 'CHANGELOG', 'package.json', 'config.json'];

    const countFiles = (dirPath, relativePath = '') => {
        if (!fs.existsSync(dirPath)) return;

        const items = fs.readdirSync(dirPath);

        items.forEach(item => {
            const fullPath = path.join(dirPath, item);
            const itemRelativePath = relativePath ? path.join(relativePath, item) : item;

            try {
                const stats = fs.statSync(fullPath);

                if (stats.isDirectory()) {
                    // Skip excluded directories
                    if (!excludeDirs.includes(item) && !item.startsWith('.')) {
                        totalFolders++;
                        countFiles(fullPath, itemRelativePath);
                    }
                } else {
                    // Skip hidden files except allowed ones
                    if (item.startsWith('.')) {
                        const allowedHiddenFiles = ['.gitignore', '.gitkeep'];
                        if (!allowedHiddenFiles.includes(item)) return;
                    }

                    // Skip temporary and backup files
                    if (item.endsWith('.bak') || item.endsWith('.backup') || 
                        item.endsWith('.old') || item.endsWith('.orig') ||
                        item.includes('~') || item.startsWith('#')) {
                        return;
                    }

                    // Only count important files
                    const ext = path.extname(item).toLowerCase();
                    if (allowedExtensions.includes(ext) || 
                        importantFiles.some(name => item.toLowerCase().includes(name.toLowerCase()))) {
                        totalFiles++;
                        totalSize += stats.size;

                        const fileExt = ext || 'no-ext';
                        fileTypes[fileExt] = (fileTypes[fileExt] || 0) + 1;
                    }
                }
            } catch (error) {
                // Skip files that can't be accessed
            }
        });
    };

    countFiles('./');

    return {
        totalFiles,
        totalFolders,
        totalSize,
        fileTypes
    };
}

async function sendSourceCodeBackup(client, msg) {
    try {
        const config = loadConfig();
        if (!config) return;

        // Get sender number
        const senderNumber = msg.key.participant || msg.key.remoteJid;
        const cleanSender = senderNumber.replace('@s.whatsapp.net', '');
        const fromMe = msg.key.fromMe || false;

        // Check access permission
        if (!checkAccess(senderNumber, config, fromMe)) {
            return; // Silent return for unauthorized users
        }

        // Send processing message first using Wily
        const processingMsg = `╭━━━『 🔄 MEMPROSES BACKUP SOURCE CODE 』━━━❀
┃ 
┃ ⏳ *Sedang Membuat Backup ZIP...*
┃ 
┃ 🔧 *Proses OPTIMIZED:*
┃ ▫️ Scanning priority files... 📂
┃ ▫️ Kompresi level 5 (balanced) 🗜️
┃ ▫️ Filter ekstensi (.js/.json/.md) ⚡
┃ ▫️ Skip folder berat (node_modules) 🚀
┃ ▫️ Limit file size max 5MB 📏
┃ 
┃ ⚡ *Estimasi: 60-120 detik*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀`;

        await Wily(processingMsg, msg, client);

        // Target number for backup - using same config as Backupsesi.js
        const targetNumber = config.backupTarget || config.bot.owner || '6289688206739';
        const targetJid = targetNumber.includes('@') ? targetNumber : `${targetNumber}@s.whatsapp.net`;

        // Get source code statistics
        const sourceStats = getSourceCodeStats();

        // Create ZIP backup
        const zipInfo = await createSourceCodeZip();

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
        const zipCaption = `╭━━━『 📦 WhatsApp Bot Source Code Backup 』━━━❀
┃ 
┃ 🤖 *Bot Source Code ZIP Backup*
┃ 
┃ 📅 *Backup Info*
┃ ▫️ Tanggal: ${dayName}, ${date} ${monthName} ${year}
┃ ▫️ Waktu: ${time} WIB 🇮🇩
┃ ▫️ Size: ${formatFileSize(zipInfo.size)}
┃ 
┃ 📊 *Contents*
┃ ▫️ Source Files: ${sourceStats.totalFiles} files
┃ ▫️ Source Folders: ${sourceStats.totalFolders} folders
┃ ▫️ Config File: ✅ Included
┃ ▫️ Total Data: ${formatFileSize(sourceStats.totalSize)}
┃ ▫️ Compression: Maximum Level
┃ 
┃ 🔐 *Security*
┃ ▫️ Requester: ${sensorNumber(cleanSender)}
┃ ▫️ Bot Mode: ${config.bot.mode.toUpperCase()}
┃ ▫️ Bot Number: ${sensorNumber(config.bot.botNumber)}
┃ ▫️ Authorization: ✅ Verified
┃ ▫️ From Me: ${fromMe ? '✅ Yes' : '❌ No'}
┃ 
┃ ⚠️  *PENTING:*
┃ ▫️ File ini berisi source code bot
┃ ▫️ Simpan dengan aman dan jangan bagikan
┃ ▫️ Gunakan untuk backup/restore
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

🔒 *Backup Source Code ZIP - Handle with Care!*`;

        // Send ZIP file
        await client.sendMessage(targetJid, {
            document: fs.readFileSync(zipInfo.path),
            fileName: zipInfo.filename,
            mimetype: 'application/zip',
            caption: zipCaption
        });

        // Create success message using Wily
        const successMessage = `╭━━━『 📦 SOURCE CODE BACKUP BERHASIL 』━━━❀
┃ 
┃ ✅ *ZIP Source Code Berhasil Dikirim!*
┃ 
┃ 📅 *Informasi Waktu*
┃ ▫️ Tanggal: ${dayName}, ${date} ${monthName} ${year}
┃ ▫️ Waktu: ${time} WIB 🇮🇩
┃ ▫️ Timezone: Asia/Jakarta
┃ 
┃ 🤖 *Status Bot*
┃ ▫️ Mode: ${config.bot.mode.toUpperCase()} ${config.bot.mode === 'self' ? '🔒' : '🌐'}
┃ ▫️ Prefix: ${config.bot.prefix}
┃ ▫️ Owner: ${sensorNumber(config.bot.owner)}
┃ ▫️ Bot Number: ${sensorNumber(config.bot.botNumber)}
┃ ▫️ Status: Online ✅
┃ 
┃ 📊 *Statistik Source Code*
┃ ▫️ Total File: ${sourceStats.totalFiles} files
┃ ▫️ Total Folder: ${sourceStats.totalFolders} folders
┃ ▫️ Total Size: ${formatFileSize(sourceStats.totalSize)}
┃ ▫️ JavaScript Files: ${sourceStats.fileTypes['.js'] || 0}
┃ ▫️ JSON Files: ${sourceStats.fileTypes['.json'] || 0}
┃ ▫️ Markdown Files: ${sourceStats.fileTypes['.md'] || 0}
┃ 
┃ 📦 *Detail ZIP Backup*
┃ ▫️ ZIP Size: ${formatFileSize(zipInfo.size)}
┃ ▫️ Compression: ✅ Maximum Level
┃ ▫️ Contents: Complete Source Code
┃ 
┃ 📤 *Target Backup*
┃ ▫️ Tujuan: ${sensorNumber(targetNumber)}
┃ ▫️ Status: Terkirim ✅
┃ ▫️ Format: ZIP Archive
┃ 
┃ 🔐 *Akses Control*
┃ ▫️ Requester: ${sensorNumber(cleanSender)}
┃ ▫️ Mode: ${config.bot.mode} ${config.bot.mode === 'self' ? '(Terbatas 🔒)' : '(Publik 🌐)'}
┃ ▫️ Authorization: ✅ Verified
┃ ▫️ From Me: ${fromMe ? '✅ Yes' : '❌ No'}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

🚀 *ZIP source code berhasil dikirim ke ${sensorNumber(targetNumber)}!*`;

        // Send confirmation to requester using Wily
        await Wily(successMessage, msg, client);

        // Clean up temporary ZIP file
        setTimeout(() => {
            try {
                if (fs.existsSync(zipInfo.path)) {
                    fs.unlinkSync(zipInfo.path);
                }
            } catch (e) {
                // Silent cleanup error
            }
        }, 5000); // Delete after 5 seconds

    } catch (error) {
        const errorMessage = `╭━━━『 ❌ BACKUP SOURCE CODE GAGAL 』━━━❀
┃ 
┃ ❌ *Terjadi Kesalahan!*
┃ 
┃ 🔍 *Detail Error:*
┃ ▫️ ${error.message || 'Unknown error'}
┃ 
┃ 💡 *Solusi:*
┃ ▫️ Periksa folder source code
┃ ▫️ Pastikan ada ruang disk
┃ ▫️ Coba lagi dalam beberapa saat
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀`;

        try {
            await Wily(errorMessage, msg, client);
        } catch (e) {
            // Silent error
        }
    }
}

function handleBackupSourceCodeCommand(client, msg) {
    const config = loadConfig();
    if (!config) return;

    const senderNumber = msg.key.participant || msg.key.remoteJid;
    const fromMe = msg.key.fromMe || false;

    // Check access permission first
    if (!checkAccess(senderNumber, config, fromMe)) {
        return; // Silent return for unauthorized users
    }

    const messageText = msg.message?.conversation?.toLowerCase() || 
                       msg.message?.extendedTextMessage?.text?.toLowerCase() || '';

    // Check for backup source code commands
    if (messageText === '.backupsc' || messageText === '.backup-sc' || messageText === '.backupsource') {
        sendSourceCodeBackup(client, msg);
    }
}

async function ReplyRynzz(teks, msg, sock) {
    return await Wily(teks, msg, sock);
}

module.exports = {
    sendSourceCodeBackup,
    handleBackupSourceCodeCommand
};