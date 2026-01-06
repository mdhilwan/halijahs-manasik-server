local M = {}

M.isLoggedIn = false
M.broadcasting = false
M.latestAudioChunk = nil
M.latestAudioChunkId = 0
M.clients = {}

return M
