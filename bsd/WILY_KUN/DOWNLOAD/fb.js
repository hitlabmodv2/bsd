
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Wily } = require('../../CODE_REPLAY/reply');

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

function checkAccess(senderNumber, config, fromMe = false) {
    const botMode = config?.bot?.mode || 'public';

    // Mode public: semua orang bisa akses
    if (botMode === 'public') {
        return true;
    }

    // Mode self: hanya fromMe, bot number, dan owner yang bisa akses
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

async function ReplyRynzz(teks, msg, sock) {
    return await Wily(teks, msg, sock);
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function isValidUrl(url) {
    // Support multiple platforms
    const supportedPlatforms = [
        // Facebook
        /^https?:\/\/(www\.)?(facebook\.com|fb\.watch|m\.facebook\.com)/i,
        // Instagram
        /^https?:\/\/(www\.)?(instagram\.com|instagr\.am)/i,
        // WhatsApp Status
        /^https?:\/\/(www\.)?(wa\.me|whatsapp\.com)/i,
        // TikTok
        /^https?:\/\/(www\.)?(tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com)/i,
        // YouTube
        /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)/i,
        // Twitter/X
        /^https?:\/\/(www\.)?(twitter\.com|x\.com)/i,
        // Pinterest
        /^https?:\/\/(www\.)?(pinterest\.com|pin\.it)/i,
        // LinkedIn
        /^https?:\/\/(www\.)?(linkedin\.com)/i,
        // Snapchat
        /^https?:\/\/(www\.)?(snapchat\.com)/i,
        // Reddit
        /^https?:\/\/(www\.)?(reddit\.com)/i
    ];
    
    return supportedPlatforms.some(regex => regex.test(url));
}

function detectPlatform(url) {
    if (/facebook\.com|fb\.watch|m\.facebook\.com/i.test(url)) return '🔵 Facebook';
    if (/instagram\.com|instagr\.am/i.test(url)) return '📸 Instagram';
    if (/wa\.me|whatsapp\.com/i.test(url)) return '💬 WhatsApp';
    if (/tiktok\.com|vt\.tiktok\.com|vm\.tiktok\.com/i.test(url)) return '🎵 TikTok';
    if (/youtube\.com|youtu\.be/i.test(url)) return '🎬 YouTube';
    if (/twitter\.com|x\.com/i.test(url)) return '🐦 Twitter/X';
    if (/pinterest\.com|pin\.it/i.test(url)) return '📌 Pinterest';
    if (/linkedin\.com/i.test(url)) return '💼 LinkedIn';
    if (/snapchat\.com/i.test(url)) return '👻 Snapchat';
    if (/reddit\.com/i.test(url)) return '🔴 Reddit';
    return '🌐 Platform';
}



async function handleFbCommand(client, m) {
    try {
        const config = loadConfig();
        const prefix = config?.bot?.prefix || '.';

        // Get message text
        const messageText = m.message?.conversation || 
                          m.message?.extendedTextMessage?.text || '';

        if (!messageText) return;

        // Check if it's fb command
        const args = messageText.slice(prefix.length).trim().split(' ');
        const command = args[0].toLowerCase();

        if (command !== 'fb') return;

        // Check access based on bot mode FIRST before processing
        const senderJid = m.key.participant || m.key.remoteJid;
        const fromMe = m.key.fromMe;

        if (!checkAccess(senderJid, config, fromMe)) {
            // In self mode, bot should not respond to unauthorized users
            return; // Silent exit, no response
        }

        // Check if URL provided
        if (args.length < 2) {
            const helpText = `
╭━━━『 🌐 MULTI-PLATFORM DOWNLOADER HD 』━━━❀
┃ 
┃ 📝 *Cara penggunaan:*
┃ 
┃ ${prefix}fb <link platform>
┃ 
┃ 🎯 *Platform yang didukung:*
┃ • 🔵 Facebook - Video, Reels, Stories
┃ • 📸 Instagram - Reels, Posts, Stories, IGTV
┃ • 💬 WhatsApp - Status, Media
┃ • 🎵 TikTok - Videos, Reels
┃ • 🎬 YouTube - Videos, Shorts
┃ • 🐦 Twitter/X - Videos, GIFs
┃ • 📌 Pinterest - Images, Videos
┃ • 💼 LinkedIn - Videos, Posts
┃ • 👻 Snapchat - Stories
┃ • 🔴 Reddit - Videos, GIFs
┃ 
┃ 🎥 *Fitur Unggulan:*
┃ • Download video HD dan SD
┃ • Pilihan kualitas setelah media ditemukan
┃ • Support semua format link
┃ • Metadata preview included
┃ • API terbaru zenzxz.dpdns.org
┃ • Auto-detect platform
┃ 
┃ 📋 *Contoh penggunaan:*
┃ • ${prefix}fb https://www.facebook.com/watch?v=123
┃ • ${prefix}fb https://www.instagram.com/reel/ABC123
┃ • ${prefix}fb https://wa.me/status/xyz
┃ • ${prefix}fb https://www.tiktok.com/@user/video/123
┃ • ${prefix}fb https://www.youtube.com/watch?v=xyz
┃ • ${prefix}fb https://twitter.com/user/status/123
┃ 
┃ 🎥 *Kualitas yang tersedia:*
┃ • Opsi 1: SD Quality - File lebih kecil
┃ • Opsi 2: HD Quality - Kualitas terbaik
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Kirim link dari platform manapun untuk download dengan pilihan kualitas!_`;

            await ReplyRynzz(helpText, m, client);
            return;
        }

        // Get URL
        const mediaUrl = args.slice(1).join(' ');

        // Validate URL
        if (!isValidUrl(mediaUrl)) {
            const errorText = `
╭━━━『 ❌ URL TIDAK VALID 』━━━❀
┃ 
┃ 🔍 *URL yang kamu kirim tidak didukung*
┃ 
┃ ✅ *Platform yang didukung:*
┃ • 🔵 Facebook (facebook.com, fb.watch)
┃ • 📸 Instagram (instagram.com, instagr.am)
┃ • 💬 WhatsApp (wa.me, whatsapp.com)
┃ • 🎵 TikTok (tiktok.com, vt.tiktok.com)
┃ • 🎬 YouTube (youtube.com, youtu.be)
┃ • 🐦 Twitter/X (twitter.com, x.com)
┃ • 📌 Pinterest (pinterest.com, pin.it)
┃ • 💼 LinkedIn (linkedin.com)
┃ • 👻 Snapchat (snapchat.com)
┃ • 🔴 Reddit (reddit.com)
┃ 
┃ 💡 *Tips:*
┃ • Salin link langsung dari aplikasi
┃ • Pastikan link dapat dibuka di browser
┃ • Jangan gunakan link yang dipendekkan
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Silakan kirim link yang valid dari platform yang didukung!_`;

            await ReplyRynzz(errorText, m, client);
            return;
        }

        // Detect platform
        const platform = detectPlatform(mediaUrl);

        // Send processing message
        const processingText = `
╭━━━『 ⏳ SEDANG MEMPROSES 』━━━❀
┃ 
┃ 🌐 *Platform:* ${platform}
┃ 🔗 *URL:* ${mediaUrl}
┃ 🔄 *Status:* Menganalisis konten...
┃ ⚡ *API:* ZenzXZ Multi-Platform Downloader
┃ 
┃ 📱 *Proses:*
┃ • Mengambil metadata...
┃ • Mencari kualitas tersedia...
┃ • Menyiapkan pilihan download...
┃ 
┃ ⏰ *Mohon tunggu sebentar...*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Sedang memproses konten dari ${platform}..._`;

        await ReplyRynzz(processingText, m, client);

        try {
            // Use zenzxz.dpdns.org API with universal endpoint
            const response = await axios.get(`https://zenzxz.dpdns.org/downloader/facebook?url=${encodeURIComponent(mediaUrl)}`, {
                timeout: 30000,
                headers: {
                    'accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.data || !response.data.status) {
                // Try alternative API endpoints based on platform
                let alternativeResponse = null;
                
                if (mediaUrl.includes('instagram.com')) {
                    alternativeResponse = await axios.get(`https://api.nekorinn.my.id/downloader/instagram?url=${encodeURIComponent(mediaUrl)}`, {
                        timeout: 30000,
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                    });
                } else if (mediaUrl.includes('tiktok.com')) {
                    alternativeResponse = await axios.get(`https://api.siputzx.my.id/api/tiktok/v2?url=${encodeURIComponent(mediaUrl)}`, {
                        timeout: 30000,
                        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
                    });
                }

                if (!alternativeResponse?.data?.status) {
                    await ReplyRynzz("❌ Gagal mendapatkan data dari platform ini! Pastikan link valid dan dapat diakses.", m, client);
                    return;
                }
                
                response.data = alternativeResponse.data;
            }

            const result = response.data;
            const title = result.title || result.metadata?.title || 'Media Content';
            
            // Handle different response formats
            let videos = null;
            let hasSD = false;
            let hasHD = false;

            if (result.videos) {
                // Facebook format
                videos = result.videos;
                hasSD = videos.sd && videos.sd.url;
                hasHD = videos.hd && videos.hd.url;
            } else if (result.result) {
                // Alternative format
                const mediaUrls = result.result.downloadUrl || result.result.media || [];
                if (mediaUrls.length > 0) {
                    videos = {
                        sd: { url: mediaUrls[0], size: 'Unknown' },
                        hd: mediaUrls.length > 1 ? { url: mediaUrls[1], size: 'Unknown' } : null
                    };
                    hasSD = true;
                    hasHD = mediaUrls.length > 1;
                }
            }

            if (!hasSD && !hasHD) {
                await ReplyRynzz("❌ Media tidak ditemukan atau tidak dapat diunduh dari platform ini!", m, client);
                return;
            }

            // Auto select HD quality, fallback to SD if HD not available
            let selectedVideo = null;
            let qualityName = '';

            if (hasHD && videos.hd && videos.hd.url) {
                selectedVideo = videos.hd;
                qualityName = 'HD Quality';
            } else if (hasSD && videos.sd && videos.sd.url) {
                selectedVideo = videos.sd;
                qualityName = 'SD Quality';
            }

            if (!selectedVideo) {
                await ReplyRynzz("❌ Video tidak tersedia untuk diunduh!", m, client);
                return;
            }

            // Send downloading message
            const downloadingText = `
╭━━━『 ⏳ SEDANG MENGUNDUH 』━━━❀
┃ 
┃ 🌐 *Platform:* ${platform}
┃ 🎬 *Judul:* ${title}
┃ 🎥 *Kualitas:* ${qualityName}
┃ 💾 *Ukuran:* ${selectedVideo.size || 'Processing...'}
┃ 
┃ 📥 *Status:* Sedang mengunduh dari server...
┃ ⏰ *Progress:* Memproses media...
┃ 
┃ 💡 *Mohon tunggu, media akan segera dikirim!*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Media ${qualityName} dari ${platform} sedang diproses..._`;

            await ReplyRynzz(downloadingText, m, client);

            try {
                // Download the selected media
                const mediaResponse = await axios.get(selectedVideo.url, {
                    responseType: 'arraybuffer',
                    timeout: 120000, // 2 minutes timeout for large files
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': mediaUrl
                    }
                });

                if (!mediaResponse.data) {
                    await ReplyRynzz("❌ Gagal mengunduh media!", m, client);
                    return;
                }

                // Convert to buffer
                const mediaBuffer = Buffer.from(mediaResponse.data);

                if (mediaBuffer.length === 0) {
                    await ReplyRynzz("❌ File media kosong atau corrupt!", m, client);
                    return;
                }

                // Check file size (WhatsApp limit is around 100MB)
                const fileSizeInMB = mediaBuffer.length / (1024 * 1024);
                if (fileSizeInMB > 100) {
                    await ReplyRynzz(`❌ Media terlalu besar (${fileSizeInMB.toFixed(2)}MB). Maksimal 100MB untuk WhatsApp.`, m, client);
                    return;
                }

                const caption = `
╭━━━『 ✅ MEDIA BERHASIL DIUNDUH 』━━━❀
┃ 
┃ 🌐 *Platform:* ${platform}
┃ 🎬 *Judul:* ${title}
┃ 🎥 *Kualitas:* ${qualityName}
┃ 💾 *Ukuran:* ${selectedVideo.size || 'Unknown'}
┃ 📁 *Ukuran File:* ${formatFileSize(mediaBuffer.length)}
┃ ⚡ *API:* ZenzXZ Multi-Platform Downloader
┃ 
┃ ✅ *Status:* Berhasil diunduh
┃ 🎯 *Source:* ${platform}
┃ 📱 *Compatible:* Semua device
┃ 
┃ 💡 *Tips:*
┃ • Media sudah dalam format optimal
┃ • Dapat diputar di semua pemutar
┃ • Kualitas ${qualityName} sesuai pilihan
┃ • Download dari berbagai platform
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Media ${qualityName} dari ${platform} berhasil diunduh!_`;

                // Detect media type and send accordingly
                const contentType = mediaResponse.headers['content-type'] || '';
                const fileName = `${platform.replace(/[^a-zA-Z0-9]/g, '_')}_${qualityName.toLowerCase().replace(' ', '_')}_${Date.now()}`;

                if (contentType.includes('video') || selectedVideo.url.includes('.mp4')) {
                    // Send as video
                    await client.sendMessage(m.key.remoteJid, {
                        video: mediaBuffer,
                        mimetype: 'video/mp4',
                        fileName: `${fileName}.mp4`,
                        caption: caption,
                        contextInfo: {
                            externalAdReply: {
                                title: "Multi-Platform Downloader HD",
                                body: `${platform} • ${qualityName} • ${selectedVideo.size || 'Unknown Size'}`,
                                thumbnailUrl: "https://files.catbox.moe/mxohav.gif",
                                mediaType: 1,
                                mediaUrl: mediaUrl,
                                sourceUrl: mediaUrl
                            }
                        }
                    }, { quoted: m });
                } else {
                    // Send as image
                    await client.sendMessage(m.key.remoteJid, {
                        image: mediaBuffer,
                        mimetype: 'image/jpeg',
                        fileName: `${fileName}.jpg`,
                        caption: caption,
                        contextInfo: {
                            externalAdReply: {
                                title: "Multi-Platform Downloader HD",
                                body: `${platform} • ${qualityName} • ${selectedVideo.size || 'Unknown Size'}`,
                                thumbnailUrl: "https://files.catbox.moe/mxohav.gif",
                                mediaType: 1,
                                mediaUrl: mediaUrl,
                                sourceUrl: mediaUrl
                            }
                        }
                    }, { quoted: m });
                }

            } catch (downloadError) {
                let errorMessage = "❌ Gagal mengunduh media!";
                
                if (downloadError.code === 'ECONNABORTED') {
                    errorMessage = "❌ Download timeout! Media terlalu besar atau koneksi lambat.";
                } else if (downloadError.response?.status === 403) {
                    errorMessage = "❌ Akses ditolak server! URL mungkin expired.";
                } else if (downloadError.response?.status === 404) {
                    errorMessage = "❌ Media tidak ditemukan di server!";
                } else {
                    errorMessage = `❌ Gagal mengunduh media: ${downloadError.message}`;
                }

                await ReplyRynzz(errorMessage, m, client);
            }

        } catch (apiError) {
            let errorMessage = `
╭━━━『 ❌ ERROR MULTI-PLATFORM DOWNLOADER 』━━━❀
┃ 
┃ 💥 *Gagal mengunduh konten!*
┃ 
┃ 🌐 *Platform:* ${platform}
┃ 🔗 *URL:* ${mediaUrl}
┃ 
┃ 🔧 *Kemungkinan penyebab:*
┃ • Koneksi internet tidak stabil
┃ • Konten bersifat private/terkunci
┃ • Link tidak valid atau expired
┃ • Platform membatasi akses
┃ • Media terlalu besar untuk diunduh
┃ • API server sedang maintenance
┃ 
┃ 💡 *Solusi:*
┃ • Pastikan konten bersifat public
┃ • Coba dengan link lain
┃ • Periksa koneksi internet
┃ • Pastikan link lengkap dan benar
┃ • Tunggu beberapa saat lalu coba lagi
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Silakan coba lagi dengan link yang valid!_`;

            if (apiError.code === 'ECONNABORTED') {
                errorMessage = "❌ Timeout! Server terlalu lama merespons. Silakan coba lagi.";
            } else if (apiError.response?.status === 404) {
                errorMessage = "❌ Konten tidak ditemukan! Pastikan link benar dan konten dapat diakses publik.";
            } else if (apiError.response?.status >= 500) {
                errorMessage = "❌ Server API sedang bermasalah. Silakan coba lagi nanti.";
            } else if (apiError.response?.status === 400) {
                errorMessage = "❌ Link tidak valid atau konten tidak dapat diunduh!";
            }

            await ReplyRynzz(errorMessage, m, client);
        }

    } catch (error) {
        const errorText = `
╭━━━『 ❌ SISTEM ERROR 』━━━❀
┃ 
┃ 💥 *Terjadi kesalahan sistem!*
┃ 
┃ 🔧 *Error:* ${error.message}
┃ 
┃ 💡 *Solusi:*
┃ • Restart bot jika diperlukan
┃ • Coba lagi dalam beberapa saat
┃ • Hubungi admin jika masalah berlanjut
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Sistem akan segera pulih normal!_`;

        await ReplyRynzz(errorText, m, client);
    }
}



module.exports = {
    handleFbCommand,
    checkAccess,
    loadConfig
};
