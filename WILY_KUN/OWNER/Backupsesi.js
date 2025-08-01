
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { Wily } from '../../CODE_REPLY/reply.js';

// Fungsi untuk membaca nomor bot dari creds.json
function getBotNumber() {
    try {
        if (fs.existsSync('./sesi/creds.json')) {
            const creds = JSON.parse(fs.readFileSync('./sesi/creds.json', 'utf8'));
            if (creds.me?.id) {
                const botNumber = creds.me.id.split(':')[0];
                return botNumber;
            }
        }
        // Fallback ke config.json
        const config = loadConfig();
        const fallbackNumber = config.OWNER[0] || "6289681008411";
        return fallbackNumber;
    } catch (error) {
        return "6289681008411"; // fallback nomor bot
    }
}

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
    if (!config) return false;

    const botMode = config.mode || 'self';
    const ownerNumbers = config.OWNER || [];
    
    // Remove @s.whatsapp.net if present
    const cleanSender = senderNumber.replace('@s.whatsapp.net', '');
    
    if (botMode === 'self') {
        // Only owner and fromMe can use
        return fromMe || ownerNumbers.includes(cleanSender);
    } else if (botMode === 'public') {
        // Only owner can use this command even in public mode
        return ownerNumbers.includes(cleanSender);
    }

    return false;
}

// Function to clean up temporary files
function cleanupTempFiles() {
    try {
        const dataPath = './DATA';
        if (!fs.existsSync(dataPath)) {
            fs.mkdirSync(dataPath, { recursive: true });
        }

        const backupSesiPath = path.join(dataPath, 'BACKUPSESI');
        if (!fs.existsSync(backupSesiPath)) {
            fs.mkdirSync(backupSesiPath, { recursive: true });
        }

        // Clean old backup files (keep only last 5)
        if (fs.existsSync(backupSesiPath)) {
            const files = fs.readdirSync(backupSesiPath);
            const backupFiles = files.filter(file => file.startsWith('SESI_BACKUP_V') && file.endsWith('.zip'));
            
            if (backupFiles.length > 5) {
                // Sort by version number and keep only last 5
                backupFiles.sort((a, b) => {
                    const versionA = parseInt(a.match(/V(\d+)/)?.[1] || '0');
                    const versionB = parseInt(b.match(/V(\d+)/)?.[1] || '0');
                    return versionA - versionB;
                });

                // Delete older files
                const filesToDelete = backupFiles.slice(0, -5);
                filesToDelete.forEach(file => {
                    try {
                        fs.unlinkSync(path.join(backupSesiPath, file));
                    } catch (error) {
                        // Silent error
                    }
                });
            }
        }
    } catch (error) {
        // Silent error handling
    }
}

