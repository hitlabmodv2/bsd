import fs from 'fs';
import { Wily } from '../../CODE_REPLY/reply.js';

// Cache untuk mencegah duplikasi notifikasi
const notificationCache = new Map();
const DEBOUNCE_TIME = 2000; // 2 detik untuk responsivitas lebih baik

// Fungsi untuk membaca config
function readConfig() {
    try {
        if (!fs.existsSync('./config.json')) {
            const defaultConfig = {
                "OWNER": ["6289681008411"],
                "SELF": true,
                "mode": "self",
                "packName": "Sticker Dibuat Oleh : Wily",
                "packPublish": "BangWily",
                "SESSION_NAME": "sesi",
                "notifGroupChange": {
                    "enabled": false,
                    "mode": "off"
                }
            };
            fs.writeFileSync('./config.json', JSON.stringify(defaultConfig, null, 2));
            return defaultConfig;
        }
        return JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    } catch (error) {
        return {
            "OWNER": ["6289681008411"],
            "SELF": true,
            "mode": "self",
            "packName": "Sticker Dibuat Oleh : Wily",
            "packPublish": "BangWily",
            "SESSION_NAME": "sesi",
            "notifGroupChange": {
                "enabled": false,
                "mode": "off"
            }
        };
    }
}

// Fungsi untuk mendapatkan nomor bot
function getBotNumber() {
    try {
        if (fs.existsSync('./sesi/creds.json')) {
            const creds = JSON.parse(fs.readFileSync('./sesi/creds.json', 'utf8'));
            if (creds.me?.id) {
                return creds.me.id.split(':')[0];
            }
        }
        const config = readConfig();
        return config.OWNER[0] || "6289681008411";
    } catch (error) {
        return "6289681008411";
    }
}

// Fungsi untuk mengubah status notifikasi grup
function changeNotifGcStatus(status) {
    try {
        const config = readConfig();

        // Pastikan notifGroupChange object ada
        if (!config.notifGroupChange) {
            config.notifGroupChange = {
                "enabled": false,
                "mode": "off"
            };
        }

        // Update status
        if (status === 'on') {
            config.notifGroupChange.enabled = true;
            config.notifGroupChange.mode = 'on';
        } else {
            config.notifGroupChange.enabled = false;
            config.notifGroupChange.mode = 'off';
        }

        // Simpan ke file
        fs.writeFileSync('./config.json', JSON.stringify(config, null, 2));

        // Backup ke folder DATA
        const backupPath = './DATA/config-backup.json';
        fs.writeFileSync(backupPath, JSON.stringify(config, null, 2));

        return true;
    } catch (error) {
        return false;
    }
}

// Fungsi untuk membuat contextInfo yang bagus
async function createContextInfo(sock, groupId, participant, title, body, isPhotoChange = false) {
    try {
        const jakartaTime = new Date().toLocaleTimeString('id-ID', { 
            timeZone: 'Asia/Jakarta',
            hour12: false 
        });
        const jakartaDate = new Date().toLocaleDateString('id-ID', { 
            timeZone: 'Asia/Jakarta' 
        });

        let thumbnailUrl = null;
        
        // Jika ini adalah perubahan foto grup, gunakan foto grup
        if (isPhotoChange && groupId) {
            try {
                thumbnailUrl = await sock.profilePictureUrl(groupId, 'image');
            } catch (error) {
                // Fallback ke foto user jika foto grup tidak bisa diambil
                try {
                    if (participant) {
                        thumbnailUrl = await sock.profilePictureUrl(participant, 'image');
                    }
                } catch (userError) {
                    thumbnailUrl = 'https://files.catbox.moe/mxohav.gif';
                }
            }
        } else {
            // Untuk perubahan lain, gunakan foto user
            try {
                if (participant) {
                    thumbnailUrl = await sock.profilePictureUrl(participant, 'image');
                }
            } catch (error) {
                thumbnailUrl = 'https://files.catbox.moe/mxohav.gif';
            }
        }

        // Fallback jika masih null
        if (!thumbnailUrl) {
            thumbnailUrl = 'https://files.catbox.moe/mxohav.gif';
        }

        return {
            quotedMessage: {
                conversation: `*_Dikembangkan Oleh @WilyKun Bot_* *${jakartaTime} WIB*`
            },
            mentionedJid: participant ? [participant] : [],
            participant: "6289688206739@s.whatsapp.net",
            remoteJid: "120363312297133690@g.us",
            forwardingScore: 999,
            isForwarded: true,
            externalAdReply: {
                title: title,
                body: body,
                thumbnailUrl: thumbnailUrl,
                sourceUrl: "https://wa.me/6289688206739",
                mediaType: 1,
                renderLargerThumbnail: true,
                showAdAttribution: false
            },
            forwardedNewsletterMessageInfo: {
                newsletterJid: "120363312297133690@newsletter",
                newsletterName: "WilyKun Official Bot"
            }
        };
    } catch (error) {
        return {};
    }
}

// Fungsi untuk check duplikasi dan mencegah spam notifikasi
function isDuplicateNotification(groupId, action, participants, content) {
    const key = `${groupId}_${action}_${participants ? participants.join(',') : ''}_${content || ''}`;
    const now = Date.now();

    if (notificationCache.has(key)) {
        const lastSent = notificationCache.get(key);
        if (now - lastSent < DEBOUNCE_TIME) {
            return true; // Masih dalam periode debounce
        }
    }

    // Update cache dengan timestamp terbaru
    notificationCache.set(key, now);

    // Cleanup cache yang sudah expired (lebih agresif)
    for (const [cacheKey, timestamp] of notificationCache.entries()) {
        if (now - timestamp > DEBOUNCE_TIME * 3) {
            notificationCache.delete(cacheKey);
        }
    }

    return false;
}

// Fungsi untuk mengirim pesan dengan contextInfo yang bagus
async function sendGroupNotification(sock, groupId, message, participant, title, body, isPhotoChange = false) {
    try {
        const contextInfo = await createContextInfo(sock, groupId, participant, title, body, isPhotoChange);

        const messageData = {
            text: message,
            contextInfo: contextInfo
        };

        await sock.sendMessage(groupId, messageData);
    } catch (error) {
        // Fallback tanpa contextInfo
        try {
            await sock.sendMessage(groupId, { text: message });
        } catch (fallbackError) {
            // Silent error handling
        }
    }
}

