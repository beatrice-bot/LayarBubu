const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://womeniniran.org';

exports.handler = async function (event, context) {
    const { url, search } = event.queryStringParameters;
    try {
        let data;
        if (search) {
            data = await scrapeSearchPage(search);
        } else if (url) {
            data = await scrapeMoviePage(url);
        } else {
            // Aksi default: scrape halaman utama
            data = await scrapeHomePage();
        }
        return { statusCode: 200, body: JSON.stringify(data) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};

// ===== FUNGSI INI DIPERBARUI TOTAL =====
async function scrapeHomePage() {
    const { data } = await axios.get(BASE_URL);
    const $ = cheerio.load(data);
    const trendingMovies = [];
    const popularSeries = [];

    // Mengambil data dari bagian "SEDANG TRENDING HARI INI"
    $('#muvipro-posts-5 .gmr-item-modulepost').each((i, el) => {
        const element = $(el);
        const link = element.find('a').attr('href');
        const title = element.find('h2.entry-title a').text();
        const thumbnail = element.find('img').attr('src');
        if (title && link) {
            trendingMovies.push({ title, link, thumbnail });
        }
    });

    // Mengambil data dari bagian "SERIAL TV TERPOPULER"
    $('#muvipro-posts-7 .gmr-item-modulepost').each((i, el) => {
        const element = $(el);
        const link = element.find('a').attr('href');
        const title = element.find('h2.entry-title a').text();
        const thumbnail = element.find('img').attr('src');
        if (title && link) {
            popularSeries.push({ title, link, thumbnail });
        }
    });

    return { type: 'homepage', trendingMovies, popularSeries };
}

// --- FUNGSI LAINNYA TIDAK BERUBAH ---
async function scrapeSearchPage(query) {
    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}&post_type[]=post&post_type[]=tv`;
    const { data } = await axios.get(searchUrl);
    const $ = cheerio.load(data);
    const results = [];
    $('article.item-infinite').each((i, el) => {
        const element = $(el);
        const link = element.find('h2.entry-title a').attr('href');
        const title = element.find('h2.entry-title a').text();
        const thumbnail = element.find('img').attr('src');
        if (title && link) {
            results.push({ title, link, thumbnail });
        }
    });
    return { type: 'search', query, results };
}

async function scrapeMoviePage(url) {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const title = $('h1.entry-title').text();
    const thumbnail = $('.gmr-movie-data .pull-left img').attr('src');
    let videoFrame = null;
    $('iframe').each((i, el) => {
        const src = $(el).attr('src');
        if (src && !src.includes('youtube.com') && !src.includes('imdb.com')) {
            videoFrame = src;
            return false;
        }
    });
    return { type: 'moviePage', title, thumbnail, videoFrame };
}
