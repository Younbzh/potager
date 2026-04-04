// ===== Configuration Kokopelli =====
// Si l'URL de recherche change, modifier uniquement ici.
// Pour vérifier : tester https://www.kokopelli-semences.fr/fr/search?q=tomate dans votre navigateur.
const KOKOPELLI = {
  base: 'https://www.kokopelli-semences.fr',
  // URL de recherche — à vérifier et corriger si besoin
  search: 'https://www.kokopelli-semences.fr/fr/search?q=',
  // Grandes catégories du catalogue (vérifiées à partir de la structure du site)
  catalog: [
    { label: 'Tomates',            emoji: '🍅', path: '/fr/c/semences-de-tomates' },
    { label: 'Courgettes & Courges', emoji: '🥒', path: '/fr/c/semences-de-courgettes-et-courges' },
    { label: 'Haricots',           emoji: '🫘', path: '/fr/c/semences-de-haricots' },
    { label: 'Salades & Chicorées',emoji: '🥬', path: '/fr/c/semences-de-salades' },
    { label: 'Carottes',           emoji: '🥕', path: '/fr/c/semences-de-carottes' },
    { label: 'Poivrons & Piments', emoji: '🫑', path: '/fr/c/semences-de-poivrons-et-piments' },
    { label: 'Aubergines',         emoji: '🍆', path: '/fr/c/semences-d-aubergines' },
    { label: 'Concombres',         emoji: '🥒', path: '/fr/c/semences-de-concombres' },
    { label: 'Radis',              emoji: '🔴', path: '/fr/c/semences-de-radis' },
    { label: 'Oignons & Poireaux', emoji: '🧅', path: '/fr/c/semences-d-oignons-et-de-poireaux' },
    { label: 'Épinards & Blettes', emoji: '🥬', path: '/fr/c/semences-d-epinards' },
    { label: 'Betteraves',         emoji: '🟣', path: '/fr/c/semences-de-betteraves' },
    { label: 'Pommes de terre',    emoji: '🥔', path: '/fr/c/semences-de-pommes-de-terre' },
    { label: 'Fraises',            emoji: '🍓', path: '/fr/c/semences-de-fraises' },
    { label: 'Basilic & Aromatiques', emoji: '🌿', path: '/fr/c/semences-aromatiques' },
    { label: 'Tout le catalogue',  emoji: '📖', path: '/fr/c/semences' },
  ]
};

