const path = require('path');
const http = require('http');

const express = require('express');
const socketIO = require('socket.io');

const {genMsg, genGeoMsg} = require('./utils/message');
const {isRealStr} = require('./utils/validation');
const {Users} = require('./utils/users');

const PUBLIC_PATH = path.join(__dirname, '../public');
const port = process.env.PORT || 8000;

var app = express();
// var server = http.createServer((req, res) => {});
var server = http.createServer(app);
var io = socketIO(server);
var users = new Users();


app.use(express.static(PUBLIC_PATH)); // where to find public files

io.on('connection', (socket) => {
  var now = Date().toString();
  console.log('New user connected: '+now);

  // socket.broadcast.emit('newMessage', genMsg('Heresay Admin', 'New user has joined chatroom'));
  // socket.emit('newMessage', genMsg('Heresay Admin', 'Welcome to Heresay chat!'));

  socket.on('join', (params, callback) => {
    // io.emit -> io.to('Room name str').emit
    // socket.broadcast.emit -> socket.broadcast.to('Room name str').emit
    // socket.emit
    if (!isRealStr(params.name) || !isRealStr(params.room)) {
      return callback('Name and room are required.');
    }

    socket.join(params.room);
    users.removeUser(socket.id);
    users.addUser(socket.id, params.name, params.room);

    io.to(params.room).emit('updateUserList', users.getUserList(params.room));
    socket.broadcast.to(params.room).emit('newMessage', genMsg('Heresay Admin', `${params.name} has joined the chatroom`));
    socket.emit('newMessage', genMsg('Heresay Admin', 'Say it here!'));
    callback();
  });

  socket.on('createMessage', (msg, callback) => {
    // io.emit('newMessage', genMsg(msg.from, msg.text));
    var user = users.getUser(socket.id);

    if (user && isRealStr(msg.text)) {
      io.to(user.room).emit('newMessage', genMsg(user.name, msg.text));
    }

    callback();
  });

  socket.on('createLocationMessage', (data) => {
    // io.emit('newLocationMessage', genGeoMsg(data.name, data.latitude, data.longitude));
    var user = users.getUser(socket.id);

    if (user && data) {
      io.to(user.room).emit('newLocationMessage', genGeoMsg(user.name, data.latitude, data.longitude));
    }
  });

  socket.on('disconnect', () => {
    var now = Date().toString();
    var user = users.removeUser(socket.id);

    if (user) {
      io.to(user.room).emit('updateUserList', users.getUserList(user.room));
      io.to(user.room).emit('newMessage', genMsg('Heresay Admin', `${user.name} has left the room.`));
    }
    console.log('User has disconnected: '+now);
  });
});

// Listen endlessly
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
