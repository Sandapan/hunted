# hunted


// Ligne pour mettre à jour les points de vie des joueurs :
io.in(roomId).emit('updatePlayers', rooms[roomId].players);


// quand on clique sur créer un groupe
-> supprimer salle et retour ?
-> afficher boutons "changer de rôle" et "changer de classe" si et seulement si on a déjà cliqué sur une des 2 images
-> disable le bouton "Démarrer la traque" s'il n'y a pas de joueur ou un nombre insufisant de joueurs.