const PLANTS_DB = [
  {
    id: 'tomate',
    name: 'Tomate',
    emoji: '🍅',
    category: 'legume-fruit',
    description: 'Incontournable du potager, la tomate se décline en centaines de variétés. Elle aime la chaleur et le soleil. Très productive quand elle est bien tuteurée.',
    varieties: ['Cerise', 'Cœur de Bœuf', 'Roma', 'Marmande', 'Ananas', 'Noire de Crimée', 'Saint-Pierre'],
    planting: { months: [3, 4, 5], depth: 1, spacing: 60, method: 'Plant ou semis en godet (intérieur)' },
    harvest: { months: [7, 8, 9, 10], duration: '60-80 jours après repiquage' },
    care: {
      water: 'Régulier et constant, 2-3L/pied/semaine',
      sun: 'Plein soleil (min. 6h/jour)',
      soil: 'Riche, frais, bien drainé, pH 6-7',
      tips: [
        'Tuteurer dès 30cm de hauteur',
        'Supprimer les gourmands pour les variétés indéterminées',
        'Arroser au pied, jamais sur les feuilles',
        'Butter le pied pour favoriser l\'enracinement',
        'Pailler le sol pour conserver l\'humidité'
      ]
    },
    biodynamic: 'fruit',
    companions: ['Basilic', 'Carotte', 'Persil', 'Ciboulette'],
    avoid: ['Fenouil', 'Chou', 'Pomme de terre'],
    kokopelli: {
      search: 'tomate',
      catalogPath: '/fr/c/semences-de-tomates',
      varietiesKoko: ['Andine cornue', 'Noire de Crimée', 'Green Zebra', 'Téton de Vénus', 'Pantano Romanesco', 'San Marzano', 'Costoluto Genovese', 'Cerise rouge', 'Black Cherry', 'Chocolate Cherry', 'Cœur de Bœuf']
    }
  },
  {
    id: 'courgette',
    name: 'Courgette',
    emoji: '🥒',
    category: 'legume-fruit',
    description: 'Généreuse et productive, la courgette est idéale pour les débutants. Une seule plante peut envahir le potager — prévoir l\'espace nécessaire !',
    varieties: ['Verte de Milan', 'Jaune dorée', 'Ronde de Nice', 'Diamant', 'Cocozelle'],
    planting: { months: [4, 5, 6], depth: 2, spacing: 100, method: 'Semis direct ou en godet (après les gelées)' },
    harvest: { months: [6, 7, 8, 9], duration: '50-60 jours après semis' },
    care: {
      water: 'Abondant, surtout en période chaude',
      sun: 'Plein soleil',
      soil: 'Riche en compost, humifère',
      tips: [
        'Récolter jeune (15-20cm) pour stimuler la production',
        'Polliniser à la main si peu d\'insectes',
        'Pailler le sol pour conserver l\'humidité',
        'Surveiller l\'oïdium sur les feuilles'
      ]
    },
    biodynamic: 'fruit',
    companions: ['Haricot', 'Maïs', 'Capucine', 'Aneth'],
    avoid: ['Pomme de terre', 'Fenouil'],
    kokopelli: {
      search: 'courgette',
      catalogPath: '/fr/c/semences-de-courgettes-et-courges',
      varietiesKoko: ['Ronde de Nice', 'Verte d\'Italie', 'Jaune de Sétif', 'Tromba d\'Albenga', 'Pâtisson blanc']
    }
  },
  {
    id: 'carotte',
    name: 'Carotte',
    emoji: '🥕',
    category: 'legume-racine',
    description: 'La carotte aime les sols profonds et meubles sans cailloux. Semée directement, elle demande de la patience mais vaut l\'attente.',
    varieties: ['Nantaise', 'Amsterdam', 'Chantenay', 'Touchon', 'Demi-longue de Hollande', 'Purple Haze'],
    planting: { months: [3, 4, 5, 6, 7, 8], depth: 1, spacing: 5, method: 'Semis direct en ligne (ne supporte pas le repiquage)' },
    harvest: { months: [6, 7, 8, 9, 10, 11], duration: '70-90 jours après semis' },
    care: {
      water: 'Modéré, éviter les excès qui fissurent les racines',
      sun: 'Soleil à mi-ombre',
      soil: 'Léger, profond, sans cailloux, pH 6-7',
      tips: [
        'Éclaircir à 5cm dès 10cm de hauteur',
        'Mélanger les graines avec du sable fin pour un espacement régulier',
        'Couvrir de filet anti-mouche de la carotte',
        'Ne pas fertiliser à l\'azote (provoque des racines fourchues)'
      ]
    },
    biodynamic: 'racine',
    companions: ['Oignon', 'Poireau', 'Salade', 'Romarin', 'Ciboulette'],
    avoid: ['Aneth', 'Fenouil'],
    succession: {
      interval: 28,
      seasonStart: 3, seasonEnd: 7,
      maxBatches: 5,
      note: 'Semez un rang toutes les 4 semaines de mars à juillet pour récolter d\'juin à novembre sans interruption.'
    }
  },
  {
    id: 'salade',
    name: 'Salade / Laitue',
    emoji: '🥬',
    category: 'legume-feuille',
    description: 'Culture rapide et facile, la laitue est parfaite pour combler les espaces entre les plantations. Idéale en association.',
    varieties: ['Batavia', 'Romaine', 'Feuille de chêne', 'Iceberg', 'Mâche', 'Roquette', 'Mesclun'],
    planting: { months: [3, 4, 5, 6, 7, 8, 9], depth: 0.5, spacing: 25, method: 'Semis direct ou plants repiqués' },
    harvest: { months: [4, 5, 6, 7, 8, 9, 10], duration: '45-60 jours après semis' },
    care: {
      water: 'Régulier, maintenir la fraîcheur',
      sun: 'Mi-ombre en été (évite la montée en graine)',
      soil: 'Frais, riche, bien drainé',
      tips: [
        'Semer toutes les 3 semaines pour échelonner les récoltes',
        'Arroser le matin de préférence',
        'Récolter avant la montée en graine',
        'Associer avec les radis pour marquer les rangs'
      ]
    },
    biodynamic: 'feuille',
    companions: ['Radis', 'Carotte', 'Fraise', 'Ciboulette'],
    avoid: ['Persil', 'Céleri'],
    succession: {
      interval: 21,
      seasonStart: 3, seasonEnd: 9,
      maxBatches: 8,
      note: 'Semez un petit rang toutes les 3 semaines de mars à septembre : vous aurez toujours une salade à couper sans surplus.'
    }
  },
  {
    id: 'haricot',
    name: 'Haricot Vert',
    emoji: '🫘',
    category: 'legume-fruit',
    description: 'Facile à cultiver, le haricot enrichit le sol en azote. Choisir entre nain (compact) ou grimpant (productif) selon l\'espace.',
    varieties: ['Fin de Bagnols', 'Mangetout', 'Purple Queen', 'Climbing French', 'Borlotti'],
    planting: { months: [5, 6, 7], depth: 4, spacing: 10, method: 'Semis direct (ne supporte pas le repiquage)' },
    harvest: { months: [7, 8, 9], duration: '50-65 jours après semis' },
    care: {
      water: 'Modéré, éviter les feuilles mouillées',
      sun: 'Plein soleil',
      soil: 'Léger, bien drainé, peu calcaire',
      tips: [
        'Ne pas semer avant que la terre soit à 15°C minimum',
        'Tuteurer les variétés grimpantes',
        'Récolter régulièrement pour prolonger la production',
        'Laisser quelques gousses sécher pour récupérer les graines'
      ]
    },
    biodynamic: 'fruit',
    companions: ['Maïs', 'Courgette', 'Carotte', 'Chou'],
    avoid: ['Oignon', 'Ail', 'Fenouil'],
    succession: {
      interval: 21,
      seasonStart: 5, seasonEnd: 7,
      maxBatches: 4,
      note: 'Semez 3-4 lots espacés de 3 semaines de mai à juillet pour récolter de juillet à septembre sans tout avoir d\'un coup.'
    }
  },
  {
    id: 'poivron',
    name: 'Poivron',
    emoji: '🫑',
    category: 'legume-fruit',
    description: 'Le poivron aime la chaleur et le soleil. Cultivé sous abri dans les régions fraîches, il offre des fruits colorés et savoureux.',
    varieties: ['California Wonder', 'Marconi', 'Corne de Taureau', 'Lipstick', 'Chocolate Beauty'],
    planting: { months: [3, 4, 5], depth: 0.5, spacing: 40, method: 'Plant (semis intérieur en février)' },
    harvest: { months: [7, 8, 9, 10], duration: '70-90 jours après plantation' },
    care: {
      water: 'Régulier, jamais en excès',
      sun: 'Plein soleil, chaleur nécessaire (20°C min)',
      soil: 'Riche, bien drainé, chaud',
      tips: [
        'Démarrer en intérieur 8-10 semaines avant plantation dehors',
        'Tuteurer si nécessaire',
        'Récolter vert ou attendre la maturité colorée',
        'Protéger du vent'
      ]
    },
    biodynamic: 'fruit',
    companions: ['Basilic', 'Tomate', 'Carotte', 'Tagète'],
    avoid: ['Fenouil', 'Brocoli']
  },
  {
    id: 'aubergine',
    name: 'Aubergine',
    emoji: '🍆',
    category: 'legume-fruit',
    description: 'Gourmande en chaleur et en nutriments, l\'aubergine récompense avec de belles récoltes estivales aux couleurs magnifiques.',
    varieties: ['Black Beauty', 'Slim Jim', 'Blanche de New York', 'Rosa Bianca', 'Listada de Gandia'],
    planting: { months: [4, 5], depth: 0.5, spacing: 60, method: 'Plant (semis en intérieur en mars)' },
    harvest: { months: [7, 8, 9], duration: '75-85 jours après plantation' },
    care: {
      water: 'Régulier et abondant',
      sun: 'Plein soleil, minimum 25°C',
      soil: 'Riche, chaud, pH 6-6.5',
      tips: [
        'Pincer après 4-5 fleurs pour obtenir de beaux fruits',
        'Pailler pour maintenir la chaleur au sol',
        'Récolter avant complète maturité (peau brillante)',
        'Traiter préventivement contre les pucerons'
      ]
    },
    biodynamic: 'fruit',
    companions: ['Basilic', 'Poivron', 'Tagète'],
    avoid: ['Fenouil', 'Pomme de terre']
  },
  {
    id: 'radis',
    name: 'Radis',
    emoji: '🔴',
    category: 'legume-racine',
    description: 'Le champion de la rapidité ! En 3-4 semaines, vous avez des radis croquants. Parfait en intercalaire et pour les impatients.',
    varieties: ['Flambeau', 'French Breakfast', 'Rond rouge', 'Cherry Belle', 'Radis noir (hiver)'],
    planting: { months: [3, 4, 5, 6, 7, 8, 9], depth: 1, spacing: 3, method: 'Semis direct, à la volée ou en ligne' },
    harvest: { months: [4, 5, 6, 7, 8, 9, 10], duration: '20-30 jours après semis' },
    care: {
      water: 'Régulier, maintenir humide',
      sun: 'Mi-ombre en été (évite la montée en graine)',
      soil: 'Léger, meuble, frais',
      tips: [
        'Ne pas attendre la récolte : devient creux et piquant',
        'Semer toutes les 2-3 semaines pour échelonner',
        'Idéal comme culture intercalaire entre les rangs',
        'Éviter les excès d\'azote'
      ]
    },
    biodynamic: 'racine',
    companions: ['Salade', 'Carotte', 'Épinard'],
    avoid: ['Chou', 'Hysope'],
    succession: {
      interval: 14,
      seasonStart: 3, seasonEnd: 9,
      maxBatches: 12,
      note: 'La plante reine de l\'échelonnement ! Semez toutes les 2 semaines de mars à septembre : récoltez en 3-4 semaines en continu. Idéal pour ne jamais en manquer.'
    }
  },
  {
    id: 'oignon',
    name: 'Oignon',
    emoji: '🧅',
    category: 'legume-racine',
    description: 'Indispensable en cuisine, l\'oignon est facile à cultiver et se conserve longtemps après récolte. Planté en bulbilles pour simplifier.',
    varieties: ['Sturon', 'Rouge de Florence', 'Blanc hâtif', 'Cipollini', 'Walla Walla'],
    planting: { months: [3, 4], depth: 2, spacing: 10, method: 'Bulbilles (petits oignons) ou semis' },
    harvest: { months: [7, 8, 9], duration: '90-120 jours après plantation' },
    care: {
      water: 'Modéré, réduire 3 semaines avant récolte',
      sun: 'Plein soleil',
      soil: 'Léger, profond, bien drainé',
      tips: [
        'Planter les bulbilles pointe vers le haut',
        'Arrêter l\'arrosage quand les tiges tombent',
        'Laisser sécher 2-3 semaines au soleil avant stockage',
        'Surveiller la mouche de l\'oignon (filet de protection)'
      ]
    },
    biodynamic: 'racine',
    companions: ['Carotte', 'Betterave', 'Salade', 'Fraise'],
    avoid: ['Haricot', 'Pois', 'Sauge']
  },
  {
    id: 'ail',
    name: 'Ail',
    emoji: '🧄',
    category: 'legume-racine',
    description: 'Planté en automne, l\'ail est récolté en été. Il repousse naturellement de nombreux nuisibles du potager. Très facile.',
    varieties: ['Rose de Lautrec', 'Germidour', 'Blanc de Lomagne', 'Violet de Cadours'],
    planting: { months: [10, 11], depth: 5, spacing: 15, method: 'Caïeux (gousses séparées)' },
    harvest: { months: [6, 7], duration: 'Récolte quand la moitié des feuilles jaunissent' },
    care: {
      water: 'Peu d\'arrosage, résistant à la sécheresse',
      sun: 'Plein soleil',
      soil: 'Léger, calcaire, bien drainé',
      tips: [
        'Planter la pointe vers le haut',
        'Ne pas enterrer trop profond (5cm max)',
        'Arracher quand 50% des feuilles sont jaunes',
        'Faire sécher 3 semaines à l\'abri avant stockage'
      ]
    },
    biodynamic: 'racine',
    companions: ['Rose', 'Fraise', 'Carotte', 'Tomate'],
    avoid: ['Haricot', 'Pois', 'Chou']
  },
  {
    id: 'basilic',
    name: 'Basilic',
    emoji: '🌿',
    category: 'aromatique',
    description: 'Le roi des aromatiques d\'été, indissociable de la tomate. Craint le froid et l\'eau stagnante. Indispensable !',
    varieties: ['Grand vert', 'Pourpre', 'Nain compact', 'Citronné', 'Thaïlandais', 'Cannelle'],
    planting: { months: [4, 5, 6], depth: 0.5, spacing: 20, method: 'Semis intérieur en avril ou plant dès mai' },
    harvest: { months: [6, 7, 8, 9], duration: 'Dès que la plante a 6 paires de feuilles' },
    care: {
      water: 'Régulier mais pas sur les feuilles',
      sun: 'Plein soleil, chaleur',
      soil: 'Bien drainé, humifère, chaud',
      tips: [
        'Pincer les tiges florales pour prolonger la récolte',
        'Couper toujours au-dessus d\'un nœud foliaire',
        'Rentrer avant les premiers froids',
        'Associer avec la tomate : améliore le goût et repousse les insectes'
      ]
    },
    biodynamic: 'fleur',
    companions: ['Tomate', 'Poivron', 'Aubergine'],
    avoid: ['Sauge', 'Romarin', 'Thym']
  },
  {
    id: 'persil',
    name: 'Persil',
    emoji: '🌿',
    category: 'aromatique',
    description: 'Bisannuel riche en vitamines, le persil est un indispensable. Long à germer (3-4 semaines) : il nécessite de la patience.',
    varieties: ['Frisé', 'Géant d\'Italie (plat)', 'Hamburg (racine comestible)'],
    planting: { months: [3, 4, 5, 6], depth: 0.5, spacing: 20, method: 'Semis direct (tremper les graines 24h avant)' },
    harvest: { months: [5, 6, 7, 8, 9, 10, 11], duration: '70-90 jours après semis' },
    care: {
      water: 'Régulier, sol toujours légèrement humide',
      sun: 'Mi-ombre acceptée',
      soil: 'Riche, frais, bien drainé',
      tips: [
        'Faire tremper les graines 24h avant semis (accélère la germination)',
        'La germination est très longue : 3-4 semaines',
        'Couper au ras pour stimuler la repousse',
        'Peut passer l\'hiver sous un voile de forçage'
      ]
    },
    biodynamic: 'feuille',
    companions: ['Tomate', 'Asperge', 'Carotte', 'Rose'],
    avoid: ['Salade', 'Oignon']
  },
  {
    id: 'ciboulette',
    name: 'Ciboulette',
    emoji: '🌿',
    category: 'aromatique',
    description: 'Vivace facile et décorative avec ses jolies fleurs roses. Elle repousse les pucerons et attire les pollinisateurs. Très robuste.',
    varieties: ['Commune', 'Ail (Ciboulette chinoise)'],
    planting: { months: [3, 4, 5], depth: 0.5, spacing: 25, method: 'Semis ou division de touffe' },
    harvest: { months: [4, 5, 6, 7, 8, 9, 10], duration: 'Dès que les brins font 15cm' },
    care: {
      water: 'Modéré',
      sun: 'Soleil à mi-ombre',
      soil: 'Tous types, préfère sol frais',
      tips: [
        'Couper à 2-3cm du sol pour stimuler la repousse',
        'Diviser la touffe tous les 3 ans',
        'Les fleurs roses sont comestibles',
        'Garder quelques fleurs pour laisser grainer'
      ]
    },
    biodynamic: 'feuille',
    companions: ['Carotte', 'Tomate', 'Rose', 'Salade'],
    avoid: ['Haricot', 'Pois']
  },
  {
    id: 'menthe',
    name: 'Menthe',
    emoji: '🌿',
    category: 'aromatique',
    description: 'Envahissante mais très utile, la menthe est à cultiver en pot pour contenir sa croissance. Repousse de nombreux nuisibles.',
    varieties: ['Poivrée', 'Verte', 'Marocaine', 'Chocolat', 'Ananas', 'Bergamote'],
    planting: { months: [4, 5, 6], depth: 2, spacing: 30, method: 'Plant ou division de rhizome — toujours en pot' },
    harvest: { months: [5, 6, 7, 8, 9], duration: 'Dès que la plante est établie (20cm)' },
    care: {
      water: 'Régulier, aime l\'humidité',
      sun: 'Mi-ombre de préférence',
      soil: 'Riche, frais, humide',
      tips: [
        'Toujours cultiver en pot pour limiter l\'envahissement',
        'Couper avant floraison pour conserver le goût',
        'Rentrer le pot en hiver dans les régions froides',
        'Repousse vigoureusement chaque année'
      ]
    },
    biodynamic: 'feuille',
    companions: ['Chou', 'Tomate', 'Pois'],
    avoid: ['Persil', 'Camomille']
  },
  {
    id: 'epinard',
    name: 'Épinard',
    emoji: '🥬',
    category: 'legume-feuille',
    description: 'Culture de printemps et d\'automne, l\'épinard n\'aime pas la chaleur estivale qui le fait monter en graine. Rapide et nutritif.',
    varieties: ['Géant d\'Hiver', 'Matador', 'Bloomsdale', 'Tétragone (fausse-épinard d\'été)'],
    planting: { months: [3, 4, 8, 9], depth: 2, spacing: 15, method: 'Semis direct' },
    harvest: { months: [4, 5, 6, 10, 11], duration: '40-60 jours après semis' },
    care: {
      water: 'Régulier et constant',
      sun: 'Mi-ombre en été',
      soil: 'Riche en azote, frais',
      tips: [
        'Semer tôt au printemps ou en fin d\'été',
        'Choisir des variétés résistantes à la montée en graine',
        'Récolter les feuilles du bas en premier',
        'Excellent pour les bacs et les balcons'
      ]
    },
    biodynamic: 'feuille',
    companions: ['Fraise', 'Céleri', 'Chou', 'Pois'],
    avoid: ['Betterave', 'Fenouil'],
    succession: {
      interval: 21,
      seasonStart: 3, seasonEnd: 4,
      maxBatches: 3,
      note: 'Semez 2-3 lots espacés de 3 semaines au printemps (mars-avril), puis recommencez en août-septembre pour une récolte automnale.'
    }
  },
  {
    id: 'fraise',
    name: 'Fraise',
    emoji: '🍓',
    category: 'fruit',
    description: 'Facile et très productive, la fraise est adorée des enfants. Les stolons permettent de multiplier les plants gratuitement.',
    varieties: ['Charlotte', 'Mara des Bois', 'Gariguette', 'Ciflorette', 'Fraise des Bois'],
    planting: { months: [3, 4, 9, 10], depth: 0, spacing: 30, method: 'Plant ou stolon enraciné' },
    harvest: { months: [5, 6, 7, 8], duration: '3-4 semaines après floraison' },
    care: {
      water: 'Régulier, éviter de mouiller les fruits',
      sun: 'Plein soleil',
      soil: 'Riche, légèrement acide, bien drainé',
      tips: [
        'Ne jamais enterrer le collet (nœud central)',
        'Supprimer les stolons sauf pour multiplication',
        'Pailler sous les fruits pour les protéger de la boue',
        'Renouveler les plants tous les 3-4 ans'
      ]
    },
    biodynamic: 'fruit',
    companions: ['Ail', 'Salade', 'Épinard', 'Bourrache'],
    avoid: ['Chou', 'Fenouil']
  },
  {
    id: 'pomme-de-terre',
    name: 'Pomme de Terre',
    emoji: '🥔',
    category: 'legume-racine',
    description: 'Culture facile et très productive, parfaite pour ameublir une nouvelle parcelle. Les primeurs récoltées fraîches sont un délice.',
    varieties: ['Charlotte', 'Ratte', 'Belle de Fontenay', 'Amandine', 'BF15', 'Vitelotte (violette)'],
    planting: { months: [3, 4, 5], depth: 10, spacing: 40, method: 'Plants germés (pommes de terre-semences)' },
    harvest: { months: [6, 7, 8, 9], duration: 'Quand le feuillage commence à jaunir' },
    care: {
      water: 'Régulier, crucial pendant la tubérisation',
      sun: 'Plein soleil',
      soil: 'Profond, meuble, légèrement acide',
      tips: [
        'Butter régulièrement pour éviter le verdissement des tubercules',
        'Arrêter l\'arrosage 2 semaines avant la récolte',
        'Faire germer les plants 4-6 semaines à l\'avance',
        'Laisser sécher 2h au soleil avant stockage'
      ]
    },
    biodynamic: 'racine',
    companions: ['Haricot', 'Chou', 'Maïs', 'Capucine'],
    avoid: ['Tomate', 'Concombre', 'Tournesol']
  },
  {
    id: 'concombre',
    name: 'Concombre',
    emoji: '🥒',
    category: 'legume-fruit',
    description: 'Gourmand en eau et en chaleur, le concombre est très productif en plein été. Délicieux frais, il se cultive aussi en serre.',
    varieties: ['Marketmore', 'Vert long maraîcher', 'Muncher', 'Lemon Cucumber', 'Poinsett'],
    planting: { months: [4, 5, 6], depth: 2, spacing: 60, method: 'Semis en godet ou semis direct après 15°C' },
    harvest: { months: [7, 8, 9], duration: '50-60 jours après semis' },
    care: {
      water: 'Abondant et régulier, jamais de stress hydrique',
      sun: 'Plein soleil, chaleur',
      soil: 'Riche, chaud, bien drainé',
      tips: [
        'Faire grimper sur un support pour gagner de la place',
        'Récolter avant que les graines durcissent',
        'Maintenir une humidité constante (évite l\'amertume)',
        'Ventiler pour prévenir l\'oïdium'
      ]
    },
    biodynamic: 'fruit',
    companions: ['Haricot', 'Pois', 'Salade', 'Aneth'],
    avoid: ['Pomme de terre', 'Tomate', 'Sauge'],
    succession: {
      interval: 21,
      seasonStart: 4, seasonEnd: 6,
      maxBatches: 3,
      note: 'Semez 2-3 lots espacés de 3 semaines d\'avril à juin pour étaler la récolte sur tout l\'été sans surplus.'
    }
  },
  {
    id: 'capucine',
    name: 'Capucine',
    emoji: '🌸',
    category: 'fleur-compagne',
    description: 'Compagne indispensable du potager. Elle joue le rôle de plante-piège en attirant les pucerons loin des légumes. Ses fleurs et feuilles sont comestibles (saveur poivrée). Existe en naine et grimpante.',
    varieties: ['Empress of India (naine écarlate)', 'Couleurs mélangées (grimpante)', 'Alaska (feuilles panachées)', 'Gleam (semi-grimpante)'],
    planting: { months: [4, 5, 6], depth: 2, spacing: 25, method: 'Semis en godet ou direct après les gelées (sol à 10°C)' },
    harvest: { months: [6, 7, 8, 9, 10], duration: '45-60 jours après semis' },
    care: {
      water: 'Peu — sol pauvre pour plus de fleurs',
      sun: 'Plein soleil à mi-ombre',
      soil: 'Pauvre à moyen — un sol trop riche donne des feuilles sans fleurs',
      tips: [
        'Sol pauvre = plus de fleurs : ne pas fertiliser',
        'Plante-piège : laisser les pucerons s\'installer pour protéger les légumes voisins',
        'Fleurs et feuilles comestibles, saveur poivrée',
        'Se ressème spontanément d\'une année à l\'autre'
      ]
    },
    biodynamic: 'fleur',
    companions: ['Tomate', 'Courgette', 'Haricot', 'Chou', 'Concombre'],
    avoid: [],
    kokopelli: {
      search: 'capucine',
      catalogPath: '/fr/c/semences-de-fleurs',
      varietiesKoko: ['Empress of India', 'Fordhook Favorites', 'Gleam Salmon', 'Alaska']
    }
  },
  {
    id: 'tagete',
    name: 'Tagète / Souci d\'Inde',
    emoji: '🌼',
    category: 'fleur-compagne',
    description: 'L\'une des meilleures plantes compagnes du potager. Ses racines sécrètent une substance toxique pour les nématodes, et son parfum fort repousse pucerons et mouches blanches. Indispensable au pied des tomates.',
    varieties: ['Double Pinwheel', 'Nain Double Mixed', 'Safari Series', 'Boy Series', 'Strawberry Blonde'],
    planting: { months: [3, 4, 5], depth: 0.5, spacing: 20, method: 'Semis intérieur mars-avril, repiquer après les gelées' },
    harvest: { months: [6, 7, 8, 9, 10], duration: 'Floraison continue de juin jusqu\'aux gelées' },
    care: {
      water: 'Modéré, résistant à la sécheresse',
      sun: 'Plein soleil',
      soil: 'Tous types, même pauvre',
      tips: [
        'Planter en bordure ET au pied des tomates',
        'Ses racines détruisent les nématodes du sol sur 2-3 ans',
        'Supprimer les fleurs fanées pour prolonger la floraison',
        'Laisser sécher quelques fleurs pour récupérer les graines'
      ]
    },
    biodynamic: 'fleur',
    companions: ['Tomate', 'Poivron', 'Aubergine', 'Concombre', 'Chou'],
    avoid: ['Haricot'],
    kokopelli: {
      search: 'tagète souci inde',
      catalogPath: '/fr/c/semences-de-fleurs',
      varietiesKoko: ['Œillet d\'Inde nain', 'Tagète érigée']
    }
  },
  {
    id: 'bourrache',
    name: 'Bourrache Bleue',
    emoji: '💙',
    category: 'fleur-compagne',
    description: 'Plante mellifère exceptionnelle — les abeilles l\'adorent. Elle améliore la pollinisation de tout le potager, repousse le ver du chou et enrichit le sol. Fleurs et jeunes feuilles comestibles (goût concombre).',
    varieties: ['Bleue officinale', 'Blanche (officinalis alba)'],
    planting: { months: [3, 4, 5, 6], depth: 1, spacing: 30, method: 'Semis direct — ne supporte pas le repiquage' },
    harvest: { months: [6, 7, 8, 9, 10], duration: '50-60 jours après semis' },
    care: {
      water: 'Peu une fois établie — résistante à la sécheresse',
      sun: 'Plein soleil à mi-ombre',
      soil: 'Tous types, même pauvre et sec',
      tips: [
        'Se ressème spontanément chaque année',
        'Fleurs et jeunes feuilles comestibles — saveur concombre',
        'Attire fortement les abeilles : essentielle pour la pollinisation',
        'Améliore la croissance des fraises et tomates à proximité'
      ]
    },
    biodynamic: 'fleur',
    companions: ['Tomate', 'Fraise', 'Courgette', 'Chou'],
    avoid: [],
    kokopelli: {
      search: 'bourrache bleue',
      catalogPath: '/fr/c/semences-de-fleurs',
      varietiesKoko: ['Bourrache bleue officinale', 'Bourrache blanche']
    }
  },
  {
    id: 'tabac',
    name: 'Tabac d\'ornement',
    emoji: '🌺',
    category: 'fleur-compagne',
    description: 'Le tabac d\'ornement (Nicotiana sylvestris "Ghost Pipes") attire les pollinisateurs nocturnes grâce à ses fleurs blanches parfumées le soir. Ses poils glanduleux piègent les insectes nuisibles. Très décoratif.',
    varieties: ['Ghost Pipes (sylvestris)', 'Sensation Mixed', 'Lime Green', 'Perfume Deep Purple'],
    planting: { months: [3, 4, 5], depth: 0, spacing: 40, method: 'Semis intérieur (graines très fines, ne pas couvrir — lumière nécessaire à la germination)' },
    harvest: { months: [7, 8, 9, 10], duration: 'Floraison juillet → gelées' },
    care: {
      water: 'Régulier sans excès',
      sun: 'Soleil à mi-ombre',
      soil: 'Riche, frais, bien drainé',
      tips: [
        'Graines microscopiques : semer en surface sans couvrir',
        'Lumière nécessaire à la germination (ne pas enterrer)',
        'Les poils glanduleux des tiges capturent mouches blanches et pucerons',
        '⚠️ Toutes les parties sont toxiques si ingérées — tenir hors de portée des enfants'
      ]
    },
    biodynamic: 'fleur',
    companions: ['Tomate', 'Courgette', 'Poivron'],
    avoid: [],
    kokopelli: {
      search: 'nicotiana tabac ornemental',
      catalogPath: '/fr/c/semences-de-fleurs',
      varietiesKoko: ['Nicotiana sylvestris', 'Nicotiana alata']
    }
  },
  {
    id: 'betterave',
    name: 'Betterave',
    emoji: '🟣',
    category: 'legume-racine',
    description: 'Facile et rustique, la betterave offre ses feuilles et ses racines à la cuisine. Délicieuse crue en salade ou cuite au four.',
    varieties: ['Rouge de Détroit', 'Chioggia (rayée)', 'Crapaudine', 'Golden (jaune)', 'Cylindra'],
    planting: { months: [4, 5, 6, 7], depth: 2, spacing: 10, method: 'Semis direct (chaque "graine" = glomérule de 2-3 graines)' },
    harvest: { months: [7, 8, 9, 10], duration: '70-90 jours après semis' },
    care: {
      water: 'Modéré et régulier',
      sun: 'Soleil à mi-ombre',
      soil: 'Profond, meuble, sans excès d\'azote',
      tips: [
        'Éclaircir à 10cm : chaque glomérule donne plusieurs plants',
        'Récolter jeune pour la saveur (5-8cm de diamètre)',
        'Les feuilles se cuisinent comme des épinards',
        'Excellente conservation en cave dans du sable'
      ]
    },
    biodynamic: 'racine',
    companions: ['Oignon', 'Chou', 'Salade'],
    avoid: ['Haricot', 'Moutarde'],
    succession: {
      interval: 21,
      seasonStart: 4, seasonEnd: 7,
      maxBatches: 4,
      note: 'Semez 3-4 lots espacés de 3 semaines d\'avril à juillet pour récolter des betteraves tendres de juillet à octobre.'
    }
  },
  {
    id: 'pois-gourmand',
    name: 'Pois gourmand',
    emoji: '🫛',
    category: 'legume-fruit',
    description: 'Le pois mangetout se consomme cosse et tout, croquant et sucré. Très productif et rapide, il est idéal en début de saison car il supporte les températures fraîches. Norli est une variété naine particulièrement adaptée aux semis denses et aux petits espaces.',
    varieties: ['Norli', 'Carouby de Maussane', 'Oregon Sugar Pod', 'Géant suisse'],
    planting: { months: [2, 3, 4, 5], depth: 3, spacing: 8, method: 'Semis direct en ligne — ne pas repiquer (racines fragiles)' },
    harvest: { months: [5, 6, 7], duration: '60-70 jours après semis' },
    care: {
      water: 'Modéré, arroser à la base, éviter le feuillage',
      sun: 'Plein soleil à mi-ombre',
      soil: 'Léger, bien drainé, peu fertile (fixe l\'azote)',
      tips: [
        'Ne pas fertiliser — le pois fixe lui-même l\'azote atmosphérique',
        'Norli est nain (60 cm) — un tuteurage léger suffit',
        'Récolter régulièrement pour stimuler la production',
        'Semer tôt — supporte jusqu\'à -5°C une fois levé',
        'Excellent précédent cultural : enrichit le sol en azote pour les tomates',
        'Après récolte, laisser les racines en place et enfouir le feuillage'
      ]
    },
    biodynamic: 'fruit',
    companions: ['Carotte', 'Radis', 'Salade', 'Épinard', 'Ciboulette'],
    avoid: ['Oignon', 'Ail', 'Fenouil'],
    kokopelli: {
      search: 'pois gourmand',
      catalogPath: '/fr/c/semences-de-haricots',
      varietiesKoko: ['Norli', 'Carouby de Maussane', 'Géant suisse']
    }
  },
  {
    id: 'poireau',
    name: 'Poireau',
    emoji: '🥬',
    category: 'legume-feuille',
    description: 'Légume d\'hiver par excellence, le poireau se sème au printemps pour une récolte à partir de l\'automne. Très rustique, il résiste aux fortes gelées. Le Bleu d\'Hiver est une variété tardive de conservation extraordinaire, récoltable jusqu\'en mars.',
    varieties: ["Bleu d'Hiver", 'Monstrueux de Carentan', 'Saint Victor', "Géant d'Automne", 'Jaune Gros du Poitou'],
    planting: { months: [2, 3, 4], depth: 1, spacing: 15, method: 'Semis en godets à l\'intérieur — repiquage en trou profond après 10-12 semaines' },
    harvest: { months: [10, 11, 12, 1, 2, 3], duration: '150-180 jours après repiquage' },
    care: {
      water: 'Régulier mais pas excessif — sensible à l\'engorgement',
      sun: 'Plein soleil à mi-ombre',
      soil: 'Riche, profond, bien ameubli, pH 6,5-7',
      tips: [
        'Repiquer dans un trou de 15 cm creusé au plantoir — ne pas reboucher, laisser la pluie faire',
        'Butter progressivement pour allonger et blanchir le fût (plusieurs fois)',
        'Arroser au pied pour éviter la rouille du poireau',
        'Peut rester en terre tout l\'hiver — récolter à la demande',
        'Excellent en potée, vinaigrette tiède ou flambé',
        'Succession idéale après les pois : les racines de pois enrichissent le sol'
      ]
    },
    biodynamic: 'feuille',
    companions: ['Carotte', 'Céleri', 'Tomate', 'Betterave'],
    avoid: ['Haricot', 'Pois', 'Oignon (concurrence)'],
    kokopelli: {
      search: 'poireau',
      catalogPath: '/fr/c/semences-d-oignons-et-de-poireaux',
      varietiesKoko: ["Bleu d'Hiver", 'Monstrueux de Carentan', 'Saint Victor']
    }
  },
  {
    id: 'courge',
    name: 'Courge',
    emoji: '🎃',
    category: 'legume-fruit',
    description: 'La courge musquée (Cucurbita moschata) est la plus savoureuse et la mieux conservée de toutes. Moschata Banat est une variété ancienne d\'exception, très productive, à la chair ferme et dorée. Plante gourmande en espace — prévoir 3-4 m² par pied minimum.',
    varieties: ['Moschata Banat', 'Butternut Waltham', 'Musquée de Provence', 'Longue de Nice', 'Spaghetti', 'Potimarron rouge'],
    planting: { months: [4, 5], depth: 2, spacing: 200, method: 'Semis en godet intérieur (1-2 graines) — repiquage après les gelées, sol réchauffé' },
    harvest: { months: [8, 9, 10], duration: '90-120 jours après repiquage' },
    care: {
      water: 'Abondant — 2-3 L/pied × 3 fois/semaine par temps chaud',
      sun: 'Plein soleil indispensable — exposé Sud idéal',
      soil: 'Très riche en compost, humifère, bien drainé, pH 6-7',
      tips: [
        'Pincer l\'apex principal après 2 fruits noués pour concentrer l\'énergie',
        'Glisser une ardoise ou une tuile sous chaque fruit pour éviter le pourrissement',
        'Couper la queue à 10 cm du fruit à la récolte — favorise la conservation',
        'Conserver dans un endroit sec, tempéré (10-15°C) — se garde 6 à 8 mois',
        'Moschata Banat tolère mieux la sécheresse que courgette ou concombre',
        'Peut grimper sur une clôture ou un filet — nouer les fruits si plus de 3 kg'
      ]
    },
    biodynamic: 'fruit',
    companions: ['Haricot', 'Capucine', 'Basilic', 'Maïs'],
    avoid: ['Pomme de terre', 'Courgette (compétition racines)'],
    kokopelli: {
      search: 'courge',
      catalogPath: '/fr/c/semences-de-courgettes-et-courges',
      varietiesKoko: ['Moschata Banat', 'Butternut Waltham', 'Musquée de Provence', 'Longue de Nice', 'Potimarron rouge']
    }
  }
];

