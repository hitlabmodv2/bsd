
import fs from 'fs';
import path from 'path';
import { 
    getAsiaJakartaTime, 
    getJakartaTimeString, 
    getSelamat, 
    getHari, 
    getTanggal, 
    getBulan, 
    getTahun, 
    getWaktu 
} from '../lib/CodeAsiaJakarta.js';

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
        OWNER: ["6282263096788"],
        SELF: true,
        mode: "self",
        packName: "Sticker Dibuat Oleh : Wily",
        packPublish: "Dika Ardnt.",
        SESSION_NAME: "session"
    };
}

// Fungsi untuk mendapatkan emoji berdasarkan nama
function getNameEmoji(name) {
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
}

// Fungsi untuk mendapatkan runtime yang diformat
function getFormattedRuntime() {
    const processUptime = process.uptime();
    const hours = Math.floor(processUptime / 3600);
    const minutes = Math.floor((processUptime % 3600) / 60);
    const seconds = Math.floor(processUptime % 60);
    return `${hours}h ${minutes}m ${seconds}s`;
}

// Main reply function
async function Wily(teks, m, sock) {
    try {
        const config = loadConfig();

        // Get Jakarta time information
        const jakartaInfo = getAsiaJakartaTime();
        const waktuJakarta = getWaktu();
        const hariJakarta = getHari();
        const tanggalJakarta = getTanggal();
        const bulanJakarta = getBulan();
        const tahunJakarta = getTahun();
        const salamJakarta = getSelamat();

        // Enhanced foto profil detection
        let ppuser;
        try {
            let targetJid;

            if (m.key?.remoteJid?.endsWith('@g.us') && m.key?.participant) {
                targetJid = m.key.participant;
            } else if (m.key?.remoteJid?.endsWith('@s.whatsapp.net')) {
                targetJid = m.key.remoteJid;
            } else if (m.key?.fromMe) {
                targetJid = sock.user?.id || m.key?.remoteJid;
            } else if (m.participant) {
                targetJid = m.participant;
            } else if (m.from) {
                targetJid = m.from;
            } else if (m.sender) {
                targetJid = m.sender;
            } else {
                targetJid = m.key?.participant || m.key?.remoteJid;
            }

            if (targetJid) {
                ppuser = await sock.profilePictureUrl(targetJid, 'image');
            }
        } catch (error) {
            ppuser = null;
        }

        // Get sender info for personalized greeting
        let senderName = "User";
        let senderNumber = "";

        try {
            if (m.key?.participant) {
                senderNumber = m.key.participant.split('@')[0];
            } else if (m.key?.remoteJid) {
                senderNumber = m.key.remoteJid.split('@')[0];
            }

            if (m.pushName) {
                senderName = m.pushName;
            } else if (senderNumber) {
                senderName = senderNumber;
            }
        } catch (error) {
            senderName = "User";
        }

        const nameEmoji = getNameEmoji(senderName);
        const runtime = getFormattedRuntime();
        const personalizedTitle = `${nameEmoji} ${salamJakarta} ${senderName}!`;

        // Create beautiful message with contextInfo
        const messageContent = {
            text: teks,
            contextInfo: {
                quotedMessage: {
                    conversation: `*_Dikembangkan Oleh @WilyKun Bot_* *${waktuJakarta}*`
                },
                mentionedJid: [m.key?.participant || m.key?.remoteJid].filter(Boolean),
                externalAdReply: {
                    title: personalizedTitle,
                    body: `${hariJakarta} ${tanggalJakarta} ${bulanJakarta} ${tahunJakarta} | ⚡ Runtime: ${runtime} | 🚀 Bot Active`,
                    thumbnailUrl: ppuser || 'https://files.catbox.moe/mxohav.gif',
                    sourceUrl: "https://wa.me/6289688206739",
                    mediaType: 1,
                    renderLargerThumbnail: false,
                    showAdAttribution: false
                },
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363312297133690@newsletter",
                    newsletterName: `WilyKun Official Bot - ${hariJakarta}`
                },
                forwardingScore: 999,
                isForwarded: true
            }
        };

        return await sock.sendMessage(m.key.remoteJid, messageContent, {
            quoted: m,
        });
    } catch (error) {
        // Fallback to simple text if context fails
        try {
            return await sock.sendMessage(m.key.remoteJid, { text: teks }, { quoted: m });
        } catch (fallbackError) {
            // Final fallback without quote
            return await sock.sendMessage(m.key.remoteJid, { text: teks });
        }
    }
}

