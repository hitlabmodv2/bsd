
const fs = require('fs');
const path = require('path');

// Function to get Jakarta time
function getJakartaTime() {
    const jakartaTime = new Date().toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
    return jakartaTime;
}

// Fungsi untuk memuat config
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
        return getDefaultConfig();
    } catch (error) {
        return getDefaultConfig();
    }
}

function getDefaultConfig() {
    return {
        bot: {
            mode: "public",
            prefix: ".",
            botname: "WilyKun Bot",
            packname: "Auto Read Story",
            thumbnailReply: "https://files.catbox.moe/mxohav.gif",
            wame: "https://wa.me/6289681008411"
        }
    };
}

async function Wily(teks, m, sock) {
    try {
        const config = loadConfig();
        
        const thumbnailReply = config.bot?.thumbnailReply || "https://files.catbox.moe/mxohav.gif";

        // Enhanced foto profil detection untuk berbagai WhatsApp client
        let ppuser;
        try {
            // Tentukan JID yang tepat untuk foto profil
            let targetJid;
            
            // Enhanced JID detection
            if (m.key?.remoteJid?.endsWith('@g.us') && m.key?.participant) {
                // Pesan dari grup
                targetJid = m.key.participant;
            }
            else if (m.key?.remoteJid?.endsWith('@s.whatsapp.net')) {
                // Pesan pribadi
                targetJid = m.key.remoteJid;
            }
            else if (m.key?.fromMe) {
                // Pesan dari bot sendiri
                targetJid = sock.user?.id || m.key?.remoteJid;
            }
            else if (m.participant) {
                // Format alternatif untuk grup
                targetJid = m.participant;
            }
            else if (m.from) {
                // Format alternatif
                targetJid = m.from;
            }
            else if (m.sender) {
                // Format lain
                targetJid = m.sender;
            }
            else {
                // Default fallback
                targetJid = m.key?.participant || m.key?.remoteJid;
            }
            
            if (targetJid) {
                ppuser = await sock.profilePictureUrl(targetJid, 'image');
            }
        } catch (error) {
            // Silent error untuk profile picture
            ppuser = null;
        }

        // Get runtime info
        const processUptime = process.uptime();
        const formatUptime = (uptime) => {
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            return `${hours}h ${minutes}m ${seconds}s`;
        };

        // Get sender info for personalized greeting
        let senderName = "User";
        let senderNumber = "";
        
        try {
            if (m.key?.participant) {
                senderNumber = m.key.participant.split('@')[0];
            } else if (m.key?.remoteJid) {
                senderNumber = m.key.remoteJid.split('@')[0];
            }
            
            // Try to get contact name or use number
            if (m.pushName) {
                senderName = m.pushName;
            } else if (senderNumber) {
                senderName = senderNumber;
            }
        } catch (error) {
            senderName = "User";
        }

        // Function to get emoji based on name/words
        const getNameEmoji = (name) => {
            const lowerName = name.toLowerCase();
            
            // Emoji mapping based on keywords in name
            if (lowerName.includes('love') || lowerName.includes('sayang') || lowerName.includes('cinta')) return '💕';
            if (lowerName.includes('king') || lowerName.includes('raja') || lowerName.includes('sultan')) return '👑';
            if (lowerName.includes('queen') || lowerName.includes('ratu') || lowerName.includes('princess')) return '👸';
            if (lowerName.includes('angel') || lowerName.includes('malaikat')) return '😇';
            if (lowerName.includes('devil') || lowerName.includes('setan')) return '😈';
            if (lowerName.includes('star') || lowerName.includes('bintang')) return '⭐';
            if (lowerName.includes('moon') || lowerName.includes('bulan')) return '🌙';
            if (lowerName.includes('sun') || lowerName.includes('matahari')) return '☀️';
            if (lowerName.includes('fire') || lowerName.includes('api')) return '🔥';
            if (lowerName.includes('water') || lowerName.includes('air')) return '💧';
            if (lowerName.includes('flower') || lowerName.includes('bunga')) return '🌸';
            if (lowerName.includes('cat') || lowerName.includes('kucing')) return '🐱';
            if (lowerName.includes('dog') || lowerName.includes('anjing')) return '🐶';
            if (lowerName.includes('cute') || lowerName.includes('imut')) return '🥰';
            if (lowerName.includes('cool') || lowerName.includes('keren')) return '😎';
            if (lowerName.includes('smart') || lowerName.includes('pintar')) return '🧠';
            if (lowerName.includes('strong') || lowerName.includes('kuat')) return '💪';
            if (lowerName.includes('fast') || lowerName.includes('cepat')) return '⚡';
            if (lowerName.includes('peace') || lowerName.includes('damai')) return '☮️';
            if (lowerName.includes('music') || lowerName.includes('musik')) return '🎵';
            if (lowerName.includes('game') || lowerName.includes('gaming')) return '🎮';
            if (lowerName.includes('art') || lowerName.includes('seni')) return '🎨';
            if (lowerName.includes('book') || lowerName.includes('buku')) return '📚';
            
            // Default emojis based on first letter
            const firstChar = lowerName.charAt(0);
            const emojiMap = {
                'a': '🌟', 'b': '🚀', 'c': '🎯', 'd': '💎', 'e': '🌊', 'f': '🔥',
                'g': '🌈', 'h': '💫', 'i': '✨', 'j': '🎉', 'k': '👑', 'l': '💝',
                'm': '🌙', 'n': '🌸', 'o': '🌺', 'p': '🌻', 'q': '💜', 'r': '🌹',
                's': '⭐', 't': '🎭', 'u': '🦄', 'v': '💚', 'w': '🌿', 'x': '❌',
                'y': '💛', 'z': '⚡'
            };
            
            return emojiMap[firstChar] || '🌟';
        };

        // Get accurate Jakarta time
        const now = new Date();
        const jakartaTimeFormatter = new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        const jakartaDateFormatter = new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta',
            weekday: 'long',
            day: 'numeric', 
            month: 'long',
            year: 'numeric'
        });

        const jakartaTime = jakartaTimeFormatter.format(now);
        const jakartaDate = jakartaDateFormatter.format(now);

        const nameEmoji = getNameEmoji(senderName);
        const personalizedTitle = `${nameEmoji} Halo ${senderName}! Auto Story Reaction`;

        // Struktur pesan dengan contextInfo yang cantik seperti welcome message
        const messageContent = {
            text: teks,
            contextInfo: {
                quotedMessage: {
                    conversation: `*_Dikembangkan Oleh @WilyKun Bot_* *${jakartaTime} WIB*`
                },
                mentionedJid: [m.key.participant || m.key.remoteJid],
                participant: "6289688206739@s.whatsapp.net",
                remoteJid: "120363312297133690@g.us",
                forwardingScore: 999,
                isForwarded: true,
                externalAdReply: {
                    title: personalizedTitle,
                    body: `✨ Runtime: ${formatUptime(processUptime)} | 🔥 Active Stories | 💫 Smart Reactions`,
                    thumbnailUrl: ppuser || 'https://files.catbox.moe/mxohav.gif',
                    sourceUrl: "https://wa.me/6289688206739",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                    showAdAttribution: false
                },
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363312297133690@newsletter",
                    newsletterName: "WilyKun Official Bot"
                }
            }
        };
        
        return await sock.sendMessage(m.key.remoteJid, messageContent, {
            quoted: m,
        });
    } catch (error) {
        // Fallback to simple text if context fails
        return await sock.sendMessage(m.key.remoteJid, { text: teks }, { quoted: m });
    }
}

module.exports = { Wily };
