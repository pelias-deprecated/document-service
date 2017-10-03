# Pelias Document Service - Z shell Example

This Z shell example app imports the list of [Boston, Massachusetts public schools](https://bostonopendata-boston.opendata.arcgis.com/datasets/1d9509a8b2fd485d9ad471ba2fdb1f90_0.geojson) into a [local](http://localhost:9200/pelias) Elasticsearch `pelias` index as venues.  It requires [jq](https://stedolan.github.io/jq/) and [curl](https://curl.haxx.se/) to be installed.  

## Usage

To run the example importer, enter the following at the command line:

```
zsh boston_schools.zsh
```

To verify, open [sense](http://localhost:5601/app/sense) and enter `GET pelias/venue/_search?pretty=true&q=*:*` to show indexed documents.
