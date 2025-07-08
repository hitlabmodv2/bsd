const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { downloadMediaMessage, downloadContentFromMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
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

// Upload file ke uguu.se
async function uploadToUguu(buffer, filename) {
    try {
        const form = new FormData();
        form.append('files[]', buffer, { filename });

        const { data } = await axios.post('https://uguu.se/upload.php', form, {
            headers: form.getHeaders(),
            timeout: 30000 // 30 detik timeout
        });

        if (data.files && data.files[0]) {
            return data.files[0].url;
        } else {
            throw new Error('Gagal upload ke uguu.se, coba lagi nanti');
        }
    } catch (error) {
        throw new Error('Gagal upload gambar: ' + error.message);
    }
}

// Handler untuk command hitamkan
async function handleHitamkanCommand(sock, msg) {
    try {
        // Load config untuk cek mode
        const config = loadConfig();

        // Get sender info
        const senderJid = msg.key.remoteJid;
        const botNumber = sock.user?.id?.split(':')[0];

        let actualSenderNumber;
        if (msg.key.participant) {
            actualSenderNumber = msg.key.participant.split('@')[0];
        } else if (msg.key.fromMe) {
            actualSenderNumber = botNumber;
        } else {
            actualSenderNumber = senderJid?.split('@')[0];
        }

        // Check mode access - fitur ini bisa digunakan semua orang (no access restriction)
        // Tapi tetap respect mode bot untuk response
        if (config.bot?.mode === 'self') {
            const isFromMe = msg.key.fromMe === true;
            const isBotNumber = actualSenderNumber === botNumber;
            const isOwnerNumber = actualSenderNumber === config.bot?.owner;
            const isBotNumberFromConfig = actualSenderNumber === config.bot?.botNumber;
            const isHardcodedBot = actualSenderNumber === '6289681008411';

            const isAuthorizedUser = isFromMe || isBotNumber || isOwnerNumber || isBotNumberFromConfig || isHardcodedBot;

            if (!isAuthorizedUser) {
                // Dalam mode self, bot tidak akan merespon untuk user yang tidak authorized
                return;
            }
        }

        // Check apakah ada gambar yang bisa diproses
        let quotedMsg = null;
        let imageBuffer = null;

        // Cek apakah ada gambar di pesan yang dikutip
        if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
        }

        // Cek apakah ada gambar di pesan saat ini (dengan caption .hitamkan)
        if (msg.message?.imageMessage) {
            try {
                // Method 1: Gunakan downloadMediaMessage
                imageBuffer = await sock.downloadMediaMessage(msg);

                // Jika gagal, coba method alternatif
                if (!imageBuffer || imageBuffer.length === 0) {
                    const stream = await downloadContentFromMessage(msg.message.imageMessage, 'image');
                    const chunks = [];
                    for await (const chunk of stream) {
                        chunks.push(chunk);
                    }
                    imageBuffer = Buffer.concat(chunks);
                }
            } catch (error) {
                // Method alternatif untuk gambar dengan caption
                try {
                    const stream = await downloadContentFromMessage(msg.message.imageMessage, 'image');
                    const chunks = [];
                    for await (const chunk of stream) {
                        chunks.push(chunk);
                    }
                    imageBuffer = Buffer.concat(chunks);
                } catch (downloadError) {
                    await sock.sendMessage(senderJid, {
                        text: `❌ Gagal mendownload gambar dari pesan ini

🔧 *Kemungkinan penyebab:*
• Format gambar tidak didukung
• File corrupt atau rusak
• Ukuran file terlalu besar

💡 *Solusi:*
• Coba kirim ulang gambar
• Gunakan format JPG, PNG, atau WEBP
• Pastikan ukuran file di bawah 5MB`
                    }, { quoted: msg });
                    return;
                }
            }
        }
        // Cek apakah ada gambar di pesan yang dikutip
        else if (quotedMsg?.imageMessage) {
            try {
                // Buat objek pesan yang lebih lengkap untuk download
                const quotedKey = msg.message.extendedTextMessage.contextInfo.stanzaId;
                const quotedParticipant = msg.message.extendedTextMessage.contextInfo.participant;

                const tempMsg = {
                    key: {
                        remoteJid: senderJid,
                        fromMe: false,
                        id: quotedKey,
                        participant: quotedParticipant
                    },
                    message: { imageMessage: quotedMsg.imageMessage }
                };

                // Coba beberapa metode download
                try {
                    imageBuffer = await sock.downloadMediaMessage(tempMsg);
                } catch (downloadError1) {
                    // Metode alternatif 1: langsung dari quotedMsg
                    try {
                        const stream = await downloadContentFromMessage(quotedMsg.imageMessage, 'image');
                        const chunks = [];
                        for await (const chunk of stream) {
                            chunks.push(chunk);
                        }
                        imageBuffer = Buffer.concat(chunks);
                    } catch (downloadError2) {
                        // Metode alternatif 2: dari context info
                        const quotedMessage = msg.message.extendedTextMessage.contextInfo.quotedMessage;
                        if (quotedMessage && quotedMessage.imageMessage) {
                            const stream = await downloadContentFromMessage(quotedMessage.imageMessage, 'image');
                            const chunks = [];
                            for await (const chunk of stream) {
                                chunks.push(chunk);
                            }
                            imageBuffer = Buffer.concat(chunks);
                        } else {
                            throw new Error('Tidak dapat mengakses gambar dari pesan yang dikutip');
                        }
                    }
                }
            } catch (error) {
                console.error('Error downloading quoted image:', error);
                await sock.sendMessage(senderJid, {
                    text: `❌ Gagal mendownload gambar dari pesan yang dikutip

🔧 *Kemungkinan penyebab:*
• Gambar sudah expired atau dihapus
• Bot tidak memiliki akses ke media lama
• Pesan yang dikutip bukan gambar valid
• Server WhatsApp sedang bermasalah

💡 *Solusi:*
• Coba kirim ulang gambar dengan caption .hitamkan
• Pastikan gambar masih dapat dilihat
• Forward gambar lalu reply dengan .hitamkan
• Gunakan gambar yang baru dikirim`
                }, { quoted: msg });
                return;
            }
        }

        // Jika tidak ada gambar atau buffer kosong
        if (!imageBuffer || imageBuffer.length === 0) {
            await sock.sendMessage(senderJid, {
                text: `❌ *FORMAT SALAH!*

📝 *Cara penggunaan:*
• Kirim gambar dengan caption: ${config.bot.prefix}hitamkan
• Reply gambar dengan: ${config.bot.prefix}hitamkan

🖼️ *Contoh:*
• [kirim gambar] + caption "${config.bot.prefix}hitamkan"
• Reply gambar lalu ketik "${config.bot.prefix}hitamkan"

⚠️ *Catatan:*
• Hanya support format gambar (JPG, PNG, WEBP)
• Ukuran file maksimal 5MB
• Pastikan gambar tidak corrupt atau expired

🔧 *Tips tambahan:*
• Jika reply gambar gagal, coba kirim ulang gambar
• Forward gambar dari chat lain lalu reply
• Pastikan gambar masih bisa dilihat dengan normal`
            }, { quoted: msg });
            return;
        }

        // Validasi apakah buffer benar-benar gambar dengan lebih banyak format
        const validImageHeaders = [
            { header: Buffer.from([0xFF, 0xD8, 0xFF]), name: 'JPEG' }, // JPEG
            { header: Buffer.from([0x89, 0x50, 0x4E, 0x47]), name: 'PNG' }, // PNG  
            { header: Buffer.from([0x47, 0x49, 0x46]), name: 'GIF' }, // GIF
            { header: Buffer.from([0x52, 0x49, 0x46, 0x46]), name: 'WEBP' }, // WEBP (RIFF)
            { header: Buffer.from([0x42, 0x4D]), name: 'BMP' }, // BMP
            { header: Buffer.from([0x00, 0x00, 0x01, 0x00]), name: 'ICO' }, // ICO
            { header: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), name: 'JPEG_ALT1' }, // JPEG variant
            { header: Buffer.from([0xFF, 0xD8, 0xFF, 0xE1]), name: 'JPEG_ALT2' }, // JPEG variant
            { header: Buffer.from([0xFF, 0xD8, 0xFF, 0xE2]), name: 'JPEG_ALT3' }, // JPEG variant
            { header: Buffer.from([0xFF, 0xD8, 0xFF, 0xE3]), name: 'JPEG_ALT4' }, // JPEG variant
            { header: Buffer.from([0xFF, 0xD8, 0xFF, 0xE8]), name: 'JPEG_ALT5' }, // JPEG variant
            { header: Buffer.from([0xFF, 0xD8, 0xFF, 0xDB]), name: 'JPEG_ALT6' } // JPEG variant
        ];

        const detectedFormat = validImageHeaders.find(format => 
            imageBuffer.subarray(0, format.header.length).equals(format.header)
        );

        const isValidImage = detectedFormat !== undefined;

        if (!isValidImage) {
            await sock.sendMessage(senderJid, {
                text: `❌ *FILE TIDAK VALID!*

🚫 File yang dikirim bukan format gambar yang didukung

📝 *Format yang didukung:*
• JPEG (.jpg, .jpeg) - Semua variant
• PNG (.png) - Dengan transparansi
• GIF (.gif) - Animated/static
• WEBP (.webp) - Modern format
• BMP (.bmp) - Windows bitmap
• ICO (.ico) - Icon format

🔍 *Buffer Info:*
• Size: ${imageBuffer.length} bytes
• Header: ${imageBuffer.subarray(0, 8).toString('hex')}

💡 *Solusi:*
• Pastikan file adalah gambar asli
• Jangan gunakan document yang diubah extensi
• Kirim gambar langsung dari galeri
• Coba convert ke JPG/PNG terlebih dahulu`
            }, { quoted: msg });
            return;
        }

        // Kirim pesan loading
        await sock.sendMessage(senderJid, {
            text: '⏳ Sedang memproses gambar...\n🖼️ Mengubah ke hitam putih...'
        }, { quoted: msg });

        try {
            // Upload gambar ke uguu.se
            const filename = `hitamkan_${Date.now()}.jpg`;
            const imageUrl = await uploadToUguu(imageBuffer, filename);

            // Proses gambar melalui API
            const response = await axios.get(
                `https://zenzxz.dpdns.org/tools/hitamkan?imageUrl=${encodeURIComponent(imageUrl)}`,
                {
                    responseType: 'arraybuffer',
                    timeout: 60000 // 60 detik timeout
                }
            );

            // Kirim hasil gambar yang sudah dihitamkan
            const formatDetected = detectedFormat ? detectedFormat.name : 'Unknown';
            await sock.sendMessage(senderJid, {
                image: Buffer.from(response.data),
                caption: `✅ *GAMBAR BERHASIL DIHITAMKAN!*

🖼️ *Detail Proses:*
├─ Format: ${formatDetected}
├─ Size: ${Math.round(imageBuffer.length / 1024)}KB → ${Math.round(response.data.length / 1024)}KB
├─ Efek: Black & White Filter Applied
└─ Proses: ${filename}

🎨 *Fitur Used:* Hitamkan Gambar
⚡ *Processing Time:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}

🤖 *WilyKun Bot - Advanced Image Tools*`
            }, { quoted: msg });

        } catch (error) {
            console.error('Error processing hitamkan:', error);

            let errorMessage = '❌ Gagal memproses gambar';

            if (error.message.includes('upload')) {
                errorMessage = '❌ Gagal upload gambar ke server';
            } else if (error.message.includes('timeout')) {
                errorMessage = '❌ Proses gambar terlalu lama (timeout)';
            } else if (error.response?.status === 404) {
                errorMessage = '❌ Service hitamkan tidak tersedia';
            } else if (error.response?.status >= 500) {
                errorMessage = '❌ Server error, coba lagi nanti';
            }

            await sock.sendMessage(senderJid, {
                text: `${errorMessage}

🔄 *Solusi:*
• Pastikan gambar tidak rusak
• Coba dengan gambar yang lebih kecil
• Tunggu beberapa saat lalu coba lagi

💡 *Tips:*
• Gunakan gambar dengan ukuran wajar
• Format yang didukung: JPG, PNG, WEBP`
            }, { quoted: msg });
        }

    } catch (error) {
        console.error('Error in hitamkan command:', error);

        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan sistem saat memproses gambar'
        }, { quoted: msg });
    }
}

module.exports = {
    handleHitamkanCommand,
    uploadToUguu
};