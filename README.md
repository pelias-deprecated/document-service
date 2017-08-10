> This repository is part of the [Pelias](https://github.com/pelias/pelias) project. Pelias is an open-source, open-data geocoder built by [Mapzen](https://www.mapzen.com/) that also powers [Mapzen Search](https://mapzen.com/projects/search). Our official user documentation is [here](https://mapzen.com/documentation/search/).

# Pelias Document Service

![Travis CI Status](https://travis-ci.org/pelias/document-service.svg)
[![Gitter Chat](https://badges.gitter.im/pelias/pelias.svg)](https://gitter.im/pelias/pelias?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)

## Overview

Module that provides a web service to aid language-agnostic importers in creating documents for insertion into an Elasticsearch index queryable by the Pelias API.  [Who's on First data](https://github.com/whosonfirst-data/whosonfirst-data) is required in order to populate the documents' administrative hierarchy.  

## Installation

```bash
$ git clone git@github.com:pelias/document-service.git
$ cd document-service
$ npm install
$ npm start /path/to/whosonfirst/data
```

For ease of use, [Who's on First data](https://github.com/whosonfirst-data/whosonfirst-data) can be downloaded using scripts provided by the Pelias [Who's on First module](https://www.npmjs.com/package/pelias-whosonfirst#downloading-the-data).  

[![NPM](https://nodei.co/npm/pelias-document-service.png?downloads=true&stars=true)](https://nodei.co/npm/pelias-document-service)

## NPM Module

The `pelias-document-service` npm module can be found here:

[https://npmjs.org/package/pelias-document-service](https://npmjs.org/package/pelias-document-service)

## Usage

To start the document service, type: `npm start <path to Who's on First data>`.  By default, the service runs on port 5000 but can be overridden in the `PORT` environmental variable.  

`GET` requests are made to the `/synthesize` endpoint in the format:  `http://localhost:5000/synthesize/<source>/<layer>`.

`source` is the name of the source of the data that can be used to filter and is used in the synthesized document.  For example, data imported from [OpenAddresses](https://openaddresses.io/) would use `openaddresses` for `source`.   

`layer` is the type of data that this document represents.  Currently, the only valid values for `layer` are `address`, `street`, and `venue`.  

## Parameters

The following parameters are supported for the service:

| name | required | description |
| ---- | -------- | ----------- |
| `id` | yes | a unique identifier for reference in Elasticsearch |
| `lon` | yes | longitude of the record |
| `lat` | yes | latitude of the record |
| `name` | yes | a textual name of the record such as the name of a business (for venues) or `house_number` + `street` (for addresses), used by the Pelias API to create result labels
| `house_number` | <ul><li>`address` layer, yes</li><li>`venue` layer, no</li><li>`street` layer, invalid</li></ul> | house number of an address or venue |
| `street` | <ul><li>`address`/`street` layers, yes</li><li>`venue` layer, no</li></ul> | street of an address or venue |
| `postcode` | no | postcode of an address or venue |

## Output

`GET` requests to the `/synthesize` endpoint return a content-type `application/json` response ready to be sent to Elasticsearch for create/update and queryable by the Pelias API.  The output for OpenAddresses `30 W 26th St` is:

```
{
  "name": {
    "default": "30 W 26th St"
  },
  "phrase": {
    "default": "30 W 26th St"
  },
  "parent": {
    "locality": [
      "New York"
    ],
    "locality_id": [
      "85977539"
    ],
    "locality_a": [
      null
    ],
    "neighbourhood": [
      "Flatiron District"
    ],
    "neighbourhood_id": [
      "85869245"
    ],
    "neighbourhood_a": [
      null
    ],
    "county": [
      "New York County"
    ],
    "county_id": [
      "102081863"
    ],
    "county_a": [
      null
    ],
    "borough": [
      "Manhattan"
    ],
    "borough_id": [
      "421205771"
    ],
    "borough_a": [
      null
    ],
    "region": [
      "New York"
    ],
    "region_id": [
      "85688543"
    ],
    "region_a": [
      "NY"
    ],
    "country": [
      "United States"
    ],
    "country_id": [
      "85633793"
    ],
    "country_a": [
      "USA"
    ]
  },
  "address_parts": {
    "number": "30",
    "street": "W 26th St",
    "zip": "10010"
  },
  "center_point": {
    "lon": -73.990409,
    "lat": 40.74427
  },
  "source": "openaddresses",
  "layer": "address",
  "source_id": "6364a510f0268d6f"
}
```

## Request Examples

There are 3 types of documents that can be synthesized, each corresponding to the `layer` value of the request path:

- venue
- address
- street

### Venues

Venue documents are synthesized by calling the `/synthesize/<source>/venue` endpoint.  Each venue has a `lat`, `lon`, `id`, `name`, and optional `house_number`, `street`, and `postcode`.  `name` is typically the name of the business or point-of-interest, such as "New York Bakery" or "Yellowstone National Park".  `house_number` and `street` are optional since in some cases this information is either not applicable (as in the case of national parks or water features which are defined as polygons) or confidential (such as women's shelters or other cases where point accuracy is to be purposely obscured).  

Example (from [OpenStreetMap](https://www.openstreetmap.org/)): `http://localhost:5000/synthesize/openstreetmap/venue?id=264768896&lon=-73.989642&lat40.74101&name=Flatiron+Building&house_number=175&street=5th+Avenue&postcode=10010`

### Addresses

Address documents can be synthesized by calling the `/synthesize/<source>/address` endpoint.  Each address has a `lat`, `lon`, `id`, `name`, `house_number`, `street`, and optional `postcode`.  The `name` value is typically just the formatted address, which can be number-prefixed, as in "30 West 26th Street, New York, NY", or -postfixed, as in "Rigaer Straße 11, Berlin, Germany", but can be anything.  The document service makes no judgements on what the value of name should be; its value is determined by the caller.  

Example (from [OpenAddresses](https://openaddresses.io/)): `http://localhost:5000/synthesize/openaddresses/address?id=6364a510f0268d6f&lon=-73.9904095&lat=40.74427&name=30+W+26th+St&house_number=30&street=W+26th+St&postcode=10010`

### Streets

Street documents are synthesized using the `/synthesize/<source>/street` endpoint.  Each street has a `lat`, `lon`, `id`, `name`, `street`, and optional `postcode`.  If a street is entirely contained within a single postcode, it should be supplied if available.  Typically, the `name` value should be the same as the `street` value but there are no restrictions placed upon this condition.  

Example (from [OpenStreetMap](https://www.openstreetmap.org/)): `http://localhost:5000/synthesize/openaddresses/address?id=10540891&lon=-73.935546&lat=40.813082&name=Madison+Avenue&street=Madison+Avenue`

## Error Conditions

### Client Errors

The `/synthesize` endpoint returns an [HTTP status code 400](https://tools.ietf.org/html/rfc7231#section-6.5.1) is returned with an error message under any of the following conditions:

- `lat` value is not parseable as a finite number
- `lon` value is not parseable as a finite number
- `id` value is empty
- `name` value is empty
- `layer=address`-specific:
  - `house_number` value is empty
  - `street` value is empty
- `layer=street`-specific:
  - `house_number` value is non-empty
- `layer=venue`-specific:
  - `house_number` value is non-empty and `street` value is empty

### Server Errors

The `/synthesize` endpoint returns an [HTTP status code 500](https://tools.ietf.org/html/rfc7231#section-6.6.1) is returned when a error occurs when performing administrative hierarchy lookup.  
