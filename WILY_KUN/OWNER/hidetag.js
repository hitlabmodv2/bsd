
const fs = require('fs');
const path = require('path');
const { Wily } = require('../../CODE_REPLAY/reply');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

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
        // Mode public - tetap cek apakah owner/bot
        const isFromMe = msg.key.fromMe === true;
        const isBotNumber = actualSenderNumber === botNumber;
        const isOwnerNumber = actualSenderNumber === config.bot?.owner;
        const isBotNumberFromConfig = actualSenderNumber === config.bot?.botNumber;
        const isHardcodedBot = actualSenderNumber === '6289681008411';

        return isFromMe || isBotNumber || isOwnerNumber || isBotNumberFromConfig || isHardcodedBot;
    }
}

// Main handler function untuk hidetag command
async function handleHidetagCommand(sock, msg) {
    try {
        const config = loadConfig();

        // Cek akses berdasarkan mode bot
        if (!checkAccess(msg, config)) {
            if (config.bot?.mode === 'self') {
                return; // Bot diam saja dalam mode self
            } else {
                // Mode public tapi bukan owner/bot
                const accessDeniedText = `🚫 *AKSES DITOLAK*

❌ Maaf, fitur ini khusus untuk:
• Owner Bot
• Bot Owner
• Form Me

🔐 *Fitur Hide Tag hanya untuk:*
├─ Owner: ${config.bot?.owner || 'Tidak diset'}
├─ Bot Number: ${config.bot?.botNumber || 'Tidak diset'}
└─ Form Me: Pemilik bot

💡 *Alasan Pembatasan:*
• Fitur sensitive untuk mention semua member
• Dapat mengganggu member grup
• Hanya owner yang boleh menggunakan

⚠️ *Hide tag hanya bisa digunakan oleh pemilik bot*`;

                await Wily(accessDeniedText, msg, sock);
                return;
            }
        }

        // Ambil teks dari berbagai jenis pesan (teks biasa, caption media, dll)
        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || 
                          msg.message?.imageMessage?.caption ||
                          msg.message?.videoMessage?.caption ||
                          msg.message?.audioMessage?.caption ||
                          msg.message?.documentMessage?.caption || '';

        const prefix = config.bot?.prefix || '.';

        // Cek apakah pesan dimulai dengan prefix untuk command hidetag
        if (messageText.startsWith(prefix)) {
            const args = messageText.slice(prefix.length).trim().split(' ');
            const command = args[0].toLowerCase();

            if (command === 'hidetag') {
                // Cek apakah ini grup
                const isGroup = msg.key.remoteJid.endsWith('@g.us');
                
                if (!isGroup) {
                    const notGroupText = `❌ *FITUR KHUSUS GRUP*

🏠 *Hidetag hanya bisa digunakan di grup!*

💡 *Apa itu Hidetag?*
• Fitur untuk mention semua member grup
• Pesan akan terkirim ke semua member
• Member akan mendapat notifikasi tag
• Berguna untuk pengumuman penting

🔍 *Cara Penggunaan:*
• Masuk ke grup terlebih dahulu
• Ketik ${prefix}hidetag <pesan>
• Bot akan mention semua member

⚠️ *Gunakan dengan bijak dan hanya untuk hal penting!*`;

                    await Wily(notGroupText, msg, sock);
                    return;
                }

                // Cek apakah ada pesan untuk hidetag
                if (args.length < 2) {
                    const helpText = `📢 *HIDETAG - MENTION ALL MEMBERS*

❓ *Apa itu Hidetag?*
Fitur untuk mengirim pesan ke semua member grup dengan mention otomatis tanpa menampilkan daftar tag yang panjang.

📝 *Cara Penggunaan:*
${prefix}hidetag <pesan yang ingin dikirim>

💡 *Contoh Lengkap:*
${prefix}hidetag Halo semua! Ada pengumuman penting hari ini
${prefix}hidetag Meeting zoom jam 8 malam, jangan lupa ya!
${prefix}hidetag Info: Bot sudah update fitur baru
${prefix}hidetag Selamat pagi semuanya, semoga hari ini menyenangkan

🎯 *Fungsi Hidetag:*
• ✅ Mention semua member grup sekaligus
• ✅ Semua member dapat notifikasi
• ✅ Pesan tersampaikan ke seluruh grup
• ✅ Berguna untuk pengumuman penting
• ✅ Lebih efektif dari mention manual

📸 *DUKUNGAN MEDIA:*
• ✅ Kirim gambar + caption hidetag
• ✅ Kirim video + caption hidetag
• ✅ Kirim audio + caption hidetag
• ✅ Kirim dokumen + caption hidetag
• ✅ Kirim teks biasa

🔥 *Cara Pakai dengan Media:*
1. Kirim gambar/video/audio/dokumen
2. Tambahkan caption: ${prefix}hidetag <pesan>
3. Bot akan forward media + mention semua member

📱 *Contoh Caption Media:*
${prefix}hidetag Lihat gambar ini guys!
${prefix}hidetag Video penting untuk semua
${prefix}hidetag File penting untuk download

⚠️ *Perhatian:*
• Fitur ini khusus untuk owner/bot
• Hanya bisa digunakan di grup
• Gunakan dengan bijak untuk hal penting
• Jangan spam atau mengganggu member

🔐 *Akses:* Owner & Bot Only
📊 *Mode Bot:* ${config.bot?.mode?.toUpperCase() || 'PUBLIC'}

💬 *Format:* ${prefix}hidetag [pesan Anda]
📸 *Media:* Kirim media + caption ${prefix}hidetag [pesan]`;

                    await Wily(helpText, msg, sock);
                    return;
                }

                try {
                    // Ambil metadata grup
                    const groupMetadata = await sock.groupMetadata(msg.key.remoteJid);
                    const participants = groupMetadata.participants;

                    // Buat array mention untuk semua participant
                    const mentions = participants.map(participant => participant.id);

                    // Ambil pesan yang ingin dikirim
                    const hidetagMessage = args.slice(1).join(' ');

                    // Deteksi jenis media
                    let mediaType = 'Teks';
                    let hasMedia = false;
                    let mediaData = {};

                    if (msg.message?.imageMessage) {
                        mediaType = 'Gambar';
                        hasMedia = true;
                        
                        // Download dan kirim ulang gambar
                        try {
                            const buffer = await downloadMediaMessage(msg, 'buffer', {});
                            mediaData = {
                                image: buffer,
                                caption: `📢 *HIDETAG MESSAGE*

${hidetagMessage}

━━━━━━━━━━━━━━━━━━━━━
👥 *Grup:* ${groupMetadata.subject}
📊 *Total Member:* ${participants.length} orang
🎯 *Media:* ${mediaType}
🤖 *Sent by:* Bot Owner
⏰ *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
                                mentions: mentions
                            };
                        } catch (error) {
                            // Fallback menggunakan media asli
                            mediaData = {
                                image: msg.message.imageMessage,
                                caption: `📢 *HIDETAG MESSAGE*

${hidetagMessage}

━━━━━━━━━━━━━━━━━━━━━
👥 *Grup:* ${groupMetadata.subject}
📊 *Total Member:* ${participants.length} orang
🎯 *Media:* ${mediaType}
🤖 *Sent by:* Bot Owner
⏰ *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
                                mentions: mentions
                            };
                        }
                    } else if (msg.message?.videoMessage) {
                        mediaType = 'Video';
                        hasMedia = true;
                        
                        // Download dan kirim ulang video
                        try {
                            const buffer = await downloadMediaMessage(msg, 'buffer', {});
                            mediaData = {
                                video: buffer,
                                caption: `📢 *HIDETAG MESSAGE*

${hidetagMessage}

━━━━━━━━━━━━━━━━━━━━━
👥 *Grup:* ${groupMetadata.subject}
📊 *Total Member:* ${participants.length} orang
🎯 *Media:* ${mediaType}
🤖 *Sent by:* Bot Owner
⏰ *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
                                mentions: mentions
                            };
                        } catch (error) {
                            // Fallback menggunakan media asli
                            mediaData = {
                                video: msg.message.videoMessage,
                                caption: `📢 *HIDETAG MESSAGE*

${hidetagMessage}

━━━━━━━━━━━━━━━━━━━━━
👥 *Grup:* ${groupMetadata.subject}
📊 *Total Member:* ${participants.length} orang
🎯 *Media:* ${mediaType}
🤖 *Sent by:* Bot Owner
⏰ *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
                                mentions: mentions
                            };
                        }
                    } else if (msg.message?.audioMessage) {
                        mediaType = 'Audio';
                        hasMedia = true;
                        
                        // Download dan kirim ulang audio
                        try {
                            const buffer = await downloadMediaMessage(msg, 'buffer', {});
                            mediaData = {
                                audio: buffer,
                                caption: `📢 *HIDETAG MESSAGE*

${hidetagMessage}

━━━━━━━━━━━━━━━━━━━━━
👥 *Grup:* ${groupMetadata.subject}
📊 *Total Member:* ${participants.length} orang
🎯 *Media:* ${mediaType}
🤖 *Sent by:* Bot Owner
⏰ *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
                                mentions: mentions,
                                mimetype: msg.message.audioMessage.mimetype || 'audio/mp4',
                                ptt: msg.message.audioMessage.ptt || false
                            };
                        } catch (error) {
                            // Fallback menggunakan media asli
                            mediaData = {
                                audio: msg.message.audioMessage,
                                caption: `📢 *HIDETAG MESSAGE*

${hidetagMessage}

━━━━━━━━━━━━━━━━━━━━━
👥 *Grup:* ${groupMetadata.subject}
📊 *Total Member:* ${participants.length} orang
🎯 *Media:* ${mediaType}
🤖 *Sent by:* Bot Owner
⏰ *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
                                mentions: mentions,
                                mimetype: msg.message.audioMessage.mimetype || 'audio/mp4',
                                ptt: msg.message.audioMessage.ptt || false
                            };
                        }
                    } else if (msg.message?.documentMessage) {
                        mediaType = 'Dokumen';
                        hasMedia = true;
                        
                        // Download dan kirim ulang dokumen
                        try {
                            const buffer = await downloadMediaMessage(msg, 'buffer', {});
                            mediaData = {
                                document: buffer,
                                caption: `📢 *HIDETAG MESSAGE*

${hidetagMessage}

━━━━━━━━━━━━━━━━━━━━━
👥 *Grup:* ${groupMetadata.subject}
📊 *Total Member:* ${participants.length} orang
🎯 *Media:* ${mediaType}
🤖 *Sent by:* Bot Owner
⏰ *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
                                mentions: mentions,
                                mimetype: msg.message.documentMessage.mimetype || 'application/octet-stream',
                                fileName: msg.message.documentMessage.fileName || 'document'
                            };
                        } catch (error) {
                            // Fallback menggunakan media asli
                            mediaData = {
                                document: msg.message.documentMessage,
                                caption: `📢 *HIDETAG MESSAGE*

${hidetagMessage}

━━━━━━━━━━━━━━━━━━━━━
👥 *Grup:* ${groupMetadata.subject}
📊 *Total Member:* ${participants.length} orang
🎯 *Media:* ${mediaType}
🤖 *Sent by:* Bot Owner
⏰ *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
                                mentions: mentions,
                                mimetype: msg.message.documentMessage.mimetype || 'application/octet-stream',
                                fileName: msg.message.documentMessage.fileName || 'document'
                            };
                        }
                    }

                    if (hasMedia) {
                        // Kirim media dengan caption hidetag
                        await sock.sendMessage(msg.key.remoteJid, mediaData);
                    } else {
                        // Format pesan teks biasa
                        const finalMessage = `📢 *HIDETAG MESSAGE*

${hidetagMessage}

━━━━━━━━━━━━━━━━━━━━━
👥 *Grup:* ${groupMetadata.subject}
📊 *Total Member:* ${participants.length} orang
🎯 *Media:* ${mediaType}
🤖 *Sent by:* Bot Owner
⏰ *Waktu:* ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`;

                        // Kirim pesan teks dengan mention semua member
                        await sock.sendMessage(msg.key.remoteJid, {
                            text: finalMessage,
                            mentions: mentions
                        });
                    }

                    // Hapus pesan command untuk menjaga kebersihan grup
                    try {
                        await sock.sendMessage(msg.key.remoteJid, { delete: msg.key });
                    } catch (deleteError) {
                        // Jika gagal hapus pesan command, abaikan
                    }

                } catch (error) {
                    await Wily(`❌ *GAGAL MENGIRIM HIDETAG*

Terjadi kesalahan saat mengambil data grup atau mengirim pesan hidetag.

💡 *Kemungkinan Penyebab:*
• Bot bukan member grup
• Tidak ada izin untuk mention
• Masalah koneksi

🔄 *Silakan coba lagi dalam beberapa saat*`, msg, sock);
                }
            }
        }

    } catch (error) {
        await Wily(`❌ Terjadi kesalahan sistem\n\n💡 Silakan coba lagi`, msg, sock);
    }
}

module.exports = {
    handleHidetagCommand,
    checkAccess,
    loadConfig
};
