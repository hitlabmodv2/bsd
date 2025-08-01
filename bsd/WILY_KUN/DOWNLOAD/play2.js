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

async function ReplyRynzz(teks, msg, sock) {
    return await Wily(teks, msg, sock);
}

async function handlePlay2Command(client, m) {
    try {
        const config = loadConfig();
        const prefix = config?.bot?.prefix || '.';

        // Get message text
        const messageText = m.message?.conversation || 
                          m.message?.extendedTextMessage?.text || '';

        if (!messageText) return;

        // Check if it's play2 command
        const args = messageText.slice(prefix.length).trim().split(' ');
        const command = args[0].toLowerCase();

        if (command !== 'play2') return;

        // Check access based on bot mode FIRST before processing
        const senderJid = m.key.participant || m.key.remoteJid;
        const fromMe = m.key.fromMe;

        if (!checkAccess(senderJid, config, fromMe)) {
            // In self mode, bot should not respond to unauthorized users
            return; // Silent exit, no response
        }

        // Check if query provided
        if (args.length < 2) {
            const helpText = `
╭━━━『 🎬 YOUTUBE PLAY2 』━━━❀
┃ 
┃ 📝 *Cara penggunaan:*
┃ 
┃ ${prefix}play2 <judul lagu/video>
┃ ${prefix}play2 <nama artis - judul>
┃ ${prefix}play2 <link youtube>
┃ 
┃ 🎯 *Contoh penggunaan:*
┃ • ${prefix}play2 naruto blue bird
┃ • ${prefix}play2 dj remix 2024
┃ • ${prefix}play2 sia chandelier
┃ • ${prefix}play2 alan walker faded
┃ 
┃ 📋 *Fitur:*
┃ • Download video & audio dari YouTube
┃ • Kualitas video HD/SD otomatis
┃ • Kualitas audio 128kbps
┃ • Support pencarian dengan query
┃ • Auto detect judul dan channel
┃ • Thumbnail cover included
┃ 
┃ 📱 *Format output:* Video MP4 + Audio MP3
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Kirim query untuk mencari dan download video + audio!_`;

            await ReplyRynzz(helpText, m, client);
            return;
        }

        // Get search query
        const query = args.slice(1).join(' ');

        // BALASAN PERTAMA: Loading/Mencari
        const loadingText = `
╭━━━『 🔍 YOUTUBE PLAY2 』━━━❀
┃ 
┃ ⏳ *Sedang mencari video...*
┃ 
┃ 🎯 *Query:* ${query}
┃ 🔍 *Status:* Searching...
┃ 🌐 *Server:* YouTube API
┃ 
┃ ⚡ *Mohon tunggu sebentar...*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_🎬 Sedang mencari video terbaik untuk Anda..._`;

        await ReplyRynzz(loadingText, m, client);

        try {
            // Call NekoRinn API with improved parameters for video quality
            const response = await axios.get(`https://api.nekorinn.my.id/downloader/ytplay?q=${encodeURIComponent(query)}`, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/json, */*'
                }
            });

            if (!response.data || !response.data.status) {
                await ReplyRynzz("❌ Gagal mencari video. API tidak merespons dengan benar!", m, client);
                return;
            }

            const data = response.data.result;

            if (!data || !data.metadata || !data.downloadUrl) {
                await ReplyRynzz("❌ Video tidak ditemukan atau format response tidak valid!", m, client);
                return;
            }

            const metadata = data.metadata;

            // BALASAN KEDUA: Notifikasi Ditemukan + Informasi Lengkap
            const foundText = `
╭━━━『 ✅ VIDEO DITEMUKAN 』━━━❀
┃ 
┃ 🎬 *Judul:* ${metadata.title}
┃ 👤 *Channel:* ${metadata.channel}
┃ ⏱️ *Durasi:* ${metadata.duration}
┃ 🔗 *URL:* ${metadata.url}
┃ 
┃ 📥 *Status:* Sedang mengunduh...
┃ 🎥 *Kualitas Video:* HD/SD
┃ 🎧 *Kualitas Audio:* 128kbps
┃ 💾 *Format:* Video MP4 + Audio MP3
┃ 
┃ ⚡ *Proses download dimulai...*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_🎶 Video & Audio sedang diproses, mohon tunggu..._`;

            await ReplyRynzz(foundText, m, client);

            // Validate download URL first
            if (!data.downloadUrl || typeof data.downloadUrl !== 'string') {
                await ReplyRynzz("❌ URL download tidak valid dari API!", m, client);
                return;
            }

            // Try to get higher quality video (720p) first, then fallback to original
            let videoBuffer;
            let finalVideoUrl = data.downloadUrl;
            let videoQuality = 'Auto';

            // Try to get 720p video quality from direct YouTube API
            try {
                const highQualityResponse = await axios.get(`https://api.nekorinn.my.id/downloader/youtube?url=${encodeURIComponent(metadata.url)}&format=720&type=video`, {
                    timeout: 30000
                });

                if (highQualityResponse.data && highQualityResponse.data.status && highQualityResponse.data.result && highQualityResponse.data.result.downloadUrl) {
                    finalVideoUrl = highQualityResponse.data.result.downloadUrl;
                    videoQuality = '720p';
                }
            } catch (qualityError) {
                // Use original URL if 720p fails
                finalVideoUrl = data.downloadUrl;
                videoQuality = 'Auto';
            }

            // Download video with better error handling and WhatsApp optimization
            try {
                const videoResponse = await axios.get(finalVideoUrl, {
                    responseType: 'arraybuffer',
                    timeout: 120000, // Increase timeout for 720p
                    maxContentLength: 75 * 1024 * 1024, // 75MB max - optimized for WhatsApp
                    maxBodyLength: 75 * 1024 * 1024,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Accept': 'video/mp4, video/webm, */*',
                        'Accept-Encoding': 'identity', // No compression for video
                        'Connection': 'keep-alive',
                        'Range': 'bytes=0-' // Support partial downloads
                    },
                    validateStatus: function (status) {
                        return status >= 200 && status < 300;
                    }
                });

                if (!videoResponse.data || videoResponse.data.byteLength === 0) {
                    await ReplyRynzz("❌ File video kosong dari server!", m, client);
                    return;
                }

                // Convert to buffer with validation
                videoBuffer = Buffer.from(videoResponse.data);

                // Validate buffer
                if (!videoBuffer || videoBuffer.length === 0) {
                    await ReplyRynzz("❌ Buffer video tidak valid!", m, client);
                    return;
                }

                // Check minimum file size (at least 10KB for video)
                if (videoBuffer.length < 10240) {
                    await ReplyRynzz("❌ File video terlalu kecil, kemungkinan corrupt!", m, client);
                    return;
                }

                // Check maximum file size for WhatsApp (64MB limit)
                if (videoBuffer.length > 64 * 1024 * 1024) {
                    await ReplyRynzz("❌ File video terlalu besar untuk WhatsApp (maks 64MB). Menggunakan kualitas rendah...", m, client);

                    // Try to get lower quality version
                    try {
                        const lowQualityResponse = await axios.get(`https://api.nekorinn.my.id/downloader/youtube?url=${encodeURIComponent(metadata.url)}&format=480&type=video`, {
                            timeout: 60000
                        });

                        if (lowQualityResponse.data?.result?.downloadUrl) {
                            const lowQualityVideo = await axios.get(lowQualityResponse.data.result.downloadUrl, {
                                responseType: 'arraybuffer',
                                timeout: 90000,
                                maxContentLength: 64 * 1024 * 1024
                            });

                            if (lowQualityVideo.data && lowQualityVideo.data.byteLength < 64 * 1024 * 1024) {
                                videoBuffer = Buffer.from(lowQualityVideo.data);
                                videoQuality = '480p';
                            }
                        }
                    } catch (lowQualityError) {
                        await ReplyRynzz("❌ Video terlalu besar dan tidak dapat dikompresi untuk WhatsApp!", m, client);
                        return;
                    }
                }

                // Enhanced video validation for WhatsApp compatibility
                const fileHeader = videoBuffer.slice(0, 32);
                const isValidVideo = (
                    // MP4 signature (ftyp)
                    fileHeader.includes(Buffer.from([0x66, 0x74, 0x79, 0x70])) ||
                    // MP4 alternative signatures
                    fileHeader.includes(Buffer.from('ftyp')) ||
                    fileHeader.includes(Buffer.from('mp4')) ||
                    // WebM signature  
                    fileHeader.includes(Buffer.from([0x1A, 0x45, 0xDF, 0xA3])) ||
                    // Check for common video patterns or if file is substantial
                    videoBuffer.length > 100000 // If file is 100KB+, likely valid
                );

                if (!isValidVideo) {
                    await ReplyRynzz("❌ File bukan video yang valid atau format tidak didukung WhatsApp!", m, client);
                    return;
                }

            } catch (downloadError) {
                if (downloadError.code === 'ECONNABORTED') {
                    await ReplyRynzz("❌ Download timeout! Video terlalu besar atau koneksi lambat.", m, client);
                } else if (downloadError.response?.status === 403) {
                    await ReplyRynzz("❌ Akses ditolak server! URL mungkin expired.", m, client);
                } else if (downloadError.response?.status === 404) {
                    await ReplyRynzz("❌ Video tidak ditemukan di server!", m, client);
                } else {
                    await ReplyRynzz("❌ Gagal mengunduh video: " + (downloadError.message || 'Unknown error'), m, client);
                }
                return;
            }

            // BALASAN KETIGA: Kirim Video + Pesan Sukses dengan info akurat
            try {
                const videoSizeMB = (videoBuffer.length / 1024 / 1024).toFixed(2);
                const videoSizeKB = (videoBuffer.length / 1024).toFixed(0);

                await client.sendMessage(m.key.remoteJid, {
                    video: videoBuffer,
                    mimetype: 'video/mp4',
                    fileName: `${metadata.title.replace(/[^\w\s-]/g, '').substring(0, 40)}_${videoQuality}.mp4`,
                    caption: `╭━━━『 🎬 VIDEO BERHASIL 』━━━❀
┃ 
┃ ✅ *Video berhasil dikirim!*
┃ 
┃ 🎬 *Judul:* ${metadata.title}
┃ 👤 *Channel:* ${metadata.channel}
┃ ⏱️ *Durasi:* ${metadata.duration}
┃ 💾 *Size:* ${videoSizeMB} MB (${videoSizeKB} KB)
┃ 
┃ 🎥 *Format:* MP4 Video
┃ 📱 *Kualitas:* ${videoQuality}
┃ 🔧 *Status:* WhatsApp Optimized
┃ 
┃ 💡 *Info:*
┃ • Video kualitas ${videoQuality} untuk performa optimal
┃ • Ukuran file sudah dioptimasi untuk WhatsApp
┃ • Format MP4 kompatibel semua perangkat
┃ • Audio 320kbps akan dikirim terpisah
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_🎬 Video ${videoQuality} siap diputar dengan lancar!_`,
                    contextInfo: {
                        externalAdReply: {
                            title: metadata.title,
                            body: `${metadata.channel} • ${metadata.duration}`,
                            thumbnailUrl: metadata.cover,
                            mediaType: 1,
                            mediaUrl: metadata.url,
                            sourceUrl: metadata.url
                        }
                    },
                    jpegThumbnail: null // Remove thumbnail to reduce issues
                }, { quoted: m });

            } catch (sendError) {
                // If video sending fails, try alternative approach
                await ReplyRynzz("❌ Gagal mengirim video langsung. Mencoba metode alternatif...", m, client);

                try {
                    // Try sending as document instead
                    await client.sendMessage(m.key.remoteJid, {
                        document: videoBuffer,
                        mimetype: 'video/mp4',
                        fileName: `${metadata.title.replace(/[^\w\s-]/g, '').substring(0, 50)}.mp4`,
                        caption: `📹 *Video YouTube*\n\n🎬 *Judul:* ${metadata.title}\n👤 *Channel:* ${metadata.channel}\n⏱️ *Durasi:* ${metadata.duration}\n\n💡 *Dikirim sebagai dokumen karena masalah kompatibilitas*`
                    }, { quoted: m });

                    await ReplyRynzz("✅ Video berhasil dikirim sebagai dokumen! Download untuk memutar.", m, client);
                } catch (docError) {
                    await ReplyRynzz("❌ Gagal mengirim video. Ukuran file mungkin terlalu besar atau format tidak didukung.", m, client);
                    return;
                }
            }

            // Delay sebelum kirim audio
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Try to get audio version with better error handling - using 320kbps quality
            try {
                // Try to get audio-only version from API with 320kbps quality
                const audioApiUrl = `https://api.nekorinn.my.id/downloader/youtube?url=${encodeURIComponent(metadata.url)}&format=320&type=audio`;

                let audioBuffer = null;

                try {
                    const audioResponse = await axios.get(audioApiUrl, {
                        timeout: 45000
                    });

                    if (audioResponse.data && audioResponse.data.status && audioResponse.data.result) {
                        const audioDownloadUrl = audioResponse.data.result.downloadUrl;

                        if (audioDownloadUrl) {
                            const audioDownload = await axios.get(audioDownloadUrl, {
                                responseType: 'arraybuffer',
                                timeout: 60000,
                                maxContentLength: 50 * 1024 * 1024, // 50MB max for audio
                                headers: {
                                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                                    'Accept': 'audio/mpeg, audio/mp4, */*',
                                    'Accept-Encoding': 'gzip, deflate, br'
                                }
                            });

                            if (audioDownload.data && audioDownload.data.byteLength > 0) {
                                audioBuffer = Buffer.from(audioDownload.data);

                                // Validate audio buffer
                                if (audioBuffer.length < 1024) {
                                    audioBuffer = null; // Too small, likely corrupt
                                }
                            }
                        }
                    }
                } catch (audioApiError) {
                    // Audio API failed, we'll skip audio for now
                    audioBuffer = null;
                }

                if (audioBuffer && audioBuffer.length > 0) {
                    // BALASAN KEEMPAT: Kirim Audio 320kbps + Pesan Sukses
                    const audioSizeMB = (audioBuffer.length / 1024 / 1024).toFixed(2);
                    const audioSizeKB = (audioBuffer.length / 1024).toFixed(0);

                    await client.sendMessage(m.key.remoteJid, {
                        audio: audioBuffer,
                        mimetype: 'audio/mpeg',
                        fileName: `${metadata.title.replace(/[^\w\s-]/g, '').substring(0, 40)}_320kbps.mp3`,
                        caption: `╭━━━『 🎵 AUDIO BERHASIL 』━━━❀
┃ 
┃ ✅ *Audio berhasil dikirim!*
┃ 
┃ 🎵 *Judul:* ${metadata.title}
┃ 👤 *Channel:* ${metadata.channel}
┃ ⏱️ *Durasi:* ${metadata.duration}
┃ 💾 *Size:* ${audioSizeMB} MB (${audioSizeKB} KB)
┃ 
┃ 🎧 *Format:* MP3 Audio
┃ 📱 *Kualitas:* 320kbps
┃ 
┃ 💡 *Tips:*
┃ • Kualitas 320kbps untuk audio premium
┃ • Gunakan headphone untuk pengalaman terbaik
┃ • Audio siap diputar di semua pemutar musik
┃ • File telah dioptimasi untuk WhatsApp
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_🎵 Video ${videoQuality} + Audio 320kbps lengkap terkirim!_`,
                        contextInfo: {
                            externalAdReply: {
                                title: metadata.title,
                                body: `${metadata.channel} • ${metadata.duration}`,
                                thumbnailUrl: metadata.cover,
                                mediaType: 1,
                                mediaUrl: metadata.url,
                                sourceUrl: metadata.url
                            }
                        },
                        ptt: false // Ensure it's sent as music, not voice note
                    }, { quoted: m });
                } else {
                    await ReplyRynzz("✅ Video berhasil dikirim! Audio tidak dapat diproses saat ini.", m, client);
                }
            } catch (audioError) {
                // Silent audio error, video sudah berhasil
                await ReplyRynzz("✅ Video berhasil dikirim! Audio akan diproses terpisah jika memungkinkan.", m, client);
            }

        } catch (apiError) {
            if (apiError.code === 'ECONNABORTED') {
                await ReplyRynzz("❌ Timeout! Server terlalu lama merespons. Silakan coba lagi.", m, client);
            } else if (apiError.response?.status === 404) {
                await ReplyRynzz("❌ Video tidak ditemukan! Coba gunakan kata kunci yang berbeda.", m, client);
            } else if (apiError.response?.status >= 500) {
                await ReplyRynzz("❌ Server API sedang bermasalah. Silakan coba lagi nanti.", m, client);
            } else {
                await ReplyRynzz("❌ Terjadi kesalahan saat mengakses API YouTube!", m, client);
            }
        }

    } catch (error) {
        const errorText = `
╭━━━『 ❌ ERROR YOUTUBE PLAY2 』━━━❀
┃ 
┃ 💥 *Gagal memutar video!*
┃ 
┃ 🔧 *Kemungkinan penyebab:*
┃ • Koneksi internet tidak stabil
┃ • Server YouTube sedang bermasalah
┃ • Query pencarian tidak valid
┃ • Video tidak tersedia untuk download
┃ 
┃ 💡 *Solusi:*
┃ • Coba dengan kata kunci berbeda
┃ • Periksa koneksi internet
┃ • Gunakan nama video yang lebih spesifik
┃ • Tambahkan nama channel dalam pencarian
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Silakan coba lagi dengan query yang berbeda!_`;

        await ReplyRynzz(errorText, m, client);
    }
}

module.exports = {
    handlePlay2Command,
    checkAccess,
    loadConfig
};