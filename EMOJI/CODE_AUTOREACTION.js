const fs = require('fs');
const path = require('path');

/**
 * Fungsi untuk mendapatkan emoji acak
 */
function getRandomEmoji() {
    try {
        const { getRandomEmoji: getEmoji } = require('./index.js');
        return getEmoji();
    } catch (error) {
        // Fallback emoji jika module tidak tersedia
        const fallbackEmojis = ['❤️', '😍', '😊', '👍', '🔥', '💯', '😂', '🥰', '😘', '👏'];
        return fallbackEmojis[Math.floor(Math.random() * fallbackEmojis.length)];
    }
}

/**
 * Fungsi untuk menyimpan statistik emoji
 */
function saveEmojiStats(emoji) {
    try {
        const { saveEmojiStats: saveStats } = require('./index.js');
        return saveStats(emoji);
    } catch (error) {
        // Silent error jika module tidak tersedia
        return;
    }
}

/**
 * Fungsi untuk mendapatkan tanggal yang diformat dengan timezone Asia/Jakarta yang akurat
 */
function getFormattedDate() {
    // Gunakan timezone Asia/Jakarta yang benar
    const now = new Date();
    const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));

    const days = ['Minggu', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                   'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const dayName = days[jakartaTime.getDay()];
    const day = jakartaTime.getDate();
    const month = months[jakartaTime.getMonth()];
    const year = jakartaTime.getFullYear();

    return `${dayName}|${day}|${month}|${year}`;
}

/**
 * Fungsi untuk mendapatkan sapaan berdasarkan waktu Asia/Jakarta yang akurat
 */
function getGreeting() {
    // Gunakan timezone Asia/Jakarta yang benar
    const now = new Date();
    const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));
    const hour = jakartaTime.getHours();

    // Pembagian waktu yang lebih akurat untuk Indonesia
    if (hour >= 4 && hour < 10) return '🌅 Pagi';        // 04:00 - 09:59
    if (hour >= 10 && hour < 15) return '☀️ Siang';      // 10:00 - 14:59
    if (hour >= 15 && hour < 18) return '🌤️ Sore';      // 15:00 - 17:59
    if (hour >= 18 && hour < 24) return '🌙 Malam';     // 18:00 - 23:59
    return '🌙 Malam';  // 00:00 - 03:59 (dini hari/tengah malam)
}

/**
 * Fungsi untuk mendapatkan waktu saat ini dengan timezone Asia/Jakarta yang akurat
 */