// ===== Timelines de culture (semis → acclimatation → repiquage → récolte) =====
// weekToHarden / weekToTransplant : semaines depuis la date de semis
// harvestDaysMin/Max : jours depuis la date de repiquage (ou semis si direct)
const PLANT_TIMELINE = {
  'tomate':     { plantType:'indoor',    weekToHarden:6,  weekToTransplant:8,  minOutdoorTemp:12, frostSensitive:true,  harvestDaysMin:60,  harvestDaysMax:120, biodynamicIdeal:'fruit'  },
  'poivron':    { plantType:'indoor',    weekToHarden:8,  weekToTransplant:10, minOutdoorTemp:15, frostSensitive:true,  harvestDaysMin:70,  harvestDaysMax:110, biodynamicIdeal:'fruit'  },
  'aubergine':  { plantType:'indoor',    weekToHarden:9,  weekToTransplant:11, minOutdoorTemp:18, frostSensitive:true,  harvestDaysMin:70,  harvestDaysMax:100, biodynamicIdeal:'fruit'  },
  'courgette':  { plantType:'indoor',    weekToHarden:3,  weekToTransplant:4,  minOutdoorTemp:12, frostSensitive:true,  harvestDaysMin:45,  harvestDaysMax:80,  biodynamicIdeal:'fruit'  },
  'concombre':  { plantType:'indoor',    weekToHarden:3,  weekToTransplant:4,  minOutdoorTemp:15, frostSensitive:true,  harvestDaysMin:45,  harvestDaysMax:75,  biodynamicIdeal:'fruit'  },
  'basilic':    { plantType:'indoor',    weekToHarden:5,  weekToTransplant:7,  minOutdoorTemp:15, frostSensitive:true,  harvestDaysMin:30,  harvestDaysMax:120, biodynamicIdeal:'fleur'  },
  'persil':     { plantType:'direct',    weekToHarden:null,weekToTransplant:null,minOutdoorTemp:5, frostSensitive:false, harvestDaysMin:70,  harvestDaysMax:150, biodynamicIdeal:'feuille' },
  'ciboulette': { plantType:'direct',    weekToHarden:null,weekToTransplant:null,minOutdoorTemp:5, frostSensitive:false, harvestDaysMin:50,  harvestDaysMax:150, biodynamicIdeal:'feuille' },
  'menthe':     { plantType:'perennial', weekToHarden:null,weekToTransplant:null,minOutdoorTemp:5, frostSensitive:false, harvestDaysMin:30,  harvestDaysMax:180, biodynamicIdeal:'feuille' },
  'salade':     { plantType:'indoor',    weekToHarden:2,  weekToTransplant:3,  minOutdoorTemp:5,  frostSensitive:false, harvestDaysMin:40,  harvestDaysMax:65,  biodynamicIdeal:'feuille' },
  'epinard':    { plantType:'direct',    weekToHarden:null,weekToTransplant:null,minOutdoorTemp:3, frostSensitive:false, harvestDaysMin:40,  harvestDaysMax:60,  biodynamicIdeal:'feuille' },
  'carotte':    { plantType:'direct',    weekToHarden:null,weekToTransplant:null,minOutdoorTemp:5, frostSensitive:false, harvestDaysMin:70,  harvestDaysMax:90,  biodynamicIdeal:'racine'  },
  'radis':      { plantType:'direct',    weekToHarden:null,weekToTransplant:null,minOutdoorTemp:5, frostSensitive:false, harvestDaysMin:20,  harvestDaysMax:30,  biodynamicIdeal:'racine'  },
  'betterave':  { plantType:'direct',    weekToHarden:null,weekToTransplant:null,minOutdoorTemp:7, frostSensitive:false, harvestDaysMin:70,  harvestDaysMax:90,  biodynamicIdeal:'racine'  },
  'oignon':     { plantType:'bulb',      weekToHarden:null,weekToTransplant:null,minOutdoorTemp:5, frostSensitive:false, harvestDaysMin:90,  harvestDaysMax:120, biodynamicIdeal:'racine'  },
  'ail':        { plantType:'bulb',      weekToHarden:null,weekToTransplant:null,minOutdoorTemp:3, frostSensitive:false, harvestDaysMin:240, harvestDaysMax:280, biodynamicIdeal:'racine'  },
  'haricot':    { plantType:'direct',    weekToHarden:null,weekToTransplant:null,minOutdoorTemp:15,frostSensitive:true,  harvestDaysMin:50,  harvestDaysMax:65,  biodynamicIdeal:'fruit'  },
  'pois':       { plantType:'direct',    weekToHarden:null,weekToTransplant:null,minOutdoorTemp:5, frostSensitive:false, harvestDaysMin:60,  harvestDaysMax:90,  biodynamicIdeal:'fruit'  },
  'fraise':     { plantType:'perennial', weekToHarden:null,weekToTransplant:null,minOutdoorTemp:5, frostSensitive:false, harvestDaysMin:45,  harvestDaysMax:90,  biodynamicIdeal:'fruit'  },
  'capucine':   { plantType:'indoor',    weekToHarden:4,  weekToTransplant:6,  minOutdoorTemp:10, frostSensitive:true,  harvestDaysMin:50,  harvestDaysMax:150, biodynamicIdeal:'fleur'  },
  'tagete':     { plantType:'indoor',    weekToHarden:4,  weekToTransplant:6,  minOutdoorTemp:10, frostSensitive:true,  harvestDaysMin:55,  harvestDaysMax:150, biodynamicIdeal:'fleur'  },
  'bourrache':  { plantType:'indoor',    weekToHarden:2,  weekToTransplant:3,  minOutdoorTemp:8,  frostSensitive:false, harvestDaysMin:45,  harvestDaysMax:100, biodynamicIdeal:'fleur'  },
  'tabac':         { plantType:'indoor',  weekToHarden:5,  weekToTransplant:7,  minOutdoorTemp:12, frostSensitive:true,  harvestDaysMin:80,  harvestDaysMax:160, biodynamicIdeal:'fleur'  },
  'pois-gourmand': { plantType:'direct',  weekToHarden:null,weekToTransplant:null,minOutdoorTemp:3, frostSensitive:false, harvestDaysMin:60,  harvestDaysMax:80,  biodynamicIdeal:'fruit'  },
  'poireau':       { plantType:'direct',  weekToHarden:null,weekToTransplant:null,minOutdoorTemp:5, frostSensitive:false, harvestDaysMin:150, harvestDaysMax:200, biodynamicIdeal:'feuille' },
  'courge':        { plantType:'indoor',  weekToHarden:3,  weekToTransplant:5,  minOutdoorTemp:12, frostSensitive:true,  harvestDaysMin:90,  harvestDaysMax:130, biodynamicIdeal:'fruit'  },
};

