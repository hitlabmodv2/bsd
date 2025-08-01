import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { Wily } from '../../CODE_REPLY/reply.js';

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

// Function to check if path should be excluded
function shouldExclude(itemPath, stat) {
    const basename = path.basename(itemPath);

    // Exclude hidden files and folders (starts with .)
    if (basename.startsWith('.')) {
        return true;
    }

    // Exclude sesi folder and its contents
    if (itemPath === 'sesi' || itemPath.startsWith('sesi/')) {
        return true;
    }

    // Exclude backup folders
    if (itemPath === 'DATA/BACKUPSC' || itemPath.startsWith('DATA/BACKUPSC/')) {
        return true;
    }

    if (itemPath === 'DATA/BACKUPSESI' || itemPath.startsWith('DATA/BACKUPSESI/')) {
        return true;
    }

    // Exclude node_modules
    if (itemPath === 'node_modules' || itemPath.startsWith('node_modules/')) {
        return true;
    }

    // Exclude temp folder
    if (itemPath === 'temp' || itemPath.startsWith('temp/')) {
        return true;
    }

    // Exclude package-lock.json
    if (basename === 'package-lock.json') {
        return true;
    }

    return false;
}

// Recursive function to scan and add files/folders to archive
function scanAndAddToArchive(archive, dirPath, basePath = '') {
    const items = fs.readdirSync(dirPath);
    let includedCount = 0;
    let excludedCount = 0;
    const includedItems = [];
    const excludedItems = [];

    items.forEach(item => {
        const fullPath = path.join(dirPath, item);
        const relativePath = basePath ? path.join(basePath, item) : item;
        const stat = fs.statSync(fullPath);

        // Check if should be excluded
        if (shouldExclude(relativePath, stat)) {
            excludedItems.push(relativePath);
            excludedCount++;
            return;
        }

        if (stat.isDirectory()) {
            // Add directory and scan its contents
            const subResult = scanAndAddToArchive(archive, fullPath, relativePath);
            includedCount += subResult.includedCount + 1; // +1 for the directory itself
            excludedCount += subResult.excludedCount;
            includedItems.push(relativePath + '/');
            includedItems.push(...subResult.includedItems);
            excludedItems.push(...subResult.excludedItems);
        } else {
            // Add file
            archive.file(fullPath, { name: relativePath });
            includedItems.push(relativePath);
            includedCount++;
        }
    });

    return {
        includedCount,
        excludedCount,
        includedItems,
        excludedItems
    };
}

// Create ZIP backup of source code
async function createSourceCodeZip() {
    return new Promise((resolve, reject) => {
        const backupPath = './DATA/BACKUPSC';

        // Create backup directory if it doesn't exist
        if (!fs.existsSync(backupPath)) {
            fs.mkdirSync(backupPath, { recursive: true });
        }

        // Generate version number based on existing files
        let versionNumber = 1;
        try {
            const existingFiles = fs.readdirSync(backupPath).filter(file => 
                file.startsWith('V') && file.includes('_BASE_REACTION_SW_WILY') && file.endsWith('.zip')
            );

            if (existingFiles.length > 0) {
                const versions = existingFiles.map(file => {
                    const match = file.match(/V(\d+)_BASE_REACTION_SW_WILY/);
                    return match ? parseInt(match[1]) : 0;
                });
                versionNumber = Math.max(...versions) + 1;
            }
        } catch (error) {
            // If can't read backup directory, just use version 1
        }

        const zipFileName = `V${versionNumber}_BASE_REACTION_SW_WILY.zip`;
        const zipPath = path.join(backupPath, zipFileName);

        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 5 },
            gzip: false,
            statConcurrency: 1,
            store: false
        });

        // Timeout handler
        const timeout = setTimeout(() => {
            archive.abort();
            reject(new Error('Source code backup timeout - process took too long'));
        }, 180000); // 3 minute timeout

        let scanResult = {
            includedCount: 0,
            excludedCount: 0,
            includedItems: [],
            excludedItems: []
        };

        output.on('close', () => {
            clearTimeout(timeout);
            resolve({
                path: zipPath,
                filename: zipFileName,
                size: archive.pointer(),
                includedFiles: scanResult.includedItems,
                excludedFiles: scanResult.excludedItems,
                includedCount: scanResult.includedCount,
                excludedCount: scanResult.excludedCount
            });
        });

        archive.on('error', (err) => {
            clearTimeout(timeout);
            reject(err);
        });

        archive.on('warning', (err) => {
            if (err.code === 'ENOENT') {
                // Silent warning for missing files
            } else {
                clearTimeout(timeout);
                reject(err);
            }
        });

        archive.pipe(output);

        try {
            // Scan root directory and add all files/folders except excluded ones
            scanResult = scanAndAddToArchive(archive, './', '');

            // Add root files explicitly if they're not hidden
            const rootFiles = fs.readdirSync('./');
            rootFiles.forEach(item => {
                const fullPath = `./${item}`;
                const stat = fs.statSync(fullPath);

                if (stat.isFile() && !shouldExclude(item, stat)) {
                    // Only add if not already added by scanAndAddToArchive
                    if (!scanResult.includedItems.includes(item)) {
                        archive.file(fullPath, { name: item });
                        scanResult.includedItems.push(item);
                        scanResult.includedCount++;
                    }
                }
            });

            archive.finalize();
        } catch (error) {
            clearTimeout(timeout);
            reject(error);
        }
    });
}

