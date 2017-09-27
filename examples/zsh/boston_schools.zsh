#!/bin/zsh

schoolsDataUrl='https://bostonopendata-boston.opendata.arcgis.com/datasets/1d9509a8b2fd485d9ad471ba2fdb1f90_0.geojson'
count=0

# convert each school record into a URL
for request in `curl $schoolsDataUrl | jq '.features[] | @uri "http://localhost:5000/synthesize/boston_schools/venue?id=\(.properties.SCH_ID)&lon=\(.geometry.coordinates[0])&lat=\(.geometry.coordinates[1])&name=\(.properties.SCH_LABEL)&house_number=\(.properties.ADDRESS | capture("^(?<num>\\\d+)\\\s").num )&street=\(.properties.ADDRESS | capture("^\\\d+\\\s+(?<street>.+)$").street )&postcode=\(.properties.ZIPCODE)" ' | sed s/\"//g `; do
  # extract the id for later use in POSTing to Elasticsearch
  [[ $request =~ 'id=([0-9]+)' ]] && id=$match[1]

  # call the document service, then POST the response to Elasticsearch
  curl $request | curl -X POST --data-binary @- http://localhost:9200/pelias/venue/$id

  ((count++))

done

echo "processed" $count "schools"
