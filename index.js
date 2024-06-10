const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');

const redisConnection = new Redis('rediss://default:AVNS_m2w_dcCClYxLc-zo9wR@redis-30cb8bb2-skysolo007.a.aivencloud.com:28574')

const httpServer = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('socket io and redis\n');
});

setInterval(() => {
  fetch('https://socket-backend-latest-ju6v.onrender.com').then(() => {
    console.log('Alive ⚓');
    redisConnection.publish("test", "test")
  })
    .catch((error) => {
      console.log(error);
    });
}, 1000 * 60 * 5); // millisecond * second * minute //

setInterval(() => {
  redisConnection.publish("test", "test")
}, 10000); // millisecond * second * minute //

const socketIO = new Server(httpServer, {
  cors: {
    origin: true
  },
})

// socket io
socketIO.on('connection', (socket) => {

  socket.emit('connection', socket.id)

  socket.on('user-connect', async (data) => {
    try {
      await redisConnection.set(`sockets:${socket.id}`, data.toString(), "EX", 60 * 60)
      await redisConnection.hmset(`session:${data}`, { socketId: socket.id, last_activity: true })
    } catch (error) {
      console.log(error)
    }
  });

  socket.on('disconnect', async () => {
    try {
      const id = await redisConnection.get(`sockets:${socket.id}`)
      await redisConnection.del(`sockets:${socket.id}`)
      await redisConnection.hmset(`session:${id}`, { socketId: "null", last_activity: new Date() });
    } catch (error) {
      console.log(error)
    }
  });
});

const sub = redisConnection.duplicate()

sub.subscribe("message")
sub.subscribe("message_seen")
sub.subscribe("message_typing")
sub.subscribe("update_Chat_List")
sub.subscribe("test")

// redis pub/sub
sub.on("message", async (channel, message) => {
  if (channel === "message") {
    const data = JSON.parse(message)
    socketIO.to(data.receiverId).emit('messageEventHandle', data);
  }
  else if (channel === "message_seen") {
    const data = JSON.parse(message)
    socketIO.to(data.receiverId).emit('messageSeenEventHandle', data)
  }
  else if (channel === "message_typing") {
    const data = JSON.parse(message)
    socketIO.to(data.receiverId).emit('messageTypingEventHandle', data);
  }
  else if (channel === "update_Chat_List") {
    const data = JSON.parse(message)
    socketIO.to(data.receiverId).emit('connectionEventHandle', data);
    socketIO.to(data.senderId).emit('connectionEventHandle', data);
  }
  else if (channel === "test") {
    console.log("test function called🤞")
    socketIO.emit('test-all', message);
  }
})

httpServer.listen({ port: 4000 }, () => {
  console.log(`🚀 Server ready at http://localhost:4000`)
});