// Fungsi untuk format nomor WhatsApp
function formatWhatsAppNumber(jid) {
    if (!jid) return 'WhatsApp System';

    try {
        // Extract nomor dari JID
        let number = jid.split('@')[0];

        // Remove any non-numeric characters
        const cleanNumber = number.replace(/\D/g, '');

        // Jika nomor kosong atau terlalu pendek
        if (!cleanNumber || cleanNumber.length < 8) {
            return 'WhatsApp System';
        }

        // Jika nomor terlalu panjang atau aneh (lebih dari 15 digit)
        if (cleanNumber.length > 15) {
            // Coba ekstrak bagian yang masuk akal
            // Jika dimulai dengan 1 dan terlalu panjang, anggap sebagai system error
            if (cleanNumber.startsWith('1') && cleanNumber.length > 15) {
                return 'WhatsApp System';
            }

            // Coba ambil 12-13 digit terakhir untuk nomor Indonesia
            if (cleanNumber.length >= 12) {
                const lastDigits = cleanNumber.slice(-12);
                if (lastDigits.startsWith('62') || lastDigits.startsWith('8')) {
                    number = lastDigits.startsWith('62') ? lastDigits : '62' + lastDigits;
                } else {
                    return 'WhatsApp System';
                }
            } else {
                return 'WhatsApp System';
            }
        } else {
            number = cleanNumber;
        }

        // Jika nomor masih terlalu aneh
        if (number.length > 15 || number.length < 8) {
            return 'WhatsApp System';
        }

        // Format nomor Indonesia
        if (number.startsWith('62')) {
            return number;
        } else if (number.startsWith('0')) {
            return `62${number.substring(1)}`;
        } else if (number.startsWith('8') && number.length >= 10) {
            return `62${number}`;
        } else if (number.length >= 10 && !number.startsWith('1')) {
            return `62${number}`;
        } else {
            return 'WhatsApp System';
        }
    } catch (error) {
        return 'WhatsApp System';
    }
}

// Fungsi untuk mendapatkan nama peserta dengan prioritas yang lebih baik
async function getParticipantName(sock, participantJid, groupId) {
    try {
        let participantName = null;

        // Prioritas 1: Coba ambil nama dari contact menggunakan getName
        try {
            const name = await sock.getName(participantJid);
            if (name && name.trim() !== '' && name !== 'undefined' && name.length <= 30) {
                participantName = name.trim();
            }
        } catch (error) {
            // Continue to other methods
        }

        // Prioritas 2: Coba ambil dari metadata grup
        if (!participantName) {
            try {
                const groupMetadata = await sock.groupMetadata(groupId);
                const participant = groupMetadata.participants.find(p => p.id === participantJid);

                if (participant) {
                    // Prioritas: notify name > contact name
                    if (participant.notify && participant.notify.trim() !== '' && participant.notify !== 'undefined') {
                        participantName = participant.notify.trim();
                    } else if (participant.name && participant.name.trim() !== '' && participant.name !== 'undefined') {
                        participantName = participant.name.trim();
                    }
                }
            } catch (groupError) {
                // Continue to other methods
            }
        }

        // Prioritas 3: Coba dari onWhatsApp dengan profile
        if (!participantName) {
            try {
                const contact = await sock.onWhatsApp(participantJid);
                if (contact && contact[0]) {
                    if (contact[0].notify && contact[0].notify.trim() !== '' && contact[0].notify !== 'undefined') {
                        participantName = contact[0].notify.trim();
                    } else if (contact[0].name && contact[0].name.trim() !== '' && contact[0].name !== 'undefined') {
                        participantName = contact[0].name.trim();
                    }
                }
            } catch (contactError) {
                // Continue to fallback
            }
        }

        // Prioritas 4: Coba format nomor jika nama masih kosong atau tidak valid
        if (!participantName || participantName === 'Unknown' || participantName === 'undefined' || participantName.length > 30) {
            const formattedNumber = formatWhatsAppNumber(participantJid);

            // Jika nomor valid, gunakan nomor
            if (formattedNumber !== 'WhatsApp System' && formattedNumber.length <= 15 && formattedNumber.length >= 8) {
                // Format nomor menjadi lebih readable
                const cleanNumber = formattedNumber.replace(/^62/, '+62 ');
                participantName = cleanNumber;
            } else {
                // Sebagai fallback terakhir, cek status admin
                try {
                    const groupMetadata = await sock.groupMetadata(groupId);
                    const participant = groupMetadata.participants.find(p => p.id === participantJid);
                    if (participant && (participant.admin === 'admin' || participant.admin === 'superadmin')) {
                        participantName = 'Admin Grup';
                    } else {
                        participantName = 'Admin Grup';
                    }
                } catch (error) {
                    participantName = 'Pengguna';
                }
            }
        }

        return participantName || 'Pengguna';
    } catch (error) {
        return 'Pengguna';
    }
}

// Fungsi untuk mendapatkan display name yang bersih
function getCleanDisplayName(jid, name = null) {
    try {
        // Jika ada nama yang valid, gunakan itu
        if (name && name !== 'Unknown' && name !== 'WhatsApp System' && 
            name.trim() !== '' && name.length <= 50 && name.length >= 2) {
            return name.trim();
        }

        // Coba format nomor
        const number = formatWhatsAppNumber(jid);
        if (number && number !== 'WhatsApp System' && number.length <= 15 && number.length >= 8) {
            return number;
        }

        return 'User';
    } catch (error) {
        return 'User';
    }
}

