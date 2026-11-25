const {categories} = require('./questions');

const levels = {
  'Culture générale': [[0,3,6,7,9,16,17,20,21,24,27,28,30,33,34,35,36], [2,25,31]],
  'Cinéma & séries': [[3,5,8,10,11,12,13,14,16,18,20,24,25], [19,21,23]],
  'Musique': [[0,4,7,8,11,12,13,14,15,17,18,19,20,21,22,23,26], [16,24,25]],
  'Sciences & nature': [[1,3,4,5,9,11,14,15,17,18,22,25,27,28,29], [6,7,16,19,20,21,23,24,30,31,32]],
  Fun: [[2,3,7,8,11,13,16,19,20,21,23,24,25], [4,5,6,9,10,12,14,15,18,22,26]],
};
const extras = {
  Gastronomie: [
    ['Quel fruit est à la base du guacamole ?','Avocat','Melon','Citron','Concombre'],
    ['Quel fromage utilise-t-on dans le tiramisu classique ?','Mascarpone','Feta','Comté','Ricotta'],
    ['Quel pays associe-t-on à la paella ?','Espagne','Portugal','Italie','Grèce'],
    ['Quel fruit garnit la tarte Tatin classique ?','Pomme','Poire','Prune','Pêche'],
    ['Quelle herbe parfume le pesto génois ?','Basilic','Ciboulette','Aneth','Estragon'],
    ['Quelle pâte sert à fabriquer les éclairs ?','Pâte à choux','Pâte brisée','Pâte sablée','Pâte à crêpes'],
    ['Quelle légumineuse forme la base du houmous classique ?','Pois chiche','Lentille','Haricot rouge','Petit pois'],
    ['Quel ingrédient compose essentiellement les rösti ?','Pomme de terre','Riz','Patate douce','Carotte'],
    ['Quel fromage entre dans la tartiflette classique ?','Reblochon','Comté','Beaufort','Cantal'],
    ['Quel ingrédient parfume le saumon gravlax ?','Aneth','Basilic','Sauge','Romarin'],
    ['Quelle farine sert à préparer la socca niçoise ?','Pois chiches','Sarrasin','Maïs','Châtaigne'],
    ['Dans quelle sauce mélange-t-on du lait avec un roux ?','Béchamel','Béarnaise','Hollandaise','Vinaigrette'],
    ['Que signifie monder une tomate ?','Retirer la peau','Retirer les graines','La couper en dés','La réduire en purée'],
    ['Quel légume est à la base du baba ganoush ?','Aubergine','Courgette','Artichaut','Poivron'],
    ['Quel fromage bleu est fabriqué avec du lait de brebis ?','Roquefort','Stilton','Gorgonzola','Bleu d’Auvergne'],
    ['Quelle spécialité est associée à Douarnenez ?','Kouign-amann','Canelé','Kouglof','Biscuit rose'],
    ['Quel ingrédient compose une duxelles classique ?','Champignons','Épinards','Poireaux','Carottes'],
    ['Que mélange-t-on au beurre pour faire un beurre manié ?','Farine','Crème','Moutarde','Jaunes d’œufs'],
    ['Quel poisson fournit le katsuobushi ?','Bonite','Saumon','Sole','Merlu'],
    ['Quelle céréale est nixtamalisée pour le pozole ?','Maïs','Riz','Orge','Millet'],
    ['Quelle meringue entre dans la crème chiboust classique ?','Italienne','Suisse','Française','Meringue sèche'],
    ['Quel légume caractérise la sauce Soubise ?','Oignon','Céleri','Fenouil','Carotte'],
    ['Quels jaunes utilise-t-on dans une gribiche classique ?','Cuits durs','Crus','Mollets','Fouettés au bain-marie'],
    ['Sur quoi verse-t-on le sirop chaud d’une pâte à bombe au sucre cuit ?','Jaunes fouettés','Blancs montés','Crème fouettée','Beurre pommade'],
  ],
  'Arts et littérature': [
    ['Qui a peint la Joconde ?','Léonard de Vinci','Raphaël','Monet','Rembrandt'],
    ['Qui a écrit Notre-Dame de Paris ?','Victor Hugo','Voltaire','Balzac','Zola'],
    ['Quel roman met en scène Edmond Dantès ?','Le Comte de Monte-Cristo','Les Misérables','Germinal','Bel-Ami'],
    ['Quel peintre a réalisé Les Nymphéas ?','Claude Monet','Edgar Degas','Paul Cézanne','Édouard Manet'],
    ['Qui a écrit Le Malade imaginaire ?','Molière','Corneille','Racine','Beaumarchais'],
    ['Quel personnage poursuit une baleine blanche ?','Achab','Robinson Crusoé','Cyrano','Gulliver'],
    ['Qui a peint Le Cri ?','Edvard Munch','Salvador Dalí','Gustav Klimt','Edward Hopper'],
    ['Quel auteur a écrit L’Étranger ?','Albert Camus','Jean-Paul Sartre','André Gide','Marcel Proust'],
    ['Qui a sculpté Le Penseur ?','Auguste Rodin','Camille Claudel','Antoine Bourdelle','Constantin Brâncuși'],
    ['Quel écrivain a imaginé le capitaine Nemo ?','Jules Verne','H. G. Wells','Alexandre Dumas','Edgar Allan Poe'],
    ['Quel peintre a réalisé La Persistance de la mémoire ?','Salvador Dalí','René Magritte','Joan Miró','Max Ernst'],
    ['Qui a écrit Mme Bovary ?','Gustave Flaubert','Stendhal','Guy de Maupassant','Honoré de Balzac'],
    ['Quel écrivain signe Le Rouge et le Noir ?','Stendhal','Gustave Flaubert','Émile Zola','Victor Hugo'],
    ['Qui a peint Le Baiser, célèbre tableau doré ?','Gustav Klimt','Egon Schiele','Edvard Munch','Paul Klee'],
    ['Qui a écrit Orgueil et Préjugés ?','Jane Austen','Emily Brontë','George Eliot','Virginia Woolf'],
    ['Quel peintre a réalisé Les Demoiselles d’Avignon ?','Pablo Picasso','Georges Braque','Juan Gris','Henri Matisse'],
    ['Quelle autrice a écrit Mrs Dalloway ?','Virginia Woolf','Jane Austen','Emily Brontë','Mary Shelley'],
    ['Quel peintre a réalisé Les Ménines ?','Diego Vélasquez','Francisco de Goya','Le Greco','Michel-Ange'],
    ['Qui a écrit Le Rivage des Syrtes ?','Julien Gracq','Jean Giono','André Gide','Marguerite Duras'],
    ['Qui a sculpté L’Âge mûr ?','Camille Claudel','Auguste Rodin','Louise Bourgeois','Barbara Hepworth'],
    ['Quel auteur a écrit Les Villes invisibles ?','Italo Calvino','Umberto Eco','Dino Buzzati','Primo Levi'],
    ['Qui a écrit La Vie mode d’emploi ?','Georges Perec','Raymond Queneau','Boris Vian','Michel Butor'],
    ['Qui a peint Un dimanche après-midi à l’Île de la Grande Jatte ?','Georges Seurat','Paul Signac','Claude Monet','Camille Pissarro'],
    ['Qui a écrit Le Maître et Marguerite ?','Mikhaïl Boulgakov','Léon Tolstoï','Anton Tchekhov','Ivan Tourgueniev'],
  ],
};
const supplements = {
  'Culture générale': [
    ['Quel pays a rejoint l’ONU sous le nom de Timor-Leste en 2002 ?','Timor oriental','Papouasie–Nouvelle-Guinée','Fidji','Brunei'],
    ['De quel pays Chișinău est-elle la capitale ?','Moldavie','Lettonie','Arménie','Slovénie'],
    ['Quel écrivain a publié L’Utopie en 1516 ?','Thomas More','Érasme','Montaigne','Francis Bacon'],
    ['Quel autre nom portait Istanbul avant la conquête ottomane de 1453 ?','Constantinople','Smyrne','Antioche','Nicée'],
    ['Quel métal a pour symbole W ?','Tungstène','Titane','Tantale','Vanadium'],
    ['Dans quel pays se trouve la région du Trentin-Haut-Adige ?','Italie','Suisse','Autriche','Allemagne'],
  ],
  'Cinéma & séries': [
    ['Qui a réalisé Les Quatre Cents Coups ?','François Truffaut','Jean-Luc Godard','Claude Chabrol','Jacques Demy'],
    ['Qui a réalisé Le Samouraï avec Alain Delon ?','Jean-Pierre Melville','Henri Verneuil','Claude Sautet','Costa-Gavras'],
    ['Qui a réalisé Rashōmon ?','Akira Kurosawa','Yasujirō Ozu','Kenji Mizoguchi','Takeshi Kitano'],
    ['Qui a réalisé Cléo de 5 à 7 ?','Agnès Varda','Jacques Demy','Marguerite Duras','Éric Rohmer'],
    ['Qui a réalisé La Règle du jeu ?','Jean Renoir','Marcel Carné','René Clair','Jean Vigo'],
    ['Qui a réalisé Paris, Texas ?','Wim Wenders','Werner Herzog','Jim Jarmusch','David Lynch'],
  ],
  Musique: [
    ['Qui a composé Le Sacre du printemps ?','Igor Stravinsky','Maurice Ravel','Claude Debussy','Sergueï Prokofiev'],
    ['Quel pianiste a enregistré The Köln Concert ?','Keith Jarrett','Bill Evans','Herbie Hancock','Chick Corea'],
    ['Quel chanteur a sorti l’album Hunky Dory ?','David Bowie','Elton John','Lou Reed','Paul McCartney'],
    ['Quel groupe a publié l’album Aja ?','Steely Dan','Fleetwood Mac','Supertramp','The Eagles'],
    ['Qui a composé l’opéra Wozzeck ?','Alban Berg','Arnold Schönberg','Richard Strauss','Gustav Mahler'],
    ['Quel groupe a sorti l’album Unknown Pleasures ?','Joy Division','The Cure','New Order','Depeche Mode'],
  ],
};

