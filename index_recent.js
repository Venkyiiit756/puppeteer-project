const puppeteer = require("puppeteer");

// Configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY = 3000;
const MAX_CONCURRENCY = 1; // Control the number of simultaneous tasks

const urls = [
"https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B14%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aacbt&dfam=webbrowser&showtimehashcode=v2-425baff74e77b5c7c460b6d84edd8aeaf5ee222cdc99c9ae21106ec5bf5ef384",
"https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B18%3A15&from=mov_det_showtimes&source=desktop&mid=155562&tid=aacbt&dfam=webbrowser&showtimehashcode=v2-fe273f0ecac6195bfc16112af78f3a49ab06813baef3a9bf7010f1f1580770a4",
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// List to store the extracted data
const theaterDataList = [];

let captureCount = 0;

const checkSeatForUrl = async (url, browser, retries = MAX_RETRIES, delay = INITIAL_DELAY) => {
    console.log(`Navigating to URL: ${url} (Attempt ${MAX_RETRIES - retries + 1})`);
    const page = await browser.newPage();

    await page.setUserAgent("Mozilla/5.0...");
    await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

    // Listen for network responses
    page.on('response', async (response) => {
        const apiUrl = response.url();
        if (apiUrl.includes('showtimes/v2')) {
            captureCount++;
            console.log(`Found 'seat-map' API URL: ${captureCount}- ${apiUrl}`);

        // Check if the response is a redirect
        if (response.status() >= 300 && response.status() < 400) {
            console.log(`The response is a redirect. Skipping response body.`);
            return;
        }

            try {
                const responseText = await response.text();
                const jsonResponse = JSON.parse(responseText);

                console.log(`response length - ${responseText.length}`)

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

            } catch (err) {
                console.error(`Error reading response text: ${err.message}`);
            }
        }
    });

    try {
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        if (response && response.status() === 200) {
            console.log(`Successfully accessed ${url}`);
            await page.waitForTimeout(5000); // Wait for 5 seconds to ensure network responses are captured
        } else {
            console.log(`Failed to access ${url}. Status: ${response ? response.status() : "No response"}`);
            throw new Error("Non-200 status code or no response.");
        }
    } catch (error) {
        console.error(`Error accessing ${url}: ${error.message}`);
        if (retries > 0) {
            console.log(`Retrying ${url} in ${delay / 1000} seconds...`);
            await sleep(delay); // Wait before retrying
            return checkSeatForUrl(url, browser, retries - 1, delay * 2); // Retry with exponential backoff
        } else {
            console.error(`Failed after ${MAX_RETRIES} retries: ${url}`);
        }
    } finally {
        await page.close();
    }
};

const checkSeats = async () => {
    try {
        console.log("Launching browser...");
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        // Manage concurrency manually
        const promises = [];
        for (let i = 0; i < urls.length; i += MAX_CONCURRENCY) {
            const chunk = urls.slice(i, i + MAX_CONCURRENCY).map((url) => checkSeatForUrl(url, browser));
            promises.push(...chunk);
            await Promise.all(promises); // Wait for the current chunk to finish
        }

        console.log("Closing browser...");
        await browser.close();

        // Print the extracted theater data list
        console.log(JSON.stringify(theaterDataList, null, 2));
    } catch (err) {
        console.error(`Error during Puppeteer execution: ${err.message}`);
    }
};

checkSeats();