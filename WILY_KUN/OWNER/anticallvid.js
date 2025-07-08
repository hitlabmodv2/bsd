
const fs = require('fs');
const path = require('path');
const { Wily } = require('../../CODE_REPLAY/reply.js');

// Load config function
function loadConfig() {
    try {
        const configPath = path.join(process.cwd(), 'config.json');
        if (fs.existsSync(configPath)) {
            const configData = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(configData);

            // Ensure anticallvid structure exists
            if (!config.autoFeatures) config.autoFeatures = {};
            if (!config.autoFeatures.anticallvid) {
                config.autoFeatures.anticallvid = {
                    enabled: false,
                    replyMessage: '🚫 *VIDEO CALL DITOLAK OTOMATIS*\n\n📹 Maaf, saat ini bot tidak menerima panggilan video.\n\n💬 Silakan kirim pesan teks untuk berkomunikasi.\n\n🤖 Terima kasih atas pengertiannya!'
                };
            }

            return config;
        }
        return getDefaultConfig();
    } catch (error) {
        return getDefaultConfig();
    }
}

// Save config function
function saveConfig(config) {
    try {
        const configPath = path.join(process.cwd(), 'config.json');

        // Backup config lama jika ada
        if (fs.existsSync(configPath)) {
            const backupPath = path.join(process.cwd(), 'DATA', 'config.backup.json');
            const currentConfig = fs.readFileSync(configPath, 'utf8');

            // Pastikan folder DATA ada
            const dataDir = path.join(process.cwd(), 'DATA');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            fs.writeFileSync(backupPath, currentConfig, 'utf8');
        }

        // Simpan config baru dengan format yang rapi
        const configString = JSON.stringify(config, null, 2);
        fs.writeFileSync(configPath, configString, 'utf8');

        // Verifikasi bahwa file tersimpan dengan benar
        if (fs.existsSync(configPath)) {
            const verifyConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

            // Pastikan struktur anticallvid tersimpan dengan benar
            if (verifyConfig.autoFeatures && 
                verifyConfig.autoFeatures.anticallvid && 
                verifyConfig.autoFeatures.anticallvid.replyMessage) {

                return true;
            } else {
                return false;
            }
        }

        return false;
    } catch (error) {
        return false;
    }
}

// Default config
function getDefaultConfig() {
    return {
        bot: { mode: 'public', prefix: '.', owner: '', botNumber: '' },
        autoFeatures: {
            anticallvid: {
                enabled: false,
                mode: 'all', // 'private', 'group', 'all'
                replyMessage: '🚫 *VIDEO CALL DITOLAK OTOMATIS*\n\n📹 Maaf, saat ini bot tidak menerima panggilan video.\n\n💬 Silakan kirim pesan teks untuk berkomunikasi.\n\n🤖 Terima kasih atas pengertiannya!',
                whitelist: []
            }
        }
    };
}

// Check access function
function checkAccess(senderNumber, config, fromMe = false) {
    const botMode = config?.bot?.mode || 'public';

    if (botMode === 'public') {
        // Pada mode public, hanya owner dan bot yang bisa mengatur anticallvid
        const botNumber = config?.bot?.botNumber?.split('@')[0];
        const ownerNumber = config?.bot?.owner?.split('@')[0];
        const cleanSender = senderNumber?.split('@')[0];

        return fromMe || cleanSender === botNumber || cleanSender === ownerNumber;
    }

    if (botMode === 'self') {
        const botNumber = config?.bot?.botNumber?.split('@')[0];
        const ownerNumber = config?.bot?.owner?.split('@')[0];
        const cleanSender = senderNumber?.split('@')[0];

        return fromMe || cleanSender === botNumber || cleanSender === ownerNumber;
    }

    return false;
}

