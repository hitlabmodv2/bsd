
const fs = require('fs');
const path = require('path');
const { Wily } = require('../CODE_REPLAY/reply');

// Function to censor phone number (3 middle digits)
function censorNumber(number) {
    if (number.length < 9) return number;
    const start = number.slice(0, 6); // Ambil 6 digit pertama
    const end = number.slice(-3); // Ambil 3 digit terakhir
    return `${start}***${end}`;
}

// Handler untuk ranking all
async function handleRankingAll(sock, msg, config) {
    try {
        // Load data from JSON files
        const statusDataPath = path.join(process.cwd(), 'DATA', 'status_data.json');
        const emojiDataPath = path.join(process.cwd(), 'EMOJI', 'emoji_stats.json');

        let statusData = { totalViews: 0, users: {} };
        let emojiData = {};

        if (fs.existsSync(statusDataPath)) {
            statusData = JSON.parse(fs.readFileSync(statusDataPath, 'utf8'));
        }

        if (fs.existsSync(emojiDataPath)) {
            emojiData = JSON.parse(fs.readFileSync(emojiDataPath, 'utf8'));
        }

        // Process status ranking (Top 30)
        const statusRanking = Object.entries(statusData.users || {})
            .map(([number, data]) => ({
                number: number,
                totalRead: data.totalRead || 0
            }))
            .sort((a, b) => b.totalRead - a.totalRead)
            .slice(0, 30);

        // Process emoji ranking (Top 30)
        const emojiRanking = Object.entries(emojiData)
            .map(([emoji, count]) => ({
                emoji: emoji,
                count: count
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 30);

        // Create status ranking text
        let statusRankText = "";
        if (statusRanking.length > 0) {
            statusRanking.forEach((user, index) => {
                const trophy = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
                const maskedNumber = censorNumber(user.number);
                statusRankText += `${trophy} ${index + 1}. ${maskedNumber} → ${user.totalRead} story\n`;
            });
        } else {
            statusRankText = "📭 Belum ada data status\n";
        }

        // Create emoji ranking text
        let emojiRankText = "";
        if (emojiRanking.length > 0) {
            emojiRanking.forEach((emoji, index) => {
                const trophy = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
                emojiRankText += `${trophy} ${index + 1}. ${emoji.emoji} → ${emoji.count}x digunakan\n`;
            });
        } else {
            emojiRankText = "📭 Belum ada data emoji\n";
        }

        const allRankingText = `
🏆 *RANKING TOP 30*

📊 *TOP 30 PEMBACA STATUS*
${statusRankText}
🎭 *TOP 30 EMOJI FAVORIT*
${emojiRankText}
📈 *STATISTIK UMUM*
→ Total Views: ${statusData.totalViews || 0}
→ Total Users: ${Object.keys(statusData.users || {}).length}
→ Total Emoji Used: ${Object.values(emojiData).reduce((a, b) => a + b, 0)}
→ Unique Emojis: ${Object.keys(emojiData).length}

📊 Data diperbarui secara real-time`;

        await sock.sendMessage(msg.key.remoteJid, { text: allRankingText }, { quoted: msg });
        
    } catch (error) {
        await sock.sendMessage(msg.key.remoteJid, { text: '❌ Error saat memuat data ranking' }, { quoted: msg });
    }
}

// Handler untuk ranking status
async function handleRankingStatus(sock, msg, config, limit = 10) {
    try {
        const maxLimit = Math.min(limit, 20); // Maximum 20

        const statusDataPath = path.join(process.cwd(), 'DATA', 'status_data.json');
        let statusData = { totalViews: 0, users: {} };

        if (fs.existsSync(statusDataPath)) {
            statusData = JSON.parse(fs.readFileSync(statusDataPath, 'utf8'));
        }

        const statusRanking = Object.entries(statusData.users || {})
            .map(([number, data]) => ({
                number: number,
                totalRead: data.totalRead || 0,
                totalStatus: data.totalStatus || 0
            }))
            .sort((a, b) => b.totalRead - a.totalRead)
            .slice(0, maxLimit);

        let rankingText = "";
        if (statusRanking.length > 0) {
            statusRanking.forEach((user, index) => {
                const trophy = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
                const maskedNumber = censorNumber(user.number);
                rankingText += `${trophy} ${index + 1}. ${maskedNumber} → ${user.totalRead} story (${user.totalStatus} total)\n`;
            });
        } else {
            rankingText = "📭 Belum ada data pembaca status\n";
        }

        const statusRankingText = `
📊 *TOP ${maxLimit} PEMBACA STATUS*

🏆 *RANKING PEMBACA STATUS TERBANYAK*
${rankingText}
📈 *TOTAL STATISTIK*
→ Total Views: ${statusData.totalViews || 0}
→ Total Users: ${Object.keys(statusData.users || {}).length}
→ Data Limit: ${maxLimit}/${Object.keys(statusData.users || {}).length}

📊 Gunakan ${config.bot.prefix}ranking status [angka] untuk mengatur limit`;

        await sock.sendMessage(msg.key.remoteJid, { text: statusRankingText }, { quoted: msg });
        
    } catch (error) {
        await sock.sendMessage(msg.key.remoteJid, { text: '❌ Error saat memuat ranking status' }, { quoted: msg });
    }
}

// Handler untuk ranking emoji
async function handleRankingEmoji(sock, msg, config, limit = 10) {
    try {
        const maxLimit = Math.min(limit, 25); // Maximum 25

        const emojiDataPath = path.join(process.cwd(), 'EMOJI', 'emoji_stats.json');
        let emojiData = {};

        if (fs.existsSync(emojiDataPath)) {
            emojiData = JSON.parse(fs.readFileSync(emojiDataPath, 'utf8'));
        }

        const emojiRanking = Object.entries(emojiData)
            .map(([emoji, count]) => ({
                emoji: emoji,
                count: count
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, maxLimit);

        let rankingText = "";
        if (emojiRanking.length > 0) {
            emojiRanking.forEach((emoji, index) => {
                const trophy = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
                const percentage = emojiData ? ((emoji.count / Object.values(emojiData).reduce((a, b) => a + b, 0)) * 100).toFixed(1) : 0;
                rankingText += `${trophy} ${index + 1}. ${emoji.emoji} → ${emoji.count}x (${percentage}%)\n`;
            });
        } else {
            rankingText = "📭 Belum ada data emoji yang digunakan\n";
        }

        const totalEmojiUsed = Object.values(emojiData).reduce((a, b) => a + b, 0);
        const uniqueEmojis = Object.keys(emojiData).length;

        const emojiRankingText = `
🎭 *TOP ${maxLimit} EMOJI FAVORIT*

🏆 *RANKING EMOJI PALING BANYAK DIGUNAKAN*
${rankingText}
📈 *STATISTIK EMOJI*
→ Total Penggunaan: ${totalEmojiUsed}
→ Jenis Emoji: ${uniqueEmojis}
→ Data Limit: ${maxLimit}/${uniqueEmojis}
→ Rata-rata per Emoji: ${uniqueEmojis > 0 ? (totalEmojiUsed / uniqueEmojis).toFixed(1) : 0}x

📊 Gunakan ${config.bot.prefix}ranking emoji [angka] untuk mengatur limit`;

        await sock.sendMessage(msg.key.remoteJid, { text: emojiRankingText }, { quoted: msg });
        
    } catch (error) {
        await sock.sendMessage(msg.key.remoteJid, { text: '❌ Error saat memuat ranking emoji' }, { quoted: msg });
    }
}

// Function to check if user is authorized (owner/bot)
function isAuthorizedUser(msg, sock, config) {
    const botNumber = sock.user?.id?.split(':')[0];
    let actualSenderNumber;

    if (msg.key.participant) {
        actualSenderNumber = msg.key.participant.split('@')[0];
    } else if (msg.key.fromMe) {
        actualSenderNumber = botNumber;
    } else {
        actualSenderNumber = msg.key.remoteJid?.split('@')[0];
    }

    const isFromMe = msg.key.fromMe === true;
    const isBotNumber = actualSenderNumber === botNumber;
    const isOwnerNumber = actualSenderNumber === config.bot?.owner;
    const isBotNumberFromConfig = actualSenderNumber === config.bot?.botNumber;
    const isHardcodedBot = actualSenderNumber === '6289681008411';

    return isFromMe || isBotNumber || isOwnerNumber || isBotNumberFromConfig || isHardcodedBot;
}

// Function to check access based on bot mode
function checkAccess(msg, sock, config) {
    if (config.bot?.mode === 'self') {
        return isAuthorizedUser(msg, sock, config);
    }
    return true; // Public mode allows everyone for ranking commands
}

// Function to check reset data access specifically (stricter)
function checkResetDataAccess(msg, sock, config) {
    // Reset data access is always restricted to authorized users regardless of mode
    return isAuthorizedUser(msg, sock, config);
}

// Handler untuk reset data
async function handleResetData(sock, msg, config) {
    try {
        // Check access permission menggunakan checkResetDataAccess yang lebih ketat
        if (!checkResetDataAccess(msg, sock, config)) {
            // Untuk mode public, berikan respons penolakan akses yang jelas
            if (config.bot?.mode === 'public') {
                const accessDeniedText = `
🚫 *AKSES DITOLAK*

❌ Maaf, fitur ini khusus untuk:
• Owner Bot
• Bot Owner
• Form Me

🔐 *Fitur Reset Data hanya untuk:*
├─ Owner: ${config.bot?.owner || 'Tidak diset'}
├─ Bot Number: ${config.bot?.botNumber || 'Tidak diset'}
└─ Form Me: Pemilik bot

💡 *Gunakan fitur lain yang tersedia:*
• ${config.bot?.prefix || '.'}ranking all - Lihat ranking
• ${config.bot?.prefix || '.'}ranking status - Top pembaca status
• ${config.bot?.prefix || '.'}ranking emoji - Top emoji
• ${config.bot?.prefix || '.'}menu - Menu lengkap

⚠️ *Reset data hanya bisa dilakukan oleh pemilik bot untuk keamanan data*`;
                
                await sock.sendMessage(msg.key.remoteJid, { text: accessDeniedText }, { quoted: msg });
            }
            // Untuk mode self, bot diam saja tanpa respons
            return;
        }

        // Load current data untuk menampilkan statistik sebelum reset
        const statusDataPath = path.join(process.cwd(), 'DATA', 'status_data.json');
        const emojiDataPath = path.join(process.cwd(), 'EMOJI', 'emoji_stats.json');

        let statusData = { totalViews: 0, users: {} };
        let emojiData = {};

        if (fs.existsSync(statusDataPath)) {
            statusData = JSON.parse(fs.readFileSync(statusDataPath, 'utf8'));
        }

        if (fs.existsSync(emojiDataPath)) {
            emojiData = JSON.parse(fs.readFileSync(emojiDataPath, 'utf8'));
        }

        const totalEmojiUsed = Object.values(emojiData).reduce((a, b) => a + b, 0);
        const uniqueEmojis = Object.keys(emojiData).length;
        const totalUsers = Object.keys(statusData.users || {}).length;

        const confirmText = `
🚨 *KONFIRMASI RESET DATA*

⚠️ *PERINGATAN:* Anda akan menghapus semua data statistik!

📊 *Data yang akan dihapus:*
→ Total Views: ${statusData.totalViews || 0}
→ Total Users: ${totalUsers}
→ Total Emoji Used: ${totalEmojiUsed}
→ Unique Emojis: ${uniqueEmojis}

🗂️ *File yang akan direset:*
→ DATA/status_data.json
→ EMOJI/emoji_stats.json

⚠️ *TINDAKAN INI TIDAK DAPAT DIBATALKAN!*

🔐 *Akses:* ${config.bot?.mode === 'self' ? 'Owner & Bot Only' : 'Semua Pengguna'}

💡 *Untuk melanjutkan reset data, reply pesan ini dengan salah satu:*
• **YA RESET DATA**
• **YA** 
• **YES**
• **Y**

❌ *Untuk membatalkan, abaikan pesan ini*`;

        // Track reset command for fallback handling
        if (!global.recentResetCommands) {
            global.recentResetCommands = new Map();
        }
        global.recentResetCommands.set(msg.key.remoteJid, Date.now());

        await sock.sendMessage(msg.key.remoteJid, { text: confirmText }, { quoted: msg });

    } catch (error) {
        await sock.sendMessage(msg.key.remoteJid, { text: '❌ Error saat memuat data untuk reset' }, { quoted: msg });
    }
}

// Handler untuk konfirmasi reset data
async function handleResetConfirmation(sock, msg, config) {
    try {
        // Check access permission menggunakan checkResetDataAccess yang lebih ketat
        if (!checkResetDataAccess(msg, sock, config)) {
            // Untuk mode public, berikan respons penolakan akses yang jelas
            if (config.bot?.mode === 'public') {
                const accessDeniedText = `
🚫 *AKSES DITOLAK*

❌ Maaf, konfirmasi reset data khusus untuk:
• Owner Bot
• Bot Owner  
• Form Me

🔐 *Hanya pemilik bot yang bisa reset data untuk keamanan*

💡 *Silakan gunakan fitur ranking lainnya yang tersedia*`;
                
                await sock.sendMessage(msg.key.remoteJid, { text: accessDeniedText }, { quoted: msg });
            }
            // Untuk mode self, bot diam saja tanpa respons
            return;
        }

        // Verify this is a reply to bot's confirmation message or recent reset command
        let isValidConfirmation = false;

        // Check if this is a quoted reply
        if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            const quotedText = msg.message.extendedTextMessage.contextInfo.quotedMessage.conversation || 
                             msg.message.extendedTextMessage.contextInfo.quotedMessage.extendedTextMessage?.text || '';
            if (quotedText.includes('KONFIRMASI RESET DATA')) {
                isValidConfirmation = true;
            }
        }

        // Fallback: Check if this is a recent reset command response
        if (!isValidConfirmation) {
            const recentResetCommands = global.recentResetCommands || new Map();
            const senderJid = msg.key.remoteJid;
            if (recentResetCommands.has(senderJid)) {
                const resetTime = recentResetCommands.get(senderJid);
                const now = Date.now();
                // If reset command was sent within last 5 minutes
                if (now - resetTime < 5 * 60 * 1000) {
                    isValidConfirmation = true;
                    recentResetCommands.delete(senderJid); // Remove after using
                }
            }
        }

        if (!isValidConfirmation) {
            return;
        }

        // Check if user confirmed with various accepted responses
        const userResponse = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const normalizedResponse = userResponse.trim().toUpperCase();
        
        // Accepted confirmation responses
        const acceptedResponses = ['YA RESET DATA', 'YA', 'YES', 'Y'];
        
        if (!acceptedResponses.includes(normalizedResponse)) {
            return;
        }

        // Load current data untuk backup sebelum reset
        const statusDataPath = path.join(process.cwd(), 'DATA', 'status_data.json');
        const emojiDataPath = path.join(process.cwd(), 'EMOJI', 'emoji_stats.json');

        let statusData = { totalViews: 0, users: {} };
        let emojiData = {};

        if (fs.existsSync(statusDataPath)) {
            statusData = JSON.parse(fs.readFileSync(statusDataPath, 'utf8'));
        }

        if (fs.existsSync(emojiDataPath)) {
            emojiData = JSON.parse(fs.readFileSync(emojiDataPath, 'utf8'));
        }

        // Calculate statistics sebelum reset
        const totalEmojiUsed = Object.values(emojiData).reduce((a, b) => a + b, 0);
        const uniqueEmojis = Object.keys(emojiData).length;
        const totalUsers = Object.keys(statusData.users || {}).length;

        // Create backup dengan timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(process.cwd(), 'DATA');
        
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }

        // Backup status data
        if (fs.existsSync(statusDataPath)) {
            const backupStatusPath = path.join(backupDir, `status_data_backup_${timestamp}.json`);
            fs.copyFileSync(statusDataPath, backupStatusPath);
        }

        // Backup emoji data
        const emojiDir = path.join(process.cwd(), 'EMOJI');
        if (fs.existsSync(emojiDataPath)) {
            const backupEmojiPath = path.join(backupDir, `emoji_stats_backup_${timestamp}.json`);
            fs.copyFileSync(emojiDataPath, backupEmojiPath);
        }

        // Reset status data
        const resetStatusData = { totalViews: 0, users: {} };
        fs.writeFileSync(statusDataPath, JSON.stringify(resetStatusData, null, 2));

        // Reset emoji data
        const resetEmojiData = {};
        if (!fs.existsSync(emojiDir)) {
            fs.mkdirSync(emojiDir, { recursive: true });
        }
        fs.writeFileSync(emojiDataPath, JSON.stringify(resetEmojiData, null, 2));

        const successText = `
✅ *DATA BERHASIL DIRESET!*

🗑️ *Data yang telah dihapus:*
→ Total Views: ${statusData.totalViews || 0} → 0
→ Total Users: ${totalUsers} → 0
→ Total Emoji Used: ${totalEmojiUsed} → 0
→ Unique Emojis: ${uniqueEmojis} → 0

💾 *Backup dibuat:*
→ status_data_backup_${timestamp}.json
→ emoji_stats_backup_${timestamp}.json
→ Lokasi: folder DATA/

🔄 *Status reset:*
→ DATA/status_data.json ✅ Reset
→ EMOJI/emoji_stats.json ✅ Reset
→ Backup ✅ Tersimpan

🎯 *Bot siap mulai mengumpulkan data baru!*

🔐 *Reset dilakukan oleh:* ${config.bot?.mode === 'self' ? 'Owner/Bot' : 'User'}
⏰ *Waktu reset:* ${new Date().toLocaleString('id-ID')}`;

        await sock.sendMessage(msg.key.remoteJid, { text: successText }, { quoted: msg });

    } catch (error) {
        await sock.sendMessage(msg.key.remoteJid, { text: '❌ Error saat mereset data. Silakan coba lagi.' }, { quoted: msg });
    }
}

// Handler utama untuk semua ranking commands
async function handleRankingCommand(sock, msg, config, args) {
    // Special handling untuk konfirmasi reset
    const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    if (messageText.trim().toUpperCase() === 'YA RESET DATA' && 
        msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        await handleResetConfirmation(sock, msg, config);
        return;
    }

    if (args.length < 2) {
        // Show different help based on access level
        let helpText = `
📊 *RANKING & STATISTIK*

📝 *Cara penggunaan:*
${config.bot.prefix}ranking all
${config.bot.prefix}ranking status [limit]
${config.bot.prefix}ranking emoji [limit]`;

        // Add resetdata option for authorized users only
        if (checkAccess(msg, sock, config)) {
            helpText += `
${config.bot.prefix}ranking resetdata`;
        }

        helpText += `

📋 *Penjelasan:*
• *all* - Semua ranking top 30
• *status* - Top pembaca status (default: 10)
• *emoji* - Top emoji yang digunakan (default: 10)`;

        if (checkAccess(msg, sock, config)) {
            helpText += `
• *resetdata* - Reset semua data statistik`;
        }

        helpText += `

📊 *Contoh:*
${config.bot.prefix}ranking all
${config.bot.prefix}ranking status 5
${config.bot.prefix}ranking emoji 15`;

        if (checkAccess(msg, sock, config)) {
            helpText += `
${config.bot.prefix}ranking resetdata`;
        }

        await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
        return;
    }

    const subCommand = args[1].toLowerCase();

    switch (subCommand) {
        case 'all':
            await handleRankingAll(sock, msg, config);
            break;
        case 'status':
            const statusLimit = parseInt(args[2]) || 10;
            await handleRankingStatus(sock, msg, config, statusLimit);
            break;
        case 'emoji':
            const emojiLimit = parseInt(args[2]) || 10;
            await handleRankingEmoji(sock, msg, config, emojiLimit);
            break;
        case 'resetdata':
            await handleResetData(sock, msg, config);
            break;
        default:
            await sock.sendMessage(msg.key.remoteJid, { text: `❌ Sub-command tidak valid! Gunakan: all, status, emoji${checkAccess(msg, sock, config) ? ', atau resetdata' : ''}` }, { quoted: msg });
            break;
    }
}

module.exports = {
    handleRankingCommand,
    handleRankingAll,
    handleRankingStatus, 
    handleRankingEmoji,
    handleResetData,
    handleResetConfirmation,
    isAuthorizedUser,
    checkAccess,
    checkResetDataAccess
};
