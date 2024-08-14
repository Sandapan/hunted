const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = process.env.PORT || 3000;

app.use(express.static('public'));

const rooms = {};

const roomNames = [
    'la salle du banquet',
    "l'écurie",
    'la salle des grimoires',
    'la salle des tortures',
    'la salle du trône',
    "l'église"
];

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('createRoom', (username, callback) => {
        const roomId = socket.id;
        rooms[roomId] = {
            host: socket.id,
            hostUsername: username,
            players: [{ id: socket.id, username, role: null, className: null, hp: 3 }],
            choices: {},
            adventurersChosen: false,
            turnCounter: 1 // Initialisation du compteur de tours à 1
        };
        socket.join(roomId);
        callback(roomId);
        io.emit('roomsList', Object.keys(rooms).map(id => ({ id, host: rooms[id].hostUsername })));
    });
    
    //test fonctionne !
    // test thib

    socket.on('getRooms', () => {
        const availableRooms = Object.keys(rooms).map(id => ({
            id,
            host: rooms[id].hostUsername
        }));
        socket.emit('roomsList', availableRooms);
    });

    socket.on('joinRoom', ({ username, roomId }, callback) => {
        if (rooms[roomId]) {
            rooms[roomId].players.push({ id: socket.id, username, role: null, className: null, hp: 3 });
            socket.join(roomId);
            callback(rooms[roomId].players);
            io.in(roomId).emit('updatePlayers', rooms[roomId].players);

            socket.emit('chooseRoleClass');
        }
    });

    socket.on('chooseClass', ({ username, role, className, roomId }, callback) => {
        console.log(`Received chooseClass: role=${role}, className=${className}, roomId=${roomId}`);
        if (!role || !className || !roomId) {
            console.error('chooseClass: Missing required parameters');
            return;
        }

        if (rooms[roomId]) {
            const player = rooms[roomId].players.find(player => player.id === socket.id);
            if (player) {
                player.role = role;
                player.className = className;
                console.log(`Joueur ${player.username} a choisi la classe ${className} avec le rôle ${role}`);
                callback(rooms[roomId].players);
                io.in(roomId).emit('updatePlayers', rooms[roomId].players);
            } else {
                console.error('chooseClass: Player not found in room');
            }
        } else {
            console.error('chooseClass: Room not found');
        }
    });

    socket.on('chooseRoom', ({ roomId, playerId, roomIndex }) => {
        console.log(`chooseRoom reçu: roomId=${roomId}, playerId=${playerId}, roomIndex=${roomIndex}`);
        if (rooms[roomId]) {
            rooms[roomId].choices[playerId] = roomIndex;

            let allAdventurersChosen = true;
            let unchosenAdventurers = [];
            for (let player of rooms[roomId].players) {
                if (player.role === 'aventurier' && !(player.id in rooms[roomId].choices)) {
                    allAdventurersChosen = false;
                    unchosenAdventurers.push(player.username);
                }
            }
            console.log(`Unchosen adventurers: ${unchosenAdventurers}`);

            if (allAdventurersChosen) {
                rooms[roomId].adventurersChosen = true;
                console.log(`Tous les aventuriers ont choisi, début du tour des traqueurs`);
                io.in(roomId).emit('waitAdventurers');
                io.in(roomId).emit('startTraqueursTurn');
            } else {
                io.in(roomId).emit('waitingForPlayers', unchosenAdventurers);
            }
        }
    });

    socket.on('chooseHunterRoom', ({ roomId, playerId, roomIndex }) => {
        console.log(`chooseHunterRoom reçu: roomId=${roomId}, playerId=${playerId}, roomIndex=${roomIndex}`);
        if (rooms[roomId] && rooms[roomId].adventurersChosen) { // Vérifie que les aventuriers ont terminé leur tour
            rooms[roomId].choices[playerId] = roomIndex;
    
            let allHuntersChosen = true;
            let unchosenHunters = [];
            for (let player of rooms[roomId].players) {
                if (player.role === 'traqueur' && !(player.id in rooms[roomId].choices)) {
                    allHuntersChosen = false;
                    unchosenHunters.push(player.username);
                }
            }
            console.log(`Unchosen hunters: ${unchosenHunters}`);
    
            if (allHuntersChosen) {
                console.log(`Tous les traqueurs ont choisi, début de la phase de vérification`);
                // Ici, tu devrais lancer l'événement de transition vers la phase suivante pour les aventuriers
                checkResults(roomId); // Lancement de la phase de vérification
            } else {
                io.in(roomId).emit('waitingForPlayers', unchosenHunters);
            }
        }
    });
    
    


    function startTraqueursTurn(roomId) {
        console.log(`Début du tour des traqueurs pour la salle ${roomId}`);
        rooms[roomId].choices = {};
        io.in(roomId).emit('startTraqueursTurn');
    }

    socket.on('startGame', (roomId) => {
        const room = rooms[roomId];
        if (room && room.host === socket.id) {
            io.in(roomId).emit('gameStarted');
            console.log(`La partie dans la salle ${roomId} a commencé.`);
            io.in(roomId).emit('startAdventurersTurn');
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
        for (let roomId in rooms) {
            const playerIndex = rooms[roomId].players.findIndex(player => player.id === socket.id);
            if (playerIndex !== -1) {
                rooms[roomId].players.splice(playerIndex, 1);
                if (rooms[roomId].players.length === 0 || rooms[roomId].host === socket.id) {
                    delete rooms[roomId];
                    io.in(roomId).emit('roomDeleted');
                } else {
                    io.in(roomId).emit('updatePlayers', rooms[roomId].players);
                }
            }
        }
    });
});

