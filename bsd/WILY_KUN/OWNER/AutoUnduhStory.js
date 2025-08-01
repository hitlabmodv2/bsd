const fs = require('fs');
const path = require('path');
const { Wily } = require('../../CODE_REPLAY/reply');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');

// Import config functions
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
        bot: { mode: 'public', prefix: '.', owner: '', botNumber: '' },
        autoFeatures: { autoUnduhStory: false }
    };
}

function saveConfig(config) {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return true;
    } catch (error) {
        return false;
    }
}

// BULLETPROOF Anti-Duplicate System
class BulletproofDuplicateHandler {
    constructor() {
        this.processedStories = new Map(); // messageId -> timestamp
        this.processingLock = new Set(); // messageId yang sedang diproses
        this.sentHashes = new Set(); // Content hash yang sudah terkirim
        this.cooldownTime = 5000; // 5 detik cooldown
        this.maxCacheSize = 500;
        this.globalCooldown = new Map(); // senderNumber -> lastProcessTime
        this.rapidProtection = new Map(); // Quick duplicate detection

        // Cleanup timer setiap 10 menit
        setInterval(() => this.cleanup(), 10 * 60 * 1000);
    }

    // Check rapid duplicate protection
    isRapidDuplicate(senderNumber) {
        const now = Date.now();
        const lastTime = this.rapidProtection.get(senderNumber);

        if (lastTime && (now - lastTime) < 2000) { // 2 detik protection
            return true;
        }

        this.rapidProtection.set(senderNumber, now);
        return false;
    }

    // Generate unique ID untuk story dengan lebih banyak faktor
    generateStoryId(msg) {
        const remoteJid = msg.key.remoteJid || '';
        const messageId = msg.key.id || '';
        const participant = msg.key.participant || '';
        const timestamp = msg.messageTimestamp || Date.now();

        // Tambahan faktor untuk uniqueness
        const mediaLength = this.getMediaLength(msg);
        const messageType = this.getMessageType(msg);

        return `${remoteJid}_${messageId}_${participant}_${timestamp}_${mediaLength}_${messageType}`;
    }

    // Generate content hash berdasarkan media dan pengirim dengan faktor tambahan
    generateContentHash(msg, senderNumber, mediaType) {
        const messageText = JSON.stringify(msg.message);
        const mediaLength = this.getMediaLength(msg);
        const messageType = this.getMessageType(msg);
        const timestamp = msg.messageTimestamp || Date.now();

        const hash = require('crypto').createHash('sha256');
        hash.update(`${senderNumber}_${mediaType}_${messageText}_${mediaLength}_${messageType}_${timestamp}`);
        return hash.digest('hex').substring(0, 32);
    }

    // Helper untuk mendapatkan panjang media
    getMediaLength(msg) {
        try {
            if (msg.message?.imageMessage?.fileLength) return msg.message.imageMessage.fileLength;
            if (msg.message?.videoMessage?.fileLength) return msg.message.videoMessage.fileLength;
            if (msg.message?.audioMessage?.fileLength) return msg.message.audioMessage.fileLength;
            if (msg.message?.documentMessage?.fileLength) return msg.message.documentMessage.fileLength;
            return 0;
        } catch {
            return 0;
        }
    }

    // Helper untuk mendapatkan tipe message
    getMessageType(msg) {
        try {
            if (msg.message?.imageMessage) return 'image';
            if (msg.message?.videoMessage) return 'video';
            if (msg.message?.audioMessage) return 'audio';
            if (msg.message?.documentMessage) return 'document';
            return 'unknown';
        } catch {
            return 'unknown';
        }
    }

    // Check apakah story sudah pernah diproses
    isAlreadyProcessed(storyId) {
        return this.processedStories.has(storyId);
    }

    // Check apakah sedang dalam proses
    isCurrentlyProcessing(storyId) {
        return this.processingLock.has(storyId);
    }

    // Check apakah content sudah pernah dikirim
    isContentAlreadySent(contentHash) {
        return this.sentHashes.has(contentHash);
    }

    // Lock processing untuk story ini
    lockProcessing(storyId) {
        if (this.processingLock.has(storyId)) {
            return false; // Sudah di-lock
        }
        this.processingLock.add(storyId);
        return true;
    }

    // Unlock processing
    unlockProcessing(storyId) {
        this.processingLock.delete(storyId);
    }

    // Mark story sebagai processed dengan triple marking
    markAsProcessed(storyId, contentHash, globalMessageId = null) {
        this.processedStories.set(storyId, Date.now());
        this.sentHashes.add(contentHash);

        // Tambahan global message ID tracking
        if (globalMessageId) {
            this.processedStories.set(globalMessageId, Date.now());
        }

        this.processingLock.delete(storyId);
    }

