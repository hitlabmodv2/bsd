const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Wily } = require('../../CODE_REPLAY/reply');

// Fungsi untuk memuat config
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
        return true; // Semua user bisa akses di mode public
    }

    if (botMode === 'self') {
        // Extract number dari berbagai format
        const cleanSender = senderNumber?.replace('@s.whatsapp.net', '').replace('@c.us', '') || '';
        const botNumber = config?.bot?.botNumber?.replace('@s.whatsapp.net', '').replace('@c.us', '') || '';
        const ownerNumber = config?.bot?.owner?.replace('@s.whatsapp.net', '').replace('@c.us', '') || '';

        const isFromMe = fromMe === true;
        const isBotNumber = cleanSender === botNumber;
        const isOwnerNumber = cleanSender === ownerNumber;

        return isFromMe || isBotNumber || isOwnerNumber;
    }

    return false; // Default false untuk mode yang tidak dikenal
}

async function handlePlayCommand(client, m) {
    try {
        const config = loadConfig();
        const prefix = config?.bot?.prefix || '.';

        // Get message text
        const messageText = m.message?.conversation || 
                          m.message?.extendedTextMessage?.text || '';

        if (!messageText) return;

        // Check if it's play command
        const args = messageText.slice(prefix.length).trim().split(' ');
        const command = args[0].toLowerCase();

        if (command !== 'play') return;

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
╭━━━『 🎵 YOUTUBE PLAYER 』━━━❀
┃ 
┃ 📝 *Cara penggunaan:*
┃ 
┃ ${prefix}play <judul lagu>
┃ ${prefix}play <nama artis - judul>
┃ ${prefix}play <link youtube>
┃ 
┃ 🎯 *Contoh penggunaan:*
┃ • ${prefix}play naruto blue bird
┃ • ${prefix}play dj remix 2024
┃ • ${prefix}play sia chandelier
┃ • ${prefix}play alan walker faded
┃ 
┃ 📋 *Fitur:*
┃ • Download audio dari YouTube
┃ • Kualitas audio 128kbps
┃ • Support pencarian dengan query
┃ • Auto detect judul dan channel
┃ • Thumbnail cover included
┃ 
┃ 🔊 *Format output:* MP3 Audio
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Kirim query untuk mencari dan download lagu!_`;

            await Wily(helpText, m, client);
            return;
        }

        // Get search query
        const query = args.slice(1).join(' ');

        // BALASAN PERTAMA: Loading/Mencari
        const loadingText = `
╭━━━『 🔍 YOUTUBE PLAYER 』━━━❀
┃ 
┃ ⏳ *Sedang mencari lagu...*
┃ 
┃ 🎯 *Query:* ${query}
┃ 🔍 *Status:* Searching...
┃ 🌐 *Server:* YouTube API
┃ 
┃ ⚡ *Mohon tunggu sebentar...*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_🎵 Sedang mencari lagu terbaik untuk Anda..._`;

        await Wily(loadingText, m, client);

        try {
            // Call NekoRinn API
            const response = await axios.get(`https://api.nekorinn.my.id/downloader/ytplay-savetube?q=${encodeURIComponent(query)}`, {
                timeout: 30000
            });

            if (!response.data || !response.data.status) {
                await Wily("❌ Gagal mencari lagu. API tidak merespons dengan benar!", m, client);
                return;
            }

            const data = response.data.result;

            if (!data || !data.metadata || !data.downloadUrl) {
                await Wily("❌ Lagu tidak ditemukan atau format response tidak valid!", m, client);
                return;
            }

            const metadata = data.metadata;

            // BALASAN KEDUA: Notifikasi Ditemukan + Informasi Lengkap
            const foundText = `
╭━━━『 ✅ LAGU DITEMUKAN 』━━━❀
┃ 
┃ 🎵 *Judul:* ${metadata.title}
┃ 👤 *Channel:* ${metadata.channel}
┃ ⏱️ *Durasi:* ${metadata.duration}
┃ 🔗 *URL:* ${metadata.url}
┃ 
┃ 📥 *Status:* Sedang mengunduh...
┃ 🎧 *Kualitas:* 128kbps MP3
┃ 💾 *Format:* Audio MP3
┃ 
┃ ⚡ *Proses download dimulai...*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_🎶 Audio sedang diproses, mohon tunggu..._`;

            await Wily(foundText, m, client);

            // Download audio
            const audioResponse = await axios.get(data.downloadUrl, {
                responseType: 'arraybuffer',
                timeout: 60000
            });

            if (!audioResponse.data) {
                await Wily("❌ Gagal mengunduh audio dari server!", m, client);
                return;
            }

            // Convert to buffer
            const audioBuffer = Buffer.from(audioResponse.data);

            if (audioBuffer.length === 0) {
                await Wily("❌ File audio kosong atau corrupt!", m, client);
                return;
            }

            // BALASAN KETIGA: Kirim Audio + Pesan Sukses Langsung
            await client.sendMessage(m.key.remoteJid, {
                audio: audioBuffer,
                mimetype: 'audio/mpeg',
                fileName: `${metadata.title}.mp3`,
                caption: `╭━━━『 🎉 SUKSES TERKIRIM 』━━━❀
┃ 
┃ ✅ *Audio berhasil dikirim!*
┃ 
┃ 🎵 *Judul:* ${metadata.title}
┃ 👤 *Channel:* ${metadata.channel}
┃ ⏱️ *Durasi:* ${metadata.duration}
┃ 💾 *Size:* ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB
┃ 
┃ 🎧 *Format:* MP3 Audio
┃ 📱 *Kualitas:* 128kbps
┃ 
┃ 💡 *Tips:*
┃ • Gunakan headphone untuk pengalaman terbaik
┃ • Audio siap diputar di semua pemutar musik
┃ • File sudah dalam format MP3 berkualitas
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_🎶 Selamat menikmati musik pilihan Anda!_`,
                contextInfo: {
                    externalAdReply: {
                        title: metadata.title,
                        body: `${metadata.channel} • ${metadata.duration}`,
                        thumbnailUrl: metadata.cover,
                        mediaType: 1,
                        mediaUrl: metadata.url,
                        sourceUrl: metadata.url
                    }
                }
            }, { quoted: m });



        } catch (apiError) {
            if (apiError.code === 'ECONNABORTED') {
                await Wily("❌ Timeout! Server terlalu lama merespons. Silakan coba lagi.", m, client);
            } else if (apiError.response?.status === 404) {
                await Wily("❌ Lagu tidak ditemukan! Coba gunakan kata kunci yang berbeda.", m, client);
            } else if (apiError.response?.status >= 500) {
                await Wily("❌ Server API sedang bermasalah. Silakan coba lagi nanti.", m, client);
            } else {
                await Wily("❌ Terjadi kesalahan saat mengakses API YouTube!", m, client);
            }
        }

    } catch (error) {
        const errorText = `
╭━━━『 ❌ ERROR YOUTUBE PLAYER 』━━━❀
┃ 
┃ 💥 *Gagal memutar musik!*
┃ 
┃ 🔧 *Kemungkinan penyebab:*
┃ • Koneksi internet tidak stabil
┃ • Server YouTube sedang bermasalah
┃ • Query pencarian tidak valid
┃ • Audio tidak tersedia untuk download
┃ 
┃ 💡 *Solusi:*
┃ • Coba dengan kata kunci berbeda
┃ • Periksa koneksi internet
┃ • Gunakan nama lagu yang lebih spesifik
┃ • Tambahkan nama artis dalam pencarian
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Silakan coba lagi dengan query yang berbeda!_`;

        await Wily(errorText, m, client);
    }
}

module.exports = {
    handlePlayCommand,
    checkAccess,
    loadConfig
};