const fs = require("fs");
const csv = require('neat-csv');

module.exports = async function(){
    let all = {};
    let confirmedCsv = fs.createReadStream('confirmed.csv');
    let recoveredCsv = fs.createReadStream('recovered.csv');
    let deathsCsv = fs.createReadStream('deaths.csv')
    all.confirmed = await csv(confirmedCsv);
    all.recovered = await csv(recoveredCsv);
    all.deaths = await csv(deathsCsv);
    return all
}