    // Mark story sebagai failed (unlock untuk retry nanti)
    markAsFailed(storyId) {
        this.processingLock.delete(storyId);
    }

    // Cleanup old entries
    cleanup() {
        const now = Date.now();
        const cutoffTime = now - (30 * 60 * 1000); // 30 menit

        // Cleanup processed stories
        for (const [storyId, timestamp] of this.processedStories.entries()) {
            if (timestamp < cutoffTime) {
                this.processedStories.delete(storyId);
            }
        }

        // Cleanup sent hashes jika terlalu besar
        if (this.sentHashes.size > this.maxCacheSize) {
            const hashArray = Array.from(this.sentHashes);
            this.sentHashes.clear();
            // Simpan separuh terakhir
            hashArray.slice(-Math.floor(this.maxCacheSize / 2)).forEach(hash => {
                this.sentHashes.add(hash);
            });
        }

        // Cleanup stuck locks (lebih dari 2 menit)
        const lockCutoff = now - (2 * 60 * 1000);
        for (const storyId of this.processingLock) {
            // Jika tidak ada timestamp di processed, anggap stuck
            if (!this.processedStories.has(storyId)) {
                this.processingLock.delete(storyId);
            }
        }

        // Cleanup rapid protection (lebih dari 5 menit)
        const rapidCutoff = now - (5 * 60 * 1000);
        for (const [senderNumber, timestamp] of this.rapidProtection.entries()) {
            if (timestamp < rapidCutoff) {
                this.rapidProtection.delete(senderNumber);
            }
        }

        // Cleanup global cooldown (lebih dari 10 menit)
        const globalCutoff = now - (10 * 60 * 1000);
        for (const [senderNumber, timestamp] of this.globalCooldown.entries()) {
            if (timestamp < globalCutoff) {
                this.globalCooldown.delete(senderNumber);
            }
        }
    }
}

// Global instance
const duplicateHandler = new BulletproofDuplicateHandler();

