
import fs from 'fs';
import path from 'path';
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

// Fungsi untuk memuat config
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

// Fungsi untuk menyimpan config dengan auto clearsesi settings
function saveConfig(config) {
    try {
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        return false;
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

// Global variable untuk auto cleaner interval
let autoClearInterval = null;

// Class untuk mengelola auto clear sesi
class AutoClearSesi {
    constructor() {
        this.isRunning = false;
        this.interval = null;
        this.nextClearTime = null;
    }

    start(hours = 1) {
        if (this.isRunning) {
            this.stop();
        }

        const intervalMs = hours * 60 * 60 * 1000; // Convert hours to milliseconds
        this.nextClearTime = new Date(Date.now() + intervalMs);
        
        this.interval = setInterval(async () => {
            await this.performAutoClear();
            this.nextClearTime = new Date(Date.now() + intervalMs);
        }, intervalMs);

        this.isRunning = true;
        autoClearInterval = this.interval;
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        this.isRunning = false;
        this.nextClearTime = null;
        autoClearInterval = null;
    }

    async performAutoClear() {
        try {
            const result = clearSessionFiles();
            if (result.success) {
                // Log auto clear (bisa diperluas untuk notifikasi owner)
                console.log(`[AUTO CLEAR] Session cleared automatically - ${result.deletedCount} files deleted`);
            }
        } catch (error) {
            console.log(`[AUTO CLEAR ERROR] ${error.message}`);
        }
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            nextClearTime: this.nextClearTime
        };
    }
}

// Instance global auto clear
const autoClearInstance = new AutoClearSesi();

// Fungsi untuk menghapus file session selektif
function clearSessionFiles() {
    try {
        const sessionDir = './sesi';
        
        if (!fs.existsSync(sessionDir)) {
            return { success: false, message: 'Folder sesi tidak ditemukan' };
        }

        // File yang TIDAK boleh dihapus (penting untuk koneksi)
        const protectedFiles = [
            'creds.json'
        ];

        const files = fs.readdirSync(sessionDir);
        let deletedCount = 0;
        let protectedCount = 0;
        let deletedFiles = [];
        let protectedFilesList = [];
        let errorFiles = [];

        files.forEach(file => {
            const filePath = path.join(sessionDir, file);
            
            try {
                const stat = fs.statSync(filePath);

                if (stat.isFile()) {
                    if (protectedFiles.includes(file)) {
                        protectedCount++;
                        protectedFilesList.push(file);
                    } else {
                        try {
                            fs.unlinkSync(filePath);
                            deletedCount++;
                            deletedFiles.push(file);
                        } catch (error) {
                            errorFiles.push(file);
                        }
                    }
                } else if (stat.isDirectory()) {
                    // Hapus folder dan isinya
                    try {
                        fs.rmSync(filePath, { recursive: true, force: true });
                        deletedCount++;
                        deletedFiles.push(file + '/');
                    } catch (error) {
                        errorFiles.push(file + '/');
                    }
                }
            } catch (statError) {
                errorFiles.push(file);
            }
        });

        return {
            success: true,
            deletedCount,
            protectedCount,
            deletedFiles,
            protectedFilesList,
            errorFiles
        };

    } catch (error) {
        return { success: false, message: error.message };
    }
}

// Get session statistics before cleanup
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

// Fungsi untuk memvalidasi command dan arguments
function validateClearSesiCommand(args) {
    if (!args || args.length === 0) {
        return { valid: true, action: 'manual' };
    }

    const command = args[0].toLowerCase();
    
    // Cek apakah ada argumen tambahan yang tidak valid
    const checkExtraArgs = (expectedLength, commandName) => {
        if (args.length > expectedLength) {
            const extraArgs = args.slice(expectedLength).join(' ');
            return {
                valid: false,
                error: `Argumen tambahan '${extraArgs}' tidak dikenal untuk command '${commandName}'. Format yang benar: .clearsesi ${commandName}`
            };
        }
        return null;
    };
    
    switch (command) {
        case 'on':
            // Cek argumen tambahan yang tidak valid
            const onCheck = checkExtraArgs(1, 'on');
            if (onCheck) return onCheck;
            return { valid: true, action: 'enable_auto' };
        
        case 'off':
            // Cek argumen tambahan yang tidak valid
            const offCheck = checkExtraArgs(1, 'off');
            if (offCheck) return offCheck;
            return { valid: true, action: 'disable_auto' };
        
        case 'set':
            if (args.length < 2) {
                return { 
                    valid: false, 
                    error: 'Parameter waktu diperlukan untuk set command. Format: .clearsesi set [1-24]' 
                };
            }
            
            // Cek argumen tambahan yang tidak valid untuk set
            if (args.length > 2) {
                const extraArgs = args.slice(2).join(' ');
                return {
                    valid: false,
                    error: `Argumen tambahan '${extraArgs}' tidak dikenal untuk command 'set'. Format yang benar: .clearsesi set [1-24]`
                };
            }
            
            const hourInput = args[1];
            const hours = parseInt(hourInput);
            
            // Cek apakah input adalah angka
            if (isNaN(hours)) {
                return { 
                    valid: false, 
                    error: `'${hourInput}' bukan angka yang valid. Gunakan angka 1-24. Contoh: .clearsesi set 3` 
                };
            }
            
            // Cek range angka
            if (hours < 1 || hours > 24) {
                return { 
                    valid: false, 
                    error: `Waktu ${hours} jam tidak valid. Gunakan angka antara 1-24 jam. Contoh: .clearsesi set 6` 
                };
            }
            
            return { valid: true, action: 'set_time', hours };
        
        case 'status':
            // Cek argumen tambahan yang tidak valid
            const statusCheck = checkExtraArgs(1, 'status');
            if (statusCheck) return statusCheck;
            return { valid: true, action: 'status' };
        
        default:
            // Deteksi typo umum dan berikan saran
            const suggestions = {
                'enable': 'on',
                'aktif': 'on',
                'nyalakan': 'on',
                'start': 'on',
                'disable': 'off',
                'nonaktif': 'off',
                'matikan': 'off',
                'stop': 'off',
                'atur': 'set',
                'setting': 'set',
                'config': 'set',
                'info': 'status',
                'check': 'status',
                'cek': 'status'
            };
            
            let errorMsg = `Command '${command}' tidak dikenal.`;
            
            if (suggestions[command]) {
                errorMsg += ` Mungkin maksud Anda: '.clearsesi ${suggestions[command]}'?`;
            }
            
            errorMsg += `\n\n📋 Command yang tersedia:\n• .clearsesi - Manual clear session\n• .clearsesi on - Aktifkan auto clear\n• .clearsesi off - Matikan auto clear\n• .clearsesi set [1-24] - Atur waktu auto clear\n• .clearsesi status - Lihat status auto clear`;
            
            return { 
                valid: false, 
                error: errorMsg
            };
    }
}

// Main handler function
export async function handleClearSesiCommand(m, { hisoka, text, command }) {
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
                await Wily('🚫 *Maaf, fitur ini khusus untuk Owner Bot*\n\n💡 Hanya Owner yang dapat menggunakan fitur clear sesi\n\n🔒 Akses terbatas untuk menjaga keamanan bot\n\n✨ Terima kasih atas pengertiannya!', m, hisoka);
            }
            return;
        }

        // Parse and sanitize arguments
        const args = text ? text.trim().split(' ').filter(arg => arg.length > 0) : [];
        
        // Additional input sanitization
        const sanitizedArgs = args.map(arg => arg.trim().toLowerCase());
        
        const validation = validateClearSesiCommand(sanitizedArgs);

        if (!validation.valid) {
            await Wily(`╭━━━『 *❌ COMMAND ERROR* 』━━━❀
┃ 
┃ 🚫 *${validation.error}*
┃ 
┃ 📋 *Format Penggunaan:*
┃ ⌬ \`.clearsesi\` - Manual clear session
┃ ⌬ \`.clearsesi on\` - Aktifkan auto clear
┃ ⌬ \`.clearsesi off\` - Matikan auto clear  
┃ ⌬ \`.clearsesi set [1-24]\` - Atur waktu auto clear
┃ ⌬ \`.clearsesi status\` - Lihat status auto clear
┃ 
┃ 💡 *Contoh Penggunaan:*
┃ ⌬ \`.clearsesi set 3\` (auto clear setiap 3 jam)
┃ ⌬ \`.clearsesi on\` (aktifkan auto clear)
┃ 
┃ ⚠️ *Perhatian:*
┃ ⌬ Tidak boleh ada spasi atau karakter tambahan
┃ ⌬ Gunakan angka 1-24 untuk waktu
┃ ⌬ Command harus ditulis dengan benar
┃
┃ ⏰ ${new Date().toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'})}
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀`, m, hisoka);
            return;
        }

        // Pastikan config memiliki auto clearsesi settings
        if (!config.autoClearSesi) {
            config.autoClearSesi = {
                enabled: false,
                interval: 1 // default 1 jam
            };
        }

        // Handle different actions
        switch (validation.action) {
            case 'manual':
                await handleManualClear(m, hisoka, config);
                break;
            
            case 'enable_auto':
                await handleEnableAuto(m, hisoka, config);
                break;
            
            case 'disable_auto':
                await handleDisableAuto(m, hisoka, config);
                break;
            
            case 'set_time':
                await handleSetTime(m, hisoka, config, validation.hours);
                break;
            
            case 'status':
                await handleStatus(m, hisoka, config);
                break;
        }

    } catch (error) {
        await Wily(`❌ *ERROR SISTEM*\n\n🚫 Terjadi kesalahan: ${error.message}\n\n💡 Silakan coba lagi atau restart bot`, m, hisoka);
    }
}

