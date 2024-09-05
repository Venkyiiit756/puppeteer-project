const puppeteer = require('puppeteer');

async function getSeatLayout(page, strVenueCode, strParam1) {
    const url = 'https://services-in.bookmyshow.com/doTrans.aspx';
    const formData = new URLSearchParams();
    formData.append('strCommand', 'GETSEATLAYOUT');
    formData.append('strAppCode', 'WEB');
    formData.append('strVenueCode', strVenueCode);
    formData.append('lngTransactionIdentifier', '0');
    formData.append('strParam1', strParam1);
    formData.append('strParam2', 'WEB');
    formData.append('strParam3', '');
    formData.append('strParam4', '');
    formData.append('strParam5', 'Y');
    formData.append('strParam6', '');
    formData.append('strParam7', '');
    formData.append('strParam8', '');
    formData.append('strParam9', '');
    formData.append('strParam10', '');
    formData.append('strFormat', 'json');

    const response = await page.evaluate(async (url, formData) => {
        const headers = {
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-store',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://in.bookmyshow.com',
            'Referer': 'https://in.bookmyshow.com/',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'same-site',
            'User-Agent': navigator.userAgent,
            'X-App-Code': 'WEB',
            'X-Tp-Client-Id': '2405:201:c40b:e088:74bf:7938:4404:70e9'
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: formData,
        });
        return response.json();
    }, url, formData);

    return response.BookMyShow.strData;
}

async function getShowInfo(page, strVenueCode, ssid) {
    const apiUrl = `https://in.bookmyshow.com/serv/getData?cmd=GETSHOWINFOJSON&vid=${strVenueCode}&ssid=${ssid}&format=json`;
    const response = await page.goto(apiUrl);
    const data = await response.json();
    return data.BookMyShow.arrShowInfo;
}

function decryptEncryptedData(encryptedData){
    const encryptionKey = 'kYp3s6v9y$B&E)H+MbQeThWmZq4t7w!z';
    const CryptoJS = require('crypto-js');
    const i = CryptoJS.enc.Base64.parse(encryptedData);
    const a = CryptoJS.enc.Utf8.parse(encryptionKey);
    const o = CryptoJS.lib.WordArray.create(0, 128);
    const decrypted = CryptoJS.AES.decrypt({ciphertext: i}, a, {mode: CryptoJS.mode.CBC, iv: o}).toString(CryptoJS.enc.Utf8);
    return decrypted; 
}

function decode_response(t, arrShowInfo){
    const seat_categories = t.split("||")[0];
    const seats_info = t.split("||")[1];
    const seats_categories_list = seat_categories.split("|");

    const allRows = seats_info.split("|");
    const seatsMap = new Map();
    const pricesMap = new Map();
    const bookedMap = new Map();

    for (let i = 0; i < allRows.length; i++) {
        let currRow = allRows[i];
        let currRowSeats = currRow.split(":");
        const currRowName = currRowSeats[1];
        currRowSeats = currRowSeats.slice(2, currRowSeats.length);
        const excludedSubstrings = ["000"];
        let filteredSeatNumbers = currRowSeats.filter(seatNumber => excludedSubstrings.every(substring => !seatNumber.includes(substring)));

        if(currRowName && currRowName !== "" && currRowName !== "-"){
            const currRowCategory = filteredSeatNumbers[0][0];
            filteredSeatNumbers = filteredSeatNumbers.filter(seatNumber => (currRowCategory + "0+0") !== seatNumber);

            if (!seatsMap.has(currRowCategory)) {
                seatsMap.set(currRowCategory, 0);
                bookedMap.set(currRowCategory, 0);
            }

            const bookedSeats = filteredSeatNumbers.filter(seatNumber => {
                const seatType = seatNumber[1];
                return ['2', '3', '9'].includes(seatType);
            }).length;

            let numSeats = seatsMap.get(currRowCategory) + filteredSeatNumbers.length;
            let bookedCount = bookedMap.get(currRowCategory) + bookedSeats;
            seatsMap.set(currRowCategory, numSeats);
            bookedMap.set(currRowCategory, bookedCount);
        }
    }

    for(let i = 0; i < seats_categories_list.length; i++){
        const curr_data = seats_categories_list[i].split(":");
        const currCategory = curr_data[1];
        const currCatCode = curr_data[2];
        const foundObject = arrShowInfo.find(obj => obj.AreaCatCode == currCatCode);
        const price = foundObject ? parseFloat(foundObject.Price) : 200;
        pricesMap.set(currCategory, price);
    }

    let total_tickets = 0;
    let total_gross = 0;
    let booked_tickets = 0;
    let booked_gross = 0;
    const screen_number = arrShowInfo[0].ScreenNum;
    const screen_name = arrShowInfo[0].ScreenName;

    for (const key of seatsMap.keys()) {
        const curr_category_tickets = seatsMap.get(key);
        const curr_category_price = pricesMap.get(key);
        const curr_booked_tickets = bookedMap.get(key);
        const curr_category_gross = curr_category_price * curr_category_tickets;
        const curr_booked_gross = curr_category_price * curr_booked_tickets;

        total_tickets += curr_category_tickets;
        total_gross += curr_category_gross;

        booked_tickets += curr_booked_tickets;
        booked_gross += curr_booked_gross;
    }

    return {total_tickets, total_gross, booked_tickets, booked_gross, screen_name, screen_number};
}

