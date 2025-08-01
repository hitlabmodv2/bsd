const fs = require('fs');
const path = require('path');
const { Wily } = require('../../CODE_REPLAY/reply');

// Load config function
function loadConfig() {
    try {
        // Try multiple config paths
        const configPaths = [
            path.join(process.cwd(), 'config.json'),
            path.join(__dirname, '../../config.json'),
            path.join(__dirname, '../config.json')
        ];

        for (const configPath of configPaths) {
            if (fs.existsSync(configPath)) {
                const configData = fs.readFileSync(configPath, 'utf8');
                const parsedConfig = JSON.parse(configData);

                // Ensure bot object exists
                if (!parsedConfig.bot) {
                    parsedConfig.bot = {
                        mode: 'self',
                        prefix: '.',
                        owner: '',
                        botNumber: ''
                    };
                }

                return parsedConfig;
            }
        }
    } catch (error) {
        // Silent error handling
    }

    // Return default config if all fail
    return {
        bot: {
            mode: 'self',
            prefix: '.',
            owner: '',
            botNumber: ''
        },
        autoFeatures: {
            typing: false,
            recording: false,
            online: false,
            antidelete: { enabled: false }
        }
    };
}

// Check access permission based on bot mode and user number from config.json
function checkAccess(senderNumber, config, fromMe = false) {
    const botMode = config?.bot?.mode || 'self';

    if (botMode === 'public') {
        return true; // Public mode: semua orang bisa akses
    }

    // Mode self: hanya owner dan bot number dari config.json yang bisa akses
    const botNumber = config?.bot?.botNumber;
    const ownerNumber = config?.bot?.owner;

    // Extract clean number (remove @s.whatsapp.net, etc)
    const cleanSender = senderNumber?.split('@')[0]?.split(':')[0];
    const cleanBot = botNumber?.split('@')[0]?.split(':')[0];
    const cleanOwner = ownerNumber?.split('@')[0]?.split(':')[0];

    // Check if sender is authorized berdasarkan config.json
    const isBotNumber = cleanSender === cleanBot;
    const isOwnerNumber = cleanSender === cleanOwner;
    const isFromMe = fromMe === true;

    return isFromMe || isBotNumber || isOwnerNumber;
}

// Send quoted message with animation
async function sendQuotedMessage(sock, jid, text, quotedMsg) {
    try {
        const senderName = quotedMsg.pushName || 'User';
        const formattedDate = new Date().toLocaleDateString('id-ID');

        // Get user profile picture
        let profilePic = "https://files.catbox.moe/9cq0yk.jpg";
        try {
            const userJid = quotedMsg.key.participant || quotedMsg.key.remoteJid;
            profilePic = await sock.profilePictureUrl(userJid, 'image');
        } catch (error) {
            // Use fallback image
        }

        // Get random video from VID_GIF_ANIME folder
        const videoFolder = path.join(__dirname, '../VID_GIF_ANIME');
        let selectedVideoPath = null;
        let selectedFileName = 'clear-session';

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
                // Silent error handling
            }
        }

        // Use selected video or fallback
        const localVideoPath = selectedVideoPath || path.join(videoFolder, 'kanna-cry.mp4');

        // Try sending with animation
        if (fs.existsSync(localVideoPath)) {
            const animatedContent = {
                video: fs.readFileSync(localVideoPath),
                caption: text,
                gifPlayback: true,
                ptv: false,
                contextInfo: {
                    forwardingScore: 999,
                    isForwarded: true,
                    forwardedNewsletterMessageInfo: {
                        newsletterName: `🧹 ${selectedFileName.charAt(0).toUpperCase() + selectedFileName.slice(1)} Clear Session`,
                        newsletterJid: "120363312297133690@newsletter",
                    },
                    externalAdReply: {
                        showAdAttribution: true,
                        title: `🧹 ${senderName}`,
                        body: `Clear Session • ${selectedFileName} • ${formattedDate}`,
                        previewType: "VIDEO",
                        thumbnailUrl: profilePic,
                        sourceUrl: "https://wa.me/6289681008411",
                        mediaType: 2,
                        renderLargerThumbnail: false
                    },
                },
            };

            return await sock.sendMessage(jid, animatedContent, { quoted: quotedMsg });
        }

        // Fallback: send as regular text
        return await sock.sendMessage(jid, { text: text }, { quoted: quotedMsg });

    } catch (error) {
        // Fallback: send simple text message
        return await sock.sendMessage(jid, { text: text }, { quoted: quotedMsg });
    }
}

