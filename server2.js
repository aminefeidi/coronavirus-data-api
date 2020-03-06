const https = require("https");
const express = require("express");
const cors = require("cors");
const PORT = process.env.PORT || 3000;
const parse = require('./server2parser');

let rawData = {};
let countries = [];
let finalData = [];

parse().then(res =>{
    rawData = res;
    rawData.confirmed.forEach(item => {
        if (!countries.includes(item['Country/Region'])){
            countries.push(item['Country/Region']);
            finalData.push({name:item['Country/Region'],toll:0,recovered:0,deaths:0,sick:0});
        };
    })
    finalData.forEach(country => {
        rawData.confirmed.forEach(item=>{
            if (item['Country/Region'] === country.name){
                let arr = Object.values(item);
                country.toll += Number(arr[arr.length-1]);
            }
        })
        rawData.recovered.forEach(item=>{
            if (item['Country/Region'] === country.name){
                let arr = Object.values(item);
                country.recovered += Number(arr[arr.length-1]);
            }
        })
        rawData.deaths.forEach(item=>{
            if (item['Country/Region'] === country.name){
                let arr = Object.values(item);
                country.deaths += Number(arr[arr.length-1]);
            }
        })
        country.sick = country.toll - country.recovered;
    })
})

let app = express();

app.use(cors());

app.get("/all", (req, res) => {
    res.json(finalData);
});

app.get("/locations", (req, res) => {
    res.json(countries);
});

app.get("",(req,res)=>{
    res.send("HEllO")
})

app.listen(PORT, () => console.log(`express server is running on port ${PORT}`));
