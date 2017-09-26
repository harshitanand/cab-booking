const map = L.map("map");
const mymarker;

const mapLink = "https://mts1.google.com/vt/lyrs=m@186112443&hl=x-local&src=app&x={x}&y={y}&z={z}&s=Galile";
const maxZoom = 25;
const minZoom = 10;
const worldCopyJump = false;
const attribution = 'Map data &copy; <a href="https://maps.google.com">Google</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>';

if ("geolocation" in navigator) {
  console.log("Location is found");
} else {
  prompt("App needs your location access");
}

L.tileLayer(
  mapLink, {
    attribution,
    maxZoom,
    minZoom,
    worldCopyJump,
  }
).addTo(map);

L.easyButton("fa-location-arrow", (btn, map) => {
  map.setView(mymarker.getLatLng(), 15);
}).addTo(map);

const carIcon = L.icon({
  iconUrl: "/images/car.png",
  iconSize: [40, 40],
});

const clientIcon = L.icon({
  iconUrl: "/images/user.png",
  iconSize: [25, 25],
});
