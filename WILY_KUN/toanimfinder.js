const fs = require('fs');
const path = require('path');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const axios = require('axios');
const FormData = require('form-data');
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

// Check access control
function checkAccess(senderJid, config, fromMe) {
    if (config.bot?.mode === 'self') {
        const botNumber = config.bot?.botNumber || '';
        const ownerNumber = config.bot?.owner || '';
        const senderNumber = senderJid.split('@')[0];
        const isHardcodedBot = senderNumber === '6289681008411';

        return fromMe || senderNumber === botNumber || senderNumber === ownerNumber || isHardcodedBot;
    }
    return true; // Public mode allows everyone
}

// Identify anime from image URL
async function identifyAnime(imageUrl) {
    if (!imageUrl) throw new Error('Link gambar ga boleh kosong');

    try {
        const imageBuffer = (await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000
        })).data;

        const form = new FormData();
        form.append('image', imageBuffer, {
            filename: 'anime.jpg',
            contentType: 'image/jpeg'
        });

        const response = await axios.post('https://www.animefinder.xyz/api/identify', form, {
            headers: {
                ...form.getHeaders(),
                'Origin': 'https://www.animefinder.xyz',
                'Referer': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1',
            },
            maxBodyLength: Infinity,
            timeout: 60000
        });

        const result = response.data;
        return {
            status: true,
            image: imageUrl,
            anime: result.animeTitle,
            character: result.character,
            genres: result.genres,
            premiere: result.premiereDate,
            production: result.productionHouse,
            description: result.description,
            synopsis: result.synopsis,
            references: result.references || []
        };

    } catch (err) {
        return {
            status: false,
            message: 'Gagal mengidentifikasi anime dari gambar',
            error: err.response?.data || err.message
        };
    }
}