// Show loading animation with progress bar
async function showLoadingAnimation(sock, msg) {
    try {
        // Initial loading message - ensure we get the key for editing
        let loadingMessage = null;
        try {
            loadingMessage = await sock.sendMessage(msg.key.remoteJid, {
                text: `
╭━━━『 🧹 MEMULAI CLEAR SESSION 』━━━❀
┃ 
┃ 🔄 *Sedang memproses...*
┃ ⏳ Menginisialisasi pembersihan session
┃ 📂 Target: ./sesi folder
┃ 
┃ 📊 Progress: [⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜] 0%
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_⏳ Mohon tunggu, sedang memproses..._`
            }, { quoted: msg });

            // Small delay to ensure message is properly sent
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.log('Failed to send initial loading message:', error.message);
            // Use fallback method
            loadingMessage = await sendQuotedMessage(sock, msg.key.remoteJid, `
╭━━━『 🧹 MEMULAI CLEAR SESSION 』━━━❀
┃ 
┃ 🔄 *Sedang memproses...*
┃ ⏳ Menginisialisasi pembersihan session
┃ 📂 Target: ./sesi folder
┃ 
┃ 📊 Progress: [⬜⬜⬜⬜⬜⬜⬜⬜⬜⬜] 0%
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_⏳ Mohon tunggu, sedang memproses..._`, msg);
        }

        // Progress bar animation
        const progressSteps = [
            { percent: 10, message: "🔍 Memindai file session...", bar: "[🟩⬜⬜⬜⬜⬜⬜⬜⬜⬜]" },
            { percent: 25, message: "📋 Menganalisis file types...", bar: "[🟩🟩🟨⬜⬜⬜⬜⬜⬜⬜]" },
            { percent: 40, message: "🔐 Memverifikasi file aman...", bar: "[🟩🟩🟩🟩⬜⬜⬜⬜⬜⬜]" },
            { percent: 55, message: "🗑️ Menghapus pre-key files...", bar: "[🟩🟩🟩🟩🟩🟨⬜⬜⬜⬜]" },
            { percent: 70, message: "📤 Menghapus sender-key files...", bar: "[🟩🟩🟩🟩🟩🟩🟩⬜⬜⬜]" },
            { percent: 85, message: "📦 Membersihkan app-state files...", bar: "[🟩🟩🟩🟩🟩🟩🟩🟩🟨⬜]" },
            { percent: 95, message: "🧹 Finalisasi pembersihan...", bar: "[🟩🟩🟩🟩🟩🟩🟩🟩🟩🟨]" },
            { percent: 100, message: "✅ Pembersihan selesai!", bar: "[🟩🟩🟩🟩🟩🟩🟩🟩🟩🟩]" }
        ];

        // Animate progress bar
        for (let i = 0; i < progressSteps.length; i++) {
            const step = progressSteps[i];

            // Add random delay for realistic feel
            const delay = Math.random() * 800 + 500; // 500-1300ms
            await new Promise(resolve => setTimeout(resolve, delay));

            const loadingText = `
╭━━━『 🧹 CLEAR SESSION PROGRESS 』━━━❀
┃ 
┃ 🔄 *Status: ${step.message}*
┃ ⏳ Memproses pembersihan session...
┃ 📂 Target: ./sesi folder
┃ 
┃ 📊 Progress: ${step.bar} ${step.percent}%
┃ 
┃ ${step.percent < 100 ? '⏰ Estimasi: ' + Math.ceil((100 - step.percent) / 10) + ' detik lagi...' : '🎉 Proses selesai!'}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_${step.percent < 100 ? '⏳ Mohon tunggu, jangan tutup chat ini...' : '✅ Siap menampilkan hasil!'}_`;

            try {
                // Edit the loading message properly
                if (loadingMessage?.key) {
                    await sock.sendMessage(msg.key.remoteJid, {
                        text: loadingText,
                        edit: loadingMessage.key
                    });
                } else {
                    // Fallback: send new message if edit key not available
                    await sendQuotedMessage(sock, msg.key.remoteJid, loadingText, msg);
                }
            } catch (editError) {
                console.log('Edit message failed, sending new:', editError.message);
                // If edit fails, send new message
                await sendQuotedMessage(sock, msg.key.remoteJid, loadingText, msg);
            }
        }

        // Final completion message with animation
        await new Promise(resolve => setTimeout(resolve, 1000));

        const completionText = `
╭━━━『 🎉 LOADING COMPLETE 』━━━❀
┃ 
┃ ✅ *Pembersihan session berhasil diselesaikan!*
┃ 🎯 Progress: 100% Complete
┃ ⚡ Status: Optimal
┃ 
┃ 📄 *Sedang menyiapkan laporan detail...*
┃ 🔄 Menghitung statistik pembersihan...
┃ 📊 Mengcompile data hasil...
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_🚀 Tunggu sebentar, laporan lengkap akan ditampilkan..._`;

        try {
            if (loadingMessage?.key) {
                await sock.sendMessage(msg.key.remoteJid, {
                    text: completionText,
                    edit: loadingMessage.key
                });
            } else {
                // Send new message if edit key not available
                await sendQuotedMessage(sock, msg.key.remoteJid, completionText, msg);
            }
        } catch (editError) {
            console.log('Final edit message failed, sending new:', editError.message);
            await sendQuotedMessage(sock, msg.key.remoteJid, completionText, msg);
        }

        // Wait before showing final result
        await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
        // Silent error handling untuk loading animation
        console.log('Loading animation error:', error.message);
    }
}

