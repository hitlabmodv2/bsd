
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');
const sharp = require('sharp');
const { Wily } = require('../CODE_REPLAY/reply.js');

// Login credentials
const LOGIN_CREDENTIALS = {
    username: 'Wilykun.js',
    password: '.RADIO07',
    email: 'smart.clam.ffeb@letterprotect.net'
};

// Create axios instance with session cookies
let axiosInstance = null;

// Load config function
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
        bot: { mode: 'public', prefix: '.', owner: '', botNumber: '' }
    };
}

// Check access permission
function checkAccess(msg, config) {
    if (!config || !config.bot) return true;

    const botMode = config.bot.mode || 'public';

    if (botMode === 'public') {
        return true; // Public mode - semua bisa akses
    }

    // Self mode - hanya owner dan bot number
    const senderJid = msg.key.remoteJid;
    let actualSenderNumber;

    if (msg.key.participant) {
        actualSenderNumber = msg.key.participant.split('@')[0];
    } else if (msg.key.fromMe) {
        actualSenderNumber = config.bot.botNumber || config.bot.owner;
    } else {
        actualSenderNumber = senderJid?.split('@')[0];
    }

    const isOwner = actualSenderNumber === config.bot.owner;
    const isBotNumber = actualSenderNumber === config.bot.botNumber;
    const isFromMe = msg.key.fromMe === true;

    return isFromMe || isOwner || isBotNumber;
}

// Login to nhentai
async function loginToNhentai() {
    try {
        const cookieJar = {};

        // Create axios instance with optimized configuration
        axiosInstance = axios.create({
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Cache-Control': 'no-cache'
            },
            timeout: 20000,
            maxRedirects: 3,
            maxContentLength: 50 * 1024 * 1024, // 50MB limit
            maxBodyLength: 50 * 1024 * 1024
        });

        // First, get the login page to extract CSRF token
        const loginPageResponse = await axiosInstance.get('https://nhentai.net/login/');
        const $ = cheerio.load(loginPageResponse.data);

        // Extract CSRF token
        const csrfToken = $('input[name="csrfmiddlewaretoken"]').val() || 
                         $('meta[name="csrf-token"]').attr('content') ||
                         loginPageResponse.data.match(/name=['"]csrfmiddlewaretoken['"] value=['"]([^'"]+)['"]/)?.[1];

        // Store cookies from login page
        const setCookies = loginPageResponse.headers['set-cookie'];
        if (setCookies) {
            setCookies.forEach(cookie => {
                const [cookiePart] = cookie.split(';');
                const [name, value] = cookiePart.split('=');
                if (name && value) {
                    cookieJar[name.trim()] = value.trim();
                }
            });
        }

        // Prepare login data
        const loginData = new URLSearchParams({
            'csrfmiddlewaretoken': csrfToken || '',
            'username_or_email': LOGIN_CREDENTIALS.username,
            'password': LOGIN_CREDENTIALS.password,
            'next': '/'
        });

        // Convert cookie jar to cookie header
        const cookieHeader = Object.entries(cookieJar)
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');

        // Perform login
        const loginResponse = await axiosInstance.post('https://nhentai.net/login/', loginData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Referer': 'https://nhentai.net/login/',
                'Origin': 'https://nhentai.net',
                'Cookie': cookieHeader,
                'X-CSRFToken': csrfToken || ''
            },
            maxRedirects: 0,
            validateStatus: status => status < 400
        });

        // Update cookies from login response
        const loginSetCookies = loginResponse.headers['set-cookie'];
        if (loginSetCookies) {
            loginSetCookies.forEach(cookie => {
                const [cookiePart] = cookie.split(';');
                const [name, value] = cookiePart.split('=');
                if (name && value) {
                    cookieJar[name.trim()] = value.trim();
                }
            });
        }

        // Set default cookie header for future requests
        const finalCookieHeader = Object.entries(cookieJar)
            .map(([name, value]) => `${name}=${value}`)
            .join('; ');

        axiosInstance.defaults.headers.common['Cookie'] = finalCookieHeader;

        return true;
    } catch (error) {
        return false;
    }
}

