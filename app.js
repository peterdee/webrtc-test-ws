import { createServer } from 'http';
import { Server } from 'socket.io';

const ALLOWED_ORIGINS = [
  'http://localhost:2021',
  'https://webrtc-test-frontend.herokuapp.com',
];

const httpServer = createServer();
const io = new Server(
  httpServer,
  {
    cors: {
      origin: ALLOWED_ORIGINS,
      credentials: true,
    },
  },
);

const store = {};

io.on('connection', (socket) => {
  console.log('-- connected', socket.id);

  socket.on('create-answer', ({ answer, callId }) => {
    store[callId].answer = answer;
    return socket.to(callId).emit('added-answer', { answer });
  });

  socket.on('create-answer-candidate', ({ callId, data }) => {
    if (!(callId && store[callId])) {
      return socket.emit('invalid-call-id');
    }

    store[callId].answerCandidates.push(data);
    return socket.to(callId).emit(
      'create-answer-candidate',
      {
        data,
      },
    );
  });

  socket.on('create-offer', ({ offer }) => {
    store[socket.id] = {
      answer: null,
      answerCandidates: [],
      joiningId: null,
      offer,
      offerCandidates: [],
    };
  });

  socket.on('create-offer-candidate', ({ data }) => {
    store[socket.id].offerCandidates.push(data);
    return socket.to(store[socket.id].joiningId).emit(
      'create-offer-candidate',
      {
        data,
      },
    );
  });

  socket.on('join-call', ({ callId }) => {
    if (!callId) {
      return socket.emit('missing-call-id');
    }

    if (!store[callId]) {
      return socket.emit('invalid-call-id');
    }

    store[callId].joiningId = socket.id;
    return socket.emit('join-call', { offer: store[callId].offer });
  });

  socket.on('disconnect', () => {
    delete store[socket.id];
    return console.log('-- disconnected', socket.id);
  });
});

const PORT = Number(process.env.PORT) || 2121;
httpServer.listen(
  PORT,
  () => console.log(`WEBRTC-TEST-WS is running on port ${PORT}`),
);
