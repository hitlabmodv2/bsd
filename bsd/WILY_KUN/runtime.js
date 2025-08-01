const fs = require('fs');
const path = require('path');
const os = require('os');

// Import Wily from CODE_REPLAY/reply.js
const { Wily } = require('../CODE_REPLAY/reply');

// Import fungsi loadConfig dari Wilykun.js
const { loadConfig } = require('../Wilykun.js');

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(uptime) {
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);
    const seconds = Math.floor(uptime % 60);

    let result = '';
    if (days > 0) result += `${days} hari `;
    if (hours > 0) result += `${hours} jam `;
    if (minutes > 0) result += `${minutes} menit `;
    result += `${seconds} detik`;

    return result.trim();
}

function getTimeSession() {
    const hour = new Date().toLocaleString('en-US', { 
        timeZone: 'Asia/Jakarta',
        hour: 'numeric',
        hour12: false
    });
    const hourNum = parseInt(hour);

    if (hourNum >= 0 && hourNum < 4) return "🌙 Tengah Malam";
    if (hourNum >= 4 && hourNum < 10) return "🌅 Pagi";
    if (hourNum >= 10 && hourNum < 15) return "☀️ Siang";
    if (hourNum >= 15 && hourNum < 18) return "🌤️ Sore";
    return "🌜 Malam";
}

function checkAccess(senderNumber, config, fromMe = false) {
    const botMode = config?.bot?.mode || 'public';

    if (botMode === 'public') {
        return true;
    }

    const botNumber = config?.bot?.botNumber;
    const ownerNumber = config?.bot?.owner;

    const cleanSender = senderNumber?.split('@')[0]?.split(':')[0];
    const cleanBot = botNumber?.split('@')[0]?.split(':')[0];
    const cleanOwner = ownerNumber?.split('@')[0]?.split(':')[0];

    const isBotNumber = cleanSender === cleanBot;
    const isOwnerNumber = cleanSender === cleanOwner;
    const isFromMe = fromMe === true;

    return isFromMe || isBotNumber || isOwnerNumber;
}

async function handleRuntimeCommand(sock, msg) {
    try {
        const config = loadConfig();

        // Get sender info
        const senderJid = msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        let senderNumber;

        if (msg.key.participant) {
            senderNumber = msg.key.participant.split('@')[0];
        } else if (msg.key.fromMe) {
            senderNumber = sock.user?.id?.split(':')[0];
        } else {
            senderNumber = senderJid?.split('@')[0];
        }

        // Check access
        if (!checkAccess(senderNumber, config, fromMe)) {
            return; // Silent exit di mode self
        }

        // System information
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        const cpuModel = os.cpus()[0]?.model || 'Unknown';
        const cpuCount = os.cpus().length;

        const processUptime = process.uptime();
        const systemUptime = os.uptime();

        const nodeVersion = process.version;
        const platform = os.platform();
        const architecture = os.arch();

        const timeSession = getTimeSession();
        const currentTime = new Date().toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const runtimeText = `📊 *RUNTIME & SYSTEM INFO*

⏰ *Waktu Saat Ini:*
├─ ${timeSession}
└─ ${currentTime} WIB

🤖 *Bot Runtime:*
├─ Uptime: ${formatUptime(processUptime)}
├─ Node.js: ${nodeVersion}
└─ Platform: ${platform} (${architecture})

💻 *System Info:*
├─ CPU: ${cpuModel}
├─ Core: ${cpuCount} cores
├─ Total RAM: ${formatBytes(totalMem)}
├─ Used RAM: ${formatBytes(usedMem)}
├─ Free RAM: ${formatBytes(freeMem)}
└─ System Uptime: ${formatUptime(systemUptime)}

📈 *Performance:*
├─ Memory Usage: ${((usedMem / totalMem) * 100).toFixed(1)}%
└─ Bot Status: ✅ Running Smoothly

🔧 *WilyKun Bot - Runtime Monitor*`;

        await Wily(runtimeText, msg, sock);

    } catch (error) {
        const fallbackText = '❌ Terjadi kesalahan saat mengambil informasi runtime';

        try {
            await Wily(fallbackText, msg, sock);
        } catch (fallbackError) {
            await sock.sendMessage(msg.key.remoteJid, { text: fallbackText }, { quoted: msg });
        }
    }
}

module.exports = {
    handleRuntimeCommand
};