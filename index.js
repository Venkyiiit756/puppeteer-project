const puppeteer = require("puppeteer");

const urls = [
    "https://tickets.fandango.com/mobileexpress/seatselection?row_count=465048043&mid=155562&chainCode=CNMK&sdate=2024-09-01+21%3A30&tid=aaudu&route=map-seat-map",
    // Add more URLs here
];

const checkSeats = async () => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();

    for (const url of urls) {
        await page.goto(url, { waitUntil: "networkidle2" });

        const count = await page.evaluate(() => {
            let count = 0;
            const divs = document.getElementsByTagName("div");
            for (let i = 0; i < divs.length; i++) {
                if (
                    divs[i].classList.contains("seat-map__seat") &&
                    divs[i].classList.contains("dark__section") &&
                    divs[i].classList.contains("reservedSeat")
                ) {
                    count++;
                }
            }
            return count;
        });

        console.log(`URL: ${url} - Count of matching divs: ${count}`);
    }

    await browser.close();
};

checkSeats();
