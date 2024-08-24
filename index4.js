const puppeteer = require("puppeteer");
const fs = require("fs").promises; // Use the File System module to save the JSON data

// Initialize an empty list to store the seat map data
let seatInfoList = [];

// Configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY = 3000; // Start with a 3-second delay
const MAX_CONCURRENT_TASKS = 4; // Limit number of concurrent requests

const urls = [
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B14%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aacbt&dfam=webbrowser&showtimehashcode=v2-425baff74e77b5c7c460b6d84edd8aeaf5ee222cdc99c9ae21106ec5bf5ef384",
    //"https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B18%3A15&from=mov_det_showtimes&source=desktop&mid=155562&tid=aacbt&dfam=webbrowser&showtimehashcode=v2-fe273f0ecac6195bfc16112af78f3a49ab06813baef3a9bf7010f1f1580770a4",
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const checkSeatForUrl = async (url, browser, retries = MAX_RETRIES, delay = INITIAL_DELAY) => {
    console.log(`Navigating to URL: ${url}`);
    const page = await browser.newPage();

    await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );
    await page.setViewport({
        width: 1280,
        height: 800,
        deviceScaleFactor: 1,
    });

    let count = 0;
    try {
        // Listen for network responses and log any that contain 'showtimes'
        page.on('response', async (response) => {
            const apiUrl = response.url();
            if (apiUrl.includes('showtimes')) {
                count++;
                console.log(`'Showtimes' API found: ${count} - ${apiUrl}`);

                try {
                    // Log the raw response to inspect
                    const responseText = await response.text();
                    console.log(`Raw Response from ${apiUrl}: ${responseText}`);
        
                    // Now check if the response is JSON
                    const contentType = response.headers()['content-type'];
                    if (contentType && contentType.includes('application/json')) {
                        const jsonResponse = JSON.parse(responseText); // Safely parse after inspecting
                        const seatData = jsonResponse.data;
        
                        if (seatData && seatData.showtimeId && seatData.totalAvailableSeatCount && seatData.totalSeatCount) {
                            const extractedSeatData = {
                                showtimeId: seatData.showtimeId,
                                totalAvailableSeatCount: seatData.totalAvailableSeatCount,
                                totalSeatCount: seatData.totalSeatCount,
                                theaterName: seatData.theaterName
                            };
        
                            const ticketInfo = seatData.areas[0]?.ticketInfo ? seatData.areas[0].ticketInfo.find(ticket => ticket.code === "AD") : null;
                            if (ticketInfo) {
                                extractedSeatData.ticketPriceInfo = {
                                    price: ticketInfo.price,
                                    fee: ticketInfo.fee,
                                    reservedSeating: ticketInfo.reservedSeating
                                };
                            }
        
                            console.log(`Extracted Seat Data: ${JSON.stringify(extractedSeatData, null, 2)}`);
                            seatInfoList.push(extractedSeatData);
                        } else {
                            console.warn("Missing required fields in the API response.");
                        }
                    } else {
                        console.warn(`Response is not JSON: ${apiUrl}`);
                    }
                } catch (err) {
                    console.error(`Error parsing response from ${apiUrl}: ${err.message}`);
                }
            }
        else {
            //console.log("showtime api ==========> not found")
        }
        });
        

        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

        if (response && response.status() === 200) {
            console.log(`Successfully accessed ${url}`);
            await page.waitForTimeout(30000); // Wait for 30 seconds to ensure APIs are triggered
        } else {
            console.log(`Failed to access ${url}. Status: ${response ? response.status() : "No response"}`);
            throw new Error("Non-200 status code");
        }

    } catch (error) {
        console.error(`Error accessing ${url}: ${error.message}`);
        if (retries > 0) {
            console.log(`Retrying ${url} in ${delay / 1000} seconds... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
            await sleep(delay);
            return checkSeatForUrl(url, browser, retries - 1, delay * 2); // Exponential backoff
        } else {
            console.error(`Failed after ${MAX_RETRIES} retries: ${url}`);
        }
    } finally {
        await page.close();
    }
};

const saveSeatInfoToFile = async (filename, data) => {
    try {
        // Convert the data to JSON string and write it to a file
        await fs.writeFile(filename, JSON.stringify(data, null, 2));
        console.log(`Seat map data successfully saved to ${filename}`);
    } catch (err) {
        console.error(`Error saving seat data to file: ${err.message}`);
    }
};

const checkSeats = async () => {
    try {
        console.log("Launching browser...");
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        // Limit concurrent tasks
        const taskQueue = [];
        for (let i = 0; i < urls.length; i += MAX_CONCURRENT_TASKS) {
            const batch = urls.slice(i, i + MAX_CONCURRENT_TASKS).map(url => checkSeatForUrl(url, browser));
            taskQueue.push(...batch);
            await Promise.all(batch); // Wait for the current batch to finish
        }


        // Print the seatInfoList for debugging
        console.log(seatInfoList);

        // Save the collected seat map data to a file
        await saveSeatInfoToFile("seatMapData.json", seatInfoList);

        console.log("Closing browser...");
        await browser.close();
    } catch (err) {
        console.error(`Error during Puppeteer execution: ${err.message}`);
    }
};

checkSeats();
