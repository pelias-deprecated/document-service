import urllib.request
import urllib.parse
import json
import re
from elasticsearch import Elasticsearch
from elasticsearch import TransportError
import sys

# location of open schools data
schoolsDataUrl = 'https://bostonopendata-boston.opendata.arcgis.com/datasets/1d9509a8b2fd485d9ad471ba2fdb1f90_0.geojson'

# the URL for the Pelias document-service
documentServiceUrl = 'http://document_service:5000/synthesize/boston_schools/venue?'

# matches "1" and "Main Street" from "1 Main Street"
addressPattern = re.compile('^(\\d+) (.+)$')

# make the request to get the schools GeoJSON
with urllib.request.urlopen(schoolsDataUrl) as schoolsResponse:
    # bail out early if something went wrong
    if (schoolsResponse.status != 200):
        exit(1)

    successCount = 0

    # parse the response as JSON
    schoolsData = json.loads(schoolsResponse.read().decode('utf-8'))

    # setup connection to Elasticsearch
    es = Elasticsearch( [ { 'host': 'elasticsearch', 'port': 9200 } ] )

    # iterate over the individual schools, performing document-service and inserting into ES
    for school in schoolsData['features']:

        # attempt match against ADDRESS field
        addressMatch = addressPattern.search(school['properties']['ADDRESS'])

        # only continue if there's a house number and street
        if (addressMatch.groups()):
            # create a dictionary of parameters from the source JSON
            parameters = {
                'id':           school['properties']['SCH_ID'],
                'lon':          school['geometry']['coordinates'][0],
                'lat':          school['geometry']['coordinates'][1],
                'name':         school['properties']['SCH_LABEL'],
                'house_number': addressMatch.group(1),
                'street':       addressMatch.group(2),
                'postcode':     school['properties']['ZIPCODE']
            }

            # format a URL for the Pelias document-service
            synthesizeRequest = documentServiceUrl + urllib.parse.urlencode(parameters)

            # execute the document-service request
            with urllib.request.urlopen(synthesizeRequest) as documentServiceResponse:
                if (documentServiceResponse.status == 200):
                    # if the document-service request was successful, send the doc to Elasticsearch
                    synthesizedDoc = documentServiceResponse.read().decode('utf-8')

                    try:
                        esResponse = es.index(index='pelias', doc_type='venue', id=parameters['id'], body=synthesizedDoc)
                        successCount += 1
                    except TransportError as err:
                        print(err, file=sys.stderr)

                else:
                    print('could not create/update id {}: {}'.format(parameters['id'], documentServiceResponse))

    print('processed {} of {} schools'.format(successCount, len(schoolsData['features'])))
