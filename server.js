const { Chess } = require("chess.js");
const express = require("express");
const http = require("http");
const { Server } = require ("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const lobbies = {};
const games = {};
let nextId = 1;

const waiting = () => Object.values(lobbies).map((l) => ({ id: l.id, name: l.name, empire: l.empire}));

function stateOf(game) {
    const legalMoves = {};   // { e2: ["e3","e4"], g1: ["f3","h3"], ... }
    for (const m of game.chess.moves({ verbose: true })) {
        if (!legalMoves[m.from]) legalMoves[m.from] = [];
        if (!legalMoves[m.from].includes(m.to)) legalMoves[m.from].push(m.to);
    }
    const last = game.chess.history({ verbose: true }).at(-1);
    return {
        fen: game.chess.fen(),
        turn: game.chess.turn() === "w" ? "white" : "black",
        legalMoves,
        lastMove: last ? { from: last.from, to: last.to, captured: Boolean(last.captured) } : null
    };
}

io.on("connection", (socket) => {
    //lobby page
    socket.emit("lobbies", waiting());

    socket.on("createLobby", ({ name, empire, playerId}) => {
        removeMyLobby(socket);
        const id = String(nextId++);
        lobbies[id] = {id, name: name || "Lobby" + id, empire, playerId, socketId: socket.id};
        socket.lobbyId = id;
        socket.emit("lobbyCreated", id);
        io.emit("lobbies", waiting());
    });

    socket.on("joinLobby", ({ id, empire, playerId}) => {
        const lobby = lobbies[id];
        if (!lobby || lobby.playerId === playerId){
            return socket.emit("errorMsg", "Lobby not available");
        }
        delete lobbies[id];

        //host is white, joiner is black
        games[id] = {
            white: { playerId: lobby.playerId, empire: lobby.empire },
            black: { playerId, empire },
            chess: new Chess()
        };
        io.to(lobby.socketId).emit("gameStart", { gameId: id });
        socket.emit("gameStart", { gameId: id });
        io.emit("lobbies", waiting());
    });

    //game page
    socket.on("joinGame", ({ gameId, playerId }) => {
        const game = games[gameId];

        if (!game) return socket.emit("errorMsg", "Game not found");

        let color = null;
        if (game.white.playerId === playerId) color = "white";
        if (game.black.playerId === playerId) color = "black";
        if (!color) return socket.emit("errorMsg", "You are not in this game");

        socket.join(gameId);
        socket.gameId = gameId;
        socket.color = color;
        socket.emit("gameJoined", {
            color,
            white: game.white.empire,
            black: game.black.empire,
        });
        socket.emit("gameState", stateOf(game));
        socket.to(gameId).emit("opponentConnected");
    });

    socket.on("move", ({ from, to }) => {
        const game = games[socket.gameId];
        if (!game) return;

        const turn = game.chess.turn() === "w" ? "white" : "black";
        if (socket.color !== turn) return;           // not your turn

        try {
            game.chess.move({ from, to, promotion: "q" });   // always queen for now
        } catch {
            return;                                  // illegal move: ignore
        }
        io.to(socket.gameId).emit("gameState", stateOf(game));
    });

    socket.on("disconnect", () => {
        removeMyLobby(socket);
        if (socket.gameId) socket.to(socket.gameId).emit("opponentDisconnected");   // CHANGED: lowercase o
    });

    socket.on("disconnect", () => {
        removeMyLobby(socket);
        if (socket.gameId) socket.to(socket.gameId).emit("OpponentDisconnected");
    });
});

function removeMyLobby(socket){
    const id = socket.lobbyId;
    if (id && lobbies[id]) {
        delete lobbies[id];
        io.emit("lobbies", waiting());
    }
    socket.lobbyId = null;
}

server.listen(3000, () => console.log("http://localhost:3000/home.html"))