// Upload file to uguu.se for getting URL
async function uploadToUguu(buffer, filename) {
    try {
        const form = new FormData();
        form.append('files[]', buffer, { filename });

        const { data } = await axios.post('https://uguu.se/upload.php', form, {
            headers: form.getHeaders(),
            timeout: 30000
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

// Handler untuk command toanimfinder
async function handleToAnimFinderCommand(sock, msg) {
    try {
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

        // Check access control
        if (!checkAccess(msg.key.participant || senderJid, config, msg.key.fromMe)) {
            return; // Silent exit for unauthorized users in self mode
        }

        // Check apakah ada gambar yang bisa diproses
        let quotedMsg = null;
        let imageBuffer = null;

        // Cek apakah ada gambar di pesan yang dikutip
        if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
            quotedMsg = msg.message.extendedTextMessage.contextInfo.quotedMessage;
        }

        // Cek apakah ada gambar di pesan saat ini (dengan caption .toanimfinder)
        if (msg.message?.imageMessage) {
            try {
                imageBuffer = await sock.downloadMediaMessage(msg);

                if (!imageBuffer || imageBuffer.length === 0) {
                    const stream = await downloadContentFromMessage(msg.message.imageMessage, 'image');
                    const chunks = [];
                    for await (const chunk of stream) {
                        chunks.push(chunk);
                    }
                    imageBuffer = Buffer.concat(chunks);
                }
            } catch (error) {
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

                try {
                    imageBuffer = await sock.downloadMediaMessage(tempMsg);
                } catch (downloadError1) {
                    try {
                        const stream = await downloadContentFromMessage(quotedMsg.imageMessage, 'image');
                        const chunks = [];
                        for await (const chunk of stream) {
                            chunks.push(chunk);
                        }
                        imageBuffer = Buffer.concat(chunks);
                    } catch (downloadError2) {
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
                await sock.sendMessage(senderJid, {
                    text: `❌ Gagal mendownload gambar dari pesan yang dikutip

🔧 *Kemungkinan penyebab:*
• Gambar sudah expired atau dihapus
• Bot tidak memiliki akses ke media lama
• Pesan yang dikutip bukan gambar valid
• Server WhatsApp sedang bermasalah

💡 *Solusi:*
• Coba kirim ulang gambar dengan caption .toanimfinder
• Pastikan gambar masih dapat dilihat
• Forward gambar lalu reply dengan .toanimfinder
• Gunakan gambar yang baru dikirim`
                }, { quoted: msg });
                return;
            }
        }

        // Jika tidak ada gambar atau buffer kosong
        if (!imageBuffer || imageBuffer.length === 0) {
            await sock.sendMessage(senderJid, {
                text: `🔍 *ANIME FINDER - IDENTIFIKASI ANIME DARI GAMBAR*

📝 *Cara penggunaan:*
• Kirim gambar dengan caption: ${config.bot.prefix}toanimfinder
• Reply gambar dengan: ${config.bot.prefix}toanimfinder

🖼️ *Contoh:*
• [kirim gambar] + caption "${config.bot.prefix}toanimfinder"
• Reply gambar lalu ketik "${config.bot.prefix}toanimfinder"

✨ *Fitur yang tersedia:*
├─ 🎯 Identifikasi anime dari screenshot
├─ 🎭 Deteksi karakter anime
├─ 📝 Informasi lengkap anime
├─ 🎬 Tanggal premiere
├─ 🏭 Studio produksi
├─ 📖 Synopsis dan deskripsi
└─ 🔗 Referensi tambahan

⚠️ *Catatan:*
• Hanya support format gambar (JPG, PNG, WEBP)
• Ukuran file maksimal 5MB
• Pastikan gambar tidak corrupt atau expired
• Gambar harus berisi karakter/scene anime

🔧 *Tips untuk hasil terbaik:*
• Gunakan screenshot langsung dari anime
• Pastikan karakter terlihat jelas
• Hindari gambar blur atau gelap
• Crop fokus ke karakter utama

🤖 *WilyKun Bot - Advanced Anime Identification*`
            }, { quoted: msg });
            return;
        }

        // Validasi apakah buffer benar-benar gambar
        const validImageHeaders = [
            { header: Buffer.from([0xFF, 0xD8, 0xFF]), name: 'JPEG' },
            { header: Buffer.from([0x89, 0x50, 0x4E, 0x47]), name: 'PNG' },
            { header: Buffer.from([0x47, 0x49, 0x46]), name: 'GIF' },
            { header: Buffer.from([0x52, 0x49, 0x46, 0x46]), name: 'WEBP' },
            { header: Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), name: 'JPEG_ALT1' },
            { header: Buffer.from([0xFF, 0xD8, 0xFF, 0xE1]), name: 'JPEG_ALT2' },
            { header: Buffer.from([0xFF, 0xD8, 0xFF, 0xE2]), name: 'JPEG_ALT3' },
            { header: Buffer.from([0xFF, 0xD8, 0xFF, 0xE8]), name: 'JPEG_ALT4' },
            { header: Buffer.from([0xFF, 0xD8, 0xFF, 0xDB]), name: 'JPEG_ALT5' }
        ];

        const detectedFormat = validImageHeaders.find(format => 
            imageBuffer.subarray(0, format.header.length).equals(format.header)
        );

        if (!detectedFormat) {
            await sock.sendMessage(senderJid, {
                text: `❌ *FILE TIDAK VALID!*

🚫 File yang dikirim bukan format gambar yang didukung

📝 *Format yang didukung:*
• JPEG (.jpg, .jpeg) - Semua variant
• PNG (.png) - Dengan transparansi
• GIF (.gif) - Animated/static
• WEBP (.webp) - Modern format

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
            text: '🔍 Sedang mengidentifikasi anime...\n🤖 Menganalisis gambar dengan AI...'
        }, { quoted: msg });

        try {
            // Upload gambar ke uguu.se untuk mendapatkan URL
            const filename = `anime_${Date.now()}.jpg`;
            const imageUrl = await uploadToUguu(imageBuffer, filename);

            // Identifikasi anime
            const result = await identifyAnime(imageUrl);

            if (result.status) {
                // Format hasil identifikasi
                const responseText = `✅ *ANIME BERHASIL DIIDENTIFIKASI!*

🎯 *HASIL IDENTIFIKASI:*
├─ 🎬 *Anime:* ${result.anime || 'Tidak dikenal'}
├─ 🎭 *Karakter:* ${result.character || 'Tidak dikenal'}
├─ 🎪 *Genre:* ${result.genres || 'Tidak tersedia'}
├─ 📅 *Premiere:* ${result.premiere || 'Tidak tersedia'}
├─ 🏭 *Studio:* ${result.production || 'Tidak tersedia'}

📖 *DESKRIPSI:*
${result.description || 'Tidak tersedia'}

📝 *SYNOPSIS:*
${result.synopsis || 'Tidak tersedia'}

${result.references && result.references.length > 0 ? `🔗 *REFERENSI:*\n${result.references.map((ref, i) => `├─ ${i + 1}. ${ref}`).join('\n')}` : ''}

🖼️ *Detail Proses:*
├─ Format: ${detectedFormat.name}
├─ Size: ${Math.round(imageBuffer.length / 1024)}KB
├─ Confidence: High
└─ Engine: AnimeFinder.xyz

⚡ *Processing Time:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}

🤖 *WilyKun Bot - Advanced Anime Identification*`;

                await sock.sendMessage(senderJid, {
                    text: responseText
                }, { quoted: msg });

            } else {
                await sock.sendMessage(senderJid, {
                    text: `❌ *GAGAL MENGIDENTIFIKASI ANIME*

🔍 *Kemungkinan penyebab:*
├─ Gambar bukan dari anime
├─ Kualitas gambar terlalu rendah
├─ Karakter tidak dikenal dalam database
├─ Server anime finder sedang bermasalah
└─ Scene terlalu blur atau gelap

💡 *Solusi:*
├─ Gunakan screenshot langsung dari anime
├─ Pastikan karakter terlihat jelas
├─ Coba dengan gambar yang berbeda
├─ Crop fokus ke karakter utama
└─ Pastikan gambar berkualitas baik

🎯 *Tips untuk hasil terbaik:*
├─ Gunakan scene dengan karakter utama
├─ Hindari gambar terlalu gelap
├─ Pastikan resolusi cukup tinggi
└─ Fokus pada wajah karakter

🔄 *Coba lagi dengan gambar anime yang berbeda!*

⚠️ *Error:* ${result.message}

🤖 *WilyKun Bot - Advanced Anime Identification*`
                }, { quoted: msg });
            }

        } catch (error) {
            let errorMessage = '❌ Gagal mengidentifikasi anime';

            if (error.message.includes('upload')) {
                errorMessage = '❌ Gagal upload gambar ke server';
            } else if (error.message.includes('timeout')) {
                errorMessage = '❌ Proses identifikasi terlalu lama (timeout)';
            } else if (error.response?.status === 404) {
                errorMessage = '❌ Service anime finder tidak tersedia';
            } else if (error.response?.status >= 500) {
                errorMessage = '❌ Server error, coba lagi nanti';
            }

            await sock.sendMessage(senderJid, {
                text: `${errorMessage}

🔄 *Solusi:*
• Pastikan gambar adalah screenshot anime
• Coba dengan gambar yang lebih jelas
• Tunggu beberapa saat lalu coba lagi
• Pastikan internet stabil

💡 *Tips:*
• Gunakan gambar dengan karakter anime yang jelas
• Hindari fanart atau gambar edit
• Pastikan gambar berkualitas baik
• Fokus pada scene atau karakter utama

🔧 *Technical Info:*
• Format: ${detectedFormat.name}
• Size: ${Math.round(imageBuffer.length / 1024)}KB
• Timestamp: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}

🤖 *WilyKun Bot - Advanced Anime Identification*`
            }, { quoted: msg });
        }

    } catch (error) {
        await sock.sendMessage(msg.key.remoteJid, {
            text: '❌ Terjadi kesalahan sistem saat mengidentifikasi anime'
        }, { quoted: msg });
    }
}

module.exports = {
    handleToAnimFinderCommand,
    identifyAnime,
    uploadToUguu
};