// ===== Statuts de croissance =====
const PLANT_STATUS = {
  semis:          { label: 'Semis / Godets',  emoji: '🌱', color: '#e8f5e9', textColor: '#2e7d32', next: 'croissance' },
  croissance:     { label: 'En croissance',   emoji: '🌿', color: '#c8e6c9', textColor: '#1b5e20', next: 'floraison'  },
  floraison:      { label: 'En fleurs',       emoji: '🌸', color: '#fce4ec', textColor: '#880e4f', next: 'recolte'   },
  fructification: { label: 'Fructification',  emoji: '🍅', color: '#fbe9e7', textColor: '#bf360c', next: 'recolte'   },
  recolte:        { label: 'En récolte',      emoji: '🧺', color: '#fff9c4', textColor: '#f57f17', next: 'termine'   },
  termine:        { label: 'Terminé',         emoji: '💤', color: '#eeeeee', textColor: '#757575', next: null        },
  growing:        { label: 'En croissance',   emoji: '🌿', color: '#c8e6c9', textColor: '#1b5e20', next: 'floraison' }, // compat
};

// ===== Familles botaniques (pour la rotation des cultures) =====
const BOTANICAL_FAMILIES = {
  solanacees:    { label: 'Solanacées',    emoji: '🍅', color: '#ffcdd2', rotationYears: 4, members: ['tomate','poivron','aubergine','pomme-de-terre','tabac'] },
  cucurbitacees: { label: 'Cucurbitacées', emoji: '🥒', color: '#dcedc8', rotationYears: 3, members: ['courgette','concombre','courge'] },
  apiacees:      { label: 'Apiacées',      emoji: '🥕', color: '#fff9c4', rotationYears: 3, members: ['carotte','persil','ciboulette'] },
  asteracees:    { label: 'Astéracées',    emoji: '🌼', color: '#f3e5f5', rotationYears: 2, members: ['salade','tagete'] },
  fabacees:      { label: 'Fabacées',      emoji: '🫘', color: '#e8f5e9', rotationYears: 3, members: ['haricot','pois-gourmand'] },
  brassicacees:  { label: 'Brassicacées',  emoji: '🥬', color: '#e0f2f1', rotationYears: 3, members: ['radis'] },
  alliacees:     { label: 'Alliacées',     emoji: '🧅', color: '#e8eaf6', rotationYears: 2, members: ['oignon','ail','poireau'] },
  lamiacees:     { label: 'Lamiacées',     emoji: '🌿', color: '#e8f5e9', rotationYears: 2, members: ['basilic','menthe'] },
  chenopodiacees:{ label: 'Chénopodiacées',emoji: '🥬', color: '#fce4ec', rotationYears: 2, members: ['epinard','betterave'] },
  rosacees:      { label: 'Rosacées',      emoji: '🍓', color: '#fce4ec', rotationYears: 3, members: ['fraise'] },
  tropaeolacees: { label: 'Tropéolacées',  emoji: '🌸', color: '#fff8e1', rotationYears: 1, members: ['capucine'] },
  boraginacees:  { label: 'Boraginacées',  emoji: '💙', color: '#e3f2fd', rotationYears: 1, members: ['bourrache'] },
};