// Send backup to all owners
async function sendBackupToOwners(sock, zipInfo, config) {
    const owners = config.OWNER || [];
    const results = [];

    for (const ownerNumber of owners) {
        try {
            const ownerJid = `${ownerNumber}@s.whatsapp.net`;

            // Send document only with detailed caption
            await sock.sendMessage(ownerJid, {
                document: fs.readFileSync(zipInfo.path),
                fileName: zipInfo.filename,
                mimetype: 'application/zip',
                caption: `🔒 *SOURCE CODE BACKUP*\n\n📦 *File Info:*\n• Nama: ${zipInfo.filename}\n• Path: DATA/BACKUPSC/${zipInfo.filename}\n• Size: ${(zipInfo.size / 1024 / 1024).toFixed(2)} MB\n• File Terbackup: ${zipInfo.includedCount}\n• File Dikecualikan: ${zipInfo.excludedCount}\n\n⏰ Dibuat: ${new Date().toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'})}\n🚀 WilyKun Bot Backup System\n\n✅ Auto-detect semua file & folder baru\n🚫 Dikecualikan: file tersembunyi, folder sesi, folder backup\n\n💾 Backup berhasil dikirim!\n🔐 Simpan file ini dengan aman\n\n🤖 WilyKun Backup System v2.0`
            });

            results.push({ owner: ownerNumber, status: 'success' });
        } catch (error) {
            results.push({ owner: ownerNumber, status: 'failed', error: error.message });
        }
    }

    return results;
}