// Get nhentai gallery info with improved accuracy
async function getNhentaiInfo(code) {
    try {
        // Ensure we're logged in
        if (!axiosInstance) {
            await loginToNhentai();
        }

        const url = `https://nhentai.net/g/${code}/`;
        const response = await axiosInstance.get(url);

        const $ = cheerio.load(response.data);

        // Check if we got the actual gallery page
        if ($('.error').length > 0 || $('title').text().includes('404')) {
            throw new Error('Gallery not found or private');
        }

        // Extract basic info with improved selectors
        const title = $('#info h1').text().trim() || $('#info h2').text().trim() || 'Unknown Title';
        const subtitle = $('#info h2').text().trim();

        // Extract detailed tag information with improved accuracy
        const extractTagInfo = (tagType) => {
            const tags = [];
            const tagTypeLower = tagType.toLowerCase();

            // Method 1: Use section-based extraction
            $('section.tag-container, .tag-container').each((i, container) => {
                const $container = $(container);
                const headerText = $container.find('h2, .tag-type').text().toLowerCase();
                
                // Check if this container is for our tag type
                if (headerText.includes(tagTypeLower) || 
                    $container.find('.tag').first().closest('section').prev('h2').text().toLowerCase().includes(tagTypeLower)) {
                    
                    $container.find('.tag').each((j, el) => {
                        const $tag = $(el);
                        const $nameEl = $tag.find('.name');
                        const $countEl = $tag.find('.count');
                        
                        const name = $nameEl.text().trim();
                        const countText = $countEl.text().trim().replace(/[(),]/g, '');
                        const count = countText || '0';

                        if (name && !name.includes(':') && name.toLowerCase() !== tagTypeLower) {
                            tags.push({
                                name: name,
                                count: count
                            });
                        }
                    });
                }
            });

            // Method 2: Alternative selector approach
            if (tags.length === 0) {
                $(`.tag-container:contains("${tagType}"), .tags:contains("${tagType}")`).each((i, container) => {
                    $(container).find('.tag').each((j, el) => {
                        const $tag = $(el);
                        const name = $tag.find('.name').text().trim();
                        const countText = $tag.find('.count').text().trim().replace(/[(),]/g, '');
                        
                        if (name && !name.includes(':') && name !== tagType) {
                            tags.push({
                                name: name,
                                count: countText || '0'
                            });
                        }
                    });
                });
            }

            // Method 3: Direct approach for specific sections
            if (tags.length === 0) {
                const sectionSelectors = {
                    'Artists': '#tags .artist, .artists .tag',
                    'Parodies': '#tags .parody, .parodies .tag', 
                    'Characters': '#tags .character, .characters .tag',
                    'Tags': '#tags .tag:not(.artist):not(.parody):not(.character):not(.language):not(.category)',
                    'Languages': '#tags .language, .languages .tag',
                    'Categories': '#tags .category, .categories .tag'
                };

                const selector = sectionSelectors[tagType];
                if (selector) {
                    $(selector).each((j, el) => {
                        const $tag = $(el);
                        const name = $tag.find('.name').text().trim() || $tag.text().split('(')[0].trim();
                        const countMatch = $tag.text().match(/\((\d+(?:,\d+)*)\)/);
                        const count = countMatch ? countMatch[1].replace(/,/g, '') : '0';
                        
                        if (name && name.length > 0) {
                            tags.push({
                                name: name,
                                count: count
                            });
                        }
                    });
                }
            }

            return tags;
        };

        // Extract all tag categories with improved methods
        const artists = extractTagInfo('Artists');
        const parodies = extractTagInfo('Parodies'); 
        const characters = extractTagInfo('Characters');
        const tags = extractTagInfo('Tags');
        const languages = extractTagInfo('Languages');
        const categories = extractTagInfo('Categories');

        // Extract pages dengan selector yang lebih tepat
        let pages = '0';
        $('#tags .tag-container').each((i, container) => {
            if ($(container).text().includes('Pages:')) {
                const pageTag = $(container).find('.tag .name').last().text().trim();
                if (pageTag && /^\d+$/.test(pageTag)) {
                    pages = pageTag;
                }
            }
        });

        // Extract upload date dengan multiple fallback
        let uploadDate = 'Unknown';
        const timeElement = $('time');
        if (timeElement.length > 0) {
            uploadDate = timeElement.attr('datetime') || timeElement.text().trim();
        } else {
            // Fallback ke selector lain
            const uploadedElement = $('.uploaded, #info .before, #info time');
            if (uploadedElement.length > 0) {
                uploadDate = uploadedElement.text().trim();
            }
        }

        // Get gallery data from JSON - pindahkan ke atas sebelum digunakan
        let galleryData = null;
        let mediaId = '';
        let imageUrls = [];

        // Extract from JavaScript gallery object with multiple methods
        const scriptTags = $('script').get();
        for (const script of scriptTags) {
            const scriptContent = $(script).html() || '';

            // Method 1: Extract from window._gallery
            const galleryMatch = scriptContent.match(/window\._gallery\s*=\s*JSON\.parse\("(.+?)"\);/) ||
                                scriptContent.match(/gallery:\s*({.+?}),?\s*$/m) ||
                                scriptContent.match(/_gallery\s*=\s*({.+?});/);

            if (galleryMatch) {
                try {
                    let jsonStr = galleryMatch[1];

                    // Clean up the JSON string if it's escaped
                    if (jsonStr.includes('\\"')) {
                        jsonStr = jsonStr.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
                    }

                    galleryData = JSON.parse(jsonStr);

                    if (galleryData && galleryData.media_id && galleryData.images) {
                        mediaId = galleryData.media_id.toString();

                        if (galleryData.images.pages) {
                            galleryData.images.pages.forEach((page, index) => {
                                const extension = getImageExtension(page.t);
                                const imageUrl = `https://i.nhentai.net/galleries/${mediaId}/${index + 1}.${extension}`;
                                imageUrls.push(imageUrl);
                            });
                        }
                        break;
                    }
                } catch (parseError) {
                    // Continue to next method
                }
            }
        }

        // Fallback methods if JSON extraction fails
        if (imageUrls.length === 0) {
            // Method 1: Try to extract media ID from page source
            const pageSource = response.data;
            const mediaIdMatches = pageSource.match(/media_id['"]\s*:\s*['"]*(\d+)['"]/g) ||
                                  pageSource.match(/galleries\/(\d+)\//g);

            if (mediaIdMatches && mediaIdMatches.length > 0) {
                const ids = mediaIdMatches.map(match => {
                    const idMatch = match.match(/(\d+)/);
                    return idMatch ? idMatch[1] : null;
                }).filter(Boolean);

                if (ids.length > 0) {
                    mediaId = ids[0];
                    const totalPages = parseInt(pages) || 20;

                    for (let i = 1; i <= totalPages; i++) {
                        // Use jpg as primary format for fallback
                        const imageUrl = `https://i.nhentai.net/galleries/${mediaId}/${i}.jpg`;
                        imageUrls.push(imageUrl);
                    }
                }
            }

            // Method 2: Try alternative image server URLs
            if (imageUrls.length === 0 && mediaId) {
                const totalPages = parseInt(pages) || 20;
                const altServers = ['i.nhentai.net', 'i2.nhentai.net', 'i3.nhentai.net'];

                for (const server of altServers) {
                    for (let i = 1; i <= totalPages; i++) {
                        const imageUrl = `https://${server}/galleries/${mediaId}/${i}.jpg`;
                        imageUrls.push(imageUrl);
                    }
                    break; // Try first server first
                }
            }

            // Method 3: Direct thumbnail extraction from page
            if (imageUrls.length === 0) {
                $('img').each((i, el) => {
                    const src = $(el).attr('src') || $(el).attr('data-src');
                    if (src && src.includes('nhentai') && src.includes('galleries')) {
                        // Convert thumbnail URL to full image URL
                        const fullUrl = src.replace('/t.', '/').replace('t.nhentai.net', 'i.nhentai.net');
                        if (!imageUrls.includes(fullUrl)) {
                            imageUrls.push(fullUrl);
                        }
                    }
                });
            }
        }

        // Extract favorites count with enhanced accuracy
        let favCount = '0';

        // Method 1: Extract from gallery JSON data first (most reliable)
        if (galleryData && galleryData.num_favorites !== undefined) {
            favCount = galleryData.num_favorites.toString();
        }

        // Method 2: Extract from page source JavaScript variables
        if (favCount === '0') {
            const pageSource = response.data;
            
            // Look for various JavaScript patterns
            const jsPatterns = [
                /num_favorites['":\s]*(\d+)/i,
                /favorites['":\s]*(\d+)/i,
                /"favorites":\s*(\d+)/i,
                /"num_favorites":\s*(\d+)/i,
                /favorite_count['":\s]*(\d+)/i
            ];

            for (const pattern of jsPatterns) {
                const match = pageSource.match(pattern);
                if (match && match[1]) {
                    favCount = match[1];
                    break;
                }
            }
        }

        // Method 3: DOM selectors with enhanced patterns
        if (favCount === '0') {
            const favoriteSelectors = [
                '#info .after',
                '.favorite-count', 
                '.favorites-count',
                '.favorite',
                '.favorites',
                '[data-favorites]',
                '.gallery-info .favorite',
                '.stats .favorite',
                '#info span:contains("favorites")',
                '#info span:contains("Favorites")'
            ];

            for (const selector of favoriteSelectors) {
                const elements = $(selector);
                elements.each((i, el) => {
                    const $el = $(el);
                    const text = $el.text().trim();
                    const dataFav = $el.attr('data-favorites');

                    // Check data attribute first
                    if (dataFav && /^\d+$/.test(dataFav)) {
                        favCount = dataFav;
                        return false;
                    }

                    // Enhanced text pattern matching
                    const patterns = [
                        /(\d+(?:,\d+)*)\s*favorites?/i,
                        /favorites?[:\s]*(\d+(?:,\d+)*)/i,
                        /♥\s*(\d+(?:,\d+)*)/,
                        /❤\s*(\d+(?:,\d+)*)/,
                        /^\s*(\d+(?:,\d+)*)\s*$/,
                        /Favorites:\s*(\d+(?:,\d+)*)/i
                    ];

                    for (const pattern of patterns) {
                        const match = text.match(pattern);
                        if (match && match[1]) {
                            favCount = match[1].replace(/,/g, '');
                            return false;
                        }
                    }
                });

                if (favCount !== '0') break;
            }
        }

        // Method 4: Look in adjacent elements and page metadata
        if (favCount === '0') {
            $('#info span, #info div, .gallery-stats span, .gallery-stats div').each((i, el) => {
                const text = $(el).text().trim();
                const nextText = $(el).next().text().trim();
                const prevText = $(el).prev().text().trim();
                
                // Check if this or adjacent elements contain favorite info
                const combinedText = `${prevText} ${text} ${nextText}`;
                const favMatch = combinedText.match(/(\d+(?:,\d+)*)\s*favorites?/i);
                
                if (favMatch) {
                    favCount = favMatch[1].replace(/,/g, '');
                    return false;
                }
            });
        }

        // Method 5: Fallback to meta tags and hidden elements
        if (favCount === '0') {
            $('meta[property*="favorite"], meta[name*="favorite"], [data-favorite-count]').each((i, el) => {
                const content = $(el).attr('content') || $(el).attr('data-favorite-count');
                if (content && /^\d+$/.test(content)) {
                    favCount = content;
                    return false;
                }
            });
        }

        // Provide better fallback data
        const finalArtists = artists.length > 0 ? artists : [{ name: 'Unknown Artist', count: 'N/A' }];
        const finalParodies = parodies.length > 0 ? parodies : [{ name: 'Original Work', count: 'N/A' }];
        const finalCharacters = characters.length > 0 ? characters : [{ name: 'Original Characters', count: 'N/A' }];
        const finalTags = tags.length > 0 ? tags : [{ name: 'General', count: 'N/A' }];
        const finalLanguages = languages.length > 0 ? languages : [{ name: 'Unknown Language', count: 'N/A' }];
        const finalCategories = categories.length > 0 ? categories : [{ name: 'Doujinshi', count: 'N/A' }];

        return {
            success: true,
            code: code,
            title: title,
            subtitle: subtitle || '',
            artists: finalArtists,
            parodies: finalParodies,
            characters: finalCharacters,
            tags: finalTags,
            languages: finalLanguages,
            categories: finalCategories,
            pages: pages,
            uploadDate: uploadDate,
            favorites: favCount,
            imageUrls: imageUrls,
            totalPages: imageUrls.length,
            mediaId: mediaId,
            galleryData: galleryData
        };

    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

// Helper function to get image extension
function getImageExtension(type) {
    switch (type) {
        case 'j': return 'jpg';
        case 'p': return 'png';
        case 'g': return 'gif';
        case 'w': return 'webp';
        default: return 'jpg';
    }
}

// Format number with K notation
function formatCount(count) {
    const num = parseInt(count) || 0;
    if (num >= 1000) {
        return Math.floor(num / 1000) + 'K';
    }
    return num.toString();
}

// Download images and create PDF with better error handling
async function createPDFFromImages(galleryInfo, outputPath, progressCallback = null) {
    try {
        const doc = new PDFDocument({ autoFirstPage: false });
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // Add detailed cover page
        doc.addPage();
        doc.fontSize(18).text(galleryInfo.title, 50, 50, { width: 500 });

        let yPos = 100;
        doc.fontSize(12);

        doc.text(`Code: #${galleryInfo.code}`, 50, yPos);
        yPos += 20;

        doc.text(`Pages: ${galleryInfo.pages}`, 50, yPos);
        yPos += 20;

        doc.text(`Uploaded: ${galleryInfo.uploadDate}`, 50, yPos);
        yPos += 20;

        doc.text(`Favorites: ${galleryInfo.favorites}`, 50, yPos);
        yPos += 30;

        // Add tags with counts
        if (galleryInfo.tags.length > 0) {
            doc.fontSize(14).text('Tags:', 50, yPos);
            yPos += 20;
            doc.fontSize(10);
            galleryInfo.tags.slice(0, 10).forEach(tag => {
                doc.text(`${tag.name} (${formatCount(tag.count)})`, 50, yPos);
                yPos += 15;
            });
            yPos += 10;
        }

        // Add artists
        if (galleryInfo.artists[0].name !== 'Unknown') {
            doc.fontSize(14).text('Artists:', 50, yPos);
            yPos += 20;
            doc.fontSize(10);
            galleryInfo.artists.forEach(artist => {
                doc.text(`${artist.name} (${artist.count})`, 50, yPos);
                yPos += 15;
            });
            yPos += 10;
        }

        // Add languages
        if (galleryInfo.languages[0].name !== 'Unknown') {
            doc.fontSize(14).text('Languages:', 50, yPos);
            yPos += 20;
            doc.fontSize(10);
            galleryInfo.languages.forEach(lang => {
                doc.text(`${lang.name} (${formatCount(lang.count)})`, 50, yPos);
                yPos += 15;
            });
        }

        let successCount = 0;
        const maxRetries = 2; // Reduce retries for speed
        const delayBetweenRequests = 200; // Reduce delay for faster download
        const maxConcurrent = 4; // Increase concurrent downloads

        // Function to validate image format by checking file signatures
        const validateImageFormat = (buffer) => {
            if (!buffer || buffer.length < 4) return false;

            const header = buffer.slice(0, 4);

            // JPEG: FF D8 FF
            if (header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF) return true;

            // PNG: 89 50 4E 47
            if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47) return true;

            // GIF: 47 49 46 38 or 47 49 46 39
            if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && (header[3] === 0x38 || header[3] === 0x39)) return true;

            // WebP: 52 49 46 46 (RIFF)
            if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
                if (buffer.length >= 12) {
                    const webpSig = buffer.slice(8, 12);
                    if (webpSig[0] === 0x57 && webpSig[1] === 0x45 && webpSig[2] === 0x42 && webpSig[3] === 0x50) return true;
                }
            }

            return false;
        };

        // Function to download single image
        const downloadImage = async (imageUrl, pageNum) => {
            const extensions = ['jpg', 'png', 'webp', 'gif'];
            const baseUrl = imageUrl.replace(/\.(jpg|png|gif|webp)$/, '');

            for (const ext of extensions) {
                const finalUrl = `${baseUrl}.${ext}`;

                for (let retry = 0; retry < maxRetries; retry++) {
                    try {
                        const imageResponse = await axiosInstance.get(finalUrl, {
                            responseType: 'arraybuffer',
                            headers: {
                                'Referer': `https://nhentai.net/g/${galleryInfo.code}/`,
                                'Accept': 'image/*,*/*;q=0.8',
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                            },
                            timeout: 20000
                        });

                        if (imageResponse.data && imageResponse.data.byteLength > 1000) {
                            const buffer = Buffer.from(imageResponse.data);

                            // Validate image format
                            if (validateImageFormat(buffer)) {
                                try {
                                    // Convert to JPEG using Sharp dengan optimasi kecepatan
                                    const processedBuffer = await sharp(buffer)
                                        .jpeg({ quality: 80, progressive: false, mozjpeg: false })
                                        .toBuffer();

                                    return {
                                        success: true,
                                        buffer: processedBuffer,
                                        pageNum: pageNum,
                                        url: finalUrl,
                                        format: 'jpg'
                                    };
                                } catch (sharpError) {
                                    // Jika Sharp gagal, gunakan buffer asli
                                    return {
                                        success: true,
                                        buffer: buffer,
                                        pageNum: pageNum,
                                        url: finalUrl,
                                        format: ext
                                    };
                                }
                            }
                        }
                    } catch (error) {
                        // Silent handling - tidak tampilkan error 404
                        if (retry === maxRetries - 1) continue;
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }
            return { success: false, pageNum: pageNum };
        };

        // Download images secara bertahap dengan progress yang akurat
        let processedImages = 0;
        const totalImages = galleryInfo.imageUrls.length;

        for (let i = 0; i < galleryInfo.imageUrls.length; i += maxConcurrent) {
            const batch = [];

            // Buat batch download
            for (let j = i; j < Math.min(i + maxConcurrent, galleryInfo.imageUrls.length); j++) {
                batch.push(downloadImage(galleryInfo.imageUrls[j], j + 1));
            }

            // Tunggu batch selesai
            const results = await Promise.allSettled(batch);

            // Proses hasil download dengan real-time progress update
            for (const result of results) {
                processedImages++;

                if (result.status === 'fulfilled' && result.value.success) {
                    try {
                        // Tambahkan halaman baru
                        doc.addPage({
                            size: 'A4',
                            margin: 10
                        });

                        const pageWidth = doc.page.width - 20;
                        const pageHeight = doc.page.height - 20;

                        // Masukkan gambar ke PDF
                        doc.image(result.value.buffer, 10, 10, { 
                            fit: [pageWidth, pageHeight],
                            align: 'center',
                            valign: 'center'
                        });

                        // Tambahkan nomor halaman
                        doc.fontSize(8)
                           .fillColor('gray')
                           .text(`Halaman ${result.value.pageNum}`, doc.page.width - 60, doc.page.height - 20);

                        successCount++;

                    } catch (pdfError) {
                        // Silent handling untuk PDF error
                        try {
                            doc.addPage();
                            doc.fontSize(16)
                               .fillColor('black')
                               .text(`Gambar ${result.value.pageNum} - Error Format`, 50, 200)
                               .fontSize(12)
                               .text(`Tidak dapat memuat gambar`, 50, 230);
                        } catch (placeholderError) {
                            // Silent handling
                        }
                    }
                }

                // Update progress secara real-time setelah setiap gambar diproses
                if (progressCallback) {
                    await progressCallback(processedImages, totalImages, galleryInfo.title);
                }
            }

            // Reduced delay for faster processing
            if (i + maxConcurrent < galleryInfo.imageUrls.length) {
                await new Promise(resolve => setTimeout(resolve, delayBetweenRequests));
            }
        }

        doc.end();

        return new Promise((resolve, reject) => {
            stream.on('finish', () => {
                if (successCount > 0) {
                    resolve(successCount);
                } else {
                    reject(new Error('No images could be downloaded'));
                }
            });
            stream.on('error', reject);
        });

    } catch (error) {
        throw error;
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Handle nhentai search command
async function handleNhentaiCommand(sock, msg) {
    const config = loadConfig();
    const prefix = config.bot?.prefix || '.';

    // Check access permission
    if (!checkAccess(msg, config)) {
        return; // Silent return for unauthorized users in self mode
    }

    const messageText = msg.message?.conversation || 
                       msg.message?.extendedTextMessage?.text || '';

    const args = messageText.slice(prefix.length).trim().split(' ');

    if (args.length < 2) {
        const helpText = `🔞 NHENTAI SCRAPER ENHANCED

📚 Cara Penggunaan:

🔍 Search & Info:
${prefix}nhentai [code]

📁 Download PDF:
${prefix}nhentai d [code]

🎲 Random Gallery:
${prefix}nhentai random

🏷️ Search by Tag:
${prefix}nhentai tag [tag_name]

💡 Contoh:
${prefix}nhentai 583079
${prefix}nhentai d 583079
${prefix}nhentai random
${prefix}nhentai tag lolicon
${prefix}nhentai tag netorare
${prefix}nhentai tag group

🔐 Login Info:
• Username: ${LOGIN_CREDENTIALS.username}
• Auto-authentication
• Akses private galleries

📋 Fitur Enhanced:
• Info lengkap dengan tag counts
• Download langsung sebagai PDF
• Cover page dengan metadata detail
• Accurate tag extraction
• Multi-format image support
• Rate limiting protection
• Login authentication
• Detailed statistics
• Random gallery discovery
• Tag-based search

🏷️ Popular Tags:
• lolicon, netorare, group
• anal, ahegao, dark skin
• dilf, milf, mind break
• double penetration, etc.

⚠️ Catatan:
• Gunakan code yang valid
• Download membutuhkan waktu
• File PDF langsung siap dibaca
• Support private galleries
• Tag search mencari random gallery dengan tag tersebut

Enhanced nhentai scraper dengan PDF langsung dan tag search!`;

        await Wily(helpText, msg, sock);
        return;
    }

    const subCommand = args[1].toLowerCase();

    if (subCommand === 'random') {
        // Random gallery command
        try {
            const processingText = `🎲 NHENTAI RANDOM DISCOVERY

🔄 Searching Random Gallery...

🎯 Status: Finding random doujin...
🔐 Account: ${LOGIN_CREDENTIALS.username}
🎲 Mode: Random discovery

🔧 Process:
- Login authentication... 🔐
- Random code generation... 🎲
- Gallery validation... ✅
- Enhanced data extraction... 📊
- Image preview selection... 🖼️

⚡ Estimasi: 10-20 detik

Discovering random doujin for you...`;

            await Wily(processingText, msg, sock);

            // Ensure login
            await loginToNhentai();

            // Generate random code (nhentai codes range from 1 to ~500000+)
            let randomCode, galleryInfo;
            let attempts = 0;
            const maxAttempts = 50;

            do {
                randomCode = Math.floor(Math.random() * 500000) + 1;
                galleryInfo = await getNhentaiInfo(randomCode.toString());
                attempts++;
            } while (!galleryInfo.success && attempts < maxAttempts);

            if (!galleryInfo.success) {
                await Wily(`❌ Gagal menemukan gallery random!\n\n🔄 Telah mencoba ${maxAttempts} kali\n💡 Coba lagi beberapa saat\n🔐 Auth: ${axiosInstance ? '✅' : '❌'}`, msg, sock);
                return;
            }

            // Get a random preview image
            let previewImage = null;
            if (galleryInfo.imageUrls && galleryInfo.imageUrls.length > 0) {
                const randomIndex = Math.floor(Math.random() * galleryInfo.imageUrls.length);
                const imageUrl = galleryInfo.imageUrls[randomIndex];
                
                try {
                    const imageResponse = await axiosInstance.get(imageUrl, {
                        responseType: 'arraybuffer',
                        headers: {
                            'Referer': `https://nhentai.net/g/${randomCode}/`,
                            'Accept': 'image/*,*/*;q=0.8'
                        },
                        timeout: 15000
                    });

                    if (imageResponse.data && imageResponse.data.byteLength > 1000) {
                        previewImage = Buffer.from(imageResponse.data);
                    }
                } catch (imageError) {
                    // Silent handling if image fails
                }
            }

            // Format detailed info with improved count display
            const topTags = galleryInfo.tags.slice(0, 5).map(tag => {
                const count = tag.count && tag.count !== '0' && tag.count !== 'N/A' ? ` (${formatCount(tag.count)})` : '';
                return `${tag.name}${count}`;
            }).join(', ');
            
            const allTags = galleryInfo.tags.slice(0, 10).map(tag => {
                const count = tag.count && tag.count !== '0' && tag.count !== 'N/A' ? ` (${formatCount(tag.count)})` : '';
                return `• ${tag.name}${count}`;
            }).join('\n');
            
            const artists = galleryInfo.artists.slice(0, 3).map(artist => {
                const count = artist.count && artist.count !== '0' && artist.count !== 'N/A' ? ` (${artist.count})` : '';
                return `• ${artist.name}${count}`;
            }).join('\n');
            
            const characters = galleryInfo.characters.slice(0, 5).map(char => {
                const count = char.count && char.count !== '0' && char.count !== 'N/A' ? ` (${formatCount(char.count)})` : '';
                return `• ${char.name}${count}`;
            }).join('\n');
            
            const parodies = galleryInfo.parodies.slice(0, 3).map(p => {
                const count = p.count && p.count !== '0' && p.count !== 'N/A' ? ` (${formatCount(p.count)})` : '';
                return `• ${p.name}${count}`;
            }).join('\n');

            const randomInfoText = `🎲 RANDOM NHENTAI DISCOVERY

📖 ${galleryInfo.title}
${galleryInfo.subtitle ? `📝 ${galleryInfo.subtitle}` : ''}

🆔 Code: #${randomCode}
📄 Pages: ${galleryInfo.pages}
📅 Uploaded: ${galleryInfo.uploadDate}
❤️ Favorites: ${galleryInfo.favorites}
🌐 Language: ${galleryInfo.languages[0]?.name || 'Unknown'} (${formatCount(galleryInfo.languages[0]?.count || '0')})
📂 Category: ${galleryInfo.categories[0]?.name || 'Unknown'} (${formatCount(galleryInfo.categories[0]?.count || '0')})
🎲 Discovery: Random selection

🎭 Parodies:
${parodies || '• Original'}

👥 Characters:
${characters || '• Unknown'}

👨‍🎨 Artists:
${artists || '• Unknown'}

🏷️ Tags:
${allTags}
${galleryInfo.tags.length > 10 ? `• +${galleryInfo.tags.length - 10} more tags...` : ''}

🎯 Top Tags: ${topTags}

📥 Download Commands:
${prefix}nhentai d ${randomCode}
${prefix}nhentai ${randomCode}

🎲 Get Another Random:
${prefix}nhentai random

Random discovery complete! Enjoy your find!`;

            // Send the info with or without preview image
            if (previewImage) {
                await sock.sendMessage(msg.key.remoteJid, {
                    image: previewImage,
                    caption: randomInfoText
                }, { quoted: msg });
            } else {
                await Wily(randomInfoText, msg, sock);
            }

        } catch (error) {
            await Wily(`❌ Random discovery failed!\n\n🔄 Error: ${error.message}\n💡 Try again later\n🔐 Auth mungkin perlu refresh`, msg, sock);
        }

    } else if (subCommand === 'tag' && args.length >= 3) {
        // Tag search command
        const tagName = args.slice(2).join(' ').toLowerCase().trim();

        if (!tagName || tagName.length < 2) {
            await Wily(`❌ Tag tidak valid!\n\n💡 Contoh penggunaan:\n${prefix}nhentai tag lolicon\n${prefix}nhentai tag netorare\n${prefix}nhentai tag group\n${prefix}nhentai tag anal`, msg, sock);
            return;
        }

        try {
            const processingText = `🔍 NHENTAI TAG SEARCH

🎯 Searching for tag: "${tagName}"

🔄 Process:
- Login authentication... 🔐
- Tag search execution... 🔍
- Gallery validation... ✅
- Random selection... 🎲
- Data extraction... 📊

⚡ Estimasi: 15-30 detik

Searching galleries with your desired tag...`;

            await Wily(processingText, msg, sock);

            // Ensure login
            await loginToNhentai();

            // Search for galleries with the specified tag
            let foundGallery = null;
            let attempts = 0;
            const maxAttempts = 100;

            // Try different search strategies
            const searchStrategies = [
                () => Math.floor(Math.random() * 400000) + 50000, // Recent galleries
                () => Math.floor(Math.random() * 200000) + 100000, // Mid-range
                () => Math.floor(Math.random() * 500000) + 1, // Full range
            ];

            for (const strategy of searchStrategies) {
                if (foundGallery) break;

                for (let i = 0; i < 30 && attempts < maxAttempts; i++) {
                    attempts++;
                    const randomCode = strategy();
                    const galleryInfo = await getNhentaiInfo(randomCode.toString());

                    if (galleryInfo.success && galleryInfo.tags) {
                        // Check if any tag matches our search
                        const hasTag = galleryInfo.tags.some(tag => 
                            tag.name.toLowerCase().includes(tagName) || 
                            tagName.includes(tag.name.toLowerCase())
                        );

                        if (hasTag) {
                            foundGallery = { ...galleryInfo, code: randomCode };
                            break;
                        }
                    }

                    // Small delay to avoid overwhelming the server
                    if (i % 10 === 0) {
                        await new Promise(resolve => setTimeout(resolve, 500));
                    }
                }
            }

            if (!foundGallery) {
                await Wily(`❌ Tidak ditemukan gallery dengan tag "${tagName}"!\n\n🔄 Telah mencoba ${attempts} galleries\n💡 Coba tag yang lebih umum seperti:\n• group\n• anal\n• netorare\n• lolicon\n• ahegao\n• dark skin\n\n🎲 Atau gunakan: ${prefix}nhentai random`, msg, sock);
                return;
            }

            // Get a random preview image
            let previewImage = null;
            if (foundGallery.imageUrls && foundGallery.imageUrls.length > 0) {
                const randomIndex = Math.floor(Math.random() * foundGallery.imageUrls.length);
                const imageUrl = foundGallery.imageUrls[randomIndex];
                
                try {
                    const imageResponse = await axiosInstance.get(imageUrl, {
                        responseType: 'arraybuffer',
                        headers: {
                            'Referer': `https://nhentai.net/g/${foundGallery.code}/`,
                            'Accept': 'image/*,*/*;q=0.8'
                        },
                        timeout: 15000
                    });

                    if (imageResponse.data && imageResponse.data.byteLength > 1000) {
                        previewImage = Buffer.from(imageResponse.data);
                    }
                } catch (imageError) {
                    // Silent handling if image fails
                }
            }

            // Format the result with clean styling
            const matchingTags = foundGallery.tags.filter(tag => 
                tag.name.toLowerCase().includes(tagName) || 
                tagName.includes(tag.name.toLowerCase())
            ).map(tag => `• ${tag.name} (${formatCount(tag.count)})`).join('\n');

            const allTags = foundGallery.tags.slice(0, 8).map(tag => `• ${tag.name} (${formatCount(tag.count)})`).join('\n');
            const artists = foundGallery.artists.slice(0, 3).map(artist => `• ${artist.name} (${artist.count})`).join('\n');
            const characters = foundGallery.characters.slice(0, 5).map(char => `• ${char.name} (${formatCount(char.count)})`).join('\n');
            const parodies = foundGallery.parodies.slice(0, 3).map(p => `• ${p.name} (${formatCount(p.count)})`).join('\n');

            const tagSearchText = `🔍 NHENTAI TAG SEARCH RESULT

🎯 Search Tag: "${tagName}"
✅ Found Match!

📖 ${foundGallery.title}
${foundGallery.subtitle ? `📝 ${foundGallery.subtitle}` : ''}

🆔 Code: #${foundGallery.code}
📄 Pages: ${foundGallery.pages}
📅 Uploaded: ${foundGallery.uploadDate}
❤️ Favorites: ${foundGallery.favorites}
🌐 Language: ${foundGallery.languages[0]?.name || 'Unknown'} (${formatCount(foundGallery.languages[0]?.count || '0')})
📂 Category: ${foundGallery.categories[0]?.name || 'Unknown'} (${formatCount(foundGallery.categories[0]?.count || '0')})

🎯 Matching Tags:
${matchingTags}

🎭 Parodies:
${parodies || '• Original'}

👥 Characters:
${characters || '• Unknown'}

👨‍🎨 Artists:
${artists || '• Unknown'}

🏷️ All Tags:
${allTags}
${foundGallery.tags.length > 8 ? `• +${foundGallery.tags.length - 8} more tags...` : ''}

📥 Download Commands:
${prefix}nhentai d ${foundGallery.code}
${prefix}nhentai ${foundGallery.code}

🔍 Search More Tags:
${prefix}nhentai tag [tag_name]

Tag search successful! Found gallery with "${tagName}" tag!`;

            // Send the result with or without preview image
            if (previewImage) {
                await sock.sendMessage(msg.key.remoteJid, {
                    image: previewImage,
                    caption: tagSearchText
                }, { quoted: msg });
            } else {
                await Wily(tagSearchText, msg, sock);
            }

        } catch (error) {
            await Wily(`❌ Tag search failed!\n\n🔄 Error: ${error.message}\n💡 Try again with different tag\n🔐 Auth mungkin perlu refresh`, msg, sock);
        }

    } else if (subCommand === 'd' && args.length >= 3) {
        // Download command
        const code = args[2];

        if (!/^\d+$/.test(code)) {
            await Wily(`❌ *Code tidak valid!*\n\n💡 Gunakan angka saja\nContoh: ${prefix}nhentai d 583079`, msg, sock);
            return;
        }

        const processingText = `
╭━━━『 📥 NHENTAI SPEED DOWNLOAD 』━━━❀
┃ 
┃ 🔄 *Processing Download...*
┃ 
┃ 📖 Code: #${code}
┃ ⏳ Status: Authenticating...
┃ 📁 Format: PDF langsung
┃ 🔐 Account: ${LOGIN_CREDENTIALS.username}
┃ 
┃ 🚀 *Speed Optimized Process:*
┃ ▫️ Login authentication... 🔐
┃ ▫️ Fast data extraction... ⚡
┃ ▫️ Concurrent downloads (4x)... 📸
┃ ▫️ Optimized image processing... 🎯
┃ ▫️ Quick PDF generation... 📄
┃ ▫️ Direct delivery... 📤
┃ 
┃ ⚡ *Estimasi: 30s-2 menit (DIPERCEPAT)*
┃ 🚀 *4x concurrent downloads untuk kecepatan*
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_Speed optimized scraper - faster downloads!_`;

        await Wily(processingText, msg, sock);

        try {
            // Ensure login
            await loginToNhentai();

            // Get gallery info
            const galleryInfo = await getNhentaiInfo(code);

            if (!galleryInfo.success) {
                await Wily(`❌ *Gagal mengambil info!*\n\n🔄 Error: ${galleryInfo.error}\n💡 Pastikan code valid dan accessible\n🔐 Auth: ${axiosInstance ? 'Active' : 'Failed'}`, msg, sock);
                return;
            }

            if (galleryInfo.imageUrls.length === 0) {
                await Wily(`❌ *Tidak ada gambar ditemukan!*\n\n📖 Code: #${code}\n💡 Gallery mungkin private atau deleted\n\n🔍 *Debug:*\n• Title: ${galleryInfo.title}\n• Media ID: ${galleryInfo.mediaId}\n• Auth: ${axiosInstance ? '✅' : '❌'}`, msg, sock);
                return;
            }

            // Send enhanced progress update
            const topTags = galleryInfo.tags.slice(0, 3).map(tag => `${tag.name} (${formatCount(tag.count)})`).join(', ');
            await Wily(`🔄 *Enhanced Download Started...*\n\n📖 Title: ${galleryInfo.title}\n📄 Pages: ${galleryInfo.pages}\n🎨 Artist: ${galleryInfo.artists[0]?.name || 'Unknown'}\n🏷️ Top Tags: ${topTags}\n📅 Uploaded: ${galleryInfo.uploadDate}\n❤️ Favorites: ${galleryInfo.favorites}\n🔐 Auth: ✅ Active\n\n⏳ Downloading ${galleryInfo.totalPages} images with enhanced scraping...`, msg, sock);

            // Create temp directory
            const tempDir = './temp';
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const pdfPath = path.join(tempDir, `nhentai_${code}_enhanced.pdf`);

            // Setup progress tracking dengan single message edit
            const totalImages = galleryInfo.totalPages;
            let processedImages = 0;
            let lastProgressMsg = null;

            // Helper function untuk progress bar visual
            const generateProgressBar = (percentage) => {
                const totalBlocks = 20;
                const filledBlocks = Math.round((percentage / 100) * totalBlocks);
                const emptyBlocks = totalBlocks - filledBlocks;

                const filled = '█'.repeat(filledBlocks);
                const empty = '░'.repeat(emptyBlocks);

                return `${filled}${empty}`;
            };

            // Kirim pesan progress pertama
            const sendProgressUpdate = async (processed, total, title) => {
                const percentage = Math.round((processed / total) * 100);
                const progressBar = generateProgressBar(percentage);

                const progressText = `📥 *Download Progress: ${percentage}%*\n\n${progressBar} ${percentage}%\n\n📖 ${title}\n⏳ Processing images... (${processed}/${total} gambar)\n🔄 Status: ${processed === total ? 'Selesai!' : 'Downloading...'}`;

                try {
                    if (lastProgressMsg) {
                        // Edit pesan yang sudah ada
                        await sock.sendMessage(msg.key.remoteJid, {
                            text: progressText,
                            edit: lastProgressMsg.key
                        });
                    } else {
                        // Kirim pesan baru dan simpan referensinya
                        lastProgressMsg = await sock.sendMessage(msg.key.remoteJid, {
                            text: progressText
                        }, { quoted: msg });
                    }
                } catch (editError) {
                    // Fallback jika edit gagal, kirim pesan baru
                    await Wily(progressText, msg, sock);
                }
            };

            // Kirim progress awal dengan info kecepatan
            await sendProgressUpdate(0, totalImages, galleryInfo.title);

            const startTime = Date.now();
            let downloadedCount = 0;
            
            // Enhanced progress callback dengan info kecepatan
            const enhancedProgressCallback = async (processed, total, title) => {
                const elapsed = (Date.now() - startTime) / 1000;
                const speed = processed / elapsed;
                const eta = speed > 0 ? Math.round((total - processed) / speed) : 0;
                
                const percentage = Math.round((processed / total) * 100);
                const progressBar = generateProgressBar(percentage);

                const speedText = `📥 *Download Progress: ${percentage}%*\n\n${progressBar} ${percentage}%\n\n📖 ${title}\n⏳ Processing images... (${processed}/${total} gambar)\n⚡ Speed: ${speed.toFixed(1)} img/sec\n🕐 ETA: ${eta}s\n🔄 Status: ${processed === total ? 'Selesai!' : 'Downloading...'}`;

                try {
                    if (lastProgressMsg) {
                        await sock.sendMessage(msg.key.remoteJid, {
                            text: speedText,
                            edit: lastProgressMsg.key
                        });
                    } else {
                        lastProgressMsg = await sock.sendMessage(msg.key.remoteJid, {
                            text: speedText
                        }, { quoted: msg });
                    }
                } catch (editError) {
                    // Fallback jika edit gagal
                    await Wily(speedText, msg, sock);
                }
            };

            try {
                downloadedCount = await createPDFFromImages(galleryInfo, pdfPath, enhancedProgressCallback);

                if (downloadedCount === 0) {
                    await Wily(`❌ *Tidak ada gambar berhasil didownload!*\n\n📖 Code: #${code}\n💡 Semua URL gambar gagal diakses\n\n🔧 Kemungkinan penyebab:\n• Gallery private atau dihapus\n• Rate limiting dari server\n• Maintenance server\n• Format gambar tidak didukung`, msg, sock);
                    return;
                }

            } catch (pdfError) {
                await Wily(`❌ *Error saat membuat PDF!*\n\n🔄 Error: ${pdfError.message}\n💡 Coba lagi dengan code yang berbeda\n\n🛠️ Troubleshooting:\n• Pastikan code valid\n• Cek koneksi internet\n• Server mungkin sedang maintenance`, msg, sock);
                return;
            }

            // Get PDF file size
            const pdfStats = fs.statSync(pdfPath);
            const pdfFileSize = formatFileSize(pdfStats.size);

            // Send PDF file directly
            const topTagsDisplay = galleryInfo.tags.slice(0, 5).map(tag => `${tag.name} (${formatCount(tag.count)})`).join(', ');

            await sock.sendMessage(msg.key.remoteJid, {
                document: fs.readFileSync(pdfPath),
                fileName: `nhentai_${code}_${galleryInfo.title.replace(/[^\w\s]/gi, '').substring(0, 30)}.pdf`,
                mimetype: 'application/pdf',
                caption: `
╭━━━『 ✅ PDF DOWNLOAD COMPLETE 』━━━❀
┃ 
┃ 📖 *${galleryInfo.title}*
┃ 
┃ 👨‍🎨 Artist: ${galleryInfo.artists[0]?.name || 'Unknown'} (${galleryInfo.artists[0]?.count || '0'})
┃ 🏷️ Code: #${code}
┃ 📄 Pages: ${galleryInfo.pages}
┃ 💾 Size: ${pdfFileSize}
┃ 🌐 Language: ${galleryInfo.languages[0]?.name || 'Unknown'} (${formatCount(galleryInfo.languages[0]?.count || '0')})
┃ 📅 Uploaded: ${galleryInfo.uploadDate}
┃ ❤️ Favorites: ${galleryInfo.favorites}
┃ 📥 Downloaded: ${downloadedCount}/${galleryInfo.totalPages} images
┃ 🔐 Auth: ✅ ${LOGIN_CREDENTIALS.username}
┃ 
┃ 📱 *PDF Features:*
┃ • High-quality images
┃ • Detailed cover page
┃ • Complete gallery info
┃ • Tag statistics included
┃ 
┃ 🎯 *Top Tags:* ${topTagsDisplay}
┃ 
╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❀

_PDF langsung siap dibaca! Buka dengan PDF reader favorit Anda._`
            }, { quoted: msg });

            // Cleanup
            try {
                fs.unlinkSync(pdfPath);
            } catch (cleanupError) {
                // Ignore cleanup errors
            }

        } catch (error) {
            await Wily(`❌ *Enhanced download failed!*\n\n🔄 Error: ${error.message}\n💡 Try again later or use different code\n\n🛠️ *Troubleshooting:*\n• Ensure code is valid\n• Check internet connection\n• Login might need refresh\n• Try test with known working code`, msg, sock);
        }

    } else {
        // Enhanced info command
        const code = subCommand;

        if (!/^\d+$/.test(code)) {
            await Wily(`❌ *Code tidak valid!*\n\n💡 Gunakan angka saja\nContoh: ${prefix}nhentai 583079`, msg, sock);
            return;
        }

        try {
            const processingText = `🔍 *Enhanced nhentai info extraction...*\n\n📖 Code: #${code}\n⏳ Mohon tunggu...\n🔐 Auth: ${LOGIN_CREDENTIALS.username}\n🎯 Enhanced scraping dengan tag counts`;
            await Wily(processingText, msg, sock);

            // Ensure login
            await loginToNhentai();

            const galleryInfo = await getNhentaiInfo(code);

            if (!galleryInfo.success) {
                await Wily(`❌ *Gagal mengambil info!*\n\n🔄 Error: ${galleryInfo.error}\n💡 Pastikan code valid\n🔐 Auth: ${axiosInstance ? '✅' : '❌'}`, msg, sock);
                return;
            }

            // Format enhanced info text with better count display
            const topTags = galleryInfo.tags.slice(0, 8).map(tag => {
                const count = tag.count && tag.count !== '0' && tag.count !== 'N/A' ? ` (${formatCount(tag.count)})` : '';
                return `• ${tag.name}${count}`;
            }).join('\n');
            
            const artists = galleryInfo.artists.slice(0, 3).map(artist => {
                const count = artist.count && artist.count !== '0' && artist.count !== 'N/A' ? ` (${artist.count})` : '';
                return `• ${artist.name}${count}`;
            }).join('\n');
            
            const languages = galleryInfo.languages.slice(0, 2).map(lang => {
                const count = lang.count && lang.count !== '0' && lang.count !== 'N/A' ? ` (${formatCount(lang.count)})` : '';
                return `• ${lang.name}${count}`;
            }).join('\n');

            const infoText = `📚 NHENTAI ENHANCED INFO

📖 ${galleryInfo.title}
${galleryInfo.subtitle ? `📝 ${galleryInfo.subtitle}` : ''}

🆔 Code: #${code}
📄 Pages: ${galleryInfo.pages}
📅 Uploaded: ${galleryInfo.uploadDate}
❤️ Favorites: ${galleryInfo.favorites}
🆔 Media ID: ${galleryInfo.mediaId}
📸 Images Found: ${galleryInfo.totalPages}
🔐 Auth: ✅ ${LOGIN_CREDENTIALS.username}

👨‍🎨 Artists:
${artists}

🏷️ Top Tags:
${topTags}
${galleryInfo.tags.length > 8 ? `• +${galleryInfo.tags.length - 8} more tags...` : ''}

🌐 Languages:
${languages}

📂 Categories:
${galleryInfo.categories.map(cat => `• ${cat.name} (${formatCount(cat.count)})`).join('\n')}

${galleryInfo.parodies[0].name !== 'Original' ? `🎭 Parodies:\n${galleryInfo.parodies.slice(0, 3).map(p => `• ${p.name} (${p.count})`).join('\n')}\n\n` : ''}
${galleryInfo.characters[0].name !== 'Unknown' ? `👥 Characters:\n${galleryInfo.characters.slice(0, 3).map(c => `• ${c.name} (${c.count})`).join('\n')}\n\n` : ''}
📥 Download PDF:
${prefix}nhentai d ${code}

🔍 Search by Tag:
${prefix}nhentai tag [tag_name]

Enhanced info dengan accurate tag counting! Gunakan download untuk mendapatkan PDF langsung!`;

            await Wily(infoText, msg, sock);

        } catch (error) {
            await Wily(`❌ *Gagal mengambil enhanced info!*\n\n🔄 Error: ${error.message}\n💡 Try again later\n🔐 Auth mungkin perlu refresh`, msg, sock);
        }
    }
}

module.exports = { 
    handleNhentaiCommand
};