// Handler untuk perubahan grup (groups.update)
export async function handleGroupUpdate(update, sock) {
    try {
        const config = readConfig();

        // Cek apakah notifikasi grup diaktifkan
        if (!config.notifGroupChange?.enabled) {
            return;
        }

        const { id, subject, desc, author } = update;

        // Skip jika tidak ada ID grup
        if (!id) return;

        // Jika tidak ada author, coba deteksi dari context lain
        let actualAuthor = author;
        if (!actualAuthor && update.participants && update.participants.length > 0) {
            actualAuthor = update.participants[0];
        }
        if (!actualAuthor) {
            // Coba dapatkan dari bot number
            const botNumber = getBotNumber();
            actualAuthor = botNumber + '@s.whatsapp.net';
        }

        let changeMessage = '';
        const authorNumber = formatWhatsAppNumber(actualAuthor);
        const mentionJid = actualAuthor;

        // Get group metadata dengan informasi lengkap
        let groupName = subject || 'Grup';
        let memberCount = 0;
        let adminCount = 0;

        try {
            const groupMetadata = await sock.groupMetadata(id);
            groupName = groupMetadata.subject || groupName;
            memberCount = groupMetadata.participants?.length || 0;
            adminCount = groupMetadata.participants?.filter(p => p.admin === 'admin' || p.admin === 'superadmin').length || 0;
        } catch (error) {
            // Use existing or default values
        }

        // Get participant name untuk display yang lebih baik
        const participantName = await getParticipantName(sock, actualAuthor, id);
        const cleanDisplayName = getCleanDisplayName(actualAuthor, participantName);

        // Deteksi jenis perubahan berdasarkan field yang ada
        if (update.subject !== undefined && update.subject !== null) {
            // Check untuk duplikasi
            if (isDuplicateNotification(id, 'subject_change', null, subject)) {
                return;
            }
            changeMessage = `🏷️ *PERUBAHAN NAMA GRUP*\n\n` +
                          `👥 Nama Grup: ${groupName}\n` +
                          `✏️ Nama baru: ${subject}\n` +
                          `👤 Diubah oleh: ${cleanDisplayName}\n` +
                          `⏰ Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                          `📊 *STATISTIK GRUP:*\n` +
                          `👥 Total Member: ${memberCount} orang\n` +
                          `👑 Total Admin: ${adminCount} orang\n\n` +
                          `🔔 Notifikasi Perubahan Grup Aktif`;

            await sendGroupNotification(sock, id, changeMessage, mentionJid, 
                `🏷️ PERUBAHAN NAMA GRUP`, `${groupName} • ${new Date().toLocaleDateString('id-ID')}`);

        } else if (update.desc !== undefined && update.desc !== null) {
            // Check untuk duplikasi
            if (isDuplicateNotification(id, 'desc_change', null, desc)) {
                return;
            }
            changeMessage = `📝 *PERUBAHAN DESKRIPSI GRUP*\n\n` +
                          `👥 Nama Grup: ${groupName}\n` +
                          `📄 Deskripsi baru: ${desc || 'Tidak ada deskripsi'}\n` +
                          `👤 Diubah oleh: ${cleanDisplayName}\n` +
                          `⏰ Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                          `📊 *STATISTIK GRUP:*\n` +
                          `👥 Total Member: ${memberCount} orang\n` +
                          `👑 Total Admin: ${adminCount} orang\n\n` +
                          `🔔 Notifikasi Perubahan Grup Aktif`;

            await sendGroupNotification(sock, id, changeMessage, mentionJid, 
                `📝 PERUBAHAN DESKRIPSI GRUP`, `${groupName} • ${new Date().toLocaleDateString('id-ID')}`);

        } else if (update.announce !== undefined) {
            // Check untuk duplikasi
            if (isDuplicateNotification(id, 'announce_change', null, update.announce.toString())) {
                return;
            }
            const announceStatus = update.announce ? 'Hanya Admin' : 'Semua Member';
            changeMessage = `📢 *PERUBAHAN PENGATURAN PESAN*\n\n` +
                          `👥 Nama Grup: ${groupName}\n` +
                          `⚙️ Pengaturan: ${announceStatus}\n` +
                          `👤 Diubah oleh: @${authorNumber}\n` +
                          `⏰ Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                          `📊 *STATISTIK GRUP:*\n` +
                          `👥 Total Member: ${memberCount} orang\n` +
                          `👑 Total Admin: ${adminCount} orang\n\n` +
                          `🔔 Notifikasi Perubahan Grup Aktif`;

            await sendGroupNotification(sock, id, changeMessage, mentionJid, 
                `📢 PERUBAHAN PENGATURAN PESAN`, `${groupName} • ${new Date().toLocaleDateString('id-ID')}`);

        } else if (update.restrict !== undefined) {
            // Check untuk duplikasi
            if (isDuplicateNotification(id, 'restrict_change', null, update.restrict.toString())) {
                return;
            }
            const restrictStatus = update.restrict ? 'Hanya Admin' : 'Semua Member';
            changeMessage = `🔒 *PERUBAHAN PENGATURAN INFO GRUP*\n\n` +
                          `👥 Nama Grup: ${groupName}\n` +
                          `⚙️ Edit info grup: ${restrictStatus}\n` +
                          `👤 Diubah oleh: @${authorNumber}\n` +
                          `⏰ Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                          `📊 *STATISTIK GRUP:*\n` +
                          `👥 Total Member: ${memberCount} orang\n` +
                          `👑 Total Admin: ${adminCount} orang\n\n` +
                          `🔔 Notifikasi Perubahan Grup Aktif`;

            await sendGroupNotification(sock, id, changeMessage, mentionJid, 
                `🔒 PERUBAHAN PENGATURAN INFO GRUP`, `${groupName} • ${new Date().toLocaleDateString('id-ID')}`);

        } else if (update.size !== undefined) {
            // Check untuk duplikasi
            if (isDuplicateNotification(id, 'size_change', null, update.size.toString())) {
                return;
            }
            changeMessage = `👥 *PERUBAHAN UKURAN GRUP*\n\n` +
                          `👥 Nama Grup: ${groupName}\n` +
                          `📊 Ukuran baru: ${update.size} anggota\n` +
                          `👤 Diubah oleh: @${authorNumber}\n` +
                          `⏰ Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                          `📊 *STATISTIK GRUP:*\n` +
                          `👥 Total Member: ${memberCount} orang\n` +
                          `👑 Total Admin: ${adminCount} orang\n\n` +
                          `🔔 Notifikasi Perubahan Grup Aktif`;

            await sendGroupNotification(sock, id, changeMessage, mentionJid, 
                `👥 PERUBAHAN UKURAN GRUP`, `${groupName} • ${new Date().toLocaleDateString('id-ID')}`);
        }

    } catch (error) {
        console.error('Error in handleGroupUpdate:', error);
    }
}

// Handler khusus untuk perubahan foto grup (contacts.update)
export async function handleContactUpdate(update, sock) {
    try {
        const config = readConfig();

        // Cek apakah notifikasi grup diaktifkan
        if (!config.notifGroupChange?.enabled) {
            return;
        }

        // Filter hanya untuk grup dan perubahan foto
        if (!update.id || !update.id.includes('@g.us') || update.picture !== 'changed') {
            return;
        }

        const groupId = update.id;

        // Check untuk duplikasi dengan timestamp yang lebih ketat
        const timestamp = Date.now();
        if (isDuplicateNotification(groupId, 'picture_change', null, timestamp.toString())) {
            return;
        }

        // Get group metadata
        let groupName = 'Grup';
        let memberCount = 0;
        let adminCount = 0;

        try {
            const groupMetadata = await sock.groupMetadata(groupId);
            groupName = groupMetadata.subject || 'Grup';
            memberCount = groupMetadata.participants?.length || 0;
            adminCount = groupMetadata.participants?.filter(p => p.admin === 'admin' || p.admin === 'superadmin').length || 0;
        } catch (error) {
            // Use default values if can't get metadata
        }

        // Karena WhatsApp tidak memberikan info author untuk perubahan foto,
        // kita gunakan system message
        const changeMessage = `🖼️ *PERUBAHAN FOTO GRUP*\n\n` +
                            `👥 Nama Grup: ${groupName}\n` +
                            `📸 Foto grup telah diperbarui\n` +
                            `👤 Diubah oleh: Admin Grup\n` +
                            `⏰ Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                            `📊 *STATISTIK GRUP:*\n` +
                            `👥 Total Member: ${memberCount} orang\n` +
                            `👑 Total Admin: ${adminCount} orang\n\n` +
                            `🎨 Tampilan grup telah diperbarui dengan foto baru!`;

        await sendGroupNotification(sock, groupId, changeMessage, null, 
            `🖼️ PERUBAHAN FOTO GRUP`, `${groupName} • ${new Date().toLocaleDateString('id-ID')}`, true);

    } catch (error) {
        // Silent error handling
    }
}

// Handler untuk participant update (join/leave/promote/demote)
export async function handleParticipantUpdate(update, sock) {
    try {
        const config = readConfig();

        // Cek apakah notifikasi grup diaktifkan
        if (!config.notifGroupChange?.enabled) {
            return;
        }

        const { id: groupId, participants, action, author } = update;

        if (!participants || participants.length === 0) return;

        let changeMessage = '';
        const authorNumber = author ? author.split('@')[0] : 'System';

        // Get group metadata untuk nama grup dan statistik
        let groupName = 'Grup';
        let memberCount = 0;
        let adminCount = 0;

        try {
            const groupMetadata = await sock.groupMetadata(groupId);
            groupName = groupMetadata.subject || 'Grup';
            memberCount = groupMetadata.participants?.length || 0;
            adminCount = groupMetadata.participants?.filter(p => p.admin === 'admin' || p.admin === 'superadmin').length || 0;
        } catch (error) {
            // Use default name if can't get metadata
        }

        switch (action) {
            case 'add':
                const addedNumbers = participants.map(p => p.split('@')[0]);

                // Check untuk duplikasi
                if (isDuplicateNotification(groupId, 'add', participants, author || 'system')) {
                    return;
                }

                if (author) {
                    changeMessage = `👥 *ANGGOTA BARU DITAMBAHKAN*\n\n` +
                                  `👥 Nama Grup: ${groupName}\n` +
                                  `🆕 Anggota baru: ${addedNumbers.map(num => `@${num}`).join(', ')}\n` +
                                  `👤 Ditambahkan oleh: @${authorNumber}\n` +
                                  `⏰ Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                                  `📊 *STATISTIK GRUP SAAT INI:*\n` +
                                  `👥 Total Member: ${memberCount} orang\n` +
                                  `👑 Total Admin: ${adminCount} orang\n\n` +
                                  `🎉 Selamat datang di grup!`;
                } else {
                    changeMessage = `👥 *ANGGOTA BARU BERGABUNG*\n\n` +
                                  `👥 Nama Grup: ${groupName}\n` +
                                  `🆕 Anggota baru: ${addedNumbers.map(num => `@${num}`).join(', ')}\n` +
                                  `📱 Bergabung melalui link undangan\n` +
                                  `⏰ Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                                  `📊 *STATISTIK GRUP SAAT INI:*\n` +
                                  `👥 Total Member: ${memberCount} orang\n` +
                                  `👑 Total Admin: ${adminCount} orang\n\n` +
                                  `🎉 Selamat datang di grup!`;
                }

                await sendGroupNotification(sock, groupId, changeMessage, author || participants[0], 
                    `👥 ANGGOTA BARU`, `${groupName} • ${new Date().toLocaleDateString('id-ID')}`);
                break;

            case 'remove':
                const removedNumbers = participants.map(p => p.split('@')[0]);

                // Check untuk duplikasi
                if (isDuplicateNotification(groupId, 'remove', participants, author || 'system')) {
                    return;
                }

                // Deteksi akurat: apakah keluar sendiri atau dikeluarkan admin
                const isKickedByAdmin = author && !participants.includes(author);
                const isSelfLeave = !author || participants.includes(author);

                if (isKickedByAdmin) {
                    // Dikeluarkan oleh admin
                    const adminName = await getParticipantName(sock, author, groupId);
                    const cleanAdminName = getCleanDisplayName(author, adminName);

                    changeMessage = `👥 *ANGGOTA DIKELUARKAN ADMIN*\n\n` +
                                  `👥 Nama Grup: ${groupName}\n` +
                                  `❌ Anggota dikeluarkan: ${removedNumbers.map(num => `@${num}`).join(', ')}\n` +
                                  `👤 Dikeluarkan oleh: ${cleanAdminName}\n` +
                                  `⚖️ Tindakan: Kick oleh Admin\n` +
                                  `⏰ Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                                  `📊 *STATISTIK GRUP SAAT INI:*\n` +
                                  `👥 Total Member: ${memberCount} orang\n` +
                                  `👑 Total Admin: ${adminCount} orang\n\n` +
                                  `⚠️ Admin telah mengeluarkan anggota dari grup`;

                    await sendGroupNotification(sock, groupId, changeMessage, author, 
                        `👥 DIKELUARKAN ADMIN`, `${groupName} • ${new Date().toLocaleDateString('id-ID')}`);
                } else {
                    // Keluar sendiri
                    changeMessage = `👥 *ANGGOTA KELUAR SENDIRI*\n\n` +
                                  `👥 Nama Grup: ${groupName}\n` +
                                  `🚪 Anggota keluar: ${removedNumbers.map(num => `@${num}`).join(', ')}\n` +
                                  `📱 Tindakan: Keluar sendiri dari grup\n` +
                                  `⏰ Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                                  `📊 *STATISTIK GRUP SAAT INI:*\n` +
                                  `👥 Total Member: ${memberCount} orang\n` +
                                  `👑 Total Admin: ${adminCount} orang\n\n` +
                                  `👋 Sampai jumpa! Semoga sukses selalu`;

                    await sendGroupNotification(sock, groupId, changeMessage, participants[0], 
                        `👥 KELUAR SENDIRI`, `${groupName} • ${new Date().toLocaleDateString('id-ID')}`);
                }
                break;

            case 'promote':
                const promotedNumbers = participants.map(p => p.split('@')[0]);

                // Check untuk duplikasi
                if (isDuplicateNotification(groupId, 'promote', participants, author || 'system')) {
                    return;
                }

                changeMessage = `👑 *ADMIN BARU DITUNJUK*\n\n` +
                              `👥 Nama Grup: ${groupName}\n` +
                              `⬆️ Admin baru: ${promotedNumbers.map(num => `@${num}`).join(', ')}\n` +
                              `👤 Ditunjuk oleh: @${authorNumber}\n` +
                              `⏰ Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                              `📊 *STATISTIK GRUP SAAT INI:*\n` +
                              `👥 Total Member: ${memberCount} orang\n` +
                              `👑 Total Admin: ${adminCount} orang\n\n` +
                              `🎉 Selamat! Kini Anda adalah admin grup`;

                await sendGroupNotification(sock, groupId, changeMessage, author, 
                    `👑 ADMIN BARU DITUNJUK`, `${groupName} • ${new Date().toLocaleDateString('id-ID')}`);
                break;

            case 'demote':
                const demotedNumbers = participants.map(p => p.split('@')[0]);

                // Check untuk duplikasi
                if (isDuplicateNotification(groupId, 'demote', participants, author || 'system')) {
                    return;
                }

                changeMessage = `👤 *ADMIN DITURUNKAN*\n\n` +
                              `👥 Nama Grup: ${groupName}\n` +
                              `⬇️ Bukan admin lagi: ${demotedNumbers.map(num => `@${num}`).join(', ')}\n` +
                              `👤 Diturunkan oleh: @${authorNumber}\n` +
                              `⏰ Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                              `📊 *STATISTIK GRUP SAAT INI:*\n` +
                              `👥 Total Member: ${memberCount} orang\n` +
                              `👑 Total Admin: ${adminCount} orang\n\n` +
                              `📝 Status berubah menjadi member biasa`;

                await sendGroupNotification(sock, groupId, changeMessage, author, 
                    `👤 ADMIN DITURUNKAN`, `${groupName} • ${new Date().toLocaleDateString('id-ID')}`);
                break;
        }

    } catch (error) {
        // Silent error handling
    }
}



// Handler untuk group setting update (open/close/approval)
export async function handleGroupSettingsUpdate(update, sock) {
    try {
        const config = readConfig();

        // Cek apakah notifikasi grup diaktifkan
        if (!config.notifGroupChange?.enabled) {
            return;
        }

        const { id, author } = update;

        // Jika tidak ada author, coba dapatkan dari update context
        let actualAuthor = author;
        if (!actualAuthor && update.participants && update.participants.length > 0) {
            actualAuthor = update.participants[0];
        }
        if (!actualAuthor && id) {
            // Fallback author menggunakan bot/system
            actualAuthor = id.split('@')[0] + '@s.whatsapp.net';
        }

        if (!actualAuthor || !id) return;

        let changeMessage = '';
        const authorNumber = actualAuthor.split('@')[0];

        // Get group metadata untuk nama grup dan statistik
        let groupName = 'Grup';
        let memberCount = 0;
        let adminCount = 0;

        try {
            const groupMetadata = await sock.groupMetadata(id);
            groupName = groupMetadata.subject || 'Grup';
            memberCount = groupMetadata.participants?.length || 0;
            adminCount = groupMetadata.participants?.filter(p => p.admin === 'admin' || p.admin === 'superadmin').length || 0;
        } catch (error) {
            // Use default name if can't get metadata
        }

        // Check for membership approval setting - Enhanced detection dengan pembedaan mode yang lebih detail
        if (update.memberAddMode !== undefined || update.joinApprovalMode !== undefined || 
            update.approval !== undefined || update.approveMode !== undefined ||
            update.membershipApprovalMode !== undefined || update.approvalMode !== undefined ||
            update.groupSettings?.memberAddMode !== undefined ||
            (update.hasOwnProperty('memberAddMode') && update.memberAddMode !== null) ||
            (update.hasOwnProperty('joinApprovalMode') && update.joinApprovalMode !== null)) {

            // Check untuk duplikasi
            const approvalKey = update.memberAddMode || update.joinApprovalMode || update.approval || 'unknown';
            if (isDuplicateNotification(id, 'approval_change', null, approvalKey.toString())) {
                return;
            }

            let approvalStatus = '';
            let modeType = '';
            let isApprovalRequired = false;
            let modeEmoji = '';
            let statusEmoji = '';

            // Enhanced detection methods untuk pembedaan mode yang lebih akurat
            if (update.memberAddMode === 'admin_add' || update.memberAddMode === 'require_admin_approval' || 
                update.memberAddMode === 'admin_approval' || update.memberAddMode === 'admin_only' ||
                update.approveMode === 'admin' || update.approvalMode === 'admin' ||
                update.membershipApprovalMode === 'admin' || update.membershipApprovalMode === true ||
                update.groupSettings?.memberAddMode === 'admin_add') {

                approvalStatus = 'Hanya Admin yang Bisa Menambah Anggota';
                modeType = 'ADMIN_ADD_ONLY';
                isApprovalRequired = false; // Admin langsung bisa tambah tanpa approval
                modeEmoji = '👑';
                statusEmoji = '🔐';

                // Get participant name untuk display yang lebih baik
                const participantName = await getParticipantName(sock, actualAuthor, id);
                const cleanDisplayName = getCleanDisplayName(actualAuthor, participantName);

                changeMessage = `${modeEmoji} *PERUBAHAN MODE TAMBAH ANGGOTA* ${statusEmoji}\n\n` +
                              `🏠 Nama Grup: ${groupName}\n` +
                              `👑 Mode Baru: ${approvalStatus}\n` +
                              `⚙️ Tipe Pengaturan: Tambah Anggota Eksklusif Admin\n` +
                              `👤 Diubah oleh: ${cleanDisplayName}\n` +
                              `⏰ Waktu Perubahan: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                              `📊 *INFORMASI GRUP SAAT INI:*\n` +
                              `👥 Total Anggota: ${memberCount} orang\n` +
                              `👑 Total Admin: ${adminCount} orang\n\n` +
                              `🔔 Pengaturan penambahan anggota telah berhasil diperbarui\n\n` +
                              `💡 *DETAIL MODE TAMBAH ANGGOTA EKSKLUSIF:*\n` +
                              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                              `👑 Hanya admin yang dapat menambah anggota baru\n` +
                              `⚡ Admin dapat langsung menambah tanpa approval\n` +
                              `🚫 Member biasa tidak bisa menambah siapapun\n` +
                              `🔗 Link undangan grup tetap berfungsi normal\n` +
                              `🛡️ Mode keamanan tinggi untuk grup eksklusif\n` +
                              `⚠️ Kontrol penuh berada di tangan admin\n` +
                              `🎯 Cocok untuk grup dengan standar tinggi\n\n` +
                              `✨ *KEUNTUNGAN MODE INI:*\n` +
                              `🔒 Privasi dan keamanan maksimal\n` +
                              `👥 Kualitas anggota terjaga\n` +
                              `⚡ Proses cepat tanpa approval berlapis\n` +
                              `🎯 Admin memiliki kontrol penuh\n\n` +
                              `🎉 *STATUS AKTIF:* Mode Tambah Anggota Eksklusif Admin - DIAKTIFKAN`;

            } else if (update.joinApprovalMode === true || update.approval === true || 
                       update.memberAddMode === 'approval_required' || update.memberAddMode === 'require_approval' ||
                       update.approveMode === 'approval' || update.approvalMode === 'approval') {

                approvalStatus = 'Persetujuan Admin Diperlukan untuk Anggota Baru';
                modeType = 'APPROVAL_REQUIRED';
                isApprovalRequired = true;
                modeEmoji = '✅';
                statusEmoji = '🔍';

                // Get participant name untuk display yang lebih baik
                const participantName = await getParticipantName(sock, actualAuthor, id);
                const cleanDisplayName = getCleanDisplayName(actualAuthor, participantName);

                changeMessage = `${modeEmoji} *PERUBAHAN MODE PERSETUJUAN ANGGOTA* ${statusEmoji}\n\n` +
                              `🏠 Nama Grup: ${groupName}\n` +
                              `🔍 Mode Baru: ${approvalStatus}\n` +
                              `⚙️ Tipe Pengaturan: Sistem Approval Anggota Baru\n` +
                              `👤 Diubah oleh: ${cleanDisplayName}\n` +
                              `⏰ Waktu Perubahan: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                              `📊 *INFORMASI GRUP SAAT INI:*\n` +
                              `👥 Total Anggota: ${memberCount} orang\n` +
                              `👑 Total Admin: ${adminCount} orang\n\n` +
                              `🔔 Sistem persetujuan anggota baru telah berhasil diaktifkan\n\n` +
                              `💡 *DETAIL MODE PERSETUJUAN ANGGOTA BARU:*\n` +
                              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                              `✅ Semua anggota dapat menambah orang lain\n` +
                              `🔍 Calon anggota baru perlu persetujuan admin\n` +
                              `⏳ Ada proses review sebelum anggota diterima\n` +
                              `🔗 Link undangan memerlukan approval admin\n` +
                              `👥 Anggota lama dapat mengundang dengan approval\n` +
                              `🛡️ Filter otomatis untuk anggota berkualitas\n` +
                              `⚠️ Admin memiliki kontrol akhir penerimaan\n\n` +
                              `✨ *KEUNTUNGAN SISTEM APPROVAL:*\n` +
                              `🔒 Keamanan berlapis untuk seleksi anggota\n` +
                              `👥 Kualitas anggota terjamin melalui review\n` +
                              `⚡ Semua anggota bisa berpartisipasi mengundang\n` +
                              `🎯 Admin dapat memfilter sebelum menerima\n` +
                              `📋 Riwayat approval tersimpan dengan baik\n\n` +
                              `🎉 *STATUS AKTIF:* Sistem Persetujuan Anggota Baru - DIAKTIFKAN`;

            } else if (update.memberAddMode === 'all' || update.memberAddMode === 'everyone' ||
                       update.memberAddMode === 'no_approval' || update.memberAddMode === 'open' ||
                       update.joinApprovalMode === false || update.approval === false ||
                       update.approveMode === 'all' || update.approvalMode === 'all' ||
                       update.membershipApprovalMode === 'all' || update.membershipApprovalMode === false ||
                       update.groupSettings?.memberAddMode === 'all') {

                approvalStatus = 'Semua Anggota Bisa Menambah Orang Lain';
                modeType = 'OPEN_ADD';
                isApprovalRequired = false;
                modeEmoji = '🌐';
                statusEmoji = '🔓';

                // Get participant name untuk display yang lebih baik
                const participantName = await getParticipantName(sock, actualAuthor, id);
                const cleanDisplayName = getCleanDisplayName(actualAuthor, participantName);

                changeMessage = `${modeEmoji} *PERUBAHAN MODE TAMBAH ANGGOTA TERBUKA* ${statusEmoji}\n\n` +
                              `🏠 Nama Grup: ${groupName}\n` +
                              `🌐 Mode Baru: ${approvalStatus}\n` +
                              `⚙️ Tipe Pengaturan: Tambah Anggota Bebas\n` +
                              `👤 Diubah oleh: ${cleanDisplayName}\n` +
                              `⏰ Waktu Perubahan: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                              `📊 *INFORMASI GRUP SAAT INI:*\n` +
                              `👥 Total Anggota: ${memberCount} orang\n` +
                              `👑 Total Admin: ${adminCount} orang\n\n` +
                              `🔔 Mode tambah anggota terbuka telah berhasil diaktifkan\n\n` +
                              `💡 *DETAIL MODE TAMBAH ANGGOTA TERBUKA:*\n` +
                              `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                              `🌐 Semua anggota dapat menambah orang lain\n` +
                              `⚡ Anggota baru langsung masuk tanpa approval\n` +
                              `🔗 Link undangan langsung aktif dan berfungsi\n` +
                              `👥 Tidak ada proses review atau persetujuan\n` +
                              `📢 Mode terbuka untuk komunitas dan grup umum\n` +
                              `🚀 Pertumbuhan grup lebih cepat dan dinamis\n` +
                              `✨ Interaksi sosial lebih bebas dan terbuka\n\n` +
                              `✨ *KEUNTUNGAN MODE TERBUKA:*\n` +
                              `🔓 Akses mudah untuk semua anggota\n` +
                              `👥 Pertumbuhan grup yang cepat\n` +
                              `⚡ Proses simpel tanpa birokrasi\n` +
                              `🎯 Cocok untuk komunitas besar dan aktif\n` +
                              `📈 Networking dan sosialisasi maksimal\n\n` +
                              `🎉 *STATUS AKTIF:* Mode Tambah Anggota Terbuka - DIAKTIFKAN`;
            } else {
                // Fallback untuk mode yang tidak dikenali
                approvalStatus = 'Mode Tidak Dikenal';
                modeType = 'UNKNOWN';
                modeEmoji = '❓';
                statusEmoji = '⚠️';

                // Get participant name untuk display yang lebih baik
                const participantName = await getParticipantName(sock, actualAuthor, id);
                const cleanDisplayName = getCleanDisplayName(actualAuthor, participantName);

                changeMessage = `${modeEmoji} *PERUBAHAN PENGATURAN ANGGOTA* ${statusEmoji}\n\n` +
                              `🏠 Nama Grup: ${groupName}\n` +
                              `❓ Mode: ${approvalStatus}\n` +
                              `👤 Diubah oleh: ${cleanDisplayName}\n` +
                              `⏰ Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                              `📊 *STATISTIK GRUP:*\n` +
                              `👥 Total Member: ${memberCount} orang\n` +
                              `👑 Total Admin: ${adminCount} orang\n\n` +
                              `⚠️ Mode pengaturan anggota telah berubah ke konfigurasi yang tidak dikenal`;
            }

            await sendGroupNotification(sock, id, changeMessage, actualAuthor, 
                `${modeEmoji} ${modeType}`, `${groupName} • ${new Date().toLocaleDateString('id-ID')}`);
        }

        // Check for disappearing messages setting - Enhanced detection with more field variations
        if (update.ephemeralDuration !== undefined || update.disappearingMessagesInChat !== undefined ||
            update.ephemeralExpiration !== undefined || update.privateMode !== undefined ||
            update.ephemeral !== undefined || update.disappearing !== undefined ||
            update.vanishMode !== undefined || update.temporaryMessages !== undefined ||
            update.ephemeralMode !== undefined || update.timedMessages !== undefined ||
            update.messageTimer !== undefined || update.ephemeralSetting !== undefined ||
            (update.hasOwnProperty('ephemeralDuration') && update.ephemeralDuration !== null) ||
            (update.hasOwnProperty('disappearingMessagesInChat') && update.disappearingMessagesInChat !== null) ||
            (update.hasOwnProperty('ephemeralExpiration') && update.ephemeralExpiration !== null)) {

            let duration = 0;

            // Multiple ways to detect duration value
            if (update.ephemeralDuration !== undefined) {
                duration = update.ephemeralDuration;
            } else if (update.ephemeralExpiration !== undefined) {
                duration = update.ephemeralExpiration;
            } else if (update.disappearingMessagesInChat !== undefined) {
                duration = update.disappearingMessagesInChat;
            } else if (update.ephemeral !== undefined) {
                duration = update.ephemeral;
            } else if (update.disappearing !== undefined) {
                duration = update.disappearing;
            } else if (update.vanishMode !== undefined) {
                duration = update.vanishMode;
            } else if (update.temporaryMessages !== undefined) {
                duration = update.temporaryMessages;
            } else if (update.ephemeralMode !== undefined) {
                duration = update.ephemeralMode;
            } else if (update.timedMessages !== undefined) {
                duration = update.timedMessages;
            } else if (update.messageTimer !== undefined) {
                duration = update.messageTimer;
            } else if (update.ephemeralSetting !== undefined) {
                duration = update.ephemeralSetting;
            } else if (update.privateMode !== undefined) {
                duration = update.privateMode === true ? 86400 : 0; // Default 24 jam jika private mode aktif
            }

            // Check untuk duplikasi dengan key yang lebih akurat
            const durationKey = `${duration}_${Date.now()}`;
            if (isDuplicateNotification(id, 'ephemeral_change', null, durationKey)) {
                return;
            }

            let durationText = '';
            let statusText = '';

            if (duration === 0 || duration === null || duration === false) {
                durationText = 'Nonaktif (Pesan Permanen)';
                statusText = 'DINONAKTIFKAN';
            } else if (duration === 86400) {
                durationText = '24 jam';
                statusText = 'DIAKTIFKAN';
            } else if (duration === 604800) {
                durationText = '7 hari';
                statusText = 'DIAKTIFKAN';
            } else if (duration === 7776000) {
                durationText = '90 hari';
                statusText = 'DIAKTIFKAN';
            } else if (duration === 28800) {
                durationText = '8 jam';
                statusText = 'DIAKTIFKAN';
            } else if (duration === 3600) {
                durationText = '1 jam';
                statusText = 'DIAKTIFKAN';
            } else if (duration === 1800) {
                durationText = '30 menit';
                statusText = 'DIAKTIFKAN';
            } else if (duration === 300) {
                durationText = '5 menit';
                statusText = 'DIAKTIFKAN';
            } else if (duration === 60) {
                durationText = '1 menit';
                statusText = 'DIAKTIFKAN';
            } else if (duration === true || duration > 0) {
                statusText = 'DIAKTIFKAN';
                const hours = Math.floor(duration / 3600);
                const minutes = Math.floor((duration % 3600) / 60);
                const seconds = duration % 60;

                if (hours > 0) {
                    durationText = `${hours} jam ${minutes > 0 ? minutes + ' menit' : ''}`;
                } else if (minutes > 0) {
                    durationText = `${minutes} menit ${seconds > 0 ? seconds + 'detik' : ''}`;
                } else if (seconds > 0) {
                    durationText = `${seconds} detik`;
                } else {
                    durationText = 'Durasi Custom';
                }
            } else {
                durationText = 'Mode Tidak Dikenal';
                statusText = 'BERUBAH';
            }

            const privacyEmoji = (duration > 0 && duration !== false) ? '🔐' : '🔓';
            const statusEmoji = (duration > 0 && duration !== false) ? '✅' : '❌';

            // Get participant name untuk display yang lebih baik
            const participantName = await getParticipantName(sock, actualAuthor, id);
            const cleanDisplayName = getCleanDisplayName(actualAuthor, participantName);

            changeMessage = `${privacyEmoji} *PERUBAHAN PENGATURAN PRIVASI GRUP* ${statusEmoji}\n\n` +
                          `🏠 Nama Grup: ${groupName}\n` +
                          `🕐 Durasi pesan sementara: ${durationText}\n` +
                          `📊 Status: ${statusText}\n` +
                          `👤 Diubah oleh: ${cleanDisplayName}\n` +
                          `⏰ Waktu perubahan: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                          `📊 *INFORMASI GRUP SAAT INI:*\n` +
                          `👥 Total Anggota: ${memberCount} orang\n` +
                          `👑 Total Admin: ${adminCount} orang\n\n` +
                          `🔔 Pengaturan privasi grup telah berhasil diperbarui\n\n` +
                          `💡 *Detail Perubahan Pesan Sementara:*\n` +
                          `${(duration > 0 && duration !== false) ? 
                            `🔒 Pesan sementara ${statusText}\n⏳ Pesan akan hilang otomatis setelah ${durationText}\n🛡️ Mode privasi tingkat tinggi telah diaktifkan\n🔐 Keamanan pesan terjamin dengan enkripsi penuh\n⚠️ Pesan tidak dapat di-screenshot atau disimpan\n✨ Semua pesan akan terhapus secara otomatis` : 
                            `🔓 Pesan sementara ${statusText}\n💾 Pesan akan tersimpan secara permanen di chat\n📝 Mode chat normal dengan riwayat lengkap\n📱 Pesan dapat disimpan dan di-screenshot\n🔄 Riwayat percakapan tersedia selamanya\n📚 Backup pesan otomatis aktif`}\n\n` +
                          `🎯 *Status Terkini:* Pesan Sementara ${statusText} - Durasi: ${durationText}`;

            await sendGroupNotification(sock, id, changeMessage, actualAuthor, 
                `${privacyEmoji} PRIVASI CHAT TINGKAT LANJUT`, `${groupName} • ${new Date().toLocaleDateString('id-ID')}`);
        }

    } catch (error) {
        // Silent error handling
    }
}

// Handler khusus untuk chat update (perubahan foto profil grup)
export async function handleChatUpdate(update, sock) {
    try {
        const config = readConfig();

        // Cek apakah notifikasi grup diaktifkan
        if (!config.notifGroupChange?.enabled) {
            return;
        }

        // Filter hanya untuk grup dan perubahan foto
        if (!update.id || !update.id.includes('@g.us')) {
            return;
        }

        const groupId = update.id;

        // Deteksi perubahan foto dengan berbagai field
        const hasPhotoChange = update.imgUrl !== undefined || 
                              update.picture !== undefined || 
                              update.profilePictureUrl !== undefined || 
                              update.icon !== undefined ||
                              update.image !== undefined || 
                              update.photo !== undefined ||
                              update.groupIcon !== undefined || 
                              update.groupImage !== undefined;

        if (!hasPhotoChange) {
            return;
        }

        // Check untuk duplikasi dengan timestamp yang lebih ketat
        const timestamp = Date.now();
        if (isDuplicateNotification(groupId, 'chat_picture_change', null, timestamp.toString())) {
            return;
        }

        // Get group metadata
        let groupName = 'Grup';
        let memberCount = 0;
        let adminCount = 0;

        try {
            const groupMetadata = await sock.groupMetadata(groupId);
            groupName = groupMetadata.subject || 'Grup';
            memberCount = groupMetadata.participants?.length || 0;
            adminCount = groupMetadata.participants?.filter(p => p.admin === 'admin' || p.admin === 'superadmin').length || 0;
        } catch (error) {
            // Use default values if can't get metadata
        }

        // Karena WhatsApp tidak memberikan info author untuk perubahan foto di chat update,
        // kita coba deteksi dari context atau gunakan admin sebagai fallback
        let authorJid = null;

        // Coba dapatkan dari update context
        if (update.author) {
            authorJid = update.author;
        } else if (update.participant) {
            authorJid = update.participant;
        } else {
            // Fallback: gunakan bot number
            const botNumber = getBotNumber();
            authorJid = botNumber + '@s.whatsapp.net';
        }

        // Get participant name
        const participantName = await getParticipantName(sock, authorJid, groupId);
        const cleanDisplayName = getCleanDisplayName(authorJid, participantName);

        const changeMessage = `🖼️ *PERUBAHAN FOTO GRUP*\n\n` +
                            `👥 Nama Grup: ${groupName}\n` +
                            `📸 Foto grup telah diperbarui\n` +
                            `👤 Diubah oleh: ${cleanDisplayName}\n` +
                            `⏰ Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                            `📊 *STATISTIK GRUP:*\n` +
                            `👥 Total Member: ${memberCount} orang\n` +
                            `👑 Total Admin: ${adminCount} orang\n\n` +
                            `🎨 Tampilan grup telah diperbarui dengan foto baru!\n` +
                            `✨ Ikon grup berhasil diganti untuk memberikan tampilan segar`;

        await sendGroupNotification(sock, groupId, changeMessage, authorJid, 
            `🖼️ PERUBAHAN FOTO GRUP`, `${groupName} • ${new Date().toLocaleDateString('id-ID')}`, true);

    } catch (error) {
        // Silent error handling
    }
}

// Handler untuk command notifgc
export async function handleNotifGcCommand(m, { hisoka, text, command }) {
    try {
        const config = readConfig();

        // Ekstraksi sender number
        let senderNumber = '';
        const isFromMe = m.key?.fromMe === true;

        if (isFromMe) {
            senderNumber = getBotNumber();
        } else if (m.sender) {
            senderNumber = m.sender.split('@')[0];
        } else if (m.key?.participant) {
            senderNumber = m.key.participant.split('@')[0];
        } else if (m.key?.remoteJid && !m.key.remoteJid.includes('@g.us')) {
            senderNumber = m.key.remoteJid.split('@')[0];
        }

        if (!senderNumber || senderNumber === 'undefined' || senderNumber === '') {
            return;
        }

        // Cek apakah user adalah owner
        if (!config.OWNER.includes(senderNumber)) {
            // Respon sesuai mode bot
            const shouldReply = !config.SELF || config.mode === 'public' || m.key?.participant;
            if (shouldReply) {
                await Wily('🚫 *Maaf, fitur ini khusus untuk Owner Bot*\n\n💡 Fitur Notifikasi Perubahan Grup hanya dapat diakses oleh Owner\n\n🔒 Akses terbatas untuk menjaga keamanan dan privasi bot\n\n✨ Terima kasih atas pengertiannya!', m, hisoka);
            }
            return;
        }

        const args = text ? text.trim().split(' ') : [];
        const action = args[0]?.toLowerCase();

        // Validasi command yang ketat
        if (!action || !['on', 'off'].includes(action)) {
            const currentStatus = config.notifGroupChange?.enabled ? 'ON' : 'OFF';
            const currentMode = config.notifGroupChange?.mode || 'off';

            await Wily(`🔔 *NOTIFIKASI PERUBAHAN GRUP*\n\n📊 Status saat ini: *${currentStatus}*\n📋 Mode: ${currentMode}\n\n📋 *Cara penggunaan:*\n• \`.notifgc on\` - Aktifkan notifikasi\n• \`.notifgc off\` - Matikan notifikasi\n\n💡 *Fitur yang tersedia:*\n• Perubahan nama grup\n• Perubahan deskripsi grup\n• Perubahan foto grup\n• Perubahan pengaturan grup\n• Notifikasi anggota baru\n• Notifikasi anggota keluar\n• Notifikasi admin baru\n• Notifikasi admin diturunkan\n• Persetujuan anggota baru\n• Pengaturan pesan sementara\n• Statistik member & admin real-time\n\n⚠️ *Peringatan:*\nGunakan command yang valid: \`.notifgc on\` atau \`.notifgc off\`\n\n⚙️ Data tersimpan otomatis ke config.json`, m, hisoka);
            return;
        }

        const currentStatus = config.notifGroupChange?.enabled ? 'on' : 'off';

        // Cek jika status sudah sama
        if (action === currentStatus) {
            if (action === 'on') {
                await Wily(`ℹ️ *NOTIFIKASI GRUP SUDAH AKTIF*\n\n🔔 *FITUR YANG AKTIF:*\n━━━━━━━━━━━━━━━━━━━\n✅ Notifikasi perubahan nama grup\n✅ Notifikasi perubahan deskripsi\n✅ Notifikasi perubahan foto grup\n✅ Notifikasi perubahan pengaturan\n✅ Notifikasi anggota baru join\n✅ Notifikasi anggota keluar\n✅ Notifikasi admin baru\n✅ Notifikasi admin diturunkan\n✅ Notifikasi persetujuan anggota\n✅ Notifikasi pesan sementara\n✅ Auto mention pelaku perubahan\n✅ Statistik member & admin real-time\n\n🎯 *KEUNTUNGAN:*\n━━━━━━━━━━━━━━━━━━━\n✅ Monitor semua aktivitas grup\n✅ Tahu siapa yang melakukan perubahan\n✅ Riwayat lengkap tersimpan\n✅ Notifikasi real-time akurat\n✅ Cocok untuk admin grup aktif\n\n💡 *SARAN:*\n• Gunakan \`.notifgc off\` untuk mematikan\n• Fitur ini sangat membantu admin grup\n• Cocok untuk grup penting dan aktif`, m, hisoka);
            } else {
                await Wily(`ℹ️ *NOTIFIKASI GRUP SUDAH NONAKTIF*\n\n🔕 *STATUS SAAT INI:*\n━━━━━━━━━━━━━━━━━━━\n• Notifikasi perubahan grup: OFF\n• Bot tidak akan memberitahu perubahan\n• Mode hemat resource dan silent\n• Cocok untuk grup dengan aktivitas tinggi\n\n🎯 *KEUNTUNGAN MODE OFF:*\n━━━━━━━━━━━━━━━━━━━\n✅ Tidak ada spam notifikasi\n✅ Hemat resource bot\n✅ Grup lebih tenang\n✅ Fokus pada pesan utama\n✅ Mode minimalis\n\n💡 *SARAN:*\n• Gunakan \`.notifgc on\` untuk mengaktifkan\n• Aktifkan jika perlu monitor grup\n• Sesuaikan dengan kebutuhan grup`, m, hisoka);
            }
            return;
        }

        // Ubah status
        const success = changeNotifGcStatus(action);

        if (success) {
            // Verifikasi perubahan
            const newConfig = readConfig();
            const actualStatus = newConfig.notifGroupChange?.enabled ? 'on' : 'off';

            const emoji = action === 'on' ? '🔔' : '🔕';
            const description = action === 'on' 
                ? 'Bot akan memberitahu semua perubahan dan aktivitas grup'
                : 'Bot tidak akan memberitahu perubahan grup';

            await Wily(`${emoji} *NOTIFIKASI GRUP BERHASIL DIUBAH*\n\n🔄 Status: *${currentStatus.toUpperCase()}* ➜ *${actualStatus.toUpperCase()}*\n📝 Keterangan: ${description}\n\n✅ Konfigurasi tersimpan ke config.json\n💾 Backup dibuat di folder DATA\n⚡ Bot terus berjalan tanpa restart\n\n🔍 *Verifikasi:* Notifikasi grup sekarang ${actualStatus.toUpperCase()}\n\n${action === 'on' ? '🎯 *FITUR LENGKAP AKTIF:*\n━━━━━━━━━━━━━━━━━━━\n🏷️ Perubahan nama grup\n📝 Perubahan deskripsi grup\n🖼️ Perubahan foto grup\n⚙️ Perubahan pengaturan grup\n👥 Anggota baru join/keluar\n👑 Admin baru/diturunkan\n🔐 Persetujuan anggota baru\n⏰ Pengaturan pesan sementara\n🎯 Auto mention pelaku akurat\n📊 Statistik member & admin real-time' : '💤 *MODE SILENT AKTIF:*\n━━━━━━━━━━━━━━━━━━━\n🔕 Tidak ada notifikasi perubahan\n🤖 Bot tetap berfungsi normal\n💾 Hemat resource dan bandwidth\n📱 Cocok untuk grup ramai'}`, m, hisoka);
        } else {
            await Wily('❌ Gagal mengubah status notifikasi grup. Pastikan file config.json dapat ditulis.', m, hisoka);
        }

    } catch (error) {
        await Wily('❌ Terjadi kesalahan saat memproses command notifikasi grup.', m, hisoka);
    }
}
// This code updates the group settings notification to display the actual username of the person who made the change.