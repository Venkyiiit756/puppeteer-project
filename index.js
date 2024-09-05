const puppeteer = require('puppeteer');

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

async function scrapeWithRetry() {
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log(`Attempt ${attempt}: Starting browser...`);
            const browser = await puppeteer.launch({
                headless: "new",  // Use the new headless mode
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            const page = await browser.newPage();

            await page.setUserAgent("Mozilla/5.0...");
            await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

            console.log('Navigating to page...');
            await page.goto('https://in.bookmyshow.com/buytickets/gabbar-singh-telugu-kakinada/movie-kaki-ET00007159-MT/20240902', { 
                //https://in.bookmyshow.com/buytickets/gabbar-singh-telugu-vijayawada/movie-vija-ET00007159-MT/20240902#!seatlayout
                waitUntil: 'networkidle0',
                timeout: 60000  // Increase timeout to 60 seconds
            });

            console.log('Waiting for selector...');
            await page.waitForSelector('li.list', { timeout: 30000 });

            console.log('Extracting showtimes...');
            const showtimes = await page.evaluate(() => {
                let results = [];
                // Select all venue containers with the class 'list'
                let venueContainers = document.querySelectorAll('li.list');

                // Iterate through each venue container to extract showtimes marked as "_filling" or "_sold"
                venueContainers.forEach(venue => {
                    let venueName = venue.getAttribute('data-name'); // Get the venue name from the 'data-name' attribute
                    let fillingShows = venue.querySelectorAll('.showtime-pill-container._filling, .showtime-pill-container._sold'); // Select all filling or sold out shows for this venue

                    fillingShows.forEach(show => {
                        let showtime = show.querySelector('.showtime-pill').getAttribute('data-display-showtime');
                        let availability = show.classList.contains('_filling') ? 'Filling Fast' : 'Sold Out';

                        // Only log if showtime is not null or empty
                        if (showtime) {
                            results.push(`${venueName}, ${showtime}: ${availability}`);
                        }
                    });
                });
                return results;
            });

            if (showtimes && showtimes.length > 0) {
                console.log('Showtimes found:');
                console.log(showtimes.join('\n'));
            } else {
                console.warn('No showtimes found or data is empty.');
            }

            await browser.close();
            return;  // Successful execution, exit the function
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error.message);
            if (attempt === MAX_RETRIES) {
                console.error('All retry attempts failed.');
                throw error;  // Re-throw the error if all retries fail
            }
            console.log('Retrying in 5 seconds...');
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }
    }
}

scrapeWithRetry().catch(error => {
    console.error('Scraping failed:', error);
    process.exit(1);
});
