const axios = require('axios');
const { Wily } = require('../CODE_REPLAY/reply.js');
const fs = require('fs');
const path = require('path');

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
        }
    };
}

// Function to check access based on bot mode
function checkAccess(senderNumber, config, fromMe = false) {
    const botMode = config?.bot?.mode || 'public';

    if (botMode === 'public') {
        return true;
    }

    // Mode self: hanya izinkan bot, owner, atau fromMe
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

// Enhanced function to get buffer from URL
async function getBuffer(url, retries = 2) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Referer': 'https://www.freefirecommunity.com/',
                    'Origin': 'https://www.freefirecommunity.com'
                }
            });

            if (response.data && response.data.byteLength > 500) {
                return Buffer.from(response.data);
            }
        } catch (error) {
            if (i === retries - 1) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    return null;
}

// Function to format date from Unix timestamp
function formatDate(timestamp) {
    if (!timestamp) return 'Tidak diketahui';
    try {
        const date = new Date(timestamp * 1000);
        return date.toLocaleString('id-ID', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (error) {
        return 'Format tanggal tidak valid';
    }
}

async function handleFFStalkCommand(sock, msg) {
    try {
        const config = loadConfig();
        const prefix = config?.bot?.prefix || '.';

        // Get message text
        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || '';

        if (!messageText) return;

        // Check if it's ffstalk command
        const args = messageText.slice(prefix.length).trim().split(' ');
        const command = args[0].toLowerCase();

        if (command !== 'ffstalk') return;

        // Check access based on bot mode
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        const senderNumber = senderJid.split('@')[0];

        if (!checkAccess(senderNumber, config, fromMe)) {
            return;
        }

        // Get UID from arguments
        const uid = args.slice(1).join(' ').trim();

        // Jika tidak ada UID, tampilkan help
        if (!uid) {
            const helpText = `╭━━━『 🎮 FREE FIRE STALKER 』━━━❀
┃ 
┃ 🔍 *Cek informasi akun Free Fire!*
┃ 
┃ 📝 *Cara penggunaan:*
┃ ${prefix}ffstalk [UID]
┃ 
┃ 🎯 *Contoh:*
┃ ${prefix}ffstalk 2134554847
┃ 
┃ 📊 *Info yang didapat:*
┃ • Nickname pemain
┃ • UID akun  
┃ • Level karakter
┃ • Rank terkini
┃ • Banner image profil
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Masukkan UID Free Fire untuk memulai pencarian!_`;

            await Wily(helpText, msg, sock);
            return;
        }

        // Validasi UID
        if (!/^\d{9,10}$/.test(uid)) {
            const errorText = `❌ *UID TIDAK VALID!*

⚠️ Format UID Free Fire harus:
• Berupa angka saja (9-10 digit)
• Contoh yang benar: 2134554847

💡 *Coba lagi:* ${prefix}ffstalk [UID yang valid]`;

            await Wily(errorText, msg, sock);
            return;
        }

        // Send processing message
        await Wily('🌀 *Mencari data Free Fire...*\n\n⏳ Mohon tunggu...', msg, sock);

        try {
            // Fetch data with shorter timeout and better error handling
            const response = await axios.get(`https://discordbot.freefirecommunity.com/player_info_api?uid=${uid}&region=id`, {
                headers: {
                    'Origin': 'https://www.freefirecommunity.com',
                    'Referer': 'https://www.freefirecommunity.com/ff-account-info/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8',
                    'Connection': 'keep-alive'
                },
                timeout: 10000 // Reduced timeout
            });

            const data = response.data?.player_info;

            if (!data || !data.basicInfo) {
                await Wily(`❌ *AKUN TIDAK DITEMUKAN!*\n\n🔍 UID "${uid}" tidak valid atau akun belum pernah login\n\n💡 Periksa kembali UID dan coba lagi!`, msg, sock);
                return;
            }

            const basicInfo = data.basicInfo;
            const nickname = basicInfo.nickname || 'Tidak diketahui';
            const accountId = basicInfo.accountId || uid;
            const level = basicInfo.level || '-';
            const rank = basicInfo.rank || '-';
            const csRank = basicInfo.csRank || '-';
            const createAt = formatDate(basicInfo.createAt);
            const lastLogin = formatDate(basicInfo.lastLoginAt);

            // Try to get banner image
            const bannerUrl = `https://discordbot.freefirecommunity.com/banner_image_api?uid=${uid}&region=id`;

            try {
                const bannerBuffer = await getBuffer(bannerUrl);

                if (bannerBuffer) {
                    const caption = `🎮 *FREE FIRE ACCOUNT INFO*

👤 *Nickname:* ${nickname}
🆔 *UID:* ${accountId}
⭐ *Level:* ${level}
🎖️ *Rank:* ${rank}
🏆 *CS Rank:* ${csRank}

📅 *Dibuat:* ${createAt}
🕐 *Login Terakhir:* ${lastLogin}

✨ *Data berhasil diambil!*`;

                    // Send with image using quoted message
                    await sock.sendMessage(msg.key.remoteJid, {
                        image: bannerBuffer,
                        caption: caption
                    }, { quoted: msg });

                    return;
                }
            } catch (imageError) {
                // If image fails, continue to text only
            }

            // Fallback to text only
            const textMessage = `🎮 *FREE FIRE ACCOUNT INFO*

👤 *Nickname:* ${nickname}
🆔 *UID:* ${accountId}
⭐ *Level:* ${level}
🎖️ *Rank:* ${rank}
🏆 *CS Rank:* ${csRank}

📅 *Dibuat:* ${createAt}
🕐 *Login Terakhir:* ${lastLogin}

⚠️ *Banner profil tidak dapat dimuat*
✨ *Data profil berhasil diambil!*`;

            await Wily(textMessage, msg, sock);

        } catch (apiError) {
            let errorMessage = '❌ *GAGAL MENGAMBIL DATA!*\n\n';

            if (apiError.code === 'ECONNABORTED' || apiError.message?.includes('timeout')) {
                errorMessage += '⏰ *Timeout:*\n• Server Free Fire tidak merespons\n• Coba lagi dalam beberapa menit\n• Server mungkin sedang maintenance';
            } else if (apiError.response?.status === 404) {
                errorMessage += `🔍 *UID Tidak Ditemukan:*\n• UID "${uid}" tidak valid\n• Periksa kembali UID yang dimasukkan`;
            } else if (apiError.response?.status === 429) {
                errorMessage += '🚫 *Rate Limit:*\n• Terlalu banyak request\n• Tunggu beberapa menit';
            } else {
                errorMessage += `💥 *Error:* Server bermasalah\n\n🔧 *Solusi:*\n• Periksa UID sekali lagi\n• Coba beberapa saat lagi`;
            }

            errorMessage += `\n\n💡 *Tips:*\n• Gunakan UID 9-10 digit\n• Contoh: ${prefix}ffstalk 2134554847`;

            await Wily(errorMessage, msg, sock);
        }

    } catch (error) {
        await Wily('❌ *Terjadi kesalahan sistem!*\n\n🔧 Silakan coba lagi dalam beberapa saat.', msg, sock);
    }
}

module.exports = { handleFFStalkCommand };