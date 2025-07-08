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
function checkAccess(senderNumber, config) {
    if (!config || !config.bot) return false;

    const botMode = config.bot.mode || 'public';
    const ownerNumber = config.bot.owner || '';
    const botNumber = config.bot.botNumber || '';

    // Remove @s.whatsapp.net if present
    const cleanSender = senderNumber.replace('@s.whatsapp.net', '');
    const cleanOwner = ownerNumber.replace('@s.whatsapp.net', '');
    const cleanBot = botNumber.replace('@s.whatsapp.net', '');

    if (botMode === 'self') {
        // Only owner and bot number can use
        return cleanSender === cleanOwner || cleanSender === cleanBot;
    } else if (botMode === 'public') {
        // Everyone can use
        return true;
    }

    return false;
}

// ReplyRynzz function for beautiful responses
async function ReplyRynzz(teks, msg, sock) {
    const hariini = new Date().toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
    const packname = "Anime Scraper WilyKun";
    const nedd = {
        contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterName: "Anime Scraper Bot",
                newsletterJid: "120363312297133690@newsletter",
            },
            externalAdReply: {
                showAdAttribution: true,
                title: `${hariini}`,
                body: `${packname}`,
                previewType: "IMAGE",
                thumbnailUrl: "https://files.catbox.moe/9cq0yk.jpg",
                sourceUrl: "https://wa.me/6289688206739",
                mediaType: 1,
                renderLargerThumbnail: false
            },
        },
        text: teks,
    };
    return sock.sendMessage(msg.key.remoteJid, nedd, {
        quoted: msg,
    });
}

// Daftar kategori anime yang tersedia dan sudah diverifikasi working
const animeCategories = {
    // ======== SFW CATEGORIES ========
    sfw: {
        'waifu': 'https://api.waifu.pics/sfw/waifu',
        'neko': 'https://api.waifu.pics/sfw/neko',
        'shinobu': 'https://api.waifu.pics/sfw/shinobu',
        'megumin': 'https://api.waifu.pics/sfw/megumin',
        'bully': 'https://api.waifu.pics/sfw/bully',
        'cuddle': 'https://api.waifu.pics/sfw/cuddle',
        'cry': 'https://api.waifu.pics/sfw/cry',
        'hug': 'https://api.waifu.pics/sfw/hug',
        'awoo': 'https://api.waifu.pics/sfw/awoo',
        'kiss': 'https://api.waifu.pics/sfw/kiss',
        'lick': 'https://api.waifu.pics/sfw/lick',
        'pat': 'https://api.waifu.pics/sfw/pat',
        'smug': 'https://api.waifu.pics/sfw/smug',
        'bonk': 'https://api.waifu.pics/sfw/bonk',
        'yeet': 'https://api.waifu.pics/sfw/yeet',
        'blush': 'https://api.waifu.pics/sfw/blush',
        'smile': 'https://api.waifu.pics/sfw/smile',
        'wave': 'https://api.waifu.pics/sfw/wave',
        'highfive': 'https://api.waifu.pics/sfw/highfive',
        'handhold': 'https://api.waifu.pics/sfw/handhold',
        'nom': 'https://api.waifu.pics/sfw/nom',
        'bite': 'https://api.waifu.pics/sfw/bite',
        'glomp': 'https://api.waifu.pics/sfw/glomp',
        'slap': 'https://api.waifu.pics/sfw/slap',
        'kill': 'https://api.waifu.pics/sfw/kill',
        'kick': 'https://api.waifu.pics/sfw/kick',
        'happy': 'https://api.waifu.pics/sfw/happy',
        'wink': 'https://api.waifu.pics/sfw/wink',
        'poke': 'https://api.waifu.pics/sfw/poke',
        'dance': 'https://api.waifu.pics/sfw/dance',
        'cringe': 'https://api.waifu.pics/sfw/cringe'
    },

    // ======== NSFW CATEGORIES ========
    nsfw: {
        'waifu18': 'https://api.waifu.pics/nsfw/waifu',
        'neko18': 'https://api.waifu.pics/nsfw/neko',
        'trap': 'https://api.waifu.pics/nsfw/trap',
        'blowjob': 'https://api.waifu.pics/nsfw/blowjob',
        'cum': 'https://api.waifu.pics/nsfw/cum',
        'milf': 'https://api.waifu.pics/type/milf',
        'paizuri': 'https://api.waifu.pics/type/paizuri',
        'tentacle': 'https://api.waifu.pics/type/tentacle',
        'succubus': 'https://api.waifu.pics/type/succubus',
        'shinobu18': 'https://api.waifu.pics/type/shinobu',
        'megumin18': 'https://api.waifu.pics/type/megumin',
        'bdsm': 'https://api.waifu.pics/type/bdsm',
        'hentai': 'https://api.waifu.pics/type/hentai',
        'ahegao': 'https://api.waifu.pics/type/ahegao',
        'uniform': 'https://api.waifu.pics/type/uniform',
        'orgy': 'https://api.waifu.pics/type/orgy',
        'maid': 'https://api.waifu.pics/type/maid',
        'marin': 'https://api.waifu.pics/type/marin-kitagawa',
        'raiden': 'https://api.waifu.pics/type/raiden-shogun',
        'oppai': 'https://api.waifu.pics/type/oppai',
        'selfies': 'https://api.waifu.pics/type/selfies',
        'oral': 'https://api.waifu.pics/many/oral',
        'ass': 'https://api.waifu.pics/many/ass',
        'boobs': 'https://api.waifu.pics/many/boobs',
        'thigh': 'https://api.waifu.pics/many/thigh',
        'pussy': 'https://api.waifu.pics/many/pussy',
        'classic': 'https://api.waifu.pics/many/classic',
        'kitsune': 'https://api.waifu.pics/many/kitsune',
        'kemonomimi': 'https://api.waifu.pics/many/kemonomimi',
        'public': 'https://api.waifu.pics/many/public',
        'ero': 'https://api.waifu.pics/many/ero',
        'elf': 'https://api.waifu.pics/many/elf',
        'yuri': 'https://api.waifu.pics/many/yuri',
        'pantsu': 'https://api.waifu.pics/many/pantsu',
        'glasses': 'https://api.waifu.pics/many/glasses'
    }
};

