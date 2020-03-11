const https = require("https");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const PORT = process.env.PORT || 3000;
const parse = require("./parser");
//const finalData = require('./all.json')

const sourceUrl =
  "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-";
let fileNames = ["Confirmed.csv", "Recovered.csv", "Deaths.csv"];

function getSource(url, n) {
  return new Promise((resolve, reject) => {
    https.get(url + n, res => {
      let temp = fs.createWriteStream("./source/" + n);
      res.pipe(temp);
      res.on("end", () => resolve());
    });
  });
}

async function getAll() {
  let requests = [];
  fileNames.forEach(name => {
    requests.push(getSource(sourceUrl, name));
  });
  await Promise.all(requests);
  return await parse(
    "./source/Confirmed.csv",
    "./source/Recovered.csv",
    "./source/Deaths.csv"
  );
}

function getGlobalData(countryArr) {
  let globalData = {
    totalToll: 0,
    totalRec: 0,
    totalDed: 0,
    totalSic: 0,
    history: {
      toll: null,
      recovered: null,
      deaths: null,
      sick: null
    }
  };
  countryArr.forEach(country => {
    globalData.totalToll += country.toll;
    globalData.totalRec += country.recovered;
    globalData.totalDed += country.deaths;
    globalData.totalSic += country.sick;
    if (globalData.history.toll === null) {
      globalData.history.toll = country.history.toll;
      globalData.history.recovered = country.history.recovered;
      globalData.history.deaths = country.history.deaths;
      globalData.history.sick = country.history.sick;
    } else {
      for (let [date, toll] of Object.entries(country.history.toll)) {
        globalData.history.toll[date] += toll;
      }
      for (let [date, toll] of Object.entries(country.history.recovered)) {
        globalData.history.recovered[date] += toll;
      }
      for (let [date, toll] of Object.entries(country.history.deaths)) {
        globalData.history.deaths[date] += toll;
      }
      for (let [date, toll] of Object.entries(country.history.sick)) {
        globalData.history.sick[date] += toll;
      }
    }
  });
  return globalData;
}

let finalData = [];
let globalData = {};

getAll().then(res=>{
    finalData = res;
    globalData = getGlobalData(finalData.data);
    console.log("bootstrapping finished.");
})
// Updates source csv files once every 12h
setInterval(() => {
    getAll().then(res=>{
        finalData = res;
        globalData = getGlobalData(finalData.data);
        console.log("data source updated.");
    })
}, 43200000);

let app = express();

app.use(cors());

app.get("/all", (req, res) => {
  res.json(finalData.data);
});

app.get("/global",(req,res)=>{
    res.json(globalData);
})

app.get("/country/:id", (req, res) => {
  let id = Number(req.params.id);
  if (id < 1 || id > finalData.data.length) res.status(404);
  res.json(finalData.data[id - 1]);
});

app.get("/countries", (req, res) => {
  res.json(finalData.countries);
});

app.listen(PORT, () =>
  console.log(`express server is running on port ${PORT}`)
);