// Handle manual clear
async function handleManualClear(m, hisoka, config) {
    // Check if sesi directory exists
    const sesiPath = './sesi';
    if (!fs.existsSync(sesiPath)) {
        await Wily('❌ *FOLDER SESI TIDAK DITEMUKAN*\n\n📂 Path: ./sesi/\n⚠️ Status: Sesi belum tersedia atau terhapus\n\n💡 *Solusi:*\n• Pastikan bot sudah login\n• Coba restart bot jika perlu', m, hisoka);
        return;
    }

    await Wily('🧹 *STARTING SESSION CLEANUP*\n\n⏳ Analyzing session files...\n🔍 This may take a moment', m, hisoka);

    // Get session statistics before cleanup
    const beforeStats = getSesiStats();

    // Proses pembersihan session
    const result = clearSessionFiles();

    if (!result.success) {
        await Wily(`❌ *GAGAL MEMBERSIHKAN SESSION*\n\n🚫 Error: ${result.message}\n\n💡 Pastikan folder sesi dapat diakses`, m, hisoka);
        return;
    }

    // Get statistics after cleanup
    const afterStats = getSesiStats();

    // Analyze file types from deleted files
    const fileTypes = {
        'pre-key': 0,
        'sender-key': 0,
        'session': 0,
        'app-state': 0,
        'other': 0
    };

    result.deletedFiles.forEach(file => {
        if (file.includes('pre-key')) {
            fileTypes['pre-key']++;
        } else if (file.includes('sender-key')) {
            fileTypes['sender-key']++;
        } else if (file.includes('session-')) {
            fileTypes['session']++;
        } else if (file.includes('app-state')) {
            fileTypes['app-state']++;
        } else {
            fileTypes['other']++;
        }
    });

    // Calculate size saved
    const sizeSaved = ((beforeStats.totalSize - afterStats.totalSize) / 1024 / 1024).toFixed(2);
    const beforeSizeMB = (beforeStats.totalSize / 1024 / 1024).toFixed(2);
    const afterSizeMB = (afterStats.totalSize / 1024 / 1024).toFixed(2);

    let successMessage = `╭━━━『 *🧹 CLEAR SESSION BERHASIL* 』━━━❀
┃ 
┃ ✅ *Pembersihan Session Selesai!*
┃  
┃ 🗑️ *Detail Pembersihan*
┃ ⌬ Total Dihapus: ${result.deletedCount} file
┃ ⌬ Status: Berhasil ✅
┃ ⌬ Folder Target: ./sesi
┃ 
┃ 📊 *Breakdown File Types*
┃ ⌬ 🔑 Pre-Key: ${fileTypes['pre-key']} file
┃ ⌬ 📤 Sender-Key: ${fileTypes['sender-key']} file
┃ ⌬ 📱 Session: ${fileTypes['session']} file
┃ ⌬ 📦 App-State: ${fileTypes['app-state']} file
┃ ⌬ 📄 Other: ${fileTypes['other']} file
┃
┃ 💾 *Storage Information*
┃ ⌬ Sebelum: ${beforeSizeMB} MB (${beforeStats.totalFiles} files)
┃ ⌬ Sesudah: ${afterSizeMB} MB (${afterStats.totalFiles} files)
┃ ⌬ Dibersihkan: ${sizeSaved} MB
┃
┃ 🛡️ *File Dilindungi*
┃ ⌬ ${result.protectedFilesList.join(', ')}
┃
┃ 🎯 *Status Akhir*
┃ ⌬ ✅ Pembersihan selesai
┃ ⌬ 🔐 Kredensial aman
┃ ⌬ 🔄 Session siap koneksi
┃ ⌬ ⚡ Bot tetap aktif
┃
┃ ⏰ ${new Date().toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'})}
┃ 🚀 WilyKun Session Cleanup System
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀`;

    await Wily(successMessage, m, hisoka);
}