// Alternative simple reply function
async function SimpleReply(teks, m, sock) {
    try {
        const waktuJakarta = getWaktu();
        const salamJakarta = getSelamat();

        const messageContent = {
            text: `${salamJakarta} 🌟\n\n${teks}\n\n⏰ ${waktuJakarta}\n🤖 WilyKun Bot Active`,
        };

        return await sock.sendMessage(m.key.remoteJid, messageContent, {
            quoted: m,
        });
    } catch (error) {
        return await sock.sendMessage(m.key.remoteJid, { text: teks });
    }
}

// Function to create status-like reply
async function StatusReply(teks, m, sock) {
    try {
        const jakartaInfo = getAsiaJakartaTime();
        const fullTimeString = getJakartaTimeString();

        let senderName = m.pushName || "User";
        const nameEmoji = getNameEmoji(senderName);

        const statusMessage = `${nameEmoji} *${senderName}*\n\n${teks}\n\n${fullTimeString}\n\n🚀 *WilyKun Bot* - Always Active`;

        return await sock.sendMessage(m.key.remoteJid, { 
            text: statusMessage 
        }, { 
            quoted: m 
        });
    } catch (error) {
        return await sock.sendMessage(m.key.remoteJid, { text: teks });
    }
}

// Function to create multiple forwarded messages
async function MultiForward(teks, m, sock, forwardCount = 3) {
    try {
        const config = loadConfig();

        // Get Jakarta time information
        const jakartaInfo = getAsiaJakartaTime();
        const waktuJakarta = getWaktu();
        const hariJakarta = getHari();
        const tanggalJakarta = getTanggal();
        const bulanJakarta = getBulan();
        const tahunJakarta = getTahun();
        const salamJakarta = getSelamat();

        // Enhanced foto profil detection
        let ppuser;
        try {
            let targetJid;

            if (m.key?.remoteJid?.endsWith('@g.us') && m.key?.participant) {
                targetJid = m.key.participant;
            } else if (m.key?.remoteJid?.endsWith('@s.whatsapp.net')) {
                targetJid = m.key.remoteJid;
            } else if (m.key?.fromMe) {
                targetJid = sock.user?.id || m.key?.remoteJid;
            } else if (m.participant) {
                targetJid = m.participant;
            } else if (m.from) {
                targetJid = m.from;
            } else if (m.sender) {
                targetJid = m.sender;
            } else {
                targetJid = m.key?.participant || m.key?.remoteJid;
            }

            if (targetJid) {
                ppuser = await sock.profilePictureUrl(targetJid, 'image');
            }
        } catch (error) {
            ppuser = null;
        }

        // Get sender info for personalized greeting
        let senderName = "User";
        let senderNumber = "";

        try {
            if (m.key?.participant) {
                senderNumber = m.key.participant.split('@')[0];
            } else if (m.key?.remoteJid) {
                senderNumber = m.key.remoteJid.split('@')[0];
            }

            if (m.pushName) {
                senderName = m.pushName;
            } else if (senderNumber) {
                senderName = senderNumber;
            }
        } catch (error) {
            senderName = "User";
        }

        const nameEmoji = getNameEmoji(senderName);
        const runtime = getFormattedRuntime();
        const personalizedTitle = `${nameEmoji} ${salamJakarta} ${senderName}!`;

        // Create beautiful message with high forwarding score
        const messageContent = {
            text: teks,
            contextInfo: {
                quotedMessage: {
                    conversation: `*_Dikembangkan Oleh @WilyKun Bot_* *${waktuJakarta}*`
                },
                mentionedJid: [m.key?.participant || m.key?.remoteJid].filter(Boolean),
                forwardingScore: 9999 * forwardCount,
                isForwarded: true,
                externalAdReply: {
                    title: personalizedTitle,
                    body: `${hariJakarta} ${tanggalJakarta} ${bulanJakarta} ${tahunJakarta} | ⚡ Runtime: ${runtime} | 🚀 Bot Active | 🔄 Forwarded ${forwardCount}x`,
                    thumbnailUrl: ppuser || 'https://files.catbox.moe/mxohav.gif',
                    sourceUrl: "https://wa.me/6289688206739",
                    mediaType: 1,
                    renderLargerThumbnail: false,
                    showAdAttribution: false
                },
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363312297133690@newsletter",
                    newsletterName: `WilyKun Official Bot - ${hariJakarta} | Forwarded ${forwardCount}x`
                }
            }
        };

        return await sock.sendMessage(m.key.remoteJid, messageContent, {
            quoted: m,
        });
    } catch (error) {
        // Fallback to simple text if context fails
        try {
            return await sock.sendMessage(m.key.remoteJid, { text: teks }, { quoted: m });
        } catch (fallbackError) {
            // Final fallback without quote
            return await sock.sendMessage(m.key.remoteJid, { text: teks });
        }
    }
}

