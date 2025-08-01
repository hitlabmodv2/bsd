
function getAsiaJakartaTime() {
    const now = new Date();
    const jakartaTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Jakarta"}));

    const hour = jakartaTime.getHours();
    const day = jakartaTime.getDay();
    const date = jakartaTime.getDate();
    const month = jakartaTime.getMonth();
    const year = jakartaTime.getFullYear();

    // Greeting berdasarkan waktu dengan emoji
    let greeting = '';
    if (hour >= 5 && hour < 12) {
        greeting = 'Selamat pagi 🌅';
    } else if (hour >= 12 && hour < 15) {
        greeting = 'Selamat siang ☀️';
    } else if (hour >= 15 && hour < 18) {
        greeting = 'Selamat sore 🌇';
    } else {
        greeting = 'Selamat malam 🌙';
    }

    // Nama hari dalam bahasa Indonesia dengan emoji
    const dayNames = [
        'Minggu 🔵', 'Senin 🟢', 'Selasa 🟡', 'Rabu 🔴', 
        'Kamis 🟠', 'Jumat 🟣', 'Sabtu 🟤'
    ];

    // Nama bulan dalam bahasa Indonesia dengan emoji
    const monthNames = [
        'Jan ❄️', 'Feb 💕', 'Mar 🌸', 'Apr 🌦️', 
        'Mei 🌺', 'Jun ☀️', 'Jul 🌻', 'Agu 🌾',
        'Sep 🍂', 'Okt 🎃', 'Nov 🦃', 'Des 🎄'
    ];

    // Format tanggal dengan leading zero
    const formattedDate = date.toString().padStart(2, '0');

    // Format waktu dengan AM/PM
    const hour12 = hour % 12 || 12;
    const minutes = jakartaTime.getMinutes().toString().padStart(2, '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const timeFormatted = `${hour12}:${minutes} ${ampm} ⏰`;

    return {
        greeting: greeting,
        hari: dayNames[day],
        tanggal: formattedDate + ' 📅',
        bulan: monthNames[month],
        tahun: year + ' 🗓️',
        waktu: timeFormatted
    };
}

// Fungsi untuk mendapatkan string terformat lengkap
function getJakartaTimeString() {
    const time = getAsiaJakartaTime();
    return `${time.greeting}\n${time.hari}\n${time.tanggal}\n${time.bulan}\n${time.tahun}\n${time.waktu}`;
}

// Fungsi untuk mendapatkan bagian tertentu saja
function getSelamat() {
    return getAsiaJakartaTime().greeting;
}

function getHari() {
    return getAsiaJakartaTime().hari;
}

function getTanggal() {
    return getAsiaJakartaTime().tanggal;
}

function getBulan() {
    return getAsiaJakartaTime().bulan;
}

function getTahun() {
    return getAsiaJakartaTime().tahun;
}

function getWaktu() {
    return getAsiaJakartaTime().waktu;
}

// Export menggunakan ES6 module
export {
    getAsiaJakartaTime,
    getJakartaTimeString,
    getSelamat,
    getHari,
    getTanggal,
    getBulan,
    getTahun,
    getWaktu
};
