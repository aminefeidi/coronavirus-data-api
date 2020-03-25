const https = require("https");
const http = require("http");
const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const moment = require("moment");
const PORT = process.env.PORT || 3000;
const parse = require("./parser");
const userCountry = require("./utils/userCountry");
const notifier = require("./notifier");
const dotenv = require("dotenv");

dotenv.config();
console.time("bootstrapped");
const sourceUrl =
    "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-";
let fileNames = ["Confirmed.csv", "Recovered.csv", "Deaths.csv"];
let lastUpdated;

let finalData = {};
let tempData = {};

let app = express();
app.use(cors());
app.use(bodyParser.json());
//app.use(express.static(path.join(__dirname,'browser')));

(async () => {
    try {
        finalData = await getAll(fileNames);
        console.timeEnd("bootstrapped");
        lastUpdated = new Date();
    } catch (error) {
        throw error;
    }
    // Updates source csv files once every *
    setInterval(async () => {
        try {
            tempData = finalData;
            finalData = await getAll(fileNames);
            console.timeEnd("bootstrapped");
            lastUpdated = new Date();
        } catch (error) {
            finalData = tempData;
            console.log("using fallBack data...");
            console.log(error);
        }
    }, 3600000 / 2);

    app.post("/api/subscribe", (req, res) => {
        notifier
            .add(req.body)
            .then(() => res.sendStatus(200))
            .catch(err => {
                console.log(err);
                res.sendStatus(500);
            });
    });

    app.get("/api/sendAll", async (req, res) => {
        try {
            let response = await notifier.send(finalData)
            console.log("Notifications sent");
            res.sendStatus(200);
        } catch (error) {
            console.log("error in notify module:", error)
            res.sendStatus(500);
        }
    });

    app.get("/api/all", (req, res) => {
        res.json(finalData.data);
    });

    app.get("/api/global", (req, res) => {
        res.json(finalData.global);
    });

    app.get("/api/country/:id", (req, res) => {
        let id = Number(req.params.id);
        if (id < 1 || id > finalData.data.length) res.status(404);
        res.json(finalData.data[id - 1]);
    });

    app.get("/api/userCountry/:ip", (req, res) => {
        let ip = req.params.ip;
        userCountry(ip)
            .then(json => res.json(json))
            .catch(err => {
                res.sendStatus(500);
            });
    });

    app.get("/api/countries", (req, res) => {
        res.json(finalData.countries);
    });

    app.get("/api/lastUpdate", (req, res) => {
        let now = moment();
        res.json(now.diff(lastUpdated));
    });

    app.get("/api/geoJson", (req, res) => {
        res.json(finalData.geoJson);
    });

    app.listen(PORT, () =>
        console.log(`express server is running on port ${PORT}`)
    );
})();

function getSource(url, n) {
    return new Promise((resolve, reject) => {
        https.get(url + n, res => {
            if (res.statusCode == 200) {
                if (fs.existsSync("./source/" + n))
                    fs.unlinkSync("./source/" + n);
                let temp = fs.createWriteStream("./source/" + n);
                res.pipe(temp);
                res.on("end", () => resolve());
            } else {
                reject(res.statusMessage);
            }
        });
    });
}

async function getAll(fileNames) {
    if (!process.env.dev) {
        let requests = [];
        fileNames.forEach(name => {
            requests.push(getSource(sourceUrl, name));
        });
        try {
            await Promise.all(requests);
        } catch (error) {
            console.log("error in getSource()");
            throw error;
        }
    }
    let parsedData;
    try {
        parsedData = await parse(fileNames);
    } catch (error) {
        throw error;
    }
    return parsedData;
}
