# coronavirus-data-api
Simple API that serves stats about the COVID-19 epidemic. Built with node.js using express server.
example : https://arcane-island-41018.herokuapp.com/all
Showcase: https://corona-4c5d1.firebaseapp.com/

## Data Source

This project uses the [Data Repository by Johns Hopkins CSSE](https://github.com/CSSEGISandData/COVID-19) as a data source.

## Items

the request "GET /all" returns an array of country objects that have the following properties:

Field | Description
------|------------
name | country name
toll | number of confirmed cases
recovered | number of treated cases
dead | number of deceased cases
sick | number of cases that remain untreated

## Installation

* `git clone https://github.com/aminefeidi/coronavirus-data-api.git`
* `cd coronavirus-data-api`
* `npm install`
* `npm start`