// Handle enable auto clear
async function handleEnableAuto(m, hisoka, config) {
    if (config.autoClearSesi.enabled) {
        const status = autoClearInstance.getStatus();
        const nextClear = status.nextClearTime ? status.nextClearTime.toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'}) : 'Tidak ada';
        
        await Wily(`ℹ️ *AUTO CLEAR SESI SUDAH AKTIF*\n\n🟢 *Status:* Berjalan\n⏰ *Interval:* ${config.autoClearSesi.interval} jam\n📅 *Clear Berikutnya:* ${nextClear}\n\n💡 Gunakan \`.clearsesi off\` untuk menonaktifkan\n🔧 Gunakan \`.clearsesi set [1-24]\` untuk mengubah waktu`, m, hisoka);
        return;
    }

    config.autoClearSesi.enabled = true;
    const saved = saveConfig(config);

    if (saved) {
        autoClearInstance.start(config.autoClearSesi.interval);
        const nextClear = autoClearInstance.getStatus().nextClearTime.toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'});
        
        await Wily(`✅ *AUTO CLEAR SESI DIAKTIFKAN*\n\n🟢 *Status:* Aktif\n⏰ *Interval:* ${config.autoClearSesi.interval} jam\n📅 *Clear Pertama:* ${nextClear}\n\n🎯 *Fitur Auto Clear:*\n• Otomatis membersihkan session\n• Menjaga performa bot\n• File penting tetap aman\n• Background process\n\n💾 Pengaturan tersimpan ke config.json`, m, hisoka);
    } else {
        await Wily('❌ Gagal menyimpan pengaturan ke config.json', m, hisoka);
    }
}

