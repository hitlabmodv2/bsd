
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

// Storage untuk menyimpan data hasil pencarian terakhir
const pixivSfwSearchCache = new Map();

// Main handler function untuk pixiv command
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

        // Cek jika ini adalah reply dengan "next" - hanya untuk pixiv SFW cache
        if (messageText.toLowerCase().trim() === 'next') {
            const cacheKey = msg.key.remoteJid;
            const cachedData = pixivSfwSearchCache.get(cacheKey);

            // Hanya handle jika cache pixiv SFW ada
            if (cachedData) {
                await handleNextPixiv(sock, msg);
                return;
            }
        }

        // Cek jika ini adalah reply dengan "next" dan ada quoted message - hanya untuk pixiv SFW
        if (msg.message?.extendedTextMessage?.text?.toLowerCase().trim() === 'next') {
            const cacheKey = msg.key.remoteJid;
            const cachedData = pixivSfwSearchCache.get(cacheKey);

            // Hanya handle jika cache pixiv SFW ada
            if (cachedData) {
                await handleNextPixiv(sock, msg);
                return;
            }
        }

        // Cek apakah pesan dimulai dengan prefix
        if (!messageText.startsWith(prefix)) {
            return;
        }

        const args = messageText.slice(prefix.length).trim().split(' ');
        const command = args[0].toLowerCase();

        if (command === 'pixiv') {
            // Cek apakah ada query
            if (args.length < 2) {
                const helpText = `❌ *Format salah!*

📝 *Cara penggunaan:*
${prefix}pixiv <query>

💡 *Contoh:*
${prefix}pixiv genshin impact
${prefix}pixiv hatsune miku
${prefix}pixiv anime girl
${prefix}pixiv kanna kobayashi

✅ *Fitur Pixiv SFW:*
• Mencari fanart aman dari Pixiv
• Semua konten SFW (Safe for Work)
• Tidak ada konten R18+
• Support fitur "next" untuk gambar berikutnya

📊 *Mode Bot:* ${config.bot?.mode?.toUpperCase() || 'PUBLIC'}
🌟 *Fitur ini dapat digunakan semua orang*`;

                await sendQuotedMessage(sock, msg.key.remoteJid, helpText, msg);
                return;
            }

            const query = args.slice(1).join(' ').trim();

            // Loading message
            await sendQuotedMessage(sock, msg.key.remoteJid, 
                `🔍 Mencari gambar pixiv SFW untuk: *${query}*\n⏳ Mohon tunggu...`, msg);

            try {
                const response = await axios.get(`https://api.nekorinn.my.id/search/pixiv`, {
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
                    // Filter untuk memastikan konten SFW (buang yang ada tag R-18)
                    const sfwResults = results.filter(item => {
                        const tags = item.tags || '';
                        return !tags.toLowerCase().includes('r-18') && 
                               !tags.toLowerCase().includes('r18') &&
                               !tags.toLowerCase().includes('nsfw');
                    });

                    if (sfwResults.length === 0) {
                        await sendQuotedMessage(sock, msg.key.remoteJid, 
                            `⚠️ Tidak ditemukan hasil SFW untuk: *${query}*\n\n💡 Coba dengan kata kunci yang lebih umum atau karakter anime populer`, msg);
                        return;
                    }

                    const randomResult = sfwResults[Math.floor(Math.random() * sfwResults.length)];

                    // Simpan hasil pencarian ke cache untuk fitur next
                    const cacheKey = msg.key.remoteJid;
                    pixivSfwSearchCache.set(cacheKey, {
                        query: query,
                        results: sfwResults,
                        currentIndex: sfwResults.indexOf(randomResult),
                        timestamp: Date.now()
                    });

                    // Bersihkan tags dari konten yang tidak pantas untuk display yang lebih bersih
                    let cleanTags = randomResult.tags || 'N/A';
                    if (cleanTags !== 'N/A') {
                        cleanTags = cleanTags.split(',').map(tag => tag.trim()).filter(tag => 
                            !tag.toLowerCase().includes('r-18') && 
                            !tag.toLowerCase().includes('r18') &&
                            !tag.toLowerCase().includes('nsfw')
                        ).join(', ');
                    }

                    // Format hasil
                    const resultText = `🎨 *PIXIV SFW RESULT*

📝 *Caption:* ${randomResult.caption || 'N/A'}
👤 *Author:* ${randomResult.author || 'Unknown'}
🏷️ *Tags:* ${cleanTags}
📅 *Upload Date:* ${randomResult.uploadDate || 'N/A'}
📊 *Type:* ${randomResult.type || 'Illustration'}

🔍 *Query:* ${query}
📈 *Total Results:* ${sfwResults.length}
🎯 *Current Result:* ${sfwResults.indexOf(randomResult) + 1}/${sfwResults.length}

💡 *Reply dengan "next" untuk gambar berikutnya*
✅ *Content: SFW (Safe for Work)*`;

                    // Kirim gambar dengan caption
                    if (randomResult.imageUrl) {
                        try {
                            const sentMsg = await sock.sendMessage(msg.key.remoteJid, {
                                image: { url: randomResult.imageUrl },
                                caption: resultText
                            }, { quoted: msg });

                            // Update cache dengan message ID untuk referensi
                            const cachedData = pixivSfwSearchCache.get(cacheKey);
                            if (cachedData) {
                                cachedData.lastMessageId = sentMsg.key.id;
                                pixivSfwSearchCache.set(cacheKey, cachedData);
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
                        `❌ Tidak ditemukan hasil untuk: *${query}*\n\n💡 Coba dengan kata kunci lain yang lebih spesifik atau karakter anime populer`, msg);
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

// Function untuk handle next pixiv
async function handleNextPixiv(sock, msg) {
    try {
        const cacheKey = msg.key.remoteJid;
        const cachedData = pixivSfwSearchCache.get(cacheKey);

        if (!cachedData) {
            await sendQuotedMessage(sock, msg.key.remoteJid, 
                `❌ Tidak ada data pencarian sebelumnya\n\n💡 Gunakan command pixiv terlebih dahulu`, msg);
            return;
        }

        // Cek apakah cache masih valid (30 menit)
        const cacheAge = Date.now() - cachedData.timestamp;
        if (cacheAge > 30 * 60 * 1000) {
            pixivSfwSearchCache.delete(cacheKey);
            await sendQuotedMessage(sock, msg.key.remoteJid, 
                `⏰ Data pencarian sudah kadaluarsa\n\n💡 Gunakan command pixiv untuk pencarian baru`, msg);
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
        pixivSfwSearchCache.set(cacheKey, cachedData);

        // Bersihkan tags untuk display
        let cleanTags = nextResult.tags || 'N/A';
        if (cleanTags !== 'N/A') {
            cleanTags = cleanTags.split(',').map(tag => tag.trim()).filter(tag => 
                !tag.toLowerCase().includes('r-18') && 
                !tag.toLowerCase().includes('r18') &&
                !tag.toLowerCase().includes('nsfw')
            ).join(', ');
        }

        // Format hasil
        const resultText = `🎨 *PIXIV SFW RESULT*

📝 *Caption:* ${nextResult.caption || 'N/A'}
👤 *Author:* ${nextResult.author || 'Unknown'}
🏷️ *Tags:* ${cleanTags}
📅 *Upload Date:* ${nextResult.uploadDate || 'N/A'}
📊 *Type:* ${nextResult.type || 'Illustration'}

🔍 *Query:* ${query}
📈 *Total Results:* ${results.length}
🎯 *Current Result:* ${nextIndex + 1}/${results.length}

💡 *Reply dengan "next" untuk gambar berikutnya*
✅ *Content: SFW (Safe for Work)*`;

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
                pixivSfwSearchCache.set(cacheKey, cachedData);
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
    for (const [key, data] of pixivSfwSearchCache.entries()) {
        if (now - data.timestamp > 60 * 60 * 1000) { // 1 jam
            pixivSfwSearchCache.delete(key);
        }
    }
}, 60 * 60 * 1000); // Cleanup setiap 1 jam

module.exports = {
    handlePixivCommand,
    handleNextPixiv,
    checkAccess,
    loadConfig,
    pixivSfwSearchCache
};
