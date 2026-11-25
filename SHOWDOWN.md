# The Great Freddies Showdown

## Test sur le réseau du bureau

1. Décompresser l’archive dans un dossier et ouvrir un terminal dans ce dossier.
2. Dans le terminal, lancer `npm install`, puis `npm start`.
3. Sur le moniteur, ouvrir `http://<adresse-IP-du-PC>:3000/showdown/` dans le navigateur. Utiliser l’adresse IP du PC sur le réseau du bureau pour que le QR code fonctionne depuis les téléphones.
4. Connecter les téléphones au même réseau et scanner le QR. Le réseau doit permettre aux téléphones d’accéder au PC. Un service Render distinct convient si le réseau isole les appareils.
5. Cliquer sur « Activer le son », puis lancer dès que tous les inscrits sont prêts. Il faut au moins trois participants pour jouer les quatre manches.

## Test sur Render

Créer un service Node séparé pour cette version, avec `npm install` comme commande de construction et `npm start` comme commande de démarrage. Ouvrir `https://<adresse-du-service>/showdown/`. La version Quiz Party habituelle est accessible à `/tv.html`.

## Contenu du test

- Banque provisoire de 309 questions. Chacune des 16 catégories apparaît au moins une fois dans chacune des deux manches Mixtes. Sept catégories sont disponibles en manche 3. À 11 joueurs, le tournoi passe de 11 à 6, puis à 3, puis à 2. Les passages de finale utilisent deux séries appariées de 22 questions. Le chrono continue jusqu’au gong si l’un des joueurs termine sa série.
- 31 avatars exclusifs. Pour élargir la galerie, placer des images carrées dans `showdown/portraits/` avec des noms simples, par exemple `01-taylor.jpg`. Les formats JPEG, PNG et WebP sont acceptés. Le jeu charge jusqu’à 50 portraits au total. Redémarrer le serveur après l’ajout.
- Pour l’accueil, placer le fichier audio fourni dans `showdown/accueil.mp3`. Les jingles, la clochette et le buzz sont générés dans le navigateur.
- Les salons sont conservés en mémoire pendant l’exécution du serveur. Une reconnexion de téléphone retrouve la partie. Un redémarrage du serveur efface les parties en cours.