// Auto download story handler dengan sistem bulletproof
async function handleAutoDownloadStory(sock, msg) {
    let storyId = null;

    try {
        const config = loadConfig();

        // Check if auto download story is enabled
        if (!config.autoFeatures?.autoUnduhStory) {
            return;
        }

        // Validasi message structure
        if (!msg.key || !msg.message) {
            return;
        }

        // Skip if this is bot's own story
        const botNumber = sock.user?.id?.split(':')[0];
        const senderNumber = msg.key.participant?.split('@')[0] || msg.key.remoteJid?.split('@')[0];

        if (senderNumber === botNumber) {
            return;
        }

        // Skip jika sender number adalah 'status' atau tidak valid
        if (!senderNumber || senderNumber === 'status' || senderNumber.toLowerCase() === 'status' || senderNumber.trim() === '') {
            return;
        }

        // BULLETPROOF DUPLICATE CHECK #0: Rapid duplicate protection
        if (duplicateHandler.isRapidDuplicate(senderNumber)) {
            return;
        }

        // Generate unique story ID
        storyId = duplicateHandler.generateStoryId(msg);

        // BULLETPROOF DUPLICATE CHECK #1: Already processed?
        if (duplicateHandler.isAlreadyProcessed(storyId)) {
            return;
        }

        // BULLETPROOF DUPLICATE CHECK #2: Currently processing?
        if (duplicateHandler.isCurrentlyProcessing(storyId)) {
            return;
        }

        // BULLETPROOF DUPLICATE CHECK #3: Lock processing
        if (!duplicateHandler.lockProcessing(storyId)) {
            return;
        }

        // BULLETPROOF DUPLICATE CHECK #4: Global message ID check
        const globalMessageId = `${msg.key.id}_${msg.key.participant}_${msg.messageTimestamp}`;
        if (duplicateHandler.processedStories.has(globalMessageId)) {
            duplicateHandler.markAsFailed(storyId);
            return;
        }

        // BULLETPROOF DUPLICATE CHECK #5: Immediate pre-validation
        const preValidationHash = require('crypto').createHash('md5')
            .update(`${senderNumber}_${msg.key.id}_${msg.messageTimestamp}`)
            .digest('hex').substring(0, 16);

        if (duplicateHandler.sentHashes.has(preValidationHash)) {
            duplicateHandler.markAsFailed(storyId);
            return;
        }

        // Mark pre-validation immediately
        duplicateHandler.sentHashes.add(preValidationHash);

        // Additional validation - check if message is really a story
        if (!msg.key.remoteJid?.includes('@broadcast')) {
            duplicateHandler.markAsFailed(storyId);
            return;
        }

        // Skip jika remoteJid mengandung 'status' yang tidak valid
        if (msg.key.remoteJid?.includes('status@broadcast') && !msg.key.participant) {
            duplicateHandler.markAsFailed(storyId);
            return;
        }

        // Check if message has media
        const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'];
        const hasMedia = mediaTypes.some(type => msg.message[type]);

        if (!hasMedia) {
            duplicateHandler.markAsFailed(storyId);
            return;
        }

        // Determine media type
        let mediaType = 'unknown';
        if (msg.message.imageMessage) mediaType = 'GAMBAR';
        else if (msg.message.videoMessage) mediaType = 'VIDEO';
        else if (msg.message.audioMessage) mediaType = 'SUARA';
        else if (msg.message.documentMessage) mediaType = 'DOKUMEN';

        // Generate content hash
        const contentHash = duplicateHandler.generateContentHash(msg, senderNumber, mediaType);

        // BULLETPROOF DUPLICATE CHECK #4: Content already sent?
        if (duplicateHandler.isContentAlreadySent(contentHash)) {
            duplicateHandler.markAsFailed(storyId);
            return;
        }

        // Get sender info dengan validasi lebih baik dan filter untuk 'status'
        let senderName = msg.pushName || msg.verifiedBizName || 'Unknown';

        // Skip jika nama pengirim adalah 'status' atau kosong
        if (senderName === 'status' || !senderName || senderName.trim() === '' || senderName.toLowerCase() === 'status') {
            duplicateHandler.markAsFailed(storyId);
            return; // Skip processing story dengan info tidak valid
        }

        // Skip jika nomor pengirim juga 'status'  
        if (senderNumber === 'status' || !senderNumber || senderNumber.trim() === '' || senderNumber.toLowerCase() === 'status') {
            duplicateHandler.markAsFailed(storyId);
            return; // Skip processing story dengan nomor tidak valid
        }

        // Download media dengan timeout
        let mediaBuffer;
        try {
            mediaBuffer = await Promise.race([
                downloadMediaMessage(msg, 'buffer', {}),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Download timeout')), 30000))
            ]);
        } catch (downloadError) {
            duplicateHandler.markAsFailed(storyId);
            return;
        }

        if (!mediaBuffer || mediaBuffer.length === 0) {
            duplicateHandler.markAsFailed(storyId);
            return;
        }

        // Create caption
        const timestamp = new Date().toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: 'numeric',
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const timeString = timestamp.replace(/\./g, '.').replace(/,/g, ' pukul');

        // Get original caption
        let originalCaption = '';
        if (msg.message.imageMessage?.caption) originalCaption = msg.message.imageMessage.caption;
        else if (msg.message.videoMessage?.caption) originalCaption = msg.message.videoMessage.caption;
        else if (msg.message.audioMessage?.caption) originalCaption = msg.message.audioMessage.caption;
        else if (msg.message.documentMessage?.caption) originalCaption = msg.message.documentMessage.caption;

        const captionInfo = originalCaption && originalCaption.trim() ? 
            `📝 Caption: ${originalCaption.trim()}` : 
            `📝 Caption: Tidak ada caption`;

        const caption = `📥 AUTO DOWNLOAD STORY

👤 Dari: ${senderName}
📱 Nomor: ${senderNumber}
📄 Tipe: ${mediaType}
⏰ Waktu: ${timeString}
${captionInfo}
🤖 Auto Download: Aktif ✅

━━━━━━━━━━━━━━━━━━━━━━
✨ WilyKun Auto Download Story ✨
🔥 Media story otomatis tersimpan!`;

        const targetNumber = `${botNumber}@s.whatsapp.net`;

        // Send media dengan retry mechanism
        let sendSuccess = false;
        let retryCount = 0;
        const maxRetries = 2;

        while (!sendSuccess && retryCount < maxRetries) {
            try {
                let sendResult;
                if (mediaType === 'GAMBAR') {
                    sendResult = await sock.sendMessage(targetNumber, {
                        image: mediaBuffer,
                        caption: caption
                    });
                } else if (mediaType === 'VIDEO') {
                    sendResult = await sock.sendMessage(targetNumber, {
                        video: mediaBuffer,
                        caption: caption
                    });
                } else if (mediaType === 'SUARA') {
                    sendResult = await sock.sendMessage(targetNumber, {
                        audio: mediaBuffer,
                        mimetype: 'audio/ogg; codecs=opus',
                        caption: caption
                    });
                } else if (mediaType === 'DOKUMEN') {
                    sendResult = await sock.sendMessage(targetNumber, {
                        document: mediaBuffer,
                        caption: caption,
                        fileName: `story_${senderNumber}_${Date.now()}.pdf`
                    });
                }

                if (sendResult) {
                    sendSuccess = true;

                    // Mark sebagai berhasil dengan global tracking
                    const globalMessageId = `${msg.key.id}_${msg.key.participant}_${msg.messageTimestamp}`;
                    duplicateHandler.markAsProcessed(storyId, contentHash, globalMessageId);

                    // Tambahan: Mark dengan timestamp-based ID
                    const timestampId = `${senderNumber}_${Date.now()}`;
                    duplicateHandler.processedStories.set(timestampId, Date.now());
                } else {
                    retryCount++;
                    if (retryCount < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
                    }
                }

            } catch (sendError) {
                retryCount++;
                if (retryCount < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
                }
            }
        }

        if (!sendSuccess) {
            duplicateHandler.markAsFailed(storyId);
        }

    } catch (error) {
        if (storyId) {
            duplicateHandler.markAsFailed(storyId);
        }
        // Silent error handling
    }
}

