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
$ npm start /path/to/whos/on/first/data
```

For ease of use, [Who's on First data](https://github.com/whosonfirst-data/whosonfirst-data) can be downloaded using scripts provided by the Pelias [Who's on First module](https://www.npmjs.com/package/pelias-whosonfirst#downloading-the-data).  

[![NPM](https://nodei.co/npm/pelias-document-service.png?downloads=true&stars=true)](https://nodei.co/npm/pelias-document-service)

## NPM Module

The `pelias-document-service` npm module can be found here:

[https://npmjs.org/package/pelias-document-service](https://npmjs.org/package/pelias-document-service)

## Usage

To start the document service, type: `npm start <path to Who's on First data>`.  By default, the service starts on port 5000 but can be overridden in the `PORT` environmental variable.  

Requests are made to the endpoint using the `GET` method in the format:  `http://localhost:5000/synthesize/<source>/<layer>`.

`source` is the name of the source of the data that can be used to filter.  For example, data imported from [OpenAddresses](https://openaddresses.io/) would use `openaddresses` for `source`.   

Currently, the only valid values for `layer` are `address`, `street`, and `venue`.  

For example: `http://localhost:5000/synthesize/openaddresses/address?id=6364a510f0268d6f&lon=-73.9904095&lat=40.74427&name=30+W+26th+St&house_number=30&street=W+26th+St&postcode=10010`

### Parameters

The following parameters are supported for the service:

| name | required | description |
| ---- | -------- | ----------- |
| `id` | yes | a unique identifier for reference in Elasticsearch |
| `lon` | yes | longitude of the record |
| `lat` | yes | latitude of the record |
| `name` | yes | a textual of the record such as a business name (for venues) or house number + street (for addresses, typically)
| `house_number` | yes with `address` layer, no otherwise | house number of an address or venue |
| `street` | yes with `address` or `street` layer, no otherwise | street of an address or venue |
| `postcode` | no | postcode of an address or venue |

### Error Conditions

A status 400 is returned with an error message under any of the following conditions:

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