// Main backup command handler
async function handleBackupSourceCodeCommand(m, { hisoka, text, command }) {
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
            try {
                if (fs.existsSync('./sesi/creds.json')) {
                    const creds = JSON.parse(fs.readFileSync('./sesi/creds.json', 'utf8'));
                    if (creds.me?.id) {
                        senderNumber = creds.me.id.split(':')[0];
                    }
                }
            } catch (error) {
                senderNumber = config.OWNER[0] || "6289681008411";
            }
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
                await Wily('🚫 *Maaf, fitur ini khusus untuk Owner Bot*\n\n💡 Hanya Owner yang dapat menggunakan fitur backup source code\n\n🔒 Akses terbatas untuk menjaga keamanan bot\n\n✨ Terima kasih atas pengertiannya!', m, hisoka);
            }
            return;
        }

        await Wily('🔄 *STARTING SOURCE CODE BACKUP*\n\n⏳ Scanning all files and folders...\n📦 Auto-detecting new files/folders\n🚫 Excluding: hidden files, sesi folder\n⏱️ This may take a moment', m, hisoka);

        // Create backup zip
        const zipInfo = await createSourceCodeZip();

        // Send to all owners
        const sendResults = await sendBackupToOwners(hisoka, zipInfo, config);

        // Generate results message
        const successCount = sendResults.filter(r => r.status === 'success').length;
        const failedCount = sendResults.filter(r => r.status === 'failed').length;
        const totalOwners = config.OWNER.length;

        // Create detailed file lists with better organization
        const includedCount = zipInfo.includedCount;
        const excludedCount = zipInfo.excludedCount;

        // Organize files by folders for better display
        const organizedFiles = {};
        const rootFiles = [];

        zipInfo.includedFiles.forEach(file => {
            if (file.includes('/')) {
                const parts = file.split('/');
                const folder = parts[0];
                if (!organizedFiles[folder]) {
                    organizedFiles[folder] = [];
                }
                if (parts.length > 1 && parts[1]) {
                    organizedFiles[folder].push(parts.slice(1).join('/'));
                }
            } else {
                rootFiles.push(file);
            }
        });

        let resultMessage = `✅ *BACKUP SELESAI*\n\n`;
        resultMessage += `📦 *File Info:*\n`;
        resultMessage += `• Nama: ${zipInfo.filename}\n`;
        resultMessage += `• Path: DATA/BACKUPSC/${zipInfo.filename}\n`;
        resultMessage += `• Size: ${(zipInfo.size / 1024 / 1024).toFixed(2)} MB\n`;
        resultMessage += `• Total File Terbackup: ${includedCount}\n`;
        resultMessage += `• Total File Dikecualikan: ${excludedCount}\n\n`;

        resultMessage += `📋 *File/Folder Terbackup:*\n`;

        // Display root files first
        if (rootFiles.length > 0) {
            resultMessage += `📄 *Root Files (${rootFiles.length}):*\n`;
            rootFiles.slice(0, 5).forEach(file => {
                const emoji = file.endsWith('.js') ? '📄' : file.endsWith('.json') ? '⚙️' : file.endsWith('.md') ? '📝' : '📄';
                resultMessage += `${emoji} ${file}\n`;
            });
            if (rootFiles.length > 5) {
                resultMessage += `... dan ${rootFiles.length - 5} file lainnya\n`;
            }
            resultMessage += '\n';
        }

        // Display folders with file counts
        const folderEntries = Object.entries(organizedFiles).slice(0, 8);
        folderEntries.forEach(([folder, files]) => {
            const folderEmoji = folder === 'WILY_KUN' ? '🤖' : 
                              folder === 'DATA' ? '💾' : 
                              folder === 'lib' ? '📚' : 
                              folder === 'CODE_REPLY' ? '💬' : 
                              folder === 'MENU' ? '📋' : '📁';
            resultMessage += `${folderEmoji} *${folder}/* (${files.length} items)\n`;

            // Show first few files in folder
            files.slice(0, 3).forEach(file => {
                const fileEmoji = file.endsWith('.js') ? '📄' : 
                                file.endsWith('.json') ? '⚙️' : 
                                file.includes('/') ? '📁' : '📄';
                resultMessage += `  ${fileEmoji} ${file}\n`;
            });
            if (files.length > 3) {
                resultMessage += `  ... dan ${files.length - 3} item lainnya\n`;
            }
        });

        if (Object.keys(organizedFiles).length > 8) {
            resultMessage += `... dan ${Object.keys(organizedFiles).length - 8} folder lainnya\n`;
        }

        resultMessage += `\n🚫 *File/Folder Dikecualikan:*\n`;
        zipInfo.excludedFiles.slice(0, 10).forEach(file => {
            const emoji = file.startsWith('.') ? '🔒' : 
                         file === 'node_modules' ? '📦' : 
                         file === 'sesi' ? '🔐' : 
                         file === 'temp' ? '🗂️' : 
                         file.endsWith('.json') ? '⚙️' : '❌';
            resultMessage += `${emoji} ${file}\n`;
        });
        if (excludedCount > 10) {
            resultMessage += `... dan ${excludedCount - 10} item lainnya\n`;
        }

        resultMessage += `\n📤 *Pengiriman:*\n`;
        resultMessage += `👥 Total Owner: ${totalOwners}\n`;
        resultMessage += `✅ Berhasil: ${successCount}\n`;

        if (failedCount > 0) {
            resultMessage += `❌ Gagal: ${failedCount}\n`;
        }

        resultMessage += `\n🔍 *Auto-Detection:*\n`;
        resultMessage += `✅ Semua file & folder baru terdeteksi\n`;
        resultMessage += `🚫 File tersembunyi (.) diabaikan\n`;
        resultMessage += `🚫 Folder sesi diabaikan\n`;
        resultMessage += `🚫 Folder backup (BACKUPSC/BACKUPSESI) diabaikan\n`;
        resultMessage += `📁 Struktur folder dipertahankan\n`;

        resultMessage += `\n⏰ ${new Date().toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'})}`;
        resultMessage += `\n🚀 WilyKun Backup System v2.0`;

        await Wily(resultMessage, m, hisoka);

    } catch (error) {
        await Wily(`❌ Backup failed: ${error.message}`, m, hisoka);
    }
}

export { handleBackupSourceCodeCommand };
export const backupsc = handleBackupSourceCodeCommand;