// Fungsi untuk mendapatkan informasi format file dari URL
function getFileFormat(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname.toLowerCase();
        const extension = pathname.split('.').pop();

        const imageFormats = {
            'jpg': 'JPEG',
            'jpeg': 'JPEG',
            'png': 'PNG',
            'gif': 'GIF',
            'webp': 'WebP',
            'bmp': 'BMP',
            'svg': 'SVG',
            'ico': 'ICO',
            'tiff': 'TIFF',
            'tif': 'TIFF',
            'avif': 'AVIF',
            'heic': 'HEIC',
            'heif': 'HEIF'
        };

        return imageFormats[extension] || 'Unknown';
    } catch (error) {
        return 'Unknown';
    }
}

// Fungsi untuk memvalidasi URL gambar
async function validateImageUrl(url) {
    try {
        const response = await axios.head(url, {
            timeout: 5000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const contentType = response.headers['content-type'] || '';
        const contentLength = response.headers['content-length'] || 0;

        // Cek apakah content-type adalah gambar
        const isImage = contentType.startsWith('image/') ||
            contentType.includes('gif') ||
            contentType.includes('jpeg') ||
            contentType.includes('png') ||
            contentType.includes('webp');

        return {
            isValid: isImage && response.status === 200,
            contentType: contentType,
            size: parseInt(contentLength) || 0,
            sizeFormatted: formatFileSize(parseInt(contentLength) || 0)
        };
    } catch (error) {
        return { isValid: false, contentType: '', size: 0, sizeFormatted: '0 B' };
    }
}

// Fungsi untuk format ukuran file
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function getAnimeImage(category) {
    try {
        // Cek kategori di SFW atau NSFW
        let apiUrl = null;
        let categoryType = '';

        if (animeCategories.sfw[category]) {
            apiUrl = animeCategories.sfw[category];
            categoryType = 'SFW';
        } else if (animeCategories.nsfw[category]) {
            apiUrl = animeCategories.nsfw[category];
            categoryType = 'NSFW';
        }

        if (!apiUrl) {
            throw new Error('Kategori tidak ditemukan');
        }

        const response = await axios.get(apiUrl, {
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (response.data && response.data.url) {
            const imageUrl = response.data.url;

            // Validasi URL gambar
            const validation = await validateImageUrl(imageUrl);

            if (validation.isValid) {
                const fileFormat = getFileFormat(imageUrl);

                return {
                    url: imageUrl,
                    category: category,
                    categoryType: categoryType,
                    source: 'waifu.pics',
                    format: fileFormat,
                    contentType: validation.contentType,
                    size: validation.size,
                    sizeFormatted: validation.sizeFormatted,
                    isAnimated: validation.contentType.includes('gif') || fileFormat === 'GIF'
                };
            }
        }

        throw new Error('API tidak merespons dengan gambar valid');

    } catch (error) {
        throw error;
    }
}

async function animeScraperHandler(msg, sock) {
    try {
        const config = loadConfig();
        const prefix = config.bot.prefix || '.';

        // Ambil konten pesan
        let messageContent = '';

        if (msg.message?.conversation) {
            messageContent = msg.message.conversation.trim();
        } else if (msg.message?.extendedTextMessage?.text) {
            messageContent = msg.message.extendedTextMessage.text.trim();
        }

        // Cek apakah dimulai dengan prefix
        if (!messageContent.startsWith(prefix)) {
            return;
        }

        const command = messageContent.substring(prefix.length).toLowerCase();

        // Ekstrak nomor pengirim yang tepat
        const botNumber = sock.user?.id?.split(':')[0];
        let senderNumber;

        if (msg.key.participant) {
            // Untuk grup - ambil participant
            senderNumber = msg.key.participant.split('@')[0];
        } else if (msg.key.fromMe) {
            // Pesan dari bot sendiri
            senderNumber = botNumber;
        } else {
            // Private chat
            senderNumber = msg.key.remoteJid?.split('@')[0];
        }

        // Validasi akses berdasarkan mode bot
        if (!checkAccess(senderNumber, config)) {
            if (config.bot.mode === 'self') {
                // Mode self - bot diam saja, tidak ada response
                return;
            }
            // Mode public - semua bisa akses, tapi ini seharusnya tidak terjadi karena checkAccess return true untuk public
            return;
        }

        // Daftar command yang dihandle
        const validCommands = [
            'anime', 'animelist', 'animehelp',
            ...Object.keys(animeCategories.sfw),
            ...Object.keys(animeCategories.nsfw)
        ];

        if (!validCommands.includes(command)) return;

        // Handle command anime/animelist/animehelp
        if (command === 'anime' || command === 'animelist' || command === 'animehelp') {
            const sfwList = Object.keys(animeCategories.sfw).map(cat => `${prefix}${cat}`).join(', ');
            const nsfwList = Object.keys(animeCategories.nsfw).map(cat => `${prefix}${cat}`).join(', ');

            const helpText = `
╭━━━『 🎌 ANIME SCRAPER 🎌 』━━━❀
┃ 
┃ 📊 Total Kategori: ${Object.keys(animeCategories.sfw).length + Object.keys(animeCategories.nsfw).length}
┃ 🔧 Mode Bot: ${config.bot.mode.toUpperCase()}
┃ ⚡ Prefix: ${prefix}
┃
┃ 🟢 *SFW CATEGORIES (${Object.keys(animeCategories.sfw).length}):*
┃ ${sfwList}
┃
┃ 🔞 *NSFW CATEGORIES (${Object.keys(animeCategories.nsfw).length}):*
┃ ${nsfwList}
┃
┃ 🖼️ *FORMAT SUPPORT:*
┃ • JPEG, PNG, WebP, GIF
┃ • BMP, SVG, TIFF, AVIF
┃ • HEIC, HEIF, ICO
┃ • 🎞️ Animated GIF Support
┃
┃ 💡 *CONTOH PENGGUNAAN:*
┃ • ${prefix}waifu → Gambar waifu SFW
┃ • ${prefix}neko → Gambar neko SFW  
┃ • ${prefix}hentai → Gambar hentai NSFW
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

🤖 *Anime Scraper by WilyKun Bot*
✨ *Semua format gambar didukung termasuk GIF animasi!*`;

            await Wily(helpText, msg, sock);
            return;
        }

        // Handle kategori anime spesifik
        if (animeCategories.sfw[command] || animeCategories.nsfw[command]) {
            // Send loading message
            await Wily(`⏳ Sedang mengambil gambar ${command}... Please wait!`, msg, sock);

            try {
                // Get anime image
                const result = await getAnimeImage(command);

                if (result && result.url) {
                    // Tentukan emoji berdasarkan format
                    let formatEmoji = "🖼️";
                    if (result.isAnimated) {
                        formatEmoji = "🎞️";
                    } else if (result.format === 'PNG') {
                        formatEmoji = "🖼️";
                    } else if (result.format === 'JPEG') {
                        formatEmoji = "📷";
                    } else if (result.format === 'WebP') {
                        formatEmoji = "🌐";
                    }

                    // Buat caption dengan informasi lengkap
                    const caption = `
╭━━━『 🎌 ANIME ${command.toUpperCase()} 🎌 』━━━❀
┃ 
┃ 🏷️ Kategori: ${result.categoryType}
┃ ${formatEmoji} Format: ${result.format}
┃ 📏 Ukuran: ${result.sizeFormatted}
┃ ${result.isAnimated ? '🎞️ Animasi: Ya' : '🖼️ Animasi: Tidak'}
┃ 📷 Source: ${result.source}
┃ 🌐 Type: ${result.contentType}
┃ ⚡ Prefix: ${prefix}
┃ 🔧 Mode: ${config.bot.mode.toUpperCase()}
┃
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

🤖 *Powered by WilyKun Bot* ✨`;

                    // Send the image dengan dukungan semua format
                    let sendSuccess = false;
                    let retryCount = 0;
                    const maxRetries = 3;

                    while (!sendSuccess && retryCount < maxRetries) {
                        try {
                            if (result.format === 'GIF' || result.isAnimated) {
                                // GIF dikirim sebagai document
                                await sock.sendMessage(msg.key.remoteJid, {
                                    document: { url: result.url },
                                    fileName: `anime_${command}_${Date.now()}.gif`,
                                    mimetype: 'image/gif',
                                    caption: caption
                                }, { quoted: msg });

                                await Wily(`🎞️ GIF anime ${command} berhasil dikirim!\n\n✨ Format: ${result.format} (${result.categoryType})\n📏 Size: ${result.sizeFormatted}\n🎌 Source: ${result.source}`, msg, sock);

                            } else {
                                // Format lain dikirim sebagai image biasa
                                await sock.sendMessage(msg.key.remoteJid, {
                                    image: { url: result.url },
                                    caption: caption
                                }, { quoted: msg });

                                await Wily(`🖼️ Gambar anime ${command} berhasil dikirim!\n\n✨ Format: ${result.format} (${result.categoryType})\n📏 Size: ${result.sizeFormatted}\n🎌 Source: ${result.source}`, msg, sock);
                            }

                            sendSuccess = true;

                        } catch (sendError) {
                            retryCount++;

                            if (retryCount < maxRetries) {
                                await Wily(`⚠️ Gagal mengirim ${result.format}, mencoba lagi... (${retryCount}/${maxRetries})`, msg, sock);
                                await new Promise(resolve => setTimeout(resolve, 2000));
                            } else {
                                // Final fallback: kirim sebagai document
                                try {
                                    const fileExtension = result.format.toLowerCase();
                                    const mimeType = result.contentType || 'application/octet-stream';

                                    await sock.sendMessage(msg.key.remoteJid, {
                                        document: { url: result.url },
                                        fileName: `anime_${command}_${Date.now()}.${fileExtension}`,
                                        mimetype: mimeType,
                                        caption: caption
                                    }, { quoted: msg });

                                    await Wily(`📁 ${result.format} anime ${command} berhasil dikirim sebagai dokumen!\n\n✨ Format: ${result.format} (${result.categoryType})\n📏 Size: ${result.sizeFormatted}\n🎌 Source: ${result.source}\n⚠️ Dikirim sebagai file karena error koneksi`, msg, sock);

                                    sendSuccess = true;

                                } catch (docError) {
                                    await Wily(`❌ Gagal mengirim ${result.format} ${command} setelah ${maxRetries} percobaan.\n\n🔄 Error: ${sendError.message}\n💡 Coba perintah lagi dalam beberapa saat!`, msg, sock);
                                }
                            }
                        }
                    }
                } else {
                    await Wily(`❌ Gagal mengambil gambar ${command}. Silakan coba lagi!`, msg, sock);
                }

            } catch (error) {
                await Wily(`❌ Terjadi kesalahan saat mengambil gambar ${command}:\n\n🔄 Error: ${error.message}\n💡 Coba perintah lagi dalam beberapa saat!`, msg, sock);
            }
        }

    } catch (error) {
        // Silent error - tidak ada log console
        try {
            await Wily(`❌ Terjadi kesalahan sistem:\n\n🔄 Error: ${error.message}\n💡 Silakan hubungi admin jika error berlanjut!`, msg, sock);
        } catch (replyError) {
            // Silent error jika reply gagal
        }
    }
}

module.exports = { 
    animeScraperHandler,
    getAnimeImage,
    animeCategories 
};