const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const cookieParser = require("cookie-parser");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let hostSocket = null;
let players = []
let currentQuestion = null;
let correctAnswer = null;
let gameRun = false
let roundRun = false

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then(() => console.log("Service Worker registered"))
    .catch(err => console.log("SW error", err));
}

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

app.get('/host', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'host.html'));
});

app.get('/player', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'player.html'));
});

app.post("/login", (req, res) => {
    const username = req.body.username;
    let coincidence = false
    if ((!hostSocket) || (gameRun === true)){
      coincidence = true
    }
    players.forEach(p => {
        if (p.playerName === username) {
            coincidence = true
        }
    });
    if (coincidence === false && (username.length <= 20)) {
      res.cookie("username", username);
      res.redirect("/player.html");
    }
});

wss.on('connection', (ws, req) => {
    const url = req.url;

    if (url === '/host' && (!hostSocket)) {
        hostSocket = ws;
        console.log('Ведущий подключился');
    } else {
        players.push(ws);
        console.log('Игрок подключился');
        ws.send(JSON.stringify({ type: 'join' }))
    }

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'result':
            roundResult = data.correct
                players.forEach(p => p.send(JSON.stringify({
                    type: 'roundres',
                    round_result: roundResult
                })));
            break;

                case 'host_commandGame':
                    gameRun = data.gameRunning;
                    if (gameRun === false) {
                    let winner = {plName : '', plScore : -1}
                      players.forEach(p => {
                          if (p.playerName) {
                              if (state.players[p.playerName].score > winner.plScore){
                                winner.plName = p.playerName
                                winner.plScore = state.players[p.playerName].score
                              }
                          }
                      });
                      plWinner = winner.plName
                      hostSocket.send(JSON.stringify({ type: 'win', plWinner }));
                    }
                    if (hostSocket && gameRun === true) {
                        players.forEach(p => {
                            if (p.playerName) {
                                state.players[p.playerName] = { name: p.playerName, score: 0, player_answers: '', correct: ''};
                            }
                        });
                        hostSocket.send(JSON.stringify({ type: 'state', state }));
                    }
                    players.forEach(p => p.send(JSON.stringify({
                        type: 'gmr',
                        game_Running: gameRun
                    })));
                break;

                case 'host_commandRound':
                    roundRun = data.roundRunning;
                    players.forEach(p => p.send(JSON.stringify({
                        type: 'rnr',
                        round_Running: roundRun
                    })));
                break;

                case 'join':
                    ws.playerName = data.name
                      if (hostSocket) {
                      state = { players: {} }
                        players.forEach(p => {
                            if (p.playerName) {
                                state.players[p.playerName] = { name: p.playerName, score: '', player_answers: '', correct: ''};
                            }
                        });
                        hostSocket.send(JSON.stringify({ type: 'state', state }));
                    }
                    break;


            case 'answer':
                players.forEach(p => {
                    if (p.playerName === ws.playerName) {
                        state.players[p.playerName] = { name: p.playerName, score: data.pscore, player_answers: data.answer, correct: ''};
                    }
                });
                if (hostSocket) {
                    hostSocket.send(JSON.stringify({
                        type: 'state',
                        state
                    }));
                  }
                break;

            case 'playerresult':
                players.forEach(p => {
                    if (p.playerName === ws.playerName) {
                        state.players[p.playerName] = { name: p.playerName, score: data.pscore, player_answers: data.answer, correct: data.plresult};
                    }
                });
                if (hostSocket) {
                    hostSocket.send(JSON.stringify({
                        type: 'state',
                        state
                    }));
                  }
                break;

            case 'proverka':
              console.log(data.win)
            break;
        }
    });

    ws.on('close', () => {
        if (ws === hostSocket) {
            hostSocket = null;
            console.log("Ведущий отключился");
        } else {
            if (hostSocket) {
                players.forEach(p => {
                    if (p.playerName === ws.playerName) {
                        delete state.players[p.playerName]
                    }
                });
                players = players.filter(p => p !== ws);
                hostSocket.send(JSON.stringify({ type: 'state', state }));
            }
            console.log("Игрок отключился");
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Сервер запущен: http://localhost:${PORT}`);
    console.log(`Ведущий: http://localhost:${PORT}/host`);
    console.log(`Игрок: http://localhost:${PORT}/player`);
});