// Handle auto unduh story command
async function handleAutoUnduhStoryCommand(sock, msg, config) {
    try {
        const messageText = msg.message?.conversation || 
                          msg.message?.extendedTextMessage?.text || '';

        const args = messageText.slice(config.bot?.prefix?.length || 1).trim().split(' ');

        if (args.length < 2) {
            const helpText = `
❌ *FORMAT SALAH!*

📝 *Cara penggunaan:*
${config.bot?.prefix || '.'}unduhsw on
${config.bot?.prefix || '.'}unduhsw off

📋 *Penjelasan:*
• *on* - Aktifkan auto download story
• *off* - Matikan auto download story

📊 *Status saat ini:* ${config.autoFeatures?.autoUnduhStory ? 'ON ✅' : 'OFF ❌'}

🔥 *Fitur:*
• Download otomatis semua media story
• Kirim ke nomor bot sendiri (Form Me)
• Support gambar, video, audio, dokumen
• Include info pengirim dan waktu
• Bulletproof anti-duplicate system (100% no duplicate)

⚠️ *CATATAN:*
• Fitur ini khusus Owner/Bot Owner
• Media akan dikirim ke nomor pemilik bot
• Auto download hanya dari story orang lain
• Sistem bulletproof mencegah duplikasi total`;

            await sock.sendMessage(msg.key.remoteJid, { text: helpText }, { quoted: msg });
            return;
        }

        const newMode = args[1].toLowerCase();

        if (newMode !== 'on' && newMode !== 'off') {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ Mode tidak valid! Gunakan 'on' atau 'off'` 
            }, { quoted: msg });
            return;
        }

        const newStatus = newMode === 'on';

        // Check if status is already the same
        if (config.autoFeatures?.autoUnduhStory === newStatus) {
            const statusText = newStatus ? 'sudah AKTIF ✅' : 'sudah NONAKTIF ❌';
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `⚠️ Auto Download Story ${statusText}` 
            }, { quoted: msg });
            return;
        }

        // Update config
        if (!config.autoFeatures) {
            config.autoFeatures = {};
        }
        config.autoFeatures.autoUnduhStory = newStatus;

        if (saveConfig(config)) {
            const statusText = newStatus ? 
                `✅ *AUTO DOWNLOAD STORY AKTIF!*

🔥 *Fitur yang Aktif:*
├─ 📥 Auto download semua media story
├─ 🖼️ Support gambar, video, audio, dokumen
├─ 📱 Kirim ke nomor bot sendiri
├─ ⏰ Include timestamp dan info pengirim
├─ 🚫 Bulletproof anti-duplicate system
├─ 🔒 Content-based duplicate detection
├─ ⚡ Multi-layer validation
├─ 🛡️ Race condition protection
└─ 🤖 Otomatis saat melihat story orang lain

📊 *Status:* ON ✅
🎯 *Target:* Form Me (${sock.user?.id?.split(':')[0]})

⚠️ *PERHATIAN:*
• Media story akan otomatis terdownload
• Dikirim ke chat pribadi bot
• Tidak download story bot sendiri
• Berfungsi real-time saat baca story
• Bulletproof system = 0% duplikasi

🚀 Auto Download Story siap bekerja tanpa duplikasi!` :
                `❌ *AUTO DOWNLOAD STORY NONAKTIF!*

📊 *Status:* OFF ❌
🔴 *Auto download story dimatikan*

💡 *Untuk mengaktifkan kembali:*
${config.bot?.prefix || '.'}unduhsw on

🤖 Bot tidak akan mengunduh story secara otomatis`;

            await sock.sendMessage(msg.key.remoteJid, { text: statusText }, { quoted: msg });
        } else {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ Gagal menyimpan pengaturan auto download story` 
            }, { quoted: msg });
        }

    } catch (error) {
        await sock.sendMessage(msg.key.remoteJid, { 
            text: `❌ Terjadi error: ${error.message}` 
        }, { quoted: msg });
    }
}

async function ReplyRynzz(teks, msg, sock) {
    return await Wily(teks, msg, sock);
}

module.exports = {
    handleAutoDownloadStory,
    handleAutoUnduhStoryCommand
};