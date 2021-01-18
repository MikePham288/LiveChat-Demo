var express = require('express');
var http = require('http');
var path = require('path');
var socketio = require('socket.io');
var formatMessage = require('./utils/messages');
var { userJoin, getCurrentUser, userLeave, getRoomUsers } = require('./utils/users');

var app = express();
var server = http.createServer(app);
var io = socketio(server);

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

var botName = 'LiveChat Bot';

//Run when clients connects
io.on('connection', (socket) => {
	socket.on('joinRoom', ({ username, room }) => {
		var user = userJoin(socket.id, username, room);
		socket.join(user.room);

		// Welcome current user
		socket.emit('message', formatMessage(botName, 'Welcome to LiveChat!'));

		// Broadcast when a user connects
		socket.broadcast.to(user.room).emit('message', formatMessage(botName, `${user.username} has joined the chat`));

		// Send users and room info
		io.to(user.room).emit('roomUsers', {
			room: user.room,
			users: getRoomUsers(user.room),
		});
	});

	console.log('New WS Connection...');

	// Listen for chatMessage
	socket.on('chatMessage', (msg) => {
		var user = getCurrentUser(socket.id);
		//console.log(msg);
		io.to(user.room).emit('message', formatMessage(user.username, msg));
	});

	// Runs when client disconnects
	socket.on('disconnect', () => {
		var user = userLeave(socket.id);

		if (user) {
			io.to(user.room).emit('message', formatMessage(botName, `${user.username} has left the chat`));

			// Send users and room info
			io.to(user.room).emit('roomUsers', {
				room: user.room,
				users: getRoomUsers(user.room),
			});
		}
	});
});

var PORT = process.env.PORT || '3000';

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