// Handle anticallvid command
async function handleAnticallvidCommand(sock, msg, config, args) {
    try {
        // Validasi akses
        const senderNumber = msg.key.participant || msg.key.remoteJid;
        const fromMe = msg.key.fromMe;

        if (!checkAccess(senderNumber, config, fromMe)) {
            if (config.bot?.mode === 'public') {
                const accessDeniedText = `🚫 *AKSES DITOLAK*

❌ Maaf, fitur ini khusus untuk:
• Owner Bot
• Bot Owner  
• Form Me

🔐 *Fitur Anti Video Call hanya untuk:*
├─ Owner: ${config.bot?.owner || 'Tidak diset'}
├─ Bot Number: ${config.bot?.botNumber || 'Tidak diset'}
└─ Form Me: Pemilik bot

💡 *Gunakan fitur lain yang tersedia:*
• ${config.bot?.prefix || '.'}menu - Menu lengkap
• ${config.bot?.prefix || '.'}status - Status bot
• ${config.bot?.prefix || '.'}info - Info bot

⚠️ *Anti video call hanya bisa diatur oleh pemilik bot*`;

                await Wily(accessDeniedText, msg, sock);
            }
            return;
        }

        if (args.length < 2) {
            const helpText = `❌ *FORMAT SALAH!*

📝 *DAFTAR COMMAND LENGKAP:*
${config.bot.prefix}anticallvid on/off
${config.bot.prefix}anticallvid setmsg <pesan baru>
${config.bot.prefix}anticallvid add <nomor>
${config.bot.prefix}anticallvid del <nomor>
${config.bot.prefix}anticallvid list
${config.bot.prefix}anticallvid status

📋 *PENJELASAN FITUR ANTI VIDEO CALL:*
🔸 *Fungsi Utama:* Bot akan otomatis menolak panggilan video masuk
🔸 *Target:* Hanya panggilan VIDEO CALL (video)
🔸 *Scope:* Berlaku HANYA untuk chat PRIVATE/DM
🔸 *Group Video Call:* TIDAK akan ditolak (tetap bisa terima)
🔸 *Voice Call:* TIDAK terpengaruh (hanya video call)
🔸 *Auto Reply:* Kirim pesan otomatis setelah tolak panggilan
🔸 *Whitelist:* Nomor tertentu bisa dikecualikan

📖 *PENJELASAN DETAIL COMMAND:*
• \`on\` - Aktifkan fitur anti video call
• \`off\` - Matikan fitur anti video call  
• \`setmsg\` - Ubah pesan balasan otomatis
• \`add\` - Tambah nomor ke whitelist (tidak ditolak)
• \`del\` - Hapus nomor dari whitelist
• \`list\` - Lihat daftar nomor whitelist
• \`status\` - Cek status lengkap anti video call

⚙️ *STATUS SAAT INI:*
├─ Status: ${config.autoFeatures?.anticallvid?.enabled ? 'ON ✅' : 'OFF ❌'}
├─ Mode: Private Only (Chat DM saja)
├─ Pesan: ${config.autoFeatures?.anticallvid?.replyMessage ? 'Custom tersimpan' : 'Default'}
└─ Whitelist: ${config.autoFeatures?.anticallvid?.whitelist?.length || 0} nomor terdaftar

💡 *CONTOH PENGGUNAAN:*
${config.bot.prefix}anticallvid on
${config.bot.prefix}anticallvid setmsg Maaf bot tidak menerima video call, silakan chat saja
${config.bot.prefix}anticallvid add 6289xxxxxxxx
${config.bot.prefix}anticallvid add +62 822-6309-6788

⚠️ *PENTING DIKETAHUI:*
• Hanya menolak panggilan VIDEO di chat PRIVATE
• Voice call TIDAK akan ditolak otomatis
• Panggilan video di GROUP TIDAK terpengaruh
• Nomor di whitelist tetap bisa video call normal
• Bot akan kirim pesan otomatis setelah tolak video call`;

            await Wily(helpText, msg, sock);
            return;
        }

        const action = args[1].toLowerCase();

        // Pastikan autoFeatures dan anticallvid ada
        if (!config.autoFeatures) config.autoFeatures = {};
        if (!config.autoFeatures.anticallvid) {
            config.autoFeatures.anticallvid = {
                enabled: false,
                mode: 'private',
                replyMessage: '🚫 *VIDEO CALL DITOLAK OTOMATIS*\n\n📹 Maaf, saat ini bot tidak menerima panggilan video.\n\n💬 Silakan kirim pesan teks untuk berkomunikasi.\n\n🤖 Terima kasih atas pengertiannya!',
                whitelist: []
            };
        }

        // Pastikan whitelist array ada
        if (!config.autoFeatures.anticallvid.whitelist) {
            config.autoFeatures.anticallvid.whitelist = [];
        }

        switch (action) {
            case 'on':
                if (config.autoFeatures.anticallvid.enabled) {
                    await Wily('⚠️ *ANTI VIDEO CALL SUDAH AKTIF*\n\nFitur anti video call sudah dalam keadaan ON', msg, sock);
                    return;
                }

                config.autoFeatures.anticallvid.enabled = true;

                if (saveConfig(config)) {
                    const successText = `✅ *ANTI VIDEO CALL BERHASIL DIAKTIFKAN*

🚫 *STATUS:* AKTIF ✅
📹 *FUNGSI:* Bot akan menolak panggilan video otomatis
💬 *BALASAN:* Otomatis kirim pesan penolakan

⚙️ *CARA KERJA ANTI VIDEO CALL:*
├─ Target: VIDEO CALL (panggilan video) saja
├─ Scope: PRIVATE CHAT/DM saja
├─ Action: Reject + Auto Reply pesan
├─ Voice Call: TIDAK terpengaruh
└─ Group Video Call: TIDAK akan ditolak

🔧 *COMMAND LENGKAP TERSEDIA:*
• ${config.bot.prefix}anticallvid on/off - Aktif/nonaktifkan
• ${config.bot.prefix}anticallvid setmsg <pesan baru> - Ubah pesan balasan
• ${config.bot.prefix}anticallvid add <nomor> - Tambah ke whitelist
• ${config.bot.prefix}anticallvid del <nomor> - Hapus dari whitelist
• ${config.bot.prefix}anticallvid list - Lihat daftar whitelist
• ${config.bot.prefix}anticallvid status - Status lengkap

📋 *WHITELIST SISTEM:*
• Nomor di whitelist TIDAK akan auto-reject
• Bisa video call bot normal tanpa ditolak
• Tetap bisa terima video call dari nomor whitelist

⚠️ *CATATAN PENTING:* 
• Hanya VIDEO CALL di PRIVATE yang ditolak
• VOICE CALL tidak terpengaruh sama sekali
• PANGGILAN VIDEO GROUP tidak akan ditolak
• Setelah tolak video call, bot kirim pesan otomatis`;

                    await Wily(successText, msg, sock);
                } else {
                    await Wily('❌ *GAGAL MENYIMPAN*\n\nTerjadi error saat menyimpan pengaturan anti video call', msg, sock);
                }
                break;

            case 'off':
                if (!config.autoFeatures.anticallvid.enabled) {
                    await Wily('⚠️ *ANTI VIDEO CALL SUDAH NONAKTIF*\n\nFitur anti video call sudah dalam keadaan OFF', msg, sock);
                    return;
                }

                config.autoFeatures.anticallvid.enabled = false;

                if (saveConfig(config)) {
                    await Wily('✅ *ANTI VIDEO CALL DINONAKTIFKAN*\n\n❌ Status: Nonaktif\n📹 Bot sekarang tidak akan menolak video call\n💬 Tidak ada auto reply penolakan', msg, sock);
                } else {
                    await Wily('❌ *GAGAL MENYIMPAN*\n\nTerjadi error saat menyimpan pengaturan anti video call', msg, sock);
                }
                break;

            case 'add':
                if (args.length < 3) {
                    await Wily(`❌ *FORMAT SALAH!*\n\n📝 *Cara penggunaan:*\n${config.bot.prefix}anticallvid add <nomor>\n\n💡 *Contoh:*\n${config.bot.prefix}anticallvid add 6289xxxxxxxx\n${config.bot.prefix}anticallvid add +62 822-6309-6788\n\n📋 *Format yang diterima:*\n• 6289xxxxxxxx (langsung)\n• +62 xxx-xxxx-xxxx (dengan format)\n• 08xxxxxxxxxx (akan dikonversi ke 628xxx)\n\n⚠️ *Catatan:* Nomor yang ditambahkan tidak akan auto-reject video call`, msg, sock);
                    return;
                }

                let inputNumber = args.slice(2).join(' ').trim();

                // Normalisasi nomor
                function normalizeNumber(num) {
                    // Hapus semua karakter non-digit
                    let cleanNum = num.replace(/\D/g, '');

                    // Konversi 08xxx ke 628xxx
                    if (cleanNum.startsWith('08')) {
                        cleanNum = '628' + cleanNum.substring(2);
                    }
                    // Konversi 62xxx ke 628xxx jika dimulai dengan 62 tapi bukan 628
                    else if (cleanNum.startsWith('62') && !cleanNum.startsWith('628')) {
                        cleanNum = '628' + cleanNum.substring(2);
                    }
                    // Jika tidak dimulai dengan 62, tambahkan 628
                    else if (!cleanNum.startsWith('62')) {
                        cleanNum = '628' + cleanNum;
                    }

                    return cleanNum;
                }

                const normalizedNumber = normalizeNumber(inputNumber);

                // Validasi nomor
                if (normalizedNumber.length < 10 || normalizedNumber.length > 15) {
                    await Wily('❌ *NOMOR TIDAK VALID*\n\nNomor harus memiliki 10-15 digit setelah dinormalisasi', msg, sock);
                    return;
                }

                // Cek apakah nomor sudah ada
                if (config.autoFeatures.anticallvid.whitelist.includes(normalizedNumber)) {
                    await Wily(`⚠️ *NOMOR SUDAH ADA*\n\n📱 Nomor: ${normalizedNumber}\n🔒 Status: Sudah di whitelist\n\n📋 Lihat daftar: ${config.bot.prefix}anticallvid list`, msg, sock);
                    return;
                }

                // Tambahkan ke whitelist
                config.autoFeatures.anticallvid.whitelist.push(normalizedNumber);

                if (saveConfig(config)) {
                    const successText = `✅ *NOMOR BERHASIL DITAMBAHKAN*

📱 *Nomor Ditambahkan:*
${normalizedNumber}

📋 *Input Asli:*
${inputNumber}

⚙️ *Detail Whitelist:*
├─ Total Nomor: ${config.autoFeatures.anticallvid.whitelist.length}
├─ Status: Nomor tidak akan auto-reject video call
├─ Berlaku: Panggilan video private
└─ Tersimpan: config.json ✅

🔧 *Command lainnya:*
• ${config.bot.prefix}anticallvid list - Lihat daftar
• ${config.bot.prefix}anticallvid del <nomor> - Hapus nomor
• ${config.bot.prefix}anticallvid status - Status lengkap`;

                    await Wily(successText, msg, sock);
                } else {
                    await Wily('❌ *GAGAL MENYIMPAN*\n\nTerjadi error saat menyimpan nomor ke whitelist', msg, sock);
                }
                break;

            case 'del':
                if (args.length < 3) {
                    await Wily(`❌ *FORMAT SALAH!*\n\n📝 *Cara penggunaan:*\n${config.bot.prefix}anticallvid del <nomor>\n\n💡 *Contoh:*\n${config.bot.prefix}anticallvid del 6289xxxxxxxx\n\n📋 *Atau lihat daftar:*\n${config.bot.prefix}anticallvid list`, msg, sock);
                    return;
                }

                let delNumber = args.slice(2).join(' ').trim();
                const normalizedDelNumber = normalizeNumber(delNumber);

                // Pastikan whitelist exists
                if (!config.autoFeatures.anticallvid.whitelist || config.autoFeatures.anticallvid.whitelist.length === 0) {
                    await Wily('❌ *WHITELIST KOSONG*\n\nTidak ada nomor yang terdaftar di whitelist', msg, sock);
                    return;
                }

                // Cek apakah nomor ada di whitelist
                const numberIndex = config.autoFeatures.anticallvid.whitelist.indexOf(normalizedDelNumber);
                if (numberIndex === -1) {
                    await Wily(`❌ *NOMOR TIDAK DITEMUKAN*\n\n📱 Nomor: ${normalizedDelNumber}\n🔍 Status: Tidak ada di whitelist\n\n📋 Lihat daftar: ${config.bot.prefix}anticallvid list`, msg, sock);
                    return;
                }

                // Hapus dari whitelist
                config.autoFeatures.anticallvid.whitelist.splice(numberIndex, 1);

                if (saveConfig(config)) {
                    const successText = `✅ *NOMOR BERHASIL DIHAPUS*

📱 *Nomor Dihapus:*
${normalizedDelNumber}

📋 *Input Asli:*
${delNumber}

⚙️ *Detail Whitelist:*
├─ Total Nomor: ${config.autoFeatures.anticallvid.whitelist.length}
├─ Status: Nomor akan auto-reject video call lagi
├─ Berlaku: Panggilan video private
└─ Tersimpan: config.json ✅

🔧 *Command lainnya:*
• ${config.bot.prefix}anticallvid list - Lihat daftar
• ${config.bot.prefix}anticallvid add <nomor> - Tambah nomor`;

                    await Wily(successText, msg, sock);
                } else {
                    await Wily('❌ *GAGAL MENYIMPAN*\n\nTerjadi error saat menghapus nomor dari whitelist', msg, sock);
                }
                break;

            case 'list':
                if (!config.autoFeatures.anticallvid.whitelist || config.autoFeatures.anticallvid.whitelist.length === 0) {
                    await Wily(`📋 *WHITELIST ANTI VIDEO CALL KOSONG*\n\n❌ Tidak ada nomor yang terdaftar\n\n🔧 *Tambah nomor:*\n${config.bot.prefix}anticallvid add <nomor>\n\n💡 *Contoh:*\n${config.bot.prefix}anticallvid add 6289xxxxxxxx`, msg, sock);
                    return;
                }

                let listText = `📋 *DAFTAR WHITELIST ANTI VIDEO CALL*\n\n`;
                listText += `📊 *Total Nomor:* ${config.autoFeatures.anticallvid.whitelist.length}\n\n`;
                listText += `📱 *Daftar Nomor:*\n`;

                config.autoFeatures.anticallvid.whitelist.forEach((number, index) => {
                    listText += `${index + 1}. ${number}\n`;
                });

                listText += `\n⚙️ *Status:* Nomor di atas tidak akan auto-reject video call\n`;
                listText += `🔧 *Command:*\n`;
                listText += `• ${config.bot.prefix}anticallvid add <nomor> - Tambah\n`;
                listText += `• ${config.bot.prefix}anticallvid del <nomor> - Hapus\n`;
                listText += `• ${config.bot.prefix}anticallvid status - Status lengkap`;

                await Wily(listText, msg, sock);
                break;

            case 'setmsg':
                if (args.length < 3) {
                    await Wily(`❌ *FORMAT SALAH!*\n\n📝 *Cara penggunaan:*\n${config.bot.prefix}anticallvid setmsg <pesan custom>\n\n💡 *Contoh:*\n${config.bot.prefix}anticallvid setmsg Maaf, tidak menerima video call saat ini\n\n📋 *Pesan saat ini:*\n${config.autoFeatures?.anticallvid?.replyMessage || 'Belum diset'}`, msg, sock);
                    return;
                }

                const newMessage = args.slice(2).join(' ');

                if (newMessage.length > 500) {
                    await Wily('❌ *PESAN TERLALU PANJANG*\n\nMaksimal 500 karakter untuk pesan anti video call', msg, sock);
                    return;
                }

                if (newMessage.length < 10) {
                    await Wily('❌ *PESAN TERLALU PENDEK*\n\nMinimal 10 karakter untuk pesan anti video call', msg, sock);
                    return;
                }

                // Update config
                config.autoFeatures.anticallvid.replyMessage = newMessage;

                if (saveConfig(config)) {
                    // Verifikasi ulang bahwa config benar-benar tersimpan
                    const verifyConfig = loadConfig();
                    const savedMessage = verifyConfig.autoFeatures?.anticallvid?.replyMessage;

                    if (savedMessage === newMessage) {
                        const successText = `✅ *PESAN ANTI VIDEO CALL BERHASIL DIUBAH & TERSIMPAN*

💬 *Pesan Baru:*
${newMessage}

⚙️ *Detail Pengaturan:*
├─ Status: ${config.autoFeatures.anticallvid.enabled ? 'AKTIF ✅' : 'NONAKTIF ❌'}
├─ Mode: Private Only
├─ Karakter: ${newMessage.length}/500
└─ Auto Reply: ${config.autoFeatures.anticallvid.enabled ? 'Ya ✅' : 'Tidak ❌'}

✅ *KONFIRMASI PENYIMPANAN:*
├─ File: config.json ✅
├─ Backup: DATA/config.backup.json ✅
├─ Verifikasi: Pesan tersimpan dengan benar ✅
└─ Status: Siap digunakan ✅

🔧 *Command lainnya:*
• ${config.bot.prefix}anticallvid on/off
• ${config.bot.prefix}anticallvid status`;

                        await Wily(successText, msg, sock);
                    } else {
                        await Wily(`❌ *PESAN TERSIMPAN TAPI TIDAK SESUAI*\n\nPesan yang diinput: ${newMessage}\nPesan yang tersimpan: ${savedMessage || 'Tidak ada'}\n\nCoba lagi dengan command yang sama`, msg, sock);
                    }
                } else {
                    await Wily('❌ *GAGAL MENYIMPAN CONFIG*\n\nTerjadi error saat menyimpan pesan anti video call ke config.json\nSilakan cek permission file atau coba lagi', msg, sock);
                }
                break;

            case 'status':
                const whitelistCount = config.autoFeatures.anticallvid.whitelist ? config.autoFeatures.anticallvid.whitelist.length : 0;
                const statusText = `📊 *STATUS ANTI VIDEO CALL*

⚙️ *Konfigurasi Saat Ini:*
├─ Status: ${config.autoFeatures.anticallvid.enabled ? 'AKTIF ✅' : 'NONAKTIF ❌'}
├─ Mode: Private Only
├─ Berlaku untuk: Chat Private Saja
├─ Auto Reply: ${config.autoFeatures.anticallvid.enabled ? 'Ya ✅' : 'Tidak ❌'}
└─ Whitelist: ${whitelistCount} nomor

💬 *Pesan Balasan:*
${config.autoFeatures.anticallvid.replyMessage}

📋 *Whitelist:*
${whitelistCount > 0 ? `• ${whitelistCount} nomor tidak akan auto-reject video call` : '• Tidak ada nomor di whitelist'}

🔧 *COMMAND TERSEDIA:*
• ${config.bot.prefix}anticallvid on/off
• ${config.bot.prefix}anticallvid setmsg <pesan>
• ${config.bot.prefix}anticallvid add <nomor>
• ${config.bot.prefix}anticallvid del <nomor>
• ${config.bot.prefix}anticallvid list
• ${config.bot.prefix}anticallvid status

⚠️ *CATATAN:* 
• Hanya menolak video call di chat private
• Voice call tidak terpengaruh
• Panggilan video group tidak akan ditolak
• Nomor di whitelist tidak akan auto-reject`;

                await Wily(statusText, msg, sock);
                break;

            default:
                await Wily(`❌ *COMMAND TIDAK DIKENAL*\n\nGunakan: ${config.bot.prefix}anticallvid <on/off/setmsg/add/del/list/status>`, msg, sock);
                break;
        }

    } catch (error) {
        await Wily('❌ *ERROR ANTI VIDEO CALL*\n\nTerjadi kesalahan saat mengatur anti video call', msg, sock);
    }
}

