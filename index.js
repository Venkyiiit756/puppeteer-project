const puppeteer = require("puppeteer");

// Configuration
const PAGE_LOAD_TIMEOUT = 30000; // 30 seconds
const API_WAIT_TIMEOUT = 3000; // 5 seconds

const urls = [
     "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B14%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aacbt&dfam=webbrowser&showtimehashcode=v2-425baff74e77b5c7c460b6d84edd8aeaf5ee222cdc99c9ae21106ec5bf5ef384"
];

// List to store the theater data
const theaterDataList = [];

// failurlstore varaible to store the fail url
let failUrlStore;

// fail url list
const failUrlList = [];

//process the response url data
async function processResponseUrlData(responseText, page) {
    // Check if length of response is less than 1000
    if (responseText.length < 1000) {
        console.warn(`response length (fail) - ${responseText.length}`)
        //conver the page url into string and push it to failUrlList
        failUrlList.push(failUrlStore);
        return;
    }

    // Parse the JSON response
    const jsonResponse = JSON.parse(responseText);
    console.log(`response length (success) - ${responseText.length}`)

    // Extract the required fields
    const theaterInfo = {
        theaterId: jsonResponse.data.theaterId,
        theaterName: jsonResponse.data.theaterName,
        showtimeId: jsonResponse.data.showtimeId,
        chainCode: jsonResponse.data.chainCode,
        tmsId: jsonResponse.data.tmsId,
        auditoriumId: jsonResponse.data.auditoriumId,
        totalAvailableSeatCount: jsonResponse.data.totalAvailableSeatCount,
        totalSeatCount: jsonResponse.data.totalSeatCount,
        price: jsonResponse.data.areas[0]?.ticketInfo[0]?.price || "N/A"
    };
    // Append to the list
    theaterDataList.push(theaterInfo);   
}

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

redirectFlag = false;

async function logFilteredNetworkRequests(page, apiUrlPartial) {
    log(`Intercepting only URLs containing '${apiUrlPartial}'`);

    // Listen to all request events and filter the ones containing 'showtimes/v2'
    page.on('request', request => {
        if (request.url().includes(apiUrlPartial)) {
            log(`Request URL containing '${apiUrlPartial}': ${request.url()}`);
            //print the request headers
            console.log(`Request Headers: ${JSON.stringify(request.headers())}`);

        }
    });

    // Listen to all response events and filter the ones containing 'showtimes/v2'
    page.on('response', async response => {
        if (response.url().includes(apiUrlPartial)) {
            log(`Response URL containing '${apiUrlPartial}': ${response.url()}`);

            // print the response headers
            console.log(`Response Headers: ${JSON.stringify(response.headers())}`);

            // Handle redirection scenarios
            if (response.status() === 302 || response.status() === 301) {
                //log(`Redirected response for '${response.url()}'`);
                redirectFlag = true;
                return;

            } else {
                try {
                    const responseText = await response.text();
                    log(`Response content for '${response.url()}':\n${responseText.substring(0, 500)}...`); // Print first 500 characters for brevity
                    await processResponseUrlData(responseText, page);

                } catch (error) {
                    log(`Error reading response content: ${error.message}`);
                }
            }
        }
    });
}

async function checkSeatForUrl(url, browser) {
    const page = await browser.newPage();
    log(`New page created for ${url}`);

    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

    // Log only URLs containing 'showtimes/v2'
    logFilteredNetworkRequests(page, 'showtimes/v2');

    try {
        log(`Navigating to ${url}`);
        await page.goto(url, { waitUntil: "networkidle2", timeout: PAGE_LOAD_TIMEOUT });
        log(`Successfully accessed ${url}`);
    } catch (error) {
        log(`Error processing ${url}: ${error.message}`);
    } finally {
        await page.close();
        log(`Page closed for ${url}`);
    }
}

async function checkSeats() {
    log('Starting seat checking process');
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    log('Browser launched');

    try {
        for (let url of urls) {
            failUrlStore = url;
            await checkSeatForUrl(url, browser);
        }
    } finally {
        await browser.close();
        log('Browser closed');
    }

    log('Seat checking process completed');
    log(`Theater data list: ${JSON.stringify(theaterDataList)}`);

    // Print the fail url list
    console.log(`Fail URL List: ${failUrlList}`);
}

checkSeats().catch(error => {
    log(`Fatal error: ${error.message}`);
    console.error(error);
});