// Function to create super forwarded message (appears heavily forwarded)
async function SuperForward(teks, m, sock) {
    try {
        const config = loadConfig();

        // Get Jakarta time information
        const jakartaInfo = getAsiaJakartaTime();
        const waktuJakarta = getWaktu();
        const hariJakarta = getHari();
        const tanggalJakarta = getTanggal();
        const bulanJakarta = getBulan();
        const tahunJakarta = getTahun();
        const salamJakarta = getSelamat();

        // Enhanced foto profil detection
        let ppuser;
        try {
            let targetJid;

            if (m.key?.remoteJid?.endsWith('@g.us') && m.key?.participant) {
                targetJid = m.key.participant;
            } else if (m.key?.remoteJid?.endsWith('@s.whatsapp.net')) {
                targetJid = m.key.remoteJid;
            } else if (m.key?.fromMe) {
                targetJid = sock.user?.id || m.key?.remoteJid;
            } else if (m.participant) {
                targetJid = m.participant;
            } else if (m.from) {
                targetJid = m.from;
            } else if (m.sender) {
                targetJid = m.sender;
            } else {
                targetJid = m.key?.participant || m.key?.remoteJid;
            }

            if (targetJid) {
                ppuser = await sock.profilePictureUrl(targetJid, 'image');
            }
        } catch (error) {
            ppuser = null;
        }

        // Get sender info for personalized greeting
        let senderName = "User";
        let senderNumber = "";

        try {
            if (m.key?.participant) {
                senderNumber = m.key.participant.split('@')[0];
            } else if (m.key?.remoteJid) {
                senderNumber = m.key.remoteJid.split('@')[0];
            }

            if (m.pushName) {
                senderName = m.pushName;
            } else if (senderNumber) {
                senderName = senderNumber;
            }
        } catch (error) {
            senderName = "User";
        }

        const nameEmoji = getNameEmoji(senderName);
        const runtime = getFormattedRuntime();
        const personalizedTitle = `${nameEmoji} ${salamJakarta} ${senderName}!`;

        // Create message with maximum forwarding appearance
        const messageContent = {
            text: teks,
            contextInfo: {
                quotedMessage: {
                    conversation: `*_Dikembangkan Oleh @WilyKun Bot_* *${waktuJakarta}*`
                },
                mentionedJid: [m.key?.participant || m.key?.remoteJid].filter(Boolean),
                participant: "6289688206739@s.whatsapp.net",
                remoteJid: "120363312297133690@g.us",
                forwardingScore: 99999,
                isForwarded: true,
                externalAdReply: {
                    title: personalizedTitle,
                    body: `${hariJakarta} ${tanggalJakarta} ${bulanJakarta} ${tahunJakarta} | ⚡ Runtime: ${runtime} | 🚀 Bot Active | 🔥 SUPER FORWARDED`,
                    thumbnailUrl: ppuser || 'https://files.catbox.moe/mxohav.gif',
                    sourceUrl: "https://wa.me/6289688206739",
                    mediaType: 1,
                    renderLargerThumbnail: false,
                    showAdAttribution: false
                },
                forwardedNewsletterMessageInfo: {
                    newsletterJid: "120363312297133690@newsletter",
                    newsletterName: `WilyKun Official Bot - ${hariJakarta} | 🔥 SUPER FORWARDED`
                }
            }
        };

        return await sock.sendMessage(m.key.remoteJid, messageContent, {
            quoted: m,
        });
    } catch (error) {
        // Fallback to simple text if context fails
        try {
            return await sock.sendMessage(m.key.remoteJid, { text: teks }, { quoted: m });
        } catch (fallbackError) {
            // Final fallback without quote
            return await sock.sendMessage(m.key.remoteJid, { text: teks });
        }
    }
}

// Export functions menggunakan ES6 module
export { Wily, SimpleReply, StatusReply, MultiForward, SuperForward };
