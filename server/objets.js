// LISTE D OBJETS MISE EN PLACE INVENTAIRE

const items = [
    {
        name: 'Potion de soin',
        description: 'Consommable redonnant 1 HP',
        image: '/images/healing_potion.png',  // Chemin relatif à public
        effect: (player) => { player.hp += 1; }
    },
    {
        name: 'Petite bourse d\'or',
        description: 'Contient 50 pièces d\'or',
        image: '/images/small_gold_pouch.png',  // Chemin relatif à public
        effect: (player) => { player.gold += 50; }
    },
    {
        name: 'Fortune',
        description: 'Contient 100 pièces d\'or',
        image: '/images/fortune.png',  // Chemin relatif à public
        effect: (player) => { player.gold += 100; }
    },
    {
        name: 'Somptueux trésor',
        description: 'Contient 250 pièces d\'or',
        image: '/images/luxurious_treasure.png',  // Chemin relatif à public
        effect: (player) => { player.gold += 250; }
    },
    // Vous pouvez ajouter plus d'objets ici à l'avenir
];




module.exports = items;
