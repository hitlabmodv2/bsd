const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const { Sticker, StickerTypes } = require('wa-sticker-formatter');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Wily } = require('../CODE_REPLAY/reply');

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
        bot: { mode: 'public', prefix: '.', owner: '', botNumber: '' },
        sticker: { packname: 'WilyKun Bot', author: '© WilyKun' }
    };
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



class StickerLy {
    search = async function (query) {
        try {
            if (!query) throw new Error('Query is required');

            const { data } = await axios.post('https://api.sticker.ly/v4/stickerPack/smartSearch', {
                keyword: query,
                enabledKeywordSearch: true,
                filter: {
                    extendSearchResult: false,
                    sortBy: 'RECOMMENDED',
                    languages: [
                        'ALL'
                    ],
                    minStickerCount: 5,
                    searchBy: 'ALL',
                    stickerType: 'ALL'
                }
            }, {
                headers: {
                    'user-agent': 'androidapp.stickerly/3.17.0 (Redmi Note 4; U; Android 29; in-ID; id;)',
                    'content-type': 'application/json',
                    'accept-encoding': 'gzip'
                }
            });

            return data.result.stickerPacks.map(pack => ({
                name: pack.name,
                author: pack.authorName,
                stickerCount: pack.resourceFiles.length,
                viewCount: pack.viewCount,
                exportCount: pack.exportCount,
                isPaid: pack.isPaid,
                isAnimated: pack.isAnimated,
                thumbnailUrl: `${pack.resourceUrlPrefix}${pack.resourceFiles[pack.trayIndex]}`,
                url: pack.shareUrl
            }));
        } catch (error) {
            throw new Error(error.message);
        }
    }

