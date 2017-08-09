const app = require('express')();
const _ = require('lodash');
const Router = require('express').Router;
const adminLookup = require('pelias-wof-admin-lookup');
const Document = require( 'pelias-model' ).Document;
const fs = require('fs');
const path = require('path');
const morgan = require( 'morgan' );
const through = require( 'through2' );

// helper that converts a string to a number if parseable, throws error otherwise
function toFiniteNumber(field, value) {
  if (!_.isEmpty(_.trim(value)) && _.isFinite(_.toNumber(value))) {
    return _.toNumber(value);
  }
  throw `cannot parse ${field} as finite number`;
}

// validation middleware, additionally performs layer-specific checks
const validate = (req, res, next) => {
  // there are probably better ways to organize this validation middleware

  // validate that lat/lon are numbers and convert
  try {
    req.query.lat = toFiniteNumber('lat', req.query.lat);
    req.query.lon = toFiniteNumber('lon', req.query.lon);

  } catch (err) {
    // if either lat or lon are not parseable as finite numbers, then bail early
    res.setHeader('content-type', 'text/plain');
    res.status(400).send(err);
    // skip PiP lookup and output middlewares
    return next('route');
  }

  if (!_.isString(req.query.name) || _.isEmpty(_.trim(req.query.name))) {
    res.setHeader('content-type', 'text/plain');
    res.status(400).send('name parameter is required');
    // skip PiP lookup and output middlewares
    return next('route');
  }

  if (!_.isString(req.query.id) || _.isEmpty(_.trim(req.query.id))) {
    res.setHeader('content-type', 'text/plain');
    res.status(400).send('id parameter is required');
    // skip PiP lookup and output middlewares
    return next('route');
  }

  if (req.params.layer === 'address') {
    // address layer-specific tests:
    // - house_number is required
    // - street is required
    if (_.isEmpty(_.trim(req.query.house_number))) {
      res.setHeader('content-type', 'text/plain');
      res.status(400).send('house_number parameter is required for address layer');
      // skip PiP lookup and output middlewares
      return next('route');
    }

    if (_.isEmpty(_.trim(req.query.street))) {
      res.setHeader('content-type', 'text/plain');
      res.status(400).send('street parameter is required for address layer');
      // skip PiP lookup and output middlewares
      return next('route');
    }

  } else if (req.params.layer === 'street') {
    // street layer-specific tests:
    // - house_number is not allowed
    // - street is required
    if (!_.isEmpty(req.query.house_number)) {
      res.setHeader('content-type', 'text/plain');
      res.status(400).send('house_number parameter is not applicable for street layer');
      // skip PiP lookup and output middlewares
      return next('route');
    }

    if (_.isEmpty(_.trim(req.query.street))) {
      res.setHeader('content-type', 'text/plain');
      res.status(400).send('street parameter is required for street layer');
      // skip PiP lookup and output middlewares
      return next('route');
    }

  } else if (req.params.layer === 'venue') {
    // venue layer-specific tests:
    // - street is required when house_number is supplied
    if (!_.isEmpty(req.query.house_number) && _.isEmpty(_.trim(req.query.street))) {
      res.setHeader('content-type', 'text/plain');
      res.status(400).send('house_number parameter is required when street is supplied for venue layer');
      // skip PiP lookup and output middlewares
      return next('route');
    }
  }

  // both lat and lon are non-blank finite numbers, so validation step passes
  next();

};

// generate an initial doc from source, layer, id, name, and address parts
const generate = (req, res, next) => {
  const doc = new Document( req.params.source, req.params.layer, _.trim(req.query.id) );
  doc.setName( 'default', _.trim(req.query.name) );
  doc.setCentroid({
    lat: req.query.lat,
    lon: req.query.lon
  });
  if (!_.isEmpty(_.trim(req.query.house_number))) {
    doc.setAddress('number', _.trim(req.query.house_number));
  }
  if (!_.isEmpty(_.trim(req.query.street))) {
    doc.setAddress('street', _.trim(req.query.street));
  }
  if (!_.isEmpty(_.trim(req.query.postcode))) {
    doc.setAddress('zip', _.trim(req.query.postcode));
  }

  req.query.doc = doc;
  next();

};

// perform PiP lookup and populate administrative hierarchy when no errors
function lookup(pointInPoly) {
  return (req, res, next) => {
    // async PiP lookup, no layers
    pointInPoly.lookup(req.query.doc.getCentroid(), undefined, (err, result) => {
      if (err) {
        // bail early if there's an error
        res.setHeader('content-type', 'text/plain');
        res.status(500).send(err);
        // skip output middleware
        return next('route');
      }

      // iterate the layers, adding administrative hierarchy id/name/abbreviation
      _.keys(result).forEach((layer) => {
        req.query.doc.addParent(
          layer,
          result[layer][0].name,
          result[layer][0].id.toString(),
          result[layer][0].abbr);
      });

      next();
    });
  };
}

// convert the doc to an Elasticsearch doc and output as JSON
const output = (req, res, next) => {
  // success!
  res.status(200).send(req.query.doc.toESDocument().data);
  next();
};

// log the request
function log() {
  morgan.token('url', (req, res) => {
    return req.originalUrl;
  });

  return morgan('combined', {
    stream: through( function write( ln, _, next ){
      console.log( ln.toString().trim() );
      next();
    })
  });
}

module.exports = (datapath) => {
  // verify the WOF data structure first (must contain data and meta directories)
  if (!['meta', 'data'].every(sub => fs.existsSync(path.join(datapath, sub)))) {
    throw Error(`${datapath} does not contain Who's on First data`);
  }

  // setup the PiP resolver
  const pointInPoly = adminLookup.resolver(datapath);

  const router = new Router();
  // steps for successful document synthesis:
  // 1. validate all required parameters
  // 2. generate the initial document
  // 3. populate the administrative hierarchy from a PiP call
  // 4. output the synthesized document
  router.get('/synthesize/:source/:layer(venue|address|street)', validate, generate, lookup(pointInPoly), output);

  // make sure that logging happens first
  app.use(log(), router);
  return app;

};
