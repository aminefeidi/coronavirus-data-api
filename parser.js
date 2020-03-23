const fs = require("fs");
const csv = require("neat-csv");
const isDate = require("./utils/isDate");
const covid = require('novelcovid');

module.exports = async function(fileNames) {
    let rawData = {};
    let countries = [];
    let finalData = [];
    let globalData = {
        toll: 0,
        recovered: 0,
        deaths: 0,
        sick: 0,
        history: {
            toll: null,
            recovered: null,
            deaths: null,
            sick: null
        }
    };

    rawData.toll = await csv(fs.createReadStream("./source/"+fileNames[0]));
    rawData.recovered = await csv(fs.createReadStream("./source/"+fileNames[1]));
    rawData.deaths = await csv(fs.createReadStream("./source/"+fileNames[2]));
    let rawDataEntries = Object.entries(rawData);

    let altData = {};
    altData.all = await covid.all();
    altData.countries = await covid.countries();

    let i = 1;
    rawData.toll.forEach(item => {
        if (!countries.some(e => e.name === item["Country/Region"])) {
            countries.push({ id: i, name: item["Country/Region"] });
            let newCountry = {
                id: i,
                name: item["Country/Region"],
                toll: 0,
                recovered: 0,
                deaths: 0,
                sick: 0,
                history: { toll: {}, recovered: {}, deaths: {}, sick: {} }
            };
            let entries = Object.entries(item);
            // further optimisation needed...
            // make a 'dates' array ??
            entries.forEach(([key, val]) => {
                if (isDate(key) && val != "") {
                    newCountry.history.toll[key] = 0;
                    newCountry.history.recovered[key] = 0;
                    newCountry.history.deaths[key] = 0;
                    newCountry.history.sick[key] = 0;
                }
            });
            finalData.push(newCountry);
            i++;
        }
    });
    for (country of finalData) {
        populateCountry(country, rawDataEntries);
        compareCountry(country,altData.countries);
        addToGlobalData(country, globalData);
    }
    let geoJson = toGeoJson(rawData,finalData);
    compareGlobal(globalData,altData.all);
    return { global: globalData, data: finalData, geoJson ,countries };
};

function addToGlobalData(countryRef, globalData) {
    let country = JSON.parse(JSON.stringify(countryRef));
    // I made a 'deep copy' of the object because for an unknown reason the function was mutating the first element of the array. Spooky..
    let types = ["toll", "recovered", "deaths", "sick"];
    for (type of types) {
        globalData[type] += country[type];
        if (globalData.history[type] === null) {
            globalData.history[type] = country.history[type];
        } else {
            for (let [date, toll] of Object.entries(country.history[type])) {
                globalData.history[type][date] += toll;
            }
        }
    }
}

function populateCountry(country, entries) {
    for ([typeName, type] of entries) {
        for (item of type) {
            if (item["Country/Region"] === country.name) {
                let entries = Object.entries(item);
                entries.forEach(([key, val]) => {
                    if (isDate(key) && val != "") {
                        country.history[typeName][key] += Number(val);
                    }
                });
                let values = Object.values(item);
                let latest = values[values.length - 1];
                if (latest === "") latest = values[values.length - 2];
                country[typeName] += Number(latest);
            }
        }
    }
    calculateSick(country);
}

function calculateSick(country) {
    country.sick = country.toll - (country.recovered + country.deaths);
    for (let [date, toll] of Object.entries(country.history.sick)) {
        country.history.sick[date] =
            country.history.toll[date] -
            (country.history.recovered[date] + country.history.deaths[date]);
    }
}

function toGeoJson(rawDataObj,countries) {
    let rawToll = rawDataObj.toll;
    let rawRecovered = rawDataObj.recovered;
    let rawDeaths = rawDataObj.deaths;
    let geoJson = {
        type: "FeatureCollection",
        features: []
    };
    let i = 0;
    for (row of rawToll) {
        let thisCountry;
        for (country of countries){
            if(row["Country/Region"] === country.name){
                thisCountry = country;
                break;
            }
        }
        let tol = Object.values(row);
        let rec = Object.values(rawRecovered[i]);
        let ded = Object.values(rawDeaths[i]);
        let newFeature = row["Province/State"] === '' ?
        {
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [Number(row["Long"]), Number(row["Lat"])]
            },
            properties: {
                region: row["Province/State"],
                country: row["Country/Region"],
                countryId:thisCountry.id,
                toll: thisCountry.toll,
                recovered: thisCountry.recovered,
                deaths: thisCountry.deaths,
                sick: null
            }
        }
        :
        {
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [Number(row["Long"]), Number(row["Lat"])]
            },
            properties: {
                region: row["Province/State"],
                country: row["Country/Region"],
                countryId:thisCountry.id,
                toll: tol[tol.length-1],
                recovered: rec[rec.length-1],
                deaths: ded[ded.length-1],
                sick: null
            }
        }
        newFeature.properties.sick =
            newFeature.properties.toll -
            (newFeature.properties.recovered + newFeature.properties.deaths);
        geoJson.features.push(newFeature);
        i++;
    }
    return geoJson;
}

function compareCountry(country,altCountries){
    let found = false;
    for(c of altCountries){
        fixName(c);
        if(c.country === country.name){
            country.toll = c.cases;
            country.deaths = c.deaths;
            country.recovered = c.recovered;
            country.sick = c.active;
            found = true;
            break;
        }
    }
    //if(!found) console.log(country.name);
}

function compareGlobal(global,alt){
    if(global.toll < alt.cases) global.toll = Number(alt.cases);
    if(global.deaths < alt.deaths) global.deaths = Number(alt.deaths);
    if(global.recovered < alt.recovered) global.recovered = Number(alt.recovered);
    if(global.sick < alt.active) global.sick = global.toll - (global.deaths + global.recovered);
}

function fixName(c){
    if(c.country === "USA") c.country = "US";
    if(c.country === "UK") c.country = "United Kingdom";
    if(c.country === "UAE") c.country = "United Arab Emirates";
    if(c.country === "S. Korea") c.country = "Korea, South";
    if(c.country === "Diamond Princess") c.country = "Cruise Ship";
}