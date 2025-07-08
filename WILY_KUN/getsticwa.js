
const axios = require('axios');
const cheerio = require('cheerio');
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

// Function to search sticker packs
async function searchSticker(query) {
    try {
        const saa = 'https://getstickerpack.com';
        const res = await axios.get(`${saa}/stickers?query=${encodeURIComponent(query)}`, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(res.data);
        const packs = [];

        $('.sticker-pack-cols a').each((_, el) => {
            const title = $(el).find('.title').text().trim();
            const href = $(el).attr('href')?.trim();
            if (title && href) {
                const fullUrl = href.startsWith('http') ? href : saa + href;
                packs.push({ title, url: fullUrl });
            }
        });

        return packs;
    } catch (error) {
        throw new Error(`Gagal mencari sticker pack: ${error.message}`);
    }
}

// Function to get stickers from pack
async function StickersPack(packUrl) {
    try {
        const res = await axios.get(packUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        const $ = cheerio.load(res.data);
        const links = [];

        $('img.sticker-image').each((_, el) => {
            const src = $(el).attr('data-src-large');
            if (src) links.push(src);
        });

        return links;
    } catch (error) {
        throw new Error(`Gagal mengambil sticker dari pack: ${error.message}`);
    }
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
                    'Connection': 'keep-alive'
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

// Function to convert image to sticker
async function createSticker(imageBuffer, config) {
    try {
        const { Sticker } = require('wa-sticker-formatter');
        
        const sticker = new Sticker(imageBuffer, {
            pack: config?.sticker?.packname || 'WilyKun Bot',
            author: config?.sticker?.author || '© WilyKun',
            type: 'full',
            categories: ['🤖', '🎭'],
            id: '12345',
            quality: 50,
            background: 'transparent'
        });

        return await sticker.toBuffer();
    } catch (error) {
        return null;
    }
}

async function handleGetSticwaCommand(sock, msg) {
    try {
        const config = loadConfig();
        const prefix = config?.bot?.prefix || '.';

        // Get message text
        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || '';

        if (!messageText) return;

        // Check if it's getsticwa command
        const args = messageText.slice(prefix.length).trim().split(' ');
        const command = args[0].toLowerCase();

        if (command !== 'getsticwa') return;

        // Check access based on bot mode
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        const senderNumber = senderJid.split('@')[0];

        if (!checkAccess(senderNumber, config, fromMe)) {
            return;
        }

        // Get query from arguments
        const query = args.slice(1).join(' ').trim();

        // Jika tidak ada query, tampilkan help
        if (!query) {
            const helpText = `╭━━━『 🎭 GET STICKER PACK 』━━━❀
┃ 
┃ 📦 *Download sticker pack dari GetStickerPack!*
┃ 
┃ 📝 *Cara penggunaan:*
┃ ${prefix}getsticwa [kata kunci]
┃ 
┃ 🎯 *Contoh:*
┃ ${prefix}getsticwa gura
┃ ${prefix}getsticwa anime cat
┃ ${prefix}getsticwa cute emoji
┃ ${prefix}getsticwa meme reaction
┃ 
┃ 📊 *Fitur:*
┃ • Pencarian otomatis pack terbaik
┃ • Download semua sticker dari pack
┃ • Konversi ke format WhatsApp
┃ • Maksimal 10 sticker per pack
┃ 
┃ 💡 *Tips pencarian:*
┃ • Gunakan kata kunci yang spesifik
┃ • Coba kata dalam bahasa Inggris
┃ • Kombinasi kata yang relevan
┃ 
┃ 📦 *Pack info:*
┃ • Pack: ${config?.sticker?.packname || 'WilyKun Bot'}
┃ • Author: ${config?.sticker?.author || '© WilyKun'}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Masukkan kata kunci untuk mencari sticker pack!_`;

            await Wily(helpText, msg, sock);
            return;
        }

        // Send searching message
        await Wily(`🔍 *Mencari Sticker Pack...*\n\n📝 Query: "${query}"\n⏳ Sedang mencari di GetStickerPack.com...`, msg, sock);

        try {
            // Search for sticker packs
            const packs = await searchSticker(query);

            if (!packs || packs.length === 0) {
                await Wily(`❌ *Tidak Ditemukan!*\n\nTidak ada sticker pack yang ditemukan untuk: "${query}"\n\n💡 *Coba dengan kata kunci lain:*\n• Gunakan bahasa Inggris\n• Kata yang lebih umum\n• Kombinasi kata berbeda\n\nContoh: ${prefix}getsticwa anime`, msg, sock);
                return;
            }

            // Pick the first (best) pack
            const selectedPack = packs[0];
            
            await Wily(`📦 *Pack Ditemukan!*\n\n🎭 *${selectedPack.title}*\n🔗 ${selectedPack.url}\n\n⏳ Mengambil semua sticker dari pack...`, msg, sock);

            // Get stickers from the selected pack
            const stickers = await StickersPack(selectedPack.url);

            if (!stickers || stickers.length === 0) {
                await Wily(`❌ *Pack Kosong!*\n\nTidak ada sticker ditemukan dalam pack "${selectedPack.title}"\n\n💡 Coba pack lain dengan kata kunci berbeda.`, msg, sock);
                return;
            }

            const maxStickers = 10;
            const stickerCount = Math.min(stickers.length, maxStickers);

            const infoText = `╭━━━『 📦 DOWNLOADING PACK 』━━━❀
┃ 
┃ 🎭 *${selectedPack.title}*
┃ 📊 Total: ${stickers.length} stickers
┃ 💾 Mengirim: ${stickerCount} stickers
┃ 
┃ ⏳ *Sedang mengunduh dan mengkonversi...*
┃ 📦 Pack: ${config?.sticker?.packname || 'WilyKun Bot'}
┃ ✍️ Author: ${config?.sticker?.author || '© WilyKun'}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Mohon tunggu, semua sticker sedang diproses..._`;

            await Wily(infoText, msg, sock);

            let successCount = 0;
            let failedCount = 0;

            // Process stickers in batches
            for (let i = 0; i < stickerCount; i++) {
                try {
                    const stickerUrl = stickers[i];
                    const imageBuffer = await getBuffer(stickerUrl);

                    if (imageBuffer) {
                        const stickerBuffer = await createSticker(imageBuffer, config);

                        if (stickerBuffer && stickerBuffer.length > 0) {
                            await sock.sendMessage(msg.key.remoteJid, {
                                sticker: stickerBuffer,
                                mimetype: 'image/webp'
                            }, { quoted: msg });

                            successCount++;
                        } else {
                            failedCount++;
                        }
                    } else {
                        failedCount++;
                    }

                    // Delay between stickers
                    await new Promise(resolve => setTimeout(resolve, 500));

                } catch (error) {
                    failedCount++;
                }
            }

            const finalText = `╭━━━『 ✅ DOWNLOAD SELESAI 』━━━❀
┃ 
┃ 🎭 *${selectedPack.title}*
┃ ✅ Berhasil: ${successCount} sticker
┃ ❌ Gagal: ${failedCount} sticker
┃ 📊 Total diproses: ${stickerCount} sticker
┃ 
┃ 📦 Pack: ${config?.sticker?.packname || 'WilyKun Bot'}
┃ ✍️ Author: ${config?.sticker?.author || '© WilyKun'}
┃ 
┃ 💡 *Sticker pack siap digunakan!*
┃ 🎯 Semua sticker telah dikirim
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Selamat menggunakan sticker pack baru!_`;

            await Wily(finalText, msg, sock);

        } catch (apiError) {
            let errorMessage = '❌ *GAGAL MENGAMBIL DATA!*\n\n';

            if (apiError.message?.includes('timeout')) {
                errorMessage += '⏰ *Timeout:*\n• Server GetStickerPack tidak merespons\n• Coba lagi dalam beberapa menit';
            } else if (apiError.message?.includes('Network Error')) {
                errorMessage += '🌐 *Koneksi Bermasalah:*\n• Periksa koneksi internet\n• Server mungkin sedang down';
            } else {
                errorMessage += `💥 *Error:* ${apiError.message}\n\n🔧 *Solusi:*\n• Periksa kata kunci sekali lagi\n• Coba beberapa saat lagi`;
            }

            errorMessage += `\n\n💡 *Tips:*\n• Gunakan kata kunci yang populer\n• Contoh: ${prefix}getsticwa anime`;

            await Wily(errorMessage, msg, sock);
        }

    } catch (error) {
        await Wily('❌ *Terjadi kesalahan sistem!*\n\n🔧 Silakan coba lagi dalam beberapa saat.', msg, sock);
    }
}

module.exports = { handleGetSticwaCommand };
