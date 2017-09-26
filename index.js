import express from "express";
const app = express(); //instance of express
const server = require("http").Server(app);
const io = require("socket.io")(server);
const drivers = {};
const service = {};

app.use(express.static(`${__dirname}/public`));

app.get("/customer", (req, res) => {
  res.sendFile(`${__dirname}/views/customer-index.html`);
});

app.get("/faker", (req, res) => {
  res.sendFile(`${__dirname}/views/faker-index.html`);
});

app.get("/driver", (req, res) => {
  res.sendFile(`${__dirname}/views/driver-index.html`);
});

app.get("/serviceman", (req, res) => {
  res.sendFile(`${__dirname}/views/serviceman-index.html`);
});

io.on("connection", socket => {
  socket.on("init", data => {
    if (data.isDriver) {
      drivers[socket.id] = {
        id: socket.id,
        latLong: data.latLong,
      };
      socket.isDriver = data.isDriver;
      console.log(`Driver Added at ${socket.id}`);
      socket.broadcast.to("customers").emit("driverAdded", drivers[socket.id]);
    } else {
      socket.join("customers");
      socket.emit("initDriverLoc", drivers); //event to list all drivers on the customer's map
    }
  });

  socket.on("initservice", data => {
    if (data.isservice) {
      service[socket.id] = {
        id: socket.id,
        latLong: data.latLong,
      };
      socket.isservice = data.isservice;
      console.log(`serviceman Added at ${socket.id}`);
      socket.broadcast
        .to("customers")
        .emit("servicemanAdded", service[socket.id]);
    } else {
      socket.join("customers");
      socket.emit("initservicerLoc", service);
    }
  });

  socket.on("book", mymarker => {
    let near = 0;
    let length;
    let nr = 0;
    let at;
    let id;
    let key;
    const lat1 = mymarker.lat;
    const long1 = mymarker.lng;
    let lat2;
    let long2;
    const details = {};
    if (mymarker[1] == 0) {
      at = Object.keys(drivers);
      id = at[0];
      length = Object.keys(drivers).length;
      if (length == 0) id = 0;
      else if (length == 1) {
        id = at[0];
      } else {
        for (key in at) {
          console.log(`id=${at[key]}`);
          lat2 = drivers[at[key]].latLong[0];
          long2 = drivers[at[key]].latLong[1];
          nr = distance(lat1, long1, lat2, long2);

          if (nr < near) {
            near = nr;
            id = key;
          }
        }
      }
    } else {
      at = Object.keys(service);
      id = at[0];
      length = Object.keys(service).length;
      if (length == 0) id = 0;
      else if (length == 1) {
        id = at[0];
      } else {
        for (key in at) {
          console.log(`id=${at[key]}`);
          lat2 = service[at[key]].latLong[0];
          long2 = service[at[key]].latLong[1];
          nr = distance(lat1, long1, lat2, long2);

          if (nr < near) {
            near = nr;
            id = key;
          }
        }
      }
    }
    details[0] = id; // id of booked car/service
    details[1] = mymarker[1]; //type 0 for cab or 1 for service
    socket.emit("bookid", details);
    if (details[1] == 0) socket.to(id).emit("drivepath", mymarker[0]);
    else socket.to(id).emit("servicepath", mymarker[0]);
  });

  socket.on("locChanged", data => {
    drivers[socket.id] = {
      id: socket.id,
      latLong: data.latLong,
    };

    socket.broadcast.emit("driverLocChanged", {
      id: socket.id,
      latLong: data.latLong,
    });
  });

  socket.on("servicelocChanged", data => {
    service[socket.id] = {
      id: socket.id,
      latLong: data.latLong,
    };

    socket.broadcast.emit("serviceLocChanged", {
      id: socket.id,
      latLong: data.latLong,
    });
  });

  socket.on("disconnect", () => {
    if (socket.isDriver) {
      console.log(`Driver disconnected at ${socket.id}`);
      socket.broadcast
        .to("customers")
        .emit("driverRemoved", drivers[socket.id]);
      delete drivers[socket.id];
    }
    if (socket.isservice) {
      console.log(`service disconnected at ${socket.id}`);
      socket.broadcast
        .to("customers")
        .emit("serviceRemoved", service[socket.id]);
      delete service[socket.id];
    } else {
      console.log(`Customer Disconnected at${socket.id}`);
    }
  });
});

const distance = (lat1, lon1, lat2, lon2) => {
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a =
    0.5 -
    c((lat2 - lat1) * p) / 2 +
    c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p)) / 2;

  return 12742 * Math.asin(Math.sqrt(a));
};

server.listen(3000, () => {
  console.log(`Server started at port 3000`);
});
