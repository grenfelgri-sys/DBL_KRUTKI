const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let hostSocket = null;
let players = [];
let currentQuestion = null;
let answers = {};
let correctAnswer = null;

app.use(express.static(path.join(__dirname, 'public')));

app.get('/host', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'host.html'));
});

app.get('/player', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'player.html'));
});

wss.on('connection', (ws, req) => {
    const url = req.url;

    if (url === '/host') {
        hostSocket = ws;
        console.log('Ведущий подключился');
    } else {
        players.push(ws);
        console.log('Игрок подключился');
        console.log(url)
    }

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'question':
                currentQuestion = { question: data.question, options: data.options };
                correctAnswer = data.correctIndex;
                answers = {};

                players.forEach(p => p.send(JSON.stringify({
                    type: 'question',
                    question: data.question,
                    options: data.options
                })));
                break;

                case 'join':
                    ws.playerName = data.name;
                    console.log(`Игрок подключился: ${data.name}`);

                    // Отправляем ведущему список игроков
                    if (hostSocket) {
                        state = { players: {} };
                        players.forEach(p => {
                            if (p.playerName) {
                                state.players[p.playerName] = { name: p.playerName, score: 0 };
                            }
                        });
                        hostSocket.send(JSON.stringify({ type: 'state', state }));
                    }
                    break;


            case 'answer':
                answers[ws.playerName] = data.answer;
                if (hostSocket) {
                    hostSocket.send(JSON.stringify({
                        type: 'playerAnswers',
                        answers
                    }));
                }
                break;

            case 'showResult':
                players.forEach((p) => {
                    p.send(JSON.stringify({
                        type: 'result',
                        correctAnswer,
                        yourAnswer: answers[p.playerName]
                    }));
                });
                break;
        }
    });

    ws.on('close', () => {
        if (ws === hostSocket) {
            hostSocket = null;
            console.log("Ведущий отключился");
        } else {
            players = players.filter(p => p !== ws);
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
