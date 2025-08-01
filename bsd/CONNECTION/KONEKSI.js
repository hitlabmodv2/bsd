const fs = require('fs');
const path = require('path');
const { ServerInfo } = require('../SYSTEM_INFO/server');

// Fungsi untuk load config
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            return JSON.parse(configData);
        }
        return null;
    } catch (error) {
        return null;
    }
}

// Fungsi untuk mendapatkan user profile picture
async function getUserProfilePic(sock, jid) {
    try {
        return await sock.profilePictureUrl(jid, 'image');
    } catch (error) {
        return "https://files.catbox.moe/mxohav.gif";
    }
}

// Fungsi untuk mengirim notifikasi bot terhubung
async function sendBotConnectedNotification(sock) {
    try {
        const targetNumber = "6282263096788@s.whatsapp.net";
        const config = loadConfig();

        if (!config) return;

        // Get bot info
        const botNumber = sock.user?.id?.split(':')[0] || 'Unknown';
        const botName = sock.user?.name || 'WilyKun Bot';

        // Get server info
        const ram = ServerInfo.getRAMInfo();
        const cpu = ServerInfo.getCPUInfo();
        const system = ServerInfo.getSystemInfo();

        // Get current time
        const currentTime = new Date();
        const jakartaTime = currentTime.toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        const getTimeSession = () => {
            const hour = new Date().toLocaleString('en-US', { 
                timeZone: 'Asia/Jakarta',
                hour: 'numeric',
                hour12: false
            });
            const hourNum = parseInt(hour);
            if (hourNum >= 0 && hourNum < 4) return "🌙 Tengah Malam";
            if (hourNum >= 4 && hourNum < 10) return "🌅 Pagi";
            if (hourNum >= 10 && hourNum < 15) return "☀️ Siang";
            if (hourNum >= 15 && hourNum < 18) return "🌤️ Sore";
            return "🌜 Malam";
        };

        // Get stats
        let totalMessages = 0;
        try {
            const statusData = JSON.parse(fs.readFileSync('./DATA/status_data.json', 'utf8'));
            totalMessages = Object.keys(statusData).length || 0;
        } catch (error) {
            // Silent error
        }

        // Get antitagsw stats
        const antitagswEnabled = config.antitagsw?.enabled || [];
        const antitagswWarns = config.antitagsw?.warns || {};
        const totalAntitagswGroups = antitagswEnabled.length;
        const totalAntitagswUsers = Object.values(antitagswWarns).reduce((total, groupData) => total + Object.keys(groupData).length, 0);
        const totalAntitagswWarns = Object.values(antitagswWarns).reduce((total, groupData) => {
            return total + Object.values(groupData).reduce((sum, user) => sum + user.warns, 0);
        }, 0);

        // Get uptime
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = Math.floor(uptime % 60);

        // Get bot and target profile pictures
        const botProfilePic = await getUserProfilePic(sock, `${botNumber}@s.whatsapp.net`);
        const targetProfilePic = await getUserProfilePic(sock, targetNumber);

        const notificationText = `🤖 BOT BERHASIL TERHUBUNG! 🤖

🎉 SELAMAT! Bot telah online dan siap bekerja!
🌟 Selamat  : ${getTimeSession()}
⏰ Hari     : ${currentTime.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' })}
📅 Tanggal  : ${currentTime.getDate()}
🗓️ Bulan    : ${currentTime.getMonth() + 1}, ${currentTime.toLocaleDateString('id-ID', { month: 'long', timeZone: 'Asia/Jakarta' })}
📆 Tahun    : ${currentTime.getFullYear()}
⏰ Pukul    : ${currentTime.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB

╭━━━🖥️ INFORMASI SERVER
│ > RAM USAGE
│    • Total RAM : ${ram.total}
│    • Used RAM  : ${ram.used} • ${ram.percentage}%
│    • Free RAM  : ${ram.free}
│    • Status    : ${parseFloat(ram.percentage) < 50 ? 'Optimal 🚀' : parseFloat(ram.percentage) < 70 ? 'Good 😊' : parseFloat(ram.percentage) < 85 ? 'Warning ⚠️' : 'Critical 🔥'}
│
│ > CPU SPECS
│    • CPU Brand : ${cpu.brand}
│    • Cores     : ${cpu.cores} Core${cpu.cores > 1 ? 's' : ''} 🖥️
│    • Speed     : ${cpu.speed}
│    • Rating    : ${cpu.cores >= 8 ? 'Excellent 🚀' : cpu.cores >= 4 ? 'Good 👍' : 'Basic ⚡'}

╭━━━🎯 STATUS FITUR SAAT INI
│ > AUTO REACTION SYSTEM
│    • Status : ${config.autoReactionStory?.enabled ? 'AKTIF ✅' : 'NONAKTIF ❌'}
│    • Mode   : ${config.autoReactionStory?.mode?.toUpperCase() || 'OFF'} ${config.autoReactionStory?.mode === 'always' ? '🎯' : config.autoReactionStory?.mode === 'random' ? '🎲' : '⭕'}
│    • Delay  : ${(config.autoReactionStory?.delay || 5000) / 1000} detik ⏱️
│
│ > AUTO PRESENCE FEATURES
│    • 🌐 Auto Online   : ${config.autoFeatures?.online ? 'AKTIF ✅' : 'NONAKTIF ❌'}
│    • 💬 Auto Typing   : ${config.autoFeatures?.typing ? 'AKTIF ✅' : 'NONAKTIF ❌'}
│    • 🎤 Auto Record   : ${config.autoFeatures?.recording ? 'AKTIF ✅' : 'NONAKTIF ❌'}
│    • 🔒 Anti Delete   : ${config.autoFeatures?.antidelete?.enabled ? 'AKTIF ✅' : 'NONAKTIF ❌'}
│    • 📥 Auto Unduh    : ${config.autoFeatures?.autoUnduhStory ? 'AKTIF ✅' : 'NONAKTIF ❌'}
│
│ > GROUP FEATURES
│    • 🎉 Welcome Msg   : ${config.group?.welcomeMessage?.enabled ? 'AKTIF ✅' : 'NONAKTIF ❌'}
│    • 👋 Goodbye Msg   : ${config.group?.goodbyeMessage?.enabled ? 'AKTIF ✅' : 'NONAKTIF ❌'}
│
│ > ANTI TAG SW SYSTEM
│    • 🛡️ Status        : ${totalAntitagswGroups > 0 ? 'AKTIF ✅' : 'NONAKTIF ❌'}
│    • 📱 Grup Terdaftar : ${totalAntitagswGroups} grup
│    • 👥 User Warned   : ${totalAntitagswUsers} user
│    • ⚠️ Total Warns   : ${totalAntitagswWarns} pelanggaran
│    • 🔧 Max Warns     : ${config.antitagsw?.settings?.maxWarns || 5}
│    • 🚪 Auto Kick     : ${config.antitagsw?.settings?.autoKick ? 'AKTIF ✅' : 'NONAKTIF ❌'}
│    • 🗑️ Delete Msg    : ${config.antitagsw?.settings?.deleteMessage ? 'AKTIF ✅' : 'NONAKTIF ❌'}
│
│ > BOT CONFIGURATION
│    • 🤖 Mode : ${config.bot?.mode?.toUpperCase() || 'SELF'} • ${config.bot?.mode === 'self' ? 'PRIVATE ✅' : 'PUBLIC ✅'}

🚀 Info Lengkap Ketik .menu atau .menuall
`;

        // Get random video from VID_GIF_ANIME folder
        const videoFolder = path.join(__dirname, '../VID_GIF_ANIME');
        let selectedVideoPath = null;
        let selectedFileName = 'bot-connected';

        if (fs.existsSync(videoFolder)) {
            try {
                const videoFiles = fs.readdirSync(videoFolder).filter(file => {
                    const ext = path.extname(file).toLowerCase();
                    return ['.mp4', '.gif', '.webm', '.mov', '.avi'].includes(ext);
                });

                if (videoFiles.length > 0) {
                    const randomIndex = Math.floor(Math.random() * videoFiles.length);
                    const selectedFile = videoFiles[randomIndex];
                    selectedVideoPath = path.join(videoFolder, selectedFile);
                    selectedFileName = path.basename(selectedFile, path.extname(selectedFile));
                }
            } catch (error) {
                // Silent error
            }
        }

        // Use local video if available
        const localVideoPath = selectedVideoPath || path.join(__dirname, '../VID_GIF_ANIME/kanna-hungry.mp4');

        let messageSent = false;

        // Try to send with local video/GIF
        if (fs.existsSync(localVideoPath)) {
            try {
                const videoContent = {
                    video: fs.readFileSync(localVideoPath),
                    caption: notificationText,
                    gifPlayback: true,
                    ptv: false,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterName: `🤖 Bot Connected - ${selectedFileName}`,
                            newsletterJid: "120363312297133690@newsletter",
                        },
                        externalAdReply: {
                            showAdAttribution: true,
                            title: `🤖 ${botName} Connected!`,
                            body: `Bot Online • Server Info • ${jakartaTime.split(',')[0]}`,
                            previewType: "VIDEO",
                            thumbnailUrl: botProfilePic,
                            sourceUrl: "https://wa.me/6289688206739",
                            mediaType: 2,
                            renderLargerThumbnail: false
                        },
                    },
                };

                await sock.sendMessage(targetNumber, videoContent);
                messageSent = true;
            } catch (error) {
                // Continue to fallback
            }
        }

        // Fallback: Send with URL video/GIF
        if (!messageSent) {
            try {
                const fallbackContent = {
                    video: { url: "https://files.catbox.moe/mxohav.gif" },
                    caption: notificationText,
                    gifPlayback: true,
                    ptv: false,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterName: "🤖 Bot Connected Notification",
                            newsletterJid: "120363312297133690@newsletter",
                        },
                        externalAdReply: {
                            showAdAttribution: true,
                            title: `🤖 ${botName} Connected!`,
                            body: `Bot Online • Server Info • ${jakartaTime.split(',')[0]}`,
                            previewType: "VIDEO",
                            thumbnailUrl: botProfilePic,
                            sourceUrl: "https://wa.me/6289688206739",
                            mediaType: 2,
                            renderLargerThumbnail: false
                        },
                    },
                };

                await sock.sendMessage(targetNumber, fallbackContent);
                messageSent = true;
            } catch (error) {
                // Continue to final fallback
            }
        }

        // Final fallback: Send as image with bot profile
        if (!messageSent) {
            try {
                const imageContent = {
                    image: { url: botProfilePic },
                    caption: notificationText,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterName: "🤖 Bot Connected Notification",
                            newsletterJid: "120363312297133690@newsletter",
                        },
                        externalAdReply: {
                            showAdAttribution: true,
                            title: `🤖 ${botName} Connected!`,
                            body: `Bot Online • Server Info • ${jakartaTime.split(',')[0]}`,
                            previewType: "IMAGE",
                            thumbnailUrl: targetProfilePic,
                            sourceUrl: "https://wa.me/6289688206739",
                            mediaType: 1,
                            renderLargerThumbnail: false
                        },
                    },
                };

                await sock.sendMessage(targetNumber, imageContent);
                messageSent = true;
            } catch (error) {
                // Continue to text fallback
            }
        }

        // Ultimate fallback: Send as text
        if (!messageSent) {
            try {
                const textContent = {
                    text: notificationText,
                    contextInfo: {
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterName: "🤖 Bot Connected Notification",
                            newsletterJid: "120363312297133690@newsletter",
                        },
                        externalAdReply: {
                            showAdAttribution: true,
                            title: `🤖 ${botName} Connected!`,
                            body: `Bot Online • Server Info • ${jakartaTime.split(',')[0]}`,
                            previewType: "IMAGE",
                            thumbnailUrl: botProfilePic,
                            sourceUrl: "https://wa.me/6289688206739",
                            mediaType: 1,
                            renderLargerThumbnail: false
                        },
                    },
                };

                await sock.sendMessage(targetNumber, textContent);
                messageSent = true;
            } catch (error) {
                // Silent final error
            }
        }

    } catch (error) {
        // Silent error - no console log
    }
}

module.exports = {
    sendBotConnectedNotification
};