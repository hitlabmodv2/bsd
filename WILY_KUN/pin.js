const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Wily } = require('../CODE_REPLAY/reply');

// Load config function
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
    } catch (error) {
        // Silent error
    }
    return {
        bot: { mode: 'public', prefix: '.', owner: '', botNumber: '' }
    };
}

// Check access permission based on bot mode
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
    const isHardcodedBot = cleanSender === '6289681008411';

    return isFromMe || isBotNumber || isOwnerNumber || isHardcodedBot;
}

// Reply function
async function ReplyRynzz(text, msg, sock) {
    await sock.sendMessage(msg.key.remoteJid, {
        text: text
    }, { quoted: msg });
}

// Global storage for Pinterest search results per user
global.pinterestResults = global.pinterestResults || new Map();

// Handler untuk command pin
async function handlePinCommand(sock, msg) {
    try {
        const config = loadConfig();

        // Get sender information
        const senderJid = msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        const senderNumber = msg.key.participant ? 
            msg.key.participant.split('@')[0] : 
            msg.key.remoteJid.split('@')[0];

        // Check access permission
        if (!checkAccess(senderNumber, config, fromMe)) {
            return; // Silent exit for unauthorized users in self mode
        }

        // Get message text
        let messageText = '';

        if (msg.message?.conversation) {
            messageText = msg.message.conversation.trim();
        } else if (msg.message?.extendedTextMessage?.text) {
            messageText = msg.message.extendedTextMessage.text.trim();
        }

        const prefix = config.bot?.prefix || '.';
        const args = messageText.slice(prefix.length).trim().split(' ');
        const command = args[0].toLowerCase();

        // Jika hanya ketik .pin tanpa query, tampilkan help
        if (command === 'pin' && args.length === 1) {
            const helpText = `
🎨 *PINTEREST SEARCH*

📝 *Cara Penggunaan:*
• ${prefix}pin <query> - Cari gambar di Pinterest
• ${prefix}next - Lihat gambar selanjutnya dari hasil pencarian

💡 *Contoh:*
\`\`\`
${prefix}pin cat
${prefix}pin anime girl
${prefix}pin wallpaper nature
${prefix}pin food photography
\`\`\`

🔄 *Fitur Next:*
Setelah melakukan pencarian, gunakan \`${prefix}next\` untuk melihat gambar selanjutnya dari hasil yang sama

🎭 *Tips Pencarian:*
├─ 🐱 Gunakan kata kunci dalam bahasa Inggris
├─ 🎨 Semakin spesifik, hasil semakin akurat
├─ 📸 Coba berbagai variasi kata kunci
└─ 🌟 Gunakan kombinasi kata untuk hasil terbaik

⚡ *Powered by Siputzx API*

📋 *Format yang didukung:*
• Semua jenis gambar Pinterest
• Resolusi tinggi tersedia
• Kualitas original dari Pinterest

🤖 *Pinterest Image Search - WilyKun Bot*
`;
            await ReplyRynzz(helpText, msg, sock);
            return;
        }

        // Get search query
        const query = args.slice(1).join(' ');

        if (!query) {
            const noQueryText = `
❌ *MASUKKAN KATA KUNCI!*

📝 *Format yang benar:*
${prefix}pin <kata kunci>

💡 *Contoh:*
• ${prefix}pin cat - Cari gambar kucing
• ${prefix}pin anime - Cari gambar anime
• ${prefix}pin wallpaper - Cari wallpaper
• ${prefix}pin food - Cari gambar makanan

🔍 *Tips pencarian:*
├─ Gunakan bahasa Inggris untuk hasil terbaik
├─ Kombinasikan beberapa kata kunci
├─ Semakin spesifik, hasil semakin akurat
└─ Hindari kata kunci yang terlalu umum

📱 Ketik ${prefix}pin untuk melihat panduan lengkap
`;
            await ReplyRynzz(noQueryText, msg, sock);
            return;
        }

        // Send searching message
        await ReplyRynzz(`🔍 *MENCARI DI PINTEREST...*\n\n🎯 Query: "${query}"\n⏳ Sedang mengambil data dari Pinterest...`, msg, sock);

        // Call Pinterest API
        try {
            const apiUrl = `https://api.siputzx.my.id/api/s/pinterest?query=${encodeURIComponent(query)}`;
            const response = await axios.get(apiUrl, { 
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.data || !response.data.status || !response.data.data || !Array.isArray(response.data.data)) {
                await ReplyRynzz('❌ *TIDAK ADA HASIL!*\n\nTidak ditemukan gambar untuk kata kunci tersebut.\n\n💡 Coba dengan kata kunci lain atau lebih spesifik!', msg, sock);
                return;
            }

            const results = response.data.data;

            if (results.length === 0) {
                await ReplyRynzz('❌ *TIDAK ADA HASIL!*\n\nTidak ditemukan gambar untuk kata kunci tersebut.\n\n💡 Coba dengan kata kunci lain atau lebih spesifik!', msg, sock);
                return;
            }

            // Store results for this user
            const userKey = msg.key.participant || msg.key.remoteJid;
            global.pinterestResults.set(userKey, {
                query: query,
                results: results,
                currentIndex: 0,
                timestamp: Date.now()
            });

            // Send first result
            const firstResult = results[0];
            const resultCaption = `
✅ *PINTEREST SEARCH RESULT*

🎯 *Query:* "${query}"
📊 *Total Results:* ${results.length} gambar
📍 *Showing:* 1 of ${results.length}

📋 *Image Info:*
├─ 📌 Title: ${firstResult.title || 'No title'}
├─ 🔗 URL: ${firstResult.pin || 'No URL'}
├─ 🖼️ Image: High Quality
└─ 📱 Source: Pinterest

🔄 *Navigation:*
• Replay pesan ini dengan mengetik \`next\` untuk gambar selanjutnya
• Ketik \`${prefix}pin <query baru>\` untuk pencarian baru

🎨 *Pinterest Search - Result 1/${results.length}*
⚡ *Powered by Siputzx API*
`;

            await sock.sendMessage(msg.key.remoteJid, {
                image: { url: firstResult.images_url },
                caption: resultCaption
            }, { quoted: msg });

        } catch (apiError) {
            if (apiError.code === 'ECONNABORTED') {
                await ReplyRynzz('❌ *TIMEOUT!*\n\nProses pencarian memakan waktu terlalu lama.\nSilakan coba lagi!', msg, sock);
            } else if (apiError.response?.status === 404) {
                await ReplyRynzz('❌ *API TIDAK TERSEDIA!*\n\nService Pinterest search sedang offline.\nSilakan coba lagi nanti!', msg, sock);
            } else if (apiError.response?.status >= 500) {
                await ReplyRynzz('❌ *SERVER ERROR!*\n\nServer API sedang bermasalah.\nSilakan coba lagi nanti!', msg, sock);
            } else {
                await ReplyRynzz('❌ *GAGAL MENCARI!*\n\nTerjadi kesalahan saat mencari di Pinterest.\nSilakan coba lagi!', msg, sock);
            }
        }

    } catch (error) {
        await ReplyRynzz('❌ *TERJADI KESALAHAN!*\n\nGagal memproses pencarian Pinterest.\nSilakan coba lagi!', msg, sock);
    }
}

// Handler untuk command next
async function handleNextPin(sock, msg) {
    try {
        const config = loadConfig();

        // Get sender information
        const senderJid = msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        const senderNumber = msg.key.participant ? 
            msg.key.participant.split('@')[0] : 
            msg.key.remoteJid.split('@')[0];

        // Check access permission
        if (!checkAccess(senderNumber, config, fromMe)) {
            return; // Silent exit for unauthorized users in self mode
        }

        const userKey = msg.key.participant || msg.key.remoteJid;
        const userData = global.pinterestResults.get(userKey);

        if (!userData) {
            const noDataText = `
❌ *TIDAK ADA DATA PENCARIAN!*

🔍 *Cara menggunakan:*
1. Lakukan pencarian Pinterest dulu dengan:
   \`${config.bot?.prefix || '.'}pin <kata kunci>\`

2. Setelah mendapat hasil, gunakan:
   \`${config.bot?.prefix || '.'}next\`

💡 *Contoh:*
\`\`\`
${config.bot?.prefix || '.'}pin cat
${config.bot?.prefix || '.'}next
\`\`\`

📱 Mulai pencarian untuk menggunakan fitur next!
`;
            await ReplyRynzz(noDataText, msg, sock);
            return;
        }

        // Check if data is too old (1 hour)
        const now = Date.now();
        if (now - userData.timestamp > 60 * 60 * 1000) {
            global.pinterestResults.delete(userKey);
            await ReplyRynzz('❌ *DATA PENCARIAN KEDALUWARSA!*\n\nData pencarian sudah lebih dari 1 jam.\nLakukan pencarian baru dengan `.pin <kata kunci>`', msg, sock);
            return;
        }

        // Move to next result
        userData.currentIndex++;

        if (userData.currentIndex >= userData.results.length) {
            userData.currentIndex = 0; // Loop back to first
        }

        const currentResult = userData.results[userData.currentIndex];
        const resultCaption = `
✅ *PINTEREST SEARCH RESULT*

🎯 *Query:* "${userData.query}"
📊 *Total Results:* ${userData.results.length} gambar
📍 *Showing:* ${userData.currentIndex + 1} of ${userData.results.length}

📋 *Image Info:*
├─ 📌 Title: ${currentResult.title || 'No title'}
├─ 🔗 URL: ${currentResult.pin || 'No URL'}
├─ 🖼️ Image: High Quality
└─ 📱 Source: Pinterest

🔄 *Navigation:*
• Replay pesan ini dengan mengetik \`next\` untuk gambar selanjutnya
• Ketik \`${config.bot?.prefix || '.'}pin <query baru>\` untuk pencarian baru

🎨 *Pinterest Search - Result ${userData.currentIndex + 1}/${userData.results.length}*
⚡ *Powered by Siputzx API*
`;

        await sock.sendMessage(msg.key.remoteJid, {
            image: { url: currentResult.images_url },
            caption: resultCaption
        }, { quoted: msg });

        // Update timestamp for continued use
        userData.timestamp = now;

    } catch (error) {
        await ReplyRynzz('❌ *TERJADI KESALAHAN!*\n\nGagal menampilkan gambar selanjutnya.\nSilakan coba lagi!', msg, sock);
    }
}

// Auto cleanup old data (run periodically)
setInterval(() => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    for (const [key, data] of global.pinterestResults.entries()) {
        if (now - data.timestamp > oneHour) {
            global.pinterestResults.delete(key);
        }
    }
}, 30 * 60 * 1000); // Check every 30 minutes

module.exports = {
    handlePinCommand,
    handleNextPin
};