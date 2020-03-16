const fs = require("fs");
const csv = require("neat-csv");
const isDate = require("./utils/isDate");

module.exports = async function(conf, rec, ded) {
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

    let confirmedCsv = fs.createReadStream(conf);
    let recoveredCsv = fs.createReadStream(rec);
    let deathsCsv = fs.createReadStream(ded);

    rawData.toll = await csv(confirmedCsv);
    rawData.recovered = await csv(recoveredCsv);
    rawData.deaths = await csv(deathsCsv);

    let rawDataEntries = Object.entries(rawData);

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
    let geoJson = toGeoJson(rawData,countries);
    for (country of finalData) {
        populateCountry(country, rawDataEntries);
        addToGlobalData(country, globalData);
    }
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
        let id;
        for (country of countries){
            if(row["Country/Region"] === country.name){
                id = country.id;
                break;
            }
        }
        let tol = Object.values(row);
        let rec = Object.values(rawRecovered[i]);
        let ded = Object.values(rawDeaths[i]);
        let newFeature = {
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [Number(row["Long"]), Number(row["Lat"])]
            },
            properties: {
                region: row["Province/State"],
                country: row["Country/Region"],
                countryId:id,
                toll: Number(tol[tol.length - 1]),
                recovered: Number(rec[rec.length - 1]),
                deaths: Number(ded[ded.length-1]),
                sick: null
            }
        };
        newFeature.properties.sick =
            newFeature.properties.toll -
            (newFeature.properties.recovered + newFeature.properties.deaths);
        geoJson.features.push(newFeature);
        i++;
    }
    return geoJson;
}
