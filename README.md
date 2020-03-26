# coronavirus-data-api

Simple API that serves stats about the COVID-19 epidemic. Built with node.js using express server.

Showcase: https://corona-4c5d1.firebaseapp.com/

## Data Source

This project uses the [Data Repository by Johns Hopkins CSSE](https://github.com/CSSEGISandData/COVID-19) as a data source.

## Endpoints

| Request              | Response                                       |
| -------------------- | ---------------------------------------------- |
| get /api/all         | all country data with their respective history |
| get /api/global      | global data and history                        |
| get /api/countries   | country name and id pairs                      |
| get /api/country/:id | find country by id                             |
| get /api/lastUpdate  | milliseconds since last update                 |
| get /api/geoJson     | GeoJson feature layer                          |

## Items

the request "GET /api/all" returns an array of country objects that have the following properties:

| Field     | Description                                                          |
| --------- | -------------------------------------------------------------------- |
| id        | unique id                                                            |
| name      | country name                                                         |
| toll      | number of confirmed cases                                            |
| recovered | number of treated cases                                              |
| deaths    | number of deceased cases                                             |
| sick      | number of cases that remain untreated                                |
| history   | contains toll, recovered, dead, sick with [key,value] pairs as dates |

the request "GET /countries" returns an array of countries with their corresponding id.

E.g: {"id":1,"name":"Mainland China"}

## Example

http://localhost:3000/api/country/1

```json
{
    "id": 150,
    "name": "Tunisia",
    "toll": 200,
    "recovered": 2,
    "deaths": 6,
    "sick": 192,
    "history": {
        "toll": {
            "1/22/20": 0,
            "...":"...",
            "3/25/20": 173
        },
        "recovered": {
            "1/22/2020": 0,
            "...":"...",
            "3/24/2020": 1
        },
        "deaths": {
            "1/22/20": 0,
            "...":"...",
            "3/25/20": 5
        },
        "sick": {
            "1/22/20": 0,
            "...":"...",
            "3/25/20": 168
        }
    }
}
```

http://localhost:3000/api/geoJson

```json
{
    "type": "Feature",
    "geometry": {
        "type": "Point",
        "coordinates": [
            9,
            34
        ]
    },
    "properties": {
        "region": "",
        "country": "Tunisia",
        "countryId": 150,
        "toll": 200,
        "recovered": 2,
        "deaths": 6,
        "sick": 192
    }
}
```

## Installation

-   `git clone https://github.com/aminefeidi/coronavirus-data-api.git`
-   `cd coronavirus-data-api`
-   `npm install`
-   `npm start`
