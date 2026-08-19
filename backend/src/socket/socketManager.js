let io;

function setIO(ioInstance) {
  io = ioInstance;
}

function getIO() {
  if (!io) {
    throw new Error("Socket.IO is not initialized");
  }
  return io;
}

module.exports = { setIO, getIO };
