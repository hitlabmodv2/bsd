const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Wily } = require('../CODE_REPLAY/reply');

// Load config function
function loadConfig() {
    try {
        const configPath = require('path').join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            // Clear require cache untuk fresh config
            delete require.cache[require.resolve('../config.json')];
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
function hasAccess(sock, msg) {
    const config = loadConfig();

    // Jika mode public, semua bisa akses
    if (config.bot?.mode === 'public') {
        return true;
    }

    // Jika mode self, hanya owner dan bot number yang bisa akses
    if (config.bot?.mode === 'self') {
        const botNumber = sock.user?.id?.split(':')[0];

        let actualSenderNumber;
        if (msg.key.participant) {
            // Pesan grup
            actualSenderNumber = msg.key.participant.split('@')[0];
        } else if (msg.key.fromMe) {
            // Pesan dari bot sendiri
            actualSenderNumber = botNumber;
        } else {
            // Private chat
            actualSenderNumber = msg.key.remoteJid?.split('@')[0];
        }

        const isBotNumber = actualSenderNumber === botNumber;
        const isOwnerNumber = actualSenderNumber === config.bot?.owner;
        const isBotNumberFromConfig = actualSenderNumber === config.bot?.botNumber;
        const isFromMe = msg.key.fromMe === true;

        return isFromMe || isBotNumber || isOwnerNumber || isBotNumberFromConfig;
    }

    return false;
}

async function handleNulisCommand(sock, msg) {
    try {
        // Check access permission
        if (!hasAccess(sock, msg)) {
            return; // Bot diam saja jika tidak ada akses
        }

        const config = loadConfig();
        const prefix = config.bot?.prefix || '.';

        // Get message text
        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || '';

        const args = messageText.slice(prefix.length).trim().split(' ');
        const command = args[0].toLowerCase();

        if (command !== 'nulis') return false;

        // Jika hanya mengetik .nulis tanpa text
        if (args.length < 2) {
            const helpText = `📝 *FITUR NULIS*

🎯 *Fungsi:*
Mengubah teks menjadi tulisan tangan yang realistis

📋 *Cara Penggunaan:*
${prefix}nulis <teks yang ingin ditulis>

💡 *Contoh:*
${prefix}nulis Halo semuanya!
${prefix}nulis Belajar programming itu menyenangkan
${prefix}nulis Selamat pagi, semoga harimu menyenangkan

⚙️ *Fitur:*
• Tulisan tangan realistis
• Support teks panjang
• Hasil dalam format gambar
• Kualitas HD

📱 *Status Bot:*
• Mode: ${config.bot.mode.toUpperCase()}
• Prefix: ${prefix}
• Akses: ${config.bot.mode === 'self' ? 'Owner & Bot Only' : 'Semua User'}

✨ Ketik pesan yang ingin kamu ubah menjadi tulisan tangan!`;

            await Wily(helpText, msg, sock);
            return true;
        }

        // Gabungkan semua args menjadi text yang akan ditulis
        const textToWrite = args.slice(1).join(' ');

        // Validasi panjang text
        if (textToWrite.length > 500) {
            const errorText = `❌ *TEKS TERLALU PANJANG*

⚠️ Maksimal 500 karakter
📊 Teks kamu: ${textToWrite.length} karakter

💡 *Tips:*
• Persingkat teks kamu
• Bagi menjadi beberapa pesan
• Fokus pada poin penting

📝 Coba lagi dengan teks yang lebih pendek!`;

            await Wily(errorText, msg, sock);
            return true;
        }

        // Show loading message
        const loadingText = `⏳ *SEDANG MEMPROSES...*

📝 Mengubah teks menjadi tulisan tangan...
🎨 Sedang menggambar: "${textToWrite.substring(0, 50)}${textToWrite.length > 50 ? '...' : ''}"

⏰ Mohon tunggu sebentar...`;

        await Wily(loadingText, msg, sock);

        // Encode text untuk URL
        const encodedText = encodeURIComponent(textToWrite);
        const apiUrl = `https://zenzxz.dpdns.org/maker/nulis?text=${encodedText}`;

        try {
            // Fetch image dari API
            const response = await axios.get(apiUrl, {
                responseType: 'arraybuffer',
                timeout: 30000, // 30 seconds timeout
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (response.status === 200 && response.data) {
                // Send image
                await sock.sendMessage(msg.key.remoteJid, {
                    image: Buffer.from(response.data),
                    caption: `✅ *TULISAN TANGAN BERHASIL DIBUAT*

📝 *Teks:* ${textToWrite}
🎨 *Style:* Tulisan Tangan
📏 *Panjang:* ${textToWrite.length} karakter
⚡ *Generator:* Nulis API

🤖 *Auto Read Story Bot*
✨ By: Wily - Premium Edition ✨`,
                    contextInfo: {
                        externalAdReply: {
                            title: "📝 Nulis - Tulisan Tangan",
                            body: `Generated: ${textToWrite.substring(0, 30)}${textToWrite.length > 30 ? '...' : ''}`,
                            thumbnailUrl: "https://files.catbox.moe/mxohav.gif",
                            sourceUrl: "https://wa.me/" + (config.bot?.owner || ''),
                            mediaType: 1,
                            renderLargerThumbnail: false
                        }
                    }
                }, { quoted: msg });

                return true;
            } else {
                throw new Error('Invalid response from API');
            }

        } catch (apiError) {
            let errorMessage = `❌ *GAGAL MEMBUAT TULISAN*

🔍 *Kemungkinan Penyebab:*
• API server sedang down
• Koneksi internet bermasalah
• Teks mengandung karakter khusus
• Server overload

💡 *Solusi:*
• Coba lagi dalam beberapa saat
• Pastikan koneksi internet stabil
• Gunakan teks yang lebih sederhana
• Hapus karakter khusus jika ada

🔄 Silakan coba lagi!`;

            // Handle specific error cases
            if (apiError.code === 'ECONNABORTED') {
                errorMessage = `⏰ *TIMEOUT ERROR*

❌ Server terlalu lama merespons
🔄 Silakan coba lagi dalam beberapa saat

💡 Coba dengan teks yang lebih pendek`;
            } else if (apiError.response?.status === 404) {
                errorMessage = `🔍 *API TIDAK DITEMUKAN*

❌ Endpoint API mungkin berubah
🔧 Hubungi developer untuk update

📱 Gunakan fitur lain sementara waktu`;
            } else if (apiError.response?.status >= 500) {
                errorMessage = `🔧 *SERVER ERROR*

❌ API server sedang bermasalah
⏳ Coba lagi dalam beberapa menit

🔄 Server akan segera pulih`;
            }

            await Wily(errorMessage, msg, sock);
            return true;
        }

    } catch (error) {
        // Error handling tanpa log console
        const genericErrorText = `❌ *TERJADI KESALAHAN*

🔧 System error saat memproses permintaan
🔄 Silakan coba lagi

💡 Jika masalah berlanjut, hubungi developer`;

        await Wily(genericErrorText, msg, sock);
        return true;
    }
}

module.exports = {
    handleNulisCommand
};