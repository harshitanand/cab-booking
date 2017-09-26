!(e => {
  if ("object" == typeof exports && "undefined" != typeof module)
    module.exports = e();
  else if ("function" == typeof define && define.amd) define([], e);
  else {
    let f;
    "undefined" != typeof window
      ? (f = window)
      : "undefined" != typeof global
        ? (f = global)
        : "undefined" != typeof self && (f = self),
      ((f.L || (f.L = {})).Routing = e());
  }
})(() => {
  let define;
  let module;
  let exports;
  return (function e(t, n, r) {
    function s(o, u) {
      if (!n[o]) {
        if (!t[o]) {
          const a = typeof require == "function" && require;
          if (!u && a) return a(o, !0);
          if (i) return i(o, !0);
          const f = new Error(`Cannot find module '${o}'`);
          throw ((f.code = "MODULE_NOT_FOUND"), f);
        }
        const l = (n[o] = { exports: {} });
        t[o][0].call(
          l.exports,
          e => {
            const n = t[o][1][e];
            return s(n ? n : e);
          },
          l,
          l.exports,
          e,
          t,
          n,
          r
        );
      }
      return n[o].exports;
    }
    var i = typeof require == "function" && require;
    for (let o = 0; o < r.length; o++) s(r[o]);
    return s;
  })(
    {
      1: [
        (require, module, exports) => {
          function corslite(url, callback, cors) {
            let sent = false;

            if (typeof window.XMLHttpRequest === "undefined") {
              return callback(Error("Browser not supported"));
            }

            if (typeof cors === "undefined") {
              const m = url.match(/^\s*https?:\/\/[^\/]*/);
              cors =
                m &&
                m[0] !==
                  `${location.protocol}//${location.domain}${location.port
                    ? ":" + location.port
                    : ""}`;
            }

            let x = new window.XMLHttpRequest();

            function isSuccessful(status) {
              return (status >= 200 && status < 300) || status === 304;
            }

            if (cors && !("withCredentials" in x)) {
              // IE8-9
              x = new window.XDomainRequest();

              // Ensure callback is never called synchronously, i.e., before
              // x.send() returns (this has been observed in the wild).
              // See https://github.com/mapbox/mapbox.js/issues/472
              const original = callback;
              callback = function() {
                if (sent) {
                  original.apply(this, arguments);
                } else {
                  const that = this;
                  const args = arguments;
                  setTimeout(() => {
                    original.apply(that, args);
                  }, 0);
                }
              };
            }

            function loaded() {
              if (
                // XDomainRequest
                x.status === undefined ||
                // modern browsers
                isSuccessful(x.status)
              )
                callback.call(x, null, x);
              else callback.call(x, x, null);
            }

            // Both `onreadystatechange` and `onload` can fire. `onreadystatechange`
            // has [been supported for longer](http://stackoverflow.com/a/9181508/229001).
            if ("onload" in x) {
              x.onload = loaded;
            } else {
              x.onreadystatechange = function readystate() {
                if (x.readyState === 4) {
                  loaded();
                }
              };
            }

            // Call the callback with the XMLHttpRequest object as an error and prevent
            // it from ever being called again by reassigning it to `noop`
            x.onerror = function error(evt) {
              // XDomainRequest provides no evt parameter
              callback.call(this, evt || true, null);
              callback = () => {};
            };

            // IE9 must have onprogress be set to a unique function.
            x.onprogress = () => {};

            x.ontimeout = function(evt) {
              callback.call(this, evt, null);
              callback = () => {};
            };

            x.onabort = function(evt) {
              callback.call(this, evt, null);
              callback = () => {};
            };

            // GET is the only supported HTTP Verb by XDomainRequest and is the
            // only one supported here.
            x.open("GET", url, true);

            // Send the request. Sending data is not supported.
            x.send(null);
            sent = true;

            return x;
          }

          if (typeof module !== "undefined") module.exports = corslite;
        },
        {},
      ],
      2: [
        (require, module, exports) => {
          const polyline = {};

          // Based off of [the offical Google document](https://developers.google.com/maps/documentation/utilities/polylinealgorithm)
          //
          // Some parts from [this implementation](http://facstaff.unca.edu/mcmcclur/GoogleMaps/EncodePolyline/PolylineEncoder.js)
          // by [Mark McClure](http://facstaff.unca.edu/mcmcclur/)

          function encode(coordinate, factor) {
            coordinate = Math.round(coordinate * factor);
            coordinate <<= 1;
            if (coordinate < 0) {
              coordinate = ~coordinate;
            }
            let output = "";
            while (coordinate >= 0x20) {
              output += String.fromCharCode((0x20 | (coordinate & 0x1f)) + 63);
              coordinate >>= 5;
            }
            output += String.fromCharCode(coordinate + 63);
            return output;
          }

          // This is adapted from the implementation in Project-OSRM
          // https://github.com/DennisOSRM/Project-OSRM-Web/blob/master/WebContent/routing/OSRM.RoutingGeometry.js
          polyline.decode = (str, precision) => {
            let index = 0;
            let lat = 0;
            let lng = 0;
            const coordinates = [];
            let shift = 0;
            let result = 0;
            let byte = null;
            let latitude_change;
            let longitude_change;
            const factor = 10 ** (precision || 5);

            // Coordinates have variable length when encoded, so just keep
            // track of whether we've hit the end of the string. In each
            // loop iteration, a single coordinate is decoded.
            while (index < str.length) {
              // Reset shift, result, and byte
              byte = null;
              shift = 0;
              result = 0;

              do {
                byte = str.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
              } while (byte >= 0x20);

              latitude_change = result & 1 ? ~(result >> 1) : result >> 1;

              shift = result = 0;

              do {
                byte = str.charCodeAt(index++) - 63;
                result |= (byte & 0x1f) << shift;
                shift += 5;
              } while (byte >= 0x20);

              longitude_change = result & 1 ? ~(result >> 1) : result >> 1;

              lat += latitude_change;
              lng += longitude_change;

              coordinates.push([lat / factor, lng / factor]);
            }

            return coordinates;
          };

          polyline.encode = (coordinates, precision) => {
            if (!coordinates.length) return "";

            const factor = 10 ** (precision || 5);
            let output =
              encode(coordinates[0][0], factor) +
              encode(coordinates[0][1], factor);

            for (let i = 1; i < coordinates.length; i++) {
              const a = coordinates[i];
              const b = coordinates[i - 1];
              output += encode(a[0] - b[0], factor);
              output += encode(a[1] - b[1], factor);
            }

            return output;
          };

          if (typeof module !== undefined) module.exports = polyline;
        },
        {},
      ],
      3: [
        (require, module, exports) => {
          (() => {
            L.Routing = L.Routing || {};

            L.Routing.Autocomplete = L.Class.extend({
              options: {
                timeout: 500,
                blurTimeout: 100,
                noResultsMessage: "No results found.",
              },

              initialize(elem, callback, context, options) {
                L.setOptions(this, options);

                this._elem = elem;
                this._resultFn = options.resultFn
                  ? L.Util.bind(options.resultFn, options.resultContext)
                  : null;
                this._autocomplete = options.autocompleteFn
                  ? L.Util.bind(
                      options.autocompleteFn,
                      options.autocompleteContext
                    )
                  : null;
                this._selectFn = L.Util.bind(callback, context);
                this._container = L.DomUtil.create(
                  "div",
                  "leaflet-routing-geocoder-result"
                );
                this._resultTable = L.DomUtil.create(
                  "table",
                  "",
                  this._container
                );

                // TODO: looks a bit like a kludge to register same for input and keypress -
                // browsers supporting both will get duplicate events; just registering
                // input will not catch enter, though.
                L.DomEvent.addListener(
                  this._elem,
                  "input",
                  this._keyPressed,
                  this
                );
                L.DomEvent.addListener(
                  this._elem,
                  "keypress",
                  this._keyPressed,
                  this
                );
                L.DomEvent.addListener(
                  this._elem,
                  "keydown",
                  this._keyDown,
                  this
                );
                L.DomEvent.addListener(
                  this._elem,
                  "blur",
                  function() {
                    if (this._isOpen) {
                      this.close();
                    }
                  },
                  this
                );
              },

              close() {
                L.DomUtil.removeClass(
                  this._container,
                  "leaflet-routing-geocoder-result-open"
                );
                this._isOpen = false;
              },

              _open() {
                const rect = this._elem.getBoundingClientRect();
                if (!this._container.parentElement) {
                  this._container.style.left = `${rect.left +
                    window.scrollX}px`;
                  this._container.style.top = `${rect.bottom +
                    window.scrollY}px`;
                  this._container.style.width = `${rect.right - rect.left}px`;
                  document.body.appendChild(this._container);
                }

                L.DomUtil.addClass(
                  this._container,
                  "leaflet-routing-geocoder-result-open"
                );
                this._isOpen = true;
              },

              _setResults(results) {
                let i;
                let tr;
                let td;
                let text;

                delete this._selection;
                this._results = results;

                while (this._resultTable.firstChild) {
                  this._resultTable.removeChild(this._resultTable.firstChild);
                }

                for (i = 0; i < results.length; i++) {
                  tr = L.DomUtil.create("tr", "", this._resultTable);
                  tr.setAttribute("data-result-index", i);
                  td = L.DomUtil.create("td", "", tr);
                  text = document.createTextNode(results[i].name);
                  td.appendChild(text);
                  // mousedown + click because:
                  // http://stackoverflow.com/questions/10652852/jquery-fire-click-before-blur-event
                  L.DomEvent.addListener(
                    td,
                    "mousedown",
                    L.DomEvent.preventDefault
                  );
                  L.DomEvent.addListener(
                    td,
                    "click",
                    this._createClickListener(results[i])
                  );
                }

                if (!i) {
                  tr = L.DomUtil.create("tr", "", this._resultTable);
                  td = L.DomUtil.create(
                    "td",
                    "leaflet-routing-geocoder-no-results",
                    tr
                  );
                  td.innerHTML = this.options.noResultsMessage;
                }

                this._open();

                if (results.length > 0) {
                  // Select the first entry
                  this._select(1);
                }
              },

              _createClickListener(r) {
                const resultSelected = this._resultSelected(r);
                return L.bind(function() {
                  this._elem.blur();
                  resultSelected();
                }, this);
              },

              _resultSelected(r) {
                return L.bind(function() {
                  this.close();
                  this._elem.value = r.name;
                  this._lastCompletedText = r.name;
                  this._selectFn(r);
                }, this);
              },

              _keyPressed(e) {
                let index;

                if (this._isOpen && e.keyCode === 13 && this._selection) {
                  index = parseInt(
                    this._selection.getAttribute("data-result-index"),
                    10
                  );
                  this._resultSelected(this._results[index])();
                  L.DomEvent.preventDefault(e);
                  return;
                }

                if (e.keyCode === 13) {
                  this._complete(this._resultFn, true);
                  return;
                }

                if (
                  this._autocomplete &&
                  document.activeElement === this._elem
                ) {
                  if (this._timer) {
                    clearTimeout(this._timer);
                  }
                  this._timer = setTimeout(
                    L.Util.bind(function() {
                      this._complete(this._autocomplete);
                    }, this),
                    this.options.timeout
                  );
                  return;
                }

                this._unselect();
              },

              _select(dir) {
                let sel = this._selection;
                if (sel) {
                  L.DomUtil.removeClass(
                    sel.firstChild,
                    "leaflet-routing-geocoder-selected"
                  );
                  sel = sel[dir > 0 ? "nextSibling" : "previousSibling"];
                }
                if (!sel) {
                  sel = this._resultTable[dir > 0 ? "firstChild" : "lastChild"];
                }

                if (sel) {
                  L.DomUtil.addClass(
                    sel.firstChild,
                    "leaflet-routing-geocoder-selected"
                  );
                  this._selection = sel;
                }
              },

              _unselect() {
                if (this._selection) {
                  L.DomUtil.removeClass(
                    this._selection.firstChild,
                    "leaflet-routing-geocoder-selected"
                  );
                }
                delete this._selection;
              },

              _keyDown(e) {
                if (this._isOpen) {
                  switch (e.keyCode) {
                    // Escape
                    case 27:
                      this.close();
                      L.DomEvent.preventDefault(e);
                      return;
                    // Up
                    case 38:
                      this._select(-1);
                      L.DomEvent.preventDefault(e);
                      return;
                    // Down
                    case 40:
                      this._select(1);
                      L.DomEvent.preventDefault(e);
                      return;
                  }
                }
              },

              _complete(completeFn, trySelect) {
                const v = this._elem.value;
                function completeResults(results) {
                  this._lastCompletedText = v;
                  if (trySelect && results.length === 1) {
                    this._resultSelected(results[0])();
                  } else {
                    this._setResults(results);
                  }
                }

                if (!v) {
                  return;
                }

                if (v !== this._lastCompletedText) {
                  completeFn(v, completeResults, this);
                } else if (trySelect) {
                  completeResults.call(this, this._results);
                }
              },
            });
          })();
        },
        {},
      ],
      4: [
        function(require, module, exports) {
          (global => {
            (() => {
              const L =
                typeof window !== "undefined"
                  ? window.L
                  : typeof global !== "undefined" ? global.L : null;

              L.Routing = L.Routing || {};
              L.extend(L.Routing, require("./L.Routing.Itinerary"));
              L.extend(L.Routing, require("./L.Routing.Line"));
              L.extend(L.Routing, require("./L.Routing.Plan"));
              L.extend(L.Routing, require("./L.Routing.OSRM"));
              L.extend(L.Routing, require("./L.Routing.ErrorControl"));

              L.Routing.Control = L.Routing.Itinerary.extend({
                options: {
                  fitSelectedRoutes: "smart",
                  routeLine(route, options) {
                    return L.Routing.line(route, options);
                  },
                  autoRoute: true,
                  routeWhileDragging: false,
                  routeDragInterval: 500,
                  waypointMode: "connect",
                  useZoomParameter: false,
                  showAlternatives: false,
                },

                initialize(options) {
                  L.Util.setOptions(this, options);

                  this._router =
                    this.options.router || new L.Routing.OSRM(options);
                  this._plan =
                    this.options.plan ||
                    L.Routing.plan(this.options.waypoints, options);
                  this._requestCount = 0;

                  L.Routing.Itinerary.prototype.initialize.call(this, options);

                  this.on("routeselected", this._routeSelected, this);
                  this._plan.on(
                    "waypointschanged",
                    this._onWaypointsChanged,
                    this
                  );
                  if (options.routeWhileDragging) {
                    this._setupRouteDragging();
                  }

                  if (this.options.autoRoute) {
                    this.route();
                  }
                },

                onAdd(map) {
                  const container = L.Routing.Itinerary.prototype.onAdd.call(
                    this,
                    map
                  );

                  this._map = map;
                  this._map.addLayer(this._plan);

                  if (this.options.useZoomParameter) {
                    this._map.on(
                      "zoomend",
                      function() {
                        this.route({
                          callback: L.bind(this._updateLineCallback, this),
                        });
                      },
                      this
                    );
                  }

                  if (this._plan.options.geocoder) {
                    container.insertBefore(
                      this._plan.createGeocoders(),
                      container.firstChild
                    );
                  }

                  return container;
                },

                onRemove(map) {
                  if (this._line) {
                    map.removeLayer(this._line);
                  }
                  map.removeLayer(this._plan);
                  return L.Routing.Itinerary.prototype.onRemove.call(this, map);
                },

                getWaypoints() {
                  return this._plan.getWaypoints();
                },

                setWaypoints(waypoints) {
                  this._plan.setWaypoints(waypoints);
                  return this;
                },

                spliceWaypoints() {
                  const removed = this._plan.spliceWaypoints(...arguments);
                  return removed;
                },

                getPlan() {
                  return this._plan;
                },

                getRouter() {
                  return this._router;
                },

                _routeSelected(e) {
                  const route = e.route;
                  const alternatives =
                    this.options.showAlternatives && e.alternatives;
                  const fitMode = this.options.fitSelectedRoutes;

                  const fitBounds =
                    (fitMode === "smart" && !this._waypointsVisible()) ||
                    (fitMode !== "smart" && fitMode);

                  this._updateLines({ route, alternatives });

                  if (fitBounds) {
                    this._map.fitBounds(this._line.getBounds());
                  }

                  if (this.options.waypointMode === "snap") {
                    this._plan.off(
                      "waypointschanged",
                      this._onWaypointsChanged,
                      this
                    );
                    this.setWaypoints(route.waypoints);
                    this._plan.on(
                      "waypointschanged",
                      this._onWaypointsChanged,
                      this
                    );
                  }
                },

                _waypointsVisible() {
                  const wps = this.getWaypoints();
                  let mapSize;
                  let bounds;
                  let boundsSize;
                  let i;
                  let p;

                  try {
                    mapSize = this._map.getSize();

                    for (i = 0; i < wps.length; i++) {
                      p = this._map.latLngToLayerPoint(wps[i].latLng);

                      if (bounds) {
                        bounds.extend(p);
                      } else {
                        bounds = L.bounds([p]);
                      }
                    }

                    boundsSize = bounds.getSize();
                    return (
                      (boundsSize.x > mapSize.x / 5 ||
                        boundsSize.y > mapSize.y / 5) &&
                      this._waypointsInViewport()
                    );
                  } catch (e) {
                    return false;
                  }
                },

                _waypointsInViewport() {
                  const wps = this.getWaypoints();
                  let mapBounds;
                  let i;

                  try {
                    mapBounds = this._map.getBounds();
                  } catch (e) {
                    return false;
                  }

                  for (i = 0; i < wps.length; i++) {
                    if (mapBounds.contains(wps[i].latLng)) {
                      return true;
                    }
                  }

                  return false;
                },

                _updateLines(routes) {
                  const addWaypoints =
                    this.options.addWaypoints !== undefined
                      ? this.options.addWaypoints
                      : true;
                  this._clearLines();

                  // add alternatives first so they lie below the main route
                  this._alternatives = [];
                  if (routes.alternatives)
                    routes.alternatives.forEach(function(alt, i) {
                      this._alternatives[i] = this.options.routeLine(
                        alt,
                        L.extend(
                          {
                            isAlternative: true,
                          },
                          this.options.altLineOptions ||
                            this.options.lineOptions
                        )
                      );
                      this._alternatives[i].addTo(this._map);
                      this._hookAltEvents(this._alternatives[i]);
                    }, this);

                  this._line = this.options.routeLine(
                    routes.route,
                    L.extend(
                      {
                        addWaypoints,
                        extendToWaypoints:
                          this.options.waypointMode === "connect",
                      },
                      this.options.lineOptions
                    )
                  );
                  this._line.addTo(this._map);
                  this._hookEvents(this._line);
                },

                _hookEvents(l) {
                  l.on(
                    "linetouched",
                    function(e) {
                      this._plan.dragNewWaypoint(e);
                    },
                    this
                  );
                },

                _hookAltEvents(l) {
                  l.on(
                    "linetouched",
                    function(e) {
                      const alts = this._routes.slice();
                      const selected = alts.splice(
                        e.target._route.routesIndex,
                        1
                      )[0];
                      this.fire("routeselected", {
                        route: selected,
                        alternatives: alts,
                      });
                    },
                    this
                  );
                },

                _onWaypointsChanged(e) {
                  if (this.options.autoRoute) {
                    this.route({});
                  }
                  if (!this._plan.isReady()) {
                    this._clearLines();
                    this._clearAlts();
                  }
                  this.fire("waypointschanged", { waypoints: e.waypoints });
                },

                _setupRouteDragging() {
                  let timer = 0;
                  let waypoints;

                  this._plan.on(
                    "waypointdrag",
                    L.bind(function(e) {
                      waypoints = e.waypoints;

                      if (!timer) {
                        timer = setTimeout(
                          L.bind(function() {
                            this.route({
                              waypoints,
                              geometryOnly: true,
                              callback: L.bind(this._updateLineCallback, this),
                            });
                            timer = undefined;
                          }, this),
                          this.options.routeDragInterval
                        );
                      }
                    }, this)
                  );
                  this._plan.on(
                    "waypointdragend",
                    function() {
                      if (timer) {
                        clearTimeout(timer);
                        timer = undefined;
                      }
                      this.route();
                    },
                    this
                  );
                },

                _updateLineCallback(err, routes) {
                  if (!err) {
                    this._updateLines({
                      route: routes[0],
                      alternatives: routes.slice(1),
                    });
                  } else {
                    this._clearLines();
                  }
                },

                route(options) {
                  const ts = ++this._requestCount;
                  let wps;

                  options = options || {};

                  if (this._plan.isReady()) {
                    if (this.options.useZoomParameter) {
                      options.z = this._map && this._map.getZoom();
                    }

                    wps =
                      (options && options.waypoints) ||
                      this._plan.getWaypoints();
                    this.fire("routingstart", { waypoints: wps });
                    this._router.route(
                      wps,
                      options.callback ||
                        function(err, routes) {
                          // Prevent race among multiple requests,
                          // by checking the current request's timestamp
                          // against the last request's; ignore result if
                          // this isn't the latest request.
                          if (ts === this._requestCount) {
                            this._clearLines();
                            this._clearAlts();
                            if (err) {
                              this.fire("routingerror", { error: err });
                              return;
                            }

                            routes.forEach((route, i) => {
                              route.routesIndex = i;
                            });

                            if (!options.geometryOnly) {
                              this.fire("routesfound", {
                                waypoints: wps,
                                routes,
                              });
                              this.setAlternatives(routes);
                            } else {
                              const selectedRoute = routes.splice(0, 1)[0];
                              this._routeSelected({
                                route: selectedRoute,
                                alternatives: routes,
                              });
                            }
                          }
                        },
                      this,
                      options
                    );
                  }
                },

                _clearLines() {
                  if (this._line) {
                    this._map.removeLayer(this._line);
                    delete this._line;
                  }
                  if (this._alternatives && this._alternatives.length) {
                    for (const i in this._alternatives) {
                      this._map.removeLayer(this._alternatives[i]);
                    }
                    this._alternatives = [];
                  }
                },
              });

              L.Routing.control = options => new L.Routing.Control(options);

              module.exports = L.Routing;
            })();
          }).call(
            this,
            typeof global !== "undefined"
              ? global
              : typeof self !== "undefined"
                ? self
                : typeof window !== "undefined" ? window : {}
          );
        },
        {
          "./L.Routing.ErrorControl": 5,
          "./L.Routing.Itinerary": 8,
          "./L.Routing.Line": 10,
          "./L.Routing.OSRM": 12,
          "./L.Routing.Plan": 13,
        },
      ],
      5: [
        (require, module, exports) => {
          (() => {
            L.Routing = L.Routing || {};

            L.Routing.ErrorControl = L.Control.extend({
              options: {
                header: "Routing error",
                formatMessage(error) {
                  if (error.status < 0) {
                    return `Calculating the route caused an error. Technical description follows: <code><pre>${error.message}</pre></code`;
                  } else {
                    return `The route could not be calculated. ${error.message}`;
                  }
                },
              },

              initialize(routingControl, options) {
                L.Control.prototype.initialize.call(this, options);
                routingControl
                  .on(
                    "routingerror",
                    L.bind(function(e) {
                      if (this._element) {
                        this._element.children[1].innerHTML = this.options.formatMessage(
                          e.error
                        );
                        this._element.style.visibility = "visible";
                      }
                    }, this)
                  )
                  .on(
                    "routingstart",
                    L.bind(function() {
                      if (this._element) {
                        this._element.style.visibility = "hidden";
                      }
                    }, this)
                  );
              },

              onAdd() {
                let header;
                let message;

                this._element = L.DomUtil.create(
                  "div",
                  "leaflet-bar leaflet-routing-error"
                );
                this._element.style.visibility = "hidden";

                header = L.DomUtil.create("h3", null, this._element);
                message = L.DomUtil.create("span", null, this._element);

                header.innerHTML = this.options.header;

                return this._element;
              },

              onRemove() {
                delete this._element;
              },
            });

            L.Routing.errorControl = (routingControl, options) =>
              new L.Routing.ErrorControl(routingControl, options);
          })();
        },
        {},
      ],
      6: [
        function(require, module, exports) {
          (global => {
            (() => {
              const L =
                typeof window !== "undefined"
                  ? window.L
                  : typeof global !== "undefined" ? global.L : null;

              L.Routing = L.Routing || {};

              L.extend(L.Routing, require("./L.Routing.Localization"));

              L.Routing.Formatter = L.Class.extend({
                options: {
                  units: "metric",
                  unitNames: {
                    meters: "m",
                    kilometers: "km",
                    yards: "yd",
                    miles: "mi",
                    hours: "h",
                    minutes: "mín",
                    seconds: "s",
                  },
                  language: "en",
                  roundingSensitivity: 1,
                  distanceTemplate: "{value} {unit}",
                },

                initialize(options) {
                  L.setOptions(this, options);
                },

                formatDistance(d /* Number (meters) */, sensitivity) {
                  const un = this.options.unitNames;
                  const simpleRounding = sensitivity <= 0;
                  const round = simpleRounding
                    ? v => v
                    : L.bind(this._round, this);
                  let v;
                  let yards;
                  let data;
                  let pow10;

                  if (this.options.units === "imperial") {
                    yards = d / 0.9144;
                    if (yards >= 1000) {
                      data = {
                        value: round(d / 1609.344, sensitivity),
                        unit: un.miles,
                      };
                    } else {
                      data = {
                        value: round(yards, sensitivity),
                        unit: un.yards,
                      };
                    }
                  } else {
                    v = round(d, sensitivity);
                    data = {
                      value: v >= 1000 ? v / 1000 : v,
                      unit: v >= 1000 ? un.kilometers : un.meters,
                    };
                  }

                  if (simpleRounding) {
                    pow10 = 10 ** -sensitivity;
                    data.value = Math.round(data.value * pow10) / pow10;
                  }

                  return L.Util.template(this.options.distanceTemplate, data);
                },

                _round(d, sensitivity) {
                  const s = sensitivity || this.options.roundingSensitivity;
                  const pow10 = 10 ** (`${Math.floor(d / s)}`.length - 1);
                  const r = Math.floor(d / pow10);
                  const p = r > 5 ? pow10 : pow10 / 2;

                  return Math.round(d / p) * p;
                },

                formatTime(t /* Number (seconds) */) {
                  if (t > 86400) {
                    return `${Math.round(t / 3600)} h`;
                  } else if (t > 3600) {
                    return `${Math.floor(t / 3600)} h ${Math.round(
                      (t % 3600) / 60
                    )} min`;
                  } else if (t > 300) {
                    return `${Math.round(t / 60)} min`;
                  } else if (t > 60) {
                    return `${Math.floor(t / 60)} min${t % 60 !== 0
                      ? " " + t % 60 + " s"
                      : ""}`;
                  } else {
                    return `${t} s`;
                  }
                },

                formatInstruction(instr, i) {
                  if (instr.text === undefined) {
                    return L.Util.template(
                      this._getInstructionTemplate(instr, i),
                      L.extend(
                        {
                          exitStr: instr.exit
                            ? L.Routing.Localization[
                                this.options.language
                              ].formatOrder(instr.exit)
                            : "",
                          dir:
                            L.Routing.Localization[this.options.language]
                              .directions[instr.direction],
                        },
                        instr
                      )
                    );
                  } else {
                    return instr.text;
                  }
                },

                getIconName(instr, i) {
                  switch (instr.type) {
                    case "Straight":
                      return i === 0 ? "depart" : "continue";
                    case "SlightRight":
                      return "bear-right";
                    case "Right":
                      return "turn-right";
                    case "SharpRight":
                      return "sharp-right";
                    case "TurnAround":
                      return "u-turn";
                    case "SharpLeft":
                      return "sharp-left";
                    case "Left":
                      return "turn-left";
                    case "SlightLeft":
                      return "bear-left";
                    case "WaypointReached":
                      return "via";
                    case "Roundabout":
                      return "enter-roundabout";
                    case "DestinationReached":
                      return "arrive";
                  }
                },

                _getInstructionTemplate(instr, i) {
                  const type =
                    instr.type === "Straight"
                      ? i === 0 ? "Head" : "Continue"
                      : instr.type;
                  const strings =
                    L.Routing.Localization[this.options.language].instructions[
                      type
                    ];

                  return (
                    strings[0] +
                    (strings.length > 1 && instr.road ? strings[1] : "")
                  );
                },
              });

              module.exports = L.Routing;
            })();
          }).call(
            this,
            typeof global !== "undefined"
              ? global
              : typeof self !== "undefined"
                ? self
                : typeof window !== "undefined" ? window : {}
          );
        },
        { "./L.Routing.Localization": 11 },
      ],
      7: [
        function(require, module, exports) {
          (global => {
            (() => {
              const L =
                typeof window !== "undefined"
                  ? window.L
                  : typeof global !== "undefined" ? global.L : null;
              L.Routing = L.Routing || {};
              L.extend(L.Routing, require("./L.Routing.Autocomplete"));

              function selectInputText(input) {
                if (input.setSelectionRange) {
                  // On iOS, select() doesn't work
                  input.setSelectionRange(0, 9999);
                } else {
                  // On at least IE8, setSeleectionRange doesn't exist
                  input.select();
                }
              }

              L.Routing.GeocoderElement = L.Class.extend({
                includes: L.Mixin.Events,

                options: {
                  createGeocoder(i, nWps, options) {
                    const container = L.DomUtil.create(
                      "div",
                      "leaflet-routing-geocoder"
                    );
                    const input = L.DomUtil.create("input", "", container);
                    const remove = options.addWaypoints
                      ? L.DomUtil.create(
                          "span",
                          "leaflet-routing-remove-waypoint",
                          container
                        )
                      : undefined;

                    input.disabled = !options.addWaypoints;

                    return {
                      container,
                      input,
                      closeButton: remove,
                    };
                  },
                  geocoderPlaceholder(i, numberWaypoints, plan) {
                    const l = L.Routing.Localization[plan.options.language].ui;
                    return i === 0
                      ? l.startPlaceholder
                      : i < numberWaypoints - 1
                        ? L.Util.template(l.viaPlaceholder, { viaNumber: i })
                        : l.endPlaceholder;
                  },

                  geocoderClass() {
                    return "";
                  },

                  waypointNameFallback(latLng) {
                    const ns = latLng.lat < 0 ? "S" : "N";
                    const ew = latLng.lng < 0 ? "W" : "E";
                    const lat = (Math.round(Math.abs(latLng.lat) * 10000) /
                      10000).toString();
                    const lng = (Math.round(Math.abs(latLng.lng) * 10000) /
                      10000).toString();
                    return `${ns + lat}, ${ew}${lng}`;
                  },
                  maxGeocoderTolerance: 200,
                  autocompleteOptions: {},
                  language: "en",
                },

                initialize(wp, i, nWps, options) {
                  L.setOptions(this, options);

                  const g = this.options.createGeocoder(i, nWps, this.options);
                  const closeButton = g.closeButton;
                  const geocoderInput = g.input;
                  geocoderInput.setAttribute(
                    "placeholder",
                    this.options.geocoderPlaceholder(i, nWps, this)
                  );
                  geocoderInput.className = this.options.geocoderClass(i, nWps);

                  this._element = g;
                  this._waypoint = wp;

                  this.update();
                  // This has to be here, or geocoder's value will not be properly
                  // initialized.
                  // TODO: look into why and make _updateWaypointName fix this.
                  geocoderInput.value = wp.name;

                  L.DomEvent.addListener(
                    geocoderInput,
                    "click",
                    function() {
                      selectInputText(this);
                    },
                    geocoderInput
                  );

                  if (closeButton) {
                    L.DomEvent.addListener(
                      closeButton,
                      "click",
                      function() {
                        this.fire("delete", { waypoint: this._waypoint });
                      },
                      this
                    );
                  }

                  new L.Routing.Autocomplete(
                    geocoderInput,
                    function(r) {
                      geocoderInput.value = r.name;
                      wp.name = r.name;
                      wp.latLng = r.center;
                      this.fire("geocoded", { waypoint: wp, value: r });
                    },
                    this,
                    L.extend(
                      {
                        resultFn: this.options.geocoder.geocode,
                        resultContext: this.options.geocoder,
                        autocompleteFn: this.options.geocoder.suggest,
                        autocompleteContext: this.options.geocoder,
                      },
                      this.options.autocompleteOptions
                    )
                  );
                },

                getContainer() {
                  return this._element.container;
                },

                setValue(v) {
                  this._element.input.value = v;
                },

                update(force) {
                  const wp = this._waypoint;
                  let wpCoords;

                  wp.name = wp.name || "";

                  if (wp.latLng && (force || !wp.name)) {
                    wpCoords = this.options.waypointNameFallback(wp.latLng);
                    if (
                      this.options.geocoder &&
                      this.options.geocoder.reverse
                    ) {
                      this.options.geocoder.reverse(
                        wp.latLng,
                        67108864 /* zoom 18 */,
                        function(rs) {
                          if (
                            rs.length > 0 &&
                            rs[0].center.distanceTo(wp.latLng) <
                              this.options.maxGeocoderTolerance
                          ) {
                            wp.name = rs[0].name;
                          } else {
                            wp.name = wpCoords;
                          }
                          this._update();
                        },
                        this
                      );
                    } else {
                      wp.name = wpCoords;
                      this._update();
                    }
                  }
                },

                focus() {
                  const input = this._element.input;
                  input.focus();
                  selectInputText(input);
                },

                _update() {
                  const wp = this._waypoint;
                  const value = wp && wp.name ? wp.name : "";
                  this.setValue(value);
                  this.fire("reversegeocoded", { waypoint: wp, value });
                },
              });

              L.Routing.geocoderElement = (wp, i, nWps, plan) =>
                new L.Routing.GeocoderElement(wp, i, nWps, plan);

              module.exports = L.Routing;
            })();
          }).call(
            this,
            typeof global !== "undefined"
              ? global
              : typeof self !== "undefined"
                ? self
                : typeof window !== "undefined" ? window : {}
          );
        },
        { "./L.Routing.Autocomplete": 3 },
      ],
      8: [
        function(require, module, exports) {
          (global => {
            (() => {
              const L =
                typeof window !== "undefined"
                  ? window.L
                  : typeof global !== "undefined" ? global.L : null;

              L.Routing = L.Routing || {};
              L.extend(L.Routing, require("./L.Routing.Formatter"));
              L.extend(L.Routing, require("./L.Routing.ItineraryBuilder"));

              L.Routing.Itinerary = L.Control.extend({
                includes: L.Mixin.Events,

                options: {
                  pointMarkerStyle: {
                    radius: 5,
                    color: "#03f",
                    fillColor: "white",
                    opacity: 1,
                    fillOpacity: 0.7,
                  },
                  summaryTemplate: "<h2>{name}</h2><h3>{distance}, {time}</h3>",
                  timeTemplate: "{time}",
                  containerClassName: "",
                  alternativeClassName: "",
                  minimizedClassName: "",
                  itineraryClassName: "",
                  totalDistanceRoundingSensitivity: -1,
                  show: true,
                  collapsible: undefined,
                  collapseBtn(itinerary) {
                    const collapseBtn = L.DomUtil.create(
                      "span",
                      itinerary.options.collapseBtnClass
                    );
                    L.DomEvent.on(
                      collapseBtn,
                      "click",
                      itinerary._toggle,
                      itinerary
                    );
                    itinerary._container.insertBefore(
                      collapseBtn,
                      itinerary._container.firstChild
                    );
                  },
                  collapseBtnClass: "leaflet-routing-collapse-btn",
                },

                initialize(options) {
                  L.setOptions(this, options);
                  this._formatter =
                    this.options.formatter ||
                    new L.Routing.Formatter(this.options);
                  this._itineraryBuilder =
                    this.options.itineraryBuilder ||
                    new L.Routing.ItineraryBuilder({
                      containerClassName: this.options.itineraryClassName,
                    });
                },

                onAdd(map) {
                  let collapsible = this.options.collapsible;

                  collapsible =
                    collapsible ||
                    (collapsible === undefined && map.getSize().x <= 640);

                  this._container = L.DomUtil.create(
                    "div",
                    `leaflet-routing-container leaflet-bar ${!this.options.show
                      ? "leaflet-routing-container-hide "
                      : ""}${collapsible
                      ? "leaflet-routing-collapsible "
                      : ""}${this.options.containerClassName}`
                  );
                  this._altContainer = this.createAlternativesContainer();
                  this._container.appendChild(this._altContainer);
                  L.DomEvent.disableClickPropagation(this._container);
                  L.DomEvent.addListener(this._container, "mousewheel", e => {
                    L.DomEvent.stopPropagation(e);
                  });

                  if (collapsible) {
                    this.options.collapseBtn(this);
                  }

                  return this._container;
                },

                onRemove() {},

                createAlternativesContainer() {
                  return L.DomUtil.create(
                    "div",
                    "leaflet-routing-alternatives-container"
                  );
                },

                setAlternatives(routes) {
                  let i;
                  let alt;
                  let altDiv;

                  this._clearAlts();

                  this._routes = routes;

                  for (i = 0; i < this._routes.length; i++) {
                    alt = this._routes[i];
                    altDiv = this._createAlternative(alt, i);
                    this._altContainer.appendChild(altDiv);
                    this._altElements.push(altDiv);
                  }

                  this._selectRoute({
                    route: this._routes[0],
                    alternatives: this._routes.slice(1),
                  });

                  return this;
                },

                show() {
                  L.DomUtil.removeClass(
                    this._container,
                    "leaflet-routing-container-hide"
                  );
                },

                hide() {
                  L.DomUtil.addClass(
                    this._container,
                    "leaflet-routing-container-hide"
                  );
                },

                _toggle() {
                  const collapsed = L.DomUtil.hasClass(
                    this._container,
                    "leaflet-routing-container-hide"
                  );
                  this[collapsed ? "show" : "hide"]();
                },

                _createAlternative(alt, i) {
                  const altDiv = L.DomUtil.create(
                    "div",
                    `leaflet-routing-alt ${this.options
                      .alternativeClassName}${i > 0
                      ? " leaflet-routing-alt-minimized " +
                        this.options.minimizedClassName
                      : ""}`
                  );
                  const template = this.options.summaryTemplate;

                  const data = L.extend(
                    {
                      name: alt.name,
                      distance: this._formatter.formatDistance(
                        alt.summary.totalDistance,
                        this.options.totalDistanceRoundingSensitivity
                      ),
                      time: this._formatter.formatTime(alt.summary.totalTime),
                    },
                    alt
                  );

                  altDiv.innerHTML =
                    typeof template === "function"
                      ? template(data)
                      : L.Util.template(template, data);
                  L.DomEvent.addListener(
                    altDiv,
                    "click",
                    this._onAltClicked,
                    this
                  );
                  this.on("routeselected", this._selectAlt, this);

                  altDiv.appendChild(this._createItineraryContainer(alt));
                  return altDiv;
                },

                _clearAlts() {
                  const el = this._altContainer;
                  while (el && el.firstChild) {
                    el.removeChild(el.firstChild);
                  }

                  this._altElements = [];
                },

                _createItineraryContainer(r) {
                  const container = this._itineraryBuilder.createContainer();
                  const steps = this._itineraryBuilder.createStepsContainer();
                  let i;
                  let instr;
                  let step;
                  let distance;
                  let text;
                  let icon;

                  container.appendChild(steps);

                  for (i = 0; i < r.instructions.length; i++) {
                    instr = r.instructions[i];
                    text = this._formatter.formatInstruction(instr, i);
                    distance = this._formatter.formatDistance(instr.distance);
                    icon = this._formatter.getIconName(instr, i);
                    step = this._itineraryBuilder.createStep(
                      text,
                      distance,
                      icon,
                      steps
                    );

                    this._addRowListeners(step, r.coordinates[instr.index]);
                  }

                  return container;
                },

                _addRowListeners(row, coordinate) {
                  L.DomEvent.addListener(
                    row,
                    "mouseover",
                    function() {
                      this._marker = L.circleMarker(
                        coordinate,
                        this.options.pointMarkerStyle
                      ).addTo(this._map);
                    },
                    this
                  );
                  L.DomEvent.addListener(
                    row,
                    "mouseout",
                    function() {
                      if (this._marker) {
                        this._map.removeLayer(this._marker);
                        delete this._marker;
                      }
                    },
                    this
                  );
                  L.DomEvent.addListener(
                    row,
                    "click",
                    function(e) {
                      this._map.panTo(coordinate);
                      L.DomEvent.stopPropagation(e);
                    },
                    this
                  );
                },

                _onAltClicked(e) {
                  let altElem = e.target || window.event.srcElement;
                  while (!L.DomUtil.hasClass(altElem, "leaflet-routing-alt")) {
                    altElem = altElem.parentElement;
                  }

                  const j = this._altElements.indexOf(altElem);
                  const alts = this._routes.slice();
                  const route = alts.splice(j, 1)[0];

                  this.fire("routeselected", {
                    route,
                    alternatives: alts,
                  });
                },

                _selectAlt(e) {
                  let altElem;
                  let j;
                  let n;
                  let classFn;

                  altElem = this._altElements[e.route.routesIndex];

                  if (
                    L.DomUtil.hasClass(altElem, "leaflet-routing-alt-minimized")
                  ) {
                    for (j = 0; j < this._altElements.length; j++) {
                      n = this._altElements[j];
                      classFn =
                        j === e.route.routesIndex ? "removeClass" : "addClass";
                      L.DomUtil[classFn](n, "leaflet-routing-alt-minimized");
                      if (this.options.minimizedClassName) {
                        L.DomUtil[classFn](n, this.options.minimizedClassName);
                      }

                      if (j !== e.route.routesIndex) n.scrollTop = 0;
                    }
                  }

                  L.DomEvent.stop(e);
                },

                _selectRoute(routes) {
                  if (this._marker) {
                    this._map.removeLayer(this._marker);
                    delete this._marker;
                  }
                  this.fire("routeselected", routes);
                },
              });

              L.Routing.itinerary = options => new L.Routing.Itinerary(options);

              module.exports = L.Routing;
            })();
          }).call(
            this,
            typeof global !== "undefined"
              ? global
              : typeof self !== "undefined"
                ? self
                : typeof window !== "undefined" ? window : {}
          );
        },
        { "./L.Routing.Formatter": 6, "./L.Routing.ItineraryBuilder": 9 },
      ],
      9: [
        function(require, module, exports) {
          (global => {
            (() => {
              const L =
                typeof window !== "undefined"
                  ? window.L
                  : typeof global !== "undefined" ? global.L : null;
              L.Routing = L.Routing || {};

              L.Routing.ItineraryBuilder = L.Class.extend({
                options: {
                  containerClassName: "",
                },

                initialize(options) {
                  L.setOptions(this, options);
                },

                createContainer(className) {
                  const table = L.DomUtil.create("table", className || "");
                  const colgroup = L.DomUtil.create("colgroup", "", table);

                  L.DomUtil.create(
                    "col",
                    "leaflet-routing-instruction-icon",
                    colgroup
                  );
                  L.DomUtil.create(
                    "col",
                    "leaflet-routing-instruction-text",
                    colgroup
                  );
                  L.DomUtil.create(
                    "col",
                    "leaflet-routing-instruction-distance",
                    colgroup
                  );

                  return table;
                },

                createStepsContainer() {
                  return L.DomUtil.create("tbody", "");
                },

                createStep(text, distance, icon, steps) {
                  const row = L.DomUtil.create("tr", "", steps);
                  let span;
                  let td;
                  td = L.DomUtil.create("td", "", row);
                  span = L.DomUtil.create(
                    "span",
                    `leaflet-routing-icon leaflet-routing-icon-${icon}`,
                    td
                  );
                  td.appendChild(span);
                  td = L.DomUtil.create("td", "", row);
                  td.appendChild(document.createTextNode(text));
                  td = L.DomUtil.create("td", "", row);
                  td.appendChild(document.createTextNode(distance));
                  return row;
                },
              });

              module.exports = L.Routing;
            })();
          }).call(
            this,
            typeof global !== "undefined"
              ? global
              : typeof self !== "undefined"
                ? self
                : typeof window !== "undefined" ? window : {}
          );
        },
        {},
      ],
      10: [
        function(require, module, exports) {
          (global => {
            (() => {
              const L =
                typeof window !== "undefined"
                  ? window.L
                  : typeof global !== "undefined" ? global.L : null;

              L.Routing = L.Routing || {};

              L.Routing.Line = L.LayerGroup.extend({
                includes: L.Mixin.Events,

                options: {
                  styles: [
                    { color: "black", opacity: 0.15, weight: 9 },
                    { color: "white", opacity: 0.8, weight: 6 },
                    { color: "red", opacity: 1, weight: 2 },
                  ],
                  missingRouteStyles: [
                    { color: "black", opacity: 0.15, weight: 7 },
                    { color: "white", opacity: 0.6, weight: 4 },
                    {
                      color: "gray",
                      opacity: 0.8,
                      weight: 2,
                      dashArray: "7,12",
                    },
                  ],
                  addWaypoints: true,
                  extendToWaypoints: true,
                  missingRouteTolerance: 10,
                },

                initialize(route, options) {
                  L.setOptions(this, options);
                  L.LayerGroup.prototype.initialize.call(this, options);
                  this._route = route;

                  if (this.options.extendToWaypoints) {
                    this._extendToWaypoints();
                  }

                  this._addSegment(
                    route.coordinates,
                    this.options.styles,
                    this.options.addWaypoints
                  );
                },

                addTo(map) {
                  map.addLayer(this);
                  return this;
                },
                getBounds() {
                  return L.latLngBounds(this._route.coordinates);
                },

                _findWaypointIndices() {
                  const wps = this._route.inputWaypoints;
                  const indices = [];
                  let i;
                  for (i = 0; i < wps.length; i++) {
                    indices.push(this._findClosestRoutePoint(wps[i].latLng));
                  }

                  return indices;
                },

                _findClosestRoutePoint(latlng) {
                  let minDist = Number.MAX_VALUE;
                  let minIndex;
                  let i;
                  let d;

                  for (i = this._route.coordinates.length - 1; i >= 0; i--) {
                    // TODO: maybe do this in pixel space instead?
                    d = latlng.distanceTo(this._route.coordinates[i]);
                    if (d < minDist) {
                      minIndex = i;
                      minDist = d;
                    }
                  }

                  return minIndex;
                },

                _extendToWaypoints() {
                  const wps = this._route.inputWaypoints;
                  const wpIndices = this._getWaypointIndices();
                  let i;
                  let wpLatLng;
                  let routeCoord;

                  for (i = 0; i < wps.length; i++) {
                    wpLatLng = wps[i].latLng;
                    routeCoord = L.latLng(
                      this._route.coordinates[wpIndices[i]]
                    );
                    if (
                      wpLatLng.distanceTo(routeCoord) >
                      this.options.missingRouteTolerance
                    ) {
                      this._addSegment(
                        [wpLatLng, routeCoord],
                        this.options.missingRouteStyles
                      );
                    }
                  }
                },

                _addSegment(coords, styles, mouselistener) {
                  let i;
                  let pl;

                  for (i = 0; i < styles.length; i++) {
                    pl = L.polyline(coords, styles[i]);
                    this.addLayer(pl);
                    if (mouselistener) {
                      pl.on("mousedown", this._onLineTouched, this);
                    }
                  }
                },

                _findNearestWpBefore(i) {
                  const wpIndices = this._getWaypointIndices();
                  let j = wpIndices.length - 1;
                  while (j >= 0 && wpIndices[j] > i) {
                    j--;
                  }

                  return j;
                },

                _onLineTouched(e) {
                  const afterIndex = this._findNearestWpBefore(
                    this._findClosestRoutePoint(e.latlng)
                  );
                  this.fire("linetouched", {
                    afterIndex,
                    latlng: e.latlng,
                  });
                },

                _getWaypointIndices() {
                  if (!this._wpIndices) {
                    this._wpIndices =
                      this._route.waypointIndices ||
                      this._findWaypointIndices();
                  }

                  return this._wpIndices;
                },
              });

              L.Routing.line = (route, options) =>
                new L.Routing.Line(route, options);

              module.exports = L.Routing;
            })();
          }).call(
            this,
            typeof global !== "undefined"
              ? global
              : typeof self !== "undefined"
                ? self
                : typeof window !== "undefined" ? window : {}
          );
        },
        {},
      ],
      11: [
        (require, module, exports) => {
          (() => {
            L.Routing = L.Routing || {};

            L.Routing.Localization = {
              en: {
                directions: {
                  N: "north",
                  NE: "northeast",
                  E: "east",
                  SE: "southeast",
                  S: "south",
                  SW: "southwest",
                  W: "west",
                  NW: "northwest",
                },
                instructions: {
                  // instruction, postfix if the road is named
                  Head: ["Head {dir}", " on {road}"],
                  Continue: ["Continue {dir}", " on {road}"],
                  SlightRight: ["Slight right", " onto {road}"],
                  Right: ["Right", " onto {road}"],
                  SharpRight: ["Sharp right", " onto {road}"],
                  TurnAround: ["Turn around"],
                  SharpLeft: ["Sharp left", " onto {road}"],
                  Left: ["Left", " onto {road}"],
                  SlightLeft: ["Slight left", " onto {road}"],
                  WaypointReached: ["Waypoint reached"],
                  Roundabout: [
                    "Take the {exitStr} exit in the roundabout",
                    " onto {road}",
                  ],
                  DestinationReached: ["Destination reached"],
                },
                formatOrder(n) {
                  const i = n % 10 - 1;
                  const suffix = ["st", "nd", "rd"];

                  return suffix[i] ? n + suffix[i] : `${n}th`;
                },
                ui: {
                  startPlaceholder: "Start",
                  viaPlaceholder: "Via {viaNumber}",
                  endPlaceholder: "End",
                },
              },

              de: {
                directions: {
                  N: "Norden",
                  NE: "Nordosten",
                  E: "Osten",
                  SE: "Südosten",
                  S: "Süden",
                  SW: "Südwesten",
                  W: "Westen",
                  NW: "Nordwesten",
                },
                instructions: {
                  // instruction, postfix if the road is named
                  Head: ["Richtung {dir}", " auf {road}"],
                  Continue: ["Geradeaus Richtung {dir}", " auf {road}"],
                  SlightRight: ["Leicht rechts abbiegen", " auf {road}"],
                  Right: ["Rechts abbiegen", " auf {road}"],
                  SharpRight: ["Scharf rechts abbiegen", " auf {road}"],
                  TurnAround: ["Wenden"],
                  SharpLeft: ["Scharf links abbiegen", " auf {road}"],
                  Left: ["Links abbiegen", " auf {road}"],
                  SlightLeft: ["Leicht links abbiegen", " auf {road}"],
                  WaypointReached: ["Zwischenhalt erreicht"],
                  Roundabout: [
                    "Nehmen Sie die {exitStr} Ausfahrt im Kreisverkehr",
                    " auf {road}",
                  ],
                  DestinationReached: ["Sie haben ihr Ziel erreicht"],
                },
                formatOrder(n) {
                  return `${n}.`;
                },
                ui: {
                  startPlaceholder: "Start",
                  viaPlaceholder: "Via {viaNumber}",
                  endPlaceholder: "Ziel",
                },
              },

              sv: {
                directions: {
                  N: "norr",
                  NE: "nordost",
                  E: "öst",
                  SE: "sydost",
                  S: "syd",
                  SW: "sydväst",
                  W: "väst",
                  NW: "nordväst",
                },
                instructions: {
                  // instruction, postfix if the road is named
                  Head: ["Åk åt {dir}", " på {road}"],
                  Continue: ["Fortsätt {dir}", " på {road}"],
                  SlightRight: ["Svagt höger", " på {road}"],
                  Right: ["Sväng höger", " på {road}"],
                  SharpRight: ["Skarpt höger", " på {road}"],
                  TurnAround: ["Vänd"],
                  SharpLeft: ["Skarpt vänster", " på {road}"],
                  Left: ["Sväng vänster", " på {road}"],
                  SlightLeft: ["Svagt vänster", " på {road}"],
                  WaypointReached: ["Viapunkt nådd"],
                  Roundabout: [
                    "Tag {exitStr} avfarten i rondellen",
                    " till {road}",
                  ],
                  DestinationReached: ["Framme vid resans mål"],
                },
                formatOrder(n) {
                  return [
                    "första",
                    "andra",
                    "tredje",
                    "fjärde",
                    "femte",
                    "sjätte",
                    "sjunde",
                    "åttonde",
                    "nionde",
                    "tionde",
                    /* Can't possibly be more than ten exits, can there? */
                  ][n - 1];
                },
                ui: {
                  startPlaceholder: "Från",
                  viaPlaceholder: "Via {viaNumber}",
                  endPlaceholder: "Till",
                },
              },

              sp: {
                directions: {
                  N: "norte",
                  NE: "noreste",
                  E: "este",
                  SE: "sureste",
                  S: "sur",
                  SW: "suroeste",
                  W: "oeste",
                  NW: "noroeste",
                },
                instructions: {
                  // instruction, postfix if the road is named
                  Head: ["Derecho {dir}", " sobre {road}"],
                  Continue: ["Continuar {dir}", " en {road}"],
                  SlightRight: ["Leve giro a la derecha", " sobre {road}"],
                  Right: ["Derecha", " sobre {road}"],
                  SharpRight: [
                    "Giro pronunciado a la derecha",
                    " sobre {road}",
                  ],
                  TurnAround: ["Dar vuelta"],
                  SharpLeft: [
                    "Giro pronunciado a la izquierda",
                    " sobre {road}",
                  ],
                  Left: ["Izquierda", " en {road}"],
                  SlightLeft: ["Leve giro a la izquierda", " en {road}"],
                  WaypointReached: ["Llegó a un punto del camino"],
                  Roundabout: [
                    "Tomar {exitStr} salida en la rotonda",
                    " en {road}",
                  ],
                  DestinationReached: ["Llegada a destino"],
                },
                formatOrder(n) {
                  return `${n}º`;
                },
                ui: {
                  startPlaceholder: "Inicio",
                  viaPlaceholder: "Via {viaNumber}",
                  endPlaceholder: "Destino",
                },
              },
              nl: {
                directions: {
                  N: "noordelijke",
                  NE: "noordoostelijke",
                  E: "oostelijke",
                  SE: "zuidoostelijke",
                  S: "zuidelijke",
                  SW: "zuidewestelijke",
                  W: "westelijke",
                  NW: "noordwestelijke",
                },
                instructions: {
                  // instruction, postfix if the road is named
                  Head: ["Vertrek in {dir} richting", " de {road} op"],
                  Continue: ["Ga in {dir} richting", " de {road} op"],
                  SlightRight: ["Volg de weg naar rechts", " de {road} op"],
                  Right: ["Ga rechtsaf", " de {road} op"],
                  SharpRight: ["Ga scherpe bocht naar rechts", " de {road} op"],
                  TurnAround: ["Keer om"],
                  SharpLeft: ["Ga scherpe bocht naar links", " de {road} op"],
                  Left: ["Ga linksaf", " de {road} op"],
                  SlightLeft: ["Volg de weg naar links", " de {road} op"],
                  WaypointReached: ["Aangekomen bij tussenpunt"],
                  Roundabout: [
                    "Neem de {exitStr} afslag op de rotonde",
                    " de {road} op",
                  ],
                  DestinationReached: ["Aangekomen op eindpunt"],
                },
                formatOrder(n) {
                  if (n === 1 || n >= 20) {
                    return `${n}ste`;
                  } else {
                    return `${n}de`;
                  }
                },
                ui: {
                  startPlaceholder: "Vertrekpunt",
                  viaPlaceholder: "Via {viaNumber}",
                  endPlaceholder: "Bestemming",
                },
              },
              fr: {
                directions: {
                  N: "nord",
                  NE: "nord-est",
                  E: "est",
                  SE: "sud-est",
                  S: "sud",
                  SW: "sud-ouest",
                  W: "ouest",
                  NW: "nord-ouest",
                },
                instructions: {
                  // instruction, postfix if the road is named
                  Head: ["Tout droit au {dir}", " sur {road}"],
                  Continue: ["Continuer au {dir}", " sur {road}"],
                  SlightRight: ["Légèrement à droite", " sur {road}"],
                  Right: ["A droite", " sur {road}"],
                  SharpRight: ["Complètement à droite", " sur {road}"],
                  TurnAround: ["Faire demi-tour"],
                  SharpLeft: ["Complètement à gauche", " sur {road}"],
                  Left: ["A gauche", " sur {road}"],
                  SlightLeft: ["Légèrement à gauche", " sur {road}"],
                  WaypointReached: ["Point d'étape atteint"],
                  Roundabout: [
                    "Au rond-point, prenez la {exitStr} sortie",
                    " sur {road}",
                  ],
                  DestinationReached: ["Destination atteinte"],
                },
                formatOrder(n) {
                  return `${n}º`;
                },
                ui: {
                  startPlaceholder: "Départ",
                  viaPlaceholder: "Intermédiaire {viaNumber}",
                  endPlaceholder: "Arrivée",
                },
              },
              it: {
                directions: {
                  N: "nord",
                  NE: "nord-est",
                  E: "est",
                  SE: "sud-est",
                  S: "sud",
                  SW: "sud-ovest",
                  W: "ovest",
                  NW: "nord-ovest",
                },
                instructions: {
                  // instruction, postfix if the road is named
                  Head: ["Dritto verso {dir}", " su {road}"],
                  Continue: ["Continuare verso {dir}", " su {road}"],
                  SlightRight: ["Mantenere la destra", " su {road}"],
                  Right: ["A destra", " su {road}"],
                  SharpRight: ["Strettamente a destra", " su {road}"],
                  TurnAround: ["Fare inversione di marcia"],
                  SharpLeft: ["Strettamente a sinistra", " su {road}"],
                  Left: ["A sinistra", " sur {road}"],
                  SlightLeft: ["Mantenere la sinistra", " su {road}"],
                  WaypointReached: ["Punto di passaggio raggiunto"],
                  Roundabout: ["Alla rotonda, prendere la {exitStr} uscita"],
                  DestinationReached: ["Destinazione raggiunta"],
                },
                formatOrder(n) {
                  return `${n}º`;
                },
                ui: {
                  startPlaceholder: "Partenza",
                  viaPlaceholder: "Intermedia {viaNumber}",
                  endPlaceholder: "Destinazione",
                },
              },
              pt: {
                directions: {
                  N: "norte",
                  NE: "nordeste",
                  E: "leste",
                  SE: "sudeste",
                  S: "sul",
                  SW: "sudoeste",
                  W: "oeste",
                  NW: "noroeste",
                },
                instructions: {
                  // instruction, postfix if the road is named
                  Head: ["Siga {dir}", " na {road}"],
                  Continue: ["Continue {dir}", " na {road}"],
                  SlightRight: ["Curva ligeira a direita", " na {road}"],
                  Right: ["Curva a direita", " na {road}"],
                  SharpRight: ["Curva fechada a direita", " na {road}"],
                  TurnAround: ["Retorne"],
                  SharpLeft: ["Curva fechada a esquerda", " na {road}"],
                  Left: ["Curva a esquerda", " na {road}"],
                  SlightLeft: ["Curva ligueira a esquerda", " na {road}"],
                  WaypointReached: ["Ponto de interesse atingido"],
                  Roundabout: [
                    "Pegue a {exitStr} saída na rotatória",
                    " na {road}",
                  ],
                  DestinationReached: ["Destino atingido"],
                },
                formatOrder(n) {
                  return `${n}º`;
                },
                ui: {
                  startPlaceholder: "Origem",
                  viaPlaceholder: "Intermédio {viaNumber}",
                  endPlaceholder: "Destino",
                },
              },
              sk: {
                directions: {
                  N: "sever",
                  NE: "serverovýchod",
                  E: "východ",
                  SE: "juhovýchod",
                  S: "juh",
                  SW: "juhozápad",
                  W: "západ",
                  NW: "serverozápad",
                },
                instructions: {
                  // instruction, postfix if the road is named
                  Head: ["Mierte na {dir}", " na {road}"],
                  Continue: ["Pokračujte na {dir}", " na {road}"],
                  SlightRight: ["Mierne doprava", " na {road}"],
                  Right: ["Doprava", " na {road}"],
                  SharpRight: ["Prudko doprava", " na {road}"],
                  TurnAround: ["Otočte sa"],
                  SharpLeft: ["Prudko doľava", " na {road}"],
                  Left: ["Doľava", " na {road}"],
                  SlightLeft: ["Mierne doľava", " na {road}"],
                  WaypointReached: ["Ste v prejazdovom bode."],
                  Roundabout: ["Odbočte na {exitStr} výjazde", " na {road}"],
                  DestinationReached: ["Prišli ste do cieľa."],
                },
                formatOrder(n) {
                  const i = n % 10 - 1;
                  const suffix = [".", ".", "."];

                  return suffix[i] ? n + suffix[i] : `${n}.`;
                },
                ui: {
                  startPlaceholder: "Začiatok",
                  viaPlaceholder: "Cez {viaNumber}",
                  endPlaceholder: "Koniec",
                },
              },
              el: {
                directions: {
                  N: "βόρεια",
                  NE: "βορειοανατολικά",
                  E: "ανατολικά",
                  SE: "νοτιοανατολικά",
                  S: "νότια",
                  SW: "νοτιοδυτικά",
                  W: "δυτικά",
                  NW: "βορειοδυτικά",
                },
                instructions: {
                  // instruction, postfix if the road is named
                  Head: ["Κατευθυνθείτε {dir}", " στην {road}"],
                  Continue: ["Συνεχίστε {dir}", " στην {road}"],
                  SlightRight: ["Ελαφρώς δεξιά", " στην {road}"],
                  Right: ["Δεξιά", " στην {road}"],
                  SharpRight: ["Απότομη δεξιά στροφή", " στην {road}"],
                  TurnAround: ["Κάντε αναστροφή"],
                  SharpLeft: ["Απότομη αριστερή στροφή", " στην {road}"],
                  Left: ["Αριστερά", " στην {road}"],
                  SlightLeft: ["Ελαφρώς αριστερά", " στην {road}"],
                  WaypointReached: ["Φτάσατε στο σημείο αναφοράς"],
                  Roundabout: [
                    "Ακολουθήστε την {exitStr} έξοδο στο κυκλικό κόμβο",
                    " στην {road}",
                  ],
                  DestinationReached: ["Φτάσατε στον προορισμό σας"],
                },
                formatOrder(n) {
                  return `${n}º`;
                },
                ui: {
                  startPlaceholder: "Αφετηρία",
                  viaPlaceholder: "μέσω {viaNumber}",
                  endPlaceholder: "Προορισμός",
                },
              },
            };

            module.exports = L.Routing;
          })();
        },
        {},
      ],
      12: [
        function(require, module, exports) {
          (global => {
            (() => {
              const L =
                typeof window !== "undefined"
                  ? window.L
                  : typeof global !== "undefined" ? global.L : null;
              const corslite = require("corslite");
              const polyline = require("polyline");

              // Ignore camelcase naming for this file, since OSRM's API uses
              // underscores.
              /* jshint camelcase: false */

              L.Routing = L.Routing || {};
              L.extend(L.Routing, require("./L.Routing.Waypoint"));

              L.Routing.OSRM = L.Class.extend({
                options: {
                  serviceUrl: "https://router.project-osrm.org/viaroute",
                  timeout: 30 * 1000,
                  routingOptions: {},
                  polylinePrecision: 6,
                },

                initialize(options) {
                  L.Util.setOptions(this, options);
                  this._hints = {
                    locations: {},
                  };
                },

                route(waypoints, callback, context, options) {
                  let timedOut = false;
                  const wps = [];
                  let url;
                  let timer;
                  let wp;
                  let i;

                  url = this.buildRouteUrl(
                    waypoints,
                    L.extend({}, this.options.routingOptions, options)
                  );

                  timer = setTimeout(() => {
                    timedOut = true;
                    callback.call(context || callback, {
                      status: -1,
                      message: "OSRM request timed out.",
                    });
                  }, this.options.timeout);

                  // Create a copy of the waypoints, since they
                  // might otherwise be asynchronously modified while
                  // the request is being processed.
                  for (i = 0; i < waypoints.length; i++) {
                    wp = waypoints[i];
                    wps.push(
                      new L.Routing.Waypoint(wp.latLng, wp.name, wp.options)
                    );
                  }

                  corslite(
                    url,
                    L.bind(function(err, resp) {
                      let data;
                      let errorMessage;
                      let statusCode;

                      clearTimeout(timer);
                      if (!timedOut) {
                        errorMessage = `HTTP request failed: ${err}`;
                        statusCode = -1;

                        if (!err) {
                          try {
                            data = JSON.parse(resp.responseText);
                            try {
                              return this._routeDone(
                                data,
                                wps,
                                callback,
                                context
                              );
                            } catch (ex) {
                              statusCode = -3;
                              errorMessage = ex.toString();
                            }
                          } catch (ex) {
                            statusCode = -2;
                            errorMessage = `Error parsing OSRM response: ${ex.toString()}`;
                          }
                        }

                        callback.call(context || callback, {
                          status: statusCode,
                          message: errorMessage,
                        });
                      }
                    }, this)
                  );

                  return this;
                },

                _routeDone(response, inputWaypoints, callback, context) {
                  let coordinates;
                  let alts;
                  let actualWaypoints;
                  let i;

                  context = context || callback;
                  if (response.status !== 0 && response.status !== 200) {
                    callback.call(context, {
                      status: response.status,
                      message: response.status_message,
                    });
                    return;
                  }

                  coordinates = this._decodePolyline(response.route_geometry);
                  actualWaypoints = this._toWaypoints(
                    inputWaypoints,
                    response.via_points
                  );
                  alts = [
                    {
                      name: this._createName(response.route_name),
                      coordinates,
                      instructions: response.route_instructions
                        ? this._convertInstructions(response.route_instructions)
                        : [],
                      summary: response.route_summary
                        ? this._convertSummary(response.route_summary)
                        : [],
                      inputWaypoints,
                      waypoints: actualWaypoints,
                      waypointIndices: this._clampIndices(
                        response.via_indices,
                        coordinates
                      ),
                    },
                  ];

                  if (response.alternative_geometries) {
                    for (
                      i = 0;
                      i < response.alternative_geometries.length;
                      i++
                    ) {
                      coordinates = this._decodePolyline(
                        response.alternative_geometries[i]
                      );
                      alts.push({
                        name: this._createName(response.alternative_names[i]),
                        coordinates,
                        instructions: response.alternative_instructions[i]
                          ? this._convertInstructions(
                              response.alternative_instructions[i]
                            )
                          : [],
                        summary: response.alternative_summaries[i]
                          ? this._convertSummary(
                              response.alternative_summaries[i]
                            )
                          : [],
                        inputWaypoints,
                        waypoints: actualWaypoints,
                        waypointIndices: this._clampIndices(
                          response.alternative_geometries.length === 1
                            ? // Unsure if this is a bug in OSRM or not, but alternative_indices
                              // does not appear to be an array of arrays, at least not when there is
                              // a single alternative route.
                              response.alternative_indices
                            : response.alternative_indices[i],
                          coordinates
                        ),
                      });
                    }
                  }

                  // only versions <4.5.0 will support this flag
                  if (response.hint_data) {
                    this._saveHintData(response.hint_data, inputWaypoints);
                  }
                  callback.call(context, null, alts);
                },

                _decodePolyline(routeGeometry) {
                  const cs = polyline.decode(
                    routeGeometry,
                    this.options.polylinePrecision
                  );
                  const result = new Array(cs.length);
                  let i;
                  for (i = cs.length - 1; i >= 0; i--) {
                    result[i] = L.latLng(cs[i]);
                  }

                  return result;
                },

                _toWaypoints(inputWaypoints, vias) {
                  const wps = [];
                  let i;
                  for (i = 0; i < vias.length; i++) {
                    wps.push(
                      L.Routing.waypoint(
                        L.latLng(vias[i]),
                        inputWaypoints[i].name,
                        inputWaypoints[i].options
                      )
                    );
                  }

                  return wps;
                },

                _createName(nameParts) {
                  let name = "";
                  let i;

                  for (i = 0; i < nameParts.length; i++) {
                    if (nameParts[i]) {
                      if (name) {
                        name += ", ";
                      }
                      name +=
                        nameParts[i].charAt(0).toUpperCase() +
                        nameParts[i].slice(1);
                    }
                  }

                  return name;
                },

                buildRouteUrl(waypoints, options) {
                  const locs = [];
                  let wp;
                  let computeInstructions;
                  let computeAlternative;
                  let locationKey;
                  let hint;

                  for (let i = 0; i < waypoints.length; i++) {
                    wp = waypoints[i];
                    locationKey = this._locationKey(wp.latLng);
                    locs.push(`loc=${locationKey}`);

                    hint = this._hints.locations[locationKey];
                    if (hint) {
                      locs.push(`hint=${hint}`);
                    }

                    if (wp.options && wp.options.allowUTurn) {
                      locs.push("u=true");
                    }
                  }

                  computeAlternative = computeInstructions = !(
                    options && options.geometryOnly
                  );

                  return `${this.options
                    .serviceUrl}?instructions=${computeInstructions.toString()}&alt=${computeAlternative.toString()}&${options.z
                    ? "z=" + options.z + "&"
                    : ""}${locs.join("&")}${this._hints.checksum !== undefined
                    ? "&checksum=" + this._hints.checksum
                    : ""}${options.fileformat
                    ? "&output=" + options.fileformat
                    : ""}${options.allowUTurns
                    ? "&uturns=" + options.allowUTurns
                    : ""}`;
                },

                _locationKey(location) {
                  return `${location.lat},${location.lng}`;
                },

                _saveHintData(hintData, waypoints) {
                  let loc;
                  this._hints = {
                    checksum: hintData.checksum,
                    locations: {},
                  };
                  for (let i = hintData.locations.length - 1; i >= 0; i--) {
                    loc = waypoints[i].latLng;
                    this._hints.locations[this._locationKey(loc)] =
                      hintData.locations[i];
                  }
                },

                _convertSummary(osrmSummary) {
                  return {
                    totalDistance: osrmSummary.total_distance,
                    totalTime: osrmSummary.total_time,
                  };
                },

                _convertInstructions(osrmInstructions) {
                  const result = [];
                  let i;
                  let instr;
                  let type;
                  let driveDir;

                  for (i = 0; i < osrmInstructions.length; i++) {
                    instr = osrmInstructions[i];
                    type = this._drivingDirectionType(instr[0]);
                    driveDir = instr[0].split("-");
                    if (type) {
                      result.push({
                        type,
                        distance: instr[2],
                        time: instr[4],
                        road: instr[1],
                        direction: instr[6],
                        exit: driveDir.length > 1 ? driveDir[1] : undefined,
                        index: instr[3],
                      });
                    }
                  }

                  return result;
                },

                _drivingDirectionType(d) {
                  switch (parseInt(d, 10)) {
                    case 1:
                      return "Straight";
                    case 2:
                      return "SlightRight";
                    case 3:
                      return "Right";
                    case 4:
                      return "SharpRight";
                    case 5:
                      return "TurnAround";
                    case 6:
                      return "SharpLeft";
                    case 7:
                      return "Left";
                    case 8:
                      return "SlightLeft";
                    case 9:
                      return "WaypointReached";
                    case 10:
                      // TODO: "Head on"
                      // https://github.com/DennisOSRM/Project-OSRM/blob/master/DataStructures/TurnInstructions.h#L48
                      return "Straight";
                    case 11:
                    case 12:
                      return "Roundabout";
                    case 15:
                      return "DestinationReached";
                    default:
                      return null;
                  }
                },

                _clampIndices(indices, coords) {
                  const maxCoordIndex = coords.length - 1;
                  let i;
                  for (i = 0; i < indices.length; i++) {
                    indices[i] = Math.min(
                      maxCoordIndex,
                      Math.max(indices[i], 0)
                    );
                  }
                  return indices;
                },
              });

              L.Routing.osrm = options => new L.Routing.OSRM(options);

              module.exports = L.Routing;
            })();
          }).call(
            this,
            typeof global !== "undefined"
              ? global
              : typeof self !== "undefined"
                ? self
                : typeof window !== "undefined" ? window : {}
          );
        },
        { "./L.Routing.Waypoint": 14, corslite: 1, polyline: 2 },
      ],
      13: [
        function(require, module, exports) {
          (global => {
            (() => {
              const L =
                typeof window !== "undefined"
                  ? window.L
                  : typeof global !== "undefined" ? global.L : null;
              L.Routing = L.Routing || {};
              L.extend(L.Routing, require("./L.Routing.GeocoderElement"));
              L.extend(L.Routing, require("./L.Routing.Waypoint"));

              L.Routing.Plan = L.Class.extend({
                includes: L.Mixin.Events,

                options: {
                  dragStyles: [
                    { color: "black", opacity: 0.15, weight: 9 },
                    { color: "white", opacity: 0.8, weight: 6 },
                    { color: "red", opacity: 1, weight: 2, dashArray: "7,12" },
                  ],
                  draggableWaypoints: true,
                  routeWhileDragging: false,
                  addWaypoints: true,
                  reverseWaypoints: false,
                  addButtonClassName: "",
                  language: "en",
                  createGeocoderElement: L.Routing.geocoderElement,
                  createMarker(i, wp) {
                    const options = {
                      draggable: this.draggableWaypoints,
                    };

                    const marker = L.marker(wp.latLng, options);

                    return marker;
                  },
                  geocodersClassName: "",
                },

                initialize(waypoints, options) {
                  L.Util.setOptions(this, options);
                  this._waypoints = [];
                  this.setWaypoints(waypoints);
                },

                isReady() {
                  let i;
                  for (i = 0; i < this._waypoints.length; i++) {
                    if (!this._waypoints[i].latLng) {
                      return false;
                    }
                  }

                  return true;
                },

                getWaypoints() {
                  let i;
                  const wps = [];

                  for (i = 0; i < this._waypoints.length; i++) {
                    wps.push(this._waypoints[i]);
                  }

                  return wps;
                },

                setWaypoints(waypoints) {
                  const args = [0, this._waypoints.length].concat(waypoints);
                  this.spliceWaypoints(...args);
                  return this;
                },

                spliceWaypoints() {
                  const args = [arguments[0], arguments[1]];
                  let i;

                  for (i = 2; i < arguments.length; i++) {
                    args.push(
                      arguments[i] && arguments[i].hasOwnProperty("latLng")
                        ? arguments[i]
                        : L.Routing.waypoint(arguments[i])
                    );
                  }

                  [].splice.apply(this._waypoints, args);

                  // Make sure there's always at least two waypoints
                  while (this._waypoints.length < 2) {
                    this.spliceWaypoints(this._waypoints.length, 0, null);
                  }

                  this._updateMarkers();
                  this._fireChanged(...args);
                },

                onAdd(map) {
                  this._map = map;
                  this._updateMarkers();
                },

                onRemove() {
                  let i;
                  this._removeMarkers();

                  if (this._newWp) {
                    for (i = 0; i < this._newWp.lines.length; i++) {
                      this._map.removeLayer(this._newWp.lines[i]);
                    }
                  }

                  delete this._map;
                },

                createGeocoders() {
                  const container = L.DomUtil.create(
                    "div",
                    `leaflet-routing-geocoders ${this.options
                      .geocodersClassName}`
                  );
                  const waypoints = this._waypoints;
                  let addWpBtn;
                  let reverseBtn;

                  this._geocoderContainer = container;
                  this._geocoderElems = [];

                  if (this.options.addWaypoints) {
                    addWpBtn = L.DomUtil.create(
                      "button",
                      `leaflet-routing-add-waypoint ${this.options
                        .addButtonClassName}`,
                      container
                    );
                    addWpBtn.setAttribute("type", "button");
                    L.DomEvent.addListener(
                      addWpBtn,
                      "click",
                      function() {
                        this.spliceWaypoints(waypoints.length, 0, null);
                      },
                      this
                    );
                  }

                  if (this.options.reverseWaypoints) {
                    reverseBtn = L.DomUtil.create(
                      "button",
                      "leaflet-routing-reverse-waypoints",
                      container
                    );
                    reverseBtn.setAttribute("type", "button");
                    L.DomEvent.addListener(
                      reverseBtn,
                      "click",
                      function() {
                        this._waypoints.reverse();
                        this.setWaypoints(this._waypoints);
                      },
                      this
                    );
                  }

                  this._updateGeocoders();
                  this.on("waypointsspliced", this._updateGeocoders);

                  return container;
                },

                _createGeocoder(i) {
                  const geocoder = this.options.createGeocoderElement(
                    this._waypoints[i],
                    i,
                    this._waypoints.length,
                    this.options
                  );
                  geocoder
                    .on(
                      "delete",
                      function() {
                        if (i > 0 || this._waypoints.length > 2) {
                          this.spliceWaypoints(i, 1);
                        } else {
                          this.spliceWaypoints(i, 1, new L.Routing.Waypoint());
                        }
                      },
                      this
                    )
                    .on(
                      "geocoded",
                      function(e) {
                        this._updateMarkers();
                        this._fireChanged();
                        this._focusGeocoder(i + 1);
                        this.fire("waypointgeocoded", {
                          waypointIndex: i,
                          waypoint: e.waypoint,
                        });
                      },
                      this
                    )
                    .on(
                      "reversegeocoded",
                      function(e) {
                        this.fire("waypointgeocoded", {
                          waypointIndex: i,
                          waypoint: e.waypoint,
                        });
                      },
                      this
                    );

                  return geocoder;
                },

                _updateGeocoders() {
                  const elems = [];
                  let i;
                  let geocoderElem;

                  for (i = 0; i < this._geocoderElems.length; i++) {
                    this._geocoderContainer.removeChild(
                      this._geocoderElems[i].getContainer()
                    );
                  }

                  for (i = this._waypoints.length - 1; i >= 0; i--) {
                    geocoderElem = this._createGeocoder(i);
                    this._geocoderContainer.insertBefore(
                      geocoderElem.getContainer(),
                      this._geocoderContainer.firstChild
                    );
                    elems.push(geocoderElem);
                  }

                  this._geocoderElems = elems.reverse();
                },

                _removeMarkers() {
                  let i;
                  if (this._markers) {
                    for (i = 0; i < this._markers.length; i++) {
                      if (this._markers[i]) {
                        this._map.removeLayer(this._markers[i]);
                      }
                    }
                  }
                  this._markers = [];
                },

                _updateMarkers() {
                  let i;
                  let m;

                  if (!this._map) {
                    return;
                  }

                  this._removeMarkers();

                  for (i = 0; i < this._waypoints.length; i++) {
                    if (this._waypoints[i].latLng) {
                      m = this.options.createMarker(
                        i,
                        this._waypoints[i],
                        this._waypoints.length
                      );
                      if (m) {
                        m.addTo(this._map);
                        if (this.options.draggableWaypoints) {
                          this._hookWaypointEvents(m, i);
                        }
                      }
                    } else {
                      m = null;
                    }
                    this._markers.push(m);
                  }
                },

                _fireChanged() {
                  this.fire("waypointschanged", {
                    waypoints: this.getWaypoints(),
                  });

                  if (arguments.length >= 2) {
                    this.fire("waypointsspliced", {
                      index: Array.prototype.shift.call(arguments),
                      nRemoved: Array.prototype.shift.call(arguments),
                      added: arguments,
                    });
                  }
                },

                _hookWaypointEvents(m, i, trackMouseMove) {
                  const eventLatLng = e =>
                    trackMouseMove ? e.latlng : e.target.getLatLng();

                  const dragStart = L.bind(function(e) {
                    this.fire("waypointdragstart", {
                      index: i,
                      latlng: eventLatLng(e),
                    });
                  }, this);

                  const drag = L.bind(function(e) {
                    this._waypoints[i].latLng = eventLatLng(e);
                    this.fire("waypointdrag", {
                      index: i,
                      latlng: eventLatLng(e),
                    });
                  }, this);

                  const dragEnd = L.bind(function(e) {
                    this._waypoints[i].latLng = eventLatLng(e);
                    this._waypoints[i].name = "";
                    if (this._geocoderElems) {
                      this._geocoderElems[i].update(true);
                    }
                    this.fire("waypointdragend", {
                      index: i,
                      latlng: eventLatLng(e),
                    });
                    this._fireChanged();
                  }, this);

                  let mouseMove;
                  let mouseUp;

                  if (trackMouseMove) {
                    mouseMove = L.bind(function(e) {
                      this._markers[i].setLatLng(e.latlng);
                      drag(e);
                    }, this);
                    mouseUp = L.bind(function(e) {
                      this._map.dragging.enable();
                      this._map.off("mouseup", mouseUp);
                      this._map.off("mousemove", mouseMove);
                      dragEnd(e);
                    }, this);
                    this._map.dragging.disable();
                    this._map.on("mousemove", mouseMove);
                    this._map.on("mouseup", mouseUp);
                    dragStart({ latlng: this._waypoints[i].latLng });
                  } else {
                    m.on("dragstart", dragStart);
                    m.on("drag", drag);
                    m.on("dragend", dragEnd);
                  }
                },

                dragNewWaypoint(e) {
                  const newWpIndex = e.afterIndex + 1;
                  if (this.options.routeWhileDragging) {
                    this.spliceWaypoints(newWpIndex, 0, e.latlng);
                    this._hookWaypointEvents(
                      this._markers[newWpIndex],
                      newWpIndex,
                      true
                    );
                  } else {
                    this._dragNewWaypoint(newWpIndex, e.latlng);
                  }
                },

                _dragNewWaypoint(newWpIndex, initialLatLng) {
                  const wp = new L.Routing.Waypoint(initialLatLng);
                  const prevWp = this._waypoints[newWpIndex - 1];
                  const nextWp = this._waypoints[newWpIndex];
                  const marker = this.options.createMarker(
                    newWpIndex,
                    wp,
                    this._waypoints.length + 1
                  );
                  const lines = [];

                  const mouseMove = L.bind(e => {
                    let i;
                    if (marker) {
                      marker.setLatLng(e.latlng);
                    }
                    for (i = 0; i < lines.length; i++) {
                      lines[i].spliceLatLngs(1, 1, e.latlng);
                    }
                  }, this);

                  const mouseUp = L.bind(function(e) {
                    let i;
                    if (marker) {
                      this._map.removeLayer(marker);
                    }
                    for (i = 0; i < lines.length; i++) {
                      this._map.removeLayer(lines[i]);
                    }
                    this._map.off("mousemove", mouseMove);
                    this._map.off("mouseup", mouseUp);
                    this.spliceWaypoints(newWpIndex, 0, e.latlng);
                  }, this);

                  let i;

                  if (marker) {
                    marker.addTo(this._map);
                  }

                  for (i = 0; i < this.options.dragStyles.length; i++) {
                    lines.push(
                      L.polyline(
                        [prevWp.latLng, initialLatLng, nextWp.latLng],
                        this.options.dragStyles[i]
                      ).addTo(this._map)
                    );
                  }

                  this._map.on("mousemove", mouseMove);
                  this._map.on("mouseup", mouseUp);
                },

                _focusGeocoder(i) {
                  if (this._geocoderElems[i]) {
                    this._geocoderElems[i].focus();
                  } else {
                    document.activeElement.blur();
                  }
                },
              });

              L.Routing.plan = (waypoints, options) =>
                new L.Routing.Plan(waypoints, options);

              module.exports = L.Routing;
            })();
          }).call(
            this,
            typeof global !== "undefined"
              ? global
              : typeof self !== "undefined"
                ? self
                : typeof window !== "undefined" ? window : {}
          );
        },
        { "./L.Routing.GeocoderElement": 7, "./L.Routing.Waypoint": 14 },
      ],
      14: [
        function(require, module, exports) {
          (global => {
            (() => {
              const L =
                typeof window !== "undefined"
                  ? window.L
                  : typeof global !== "undefined" ? global.L : null;
              L.Routing = L.Routing || {};

              L.Routing.Waypoint = L.Class.extend({
                options: {
                  allowUTurn: false,
                },
                initialize(latLng, name, options) {
                  L.Util.setOptions(this, options);
                  this.latLng = L.latLng(latLng);
                  this.name = name;
                },
              });

              L.Routing.waypoint = (latLng, name, options) =>
                new L.Routing.Waypoint(latLng, name, options);

              module.exports = L.Routing;
            })();
          }).call(
            this,
            typeof global !== "undefined"
              ? global
              : typeof self !== "undefined"
                ? self
                : typeof window !== "undefined" ? window : {}
          );
        },
        {},
      ],
    },
    {},
    [4]
  )(4);
});
