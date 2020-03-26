const fs = require("fs");
const csv = require("neat-csv");
const isDate = require("./utils/isDate");
const altSource = require('./alt-source/index');

module.exports = async function(fileNames) {
    let rawData = {};
    let countries = [];
    let finalData = [];
    let altData = {};
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

    try {
        rawData.toll = await csv(
            fs.createReadStream("./source/" + fileNames[0])
        );
        rawData.recovered = await csv(
            fs.createReadStream("./source/" + fileNames[1])
        );
        rawData.deaths = await csv(
            fs.createReadStream("./source/" + fileNames[2])
        );
    } catch (error) {
        console.log("error parsing csv");
        throw error;
    }
    let rawDataEntries = Object.entries(rawData);

    if(process.env.dev){
        altData = require("./source/alt")
    }else{
        try {
            altData.all = await altSource.getAll();
            altData.countries = await altSource.getCountries();
        } catch (error) {
            console.log("error with alternative data source");
            throw error;
        }
    }

    let i = 1;
    rawData.toll.forEach(item => {
        if (!countries.some(e => e.name === item["Country/Region"])) {
            countries.push({ id: i, name: item["Country/Region"] });
            i++;
        }
    });
    for (country of countries) {
        let newCountry = populateCountry(country, rawDataEntries);
        finalData.push(newCountry);
        compareCountry(newCountry, altData.countries);
        addToGlobalData(newCountry, globalData);
    }
    let geoJson = toGeoJson(rawData, finalData);
    compareGlobal(globalData, altData.all);
    return {
        global: globalData,
        data: finalData,
        geoJson,
        countries,
        alt: altData
    };
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
    let newCountry = {
        id: country.id,
        name: country.name,
        toll: 0,
        recovered: 0,
        deaths: 0,
        sick: 0,
        history: { toll: {}, recovered: {}, deaths: {}, sick: {} }
    };
    for ([typeName, type] of entries) {
        for (item of type) {
            if (item["Country/Region"] === country.name) {
                let entries = Object.entries(item);
                entries.forEach(([key, val]) => {
                    if (isDate(key) && val != "") {
                        if (!newCountry.history[typeName][key])
                            newCountry.history[typeName][key] = 0;
                        newCountry.history[typeName][key] += Number(val);
                    }
                });
                let values = Object.values(item);
                let latest = values[values.length - 1];
                newCountry[typeName] += Number(latest);
            }
        }
    }
    calculateSick(newCountry);
    return newCountry;
}

function calculateSick(country) {
    country.sick = country.toll - (country.recovered + country.deaths);
    for (let [date, toll] of Object.entries(country.history.toll)) {
        country.history.sick[date] =
            country.history.toll[date] -
            (country.history.recovered[date] + country.history.deaths[date]);
    }
}

function toGeoJson(rawDataObj, countries) {
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
        for (country of countries) {
            if (row["Country/Region"] === country.name) {
                thisCountry = country;
                break;
            }
        }
        let tol = Object.values(row);
        let rec = [0];
        if(rawRecovered[i]){
            rec = Object.values(rawRecovered[i]);
        }
        let ded = [0];
        if(rawDeaths[i]){
            ded = Object.values(rawDeaths[i]);
        }
        let newFeature =
            row["Province/State"] === ""
                ? {
                      type: "Feature",
                      geometry: {
                          type: "Point",
                          coordinates: [Number(row["Long"]), Number(row["Lat"])]
                      },
                      properties: {
                          region: row["Province/State"],
                          country: row["Country/Region"],
                          countryId: thisCountry.id,
                          toll: Number(thisCountry.toll),
                          recovered: Number(thisCountry.recovered),
                          deaths: Number(thisCountry.deaths),
                          sick: null
                      }
                  }
                : {
                      type: "Feature",
                      geometry: {
                          type: "Point",
                          coordinates: [Number(row["Long"]), Number(row["Lat"])]
                      },
                      properties: {
                          region: row["Province/State"],
                          country: row["Country/Region"],
                          countryId: thisCountry.id,
                          toll: Number(tol[tol.length - 1]),
                          recovered: Number(rec[rec.length - 1]),
                          deaths: Number(ded[ded.length - 1]),
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

function compareCountry(country, altCountries) {
    for (c of altCountries) {
        fixName(c);
        if (c.country === country.name) {
            country.toll = c.cases;
            country.deaths = c.deaths;
            country.recovered = c.recovered;
            country.sick = c.active;
            break;
        }
    }
}

function compareGlobal(global, alt) {
    if (global.toll < alt.cases) global.toll = Number(alt.cases);
    if (global.deaths < alt.deaths) global.deaths = Number(alt.deaths);
    if (global.recovered < alt.recovered)
        global.recovered = Number(alt.recovered);
    if (global.sick < alt.active)
        global.sick = global.toll - (global.deaths + global.recovered);
}

function fixName(c) {
    if (c.country === "USA") c.country = "US";
    if (c.country === "UK") c.country = "United Kingdom";
    if (c.country === "UAE") c.country = "United Arab Emirates";
    if (c.country === "S. Korea") c.country = "Korea, South";
    if (c.country === "Diamond Princess") c.country = "Cruise Ship";
}
