local M = {}

M.currentOtp = nil
M.isLoggedIn = false
M.broadcasting = false
M.latestAudioChunk = nil
M.latestAudioChunkId = 0
M.clients = {}

return M
