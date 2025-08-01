
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
        return {};
    } catch (error) {
        return {};
    }
}

// Function untuk mengecek akses berdasarkan mode bot
function checkAccess(msg, config) {
    const botNumber = config.bot?.botNumber;
    let actualSenderNumber;

    if (msg.key.participant) {
        actualSenderNumber = msg.key.participant.split('@')[0];
    } else if (msg.key.fromMe) {
        actualSenderNumber = botNumber;  
    } else {
        actualSenderNumber = msg.key.remoteJid?.split('@')[0];
    }

    if (config.bot?.mode === 'self') {
        const isFromMe = msg.key.fromMe === true;
        const isBotNumber = actualSenderNumber === botNumber;
        const isOwnerNumber = actualSenderNumber === config.bot?.owner;
        const isBotNumberFromConfig = actualSenderNumber === config.bot?.botNumber;
        const isHardcodedBot = actualSenderNumber === '6289681008411';

        return isFromMe || isBotNumber || isOwnerNumber || isBotNumberFromConfig || isHardcodedBot;
    } else {
        return true; // Mode public, semua bisa akses
    }
}

// Function untuk send quoted message
async function sendQuotedMessage(sock, jid, text, quotedMsg) {
    try {
        await sock.sendMessage(jid, { 
            text: text 
        }, { 
            quoted: quotedMsg 
        });
    } catch (error) {
        console.log('Error sending quoted message:', error);
    }
}

// Storage untuk menyimpan data hasil pencarian terakhir pixiv18
const pixiv18SearchCache = new Map();

// Main handler function untuk pixiv18 command
async function handlePixivCommand(sock, msg) {
    try {
        const config = loadConfig();

        // Cek akses berdasarkan mode bot
        if (!checkAccess(msg, config)) {
            if (config.bot?.mode === 'self') {
                return; // Bot diam saja dalam mode self
            }
        }

        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || '';

        const prefix = config.bot?.prefix || '.';

        // Cek jika ini adalah reply dengan "next" - hanya untuk pixiv18 cache
        if (messageText.toLowerCase().trim() === 'next') {
            const cacheKey = msg.key.remoteJid;
            const cachedData = pixiv18SearchCache.get(cacheKey);

            // Hanya handle jika cache pixiv18 ada
            if (cachedData) {
                await handleNextPixiv18(sock, msg);
                return;
            }
        }

        // Cek jika ini adalah reply dengan "next" dan ada quoted message - hanya untuk pixiv18
        if (msg.message?.extendedTextMessage?.text?.toLowerCase().trim() === 'next') {
            const cacheKey = msg.key.remoteJid;
            const cachedData = pixiv18SearchCache.get(cacheKey);

            // Hanya handle jika cache pixiv18 ada
            if (cachedData) {
                await handleNextPixiv18(sock, msg);
                return;
            }
        }

        // Cek apakah pesan dimulai dengan prefix
        if (!messageText.startsWith(prefix)) {
            return;
        }

        const args = messageText.slice(prefix.length).trim().split(' ');
        const command = args[0].toLowerCase();

        if (command === 'pixiv18') {
            // Cek apakah ada query
            if (args.length < 2) {
                const helpText = `❌ *Format salah!*

📝 *Cara penggunaan:*
${prefix}pixiv18 <query>

💡 *Contoh:*
${prefix}pixiv18 azur lane
${prefix}pixiv18 hatsune miku
${prefix}pixiv18 genshin impact

✅ *Fitur Pixiv R18:*
• Mencari fanart R18+ dari Pixiv
• Support fitur "next" untuk gambar berikutnya
• Hanya untuk pengguna dewasa

⚠️ *Perhatian:*
• Fitur ini mencari konten R18+ dari Pixiv18
• Gunakan dengan bijak dan sesuai aturan

📊 *Mode Bot:* ${config.bot?.mode?.toUpperCase() || 'PUBLIC'}`;

                await sendQuotedMessage(sock, msg.key.remoteJid, helpText, msg);
                return;
            }

            const query = args.slice(1).join(' ').trim();

            // Loading message
            await sendQuotedMessage(sock, msg.key.remoteJid, 
                `🔍 Mencari gambar pixiv r18 untuk: *${query}*\n⏳ Mohon tunggu...`, msg);

            try {
                const response = await axios.get(`https://api.nekorinn.my.id/search/pixivr18`, {
                    params: { q: query },
                    timeout: 15000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });

                let results = [];
                if (response.data && response.data.status && response.data.result) {
                    results = response.data.result;
                }

                if (results && results.length > 0) {
                    const randomResult = results[Math.floor(Math.random() * results.length)];

                    // Simpan hasil pencarian ke cache untuk fitur next
                    const cacheKey = msg.key.remoteJid;
                    pixiv18SearchCache.set(cacheKey, {
                        query: query,
                        results: results,
                        currentIndex: results.indexOf(randomResult),
                        timestamp: Date.now()
                    });

                    // Format hasil
                    const resultText = `🎨 *PIXIV R18 RESULT*

📝 *Caption:* ${randomResult.caption || 'N/A'}
👤 *Author:* ${randomResult.author || 'Unknown'}
🏷️ *Tags:* ${randomResult.tags || 'N/A'}
📅 *Upload Date:* ${randomResult.uploadDate || 'N/A'}
📊 *Type:* ${randomResult.type || 'Illustration'}

🔍 *Query:* ${query}
📈 *Total Results:* ${results.length}
🎯 *Current Result:* ${results.indexOf(randomResult) + 1}/${results.length}

💡 *Reply dengan "next" untuk gambar berikutnya*
⚠️ *Content Warning: R18+*`;

                    // Kirim gambar dengan caption
                    if (randomResult.imageUrl) {
                        try {
                            const sentMsg = await sock.sendMessage(msg.key.remoteJid, {
                                image: { url: randomResult.imageUrl },
                                caption: resultText
                            }, { quoted: msg });

                            // Update cache dengan message ID untuk referensi
                            const cachedData = pixiv18SearchCache.get(cacheKey);
                            if (cachedData) {
                                cachedData.lastMessageId = sentMsg.key.id;
                                pixiv18SearchCache.set(cacheKey, cachedData);
                            }
                        } catch (imageError) {
                            // Jika gagal kirim gambar, kirim text saja
                            await sendQuotedMessage(sock, msg.key.remoteJid, 
                                `${resultText}\n\n🖼️ *Image URL:* ${randomResult.imageUrl}\n\n❌ Gagal mengirim gambar, silakan buka link di atas`, msg);
                        }
                    } else {
                        await sendQuotedMessage(sock, msg.key.remoteJid, resultText, msg);
                    }

                } else {
                    await sendQuotedMessage(sock, msg.key.remoteJid, 
                        `❌ Tidak ditemukan hasil untuk: *${query}*\n\n💡 Coba dengan kata kunci lain yang lebih spesifik`, msg);
                }

            } catch (apiError) {
                await sendQuotedMessage(sock, msg.key.remoteJid, 
                    `❌ Terjadi kesalahan saat mengakses API Pixiv\n\n💡 Silakan coba lagi nanti atau gunakan kata kunci yang berbeda`, msg);
            }
        }

    } catch (error) {
        await sendQuotedMessage(sock, msg.key.remoteJid, 
            `❌ Terjadi kesalahan sistem\n\n💡 Silakan coba lagi`, msg);
    }
}