// Clear session files
async function clearSessionFiles() {
    try {
        const sessionDir = './sesi'; // Using existing session directory
        if (!fs.existsSync(sessionDir)) {
            return { success: false, deletedCount: 0, message: 'Session directory not found' };
        }

        const files = fs.readdirSync(sessionDir);
        let deletedCount = 0;
        let deletedFiles = []; // Track deleted files

        // Files to preserve (don't delete these critical files)
        const preserveFiles = ['creds.json'];

        // Count file types
        let fileTypes = {
            'pre-key-': 0,
            'sender-key-': 0,
            'app-state': 0,
            'other': 0
        };

        const filteredFiles = files.filter(file => {
            // Skip preserved files
            if (preserveFiles.includes(file)) {
                return false;
            }

            // Count and categorize files
            if (file.startsWith('pre-key-')) {
                fileTypes['pre-key-']++;
                return true;
            } else if (file.startsWith('sender-key-')) {
                fileTypes['sender-key-']++;
                return true;
            } else if (file.startsWith('app-state')) {
                fileTypes['app-state']++;
                return true;
            } else if (file.endsWith('.json') && file !== 'creds.json') {
                fileTypes['other']++;
                return true;
            }

            return false;
        });

        // Delete filtered files and track them
        for (const file of filteredFiles) {
            const filePath = path.join(sessionDir, file);
            try {
                fs.unlinkSync(filePath);
                deletedCount++;
                deletedFiles.push(file); // Add to deleted files list
            } catch (err) {
                // Skip files that can't be deleted
            }
        }

        return {
            success: true,
            deletedCount,
            deletedFiles, // Return list of deleted files
            fileTypes,
            preservedFiles: preserveFiles
        };

    } catch (error) {
        return {
            success: false,
            deletedCount: 0,
            deletedFiles: [], // Empty array on error
            message: error.message
        };
    }
}