async function processVenueData(page, venueCode, ssid) {
    const strVenueCode = venueCode;
    const strParam1 = ssid;
    const enc_data = await getSeatLayout(page, strVenueCode, strParam1);
    const arrShowInfo = await getShowInfo(page, strVenueCode, strParam1);
    const decryptedData = decryptEncryptedData(enc_data);
    return decode_response(decryptedData, arrShowInfo);
}

async function executeLoop() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.goto('https://in.bookmyshow.com/buytickets/aay-telugu-guntur/movie-gunt-ET00407020-MT/20240902');

    // Wait for the .showtime-pill elements to appear
    await page.waitForSelector('.showtime-pill', { timeout: 10000 });

    // Get venue data
    const venues_data = await page.evaluate(() => {
        const sh_fill_list = document.querySelectorAll(".showtime-pill");
        const venues_data = [];
        sh_fill_list.forEach(pill => {
            const venue = pill.getAttribute("data-venue-code");
            const ssid = pill.getAttribute("data-session-id");
            const showtime = pill.getAttribute("data-showtime-code");
            venues_data.push([venue, ssid, showtime]);
        });
        console.log("Venue data captured:", venues_data);  // Debugging log
        return venues_data;
    });

    // Debug: Check if any venues were captured
    if (venues_data.length === 0) {
        console.log("No venue data found!");
        await browser.close();
        return;
    }

    // Get theatre names
    const theatre_names_map = await page.evaluate(() => {
        const elems = Array.from(document.querySelectorAll('#venuelist li'));
        const map = new Map();
        elems.forEach(elem => {
            map.set(elem.getAttribute("data-id"), elem.getAttribute("data-name"));
        });
        console.log("Theatre names captured:", map);  // Debugging log
        return map;
    });

    let all_data = [];
    for (let i = 0; i < venues_data.length; i++) {
        try {
            console.log(`Iteration ${i + 1} started for ${venues_data[i][0]}.`);
            const each_data = await processVenueData(page, venues_data[i][0], venues_data[i][1]);
            each_data["theatre code"] = venues_data[i][0];
            each_data["show time"] = venues_data[i][2];
            each_data["theatre name"] = theatre_names_map.get(venues_data[i][0]);
            console.log("Captured data for iteration:", each_data);  // Debugging log
            all_data.push(each_data);
            await page.waitForTimeout(5500);
        } catch (error) {
            console.log("Error fetching data for " + venues_data[i][0] + " - " + venues_data[i][1] + ":", error.message);
            await page.waitForTimeout(5500);
        }
    }

    // Print final data
    console.log("Final Data:", all_data);

    await browser.close();
    console.log("Browser closed.");
}

executeLoop().catch(console.error);