// Build reverse map: plantId → family key
const PLANT_FAMILY = {};
Object.entries(BOTANICAL_FAMILIES).forEach(([key, fam]) =>
  fam.members.forEach(id => { PLANT_FAMILY[id] = key; })
);

// ===== Plan du jardin — Saint-Thélo, 22460 =====
// Les zones sont listées du Nord au Sud.
// mSize = profondeur en mètres dans l'axe N-S.
// L'allée de 90 cm entre chaque zone est gérée dans le rendu.
const GARDEN_ZONES = [
  { id: 'fraises',      label: 'Bande Fraises',           emoji: '🍓', type: 'perennis', mSize: 1,   color: '#ffcdd2', note: '1 m depuis la haie Nord' },
  { id: 'B1',           label: 'B1 — Médicinale',         emoji: '🌿', type: 'butte',    mSize: 1,   color: '#c8e6c9', note: 'Hügelkultur — variétés médicinales en attente' },
  { id: 'B2',           label: 'B2 — Tomates',            emoji: '🍅', type: 'butte',    mSize: 1,   color: '#c8e6c9', note: 'Tomates + Basilic Grand vert + Tagètes Double Pinwheel' },
  { id: 'B3',           label: 'B3 — Courgettes',         emoji: '🥒', type: 'butte',    mSize: 1,   color: '#c8e6c9', note: 'Courgettes + Courge · Tabac Ghost Pipes intercalé B2/B3' },
  { id: 'B4',           label: 'B4 — Repos 2026',         emoji: '💤', type: 'repos',    mSize: 1,   color: '#eeeeee', note: 'Stabilisation — rotation 2027' },
  { id: 'B5',           label: 'B5 — Repos 2026',         emoji: '💤', type: 'repos',    mSize: 1,   color: '#eeeeee', note: 'Stabilisation — rotation 2027' },
  { id: 'B6',           label: 'B6 — Repos 2026',         emoji: '💤', type: 'repos',    mSize: 1,   color: '#eeeeee', note: 'Stabilisation — fumier poules automne' },
  { id: 'P1',           label: 'P1 — Carottes / Oignons', emoji: '🥕', type: 'flat',     mSize: 1,   color: '#fff9c4', note: 'No-dig carton-paille' },
  { id: 'P2',           label: 'P2 — Pois / Poireaux',   emoji: '🫛', type: 'flat',     mSize: 1,   color: '#fff9c4', note: 'Pois gourmand Norli printemps → Poireau Bleu d\'Hiver automne' },
  { id: 'P3',           label: 'P3 — Divers légumes',    emoji: '🥗', type: 'flat',     mSize: 1,   color: '#fff9c4', note: 'Zone polyvalente — salades, épinards, mâche' },
  { id: 'P4',           label: 'P4 — Betteraves / Radis',emoji: '🟣', type: 'flat',     mSize: 1,   color: '#fff9c4', note: 'Betteraves De Chioggia + Ronde de Détroit + Radis Sora intercalés' },
  { id: 'terre-plate',  label: 'Terre plate',             emoji: '🥗', type: 'flat',     mSize: 1,   color: '#fff9c4', note: 'Espaces libres — Salade Buttercrunch' },
  { id: 'melons',       label: 'Melons + PDT',            emoji: '🍈', type: 'flat',     mSize: 1.9, color: '#fff9c4', note: 'Zone large ~1,9 m — melons + pommes de terre' },
  { id: 'bordures',     label: 'Bordures',                emoji: '🌸', type: 'bordure',  mSize: 0.5, color: '#fce4ec', note: 'Capucine Empress of India + Bourrache bleue — toutes les planches' },
  { id: 'piquet Ouest', label: 'Piquet Ouest',            emoji: '🌸', type: 'bordure',  mSize: 0.5, color: '#fce4ec', note: 'Capucine Couleurs mélangées — grimpante sur piquet côté Ouest' },
  { id: 'pot-terrasse', label: 'Pots Terrasse',           emoji: '🪴', type: 'terrasse', mSize: 0,   color: '#ffe0b2', note: 'Pots hors-sol sur la terrasse — non visible sur le plan jardin' },
  { id: 'a-definir',    label: 'Emplacement à définir',  emoji: '📍', type: 'autre',    mSize: 0,   color: '#f5f5f5', note: 'Zone temporaire — emplacement à préciser avant repiquage' },
];

