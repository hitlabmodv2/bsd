
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

// Storage untuk menyimpan data hasil pencarian terakhir cosplay
const cosplaySearchCache = new Map();

// Function untuk generate nomor acak
function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Main handler function untuk cosplay command
async function handleCosplayCommand(sock, msg) {
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

        // Cek apakah pesan dimulai dengan prefix untuk command cosplay
        if (messageText.startsWith(prefix)) {
            const args = messageText.slice(prefix.length).trim().split(' ');
            const command = args[0].toLowerCase();

            if (command === 'cosplay') {
                // Cek apakah ada query
                if (args.length < 2) {
                    const helpText = `❌ *Format salah!*

📝 *Cara penggunaan:*
${prefix}cosplay <query>
${prefix}cosplay random

💡 *Contoh:*
${prefix}cosplay genshin impact
${prefix}cosplay naruto
${prefix}cosplay anime girl
${prefix}cosplay miku hatsune
${prefix}cosplay random

✅ *Fitur Cosplay:*
• Mencari foto cosplay dari CosplayTele
• Support pemilihan nomor hasil (reply dengan nomor)
• Support mode random untuk hasil acak
• Konten 18+ dari cosplaytele.com
• Hasil berkualitas tinggi

🎯 *Cara memilih hasil:*
• Reply pesan hasil dengan nomor (contoh: 1, 2, 3)
• Reply dengan "random" untuk hasil acak

⚠️ *Perhatian:*
• Fitur ini mencari konten 18+ dari CosplayTele
• Gunakan dengan bijak dan sesuai aturan
• Hanya untuk pengguna dewasa

📊 *Mode Bot:* ${config.bot?.mode?.toUpperCase() || 'PUBLIC'}`;

                    await Wily(helpText, msg, sock);
                    return;
                }

                const query = args.slice(1).join(' ').trim();

                // Cek jika query adalah "random"
                if (query.toLowerCase() === 'random') {
                    // Generate query random dari list
                    const randomQueries = [
                        'anime cosplay', 'genshin impact', 'naruto', 'one piece', 'attack on titan',
                        'demon slayer', 'miku hatsune', 'sailor moon', 'pokemon', 'final fantasy',
                        'league of legends', 'overwatch', 'fate stay night', 'tokyo ghoul', 'bleach'
                    ];
                    const randomQuery = randomQueries[Math.floor(Math.random() * randomQueries.length)];

                    await Wily(`🎲 *Mode Random Aktif*\n🔍 Mencari cosplay dengan query acak: *${randomQuery}*\n⏳ Mohon tunggu...`, msg, sock);

                    try {
                        const response = await axios.get(`https://api.nekorinn.my.id/search/cosplaytele`, {
                            params: { q: randomQuery },
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
                            // Pilih hasil random
                            const randomIndex = Math.floor(Math.random() * results.length);
                            const randomResult = results[randomIndex];

                            // Simpan hasil pencarian ke cache
                            const cacheKey = msg.key.remoteJid;
                            cosplaySearchCache.set(cacheKey, {
                                query: randomQuery,
                                results: results,
                                currentIndex: randomIndex,
                                timestamp: Date.now(),
                                totalResults: results.length
                            });

                            // Format hasil
                            const resultText = `🎭 *COSPLAY RANDOM RESULT*

📝 *Title:* ${randomResult.title || 'N/A'}
📄 *Excerpt:* ${randomResult.excerpt || 'N/A'}
🔗 *URL:* ${randomResult.url || 'N/A'}

🎲 *Random Query:* ${randomQuery}
📈 *Total Results:* ${results.length}
🎯 *Random Result:* ${randomIndex + 1}/${results.length}

💡 *Reply dengan nomor (1-${results.length}) untuk memilih hasil lain*
🎲 *Reply dengan "random" untuk hasil acak lagi*
⚠️ *Content Warning: 18+*`;

                            // Kirim gambar dengan caption
                            if (randomResult.cover) {
                                try {
                                    await sock.sendMessage(msg.key.remoteJid, {
                                        image: { url: randomResult.cover },
                                        caption: resultText
                                    }, { quoted: msg });
                                } catch (imageError) {
                                    await Wily(`${resultText}\n\n🖼️ *Image URL:* ${randomResult.cover}\n\n❌ Gagal mengirim gambar, silakan buka link di atas`, msg, sock);
                                }
                            } else {
                                await Wily(resultText, msg, sock);
                            }

                        } else {
                            await Wily(`❌ Tidak ditemukan hasil untuk query random: *${randomQuery}*\n\n💡 Coba lagi dengan ${prefix}cosplay random`, msg, sock);
                        }

                    } catch (apiError) {
                        await Wily(`❌ Terjadi kesalahan saat mengakses API CosplayTele\n\n💡 Silakan coba lagi nanti`, msg, sock);
                    }
                    return;
                }

                // Loading message untuk query normal
                await Wily(`🔍 Mencari cosplay untuk: *${query}*\n⏳ Mohon tunggu...`, msg, sock);

                try {
                    const response = await axios.get(`https://api.nekorinn.my.id/search/cosplaytele`, {
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
                        // Ambil hasil pertama untuk urutan yang rapi
                        const firstResult = results[0];

                        // Simpan hasil pencarian ke cache untuk fitur pemilihan nomor
                        const cacheKey = msg.key.remoteJid;
                        cosplaySearchCache.set(cacheKey, {
                            query: query,
                            results: results,
                            currentIndex: 0, // Mulai dari index 0
                            timestamp: Date.now(),
                            totalResults: results.length
                        });

                        // Format hasil
                        const resultText = `🎭 *COSPLAY RESULT*

📝 *Title:* ${firstResult.title || 'N/A'}
📄 *Excerpt:* ${firstResult.excerpt || 'N/A'}
🔗 *URL:* ${firstResult.url || 'N/A'}

🔍 *Query:* ${query}
📈 *Total Results:* ${results.length}
🎯 *Current Result:* 1/${results.length}

💡 *Reply dengan nomor (1-${results.length}) untuk memilih hasil*
🎲 *Reply dengan "random" untuk hasil acak*
⚠️ *Content Warning: 18+*`;

                        // Kirim gambar dengan caption
                        if (firstResult.cover) {
                            try {
                                await sock.sendMessage(msg.key.remoteJid, {
                                    image: { url: firstResult.cover },
                                    caption: resultText
                                }, { quoted: msg });
                            } catch (imageError) {
                                // Jika gagal kirim gambar, kirim text saja
                                await Wily(`${resultText}\n\n🖼️ *Image URL:* ${firstResult.cover}\n\n❌ Gagal mengirim gambar, silakan buka link di atas`, msg, sock);
                            }
                        } else {
                            await Wily(resultText, msg, sock);
                        }

                    } else {
                        await Wily(`❌ Tidak ditemukan hasil untuk: *${query}*\n\n💡 Coba dengan kata kunci lain yang lebih spesifik`, msg, sock);
                    }

                } catch (apiError) {
                    await Wily(`❌ Terjadi kesalahan saat mengakses API CosplayTele\n\n💡 Silakan coba lagi nanti atau gunakan kata kunci yang berbeda`, msg, sock);
                }
            }
        }

    } catch (error) {
        await Wily(`❌ Terjadi kesalahan sistem\n\n💡 Silakan coba lagi`, msg, sock);
    }
}

// Function untuk handle pemilihan nomor hasil cosplay
async function handleCosplaySelection(sock, msg) {
    try {
        const cacheKey = msg.key.remoteJid;
        const cachedData = cosplaySearchCache.get(cacheKey);

        if (!cachedData) {
            return false; // Tidak ada cache, return false
        }

        // Cek apakah cache masih valid (30 menit)
        const cacheAge = Date.now() - cachedData.timestamp;
        if (cacheAge > 30 * 60 * 1000) {
            cosplaySearchCache.delete(cacheKey);
            return false;
        }

        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || '';

        const input = messageText.trim().toLowerCase();
        const { results, query } = cachedData;

        let selectedIndex;
        let isRandom = false;

        // Cek apakah input adalah "random"
        if (input === 'random') {
            selectedIndex = Math.floor(Math.random() * results.length);
            isRandom = true;
        } else {
            // Cek apakah input adalah nomor
            const inputNumber = parseInt(input);
            if (isNaN(inputNumber) || inputNumber < 1 || inputNumber > results.length) {
                return false; // Input tidak valid, return false
            }
            selectedIndex = inputNumber - 1; // Convert to 0-based index
        }

        const selectedResult = results[selectedIndex];

        // Update cache dengan index baru
        cachedData.currentIndex = selectedIndex;
        cachedData.timestamp = Date.now();
        cosplaySearchCache.set(cacheKey, cachedData);

        // Format hasil
        const resultText = `🎭 *COSPLAY ${isRandom ? 'RANDOM ' : ''}RESULT*

📝 *Title:* ${selectedResult.title || 'N/A'}
📄 *Excerpt:* ${selectedResult.excerpt || 'N/A'}
🔗 *URL:* ${selectedResult.url || 'N/A'}

🔍 *Query:* ${query}
📈 *Total Results:* ${results.length}
🎯 *${isRandom ? 'Random ' : ''}Result:* ${selectedIndex + 1}/${results.length}

💡 *Reply dengan nomor (1-${results.length}) untuk memilih hasil lain*
🎲 *Reply dengan "random" untuk hasil acak*
⚠️ *Content Warning: 18+*`;

        // Kirim gambar dengan caption
        if (selectedResult.cover) {
            try {
                await sock.sendMessage(msg.key.remoteJid, {
                    image: { url: selectedResult.cover },
                    caption: resultText
                }, { quoted: msg });
                return true;
            } catch (imageError) {
                // Jika gagal kirim gambar, kirim text saja
                await Wily(`${resultText}\n\n🖼️ *Image URL:* ${selectedResult.cover}\n\n❌ Gagal mengirim gambar, silakan buka link di atas`, msg, sock);
                return true;
            }
        } else {
            await Wily(resultText, msg, sock);
            return true;
        }

    } catch (error) {
        return false;
    }
}

// Function untuk handle cosplay selection yang bisa dipanggil dari manapun
async function handleCosplaySelectionGlobal(sock, msg) {
    try {
        const config = loadConfig();

        // Cek akses berdasarkan mode bot
        if (!checkAccess(msg, config)) {
            if (config.bot?.mode === 'self') {
                return false; // Return false untuk menandakan tidak dihandle
            }
        }

        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || '';

        // Cek apakah ada cache cosplay untuk chat ini
        const cacheKey = msg.key.remoteJid;
        const cachedData = cosplaySearchCache.get(cacheKey);

        if (cachedData) {
            const input = messageText.trim().toLowerCase();

            // Cek apakah input adalah nomor valid atau "random"
            if (input === 'random') {
                const result = await handleCosplaySelection(sock, msg);
                return result;
            }

            const inputNumber = parseInt(input);
            if (!isNaN(inputNumber) && inputNumber >= 1 && inputNumber <= cachedData.totalResults) {
                const result = await handleCosplaySelection(sock, msg);
                return result;
            }
        }

        return false; // Return false jika tidak dihandle
    } catch (error) {
        return false;
    }
}

// Cleanup cache setiap 1 jam untuk menghindari memory leak
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of cosplaySearchCache.entries()) {
        if (now - data.timestamp > 60 * 60 * 1000) { // 1 jam
            cosplaySearchCache.delete(key);
        }
    }
}, 60 * 60 * 1000); // Cleanup setiap 1 jam

module.exports = {
    handleCosplayCommand,
    handleCosplaySelection,
    handleCosplaySelectionGlobal,
    checkAccess,
    loadConfig,
    cosplaySearchCache
};
