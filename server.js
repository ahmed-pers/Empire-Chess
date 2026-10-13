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
const MAX_OTTOMAN_ABILITY_USES = 2;

const waiting = () => Object.values(lobbies).map((l) => ({ id: l.id, name: l.name, empire: l.empire}));

function ottomanAbilityTargets(game, color) {
    const colorCode = color === "white" ? "w" : "b";
    if (game[color].empire !== "ottoman" || game.ottomanAbilityUses[color] >= MAX_OTTOMAN_ABILITY_USES || game.chess.turn() !== colorCode) return {};

    const board = game.chess.board();
    const targets = {};
    const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];

    const keepsKingSafe = (square) => {
        const simulation = new Chess(game.chess.fen());
        simulation.remove(square);
        return !simulation.isCheck();
    };

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const rook = board[row][col];
            if (!rook || rook.type !== "r" || rook.color !== colorCode) continue;

            const from = "abcdefgh"[col] + (8 - row);
            const rookTargets = [];
            for (const [rowStep, colStep] of directions) {
                let targetRow = row + rowStep;
                let targetCol = col + colStep;

                while (targetRow >= 0 && targetRow < 8 && targetCol >= 0 && targetCol < 8) {
                    const piece = board[targetRow][targetCol];
                    const to = "abcdefgh"[targetCol] + (8 - targetRow);
                    if (!piece) {
                        targetRow += rowStep;
                        targetCol += colStep;
                        continue;
                    }

                    if (piece.color === colorCode && piece.type === "p") {
                        targetRow += rowStep;
                        targetCol += colStep;
                        continue;
                    }

                    if (piece.color !== colorCode && piece.type === "p" && keepsKingSafe(to)) {
                        rookTargets.push(to);
                    }
                    break;
                }
            }

            if (rookTargets.length) targets[from] = rookTargets;
        }
    }

    return targets;
}

function stateOf(game) {
    const legalMoves = {};   // { e2: ["e3","e4"], g1: ["f3","h3"], ... }
    for (const m of game.chess.moves({ verbose: true })) {
        if (!legalMoves[m.from]) legalMoves[m.from] = [];
        if (!legalMoves[m.from].includes(m.to)) legalMoves[m.from].push(m.to);
    }
    const turn = game.chess.turn() === "w" ? "white" : "black";
    const abilityTargets = ottomanAbilityTargets(game, turn);
    return {
        fen: game.chess.fen(),
        turn,
        legalMoves,
        lastMove: game.lastAction,
        ottomanAbilityAvailable: Object.keys(abilityTargets).length > 0,
        ottomanAbilityTargets: abilityTargets,
        ottomanAbilityUsesRemaining: Math.max(0, MAX_OTTOMAN_ABILITY_USES - game.ottomanAbilityUses[turn])
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
            chess: new Chess(),
            lastAction: null,
            ottomanAbilityUses: { white: 0, black: 0 }
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
            const move = game.chess.move({ from, to, promotion: "q" });   // always queen for now
            game.lastAction = { from: move.from, to: move.to, captured: Boolean(move.captured) };
        } catch {
            return;                                  // illegal move: ignore
        }
        io.to(socket.gameId).emit("gameState", stateOf(game));
    });

    socket.on("ottomanAbilityCapture", ({ from, to }) => {
        const game = games[socket.gameId];
        if (!game || !socket.color) return;
        const targets = ottomanAbilityTargets(game, socket.color);
        if (!targets[from]?.includes(to)) return;

        const captured = game.chess.remove(to);
        if (!captured || captured.type !== "p") return;

        const fen = game.chess.fen().split(" ");
        fen[1] = socket.color === "white" ? "b" : "w";
        fen[3] = "-";
        fen[4] = "0";
        if (socket.color === "black") fen[5] = String(Number(fen[5]) + 1);
        game.chess.load(fen.join(" "));
        game.ottomanAbilityUses[socket.color]++;
        game.lastAction = { from, to, captured: true, ability: true };

        io.to(socket.gameId).emit("gameState", stateOf(game));
        io.to(socket.gameId).emit("abilityUsed", { ability: "ottoman" });
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