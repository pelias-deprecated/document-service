package com.pelias.importer;

import java.io.IOException;
import java.net.InetAddress;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.http.HttpStatus;
import org.apache.http.NameValuePair;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.methods.CloseableHttpResponse;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.utils.URLEncodedUtils;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.message.BasicNameValuePair;
import org.apache.http.util.EntityUtils;
import org.elasticsearch.action.index.IndexRequestBuilder;
import org.elasticsearch.action.index.IndexResponse;
import org.elasticsearch.client.transport.TransportClient;
import org.elasticsearch.common.transport.InetSocketTransportAddress;
import org.json.JSONArray;
import org.json.JSONObject;

public class BostonSchools {
    public static void main(String[] args) {
        BostonSchools bostonSchools = new BostonSchools();

        try {
            bostonSchools.process();
        }
        catch (Exception e) {
            System.err.println(e);
        }

    }

    public BostonSchools() {}

    public void process() throws ClientProtocolException, IOException {

        // location of open schools data
        String schoolsDataUrl = "https://bostonopendata-boston.opendata.arcgis.com/datasets/1d9509a8b2fd485d9ad471ba2fdb1f90_0.geojson";

        // the URL for the Pelias document-service
        String documentServiceUrl = "http://document_service:5000/synthesize/boston_schools/venue?";

        // setup an http client for getting schools data and synthesizing documents
        CloseableHttpClient httpClient = HttpClients.createDefault();

        // make the request to get the schools GeoJSON
        CloseableHttpResponse response = httpClient.execute(new HttpGet(schoolsDataUrl));

        // bail out early if something went wrong
        if (response.getStatusLine().getStatusCode() != HttpStatus.SC_OK) {
            System.err.println(String.format("Could not retrieve schools from %s", schoolsDataUrl));
            return;
        }

        // parse the response as JSON
        JSONObject schoolsData = new JSONObject(EntityUtils.toString(response.getEntity()));

        // setup connection to Elasticsearch
        TransportClient elasticSearchClient = TransportClient.builder().build().addTransportAddress(
                new InetSocketTransportAddress(InetAddress.getByName("elasticsearch"), 9200));

        // use the Pelias index with "venue" type
        IndexRequestBuilder reqBuilder = elasticSearchClient.prepareIndex("pelias", "venue");

        JSONArray schools = schoolsData.getJSONArray("features");

        int successCount = 0;

        // iterate over the individual schools, performing document-service and inserting into ES
        for (int i = 0; i < schools.length(); i++) {
            JSONObject school = schools.getJSONObject(i);

            // save the school id since it's need for setId
            String schoolId = Integer.toString(school.getJSONObject("properties").getInt("SCH_ID"));

            // create a list of parameters from the source JSON object
            List<NameValuePair> parameters = getParameters(schoolId, school);

            // format a URL for the Pelias document-service
            HttpGet httpGet = new HttpGet(documentServiceUrl + URLEncodedUtils.format(parameters, "utf8"));

            // execute the document-service request
            CloseableHttpResponse docServiceResponse = httpClient.execute(httpGet);

            String synthesizedDoc = EntityUtils.toString(docServiceResponse.getEntity());

            if (docServiceResponse.getStatusLine().getStatusCode() == 200) {
                // if the document-service request was successful, send the doc to Elasticsearch
                IndexResponse indexResponse = reqBuilder.setId(schoolId).setSource(synthesizedDoc).get();

                successCount++;

            } else {
                System.out.println(String.format("could not create/update id %s: %s", schoolId, synthesizedDoc));

            }

            docServiceResponse.close();

        }

        System.out.println(String.format("processed %d of %d schools", successCount, schools.length()));

        elasticSearchClient.close();

    }

    // helper function that pulls collects various school properties into a list of parameters
    private List<NameValuePair> getParameters(String schoolId, JSONObject source) {
        JSONObject properties = source.getJSONObject("properties");
        JSONArray point = source.getJSONObject("geometry").getJSONArray("coordinates");

        // matches "1" and "Main Street" from "1 Main Street"
        Pattern addressPattern = Pattern.compile("^(\\d+) (.+)$");

        // attempt match against ADDRESS field
        Matcher addressMatcher = addressPattern.matcher(properties.getString("ADDRESS"));

        List<NameValuePair> parameters = new ArrayList<NameValuePair>();

        // only continue if there's a house number and street
        if (addressMatcher.matches()) {
            String name        = properties.getString("SCH_LABEL");
            Double lon         = point.getDouble(0);
            Double lat         = point.getDouble(1);
            String houseNumber = addressMatcher.group(1);
            String street      = addressMatcher.group(0);
            String postcode    = properties.getString("ZIPCODE");

            parameters.add(new BasicNameValuePair("id",           schoolId));
            parameters.add(new BasicNameValuePair("name",         name));
            parameters.add(new BasicNameValuePair("lat",          Double.toString(lat)));
            parameters.add(new BasicNameValuePair("lon",          Double.toString(lon)));
            parameters.add(new BasicNameValuePair("house_number", houseNumber));
            parameters.add(new BasicNameValuePair("street",       street));
            parameters.add(new BasicNameValuePair("postcode",     postcode));

        }

        return parameters;

    }

}