function checkResults(roomId) {
    const room = rooms[roomId];
    console.log('checkResults appelée pour la salle:', roomId);
    
    if (!room) {
        console.error('Salle introuvable:', roomId);
        return;
    }

    const results = [];
    
    // Parcourir toutes les pièces choisies par les traqueurs
    room.players.forEach(hunter => {
        if (hunter.role === 'traqueur') {
            const hunterRoom = room.choices[hunter.id];
            const foundAdventurers = [];
            
            // Vérifier si un aventurier se trouve dans la même pièce
            room.players.forEach(adventurer => {
                if (adventurer.role === 'aventurier' && room.choices[adventurer.id] === hunterRoom) {
                    foundAdventurers.push(adventurer.username);
                }
            });
            
            if (foundAdventurers.length > 0) {
                const roomName = roomNames[hunterRoom];
                let adventurerList = '';
            
                if (foundAdventurers.length === 1) {
                    adventurerList = foundAdventurers[0];
                } else if (foundAdventurers.length === 2) {
                    adventurerList = `${foundAdventurers[0]} et ${foundAdventurers[1]}`;
                } else {
                    adventurerList = `${foundAdventurers.slice(0, -1).join(', ')} et ${foundAdventurers[foundAdventurers.length - 1]}`;
                }
            
                results.push(`${hunter.username} a trouvé ${adventurerList} dans ${roomName}`);
                
                // Réduire les points de vie des aventuriers trouvés
                foundAdventurers.forEach(adventurerUsername => {
                    const adventurer = room.players.find(player => player.username === adventurerUsername);
                    if (adventurer) {
                        adventurer.hp -= 1;
                        if (adventurer.hp <= 0) {
                            // Gérer le cas où un aventurier n'a plus de points de vie
                            results.push(`${adventurer.username} a été éliminé!`);
                        }
                    }
                });
            
                // Envoyer une mise à jour des points de vie à tous les joueurs
                updateHPForAll(roomId);
            }    
        }
    });

    // Si aucun traqueur n'a trouvé d'aventuriers
    if (results.length === 0) {
        results.push("Aucun traqueur n'a trouvé d'aventuriers ce tour !");
    }

    console.log('Résultats générés:', results);

    // Envoyer les résultats à tous les joueurs dans la salle
    io.in(roomId).emit('showResults', results);
    console.log('Résultats envoyés aux joueurs');

    // Démarrer un nouveau tour après 5 secondes
    setTimeout(() => {
        startNewTurn(roomId);
    }, 5000);
}


function startNewTurn(roomId) {
    console.log("Starting new turn for room:", roomId); // Ajoutez ceci pour vérifier
    const room = rooms[roomId];
    
    // Réinitialiser les choix de pièces pour tous les joueurs
    room.choices = {};
    room.adventurersChosen = false;
    
    // Incrémenter le compteur de tours
    room.turnCounter += 1;

    // Envoyer l'information du nouveau tour aux joueurs
    io.in(roomId).emit('updateTurnCounter', room.turnCounter);

    // Débuter le tour des aventuriers
    io.in(roomId).emit('startAdventurersTurn');
}

function updateHPForAll(roomId) {
    const room = rooms[roomId];
    const hpData = room.players.map(player => ({
        username: player.username,
        hp: player.hp
    }));
    io.in(roomId).emit('updateHP', hpData);
}


server.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
