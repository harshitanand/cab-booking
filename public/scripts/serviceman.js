const socket = io();
const isservice = true;
const faker = false;
let inited = false;

map.locate({
  maxZoom: 15,
  watch: true,
});

map.on("locationfound", success);
map.on("zoomend", _changeLocateMaxZoom);

function _changeLocateMaxZoom(e) {
  if (map._locateOptions) {
    map._locateOptions.maxZoom = map.getZoom();
  }
}

function init(position) {
  latLong = getLatLong(position);
  map.setView(latLong, 15);
  mymarker = L.Marker
    .movingMarker([latLong, latLong], 0, {
      autostart: true,
      zoom: 15,
      icon: serviceIcon,
    })
    .addTo(map);

  socket.emit("initservice", {
    isservice,
    latLong,
  });
  inited = true;
}

function success(position) {
  if (!inited) init(position);
  else {
    const loc = mymarker.getLatLng();
    const latLong = getLatLong(position);
    mymarker.moveTo(latLong, 5000);
    socket.emit("servicelocChanged", {
      latLong,
    });
  }
}

socket.on("servicepath", id => {
  L.Routing
    .control({
      waypoints: [L.latLng(mymarker.getLatLng()), L.latLng(id.lat, id.lng)],
      createMarker() {
        return null;
      },
    })
    .addTo(map);
});

function error(err) {
  console.log(`ERROR ${err.message}`);
}

function getLatLong(position) {
  return [position.latitude, position.longitude];
}