// Handle disable auto clear
async function handleDisableAuto(m, hisoka, config) {
    if (!config.autoClearSesi.enabled) {
        await Wily(`ℹ️ *AUTO CLEAR SESI SUDAH NONAKTIF*\n\n🔴 *Status:* Tidak aktif\n⏰ *Interval:* ${config.autoClearSesi.interval} jam (Tersimpan)\n\n💡 Gunakan \`.clearsesi on\` untuk mengaktifkan\n🔧 Gunakan \`.clearsesi set [1-24]\` untuk mengubah waktu`, m, hisoka);
        return;
    }

    config.autoClearSesi.enabled = false;
    const saved = saveConfig(config);

    if (saved) {
        autoClearInstance.stop();
        
        await Wily(`🔴 *AUTO CLEAR SESI DINONAKTIFKAN*\n\n🔴 *Status:* Nonaktif\n⏰ *Interval:* ${config.autoClearSesi.interval} jam (Tersimpan)\n\n🎯 *Perubahan:*\n• Auto clear dihentikan\n• Manual clear masih tersedia\n• Pengaturan waktu tersimpan\n• Background process dihentikan\n\n💾 Pengaturan tersimpan ke config.json`, m, hisoka);
    } else {
        await Wily('❌ Gagal menyimpan pengaturan ke config.json', m, hisoka);
    }
}

