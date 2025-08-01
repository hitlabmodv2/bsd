const axios = require('axios');
const { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter');
const { Wily } = require('../CODE_REPLAY/reply');

// Load config function
function loadConfig() {
    try {
        const fs = require('fs');
        const path = require('path');
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

// ReplyRynzz function for styled replies
async function ReplyRynzz(sock, msg, teks, profilePic = null, options = {}) {
    const hariini = new Date().toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
    const packname = options.packname || "Emoji Mixer Bot";
    const senderName = msg.pushName || (msg.key.participant || msg.key.remoteJid).split('@')[0];
    const formattedDate = new Date().toLocaleDateString('id-ID');

    // Get user profile picture if not provided
    if (!profilePic) {
        try {
            const userJid = msg.key.participant || msg.key.remoteJid;
            profilePic = await sock.profilePictureUrl(userJid, 'image');
        } catch (error) {
            profilePic = "https://files.catbox.moe/mxohav.gif";
        }
    }

    try {
        const content = {
            text: teks,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                    newsletterName: packname,
                    newsletterJid: "120363312297133690@newsletter",
                },
                externalAdReply: {
                    showAdAttribution: true,
                    title: `${hariini}`,
                    body: `${packname}`,
                    previewType: "IMAGE",
                    thumbnailUrl: profilePic || "https://files.catbox.moe/mxohav.gif",
                    sourceUrl: "https://wa.me/6289688206739",
                    mediaType: 1,
                    renderLargerThumbnail: false
                },
            },
        };

        return await sock.sendMessage(msg.key.remoteJid, content, { quoted: msg });
    } catch (error) {
        // Fallback to simple text
        return await sock.sendMessage(msg.key.remoteJid, { text: teks }, { quoted: msg });
    }
}

// Function to convert emoji to URL encoded format
function encodeEmoji(emoji) {
    return encodeURIComponent(emoji);
}

// Function to get random emoji
function getRandomEmoji() {
    const emojis = [
        '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇',
        '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚',
        '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩',
        '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
        '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬',
        '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
        '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯',
        '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
        '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈',
        '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾',
        '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿',
        '😾', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤎', '🖤', '🤍'
    ];
    return emojis[Math.floor(Math.random() * emojis.length)];
}

// Main handler for emoji command
async function handleEmojiCommand(sock, msg) {
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

        // Parse message untuk mendapatkan args
        const messageText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const prefix = config.bot?.prefix || '.';
        const args = messageText.slice(prefix.length).trim().split(' ');
        const command = args[0].toLowerCase();

        // Jika hanya ketik .emoji tanpa parameter
        if (command === 'emoji' && args.length === 1) {
            const helpText = `
🎭 *EMOJI MIXER*

📝 *Cara penggunaan:*
→ ${prefix}emoji <emoji1> <emoji2>
→ ${prefix}emoji random

📋 *Contoh:*
→ ${prefix}emoji 😀 😢
→ ${prefix}emoji 🥰 😂
→ ${prefix}emoji 🔥 💯
→ ${prefix}emoji random

🎲 *Mode Random:*
→ ${prefix}emoji random
→ Bot akan memilih 2 emoji secara acak

✨ *Fitur:*
• Menggabungkan 2 emoji menjadi 1 sticker
• Support semua emoji Unicode
• Hasil berupa sticker siap pakai
• Mode random untuk kejutan

🎯 *Tips:*
• Gunakan emoji yang kontras untuk hasil menarik
• Coba kombinasi emoji wajah dengan objek
• Mode random sering memberikan hasil unik

🤖 *WilyKun Bot - Emoji Mixer*`;

            await ReplyRynzz(sock, msg, helpText, null, {
                packname: "Emoji Mixer Help",
                author: 'WilyKun Bot'
            });
            return;
        }

        let emoji1, emoji2;

        // Handle random mode
        if (args[1] && args[1].toLowerCase() === 'random') {
            emoji1 = getRandomEmoji();
            emoji2 = getRandomEmoji();

            await ReplyRynzz(sock, msg, `🎲 *Mode Random Aktif!*\n\n🎭 Emoji terpilih: ${emoji1} + ${emoji2}\n⏳ Sedang membuat sticker...`, null);
        } else if (args.length >= 3) {
            emoji1 = args[1];
            emoji2 = args[2];

            await ReplyRynzz(sock, msg, `🎭 *Emoji Mixer*\n\n✨ Menggabungkan: ${emoji1} + ${emoji2}\n⏳ Sedang membuat sticker...`, null);
        } else {
            await ReplyRynzz(sock, msg, `❌ *Format salah!*\n\n📝 Gunakan:\n→ ${prefix}emoji <emoji1> <emoji2>\n→ ${prefix}emoji random\n\n💡 Contoh: ${prefix}emoji 😀 😢`, null);
            return;
        }

        try {
            // Encode emojis untuk URL
            const encodedEmoji1 = encodeEmoji(emoji1);
            const encodedEmoji2 = encodeEmoji(emoji2);

            // Call API emoji mixer
            const apiUrl = `https://zenzxz.dpdns.org/maker/emojimix?emoji1=${encodedEmoji1}&emoji2=${encodedEmoji2}`;

            const response = await axios.get(apiUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!response.data || response.data.length === 0) {
                throw new Error('API tidak mengembalikan data gambar');
            }

            // Convert buffer to sticker
            const imageBuffer = Buffer.from(response.data);

            // Create sticker using wa-sticker-formatter
            const sticker = new Sticker(imageBuffer, {
                pack: config.sticker?.packname || 'WilyKun Bot',
                author: config.sticker?.author || '© WilyKun',
                type: StickerTypes.FULL,
                categories: ['🎭', '😀'],
                id: `emoji-mix-${Date.now()}`,
                quality: 50
            });

            const stickerBuffer = await sticker.toBuffer();

            // Send sticker dengan quoted message
            await sock.sendMessage(senderJid, {
                sticker: stickerBuffer
            }, { quoted: msg });

            // Send success message
            const successText = `✅ *Emoji Mix Berhasil!*

🎭 *Detail:*
├─ Emoji 1: ${emoji1}
├─ Emoji 2: ${emoji2}
├─ Hasil: Sticker Mix
└─ API: ZenZ Emoji Mixer

🤖 *WilyKun Bot - Emoji Mixer*`;

            await ReplyRynzz(sock, msg, successText, null, {
                packname: "Emoji Mix Success",
                author: 'WilyKun Bot'
            });

        } catch (error) {
            let errorMessage = '❌ Gagal membuat emoji mix';

            if (error.message.includes('timeout')) {
                errorMessage = '❌ Timeout saat mengakses API emoji mixer';
            } else if (error.response?.status === 404) {
                errorMessage = '❌ Kombinasi emoji tidak ditemukan di API';
            } else if (error.response?.status >= 500) {
                errorMessage = '❌ Server API emoji mixer bermasalah';
            } else if (error.message.includes('tidak mengembalikan data')) {
                errorMessage = '❌ API tidak mengembalikan gambar valid';
            }

            const errorText = `${errorMessage}

🔄 *Solusi:*
• Coba kombinasi emoji yang berbeda
• Gunakan emoji standar Unicode
• Coba mode random: ${prefix}emoji random
• Tunggu beberapa saat lalu coba lagi

💡 *Tips:*
• Tidak semua kombinasi emoji tersedia
• Gunakan emoji populer untuk hasil terbaik
• Mode random biasanya selalu berhasil

🎭 *Contoh yang biasanya work:*
→ ${prefix}emoji 😀 😢
→ ${prefix}emoji 🥰 😂
→ ${prefix}emoji random`;

            await ReplyRynzz(sock, msg, errorText, null, {
                packname: "Emoji Mix Error",
                author: 'WilyKun Bot'
            });
        }

    } catch (error) {
        const fallbackText = '❌ Terjadi kesalahan sistem saat memproses emoji mix';

        try {
            await ReplyRynzz(sock, msg, fallbackText, null);
        } catch (fallbackError) {
            await sock.sendMessage(msg.key.remoteJid, { text: fallbackText }, { quoted: msg });
        }
    }
}

// Send quoted message function using Wily
async function sendQuotedMessage(sock, jid, text, quotedMsg) {
    try {
        await Wily(text, quotedMsg, sock);
    } catch (error) {
        console.log('Error sending quoted message:', error);
    }
}

module.exports = {
    handleEmojiCommand
};