const http = require('http');
const he = require('he');
const WebSocketServer = require('websocket').server;
const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

const Messages = require('./models/messages');
const database = require('./config/db');

let clients = [];

//set database connection
mongoose.connect(database.uri, { useNewUrlParser: true });

//Get the default connection
const db = mongoose.connection;

//Bind connection to error event (to get notification of connection errors)
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

//setup websocket server for Chat
const server = http.createServer((request, response) => {
  console.log((new Date()) + ' Received request for ' + request.url);
  response.writeHead(404);
  response.end();
});
server.listen(8080, () => {
  console.log((new Date()) + ' Server is listening on 8080');
});

chatServer = new WebSocketServer({
  httpServer: server,
  // You should not use autoAcceptConnections for production
  // applications, as it defeats all standard cross-origin protection
  // facilities built into the protocol and the browser.  You should
  // *always* verify the connection's origin and decide whether or not
  // to accept it.
  autoAcceptConnections: false
});

function originIsAllowed(origin) {
  // put logic here to detect whether the specified origin is allowed.
  return true;
}

chatServer.on('request', (request) => {
  if (!originIsAllowed(request.origin)) {
    // Make sure we only accept requests from an allowed origin
    request.reject();
    console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
    return;
  }
  let connection = request.accept('echo-protocol', request.origin);
  console.log((new Date()) + ' Connection accepted.');
  clients.push(connection);
  connection.on('message', (data) => {
    if (data.type === 'utf8') {
      console.log('Received Message: ' + data.utf8Data);
      if (data.utf8Data !== "Welcome to Capital Effect Mining Chat!") {
        for (let client of clients) {
          client.sendUTF(data.utf8Data);
        }
        console.log('Broadcasted Message.');
        // get username.
        let index = data.utf8Data.indexOf(":", 1);
        let username = data.utf8Data.slice(0, index);
        let message = he.decode(data.utf8Data);
        Messages.create({
          username: username,
          message: message,
          timestamp: new Date()
        });
      }
    } else if (data.type === 'binary') {
      console.log('Received Binary Message of ' + data.binaryData.length + ' bytes');
      connection.sendBytes(data.binaryData);
    }
  });
  connection.on('close', (reasonCode, description) => {
    function handleClose(connection, clients) {
      console.log((new Date()) + ' Peer ' + connection.remoteAddress + ' disconnected.');
      let index = clients.indexOf(connection);
      if (index !== -1) {
        clients.splice(index, 1);
      }
      console.log("Removed connection: " + connection);
      console.log(clients);
    }
  });
});
