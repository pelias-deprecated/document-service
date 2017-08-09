const tape = require('tape');
const request = require('superagent');
const proxyquire = require('proxyquire').noCallThru();
const fs = require('fs');
const path = require('path');
const temp = require('temp').track();
const mocklogger = require('pelias-mock-logger');

tape('initialization tests', test => {
  test.test('non-existent whosonfirst directory should throw error', t => {
    t.throws(() => {
      proxyquire('../app', {
        'pelias-wof-admin-lookup': {
          resolver: (datapath) => {
            t.fail('resolver should not have been called');
          }
        }
      })('directory_that_does_not_exist');

    }, /directory_that_does_not_exist does not contain Who's on First data/);

    t.end();

  });

  test.test('non-existent whosonfirst/data directory should throw error', t => {
    temp.mkdir('whosonfirst', (err, temp_dir) => {
      t.throws(() => {
        fs.mkdirSync(path.join(temp_dir, 'meta'));

        const app = proxyquire('../app', {
          'pelias-wof-admin-lookup': {
            resolver: (datapath) => {
              t.fail('resolver should not have been called');
            }
          }
        })(temp_dir);

      }, new RegExp(`${temp_dir} does not contain Who's on First data`));

      t.end();
      temp.cleanupSync();

    });

  });

  test.test('non-existent whosonfirst/meta directory should throw error', t => {
    temp.mkdir('whosonfirst', (err, temp_dir) => {
      t.throws(() => {
        fs.mkdirSync(path.join(temp_dir, 'data'));

        const app = proxyquire('../app', {
          'pelias-wof-admin-lookup': {
            resolver: (datapath) => {
              t.fail('resolver should not have been called');
            }
          }
        })(temp_dir);

      }, new RegExp(`${temp_dir} does not contain Who's on First data`));

      t.end();
      temp.cleanupSync();

    });

  });

});

tape('/synthesize error conditions', test => {
  test.test('request missing layer in path should return 404', t => {
    const logger = mocklogger();

    temp.mkdir('whosonfirst', (err, temp_dir) => {
      t.notOk(err);

      fs.mkdirSync(path.join(temp_dir, 'data'));
      fs.mkdirSync(path.join(temp_dir, 'meta'));

      const app = proxyquire('../app', {
        'pelias-wof-admin-lookup': {
          resolver: (datapath) => {
            t.equals(datapath, temp_dir);
            return {
              lookup: t.fail.bind('resolver should not have been called')
            };
          }
        },
        'pelias-logger': logger
      })(temp_dir);
      const server = app.listen();
      const port = server.address().port;

      const parameters = {
        id: 'id value',
        name: 'name value',
        lat: 12.121212,
        lon: 21.212121,
        house_number: 'house_number value',
        street: 'street value',
        postalcode: 'postalcode value'
      };

      request
        .get(`http://localhost:${port}/synthesize/datasource`)
        .query(parameters)
        .on('error', (err) => {
          t.equals(err.status, 404);
        })
        .end((err, response) => {
          t.end();
          server.close();
          temp.cleanupSync();
        });

    });

  });

  test.test('request with layer other than street, address, or venue layer should return 404', t => {
    const logger = mocklogger();

    temp.mkdir('whosonfirst', (err, temp_dir) => {
      t.notOk(err);

      fs.mkdirSync(path.join(temp_dir, 'data'));
      fs.mkdirSync(path.join(temp_dir, 'meta'));

      const app = proxyquire('../app', {
        'pelias-wof-admin-lookup': {
          resolver: (datapath) => {
            t.equals(datapath, temp_dir);
            return {
              lookup: t.fail.bind('resolver should not have been called')
            };
          }
        },
        'pelias-logger': logger
      })(temp_dir);
      const server = app.listen();
      const port = server.address().port;

      const parameters = {
        id: 'id value',
        name: 'name value',
        lat: 12.121212,
        lon: 21.212121,
        house_number: 'house_number value',
        street: 'street value',
        postalcode: 'postalcode value'
      };

      request
        .get(`http://localhost:${port}/synthesize/datasource/not_address_street_or_venue`)
        .query(parameters)
        .on('error', (err) => {
          t.equals(err.status, 404);
        })
        .end((err, response) => {
          t.end();
          server.close();
          temp.cleanupSync();
        });

    });

  });

  test.test('all layers: non-blank/finite lat should return 400', t => {
    ['venue', 'address', 'street'].forEach(layer => {
      ['a', NaN, Infinity, '{}', false, null, undefined, ' '].forEach(bad_lat_value => {
        const logger = mocklogger();

        temp.mkdir('whosonfirst', (err, temp_dir) => {
          t.notOk(err);

          fs.mkdirSync(path.join(temp_dir, 'data'));
          fs.mkdirSync(path.join(temp_dir, 'meta'));

          const app = proxyquire('../app', {
            'pelias-wof-admin-lookup': {
              resolver: (datapath) => {
                t.equals(datapath, temp_dir);
                return {
                  lookup: t.fail.bind('resolver should not have been called')
                };
              }
            },
            'pelias-logger': logger
          })(temp_dir);

          const server = app.listen();
          const port = server.address().port;

          const parameters = {
            id: 'id value',
            name: 'name value',
            lat: bad_lat_value,
            lon: 21.212121
          };

          request
            .get(`http://localhost:${port}/synthesize/datasource/${layer}`)
            .query(parameters)
            .end((err, response) => {
              t.equals(err.status, 400);
              t.equals(response.type, 'text/plain');
              t.equals(response.text, 'cannot parse lat as finite number');
              server.close();
              temp.cleanupSync();
            });

        });

      });

    });

    t.end();

  });

  test.test('all layers: non-blank/finite lon should return 400', t => {
    ['venue', 'address', 'street'].forEach(layer => {
      ['a', NaN, Infinity, '{}', false, null, undefined, ' '].forEach(bad_lon_value => {
        const logger = mocklogger();

        temp.mkdir('whosonfirst', (err, temp_dir) => {
          t.notOk(err);

          fs.mkdirSync(path.join(temp_dir, 'data'));
          fs.mkdirSync(path.join(temp_dir, 'meta'));

          const app = proxyquire('../app', {
            'pelias-wof-admin-lookup': {
              resolver: (datapath) => {
                t.equals(datapath, temp_dir);
                return {
                  lookup: t.fail.bind('resolver should not have been called')
                };
              }
            },
            'pelias-logger': logger
          })(temp_dir);

          const server = app.listen();
          const port = server.address().port;

          const parameters = {
            id: 'id value',
            name: 'name value',
            lat: 12.121212,
            lon: bad_lon_value
          };

          request
            .get(`http://localhost:${port}/synthesize/datasource/${layer}`)
            .query(parameters)
            .end((err, response) => {
              t.equals(err.status, 400);
              t.equals(response.type, 'text/plain');
              t.equals(response.text, 'cannot parse lon as finite number');
              server.close();
              temp.cleanupSync();
            });

        });

      });

    });

    t.end();

  });

  test.test('all layers: nonexistent or blank name should return 400', t => {
    ['venue', 'address', 'street'].forEach(layer => {
      [undefined, ' '].forEach(bad_name_value => {
        const logger = mocklogger();

        temp.mkdir('whosonfirst', (err, temp_dir) => {
          t.notOk(err);

          fs.mkdirSync(path.join(temp_dir, 'data'));
          fs.mkdirSync(path.join(temp_dir, 'meta'));

          const app = proxyquire('../app', {
            'pelias-wof-admin-lookup': {
              resolver: (datapath) => {
                t.equals(datapath, temp_dir);
                return {
                  lookup: t.fail.bind('resolver should not have been called')
                };
              }
            },
            'pelias-logger': logger
          })(temp_dir);

          const server = app.listen();
          const port = server.address().port;

          const parameters = {
            id: 'id value',
            name: bad_name_value,
            lat: 12.121212,
            lon: 21.212121
          };

          request
            .get(`http://localhost:${port}/synthesize/datasource/${layer}`)
            .query(parameters)
            .end((err, response) => {
              t.equals(err.status, 400);
              t.equals(response.type, 'text/plain');
              t.equals(response.text, 'name parameter is required');
              server.close();
              temp.cleanupSync();
            });

        });

      });

    });

    t.end();

  });

  test.test('all layers: nonexistent or blank id should return 400', t => {
    ['venue', 'address', 'street'].forEach(layer => {
      [undefined, ' '].forEach(bad_id_value => {
        const logger = mocklogger();

        temp.mkdir('whosonfirst', (err, temp_dir) => {
          t.notOk(err);

          fs.mkdirSync(path.join(temp_dir, 'data'));
          fs.mkdirSync(path.join(temp_dir, 'meta'));

          const app = proxyquire('../app', {
            'pelias-wof-admin-lookup': {
              resolver: (datapath) => {
                t.equals(datapath, temp_dir);
                return {
                  lookup: t.fail.bind('resolver should not have been called')
                };
              }
            },
            'pelias-logger': logger
          })(temp_dir);

          const server = app.listen();
          const port = server.address().port;

          const parameters = {
            id: bad_id_value,
            name: 'name value',
            lat: 12.121212,
            lon: 21.212121
          };

          request
            .get(`http://localhost:${port}/synthesize/datasource/${layer}`)
            .query(parameters)
            .end((err, response) => {
              t.equals(err.status, 400);
              t.equals(response.type, 'text/plain');
              t.equals(response.text, 'id parameter is required');
              server.close();
              temp.cleanupSync();
            });

        });

      });

    });

    t.end();

  });

  test.test('address layer: missing house_number should return 400', t => {
    [undefined, ' '].forEach(house_number => {
      const logger = mocklogger();

      temp.mkdir('whosonfirst', (err, temp_dir) => {
        t.notOk(err);

        fs.mkdirSync(path.join(temp_dir, 'data'));
        fs.mkdirSync(path.join(temp_dir, 'meta'));

        const app = proxyquire('../app', {
          'pelias-wof-admin-lookup': {
            resolver: (datapath) => {
              t.equals(datapath, temp_dir);
              return {
                lookup: t.fail.bind('resolver should not have been called')
              };
            }
          },
          'pelias-logger': logger
        })(temp_dir);
        const server = app.listen();
        const port = server.address().port;

        const parameters = {
          id: 'id value',
          name: 'name value',
          lat: 12.121212,
          lon: 21.212121,
          house_number: house_number,
          street: 'street value'
        };

        request
          .get(`http://localhost:${port}/synthesize/datasource/address`)
          .query(parameters)
          .end((err, response) => {
            t.ok(err, 'there should have been an error');
            t.equals(response.statusCode, 400);
            t.equals(response.type, 'text/plain');
            t.equals(response.text, 'house_number parameter is required for address layer');
            server.close();
            temp.cleanupSync();
          });

      });

    });

    t.end();

  });

  test.test('address layer: missing street should return 400', t => {
    [undefined, ' '].forEach(street => {
      const logger = mocklogger();

      temp.mkdir('whosonfirst', (err, temp_dir) => {
        t.notOk(err);

        fs.mkdirSync(path.join(temp_dir, 'data'));
        fs.mkdirSync(path.join(temp_dir, 'meta'));

        const app = proxyquire('../app', {
          'pelias-wof-admin-lookup': {
            resolver: (datapath) => {
              t.equals(datapath, temp_dir);
              return {
                lookup: t.fail.bind('resolver should not have been called')
              };
            }
          },
          'pelias-logger': logger
        })(temp_dir);
        const server = app.listen();
        const port = server.address().port;

        const parameters = {
          id: 'id value',
          name: 'name value',
          lat: 12.121212,
          lon: 21.212121,
          house_number: 'house_number value',
          street: street
        };

        request
          .get(`http://localhost:${port}/synthesize/datasource/address`)
          .query(parameters)
          .end((err, response) => {
            t.ok(err, 'there should have been an error');
            t.equals(response.statusCode, 400);
            t.equals(response.type, 'text/plain');
            t.equals(response.text, 'street parameter is required for address layer');
            server.close();
            temp.cleanupSync();
          });

      });

    });

    t.end();

  });

  test.test('street layer: house_number supplied should return 400', t => {
    const logger = mocklogger();

    temp.mkdir('whosonfirst', (err, temp_dir) => {
      t.notOk(err);

      fs.mkdirSync(path.join(temp_dir, 'data'));
      fs.mkdirSync(path.join(temp_dir, 'meta'));

      const app = proxyquire('../app', {
        'pelias-wof-admin-lookup': {
          resolver: (datapath) => {
            t.equals(datapath, temp_dir);
            return {
              lookup: t.fail.bind('resolver should not have been called')
            };
          }
        },
        'pelias-logger': logger
      })(temp_dir);
      const server = app.listen();
      const port = server.address().port;

      const parameters = {
        id: 'id value',
        name: 'name value',
        lat: 12.121212,
        lon: 21.212121,
        house_number: 'house_number value',
        street: 'street value'
      };

      request
        .get(`http://localhost:${port}/synthesize/datasource/street`)
        .query(parameters)
        .end((err, response) => {
          t.ok(err, 'there should have been an error');
          t.equals(response.statusCode, 400);
          t.equals(response.type, 'text/plain');
          t.equals(response.text, 'house_number parameter is not applicable for street layer');
          t.end();
          server.close();
          temp.cleanupSync();
        });

    });

  });

  test.test('street layer: missing street should return 400', t => {
    [undefined, ' '].forEach(street => {
      const logger = mocklogger();

      temp.mkdir('whosonfirst', (err, temp_dir) => {
        t.notOk(err);

        fs.mkdirSync(path.join(temp_dir, 'data'));
        fs.mkdirSync(path.join(temp_dir, 'meta'));

        const app = proxyquire('../app', {
          'pelias-wof-admin-lookup': {
            resolver: (datapath) => {
              t.equals(datapath, temp_dir);
              return {
                lookup: t.fail.bind('resolver should not have been called')
              };
            }
          },
          'pelias-logger': logger
        })(temp_dir);
        const server = app.listen();
        const port = server.address().port;

        const parameters = {
          id: 'id value',
          name: 'name value',
          lat: 12.121212,
          lon: 21.212121,
          street: street
        };

        request
          .get(`http://localhost:${port}/synthesize/datasource/street`)
          .query(parameters)
          .end((err, response) => {
            t.ok(err, 'there should have been an error');
            t.equals(response.statusCode, 400);
            t.equals(response.type, 'text/plain');
            t.equals(response.text, 'street parameter is required for street layer');
            server.close();
            temp.cleanupSync();
          });

      });

    });

    t.end();

  });

  test.test('venue layer: house_number supplied but missing street should return 400', t => {
    [undefined, ' '].forEach(street => {
      const logger = mocklogger();

      temp.mkdir('whosonfirst', (err, temp_dir) => {
        t.notOk(err);

        fs.mkdirSync(path.join(temp_dir, 'data'));
        fs.mkdirSync(path.join(temp_dir, 'meta'));

        const app = proxyquire('../app', {
          'pelias-wof-admin-lookup': {
            resolver: (datapath) => {
              t.equals(datapath, temp_dir);
              return {
                lookup: t.fail.bind('resolver should not have been called')
              };
            }
          },
          'pelias-logger': logger
        })(temp_dir);
        const server = app.listen();
        const port = server.address().port;

        const parameters = {
          id: 'id value',
          name: 'name value',
          lat: 12.121212,
          lon: 21.212121,
          house_number: 'house_number value',
          street: street
        };

        request
          .get(`http://localhost:${port}/synthesize/datasource/venue`)
          .query(parameters)
          .end((err, response) => {
            t.ok(err, 'there should have been an error');
            t.equals(response.statusCode, 400);
            t.equals(response.type, 'text/plain');
            t.equals(response.text, 'house_number parameter is required when street is supplied for venue layer');
            server.close();
            temp.cleanupSync();
          });

      });

    });

    t.end();

  });

  test.test('PiP resolver throwing error should return 500 and text/plain message', t => {
    const logger = mocklogger();

    temp.mkdir('whosonfirst', (err, temp_dir) => {
      t.notOk(err);

      fs.mkdirSync(path.join(temp_dir, 'data'));
      fs.mkdirSync(path.join(temp_dir, 'meta'));

      const app = proxyquire('../app', {
        'pelias-wof-admin-lookup': {
          resolver: (datapath) => {
            t.equals(datapath, temp_dir);
            return {
              lookup: (centroid, layers, callback) => {
                t.deepEquals(centroid, { lat: 12.121212, lon: 21.212121 });
                t.deepEquals(layers, undefined);

                const lookup_response = {
                  country: [
                    {
                      id: 18,
                      name: 'country name',
                      abbr: 'country abbr'
                    }
                  ]
                };

                // pass back the error and a response anyway to show that it's ignored
                callback('a PiP error occurred', lookup_response);
              }
            };
          }
        },
        'pelias-logger': logger
      })(temp_dir);
      const server = app.listen();
      const port = server.address().port;

      const parameters = {
        id: 'id value',
        name: 'name value',
        lat: 12.121212,
        lon: 21.212121,
        house_number: 'house_number value',
        street: 'street value',
        postcode: 'postalcode value'
      };

      request
        .get(`http://localhost:${port}/synthesize/datasource/address`)
        .accept('json')
        .query(parameters)
        .end((err, response) => {
          t.ok(err, 'there should have been an error');
          t.equals(response.statusCode, 500);
          t.equals(response.type, 'text/plain');
          t.equals(response.text, 'a PiP error occurred');
          t.end();
          server.close();
          temp.cleanupSync();

        });

    });

  });

});

tape('/synthesize venue success conditions ', test => {
  test.test('venue layer: all valid required fields should call lookup and return result with input parameters trimmed', t => {
    const logger = mocklogger();

    temp.mkdir('whosonfirst', (err, temp_dir) => {
      t.notOk(err);

      fs.mkdirSync(path.join(temp_dir, 'data'));
      fs.mkdirSync(path.join(temp_dir, 'meta'));

      const app = proxyquire('../app', {
        'pelias-wof-admin-lookup': {
          resolver: (datapath) => {
            t.equals(datapath, temp_dir);
            return {
              lookup: (centroid, layers, callback) => {
                t.deepEquals(centroid, { lat: 12.121212, lon: 21.212121 });
                t.deepEquals(layers, undefined);

                const lookup_response = {
                  'region': [
                    {
                      'id': 17,
                      'name': 'region name'
                    }
                  ],
                  'country': [
                    {
                      'id': 18,
                      'name': 'country name',
                      'abbr': 'country abbr'
                    }
                  ]
                };

                callback(undefined, lookup_response);
              }
            };
          }
        },
        'pelias-logger': logger
      })(temp_dir);
      const server = app.listen();
      const port = server.address().port;

      const parameters = {
        id: 'id value ',
        name: ' name value ',
        lat: 12.121212,
        lon: 21.212121,
        house_number: ' house_number value ',
        street: ' street value ',
        postcode: ' postalcode value '
      };

      request
        .get(`http://localhost:${port}/synthesize/datasource/venue`)
        .accept('json')
        .query(parameters)
        .end((err, response) => {
          t.notOk(err);
          t.equals(response.statusCode, 200);
          t.deepEquals(response.body, {
            name: {
              default: 'name value',
            },
            phrase: {
              default: 'name value'
            },
            center_point: {
              lat: 12.121212,
              lon: 21.212121
            },
            source: 'datasource',
            layer: 'venue',
            source_id: 'id value',
            address_parts: {
              number: 'house_number value',
              street: 'street value',
              zip: 'postalcode value'
            },
            parent: {
              region: ['region name'],
              region_id: ['17'],
              region_a: [null],
              country: ['country name'],
              country_id: ['18'],
              country_a: ['country abbr']
            }
          });
          t.end();
          server.close();
          temp.cleanupSync();

        });

    });

  });

  test.test('postalcode should be optional', t => {
    const logger = mocklogger();

    temp.mkdir('whosonfirst', (err, temp_dir) => {
      t.notOk(err);

      fs.mkdirSync(path.join(temp_dir, 'data'));
      fs.mkdirSync(path.join(temp_dir, 'meta'));

      const app = proxyquire('../app', {
        'pelias-wof-admin-lookup': {
          resolver: (datapath) => {
            t.equals(datapath, temp_dir);
            return {
              lookup: (centroid, layers, callback) => {
                t.deepEquals(centroid, { lat: 12.121212, lon: 21.212121 });
                t.deepEquals(layers, undefined);

                const lookup_response = {
                  'region': [
                    {
                      'id': 17,
                      'name': 'region name'
                    }
                  ],
                  'country': [
                    {
                      'id': 18,
                      'name': 'country name',
                      'abbr': 'country abbr'
                    }
                  ]
                };

                callback(undefined, lookup_response);
              }
            };
          }
        },
        'pelias-logger': logger
      })(temp_dir);
      const server = app.listen();
      const port = server.address().port;

      const parameters = {
        id: 'id value',
        name: 'name value',
        lat: 12.121212,
        lon: 21.212121,
        house_number: 'house_number value',
        street: 'street value'
      };

      request
        .get(`http://localhost:${port}/synthesize/datasource/venue`)
        .accept('json')
        .query(parameters)
        .end((err, response) => {
          t.notOk(err);
          t.equals(response.statusCode, 200);
          t.deepEquals(response.body, {
            name: {
              default: 'name value',
            },
            phrase: {
              default: 'name value'
            },
            center_point: {
              lat: 12.121212,
              lon: 21.212121
            },
            source: 'datasource',
            layer: 'venue',
            source_id: 'id value',
            address_parts: {
              number: 'house_number value',
              street: 'street value'
            },
            parent: {
              region: ['region name'],
              region_id: ['17'],
              region_a: [null],
              country: ['country name'],
              country_id: ['18'],
              country_a: ['country abbr']
            }
          });
          t.end();
          server.close();
          temp.cleanupSync();

        });

    });

  });

});

tape('/synthesize address success conditions ', test => {
  test.test('address layer: all valid required fields should call lookup and return result', t => {
    const logger = mocklogger();

    temp.mkdir('whosonfirst', (err, temp_dir) => {
      t.notOk(err);

      fs.mkdirSync(path.join(temp_dir, 'data'));
      fs.mkdirSync(path.join(temp_dir, 'meta'));

      const app = proxyquire('../app', {
        'pelias-wof-admin-lookup': {
          resolver: (datapath) => {
            t.equals(datapath, temp_dir);
            return {
              lookup: (centroid, layers, callback) => {
                t.deepEquals(centroid, { lat: 12.121212, lon: 21.212121 });
                t.deepEquals(layers, undefined);

                const lookup_response = {
                  'region': [
                    {
                      'id': 17,
                      'name': 'region name'
                    }
                  ],
                  'country': [
                    {
                      'id': 18,
                      'name': 'country name',
                      'abbr': 'country abbr'
                    }
                  ]
                };

                callback(undefined, lookup_response);
              }
            };
          }
        },
        'pelias-logger': logger
      })(temp_dir);
      const server = app.listen();
      const port = server.address().port;

      const parameters = {
        id: ' id value ',
        name: ' name value ',
        lat: 12.121212,
        lon: 21.212121,
        house_number: ' house_number value ',
        street: ' street value',
        postcode: ' postalcode value '
      };

      request
        .get(`http://localhost:${port}/synthesize/datasource/address`)
        .accept('json')
        .query(parameters)
        .end((err, response) => {
          t.notOk(err);
          t.equals(response.statusCode, 200);
          t.deepEquals(response.body, {
            name: {
              default: 'name value',
            },
            phrase: {
              default: 'name value'
            },
            center_point: {
              lat: 12.121212,
              lon: 21.212121
            },
            source: 'datasource',
            layer: 'address',
            source_id: 'id value',
            address_parts: {
              number: 'house_number value',
              street: 'street value',
              zip: 'postalcode value'
            },
            parent: {
              region: ['region name'],
              region_id: ['17'],
              region_a: [null],
              country: ['country name'],
              country_id: ['18'],
              country_a: ['country abbr']
            }
          });
          t.end();
          server.close();
          temp.cleanupSync();

        });

    });

  });

  test.test('postalcode should be optional', t => {
    const logger = mocklogger();

    temp.mkdir('whosonfirst', (err, temp_dir) => {
      t.notOk(err);

      fs.mkdirSync(path.join(temp_dir, 'data'));
      fs.mkdirSync(path.join(temp_dir, 'meta'));

      const app = proxyquire('../app', {
        'pelias-wof-admin-lookup': {
          resolver: (datapath) => {
            t.equals(datapath, temp_dir);
            return {
              lookup: (centroid, layers, callback) => {
                t.deepEquals(centroid, { lat: 12.121212, lon: 21.212121 });
                t.deepEquals(layers, undefined);

                const lookup_response = {
                  'region': [
                    {
                      'id': 17,
                      'name': 'region name'
                    }
                  ],
                  'country': [
                    {
                      'id': 18,
                      'name': 'country name',
                      'abbr': 'country abbr'
                    }
                  ]
                };

                callback(undefined, lookup_response);
              }
            };
          }
        },
        'pelias-logger': logger
      })(temp_dir);
      const server = app.listen();
      const port = server.address().port;

      const parameters = {
        id: 'id value',
        name: 'name value',
        lat: 12.121212,
        lon: 21.212121,
        house_number: 'house_number value',
        street: 'street value'
      };

      request
        .get(`http://localhost:${port}/synthesize/datasource/address`)
        .accept('json')
        .query(parameters)
        .end((err, response) => {
          t.notOk(err);
          t.equals(response.statusCode, 200);
          t.deepEquals(response.body, {
            name: {
              default: 'name value',
            },
            phrase: {
              default: 'name value'
            },
            center_point: {
              lat: 12.121212,
              lon: 21.212121
            },
            source: 'datasource',
            layer: 'address',
            source_id: 'id value',
            address_parts: {
              number: 'house_number value',
              street: 'street value'
            },
            parent: {
              region: ['region name'],
              region_id: ['17'],
              region_a: [null],
              country: ['country name'],
              country_id: ['18'],
              country_a: ['country abbr']
            }
          });
          t.end();
          server.close();
          temp.cleanupSync();

        });

    });

  });

});

tape('/synthesize street success conditions ', test => {
  test.test('all valid required fields should call lookup and return result', t => {
    const logger = mocklogger();

    temp.mkdir('whosonfirst', (err, temp_dir) => {
      t.notOk(err);

      fs.mkdirSync(path.join(temp_dir, 'data'));
      fs.mkdirSync(path.join(temp_dir, 'meta'));

      const app = proxyquire('../app', {
        'pelias-wof-admin-lookup': {
          resolver: (datapath) => {
            t.equals(datapath, temp_dir);
            return {
              lookup: (centroid, layers, callback) => {
                t.deepEquals(centroid, { lat: 12.121212, lon: 21.212121 });
                t.deepEquals(layers, undefined);

                const lookup_response = {
                  'region': [
                    {
                      'id': 17,
                      'name': 'region name'
                    }
                  ],
                  'country': [
                    {
                      'id': 18,
                      'name': 'country name',
                      'abbr': 'country abbr'
                    }
                  ]
                };

                callback(undefined, lookup_response);
              }
            };
          }
        },
        'pelias-logger': logger
      })(temp_dir);
      const server = app.listen();
      const port = server.address().port;

      const parameters = {
        id: ' id value ',
        name: ' name value ',
        lat: 12.121212,
        lon: 21.212121,
        street: ' street value ',
        postcode: ' postalcode value '
      };

      request
        .get(`http://localhost:${port}/synthesize/datasource/street`)
        .accept('json')
        .query(parameters)
        .end((err, response) => {
          t.notOk(err);
          t.equals(response.statusCode, 200);
          t.deepEquals(response.body, {
            name: {
              default: 'name value',
            },
            phrase: {
              default: 'name value'
            },
            center_point: {
              lat: 12.121212,
              lon: 21.212121
            },
            source: 'datasource',
            layer: 'street',
            source_id: 'id value',
            address_parts: {
              street: 'street value',
              zip: 'postalcode value'
            },
            parent: {
              region: ['region name'],
              region_id: ['17'],
              region_a: [null],
              country: ['country name'],
              country_id: ['18'],
              country_a: ['country abbr']
            }
          });
          t.end();
          server.close();
          temp.cleanupSync();

        });

    });

  });

  test.test('postalcode should be optional', t => {
    const logger = mocklogger();

    temp.mkdir('whosonfirst', (err, temp_dir) => {
      t.notOk(err);

      fs.mkdirSync(path.join(temp_dir, 'data'));
      fs.mkdirSync(path.join(temp_dir, 'meta'));

      const app = proxyquire('../app', {
        'pelias-wof-admin-lookup': {
          resolver: (datapath) => {
            t.equals(datapath, temp_dir);
            return {
              lookup: (centroid, layers, callback) => {
                t.deepEquals(centroid, { lat: 12.121212, lon: 21.212121 });
                t.deepEquals(layers, undefined);

                const lookup_response = {
                  'region': [
                    {
                      'id': 17,
                      'name': 'region name'
                    }
                  ],
                  'country': [
                    {
                      'id': 18,
                      'name': 'country name',
                      'abbr': 'country abbr'
                    }
                  ]
                };

                callback(undefined, lookup_response);
              }
            };
          }
        },
        'pelias-logger': logger
      })(temp_dir);
      const server = app.listen();
      const port = server.address().port;

      const parameters = {
        id: 'id value',
        name: 'name value',
        lat: 12.121212,
        lon: 21.212121,
        street: 'street value'
      };

      request
        .get(`http://localhost:${port}/synthesize/datasource/street`)
        .accept('json')
        .query(parameters)
        .end((err, response) => {
          t.notOk(err);
          t.equals(response.statusCode, 200);
          t.deepEquals(response.body, {
            name: {
              default: 'name value',
            },
            phrase: {
              default: 'name value'
            },
            center_point: {
              lat: 12.121212,
              lon: 21.212121
            },
            source: 'datasource',
            layer: 'street',
            source_id: 'id value',
            address_parts: {
              street: 'street value'
            },
            parent: {
              region: ['region name'],
              region_id: ['17'],
              region_a: [null],
              country: ['country name'],
              country_id: ['18'],
              country_a: ['country abbr']
            }
          });
          t.end();
          server.close();
          temp.cleanupSync();

        });

    });

  });

});