function getTime() {
    // Gunakan timezone Asia/Jakarta yang benar
    const now = new Date();
    const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));

    let hours = jakartaTime.getHours();
    const minutes = jakartaTime.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${hours}:${minutes} ${ampm} wib`;
}

/**
 * Fungsi untuk menyimpan data status
 */
function saveStatusData(senderJid, statusType) {
    try {
        const dataPath = path.join(process.cwd(), 'DATA', 'status_data.json');
        let data = { totalViews: 0, users: {} };

        // Buat direktori DATA jika belum ada
        if (!fs.existsSync(path.dirname(dataPath))) {
            fs.mkdirSync(path.dirname(dataPath), { recursive: true });
        }

        // Muat data yang sudah ada
        if (fs.existsSync(dataPath)) {
            data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        }

        // Update data
        data.totalViews++;
        if (!data.users[senderJid]) {
            data.users[senderJid] = { totalRead: 0, totalStatus: 0 };
        }
        data.users[senderJid].totalRead++;
        data.users[senderJid].totalStatus++;

        // Simpan data
        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

        return data;
    } catch (error) {
        console.log('❌ Error saat menyimpan data status:', error.message);
        return { totalViews: 0, users: {} };
    }
}

/**
 * Fungsi untuk mendapatkan tipe status
 */
function getStatusType(msg) {
    if (!msg.message) return 'Unknown';

    // Periksa berbagai tipe pesan
    if (msg.message.conversation) return 'Teks';
    if (msg.message.extendedTextMessage) return 'Teks';
    if (msg.message.imageMessage) return 'Gambar';
    if (msg.message.videoMessage) return 'Video';
    if (msg.message.audioMessage) return 'Audio';
    if (msg.message.pttMessage) return 'Voice Note';
    if (msg.message.stickerMessage) return 'Sticker';
    if (msg.message.documentMessage) return 'Dokumen';
    if (msg.message.contactMessage) return 'Kontak';
    if (msg.message.locationMessage) return 'Lokasi';
    if (msg.message.liveLocationMessage) return 'Live Location';
    if (msg.message.pollCreationMessage) return 'Poll';
    if (msg.message.reactionMessage) return 'Reaksi';
    if (msg.message.buttonsMessage) return 'Tombol';
    if (msg.message.listMessage) return 'List';
    if (msg.message.templateMessage) return 'Template';
    if (msg.message.ephemeralMessage) return 'Ephemeral';
    if (msg.message.viewOnceMessage) return 'View Once';
    if (msg.message.editedMessage) return 'Edit';

    return 'Status';
}

/**
 * Fungsi fallback untuk menampilkan status
 */
function displayFallbackStatus(statusDisplayData) {
    console.log(`╭══════════════════════════════════╮`);
    console.log(`║ 💌 STATUS UPDATE MASUK           ║`);
    console.log(`├══════════════════════════════════┤`);
    console.log(`│ » Status      : Aktif ✓`);
    console.log(`│ » Tanggal     : ${statusDisplayData.date}`);
    console.log(`│ » Selamat     : ${statusDisplayData.greeting}`);
    console.log(`│ » Waktu       : ${statusDisplayData.time}`);
    console.log(`│ » Speed Views : ${statusDisplayData.speedViews} Detik`);
    console.log(`│ » Total Views : ${statusDisplayData.totalViews}`);
    console.log(`│ » Status Dia  : ${statusDisplayData.userStatus}`);
    console.log(`│ » Nama        : ${statusDisplayData.name}`);
    console.log(`│ » Nomor       : ${statusDisplayData.number}`);
    console.log(`│ » Tipe Status : ${statusDisplayData.statusType}`);
    console.log(`│ » Reaction    : ${statusDisplayData.reactionStatus}`);
    console.log(`│ » Auto Unduh  : ${statusDisplayData.autoUnduhStatus}`);
    console.log(`│ » Mode        : ${statusDisplayData.mode}`);
    console.log(`│ » Reaksi      : ${statusDisplayData.emoji ? statusDisplayData.emoji : 'Tidak Ada'}`);
    console.log(`│ » Status      : ${statusDisplayData.willReact ? 'Dilihat & Disukai' : 'Hanya Dilihat'}`);
    console.log(`└───···`);
}

/**
 * Fungsi utama untuk menangani auto reaction pada status/story
 */
async function handleAutoReactStatus(sock, msg) {
    // Muat config untuk memeriksa apakah auto reaction diaktifkan
    let shouldReact = false; // Nilai default

    try {
        const configPath = path.join(process.cwd(), 'config.json');
        let config = {};

        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            config = JSON.parse(configData);
        }

        // Selalu lihat status terlebih dahulu (baca statusnya)
        shouldReact = config.autoReactionStory?.enabled || false;

    } catch (error) {
        return; // Jangan lakukan apa-apa jika ada error config
    }

    try {
        // Validasi participant dengan fallback
        let participant = msg.key.participant;
        
        // Jika participant null, coba berbagai fallback
        if (!participant) {
            // Jika fromMe, gunakan sock.user.id sebagai participant
            if (msg.key.fromMe && sock.user?.id) {
                participant = sock.user.id;
            } 
            // Coba alternatif participant
            else if (msg.participant) {
                participant = msg.participant;
            }
            // Fallback ke remoteJid jika tidak ada yang lain
            else if (msg.key.remoteJid && msg.key.remoteJid !== 'status@broadcast') {
                participant = msg.key.remoteJid;
            }
            
            // Jika masih null, skip tanpa warning berulang
            if (!participant) {
                return; // Silent skip
            }
        }

        // Periksa apakah pesan ada dan valid
        if (!msg.message || Object.keys(msg.message).length === 0) {
            return; // Lewati pesan kosong
        }

        // Periksa indikator pesan yang dihapus
        if (msg.message.protocolMessage || msg.messageStubType) {
            return; // Lewati pesan protokol
        }

        // Periksa tambahan untuk pesan ephemeral atau kadaluarsa
        if (msg.message.ephemeralMessage && !msg.message.ephemeralMessage.message) {
            return; // Lewati pesan ephemeral yang kadaluarsa
        }

        // Periksa apakah pesan adalah pesan delete atau revoke
        if (msg.key.id && (msg.key.id.includes('REVOKE') || msg.key.id.includes('DELETE'))) {
            return; // Lewati pesan revoke/delete
        }

        // Periksa messageStubType yang menunjukkan pesan sistem (seperti status yang dihapus)
        if (msg.messageStubType || msg.messageStubParameters) {
            return; // Lewati stub messages
        }

        // Validasi bahwa pesan memiliki konten aktual
        const hasValidContent = msg.message.conversation || 
                               msg.message.extendedTextMessage || 
                               msg.message.imageMessage || 
                               msg.message.videoMessage || 
                               msg.message.audioMessage || 
                               msg.message.pttMessage || 
                               msg.message.stickerMessage || 
                               msg.message.documentMessage || 
                               msg.message.contactMessage || 
                               msg.message.locationMessage || 
                               msg.message.liveLocationMessage;

        if (!hasValidContent) {
            return; // Lewati pesan tanpa konten valid
        }

        // Muat pengaturan dari config.json
        let config = {};
        try {
            const configPath = path.join(process.cwd(), 'config.json');
            if (fs.existsSync(configPath)) {
                const configData = fs.readFileSync(configPath, 'utf8');
                config = JSON.parse(configData);
            }
        } catch (error) {
            config = { settings: { reactionDelay: 3000 } };
        }

        const reactionDelay = config.settings?.reactionDelay || 3000; // 3 detik default

        // Tambahkan delay sebelum pemrosesan
        await new Promise(resolve => setTimeout(resolve, reactionDelay));

        // Selalu baca status terlebih dahulu (ini berarti "melihat" status)
        await sock.readMessages([msg.key]);

        // Tangani mode reaksi yang berbeda
        let emoji = '';
        let willReact = false;

        if (shouldReact) {
            // Muat config lagi untuk memastikan tersedia
            const configPath = path.join(process.cwd(), 'config.json');
            let currentConfig = {};

            try {
                if (fs.existsSync(configPath)) {
                    const configData = fs.readFileSync(configPath, 'utf8');
                    currentConfig = JSON.parse(configData);
                }
            } catch (error) {
                currentConfig = { autoReactionStory: { mode: 'always' } };
            }

            const mode = currentConfig.autoReactionStory?.mode || 'always';

            switch (mode) {
                case 'always':
                    willReact = true;
                    break;
                case 'random':
                    // 50% kesempatan untuk bereaksi
                    willReact = Math.random() < 0.5;
                    break;
                case 'off':
                default:
                    willReact = false;
                    break;
            }

            if (willReact) {
                emoji = getRandomEmoji();
                saveEmojiStats(emoji);
            }
        }

        // Dapatkan info pengirim dengan participant yang sudah divalidasi
        const senderJid = participant.split('@')[0];
        const senderName = msg.pushName || 'Unknown';

        // Simpan data status dan dapatkan statistik
        const statusData = saveStatusData(senderJid, getStatusType(msg));

        // Muat config untuk sensor nomor dan speed views
        let configForDisplay = {};
        try {
            const configPath = path.join(process.cwd(), 'config.json');
            if (fs.existsSync(configPath)) {
                const configData = fs.readFileSync(configPath, 'utf8');
                configForDisplay = JSON.parse(configData);
            }
        } catch (error) {
            configForDisplay = { 
                settings: { 
                    censorNumber: true, 
                    censorCount: 4, 
                    speedViews: 3 
                },
                autoFeatures: {
                    autoUnduhStory: false
                }
            };
        }

        // Sensor nomor telepon - sensor 3 digit di bagian tengah
        const censorNumber = configForDisplay.settings?.censorNumber !== false;

        let displayNumber = senderJid;
        if (censorNumber && senderJid.length > 8) {
            const start = senderJid.slice(0, 6); // Ambil 6 digit pertama
            const end = senderJid.slice(-3); // Ambil 3 digit terakhir
            displayNumber = start + '***' + end; // Sensor 3 digit di tengah
        }

        // Bereaksi pada status hanya jika willReact adalah true
        if (willReact && emoji) {
            try {
                // Buat statusJidList yang aman
                const statusJidList = [sock.user.id];
                if (participant && participant !== sock.user.id) {
                    statusJidList.push(participant);
                }
                
                await sock.sendMessage(
                    'status@broadcast',
                    { react: { key: msg.key, text: emoji } },
                    { statusJidList }
                );
            } catch (error) {
                // Silent error untuk reaction yang gagal
                emoji = '';
                willReact = false;
            }
        }

        // Dapatkan jumlah status pengguna
        const userStats = statusData.users[senderJid] || { totalStatus: 0 };

        // Muat config untuk tampilan
        let displayConfig = {};
        try {
            const configPath = path.join(process.cwd(), 'config.json');
            if (fs.existsSync(configPath)) {
                const configData = fs.readFileSync(configPath, 'utf8');
                displayConfig = JSON.parse(configData);
            }
        } catch (error) {
            displayConfig = { autoReactionStory: { mode: 'off' } };
        }

        const reactionMode = displayConfig.autoReactionStory?.mode || 'off';
        const reactionStatus = shouldReact ? (reactionMode === 'random' ? 'RANDOM' : 'ON') : 'OFF';
        
        // Status Auto Unduh Story dari config
        const autoUnduhStatus = configForDisplay.autoFeatures?.autoUnduhStory ? 'ON' : 'OFF';

        // Import sistem warna
        let createStatusBox;
        try {
            const colorModule = require('../WARNA/Warna.js');
            createStatusBox = colorModule.createStatusBox;
        } catch (error) {
            createStatusBox = null;
        }

        // Pastikan emoji selalu string
        const displayEmoji = (willReact && emoji && typeof emoji === 'string') ? emoji : '';

        // Persiapkan data untuk tampilan berwarna
        const statusDisplayData = {
            date: getFormattedDate(),
            greeting: getGreeting(),
            time: getTime(),
            speedViews: configForDisplay.settings?.speedViews || 3,
            totalViews: statusData.totalViews,
            userStatus: userStats.totalStatus,
            name: senderName,
            number: displayNumber,
            statusType: getStatusType(msg),
            reactionStatus: reactionStatus,
            autoUnduhStatus: autoUnduhStatus,
            mode: reactionMode,
            emoji: displayEmoji,
            willReact: willReact && displayEmoji !== ''
        };

        // Tampilkan kotak status berwarna (async)
        if (createStatusBox) {
            createStatusBox(statusDisplayData).then(result => {
                console.log(result);
            }).catch(error => {
                console.log('❌ Error menampilkan status berwarna:', error.message);
                // Fallback ke tampilan biasa jika error
                displayFallbackStatus(statusDisplayData);
            });
        } else {
            displayFallbackStatus(statusDisplayData);
        }

    } catch (error) {
        console.log('❌ Error saat auto reaction:', error.message);
    }
}

// Export fungsi utama
module.exports = { handleAutoReactStatus };