    detail = async function (url) {
        try {
            const match = url.match(/\/s\/([^\/\?#]+)/);
            if (!match) throw new Error('Invalid url');

            const { data } = await axios.get(`https://api.sticker.ly/v4/stickerPack/${match[1]}?needRelation=true`, {
                headers: {
                    'user-agent': 'androidapp.stickerly/3.17.0 (Redmi Note 4; U; Android 29; in-ID; id;)',
                    'content-type': 'application/json',
                    'accept-encoding': 'gzip'
                }
            });

            return {
                name: data.result.name,
                author: {
                    name: data.result.user.displayName,
                    username: data.result.user.userName,
                    bio: data.result.user.bio,
                    followers: data.result.user.followerCount,
                    following: data.result.user.followingCount,
                    isPrivate: data.result.user.isPrivate,
                    avatar: data.result.user.profileUrl,
                    website: data.result.user.website,
                    url: data.result.user.shareUrl
                },
                stickers: data.result.stickers.map(stick => ({
                    fileName: stick.fileName,
                    isAnimated: stick.isAnimated,
                    imageUrl: `${data.result.resourceUrlPrefix}${stick.fileName}`
                })),
                stickerCount: data.result.stickers.length,
                viewCount: data.result.viewCount,
                exportCount: data.result.exportCount,
                isPaid: data.result.isPaid,
                isAnimated: data.result.isAnimated,
                thumbnailUrl: `${data.result.resourceUrlPrefix}${data.result.stickers[data.result.trayIndex].fileName}`,
                url: data.result.shareUrl
            };
        } catch (error) {
            throw new Error(error.message);
        }
    }
}

async function downloadAndCreateSticker(imageUrl, config) {
    try {
        const response = await axios({
            method: 'GET',
            url: imageUrl,
            responseType: 'arraybuffer',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const imageBuffer = Buffer.from(response.data);

        if (!imageBuffer || imageBuffer.length === 0) {
            throw new Error('Empty buffer received');
        }

        // Create sticker using wa-sticker-formatter
        const stickerMetadata = {
            pack: config.sticker?.packname || 'WilyKun Bot',
            author: config.sticker?.author || '© WilyKun',
            type: StickerTypes.FULL,
            categories: ['🔍', '📦'],
            quality: 95,
            background: 'transparent'
        };

        const sticker = new Sticker(imageBuffer, stickerMetadata);
        return await sticker.toBuffer();

    } catch (error) {
        throw new Error(`Failed to download/create sticker: ${error.message}`);
    }
}

async function handleStickerlyCommand(client, m) {
    try {
        const config = loadConfig();
        const prefix = config?.bot?.prefix || '.';

        // Validasi awal struktur message
        if (!m || !m.message) {
            return;
        }

        let messageContent = '';

        // Extract message content
        if (m.message?.conversation) {
            messageContent = m.message.conversation.trim();
        } else if (m.message?.extendedTextMessage?.text) {
            messageContent = m.message.extendedTextMessage.text.trim();
        } else if (m.message?.imageMessage?.caption) {
            messageContent = m.message.imageMessage.caption.trim();
        }

        // Check if it's stickerly command
        const isCommand = messageContent.startsWith(`${prefix}stickerly`);

        if (!isCommand) {
            return;
        }

        // Check access based on bot mode
        const senderJid = m.key.participant || m.key.remoteJid;
        const fromMe = m.key.fromMe;

        if (!checkAccess(senderJid, config, fromMe)) {
            return; // Silent exit untuk mode self
        }

        // Parse command arguments
        const args = messageContent.split(' ').slice(1);
        const mode = args[0]?.toLowerCase();
        const query = args.slice(1).join(' ');

        // Jika hanya .stickerly tanpa parameter, tampilkan help
        if (!mode) {
            const helpText = `
╭━━━『 🔍 STICKERLY DOWNLOADER 』━━━❀
┃ 
┃ 📦 *Download sticker pack dari Stickerly!*
┃ 
┃ 📝 *Cara penggunaan:*
┃ • ${prefix}stickerly search [kata kunci]
┃ • ${prefix}stickerly download [url stickerly]
┃ 
┃ 🎯 *Contoh lengkap:*
┃ • ${prefix}stickerly search anime cat
┃   ↳ Cari sticker pack dengan kata "anime cat"
┃ 
┃ • ${prefix}stickerly search cute emoji
┃   ↳ Cari pack emoji lucu
┃ 
┃ • ${prefix}stickerly download https://sticker.ly/s/ABC123
┃   ↳ Download semua sticker dari pack tersebut
┃ 
┃ 💡 *Tips pencarian yang bagus:*
┃ • Gunakan kata kunci spesifik
┃ • Coba kata dalam bahasa Inggris
┃ • Kombinasi kata: "cute cat", "anime girl"
┃ • Genre: "meme", "reaction", "emoji"
┃ 
┃ 📦 *Info sticker pack:*
┃ • Pack: ${config.sticker?.packname || 'WilyKun Bot'}
┃ • Author: ${config.sticker?.author || '© WilyKun'}
┃ 
┃ ⚡ *Powered by Sticker.ly API*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Ketik salah satu command di atas untuk mulai!_`;

            await Wily(helpText, m, client);
            return;
        }

        const stickerLy = new StickerLy();

        if (mode === 'search') {
            if (!query) {
                await Wily(`❌ *Query Pencarian Kosong!*\n\nContoh yang benar:\n• ${prefix}stickerly search anime cat\n• ${prefix}stickerly search cute emoji\n• ${prefix}stickerly search meme reaction\n\n💡 *Tips:* Gunakan kata kunci yang spesifik!`, m, client);
                return;
            }

            await Wily(`🔍 *Mencari Sticker Pack...*\n\n📝 Query: "${query}"\n⏳ Sedang mencari di database Sticker.ly...`, m, client);

            try {
                const results = await stickerLy.search(query);

                if (!results || results.length === 0) {
                    await Wily(`❌ *Tidak Ditemukan!*\n\nTidak ada sticker pack yang ditemukan untuk: "${query}"\n\n💡 *Coba dengan kata kunci lain:*\n• Gunakan bahasa Inggris\n• Kata yang lebih umum\n• Kombinasi kata berbeda`, m, client);
                    return;
                }

                let resultText = `╭━━━『 🔍 HASIL PENCARIAN 』━━━❀\n┃ \n┃ 📝 *Query:* "${query}"\n┃ 📊 *Ditemukan:* ${results.length} pack\n┃ \n`;

                for (let i = 0; i < Math.min(results.length, 10); i++) {
                    const pack = results[i];
                    resultText += `┃ ${i + 1}️⃣ *${pack.name}*\n`;
                    resultText += `┃    👤 Author: ${pack.author}\n`;
                    resultText += `┃    📦 Stickers: ${pack.stickerCount}\n`;
                    resultText += `┃    👀 Views: ${pack.viewCount.toLocaleString()}\n`;
                    resultText += `┃    💾 Downloads: ${pack.exportCount.toLocaleString()}\n`;
                    resultText += `┃    ${pack.isPaid ? '💰 Berbayar' : '🆓 Gratis'} • ${pack.isAnimated ? '🎬 Animated' : '🖼️ Static'}\n`;
                    resultText += `┃    🔗 ${pack.url}\n`;
                    resultText += `┃ \n`;
                }

                resultText += `┃ 💡 *Cara download:*\n`;
                resultText += `┃ • Copy URL pack yang diinginkan\n`;
                resultText += `┃ • ${prefix}stickerly download [url]\n`;
                resultText += `┃ \n`;
                resultText += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀\n\n`;
                resultText += `_Pilih pack dan download dengan URL!_`;

                await Wily(resultText, m, client);

            } catch (searchError) {
                await Wily(`❌ *Error Pencarian!*\n\n💥 Gagal mencari sticker pack\n🔧 Error: ${searchError.message}\n\n💡 *Solusi:*\n• Coba kata kunci yang berbeda\n• Periksa koneksi internet\n• Tunggu beberapa saat lalu coba lagi`, m, client);
            }

        } else if (mode === 'download') {
            if (!query) {
                await Wily(`❌ *URL Stickerly Kosong!*\n\nContoh yang benar:\n• ${prefix}stickerly download https://sticker.ly/s/ABC123\n\n💡 *Tips:* Copy URL dari hasil pencarian!`, m, client);
                return;
            }

            if (!query.includes('sticker.ly/s/')) {
                await Wily(`❌ *URL Tidak Valid!*\n\nFormat URL yang benar:\n• https://sticker.ly/s/ABC123\n• sticker.ly/s/ABC123\n\n💡 *Dapatkan URL dari hasil pencarian!`, m, client);
                return;
            }

            await Wily(`📦 *Mengunduh Sticker Pack...*\n\n🔗 URL: ${query}\n⏳ Sedang mengambil detail pack...`, m, client);

            try {
                const packDetail = await stickerLy.detail(query);

                if (!packDetail || !packDetail.stickers || packDetail.stickers.length === 0) {
                    await Wily(`❌ *Pack Tidak Ditemukan!*\n\nPack sticker tidak tersedia atau URL salah\n\n💡 *Pastikan:*\n• URL benar dan lengkap\n• Pack masih tersedia\n• Koneksi internet stabil`, m, client);
                    return;
                }

                const infoText = `╭━━━『 📦 INFO STICKER PACK 』━━━❀
┃ 
┃ 📦 *${packDetail.name}*
┃ 👤 Author: ${packDetail.author.name}
┃ 📊 Stickers: ${packDetail.stickerCount}
┃ 👀 Views: ${packDetail.viewCount.toLocaleString()}
┃ 💾 Downloads: ${packDetail.exportCount.toLocaleString()}
┃ ${packDetail.isPaid ? '💰 Berbayar' : '🆓 Gratis'} • ${packDetail.isAnimated ? '🎬 Animated' : '🖼️ Static'}
┃ 
┃ ⏳ *Sedang mengunduh dan mengkonversi...*
┃ 📦 Pack: ${config.sticker?.packname || 'WilyKun Bot'}
┃ ✍️ Author: ${config.sticker?.author || '© WilyKun'}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Mohon tunggu, semua sticker sedang diproses..._`;

                await Wily(infoText, m, client);

                let successCount = 0;
                let failedCount = 0;

                // Process stickers in batches to avoid overwhelming
                const batchSize = 3;
                for (let i = 0; i < packDetail.stickers.length; i += batchSize) {
                    const batch = packDetail.stickers.slice(i, i + batchSize);

                    await Promise.allSettled(
                        batch.map(async (stick) => {
                            try {
                                const stickerBuffer = await downloadAndCreateSticker(stick.imageUrl, config);

                                if (stickerBuffer && stickerBuffer.length > 0) {
                                    await client.sendMessage(m.key.remoteJid, {
                                        sticker: stickerBuffer,
                                        mimetype: 'image/webp'
                                    }, { quoted: m });

                                    successCount++;
                                } else {
                                    failedCount++;
                                }
                            } catch (error) {
                                failedCount++;
                            }
                        })
                    );

                    // Small delay between batches
                    if (i + batchSize < packDetail.stickers.length) {
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }

                const finalText = `╭━━━『 ✅ DOWNLOAD SELESAI 』━━━❀
┃ 
┃ 📦 *${packDetail.name}*
┃ ✅ Berhasil: ${successCount} sticker
┃ ❌ Gagal: ${failedCount} sticker
┃ 📊 Total: ${packDetail.stickerCount} sticker
┃ 
┃ 📦 Pack: ${config.sticker?.packname || 'WilyKun Bot'}
┃ ✍️ Author: ${config.sticker?.author || '© WilyKun'}
┃ 
┃ 💡 *Pack telah ditambahkan ke WhatsApp!*
┃ 🎯 Semua sticker siap digunakan
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Selamat menggunakan sticker pack baru!_`;

                await Wily(finalText, m, client);

            } catch (downloadError) {
                await Wily(`❌ *Error Download!*\n\n💥 Gagal mengunduh sticker pack\n🔧 Error: ${downloadError.message}\n\n💡 *Solusi:*\n• Periksa URL sekali lagi\n• Coba pack yang berbeda\n• Pastikan koneksi stabil\n• Tunggu beberapa saat lalu coba lagi`, m, client);
            }

        } else {
            await Wily(`❌ *Mode Tidak Valid!*\n\nMode yang tersedia:\n• search - Cari sticker pack\n• download - Download pack dari URL\n\nContoh: ${prefix}stickerly search anime`, m, client);
            return;
        }

    } catch (error) {
        const errorText = `
╭━━━『 ❌ SYSTEM ERROR 』━━━❀
┃ 
┃ 💥 *Terjadi kesalahan sistem!*
┃ 
┃ 🔧 *Kemungkinan penyebab:*
┃ • Error API Sticker.ly
┃ • Koneksi tidak stabil
┃ • Server overload
┃ • Format command salah
┃ 
┃ 💡 *Solusi:*
┃ • Tunggu beberapa menit
┃ • Coba command lain dulu
┃ • Periksa format command
┃ • Hubungi admin jika persist
┃ 
┃ 📝 *Format yang benar:*
┃ • ${loadConfig()?.bot?.prefix || '.'}stickerly search [query]
┃ • ${loadConfig()?.bot?.prefix || '.'}stickerly download [url]
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Sticker.ly API ready untuk melayani!_`;

        await Wily(errorText, m, client);
    }
}

module.exports = {
    handleStickerlyCommand,
    checkAccess,
    loadConfig
};