// Function untuk handle next pixiv18
async function handleNextPixiv18(sock, msg) {
    try {
        const cacheKey = msg.key.remoteJid;
        const cachedData = pixiv18SearchCache.get(cacheKey);

        if (!cachedData) {
            await sendQuotedMessage(sock, msg.key.remoteJid, 
                `❌ Tidak ada data pencarian sebelumnya\n\n💡 Gunakan command pixiv18 terlebih dahulu`, msg);
            return;
        }

        // Cek apakah cache masih valid (30 menit)
        const cacheAge = Date.now() - cachedData.timestamp;
        if (cacheAge > 30 * 60 * 1000) {
            pixiv18SearchCache.delete(cacheKey);
            await sendQuotedMessage(sock, msg.key.remoteJid, 
                `⏰ Data pencarian sudah kadaluarsa\n\n💡 Gunakan command pixiv18 untuk pencarian baru`, msg);
            return;
        }

        const { results, currentIndex, query } = cachedData;

        // Pilih gambar berikutnya secara random (tapi tidak sama dengan yang sebelumnya)
        let nextIndex;
        if (results.length === 1) {
            nextIndex = 0; // Jika hanya 1 hasil, tampilkan yang sama
        } else {
            do {
                nextIndex = Math.floor(Math.random() * results.length);
            } while (nextIndex === currentIndex);
        }

        const nextResult = results[nextIndex];

        // Update cache dengan index baru
        cachedData.currentIndex = nextIndex;
        cachedData.timestamp = Date.now();
        pixiv18SearchCache.set(cacheKey, cachedData);

        // Format hasil
        const resultText = `🎨 *PIXIV R18 RESULT*

📝 *Caption:* ${nextResult.caption || 'N/A'}
👤 *Author:* ${nextResult.author || 'Unknown'}
🏷️ *Tags:* ${nextResult.tags || 'N/A'}
📅 *Upload Date:* ${nextResult.uploadDate || 'N/A'}
📊 *Type:* ${nextResult.type || 'Illustration'}

🔍 *Query:* ${query}
📈 *Total Results:* ${results.length}
🎯 *Current Result:* ${nextIndex + 1}/${results.length}

💡 *Reply dengan "next" untuk gambar berikutnya*
⚠️ *Content Warning: R18+*`;

        // Loading message
        await sendQuotedMessage(sock, msg.key.remoteJid, 
            `🔄 Mengambil gambar berikutnya...\n⏳ Mohon tunggu...`, msg);

        // Kirim gambar dengan caption
        if (nextResult.imageUrl) {
            try {
                const sentMsg = await sock.sendMessage(msg.key.remoteJid, {
                    image: { url: nextResult.imageUrl },
                    caption: resultText
                }, { quoted: msg });

                // Update cache dengan message ID baru
                cachedData.lastMessageId = sentMsg.key.id;
                pixiv18SearchCache.set(cacheKey, cachedData);
            } catch (imageError) {
                // Jika gagal kirim gambar, kirim text saja
                await sendQuotedMessage(sock, msg.key.remoteJid, 
                    `${resultText}\n\n🖼️ *Image URL:* ${nextResult.imageUrl}\n\n❌ Gagal mengirim gambar, silakan buka link di atas`, msg);
            }
        } else {
            await sendQuotedMessage(sock, msg.key.remoteJid, resultText, msg);
        }

    } catch (error) {
        await sendQuotedMessage(sock, msg.key.remoteJid, 
            `❌ Terjadi kesalahan saat mengambil gambar berikutnya\n\n💡 Silakan coba lagi`, msg);
    }
}

// Cleanup cache setiap 1 jam untuk menghindari memory leak
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of pixiv18SearchCache.entries()) {
        if (now - data.timestamp > 60 * 60 * 1000) { // 1 jam
            pixiv18SearchCache.delete(key);
        }
    }
}, 60 * 60 * 1000); // Cleanup setiap 1 jam

module.exports = {
    handlePixivCommand,
    handleNextPixiv18,
    checkAccess,
    loadConfig,
    pixiv18SearchCache
};
