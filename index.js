const puppeteer = require("puppeteer");

// Initialize an empty list to store the data for each URL
let seatInfoList = [];

// Configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY = 2000; // Start with a 2-second delay
const MAX_CONCURRENT_TASKS = 5; // Limit number of concurrent requests

const urls = [
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B14%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aacbt&dfam=webbrowser&showtimehashcode=v2-425baff74e77b5c7c460b6d84edd8aeaf5ee222cdc99c9ae21106ec5bf5ef384",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B18%3A15&from=mov_det_showtimes&source=desktop&mid=155562&tid=aacbt&dfam=webbrowser&showtimehashcode=v2-fe273f0ecac6195bfc16112af78f3a49ab06813baef3a9bf7010f1f1580770a4",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B21%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aacbt&dfam=webbrowser&showtimehashcode=v2-728fb11f5b2cff5507a5c43326a9d71c88a15770d2a72b04760ccccf6b9f8401",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B14%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aacbz&dfam=webbrowser&showtimehashcode=v2-e15131edb5375ece2c905cb14177bc480c7fc807dbc35fee100620933dcee80a",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B18%3A00&from=mov_det_showtimes&source=desktop&mid=155562&tid=aacbz&dfam=webbrowser&showtimehashcode=v2-a234edd6f527756e4cfc835b5cea941660691f0cd789343940fcba5aa61e4f3a",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B21%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aacbz&dfam=webbrowser&showtimehashcode=v2-8a9eed793f24bafcb6cd7fa54d58c2b9f61f7ffbc7262ff441397d18e3e392e7",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B14%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aaudu&dfam=webbrowser&showtimehashcode=v2-c0e29754f864a5d0a255a2cc331ad714a298a537de888e5e853dceb13b841952",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B18%3A00&from=mov_det_showtimes&source=desktop&mid=155562&tid=aaudu&dfam=webbrowser&showtimehashcode=v2-2ba8b031c7c525bcc2a4c19bc9175347117434b70a3e05a08222af7076237264",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B21%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aaudu&dfam=webbrowser&showtimehashcode=v2-126f3dd431b34ddfb4b1bdba9bf64c758dd58b3a6103ce1c37ec69c9d7aed4a0",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B14%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aacut&dfam=webbrowser&showtimehashcode=v2-cf254e55fe608107865e2255744920a86fe7e2179c04ccacd0bfd6509f0cb099",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B18%3A05&from=mov_det_showtimes&source=desktop&mid=155562&tid=aacut&dfam=webbrowser&showtimehashcode=v2-789508d3c7213bc704707a0dfbc21617e964d916f8c9eed87c6863ad12e390c2",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B21%3A35&from=mov_det_showtimes&source=desktop&mid=155562&tid=aacut&dfam=webbrowser&showtimehashcode=v2-5804f109438c50ed010fa660afca92b3d9e351c17aade6597024752e4d95a29e",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B14%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aacbr&dfam=webbrowser&showtimehashcode=v2-6c03e4c69638e833094444d7ffc2565fa84bf6cb55c3ff946c69086b9077b30c",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B18%3A00&from=mov_det_showtimes&source=desktop&mid=155562&tid=aacbr&dfam=webbrowser&showtimehashcode=v2-4fc0af35efd4cf9027d1c842d3c8fb2d2d7315ae0a8d0e14f4ca63ecbdb4fc29",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B21%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aacbr&dfam=webbrowser&showtimehashcode=v2-701747691b5fab5358893dc6f83a6c2f4453e1f2d97e29b270e28efe2a1eac25",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B14%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aanhh&dfam=webbrowser&showtimehashcode=v2-7dc83ddcfc14e36eabb71cd4b7226002dd6ca5bfb272827d54f5c97bfc9d7b80",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B18%3A00&from=mov_det_showtimes&source=desktop&mid=155562&tid=aanhh&dfam=webbrowser&showtimehashcode=v2-0cacccd9cc00bdc5763012f473ec7dc5374edf12dcc7b121870087f0438a9b1d",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B21%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aanhh&dfam=webbrowser&showtimehashcode=v2-c11902fbe99649d168572dde338b92448169c6f3d90ca702272bdedcbbaf3e8b",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B14%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aatcg&dfam=webbrowser&showtimehashcode=v2-0859c02a901dc3a66a761e29fd101303a89a0d92c13a845a8292247c49cf0b1f",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B18%3A00&from=mov_det_showtimes&source=desktop&mid=155562&tid=aatcg&dfam=webbrowser&showtimehashcode=v2-b1ef6b649119e5eebea2c1902e21cb0be914337b8ad8ccec74e2971d133a06fa",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B21%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aatcg&dfam=webbrowser&showtimehashcode=v2-541cc7f0626135f29b54369e33cc9b27be6b6d91c95ec1c9072df29aadefcb23",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B14%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aawfx&dfam=webbrowser&showtimehashcode=v2-529b22b8defc9f9274d15d4335adbf3b574c01c2d1a666ac7faa947846457c40",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B18%3A00&from=mov_det_showtimes&source=desktop&mid=155562&tid=aawfx&dfam=webbrowser&showtimehashcode=v2-c8389e6b1222244c12a73141a60f685c5d266b445c71387e5e7b2d5ba04ed381",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B21%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aawfx&dfam=webbrowser&showtimehashcode=v2-217b5afdd6ee7fa30d8aa73b95db770876a8bfd58be2ab7c6dcebdc7770835f8",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B14%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aayoy&dfam=webbrowser&showtimehashcode=v2-789e7e33b34995713d4876359fa7a0824dde864e7757361bdef6522bf98c29e3",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B18%3A00&from=mov_det_showtimes&source=desktop&mid=155562&tid=aayoy&dfam=webbrowser&showtimehashcode=v2-509cc3e8811b6de301a28742faf1f66b4262d31e2508d427ac614d44204a171f",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B21%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aayoy&dfam=webbrowser&showtimehashcode=v2-043924b6e038d61d98d3f95c8cb10732f7a48b6a39d6b5ed4231007908f2a559",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B14%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aatfb&dfam=webbrowser&showtimehashcode=v2-fa83bdc342833e841765cea81a7dcd2c2faae051abcdf73b00a30eecc3ae0660",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B18%3A00&from=mov_det_showtimes&source=desktop&mid=155562&tid=aatfb&dfam=webbrowser&showtimehashcode=v2-a8f887e2a695dd11afc0d707747a3a618a5d40242d2400b5bc6bd2a6cff40bf3",
    "https://tickets.fandango.com/transaction/ticketing/mobile/jump.aspx?sdate=2024-09-01%2B21%3A30&from=mov_det_showtimes&source=desktop&mid=155562&tid=aatfb&dfam=webbrowser&showtimehashcode=v2-ebda4bdbcb6b145a4817d17ca197e94e03b3f1d05fee56496a410b0234fb6628"    
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

    try {
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

        if (response && response.status() === 200) {
            console.log(`Successfully accessed ${url}`);
            await page.waitForTimeout(30000);

            const ariaLiveSMFContent = await page.evaluate(() => {
                const ariaLiveDiv = document.getElementById("AriaLiveSMF");
                return ariaLiveDiv ? ariaLiveDiv.innerText.trim() : "Content not found";
            });
            console.log(`Content of #AriaLiveSMF for ${url}: ${ariaLiveSMFContent}`);
            // Check if the string contains "You are now on the seat"
            if (ariaLiveSMFContent.includes("You are now on the seat")) {
                // Extract the available seats and total seats using regex
                let seatInfoRegex = /There are (\d+) out of (\d+) seats available/;
                let matches = ariaLiveSMFContent.match(seatInfoRegex);

                if (matches && matches.length === 3) {
                    let availableSeats = parseInt(matches[1]);
                    let totalSeats = parseInt(matches[2]);

                    // Append data as a dictionary entry to the list
                    seatInfoList.push({
                        url: url,
                        availableSeats: availableSeats,
                        totalSeats: totalSeats
                    });
                }
            }

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

        // Before closing the browser, print the list of dictionaries
        console.log(seatInfoList);

        console.log("Closing browser...");
        await browser.close();
    } catch (err) {
        console.error(`Error during Puppeteer execution: ${err.message}`);
    }
};

checkSeats();