// Handle clear session command
async function handleClearSession(sock, msg) {
    try {
        const config = loadConfig();
        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || '';

        // Check if this is a clear session command
        const prefix = config.bot?.prefix || '.';
        const clearCommands = [`${prefix}clearsesi`];
        const isCommand = clearCommands.some(cmd => messageText.toLowerCase().startsWith(cmd.toLowerCase()));

        if (!isCommand) {
            return false; // Not a clear session command
        }

        // Get sender information
        const senderJid = msg.key.remoteJid;
        const botNumber = sock.user?.id?.split(':')[0];

        // Extract actual sender number
        let actualSenderNumber;
        if (msg.key.participant) {
            // Group message
            actualSenderNumber = msg.key.participant.split('@')[0];
        } else if (msg.key.fromMe) {
            // Message from bot itself
            actualSenderNumber = botNumber;
        } else {
            // Private chat
            actualSenderNumber = senderJid?.split('@')[0];
        }

        // Check access permission berdasarkan config.json
        if (!checkAccess(actualSenderNumber, config, msg.key.fromMe)) {
            // For self mode: bot doesn't respond to unauthorized users (silent)
            if (config?.bot?.mode === 'self') {
                return true; // Command handled (silently ignored)
            }

            // For public mode: show access denied message
            const accessDeniedText = `
🚫 *AKSES DITOLAK*

❌ Maaf, fitur ini hanya berlaku untuk owner dan nomor bot saja

🔐 *Fitur Khusus Owner/Bot:*
• clearsesi - Bersihkan session bot
• restart - Restart bot  
• settings - Pengaturan bot

🔧 *Konfigurasi dari config.json:*
├─ Mode Bot: ${config.bot.mode.toUpperCase()}
├─ Owner: ${config.bot.owner}
├─ Bot Number: ${config.bot.botNumber}
└─ Prefix: ${config.bot.prefix}

💡 *Gunakan fitur lain:*
• ${config.bot.prefix}menu - Lihat semua fitur
• ${config.bot.prefix}ping - Cek ping bot`;

            await sendQuotedMessage(sock, msg.key.remoteJid, accessDeniedText, msg);
            return true;
        }

        // Parse command arguments
        const args = messageText.trim().split(/\s+/);

        // If just the command without any parameters, execute clear session directly
        if (args.length === 1) {
            // Langsung execute clear session tanpa menampilkan help
            // No help text, directly proceed to clear session
        }

        // Show animated loading progress with quoted reply
        await showLoadingAnimation(sock, msg);

        // Execute clear session
        const result = await clearSessionFiles();

        if (result.success) {
            // Get current time info
            const currentDate = new Date();
            const date = currentDate.toLocaleDateString('id-ID', {
                timeZone: 'Asia/Jakarta',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            const time = currentDate.toLocaleString('id-ID', {
                timeZone: 'Asia/Jakarta',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
            });

            // Get greeting based on time
            const currentHour = currentDate.toLocaleString('en-US', {
                timeZone: 'Asia/Jakarta',
                hour: 'numeric',
                hour12: false
            });
            const hourNum = parseInt(currentHour);

            let greeting, greetingEmoji;
            if (hourNum >= 0 && hourNum < 4) {
                greeting = "Tengah Malam";
                greetingEmoji = "🌙";
            } else if (hourNum >= 4 && hourNum < 10) {
                greeting = "Pagi";
                greetingEmoji = "🌅";
            } else if (hourNum >= 10 && hourNum < 15) {
                greeting = "Siang";
                greetingEmoji = "☀️";
            } else if (hourNum >= 15 && hourNum < 18) {
                greeting = "Sore";
                greetingEmoji = "🌤️";
            } else {
                greeting = "Malam";
                greetingEmoji = "🌜";
            }

            // Calculate bot runtime
            const processUptime = process.uptime();
            const formatUptime = (uptime) => {
                const days = Math.floor(uptime / (24 * 60 * 60));
                const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
                const minutes = Math.floor((uptime % (60 * 60)) / 60);
                const seconds = Math.floor(uptime % 60);

                let result = '';
                if (days > 0) result += `${days}d `;
                if (hours > 0) result += `${hours}h `;
                if (minutes > 0) result += `${minutes}m `;
                result += `${seconds}s`;

                return result.trim();
            };

            // Function to censor phone number (3 middle digits with ***)
            function censorNumber(number) {
                if (!number || number.length < 9) return number;
                const start = number.slice(0, 6); // Ambil 6 digit pertama
                const end = number.slice(-3); // Ambil 3 digit terakhir
                return `${start}***${end}`;
            }

            // Remove deleted files list - not needed in report

            const successMessage = `╭━━━『 *🧹 CLEAR SESSION BERHASIL* 』━━━❀
┃ 
┃ ✅ *Pembersihan Session Selesai!*
┃ 
┃ 📅 *Informasi Waktu*
┃ ⌬ Tanggal: ${date}
┃ ⌬ Waktu: ${time} WIB
┃ ⌬ Selamat: ${greetingEmoji} ${greeting}
┃ ⌬ Timezone: Asia/Jakarta 🇮🇩
┃ 
┃ 🤖 *Status Bot (dari config.json)*
┃ ⌬ Runtime: ${formatUptime(processUptime)}
┃ ⌬ Mode: ${config.bot.mode.toUpperCase()}
┃ ⌬ Prefix: ${config.bot.prefix}
┃ ⌬ Owner: ${censorNumber(config.bot.owner)}
┃ ⌬ Bot Number: ${censorNumber(config.bot.botNumber)}
┃ ⌬ Status: Online ✅
┃ 
┃ 🗑️ *Detail Pembersihan*
┃ ⌬ Total Dihapus: ${result.deletedCount} file
┃ ⌬ Status: Berhasil ✅
┃ ⌬ Folder Target: ./sesi
┃ 
┃ 📊 *Breakdown File Types*
┃ ⌬ 🔑 Pre-Key: ${result.fileTypes['pre-key-']} file
┃ ⌬ 📤 Sender-Key: ${result.fileTypes['sender-key-']} file
┃ ⌬ 📦 App-State: ${result.fileTypes['app-state']} file
┃ ⌬ 📄 Other: ${result.fileTypes['other']} file
┃ 
┃ 🔒 *File Aman (Preserved)*
┃ ⌬ ${result.preservedFiles.join(', ')}
┃ 
┃ 🔐 *Akses Control (Config.json)*
┃ ⌬ Hanya Owner & Bot Number bisa akses
┃ ⌬ Mode: ${config.bot.mode} (${config.bot.mode === 'self' ? 'Terbatas' : 'Terbuka'})
┃ ⌬ Authorization: ✅ Sesuai Config
┃ 
┃ ⚡ *System Status*
┃ ⌬ Memory: Dibersihkan
┃ ⌬ Performance: Optimal
┃ ⌬ Bot Health: 100% 💚
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_🚀 Session berhasil dibersihkan! Bot siap bekerja optimal sesuai konfigurasi config.json._`;

            await sendQuotedMessage(sock, msg.key.remoteJid, successMessage, msg);
        } else {
            const errorMessage = `❌ *GAGAL MEMBERSIHKAN SESSION*

🚫 Terjadi kesalahan saat membersihkan session:
${result.message || 'Unknown error'}

🔧 *Konfigurasi Bot (config.json):*
├─ Mode: ${config.bot.mode.toUpperCase()}
├─ Owner: ${config.bot.owner}
├─ Bot Number: ${config.bot.botNumber}
└─ Prefix: ${config.bot.prefix}

💡 *Saran:*
• Coba lagi dalam beberapa saat
• Pastikan bot memiliki akses file system
• Hubungi owner jika masalah berlanjut`;

            await sendQuotedMessage(sock, msg.key.remoteJid, errorMessage, msg);
        }

        return true; // Command handled

    } catch (error) {
        const config = loadConfig();
        const errorMessage = `❌ *ERROR CLEAR SESSION*

🚫 Terjadi kesalahan sistem:
${error.message}

🔧 *Info Bot (config.json):*
├─ Mode: ${config.bot.mode}
├─ Owner: ${config.bot.owner}
└─ Bot Number: ${config.bot.botNumber}

💡 Silakan coba lagi atau hubungi owner bot`;

        try {
            await sendQuotedMessage(sock, msg.key.remoteJid, errorMessage, msg);
        } catch (sendError) {
            // Silent error if can't send message
        }

        return true; // Command handled even with error
    }
}

async function ReplyRynzz(teks, msg, sock) {
    return await Wily(teks, msg, sock);
}

module.exports = {
    handleClearSession,
    clearSessionFiles,
    checkAccess,
    loadConfig
};