// ===== Enrichissement Kokopelli : on injecte les données après définition du tableau
// pour ne pas alourdir chaque entrée individuelle.
const KOKOPELLI_DATA = {
  'carotte': {
    search: 'carotte',
    catalogPath: '/fr/c/semences-de-carottes',
    varietiesKoko: ['Chantenay rouge cœur', 'Nantaise améliorée', 'Blanche à collet vert', 'Jaune obtuse du Doubs', 'Purple Haze', 'Touchon']
  },
  'salade': {
    search: 'salade laitue',
    catalogPath: '/fr/c/semences-de-salades',
    varietiesKoko: ['Blonde de Paris', 'Merveille des quatre saisons', 'Batavia dorée', 'Romaine blonde maraîchère', 'Feuille de chêne blonde', 'Rouge grenobloise', 'Corne de cerf']
  },
  'haricot': {
    search: 'haricot',
    catalogPath: '/fr/c/semences-de-haricots',
    varietiesKoko: ['Merveille de Piémont', 'Beurre de Rocquencourt', 'Contender', 'Purple Queen', 'Cherokee Trail of Tears', 'Borlotti']
  },
  'poivron': {
    search: 'poivron piment',
    catalogPath: '/fr/c/semences-de-poivrons-et-piments',
    varietiesKoko: ['Corno di Toro rosso', 'Doux d\'Espagne', 'Topepo rosso', 'Lipstick', 'Marconi jaune']
  },
  'aubergine': {
    search: 'aubergine',
    catalogPath: '/fr/c/semences-d-aubergines',
    varietiesKoko: ['Violette de Florence', 'Listada de Gandia', 'Rosa Bianca', 'Blanche de New York', 'Ronde verte de Thaïlande']
  },
  'radis': {
    search: 'radis',
    catalogPath: '/fr/c/semences-de-radis',
    varietiesKoko: ['Flambeau', 'French Breakfast', 'D\'Hiver de Stuttgart', 'Violet de Gournay', 'Long noir d\'Hiver']
  },
  'oignon': {
    search: 'oignon',
    catalogPath: '/fr/c/semences-d-oignons-et-de-poireaux',
    varietiesKoko: ['Rouge de Florence', 'Jaune paille des Vertus', 'Blanc de Lisbonne', 'Rouge de Brunswick']
  },
  'ail': {
    search: 'ail',
    catalogPath: '/fr/c/semences-d-oignons-et-de-poireaux',
    varietiesKoko: ['Rose de Lautrec', 'Violet de Cadours', 'Blanc de Lomagne']
  },
  'basilic': {
    search: 'basilic',
    catalogPath: '/fr/c/semences-aromatiques',
    varietiesKoko: ['Grand vert', 'Pourpre ruffles', 'Citronné', 'Thaïlandais', 'Canneberge']
  },
  'persil': {
    search: 'persil',
    catalogPath: '/fr/c/semences-aromatiques',
    varietiesKoko: ['Géant d\'Italie', 'Mousse vert foncé']
  },
  'ciboulette': {
    search: 'ciboulette',
    catalogPath: '/fr/c/semences-aromatiques',
    varietiesKoko: ['Ciboulette commune', 'Ciboulette d\'ail (Allium tuberosum)']
  },
  'menthe': {
    search: 'menthe',
    catalogPath: '/fr/c/semences-aromatiques',
    varietiesKoko: ['Menthe poivrée', 'Menthe verte']
  },
  'epinard': {
    search: 'épinard',
    catalogPath: '/fr/c/semences-d-epinards',
    varietiesKoko: ['Géant d\'Hiver', 'Matador', 'Bloomsdale Longstanding', 'Tétragone cornue']
  },
  'fraise': {
    search: 'fraise',
    catalogPath: '/fr/c/semences-de-fraises',
    varietiesKoko: ['Fraise des Bois', 'Regina', 'Alexandria']
  },
  'pomme-de-terre': {
    search: 'pomme de terre',
    catalogPath: '/fr/c/semences-de-pommes-de-terre',
    varietiesKoko: ['Vitelotte', 'Ratte', 'Belle de Fontenay', 'BF15', 'Bleue d\'Artois']
  },
  'concombre': {
    search: 'concombre',
    catalogPath: '/fr/c/semences-de-concombres',
    varietiesKoko: ['Marketmore', 'Poinsett 76', 'Lemon Cucumber', 'Straight Eight']
  },
  'betterave': {
    search: 'betterave',
    catalogPath: '/fr/c/semences-de-betteraves',
    varietiesKoko: ['Rouge de Détroit', 'Chioggia', 'Crapaudine', 'Golden', 'Cylindra']
  }
};

// Inject Kokopelli data into PLANTS_DB entries
// (done after array definition to keep individual entries readable)
PLANTS_DB.forEach(p => {
  if (!p.kokopelli && KOKOPELLI_DATA[p.id]) {
    p.kokopelli = KOKOPELLI_DATA[p.id];
  }
});

const CATEGORIES = {
  'legume-fruit':   { label: 'Légumes-fruits',   emoji: '🍅', color: '#e76f51' },
  'legume-feuille': { label: 'Légumes-feuilles', emoji: '🥬', color: '#52b788' },
  'legume-racine':  { label: 'Légumes-racines',  emoji: '🥕', color: '#e9c46a' },
  'aromatique':     { label: 'Aromatiques',      emoji: '🌿', color: '#74c69d' },
  'fruit':          { label: 'Fruits',           emoji: '🍓', color: '#e63946' },
  'fleur-compagne': { label: 'Fleurs compagnes', emoji: '🌸', color: '#f06292' }
};

const MONTHS_FR = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
  'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
