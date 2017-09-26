const socket = io();
const isDriver = true;
const faker = false;
const inited = false;

map.locate({
  maxZoom: 15,
  watch: true,
});

map.on("locationfound", success);
map.on("click", onMapClick);
map.on("zoomend", _changeLocateMaxZoom);

const _changeLocateMaxZoom = e => {
  if (map._locateOptions) {
    map._locateOptions.maxZoom = map.getZoom();
  }
};

L.easyButton("fa fa-toggle-on", (btn, map) => {
  faker = true;
  map.stopLocate();
}).addTo(map);

L.easyButton("fa fa-toggle-off", (btn, map) => {
  faker = false;
  map.locate();
}).addTo(map);

const init = position => {
  latLong = getLatLong(position);
  map.setView(latLong, 15);
  mymarker = L.Marker
    .movingMarker([latLong, latLong], 0, {
      autostart: true,
      zoom: 15,
      icon: carIcon,
    })
    .addTo(map);

  socket.emit("init", {
    isDriver: isDriver,
    latLong: latLong,
  });
  inited = true;
};

const onMapClick = e => {
  if (faker == true) {
    const loc = mymarker.getLatLng();
    const latLong = e.latlng;
    const angle = setangle(loc.lat, loc.lng, latLong.lat, latLong.lng);
    mymarker.setIconAngle(angle);
    mymarker.moveTo([e.latlng.lat, e.latlng.lng], 3000);
    socket.emit("locChanged", {
      latLong: [e.latlng.lat, e.latlng.lng],
    });
  }
};

const success = position => {
  if (!inited) init(position);
  else {
    const loc = mymarker.getLatLng();
    const latLong = getLatLong(position);
    const angle = setangle(loc.lat, loc.lng, latLong[0], latLong[1]);
    mymarker.setIconAngle(angle);
    mymarker.moveTo(latLong, 5000);
    socket.emit("locChanged", {
      latLong: latLong,
    });
  }
};

socket.on("drivepath", id => {
  L.Routing
    .control({
      waypoints: [L.latLng(mymarker.getLatLng()), L.latLng(id.lat, id.lng)],

      createMarker: function() {
        return null;
      },
    })
    .addTo(map);
});

const setangle = (slat, slong, dlat, dlong) => {
  const dLon = dlong - slong;
  const y = Math.sin(dLon) * Math.cos(dlat);
  const x =
    Math.cos(slat) * Math.sin(dlat) -
    Math.sin(slat) * Math.cos(dlat) * Math.cos(dLon);
  angle1 = Math.atan2(y, x);
  angle1 = 180 * angle1 / 3.1454;
  angle1 = (angle1 + 360) % 360;
  return angle1;
};

const error = err => {
  console.log("ERROR " + err.message);
};

const getLatLong = position => {
  return [position.latitude, position.longitude];
};
