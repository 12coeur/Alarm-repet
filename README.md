Mon projet Alarme répétitive se voit amélioré avec un compteur. Ce compte à rebours original va pouvoir vous soulager lors d’exercices quels qu’il soient en effet, ce sont les mouvement et non le temps qui sera décrémenté depuis la quantité que vous aurez réglée.
Voici donc une nouvelle version, (elle est ici) qui vous propose tout plein d’activité sans jamais plus vous ennuyer avec vos envies de vagabondages intellectuels. Timing ou comptage seront remplacés par les sonneries de votre choix. 
Vos remises en forme, votre maintien enfin libérés mentalement. C’est gratuit et si des améliorations se font jour, vous n’aurez rien à faire. Pas de pub, rien, je ferai juste un changement de couleur de fond lorsque j’aurai  fait une amélioration.
Avec la 4° version le mode Compteur ne peut fonctionner que sur les appareils disposant sd’un accéléromètre.
/ (racine)
├── index.html
├── style.css
├── script.js
├── Images/
│   ├── logo.png
│   ├── allonge/
│   │   └── serie1.png … serie10.png
│   ├── gainage/
│   ├── ballon/
│   └── Abdo/
└── Sonneries/
    ├── sonnerie1.wav … sonnerie6.wav

Comme je n'ai pas trouvé d'appli Android avec un chrono inférieur à la minute. J'ai tout simplement demandé à Grok avec cette phrase.
On peut démarrer avec un index, un style.css et un script.js. Comme il s’agit d’un site à créer, Appelons le Alarme Répétitive par Asde Coeur. 
Je veux une présentation RWD.
On aura un curseur pour chaque unité de temps. Heure / Minute / Secondes
Heures et Minutes sont initialisée à Zéro. Secondes à 5.
Un bouton Start qui mute en stop après mise en route.
4 sonneries seront disponibles au départ. Grille de 4 boutons dont un seul apparaît activé. Les autres restent grisés. L’activation déclenche le son.. Celles-ci seront dans le dossier «Sonneries» placé à la racine. On a ; sonnerie1.wav, sonnerie2.wav, sonnerie3,wav, sonnerie4.wav
La limite de temps atteinte la sonnerie par défaut sera lue (sonnerie1.wav). La « duree» (variable indexée à 5 par défaut) atteinte, le décompte se fait à nouveau tant que Stop n’est pas demandé.
En plus d’un affichage de décompte, je voudrais une barre de progression bien visible qui montre la partie du temps à répéter qui est en cours.
Le fond d’écran est à agrandir « au carré disponible», se trouve dans Images et se nomme grok.png
On met au point les fonctions puis je m’occuperai de l’esthétique.
Une version plus compacte , puis ,suite à 15 modifications, redéploiement.
