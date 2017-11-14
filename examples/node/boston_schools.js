'use strict';

const util = require('util');
const request = require('superagent');
const elasticsearch = require('elasticsearch');

// location of open schools data
const schoolsDataUrl = 'https://bostonopendata-boston.opendata.arcgis.com/datasets/1d9509a8b2fd485d9ad471ba2fdb1f90_0.geojson';

// the URL for the Pelias document-service
const documentServiceUrl = util.format( 'http://%s:%s/synthesize/boston_schools/venue?',
  process.env.DOCUMENT_SERVICE_HOST || 'localhost',
  process.env.DOCUMENT_SERVICE_PORT || '5000'
);

// matches "1" and "Main Street" from "1 Main Street"
const addressPattern = /^(\d+) (.+)$/;

// make the request to get the schools GeoJSON
request
  .get(schoolsDataUrl)
  .accept('json')
  .end((err, response) => {
    // bail out early if something went wrong
    if (response.statusCode !== 200) {
      console.error(`could not retrieve data from ${schoolsDataUrl}`);
      process.exit(1);
    }

    let successCount = 0;
    let total = 0;

    const esClient = new elasticsearch.Client({
      host: util.format( '%s:%s',
        process.env.ELASTICSEARCH_HOST || 'localhost',
        process.env.ELASTICSEARCH_PORT || '9200'
      )
    });

    const schools = response.body.features;

    // iterate over the individual schools, performing document-service and inserting into ES
    schools.forEach(school => {
      // attempt match against ADDRESS field
      const addressMatch = addressPattern.exec(school.properties.ADDRESS);

      // only continue if there's a house number and street
      if (!addressMatch) {
        return;
      }

      // create an object of parameters from the source JSON
      const parameters = {
        id: school.properties.SCH_ID,
        lon: school.geometry.coordinates[0],
        lat: school.geometry.coordinates[1],
        name: school.properties.SCH_LABEL,
        house_number: addressMatch[1],
        street: addressMatch[2],
        postcode: school.properties.ZIPCODE
      };

      // execute the document-service request
      request
        .get(documentServiceUrl)
        .accept('json')
        .query(parameters)
        .end((err, response) => {
          if (err) {
            console.error(err);
            return;
          }

          if (!err && response.statusCode === 200) {
            // if the document-service request was successful, send the doc to Elasticsearch
            const esDoc = {
              index: 'pelias',
              type: 'venue',
              id: parameters.id,
              body: response.body
            };

            esClient.index(esDoc, (err, response) => {
              total++;

              if (err) {
                console.error(err);
              } else {
                successCount++;
              }

              if (total === schools.length) {
                console.log(`processed ${successCount} of ${total} schools`);
              }

            });

          } else {
            console.log(`could not create/update id ${parameters.id}: ${response.body}`)
          }

        });

    });

  });
