const isDriver = false;
const markers = {};
const inited = false;
const socket = io();
const isservice = false;
const send = {};
const key;

map.locate({
  maxZoom: 15,
  watch: true,
  enableHighAccuracy: true,
});

map.on("locationfound", success);
map.on("zoomend", _changeLocateMaxZoom);

const _changeLocateMaxZoom = (e) => {
  if (map._locateOptions) {
    map._locateOptions.maxZoom = map.getZoom();
  }
}

const init = (position) => {
  latLong = getLatLong(position);
  map.setView(latLong, 15);
  mymarker = L.Marker
    .movingMarker([latLong, latLong], 0, {
      autostart: true,
      zoom: 15,
      icon: clientIcon,
    })
    .addTo(map);

  socket.emit("init", {
    isDriver: isDriver,
    latLong: latLong,
  });

  socket.emit("initservice", {
    isservice: isservice,
    latLong: latLong,
  });
  inited = true;
}

const success = (pos) => {
  if (!inited) init(pos);
  else mymarker.moveTo(getLatLong(pos), 5000);
}

const getLatLong = (position) => {
  return [position.latitude, position.longitude];
}

socket.on("initDriverLoc", (drivers) => {
  _.each(drivers, function(driver) {
    markers[driver.id] = L.Marker
      .movingMarker([driver.latLong, driver.latLong], [0], {
        icon: carIcon,
        autostart: true,
        zoom: 15,
      })
      .addTo(map);
  });
});

socket.on("initservicerLoc", (drivers) => {
  _.each(drivers, function(driver) {
    markers[driver.id] = L.Marker
      .movingMarker([driver.latLong, driver.latLong], [0], {
        icon: serviceIcon,
        autostart: true,
        zoom: 15,
      })
      .addTo(map);
  });
});

socket.on("driverAdded", (driver) => {
  console.log("New driver joined.");
  markers[driver.id] = L.Marker
    .movingMarker([driver.latLong, driver.latLong], [0], {
      icon: carIcon,
      autostart: true,
      zoom: 15,
    })
    .addTo(map);
});

socket.on("servicemanAdded", (driver) => {
  console.log("New driver joined.");
  markers[driver.id] = L.Marker
    .movingMarker([driver.latLong, driver.latLong], [0], {
      icon: serviceIcon,
      autostart: true,
      zoom: 15,
    })
    .addTo(map);
});

socket.on("driverRemoved", (driver) => {
  console.log("driver left.");
  map.removeLayer(markers[driver.id]);
});

socket.on("serviceRemoved", (serviceman) => {
  console.log("driver left.");
  map.removeLayer(markers[serviceman.id]);
});

socket.on("driverLocChanged", (data) => {
  const loc = markers[data.id].getLatLng();
  const angle = setangle(loc.lat, loc.lng, data.latLong[0], data.latLong[1]);
  markers[data.id].setIconAngle(angle);
  markers[data.id].moveTo(data.latLong, 5000);
});

socket.on("serviceLocChanged", (data) => {
  const loc = markers[data.id].getLatLng();
  const angle = setangle(loc.lat, loc.lng, data.latLong[0], data.latLong[1]);
  markers[data.id].moveTo(data.latLong, 5000);
});

const nearby = (data) => {
  send[0] = mymarker.getLatLng();
  send[1] = data;
  console.log("send[0]=" + send[0] + "send[1]=" + send[1]);
  socket.emit("book", send);
}

socket.on("bookid", (id) => {
  if (id[0] == 0) {
    confirm("Not available");
  } else {
    const time = L.Routing.control({
      waypoints: [
        L.latLng(mymarker.getLatLng()),
        L.latLng(markers[id[0]].getLatLng()),
      ],
    });

    if (id[1] == 0) confirm("Your Ride has been booked");
    if (id[1] == 1) confirm("Your Service has been booked");

    for (key in markers) {
      if (markers[id[0]].getLatLng() != markers[key].getLatLng())
        map.removeLayer(markers[key]);
    }
    setTimeout(function() {
      markers[id[0]]
        .bindPopup(
          Math.round(time._routes[0].summary.totalTime / 60) + " Minutes away "
        )
        .openPopup();
    }, 2000);
  }
});

function error(err) {
  console.log("ERROR " + err.message);
}

const setangle = (slat, slong, dlat, dlong) => {
  const y = Math.sin(dlong - slong) * Math.cos(dlat);
  const x =
    Math.cos(slat) * Math.sin(dlat) -
    Math.sin(slat) * Math.cos(dlat) * Math.cos(dlong - slong);
  angle1 = Math.atan2(y, x);
  angle1 = 180 * angle1 / Math.PI;
  return angle1;
}

const getLatLong = (position) => {
  return [position.latitude, position.longitude];
}
