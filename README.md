# coronavirus-data-api
Simple API that serves stats about the COVID-19 epidemic. Built with node.js using express server.

Showcase: https://corona-4c5d1.firebaseapp.com/

## Data Source

This project uses the [Data Repository by Johns Hopkins CSSE](https://github.com/CSSEGISandData/COVID-19) as a data source.

## Items

the request "GET /all" returns an array of country objects that have the following properties:

Field | Description
------|------------
id | unique id
name | country name
toll | number of confirmed cases
recovered | number of treated cases
deaths | number of deceased cases
sick | number of cases that remain untreated
history | contains toll, recovered, dead, sick with [key,value] pairs as dates

the request "GET /countries" returns an array of countries with their corresponding id.

E.g: {"id":1,"name":"Mainland China"}

## Example

http://localhost:3000/country/1

```json
{
  "id": 1,
  "name": "Mainland China",
  "toll": 80757,
  "recovered": 60106,
  "deaths": 3136,
  "sick": 17515,
  "history": {
    "toll": {"1/22/20": 547,/*...*/"3/10/20": 80757},
    "recovered": {"1/22/20": 28,/*...*/"3/10/20": 60106},
    "deaths": {"1/22/20": 17,/*...*/"3/10/20": 3136},
    "sick": {"1/22/20": 502,/*...*/"3/10/20": 17515}
  }
}
```

## Installation

* `git clone https://github.com/aminefeidi/coronavirus-data-api.git`
* `cd coronavirus-data-api`
* `npm install`
* `npm start`
