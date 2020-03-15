const https = require("https");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const moment = require("moment");
const PORT = process.env.PORT || 3000;
const parse = require("./parser");
//const finalData = require('./all.json')

console.time("bootstrapped");
const sourceUrl =
  "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-";
let fileNames = ["Confirmed.csv", "Recovered.csv", "Deaths.csv"];
let lastUpdated;

function getSource(url, n) {
  return new Promise((resolve, reject) => {
    https.get(url + n, res => {
      let temp = fs.createWriteStream("./source/" + n);
      res.pipe(temp);
      res.on("end", () => resolve());
    });
  });
}

async function getAll(conf,rec,ded) {
  fs.unlinkSync(conf);
  fs.unlinkSync(rec);
  fs.unlinkSync(ded);
  let requests = [];
  fileNames.forEach(name => {
    requests.push(getSource(sourceUrl, name));
  });
  await Promise.all(requests);
  return await parse(conf,rec,ded);
}

let finalData = [];

getAll(
  "./source/Confirmed.csv",
  "./source/Recovered.csv",
  "./source/Deaths.csv"
).then(res=>{
    finalData = res;
    console.timeEnd("bootstrapped")
    lastUpdated = new Date();
})
// Updates source csv files once every *
setInterval(() => {
  getAll(
    "./source/Confirmed.csv",
    "./source/Recovered.csv",
    "./source/Deaths.csv"
  ).then(res=>{
      finalData = res;
      console.log("Data has been updated")
      lastUpdated = new Date();
  })
}, 21600000);

let app = express();

app.use(cors());

app.get("/all", (req, res) => {
  res.json(finalData.data);
});

app.get("/global",(req,res)=>{
    res.json(finalData.global);
})

app.get("/country/:id", (req, res) => {
  let id = Number(req.params.id);
  if (id < 1 || id > finalData.data.length) res.status(404);
  res.json(finalData.data[id - 1]);
});

app.get("/countries", (req, res) => {
  res.json(finalData.countries);
});

app.get("/lastUpdate", (req, res) => {
  let now = moment();
  res.json(now.diff(lastUpdated));
});



app.listen(PORT, () =>
  console.log(`express server is running on port ${PORT}`)
);
