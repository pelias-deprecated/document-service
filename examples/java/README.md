# Pelias Document Service - Java Example

This Java 6 example app imports the list of [Boston, Massachusetts public schools](https://bostonopendata-boston.opendata.arcgis.com/datasets/1d9509a8b2fd485d9ad471ba2fdb1f90_0.geojson) into a [local](http://localhost:9200/pelias) Elasticsearch `pelias` index as venues.  

## Usage

To run the example importer, enter the following at the command line:

```
gradle clean fatJar
java -jar build/libs/pelias-importer-1.0.jar
```

Assuming there are no errors, `processed 132 of 132 schools` should be written to the console upon completion.

To verify, open [sense](http://localhost:5601/app/sense) and enter `GET pelias/venue/_search?pretty=true&q=*:*` and results should be displayed.  