// Create ZIP backup of sesi folder
async function createSesiZip() {
    return new Promise((resolve, reject) => {
        const sesiPath = './sesi';
        const backupPath = './DATA/BACKUPSESI';

        // Create backup directory if it doesn't exist
        if (!fs.existsSync(backupPath)) {
            fs.mkdirSync(backupPath, { recursive: true });
        }

        // Generate version number based on existing files
        let versionNumber = 1;
        try {
            const existingFiles = fs.readdirSync(backupPath).filter(file => 
                file.startsWith('SESI_BACKUP_V') && file.endsWith('.zip')
            );

            if (existingFiles.length > 0) {
                const versions = existingFiles.map(file => {
                    const match = file.match(/V(\d+)_/);
                    return match ? parseInt(match[1]) : 0;
                });
                versionNumber = Math.max(...versions) + 1;
            }
        } catch (error) {
            // If can't read backup directory, just use version 1
        }

        const zipFileName = `SESI_BACKUP_V${versionNumber}_WILY_SESSION.zip`;
        const zipPath = path.join(backupPath, zipFileName);

        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 6 },
            gzip: false,
            statConcurrency: 1,
            store: false
        });

        // Count files for progress
        let includedFiles = [];

        // Timeout handler
        const timeout = setTimeout(() => {
            archive.abort();
            reject(new Error('Session backup timeout - process took too long'));
        }, 180000); // 3 minute timeout

        output.on('close', () => {
            clearTimeout(timeout);
            resolve({
                path: zipPath,
                filename: zipFileName,
                size: archive.pointer(),
                includedFiles: includedFiles
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

        try {
            // Add sesi files with proper filtering
            if (fs.existsSync(sesiPath)) {
                const sesiFiles = fs.readdirSync(sesiPath);

                sesiFiles.forEach(file => {
                    const filePath = path.join(sesiPath, file);

                    try {
                        const stats = fs.statSync(filePath);

                        if (stats.isFile()) {
                            // Include important session files
                            if (!file.startsWith('.') && 
                                !file.endsWith('.tmp') && 
                                !file.endsWith('.backup') &&
                                !file.includes('~')) {
                                archive.file(filePath, { name: `sesi/${file}` });
                                includedFiles.push(`sesi/${file}`);
                            }
                        } else if (stats.isDirectory()) {
                            // Include subdirectories
                            const subFiles = fs.readdirSync(filePath);
                            subFiles.forEach(subFile => {
                                const subFilePath = path.join(filePath, subFile);
                                try {
                                    const subStats = fs.statSync(subFilePath);
                                    if (subStats.isFile() && 
                                        !subFile.startsWith('.') && 
                                        !subFile.endsWith('.tmp')) {
                                        archive.file(subFilePath, { name: `sesi/${file}/${subFile}` });
                                        includedFiles.push(`sesi/${file}/${subFile}`);
                                    }
                                } catch (error) {
                                    // Skip problematic files
                                }
                            });
                        }
                    } catch (fileError) {
                        // Skip problematic files silently
                    }
                });
            }

            // Add config.json if exists
            if (fs.existsSync('./config.json')) {
                archive.file('./config.json', { name: 'config.json' });
                includedFiles.push('config.json');
            }

            archive.finalize();
        } catch (error) {
            clearTimeout(timeout);
            reject(error);
        }
    });
}

// Get session statistics
function getSesiStats() {
    const sesiPath = './sesi';
    if (!fs.existsSync(sesiPath)) {
        return { totalFiles: 0, totalFolders: 0, totalSize: 0, fileTypes: {} };
    }

    let totalFiles = 0;
    let totalFolders = 0;
    let totalSize = 0;
    const fileTypes = {};

    const countFiles = (dirPath) => {
        try {
            const items = fs.readdirSync(dirPath);
            
            items.forEach(item => {
                const itemPath = path.join(dirPath, item);
                try {
                    const stats = fs.statSync(itemPath);
                    
                    if (stats.isDirectory()) {
                        totalFolders++;
                        countFiles(itemPath);
                    } else {
                        totalFiles++;
                        totalSize += stats.size;
                        
                        const ext = path.extname(item).toLowerCase() || 'no-ext';
                        fileTypes[ext] = (fileTypes[ext] || 0) + 1;
                    }
                } catch (error) {
                    // Skip problematic files
                }
            });
        } catch (error) {
            // Skip problematic directories
        }
    };

    countFiles(sesiPath);

    return {
        totalFiles,
        totalFolders,
        totalSize,
        fileTypes
    };
}

// Send backup to all owners
async function sendBackupToOwners(sock, zipInfo, config) {
    const owners = config.OWNER || [];
    const results = [];

    for (const ownerNumber of owners) {
        try {
            const ownerJid = `${ownerNumber}@s.whatsapp.net`;
            
            // Send document
            await sock.sendMessage(ownerJid, {
                document: fs.readFileSync(zipInfo.path),
                fileName: zipInfo.filename,
                mimetype: 'application/zip',
                caption: `🔒 *SESSION BACKUP*\n\n📦 *File Info:*\n• Nama: ${zipInfo.filename}\n• Path: DATA/BACKUPSESI/${zipInfo.filename}\n• Size: ${(zipInfo.size / 1024 / 1024).toFixed(2)} MB\n• File Terbackup: ${zipInfo.includedFiles.length}\n\n⏰ Dibuat: ${new Date().toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'})}\n🚀 WilyKun Session Backup System`
            });

            results.push({ owner: ownerNumber, status: 'success' });
        } catch (error) {
            results.push({ owner: ownerNumber, status: 'failed', error: error.message });
        }
    }

    return results;
}

// Main backup command handler
async function handleBackupSesiCommand(m, { hisoka, text, command }) {
    try {
        const config = loadConfig();
        
        if (!config) {
            await Wily('❌ Config file not found', m, hisoka);
            return;
        }

        // Extract sender number
        let senderNumber = '';
        const isFromMe = m.key?.fromMe === true;

        if (isFromMe) {
            // Get bot number from creds.json
            senderNumber = getBotNumber();
        } else {
            if (m.sender) {
                senderNumber = m.sender.split('@')[0];
            } else if (m.key?.participant) {
                senderNumber = m.key.participant.split('@')[0];
            } else if (m.key?.remoteJid && !m.key.remoteJid.includes('@g.us')) {
                senderNumber = m.key.remoteJid.split('@')[0];
            }
        }

        // Check access permission
        if (!checkAccess(senderNumber, config, isFromMe)) {
            // Jika mode public, beri respon untuk non-owner
            if (config.mode === 'public' && !isFromMe) {
                await Wily('🚫 *Maaf, fitur ini khusus untuk Owner Bot*\n\n💡 Hanya Owner yang dapat menggunakan fitur backup sesi\n\n🔒 Akses terbatas untuk menjaga keamanan bot\n\n✨ Terima kasih atas pengertiannya!', m, hisoka);
            }
            return;
        }

        // Check if sesi directory exists
        const sesiPath = './sesi';
        if (!fs.existsSync(sesiPath)) {
            await Wily('❌ *FOLDER SESI TIDAK DITEMUKAN*\n\n📂 Path: ./sesi/\n⚠️ Status: Sesi belum tersedia atau terhapus\n\n💡 *Solusi:*\n• Pastikan bot sudah login\n• Coba restart bot jika perlu', m, hisoka);
            return;
        }

        await Wily('🔄 *STARTING SESSION BACKUP*\n\n⏳ Creating backup archive...\n📦 This may take a moment', m, hisoka);

        // Clean up old files first
        cleanupTempFiles();

        // Get session statistics
        const sesiStats = getSesiStats();

        // Create backup zip
        const zipInfo = await createSesiZip();

        // Send to all owners
        const sendResults = await sendBackupToOwners(hisoka, zipInfo, config);

        // Generate results message
        const successCount = sendResults.filter(r => r.status === 'success').length;
        const failedCount = sendResults.filter(r => r.status === 'failed').length;
        const totalOwners = config.OWNER.length;

        // Create detailed file lists
        const includedCount = zipInfo.includedFiles.length;
        
        // Limit displayed files to prevent message overflow
        const maxDisplayFiles = 8;
        const includedDisplay = zipInfo.includedFiles.slice(0, maxDisplayFiles);

        let resultMessage = `✅ *SESSION BACKUP SELESAI*\n\n`;
        resultMessage += `📦 *File Info:*\n`;
        resultMessage += `• Nama: ${zipInfo.filename}\n`;
        resultMessage += `• Path: DATA/BACKUPSESI/${zipInfo.filename}\n`;
        resultMessage += `• Size: ${(zipInfo.size / 1024 / 1024).toFixed(2)} MB\n`;
        resultMessage += `• Total File Terbackup: ${includedCount}\n\n`;
        
        resultMessage += `📊 *Session Statistics:*\n`;
        resultMessage += `• Total File: ${sesiStats.totalFiles} files\n`;
        resultMessage += `• Total Folder: ${sesiStats.totalFolders} folders\n`;
        resultMessage += `• Total Size: ${(sesiStats.totalSize / 1024 / 1024).toFixed(2)} MB\n`;
        resultMessage += `• JSON Files: ${sesiStats.fileTypes['.json'] || 0}\n`;
        resultMessage += `• Other Files: ${sesiStats.fileTypes['no-ext'] || 0}\n\n`;
        
        resultMessage += `📋 *File Terbackup:*\n`;
        includedDisplay.forEach(file => {
            resultMessage += `✅ ${file}\n`;
        });
        if (includedCount > maxDisplayFiles) {
            resultMessage += `... dan ${includedCount - maxDisplayFiles} file lainnya\n`;
        }
        
        resultMessage += `\n📤 *Pengiriman:*\n`;
        resultMessage += `👥 Total Owner: ${totalOwners}\n`;
        resultMessage += `✅ Berhasil: ${successCount}\n`;
        
        if (failedCount > 0) {
            resultMessage += `❌ Gagal: ${failedCount}\n`;
        }

        resultMessage += `\n⏰ ${new Date().toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'})}`;
        resultMessage += `\n🚀 WilyKun Session Backup System`;

        await Wily(resultMessage, m, hisoka);

    } catch (error) {
        await Wily(`❌ Session backup failed: ${error.message}`, m, hisoka);
    }
}

export { handleBackupSesiCommand };
export const backupsesi = handleBackupSesiCommand;