// Tracker untuk mencegah duplikasi pesan
const processedVideoCalls = new Map();

// Fungsi untuk normalisasi nomor
function normalizeNumber(num) {
    // Hapus semua karakter non-digit
    let cleanNum = num.replace(/\D/g, '');

    // Konversi 08xxx ke 628xxx
    if (cleanNum.startsWith('08')) {
        cleanNum = '628' + cleanNum.substring(2);
    }
    // Konversi 62xxx ke 628xxx jika dimulai dengan 62 tapi bukan 628
    else if (cleanNum.startsWith('62') && !cleanNum.startsWith('628')) {
        cleanNum = '628' + cleanNum.substring(2);
    }
    // Jika tidak dimulai dengan 62, tambahkan 628
    else if (!cleanNum.startsWith('62')) {
        cleanNum = '628' + cleanNum;
    }

    return cleanNum;
}

// Handle incoming video calls - KHUSUS UNTUK VIDEO CALL
function setupAnticallvid(sock) {
    // Register event listener untuk incoming video calls
    sock.ev.on('call', async (callData) => {
        try {
            // Load config fresh untuk setiap panggilan
            const config = loadConfig();

            // Skip jika anticallvid tidak aktif
            if (!config.autoFeatures?.anticallvid?.enabled) {
                return;
            }

            // Pastikan callData adalah array
            const calls = Array.isArray(callData) ? callData : [callData];

            // Process setiap panggilan
            for (const call of calls) {
                try {
                    // Hanya tangani panggilan yang baru masuk
                    if (call.status === 'offer' || call.status === 'ringing') {
                        const callerId = call.from;
                        const isGroup = callerId?.includes('@g.us') || false;
                        const isVideoCall = call.isVideo === true;
                        const callKey = `${call.id}_${callerId}_video`;

                        // Skip jika panggilan dari bot sendiri
                        if (call.isFromMe || callerId === sock.user?.id) {
                            continue;
                        }

                        // PENTING: Hanya proses video call, skip voice call
                        if (!isVideoCall) {
                            continue;
                        }

                        // Skip jika call sudah diproses sebelumnya
                        if (processedVideoCalls.has(callKey)) {
                            continue;
                        }

                        // Tandai call sebagai sudah diproses
                        processedVideoCalls.set(callKey, Date.now());

                        // Hanya tolak panggilan video private (bukan grup)
                        const shouldReject = !isGroup;

                        // Cek apakah nomor ada di whitelist
                        const callerNumber = callerId.split('@')[0];
                        const isWhitelisted = config.autoFeatures?.anticallvid?.whitelist?.includes(callerNumber) || false;

                        if (shouldReject && !isWhitelisted) {
                            // REJECT VIDEO CALL - MULTIPLE METHODS UNTUK KOMPATIBILITAS
                            try {
                                // Method 1: Standard rejectCall
                                if (typeof sock.rejectCall === 'function') {
                                    await sock.rejectCall(call.id, call.from);
                                } 
                                // Method 2: Alternative untuk baileys terbaru
                                else if (typeof sock.updateCallPresence === 'function') {
                                    await sock.updateCallPresence(call.id, 'reject');
                                }
                                // Method 3: Manual reject via sendNode
                                else {
                                    const rejectNode = {
                                        tag: 'call',
                                        attrs: {
                                            to: call.from,
                                            id: call.id
                                        },
                                        content: [{
                                            tag: 'reject',
                                            attrs: {},
                                            content: undefined
                                        }]
                                    };

                                    if (typeof sock.sendNode === 'function') {
                                        await sock.sendNode(rejectNode);
                                    }
                                }
                            } catch (rejectError) {
                                // Silent fail untuk reject error
                            }

                            // AUTO REPLY MESSAGE - hanya sekali per video call menggunakan format reply.js
                            // Load fresh config untuk memastikan pesan terbaru
                            const freshConfig = loadConfig();
                            const replyMessage = freshConfig.autoFeatures?.anticallvid?.replyMessage || 
                                '🚫 *VIDEO CALL DITOLAK OTOMATIS*\n\n📹 Maaf, saat ini bot tidak menerima panggilan video.\n\n💬 Silakan kirim pesan teks untuk berkomunikasi.\n\n🤖 Terima kasih atas pengertiannya!';

                            // Kirim balasan dengan delay menggunakan format reply.js yang rapi
                            setTimeout(async () => {
                                try {
                                    // Import fungsi Wily dari reply.js
                                    const { Wily } = require('../../CODE_REPLAY/reply.js');

                                    // Buat object message yang kompatibel dengan Wily function
                                    const fakeMessage = {
                                        key: {
                                            remoteJid: callerId,
                                            fromMe: false,
                                            participant: callerId
                                        },
                                        message: {
                                            conversation: 'Incoming video call rejected'
                                        }
                                    };

                                    // Kirim dengan format reply.js yang rapi
                                    await Wily(replyMessage, fakeMessage, sock);
                                } catch (sendError) {
                                    // Fallback ke pesan biasa jika reply.js gagal
                                    try {
                                        await sock.sendMessage(callerId, {
                                            text: replyMessage
                                        });
                                    } catch (fallbackError) {
                                        // Silent fail untuk fallback error
                                    }
                                }
                            }, 2000); // Delay 2 detik
                        }
                    }
                } catch (callError) {
                    // Silent fail untuk call processing error
                }
            }
        } catch (error) {
            // Silent fail untuk main handler error
        }
    });

    // Cleanup tracker setiap 5 menit
    setInterval(() => {
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        for (const [key, timestamp] of processedVideoCalls.entries()) {
            if (now - timestamp > fiveMinutes) {
                processedVideoCalls.delete(key);
            }
        }
    }, 5 * 60 * 1000);
}

module.exports = {
    handleAnticallvidCommand,
    setupAnticallvid,
    loadConfig,
    saveConfig
};
