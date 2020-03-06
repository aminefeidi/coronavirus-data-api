const fs = require("fs");
const csv = require('neat-csv');

module.exports = async function(conf,rec,ded){
    let rawData = {};
    let countries = [];
    let finalData = [];
    
    let confirmedCsv = fs.createReadStream(conf);
    let recoveredCsv = fs.createReadStream(rec);
    let deathsCsv = fs.createReadStream(ded)

    rawData.confirmed = await csv(confirmedCsv);
    rawData.recovered = await csv(recoveredCsv);
    rawData.deaths = await csv(deathsCsv);
    
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

    return {data:finalData,countries};
}