const asRow = (category, difficulty, [question, ...options]) => ({category, difficulty, question, options});
const bank = [...categories].flatMap(([category, rows]) => {
  const [middle, hard] = levels[category] || [[], []];
  return rows.flatMap((row, index) => {
    if ((category === 'Fun' && [0,15].includes(index)) || (category === 'Cinéma & séries' && [0,17].includes(index))) return [];
    return [{...row, category: category === 'Fun' ? 'WTF' : category, difficulty: hard.includes(index) ? 3 : middle.includes(index) ? 2 : 1}];
  });
});
for (const [category, rows] of Object.entries(extras)) {
  bank.push(...rows.map((row, i) => asRow(category, 1 + Math.floor(i / 8), row)));
}
for (const [category, rows] of Object.entries(supplements)) {
  bank.push(...rows.map(row => asRow(category, 3, row)));
}
const moreMixed = [
  ['WTF',1,'Quel est l’animal national de l’Écosse ?','Licorne','Dragon','Cerf','Phoque'],
  ['WTF',1,'Quel produit a fait l’objet d’un vol de plusieurs millions au Québec ?','Sirop d’érable','Moutarde','Fromage en grains','Myrtilles'],
  ['WTF',1,'Quel sport un astronaute a-t-il pratiqué sur la Lune ?','Golf','Tennis','Badminton','Bowling'],
  ['WTF',1,'Quel animal a été nommé chef de la gare de Kishi, au Japon ?','Chat','Chien','Perroquet','Singe'],
  ['WTF',1,'Comment la tour Eiffel réagit-elle à une forte chaleur ?','Elle grandit légèrement','Elle rétrécit','Elle se décolore','Elle pivote sur sa base'],
  ['Gastronomie',1,'Quel fruit presse-t-on pour obtenir du cidre classique ?','Pomme','Pêche','Raisin','Abricot'],
  ['Gastronomie',1,'Quelle couleur a typiquement le chocolat au lait ?','Brun','Vert','Bleu','Rose'],
  ['Gastronomie',1,'Quel légume est la base des frites classiques ?','Pomme de terre','Panais','Courgette','Potiron'],
  ['Gastronomie',1,'Quelle boisson prépare-t-on avec des feuilles infusées ?','Thé','Chocolat','Jus d’orange','Limonade'],
  ['Gastronomie',2,'Quel grain est utilisé pour un risotto ?','Riz','Orge','Maïs','Millet'],
  ['Gastronomie',2,'Quelle liqueur à l’orange peut parfumer les crêpes Suzette ?','Grand Marnier','Calvados','Whisky','Vodka'],
  ['Gastronomie',2,'Quelle céréale fournit la semoule du couscous classique ?','Blé dur','Seigle','Avoine','Orge'],
  ['Gastronomie',2,'Quel fromage parfume traditionnellement la salade grecque ?','Feta','Halloumi','Mozzarella','Ricotta'],
  ['Géographie',1,'Sur quel continent se trouve le Japon ?','Asie','Europe','Afrique','Océanie'],
  ['Géographie',1,'Quel pays a pour capitale Rome ?','Italie','Grèce','Espagne','Portugal'],
  ['Géographie',1,'Quel océan sépare la France métropolitaine de New York ?','Atlantique','Pacifique','Indien','Arctique'],
  ['Géographie',1,'Dans quelle ville se trouve Big Ben ?','Londres','Dublin','Édimbourg','Manchester'],
  ['Géographie',1,'Quel continent abrite l’Amazonie ?','Amérique du Sud','Afrique','Asie','Océanie'],
  ['Géographie',1,'Quel pays a pour capitale Berlin ?','Allemagne','Autriche','Suisse','Belgique'],
  ['Géographie',1,'Quel pays partage les Pyrénées avec la France et Andorre ?','Espagne','Italie','Portugal','Suisse'],
  ['Géographie',1,'Quel pays a pour capitale Athènes ?','Grèce','Italie','Turquie','Chypre'],
  ['Géographie',2,'Quel fleuve traverse Budapest ?','Danube','Rhin','Oder','Elbe'],
  ['Géographie',2,'Quelle est la capitale du Maroc ?','Rabat','Casablanca','Marrakech','Fès'],
  ['Géographie',2,'Dans quel océan se trouvent les Seychelles ?','Indien','Atlantique','Pacifique','Arctique'],
  ['Géographie',2,'Quel pays abrite la ville de Cracovie ?','Pologne','Tchéquie','Hongrie','Slovaquie'],
  ['Géographie',2,'De quel pays Ljubljana est-elle la capitale ?','Slovénie','Croatie','Slovaquie','Serbie'],
  ['Géographie',2,'Sur quelle île se trouve Palerme ?','Sicile','Sardaigne','Corse','Crète'],
  ['Géographie',2,'Quel pays a pour capitale Tirana ?','Albanie','Bulgarie','Roumanie','Monténégro'],
  ['Géographie',2,'Dans quel pays se trouve la ville de Porto ?','Portugal','Espagne','Italie','Brésil'],
  ['Géographie',2,'Quel pays a pour capitale Oslo ?','Norvège','Suède','Finlande','Danemark'],
  ['Géographie',2,'Quel fleuve traverse Bordeaux ?','Garonne','Seine','Loire','Rhône'],
  ['Géographie',2,'Dans quel pays la ville de Salzbourg se trouve-t-elle ?','Autriche','Allemagne','Suisse','Italie'],
  ['Géographie',2,'Dans quelle mer se jette le Danube ?','Mer Noire','Mer Baltique','Mer Adriatique','Mer du Nord'],
];
bank.push(...moreMixed.map(([category, difficulty, ...row]) => asRow(category, difficulty, row)));
const generalGroups = {
  Géographie:[0,1,3,7,9,12,13,16,20,21,23,25,26,29,30,31,34,36],
  'Arts et littérature':[2,10,15,24,27,28,35],
  Histoire:[6,17,33],
  Sport:[4,8,19,32],
  Gastronomie:[5],
  Société:[14],
  'Science et nature':[11],
  'Pop culture':[18,22],
};
const cleaned = bank.map(row => {
  if (row.category === 'Cinéma & séries') return {...row, category:'Cinéma'};
  if (row.category === 'Sciences & nature') return {...row, category:'Science et nature'};
  if (row.category !== 'Culture générale') return row;
  const index = categories.get('Culture générale').findIndex(q => q.question === row.question);
  const category = Object.keys(generalGroups).find(key => generalGroups[key].includes(index));
  return {...row, category:category || 'Histoire'};
});
module.exports = [...cleaned, ...require('./showdown-themes')];
