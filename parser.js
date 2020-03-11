const fs = require("fs");
const csv = require('neat-csv');
const isDate = require('./tools/isDate');

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
    

    let i = 1;
    rawData.confirmed.forEach((item) => {
        if (!countries.some(e => e.name === item['Country/Region'])){
            countries.push({id:i,name:item['Country/Region']});
            let newCountry = {id:i,name:item['Country/Region'],toll:0,recovered:0,deaths:0,sick:0,history:{toll:{},recovered:{},deaths:{},sick:{}}};
            let entries = Object.entries(item);
            // further optimisation needed...
            // make a 'dates' array ??
            entries.forEach(([key,val])=>{
                if(isDate(key)) {
                    newCountry.history.toll[key] = 0;
                    newCountry.history.recovered[key] = 0;
                    newCountry.history.deaths[key] = 0;
                    newCountry.history.sick[key] = 0;
                }
            })
            finalData.push(newCountry);
            i++;
        };
    })

    finalData.forEach(country => {
        rawData.confirmed.forEach(item=>{
            if (item['Country/Region'] === country.name){
                let entries = Object.entries(item);
                entries.forEach(([key,val])=>{
                    if(isDate(key)){
                        country.history.toll[key] += Number(val);
                    }
                })
                let values = Object.values(item);
                country.toll += Number(values[values.length-1]);
            }
        })
        rawData.recovered.forEach(item=>{
            if (item['Country/Region'] === country.name){
                let entries = Object.entries(item);
                entries.forEach(([key,val])=>{
                    if(isDate(key)){
                        country.history.recovered[key] += Number(val);
                    }
                })
                let values = Object.values(item);
                country.recovered += Number(values[values.length-1]);
            }
        })
        rawData.deaths.forEach(item=>{
            if (item['Country/Region'] === country.name){
                let entries = Object.entries(item);
                entries.forEach(([key,val])=>{
                    if(isDate(key)){
                        country.history.deaths[key] += Number(val);
                    }
                })
                let values = Object.values(item);
                country.deaths += Number(values[values.length-1]);
            }
        })
        country.sick = country.toll - (country.recovered + country.deaths);
        for (let [date,toll] of Object.entries(country.history.sick)){
            country.history.sick[date] = country.history.toll[date] - (country.history.recovered[date]+country.history.deaths[date]);
        }

        if(country.name === "Diamond Princess cruise ship") country.name = "US";
    })
   
    return {data:finalData,countries};
}