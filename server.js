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
const notify = require("./notify");

console.time("bootstrapped");
const sourceUrl =
    "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-";
let fileNames = ["Confirmed.csv", "Recovered.csv", "Deaths.csv"];
let lastUpdated;

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
    let requests = [];
    fileNames.forEach(name => {
        requests.push(getSource(sourceUrl, name));
    });
    try {
        await Promise.all(requests);
    } catch (error) {
        console.log(error);
    }
    return await parse(fileNames);
}

let finalData = {};
let tempData = {};

getAll(fileNames).then(res => {
    tempData = finalData;
    finalData = res;
    console.timeEnd("bootstrapped");
    lastUpdated = new Date();
}).catch(err=>{
    finalData = tempData;
    console.log(err);
});
// Updates source csv files once every *
setInterval(() => {
    getAll(fileNames).then(res => {
        if (
            res.global.toll != finalData.global.toll ||
            res.global.sick != finalData.global.sick
        ) {
            finalData = res;
            console.log("Data has been updated, changes detected");
            
        }else{
            console.log("Data has been updated, no new changes");
        }
        lastUpdated = new Date();
    });
}, 3600000/2);

let app = express();

app.use(cors());
app.use(bodyParser.json());

// app.use(express.static(path.join(__dirname,'browser')))

app.post("/api/subscribe", (req, res) => {
    notify.add(req.body).then(r=>res.sendStatus(200)).catch(err=>{
        console.log(err);
        res.sendStatus(500);
    })
});

app.get("/api/sendAll",(req,res)=>{
    notify.send('Number of confirmed cases '+finalData.global.toll).then(() => {
        console.log("Notifications sent")
        res.sendStatus(200);
    }).catch(err=>console.log("error in notify module:",err))
})

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
    http.get("http://api.ipstack.com/"+req.params.ip+"?access_key=a191dd5352de08c64c612cd5c401ea5f&format=1",resp=>{
        let body = "";

    resp.on("data", (chunk) => {
        body += chunk;
    });

    resp.on("end", () => {
        try {
            let json = JSON.parse(body);
            res.json(json);
        } catch (error) {
            console.error(error.message);
        };
    });
    })
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

// app.get('*', (req, res) => 
// {
//   res.sendFile(path.join(__dirname,'browser/index.html'));
//  });

app.listen(PORT, () =>
    console.log(`express server is running on port ${PORT}`)
);
