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
    }

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'question':
                currentQuestion = {
                    question: data.question,
                    options: data.options
                };
                correctAnswer = data.correctIndex;
                answers = {};

                players.forEach(p => p.send(JSON.stringify({
                    type: 'question',
                    question: data.question,
                    options: data.options
                })));
                break;

            case 'answer':
                answers[data.playerId] = data.answerIndex;

                if (hostSocket) {
                    hostSocket.send(JSON.stringify({
                        type: 'playerAnswers',
                        answers
                    }));
                }
                break;

            case 'showResult':
                players.forEach((p, index) => {
                    p.send(JSON.stringify({
                        type: 'result',
                        correctAnswer,
                        yourAnswer: answers[index]
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
