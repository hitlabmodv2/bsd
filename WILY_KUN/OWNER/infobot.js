
const fs = require('fs');
const path = require('path');

// Fungsi untuk load config
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
        return {};
    } catch (error) {
        return {};
    }
}

// Handler untuk command .infobot
async function handleInfoBotCommand(sock, msg, config) {
    try {
        // Parse message
        const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const prefix = config.bot?.prefix || '.';

        // Pastikan ini adalah command .infobot
        if (!messageText.startsWith(`${prefix}infobot`)) return false;

        // Function untuk mengecek owner/bot access
        const isOwnerOrBot = () => {
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
        };

        // Validasi akses - khusus owner/bot
        if (!isOwnerOrBot()) {
            // Jika mode public, beri pesan akses ditolak
            if (config.bot?.mode === 'public') {
                const accessDeniedText = `
🚫 *AKSES DITOLAK*

❌ Maaf, fitur ini khusus untuk:
• Owner Bot
• Bot Owner  
• Form Me

🔐 *Fitur Info Bot hanya untuk:*
├─ Owner: ${config.bot?.owner || 'Tidak diset'}
├─ Bot Number: ${config.bot?.botNumber || 'Tidak diset'}
└─ Form Me: Pemilik bot

💡 *Gunakan fitur lain yang tersedia:*
• ${config.bot?.prefix || '.'}menu - Menu lengkap
• ${config.bot?.prefix || '.'}status - Status bot
• ${config.bot?.prefix || '.'}info - Info bot
• ${config.bot?.prefix || '.'}ping - Cek ping bot

⚠️ *Info bot detail hanya bisa dilihat oleh pemilik bot*`;

                await sock.sendMessage(msg.key.remoteJid, { text: accessDeniedText }, { quoted: msg });
            }
            // Jika mode self, bot diam saja (tidak ada respons)
            return true;
        }

        // Load fresh config untuk data terbaru
        const freshConfig = loadConfig();

        // Hitung total grup antitagsw
        const antitagswGroups = freshConfig.antitagsw?.enabled || [];
        const totalAntitagswGroups = Array.isArray(antitagswGroups) ? antitagswGroups.length : 0;

        // Hitung total whitelist antidelete
        const antideletePrivateWhitelist = freshConfig.autoFeatures?.antidelete?.privateChat?.whitelist || [];
        const antideleteGroupWhitelist = freshConfig.autoFeatures?.antidelete?.groupChat?.whitelist || [];
        const totalAntideleteWhitelist = antideletePrivateWhitelist.length + antideleteGroupWhitelist.length;

        // Hitung total whitelist anticall
        const anticallWhitelist = freshConfig.autoFeatures?.anticall?.whitelist || [];
        const anticallvidWhitelist = freshConfig.autoFeatures?.anticallvid?.whitelist || [];

        // Format status on/off
        const formatStatus = (status) => status ? 'ON ✅' : 'OFF ❌';
        const formatMode = (mode) => mode ? mode.toUpperCase() : 'OFF';

        // Buat info bot text
        const infoBotText = `
🤖 *INFO BOT LENGKAP*

┌─────────────────────────────
│ 📊 *KONFIGURASI UTAMA*
├─────────────────────────────
│ » Mode Bot: ${formatMode(freshConfig.bot?.mode)} ${freshConfig.bot?.mode === 'self' ? '🔒' : '🌐'}
│ » Prefix: ${freshConfig.bot?.prefix || '.'}
│ » Owner: ${freshConfig.bot?.owner || 'Tidak diset'}
│ » Bot Number: ${freshConfig.bot?.botNumber || 'Tidak diset'}
└─────────────────────────────

┌─────────────────────────────
│ 🎯 *AUTO REACTION SYSTEM*
├─────────────────────────────
│ » Status: ${formatStatus(freshConfig.autoReactionStory?.enabled)}
│ » Mode: ${formatMode(freshConfig.autoReactionStory?.mode)} ${freshConfig.autoReactionStory?.mode === 'always' ? '🎯' : freshConfig.autoReactionStory?.mode === 'random' ? '🎲' : '⭕'}
│ » Delay: ${(freshConfig.autoReactionStory?.delay || 5000) / 1000} detik ⏱️
│ » Speed Views: ${freshConfig.settings?.speedViews || 5} detik
└─────────────────────────────

┌─────────────────────────────
│ 🎭 *AUTO PRESENCE FEATURES*
├─────────────────────────────
│ » Auto Online: ${formatStatus(freshConfig.autoFeatures?.online)} 🌐
│ » Auto Typing: ${formatStatus(freshConfig.autoFeatures?.typing)} 💬
│ » Auto Recording: ${formatStatus(freshConfig.autoFeatures?.recording)} 🎤
│ » Auto Unduh Story: ${formatStatus(freshConfig.autoFeatures?.autoUnduhStory)} 📥
└─────────────────────────────

┌─────────────────────────────
│ 🛡️ *SECURITY FEATURES*
├─────────────────────────────
│ » Anti Delete: ${formatStatus(freshConfig.autoFeatures?.antidelete?.enabled)} 🚫
│   ├─ Mode: ${formatMode(freshConfig.autoFeatures?.antidelete?.mode)}
│   ├─ Private Chat: ${formatStatus(freshConfig.autoFeatures?.antidelete?.privateChat?.enabled)}
│   ├─ Group Chat: ${formatStatus(freshConfig.autoFeatures?.antidelete?.groupChat?.enabled)}
│   └─ Total Whitelist: ${totalAntideleteWhitelist} chat
│
│ » Anti Call: ${formatStatus(freshConfig.autoFeatures?.anticall?.enabled)} 📞
│   ├─ Whitelist: ${anticallWhitelist.length} nomor
│   └─ Reply Message: ${freshConfig.autoFeatures?.anticall?.replyMessage ? 'SET ✅' : 'NOT SET ❌'}
│
│ » Anti Call Video: ${formatStatus(freshConfig.autoFeatures?.anticallvid?.enabled)} 📹
│   ├─ Mode: ${formatMode(freshConfig.autoFeatures?.anticallvid?.mode)}
│   ├─ Whitelist: ${anticallvidWhitelist.length} nomor
│   └─ Reply Message: ${freshConfig.autoFeatures?.anticallvid?.replyMessage ? 'SET ✅' : 'NOT SET ❌'}
│
│ » Anti Tag SW: ${totalAntitagswGroups > 0 ? 'ON ✅' : 'OFF ❌'} 🏷️
│   ├─ Grup Aktif: ${totalAntitagswGroups} grup
│   ├─ Max Warns: ${freshConfig.antitagsw?.settings?.maxWarns || 5}
│   ├─ Auto Kick: ${formatStatus(freshConfig.antitagsw?.settings?.autoKick)}
│   └─ Delete Message: ${formatStatus(freshConfig.antitagsw?.settings?.deleteMessage)}
└─────────────────────────────

┌─────────────────────────────
│ 👥 *GROUP FEATURES*
├─────────────────────────────
│ » Welcome Message: ${formatStatus(freshConfig.group?.welcomeMessage?.enabled)} 🎉
│ » Goodbye Message: ${formatStatus(freshConfig.group?.goodbyeMessage?.enabled)} 👋
└─────────────────────────────

┌─────────────────────────────
│ ⚙️ *DISPLAY SETTINGS*
├─────────────────────────────
│ » Show Stats: ${formatStatus(freshConfig.display?.showStats)} 📊
│ » Colored Output: ${formatStatus(freshConfig.display?.coloredOutput)} 🎨
│ » Censor Number: ${formatStatus(freshConfig.settings?.censorNumber)} 🔒
│ » Censor Count: ${freshConfig.settings?.censorCount || 3}
└─────────────────────────────

┌─────────────────────────────
│ 🎯 *BACKUP & TARGETS*
├─────────────────────────────
│ » Backup Target: ${freshConfig.backupTarget || 'Tidak diset'}
│ » RVO V2 Target: ${freshConfig.rvov2Target || 'Tidak diset'}
└─────────────────────────────

🤖 *TOTAL FITUR AKTIF:*
${[
    freshConfig.autoReactionStory?.enabled ? '• Auto Reaction ✅' : null,
    freshConfig.autoFeatures?.online ? '• Auto Online ✅' : null,
    freshConfig.autoFeatures?.typing ? '• Auto Typing ✅' : null,
    freshConfig.autoFeatures?.recording ? '• Auto Recording ✅' : null,
    freshConfig.autoFeatures?.antidelete?.enabled ? '• Anti Delete ✅' : null,
    freshConfig.autoFeatures?.anticall?.enabled ? '• Anti Call ✅' : null,
    freshConfig.autoFeatures?.anticallvid?.enabled ? '• Anti Call Video ✅' : null,
    totalAntitagswGroups > 0 ? '• Anti Tag SW ✅' : null,
    freshConfig.group?.welcomeMessage?.enabled ? '• Welcome Message ✅' : null,
    freshConfig.group?.goodbyeMessage?.enabled ? '• Goodbye Message ✅' : null,
    freshConfig.autoFeatures?.autoUnduhStory ? '• Auto Unduh Story ✅' : null
].filter(Boolean).join('\n') || '• Tidak ada fitur yang aktif ❌'}

💾 *Data disinkronkan dari config.json*
🔄 *Info diperbarui secara real-time*`;

        // Kirim pesan
        await sock.sendMessage(msg.key.remoteJid, { text: infoBotText }, { quoted: msg });

        return true;

    } catch (error) {
        // Silent error handling
        return false;
    }
}

module.exports = {
    handleInfoBotCommand
};
