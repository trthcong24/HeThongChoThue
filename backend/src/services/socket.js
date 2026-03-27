let ioInstance = null;

function initSocket(io) {
  ioInstance = io;
}

function getSocket() {
  return ioInstance;
}

function emitToUser(userId, eventName, payload) {
  if (!ioInstance) {
    return;
  }

  ioInstance.to(`user:${userId}`).emit(eventName, payload);
}

function emitToAdmins(eventName, payload) {
  if (!ioInstance) {
    return;
  }

  ioInstance.to("role:admin").emit(eventName, payload);
}

module.exports = {
  initSocket,
  getSocket,
  emitToUser,
  emitToAdmins
};