// Handle set time
async function handleSetTime(m, hisoka, config, hours) {
    const oldInterval = config.autoClearSesi.interval;
    config.autoClearSesi.interval = hours;
    const saved = saveConfig(config);

    if (saved) {
        // Restart auto clear dengan interval baru jika sedang aktif
        if (config.autoClearSesi.enabled) {
            autoClearInstance.start(hours);
            const nextClear = autoClearInstance.getStatus().nextClearTime.toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'});
            
            await Wily(`⏰ *WAKTU AUTO CLEAR DIUBAH*\n\n🔄 *Perubahan:* ${oldInterval} jam ➜ ${hours} jam\n🟢 *Status:* Aktif (Direstart)\n📅 *Clear Berikutnya:* ${nextClear}\n\n🎯 *Info:*\n• Auto clear restart dengan interval baru\n• Countdown dimulai ulang\n• Pengaturan tersimpan otomatis\n\n💾 Tersimpan ke config.json`, m, hisoka);
        } else {
            await Wily(`⏰ *WAKTU AUTO CLEAR DIATUR*\n\n🔄 *Perubahan:* ${oldInterval} jam ➜ ${hours} jam\n🔴 *Status:* Nonaktif (Pengaturan tersimpan)\n\n🎯 *Info:*\n• Waktu berhasil diubah\n• Auto clear belum aktif\n• Gunakan \`.clearsesi on\` untuk mengaktifkan\n\n💾 Tersimpan ke config.json`, m, hisoka);
        }
    } else {
        await Wily('❌ Gagal menyimpan pengaturan ke config.json', m, hisoka);
    }
}

// Handle status
async function handleStatus(m, hisoka, config) {
    const status = autoClearInstance.getStatus();
    const isEnabled = config.autoClearSesi.enabled;
    const interval = config.autoClearSesi.interval;
    const statusEmoji = isEnabled ? '🟢' : '🔴';
    const statusText = isEnabled ? 'AKTIF' : 'NONAKTIF';
    const nextClear = status.nextClearTime ? status.nextClearTime.toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'}) : 'Tidak ada';

    // Get session stats
    const sesiStats = getSesiStats();
    const sesiSizeMB = (sesiStats.totalSize / 1024 / 1024).toFixed(2);

    await Wily(`╭━━━『 *📊 STATUS AUTO CLEAR SESI* 』━━━❀
┃ 
┃ ${statusEmoji} *Status:* ${statusText}
┃ ⏰ *Interval:* ${interval} jam
┃ 📅 *Clear Berikutnya:* ${nextClear}
┃ 
┃ 📂 *Session Folder Info*
┃ ⌬ Total Files: ${sesiStats.totalFiles}
┃ ⌬ Total Size: ${sesiSizeMB} MB
┃ ⌬ Folders: ${sesiStats.totalFolders}
┃ 
┃ 🎛️ *Available Commands*
┃ ⌬ \`.clearsesi\` - Manual clear
┃ ⌬ \`.clearsesi on\` - Enable auto
┃ ⌬ \`.clearsesi off\` - Disable auto
┃ ⌬ \`.clearsesi set [1-24]\` - Set time
┃ 
┃ ⏰ ${new Date().toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'})}
┃ 🚀 WilyKun Auto Clear System
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀`, m, hisoka);
}

// Export info untuk digunakan di message.js
export const clearSesiInfo = {
    command: ['clearsesi'],
    description: 'Membersihkan file session dengan opsi otomatis (Owner only)'
};

// Export fungsi utama
export const clearsesi = handleClearSesiCommand;

// Export auto clear instance untuk digunakan di index.js jika diperlukan
export const autoClearSesiInstance = autoClearInstance;
