const https = require("https");
const fs = require('fs');
const express = require("express");
const cors = require("cors");
const PORT = process.env.PORT || 3000;
const parse = require('./parser');
//const finalData = require('./all.json')

const sourceUrl = 'https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_19-covid-';
let fileNames = ['Confirmed.csv','Recovered.csv','Deaths.csv'];

function getSource(url,n){
    return new Promise((resolve,reject)=>{
        https.get(url+n,(res)=>{
            let temp = fs.createWriteStream('./source/'+n)
            res.pipe(temp);
            res.on('end',()=>resolve())
        })
    })
}

function getAll(){
    let requests = [];
    fileNames.forEach(name=>{
        requests.push(getSource(sourceUrl,name))
    })
    Promise.all(requests).then(()=>{
        parse('./source/Confirmed.csv','./source/Recovered.csv','./source/Deaths.csv').then(data=>{
            finalData = data;
            console.log("bootstrapping finished");
        })
    })
}

let finalData = [];
getAll();
// Updates source csv files once every 12h
setInterval(()=>{
    getAll();
    console.log('data source updated.')
},43200000);

let app = express();

app.use(cors());

app.get("/all", (req, res) => {
    res.json(finalData.data);
});

app.get("/country/:id",(req,res)=>{
    let id = Number(req.params.id);
    if (id<1 || id>finalData.data.length) res.status(404);
    res.json(finalData.data[id-1]);
})

app.get("/locations",(req,res)=>{
    res.json(finalData.countries);
})

app.listen(PORT, () => console.log(`express server is running on port ${PORT}`));
