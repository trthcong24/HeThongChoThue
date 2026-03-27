const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const env = require("./config/env");
const { initSocket } = require("./services/socket");
const { bootstrapData } = require("./services/bootstrap");
const { verifyToken } = require("./utils/jwt");
const { startReminderScheduler } = require("./services/reminderScheduler");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.clientOrigin
  }
});

io.use((socket, next) => {
  const rawToken = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

  if (!rawToken) {
    return next();
  }

  const token = rawToken.startsWith("Bearer ") ? rawToken.slice(7) : rawToken;

  try {
    socket.user = verifyToken(token);
    return next();
  } catch (error) {
    return next();
  }
});

io.on("connection", (socket) => {
  if (socket.user?.id) {
    socket.join(`user:${socket.user.id}`);
    if (socket.user.role === "admin") {
      socket.join("role:admin");
    }
  }

  socket.on("disconnect", () => {
    // noop
  });
});

initSocket(io);

async function startServer() {
  try {
    await bootstrapData();
    startReminderScheduler();
    server.listen(env.port, () => {
      console.log(`Server is running on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to start server", error);
    process.exit(1);
  }
}

startServer();
