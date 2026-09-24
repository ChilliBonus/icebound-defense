(() => {
  'use strict';
  const canvas = document.querySelector('#game');
  const W=1000,H=650,CELL=50,COLS=20,ROWS=13;
  /* Die obersten zwei Rasterreihen liegen optisch in der Bergkette. Dort
     gebaute Tuerme standen im Hang statt in der Ebene, deshalb beginnt das
     Spielfeld erst bei ROW_TOP. Missionswerte oberhalb davon zieht playRow
     beziehungsweise baseRow ins Feld. */
  const ROW_TOP=2,PLAY_ROWS=ROWS-ROW_TOP;
  const DPR=Math.min(2,window.devicePixelRatio||1);
  canvas.width=W*DPR;canvas.height=H*DPR;
  let ctx = canvas.getContext('2d',{alpha:false});
  const skyCanvas=document.createElement('canvas'),terrainCanvas=document.createElement('canvas'),pathCanvas=document.createElement('canvas'),wallCanvas=document.createElement('canvas'),gridCanvas=document.createElement('canvas'),surfaceCanvas=document.createElement('canvas'),macroSurfaceCanvas=document.createElement('canvas'),shadowSprite=document.createElement('canvas');
  skyCanvas.width=terrainCanvas.width=pathCanvas.width=wallCanvas.width=gridCanvas.width=W*DPR;skyCanvas.height=terrainCanvas.height=pathCanvas.height=wallCanvas.height=gridCanvas.height=H*DPR;
  surfaceCanvas.width=surfaceCanvas.height=256;macroSurfaceCanvas.width=80;macroSurfaceCanvas.height=52;shadowSprite.width=128;shadowSprite.height=64;
  const skyCtx=skyCanvas.getContext('2d',{alpha:false}),terrainCtx=terrainCanvas.getContext('2d'),pathCtx=pathCanvas.getContext('2d'),wallCtx=wallCanvas.getContext('2d'),gridCtx=gridCanvas.getContext('2d'),surfaceCtx=surfaceCanvas.getContext('2d'),macroSurfaceCtx=macroSurfaceCanvas.getContext('2d'),shadowCtx=shadowSprite.getContext('2d');
  [ctx,skyCtx,terrainCtx,pathCtx,wallCtx,gridCtx].forEach(context=>context.scale(DPR,DPR));
  let surfacePattern=null,materialAssetsReady=false;
  let frameLightFromLeft=true;
  const CAMERA={horizon:108,compression:.82,farScale:.82};
  let base={x:18,y:6},spawn={x:0,y:6},spawnPoints=[spawn],scenery=[],flora=[],obstacles=[],groundPatches=[],groundVeins=[],groundDetails=[],activePlanetId='nivalis',activeMissionIndex=0,worldSeed=0;
  const PLANETS=[
    {id:'nivalis',code:'N-07',name:'NIVALIS',title:'AURORA-FROSTWELT',celestial:'aurora',flora:'pine',trait:'KRYO-NETZ · Feldmauern bremsen Gegner um 30 %.',seed:100,
      mods:{wallSlow:.70,splash:1,railPierce:0,droneBonus:0,regen:1,enemySpeed:1,bounty:1},obstacleTypes:['crystal','ridge','rock','wreck'],
      theme:{accent:'#8defff',glow:'#4cf1cf',sky:['#01040f','#07172d','#28485a'],ridge:['#172839','#243b49','#718b91'],ground:['#71878a','#4c6868','#263f42'],surface:'#607779',patches:['rgba(188,229,225,.12)','rgba(35,77,71,.18)','rgba(92,113,101,.17)','rgba(116,151,144,.14)','rgba(229,239,220,.13)','rgba(40,92,83,.13)','rgba(123,139,113,.12)','rgba(55,107,96,.15)'],dark:'#263e39',light:'#d6ece4',plant:'#4c685b',crystal:'#76cddd',weather:'#dffcff',warm:'rgba(91,255,216,.11)'},
      missions:[
        {name:'AURORA-SENKE',level:'LEICHT',stars:'★☆☆',brief:'Weite Bauflächen unter ruhigem Sonnenwind.',credits:520,hp:1.10,speed:.96,spawn:1.05,count:1,waves:12,bounty:1.08,spawnY:6,baseY:6,layout:0,seed:11},
        {name:'SCHERBENPASS',level:'MITTEL',stars:'★★☆',brief:'Kristallzüge formen zwei enge Umgehungen.',credits:500,hp:.95,speed:1.03,spawn:.94,count:1.12,waves:16,bounty:1.02,spawnY:3,baseY:9,layout:1,seed:23},
        {name:'NULLLICHT-RISS',level:'SCHWER',stars:'★★★',brief:'Dichte Eisrücken, wenig Energie, lange Nacht.',credits:700,hp:.85,speed:1.1,spawn:.78,count:1.3,waves:20,bounty:.78,spawnY:10,baseY:2,layout:2,seed:37}
      ]},
    {id:'pyra',code:'P-22',name:'PYRA',title:'CALDERA-MOND',celestial:'twins',flora:'spire',trait:'THERMISCHE AUFWINDE · Raketen und Mörser erhalten 18 % mehr Wirkungsradius.',seed:300,
      mods:{wallSlow:.78,splash:1.18,railPierce:0,droneBonus:0,regen:1,enemySpeed:1.04,bounty:1},obstacleTypes:['rock','ridge','wreck','crystal'],
      theme:{accent:'#ffb05f',glow:'#ff5d37',sky:['#10050a','#351018','#8a3a26'],ridge:['#29141a','#4a2521','#9a5940'],ground:['#8c5d43','#654233','#33282a'],surface:'#6b493b',patches:['rgba(246,155,82,.13)','rgba(77,31,25,.22)','rgba(150,70,39,.17)','rgba(99,54,42,.2)','rgba(255,202,126,.09)','rgba(62,29,29,.18)','rgba(181,100,52,.13)','rgba(111,48,32,.19)'],dark:'#3b2523',light:'#e8b183',plant:'#4d2823',crystal:'#ff754d',weather:'#ffb469',warm:'rgba(255,87,43,.15)'},
      missions:[
        {name:'ASCHEHAFEN',level:'LEICHT',stars:'★☆☆',brief:'Offene Basaltterrassen zwischen warmen Fumarolen.',credits:520,hp:1.20,speed:.97,spawn:1.04,count:1,waves:12,bounty:1.08,spawnY:5,baseY:7,layout:3,seed:13},
        {name:'CALDERA-KREUZ',level:'MITTEL',stars:'★★☆',brief:'Kreuzende Lavagrate erzwingen schnelle Umbauten.',credits:500,hp:1.01,speed:1.04,spawn:.92,count:1.14,waves:16,bounty:.99,spawnY:1,baseY:10,layout:4,seed:29},
        {name:'HÖLLENSCHLUND',level:'SCHWER',stars:'★★★',brief:'Aggressive Brut unter dichtem Ascheregen.',credits:700,hp:1.06,speed:1.11,spawn:.76,count:1.33,waves:20,bounty:.78,spawnY:11,baseY:3,layout:5,seed:43}
      ]},
    {id:'verdant',code:'V-81',name:'VERDANT',title:'BIO-MOND',celestial:'rings',flora:'fan',trait:'DICHTE ATMOSPHÄRE · Gegner bewegen sich etwas langsamer, Regeneratoren reparieren sich dafür stärker.',seed:500,
      mods:{wallSlow:.74,splash:1,railPierce:0,droneBonus:0,regen:1.35,enemySpeed:.98,bounty:1},obstacleTypes:['crystal','rock','wreck','ridge'],
      theme:{accent:'#8dffb0',glow:'#35e6d0',sky:['#020d12','#092f37','#24675d'],ridge:['#153c3c','#285a4d','#6a9575'],ground:['#6e8f68','#446d55','#203e39'],surface:'#55765d',patches:['rgba(154,232,143,.14)','rgba(24,87,65,.2)','rgba(82,128,65,.18)','rgba(60,121,88,.2)','rgba(203,244,167,.1)','rgba(25,103,86,.16)','rgba(113,151,78,.15)','rgba(48,139,105,.18)'],dark:'#1e4d3c',light:'#c7f4bd',plant:'#58a66f',crystal:'#72f5bf',weather:'#a5ffd1',warm:'rgba(81,255,184,.12)'},
      missions:[
        {name:'SPORENHAIN',level:'LEICHT',stars:'★☆☆',brief:'Breite Lichtungen im biolumineszenten Pilzwald.',credits:520,hp:1.21,speed:.96,spawn:1.03,count:1.02,waves:12,bounty:1.08,spawnY:7,baseY:5,layout:6,seed:17},
        {name:'TITANWURZEL',level:'MITTEL',stars:'★★☆',brief:'Alte Wurzelrücken teilen das Einsatzgebiet.',credits:500,hp:.94,speed:1.04,spawn:.9,count:1.16,waves:16,bounty:.98,spawnY:2,baseY:8,layout:7,seed:31},
        {name:'SMARAGD-ABGRUND',level:'SCHWER',stars:'★★★',brief:'Regenerative Brut und kaum freie Feuerkorridore.',credits:700,hp:.89,speed:1.11,spawn:.74,count:1.35,waves:20,bounty:.78,spawnY:10,baseY:1,layout:8,seed:47}
      ]},
    {id:'umbra',code:'U-00',name:'UMBRA',title:'EKLIPSEN-MOND',celestial:'eclipse',flora:'shard',trait:'GRAVITISCHE LINSEN · Railguns durchschlagen zwei zusätzliche Ziele; Energieprämien sind geringer.',seed:700,
      mods:{wallSlow:.74,splash:1,railPierce:2,droneBonus:0,regen:1,enemySpeed:1.02,bounty:.88},obstacleTypes:['ridge','crystal','wreck','rock'],
      theme:{accent:'#cf8dff',glow:'#6f7cff',sky:['#010106','#100925','#35204e'],ridge:['#120f20','#29203d','#6b5681'],ground:['#565069','#383448','#171a29'],surface:'#414052',patches:['rgba(151,132,210,.14)','rgba(24,21,47,.24)','rgba(95,83,133,.18)','rgba(62,62,102,.2)','rgba(213,196,255,.08)','rgba(39,31,75,.19)','rgba(118,91,153,.13)','rgba(52,47,91,.2)'],dark:'#202039',light:'#d8c9ef',plant:'#5d4f7e',crystal:'#b77cff',weather:'#d1c4ff',warm:'rgba(132,83,255,.13)'},
      missions:[
        {name:'DÄMMERFELD',level:'LEICHT',stars:'★☆☆',brief:'Lange Sichtlinien im Schatten der totalen Eklipse.',credits:520,hp:1.29,speed:.98,spawn:1.02,count:1.04,waves:12,bounty:1.16,spawnY:6,baseY:6,layout:9,seed:19},
        {name:'EKLIPSENBRUCH',level:'MITTEL',stars:'★★☆',brief:'Schwarze Kristallbänder brechen jede Gerade.',credits:500,hp:.97,speed:1.06,spawn:.86,count:1.2,waves:16,bounty:1.10,spawnY:3,baseY:10,layout:10,seed:41},
        {name:'EVENT-HORIZONT',level:'FINAL',stars:'★★★★',brief:'Die ultimative 25-Wellen-Prüfung für ein ausgebautes Arsenal.',credits:780,hp:.98,speed:1.15,spawn:.66,count:1.48,waves:25,bounty:.80,spawnY:11,baseY:2,layout:11,seed:59}
      ]}
  ];
  const types={
    rail:{name:'RAILGUN',cost:145,range:275,rate:2.15,damage:108,pierce:5,color:'#8deaff',detail:'Extrem kräftiger Linien-Schuss. Langsam, aber durchschlägt fünf Ziele und jede Panzerung.'},
    drone:{name:'DRONENNEST',cost:175,range:225,rate:.42,damage:12,drones:3,color:'#a594ff',targets:'ground',detail:'Mobile Jäger verfolgen Ziele außerhalb starrer Feuerwinkel und erzeugen konstanten Mehrfachbeschuss.'},
    rocket:{name:'RAKETENWERFER',cost:215,range:290,rate:3.25,damage:105,missiles:3,splash:88,turn:2.6,color:'#ffd36a',targets:'air',detail:'Feuert bis zu drei zielsuchende Raketen auf unterschiedliche Gegner. Der Salvenschaden wird gleichmäßig auf drei Flugkörper verteilt.'},
    mortar:{name:'PLASMA-MÖRSER',cost:185,range:310,minRange:156,rate:2.4,damage:70,color:'#ff9e6a',splash:76,targets:'ground',detail:'Ballistischer Flächenschlag mit der höchsten Reichweite im Arsenal. Feuert in einem Ring: nahe Gegner kann er nicht treffen.'},
    laser:{name:'PULSLASER',cost:135,range:190,rate:.2,damage:10,color:'#ff6f91',beam:true,targets:'air',detail:'Sehr schneller Präzisionsstrahl. Geringer Einzelschaden, aber fast ohne Feuerpause.'},
    cryo:{name:'KRYO-PROJEKTOR',cost:155,range:205,rate:.8,damage:7,slow:.32,slowTime:3.6,chain:4,color:'#8fffe1',beam:true,targets:'ground',detail:'Schießt einen Kälteblitz, der auf weitere Gegner überspringt und ihr Tempo auf ein Drittel drückt. Kaum Schaden, dafür die stärkste Verlangsamung im Arsenal.'},
    gatling:{name:'ION-GATLING',cost:130,range:165,rate:.11,damage:7,color:'#ffc45d',beam:true,detail:'Höchste Feuerrate im Arsenal, aber kurze Reichweite und sehr leichter Einzelschaden.'},
    disruptor:{name:'SCHILD-BRECHER',cost:205,range:260,rate:2.75,damage:96,shieldBonus:2.4,color:'#d58cff',beam:true,targets:'ground',detail:'Überlädt Schilde mit 140 % Bonusschaden. Langsam, teuer und gegen ungepanzerte Schwärme ineffizient.'},
    wall:{name:'FELDMAUER',cost:35,range:0,rate:0,damage:0,color:'#b9d0c5',tunable:false,detail:'Günstiges Sperrsegment zur Wegführung. Eine vollständige Blockade bleibt verboten.'}
  };
  const ARSENAL_TYPES=['rail','drone','rocket','mortar','laser','cryo','gatling','disruptor'];
  const enemyTypes={
    shard:{name:'SONDENDROHNE',short:'STANDARD',detail:'Schwebende Aufklärungsdrohne mit ausgeglichenen Werten.',model:'drone',hp:1,speed:1,r:11,armor:0,bounty:14,breach:8,color:'#75e0ee'},
    runner:{name:'ABFANGDROHNE',short:'TEMPO ×1.7',detail:'Kleine, extrem schnelle Jagddrohne.',model:'drone',hp:.68,speed:1.7,r:8,armor:0,bounty:11,breach:12,color:'#6dffc5'},
    armored:{name:'BELAGERUNGSPANZER',short:'42% PANZER',detail:'Schweres Kettenfahrzeug; Railguns ignorieren seine Panzerung.',model:'tank',hp:2.2,speed:.58,r:16,armor:.42,bounty:24,breach:20,color:'#68a4ff'},
    regenerator:{name:'REPARATURLÄUFER',short:'REPARIERT SICH',detail:'Vierbeiniger Roboter, der sich nach einer Feuerpause repariert.',model:'walker',hp:1.35,speed:.82,r:13,armor:.08,regen:.035,bounty:20,breach:14,color:'#b7ee72'},
    splitter:{name:'TRÄGERLÄUFER',short:'SETZT DROHNEN FREI',detail:'Mehrbeiniger Träger setzt bei Zerstörung zwei schnelle Drohnen frei.',model:'walker',hp:1.55,speed:.76,r:15,armor:.1,split:2,bounty:22,breach:16,color:'#e49bff'},
    splinter:{name:'MIKRODROHNE',short:'SCHWARM · STÖRT TÜRME',detail:'Kleine schnelle Folgedrohne eines Trägerläufers. Ihr Störfeld senkt die Feuerrate naher Türme, solange sie schwebt.',model:'drone',hp:.38,speed:1.32,r:6,armor:0,bounty:4,breach:5,color:'#f3c1ff'},
    phaser:{name:'PHASENGLEITER',short:'IGNORIERT MAUERN',detail:'Hochfliegender Gleiter, der Mauern und Routen ignoriert und auf direkter Linie zur Basis fliegt.',model:'drone',direct:true,hp:.85,speed:.8,r:10,armor:0,bounty:20,breach:14,color:'#c99bff'},
    elite:{name:'KOMMANDOPANZER',short:'SCHILD + PANZER',detail:'Schwerer Kommandopanzer mit Energieschild.',model:'tank',hp:4.3,speed:.54,r:20,armor:.18,shield:.6,bounty:70,breach:40,color:'#ff5fb7'}
  };
  const TEST_TUNING_MODES={zero:'LEVEL 0',current:'MEIN TUNING',max:'VOLL GETUNT'},TEST_ENEMY_TYPES=Object.keys(enemyTypes);
  const PROGRESS_KEY='icebound-arsenal-v1',MAX_TUNING=5;
  /* Von Anfang an baubar. Alles andere wird in der Arsenal-Uebersicht mit XP
     freigeschaltet und taucht erst danach im Arsenal auf; Luftwaffen zusaetzlich
     erst ab der ersten Schwer-Mission. */
  const STARTER_TYPES=['rail','gatling','wall'],UNLOCK_XP_FACTOR=2.4;
  function freshProgress(){return{xp:0,upgrades:Object.fromEntries(Object.keys(types).map(type=>[type,{power:0,rate:0,range:0}])),unlocked:STARTER_TYPES.slice(),cleared:[]}}
  function loadProgress(){try{const saved=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'null'),base=freshProgress();if(!saved)return base;base.xp=Math.max(0,Math.floor(Number(saved.xp)||0));for(const type of Object.keys(types))for(const axis of ['power','rate','range'])base.upgrades[type][axis]=clamp(Math.floor(Number(saved.upgrades?.[type]?.[axis])||0),0,MAX_TUNING);if(Array.isArray(saved.unlocked))for(const type of saved.unlocked)if(types[type]&&!base.unlocked.includes(type))base.unlocked.push(type);if(Array.isArray(saved.cleared))for(const key of saved.cleared)if(typeof key==='string'&&!base.cleared.includes(key))base.cleared.push(key);return base}catch(_){return freshProgress()}}
  function saveProgress(){try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress))}catch(_){}}
  function resetProgress(){try{localStorage.removeItem(PROGRESS_KEY)}catch(_){}location.reload()}
  const progress=loadProgress();
  /* =====================================================================
     BALANCING-TABELLE — HIER ZAHLEN ÄNDERN (für Spieler unsichtbar)
     rate = Sekunden zwischen Schüssen; kleiner bedeutet schneller.
     armor = 0 bis 1; Level-Faktoren beeinflussen Leben, Tempo und Anzahl.

     GRUNDGEDANKE DER KURVE
     Entscheidend für den Schaden an einer Welle ist nicht die Turmzahl, sondern
     wie lange ein Gegner im Feuer bleibt. Das steuert der Spieler mit Mauern:
     eine längere Route und die Bremszone rings um jede Mauer verdreifachen die
     Feuerzeit. Deshalb ist die Mauer das billigste Bauteil und die Kurve so
     gesetzt, dass ab MITTEL ohne Labyrinth nichts zu holen ist.

     Energie ist der einzige Begrenzer für die Turmzahl — sie reicht bewusst
     nicht, um alle Bauplätze zu füllen. Am Missionsende soll fast nichts
     übrig sein.

     XP ist knapp gerechnet: ein Durchlauf aller zwölf Missionen deckt rund
     71 % des Bedarfs für alle Freischaltungen plus Volltuning. Der Rest kommt
     aus etwa drei wiederholten Missionen (~25 % der Level).
     ===================================================================== */
  const GAME_BALANCE={
    baseIntegrity: 100,
    enemyBaseHp: 70,
    enemyHpPerWave: 27,
    /* Ab dieser Welle ziehen die Lebenspunkte zusaetzlich pro Welle an. */
    enemyHpLateStart: 6,
    enemyHpLateStep: 0.105,

    /* WELT-STEIGERUNG — der Kern des Schwierigkeitsverlaufs.
       Ein Arsenal wird im Lauf der Kampagne durch Tuning und neue Waffen rund
       fuenfmal so stark. Ohne diese Rampe waere Welt 4 leichter als Welt 1.
       Wirkt nur auf Lebenspunkte, nicht auf Gegnerzahl oder Kopfgeld, damit
       hoehere Welten nicht automatisch mehr XP und Energie ausschuetten. */
    worldHpRamp: {
      nivalis: 1.00,
      pyra:    1.22,
      verdant: 1.72,
      umbra:   1.62
    },

    experiencePerEnemy: {
      shard: 2,
      runner: 3,
      armored: 5,
      regenerator: 4,
      splitter: 5,
      /* Brut aus dem Traegerlaeufer zaehlt nur einfach: sonst waere der
         Traegerlaeufer die lohnendste XP-Quelle im Spiel. */
      splinter: 1,
      phaser: 6,
      elite: 30
    },

    /* Dauerhafte Tuning-Stufen. Kosten = base + level*perLevel + Rang*perRank,
       wobei Rang die Summe aller drei Achsen geteilt durch 3 ist. Eine Waffe
       komplett auf 5/5/5 kostet damit 2880 XP, alle acht Waffen 23040 XP.
       Zusammen mit den Freischaltungen ergibt das den Kampagnen-Bedarf: ein
       Durchlauf aller Missionen deckt rund 71 %, der Rest kommt aus etwa drei
       wiederholten Missionen. */
    tuningCost: {
      base: 40,
      perLevel: 54,
      perRank: 22
    },

    /* Jede weitere Anlage desselben Typs kostet diesen Anteil mehr. Haelt
       Monokulturen teuer und macht ein gemischtes Arsenal attraktiv.
       Mauern haben einen eigenen, fast flachen Satz: ein Labyrinth braucht
       zwanzig bis dreissig Segmente und darf daran nicht scheitern. */
    towerCostStep: 0.15,
    wallCostStep: 0.02,

    /* Energie nach einer gesaeuberten Welle: base + Welle * perWave.
       Die letzte Welle beendet die Mission und zahlt keine Praemie mehr. */
    waveReward: {
      base: 26,
      perWave: 4
    },

    tuningPerLevel: {
      damage: 0.20,
      fireRate: 0.16,
      range: 0.09
    },

    // Acht spiegelgleiche Prüfstände; jede Waffenart erhält eine eigene Bahn.
    arsenalTest: {
      enemyType: 'shard',
      enemyWave: 1,
      depotHp: 100,
      batchesPerWave: 4,
      spawnInterval: 1.35,
      intermission: 4.50,
      waveReward: 300,
      laneRows: [2, 5, 8, 11],
      towerRowOffset: 1,
      leftTowerColumn: 3,
      rightTowerColumn: 16,
      leftPathEndColumn: 8,
      rightPathEndColumn: 11
    },

    // Echte Eingänge mit jeweils eigener Route zur Basis. Die Offsets werden
    // zur bisherigen Missions-Startzeile addiert und am Kartenrand umgebrochen.
    spawnLineCount: {
      LEICHT: 1,
      MITTEL: 2,
      SCHWER: 3,
      FINAL:  3
    },
    spawnLineOffsets: {
      1: [0],
      2: [0, 6],
      3: [-4, 0, 4]
    },

    // Globales Spieltempo. Größere Intervalle und kleinere Geschwindigkeiten
    // geben mehr Zeit zum Beobachten, Bauen und Reagieren.
    gamePace: {
      enemyBaseSpeed: 37.00,
      enemySpeedPerWave: 1.85,
      spawnIntervalBase: 1.14,
      spawnIntervalWaveStep: 0.042,
      minimumSpawnInterval: 0.46,
      normalIntermission: 8.00
    },

    obstacleLayout: {
      preventSameTypeNeighbors: true,
      neighborRadius: 1
    },

    celestialMotion: {
      horizontalDrift: 22,
      verticalDrift: 4,
      speed: 0.018
    },

    /* Wirkt auf Lebenspunkte, Gegnerzahl und Tempo (Tempo mit Wurzel). */
    levelDifficulty: {
      LEICHT:  1.00,
      MITTEL:  1.30,
      SCHWER:  1.36,
      FINAL:   1.55
    },

    /* GEGNERMIX je Stufe. Die Zahlen sind Abstaende in der Spawn-Reihenfolge:
       armored 5 heisst jeder fuenfte Spawn ist ein Belagerungspanzer. 0 schaltet
       den Typ ab. Die Reihenfolge der Pruefung ist fest, der erste Treffer
       gewinnt. eliteLate sind Kommandopanzer in den Schlusswellen, eliteFinal
       die der letzten Welle.
       Das Finale verlangt bewusst das komplette Arsenal: viele Phasengleiter
       (nur Luftwaffen treffen sie), viele Panzer (Railgun ignoriert Panzerung)
       und acht Kommandopanzer mit starkem Schild (Schild-Brecher). */
    enemyPattern: {
      LEICHT: { phaser: 0, splitter: 5, armored: 5, regenerator: 4, runner: 3, eliteLate: 1, eliteFinal: 3 },
      MITTEL: { phaser: 0, splitter: 5, armored: 5, regenerator: 4, runner: 3, eliteLate: 1, eliteFinal: 3 },
      SCHWER: { phaser: 7, splitter: 5, armored: 5, regenerator: 4, runner: 3, eliteLate: 2, eliteFinal: 4 },
      FINAL:  { phaser: 5, splitter: 6, armored: 4, regenerator: 4, runner: 3, eliteLate: 3, eliteFinal: 6 }
    },

    weapons:{
      rail:      { cost: 145, damage: 108, rate: 2.15, range: 275 },
      drone:     { cost: 175, damage:  12, rate: 0.42, range: 225 },
      rocket:    { cost: 215, damage: 105, rate: 3.25, range: 290, missiles: 3 },
      mortar:    { cost: 185, damage:  70, rate: 2.40, range: 310, minRange: 156 },
      laser:     { cost: 135, damage:  10, rate: 0.20, range: 190 },
      cryo:      { cost: 155, damage:   7, rate: 0.80, range: 205 },
      gatling:   { cost: 130, damage:   7, rate: 0.11, range: 165 },
      disruptor: { cost: 205, damage:  96, rate: 2.75, range: 260 },
      /* Bewusst der billigste Bauteil im Spiel: das Labyrinth ist die
         Hauptwaffe, nicht ein Nebenprodukt. */
      wall:      { cost:  30 }
    },

    enemies:{
      shard:       { hp: 1.00, speed: 1.00, armor: 0.00, bounty:  6, breach:  8 },
      runner:      { hp: 0.68, speed: 1.70, armor: 0.00, bounty:  5, breach: 12 },
      armored:     { hp: 2.20, speed: 0.58, armor: 0.48, bounty: 11, breach: 20 },
      regenerator: { hp: 1.35, speed: 0.82, armor: 0.08, bounty:  9, breach: 14 },
      splitter:    { hp: 1.55, speed: 0.76, armor: 0.10, bounty: 10, breach: 16 },
      splinter:    { hp: 0.38, speed: 1.32, armor: 0.00, bounty:  2, breach:  5 },
      phaser:      { hp: 0.85, speed: 0.80, armor: 0.00, bounty:  9, breach: 14 },
      elite:       { hp: 4.90, speed: 0.54, armor: 0.18, shield: 0.95, bounty: 34, breach: 40 }
    }
  };

  /* AUTOMATISCHER SCHADEN-/HP-VERGLEICH — NICHT VON HAND ÄNDERN
     rawHpPerSecond: voll getunter Schaden / voll getunte Schusspause
     rangeFactor: Anteil an der größten voll getunten Waffenreichweite
     effectiveHpPerSecond: Roh-DPS × Reichweitenfaktor; Schätzwert dafür,
     wie lange ein einzelner Gegner tatsächlich im Feuerbereich bleibt.
     Flächenschaden, Ketten, Durchschuss, Drohnenzahl und Statuseffekte sind
     hier absichtlich nicht eingerechnet und kommen im echten Kampf hinzu. */
  function makeBalanceReport(){
    const entries=Object.entries(GAME_BALANCE.weapons).filter(([,weapon])=>weapon.damage&&weapon.rate&&weapon.range);
    const tuning=GAME_BALANCE.tuningPerLevel,maxTunedRange=Math.max(...entries.map(([,weapon])=>weapon.range*(1+tuning.range*MAX_TUNING)));
    return Object.fromEntries(entries.map(([key,weapon])=>{
      const fullyTunedDamage=weapon.damage*(1+tuning.damage*MAX_TUNING),fullyTunedRate=weapon.rate/(1+tuning.fireRate*MAX_TUNING),rawHpPerSecond=fullyTunedDamage/fullyTunedRate,fullyTunedRange=weapon.range*(1+tuning.range*MAX_TUNING),rangeFactor=fullyTunedRange/maxTunedRange;
      return[key,{damage:Math.round(fullyTunedDamage),secondsPerShot:+fullyTunedRate.toFixed(2),range:Math.round(fullyTunedRange),hpPerSecond:+rawHpPerSecond.toFixed(1),rangeFactor:+rangeFactor.toFixed(2),effectiveHpPerSecond:+(rawHpPerSecond*rangeFactor).toFixed(1)}];
    }));
  }
  const BALANCE_REPORT=makeBalanceReport();
  function makeEnemyHpReport(){return Object.fromEntries(Object.entries(GAME_BALANCE.enemies).map(([key,enemy])=>{
    const hpAtWave=wave=>(GAME_BALANCE.enemyBaseHp+wave*GAME_BALANCE.enemyHpPerWave)*(1+Math.max(0,wave-GAME_BALANCE.enemyHpLateStart)*GAME_BALANCE.enemyHpLateStep)*enemy.hp,effectiveHp=hp=>hp/Math.max(.01,1-enemy.armor);
    const wave1=hpAtWave(1),wave14=hpAtWave(14);
    return[key,{hpWave1:Math.round(wave1),effectiveHpWave1:Math.round(effectiveHp(wave1)),hpWave14:Math.round(wave14),effectiveHpWave14:Math.round(effectiveHp(wave14))}];
  }));}
  const ENEMY_HP_REPORT=makeEnemyHpReport();
  globalThis.ICEBOUND_BALANCE={settings:GAME_BALANCE,weaponComparison:BALANCE_REPORT,enemyHpComparison:ENEMY_HP_REPORT};
  console.table(BALANCE_REPORT);
  console.table(ENEMY_HP_REPORT);
  for(const [key,values] of Object.entries(GAME_BALANCE.weapons))if(types[key])Object.assign(types[key],values);
  for(const [key,values] of Object.entries(GAME_BALANCE.enemies))if(enemyTypes[key])Object.assign(enemyTypes[key],values);
  /* PERFORMANCE-UMSCHALTUNG — nur Effekte werden bei anhaltend niedriger
     Bildrate reduziert. Waffenmodelle bleiben unabhängig davon vollständig. */
  const PERFORMANCE_TUNING={slowFrameMs:30,recoveredFrameMs:24,reduceAt:8,minimalAt:9.2,minimalRestoreAt:6,restoreAt:2,pressureGain:.35,pressureRecovery:.15,neutralRecovery:.025};
  let state,last=0,lastRender=0,sceneTime=0,mouse={x:0,y:0,gx:0,gy:0},selected=null,selectedTowerId=null,selectedEnemyId=null,speed=1,terrainReady=false,gridReady=false,renderDetail=2,framePressure=0,uiNext=0,uiSnapshot='',intelSnapshot='',placementCache={key:'',valid:false};
  /* Vorschau-Simulationen (Werkstatt, Scorecard) benutzen dieselbe Schusslogik
     wie das Spiel. Ohne diesen Schalter wuerden neun Miniaturtuerme gleichzeitig
     Feuergeraeusche ausloesen. */
  let silentSimulation=false;
  /* Der Bau-Schemen folgt dem Mauszeiger. Auf dem Touchscreen gibt es keinen
     Zeiger — dort blieb er nach dem letzten Tippen stehen und sah aus wie ein
     bereits gebauter Turm. Deshalb nur bei echter Maus zeichnen. */
  let pointerIsMouse=false;
  function updatePerformanceMode(gap){const tuning=PERFORMANCE_TUNING;if(gap>tuning.slowFrameMs)framePressure=Math.min(10,framePressure+tuning.pressureGain);else if(gap<tuning.recoveredFrameMs)framePressure=Math.max(0,framePressure-tuning.pressureRecovery);else framePressure=Math.max(0,framePressure-tuning.neutralRecovery);if(renderDetail===2&&framePressure>=tuning.reduceAt)renderDetail=1;else if(renderDetail===1&&framePressure>=tuning.minimalAt)renderDetail=0;else if(renderDetail===0&&framePressure<=tuning.minimalRestoreAt)renderDetail=1;else if(renderDetail===1&&framePressure<=tuning.restoreAt)renderDetail=2}
  globalThis.ICEBOUND_PERFORMANCE={settings:PERFORMANCE_TUNING,status:()=>({detail:renderDetail===2?'FULL':renderDetail===1?'REDUCED':'MINIMAL',towerModels:'FULL',pressure:+framePressure.toFixed(2)})};
  const audio={ctx:null,master:null,music:null,sfx:null,limiter:null,room:null,roomGain:null,noise:null,muted:false,beat:0,step:0,voices:0,last:{}};
  /* Prozedurale Waffenklänge: Jeder Abschuss besteht aus kurzem Impuls,
     resonierendem Körper und optionalem Ausklang. Die Parameter bleiben hier
     gebündelt, damit die acht Waffen akustisch ebenso klar unterscheidbar sind
     wie ihre Silhouetten. */
  const WEAPON_AUDIO_PROFILES={
    rail:{gap:.09,jitter:.025,layers:[
      {source:'noise',duration:.026,volume:.115,frequency:5200,mode:'highpass',q:.8,attack:.0007},
      {source:'tone',frequency:108,end:42,duration:.25,volume:.12,wave:'sawtooth',cutoff:760,room:.1},
      {source:'tone',frequency:1460,end:690,duration:.075,volume:.045,wave:'triangle',delay:.003,room:.08},
      {source:'noise',duration:.19,volume:.025,frequency:920,mode:'bandpass',q:1.1,delay:.018,room:.28,optional:true}
    ]},
    drone:{gap:.065,jitter:.055,layers:[
      {source:'noise',duration:.015,volume:.022,frequency:4700,mode:'highpass',q:.65,attack:.0005},
      {source:'tone',frequency:930,end:510,duration:.065,volume:.034,wave:'square',cutoff:2700,room:.025},
      {source:'tone',frequency:205,end:155,duration:.05,volume:.018,wave:'triangle',delay:.004}
    ]},
    rocket:{gap:.12,jitter:.035,layers:[
      {source:'noise',duration:.055,volume:.085,frequency:1700,mode:'bandpass',q:.7,attack:.0008},
      {source:'tone',frequency:92,end:43,duration:.27,volume:.09,wave:'sawtooth',cutoff:580,room:.08},
      {source:'noise',duration:.3,volume:.035,frequency:510,mode:'lowpass',q:.55,delay:.025,attack:.009,room:.2,optional:true}
    ]},
    mortar:{gap:.12,jitter:.03,layers:[
      {source:'noise',duration:.03,volume:.1,frequency:1900,mode:'bandpass',q:.8,attack:.0007},
      {source:'tone',frequency:68,end:33,duration:.31,volume:.115,wave:'triangle',room:.12},
      {source:'tone',frequency:225,end:108,duration:.115,volume:.037,wave:'square',cutoff:720,delay:.004},
      {source:'noise',duration:.19,volume:.024,frequency:390,mode:'lowpass',q:.5,delay:.02,room:.2,optional:true}
    ]},
    laser:{gap:.075,jitter:.04,layers:[
      {source:'noise',duration:.017,volume:.035,frequency:5600,mode:'highpass',q:.7,attack:.0005},
      {source:'tone',frequency:520,end:1680,duration:.045,volume:.042,wave:'triangle',cutoff:3400,room:.035},
      {source:'tone',frequency:1760,end:820,duration:.055,volume:.026,wave:'sine',delay:.022,room:.06}
    ]},
    cryo:{gap:.1,jitter:.045,layers:[
      {source:'noise',duration:.075,volume:.04,frequency:4300,mode:'highpass',q:.8,attack:.001},
      {source:'tone',frequency:1390,end:720,duration:.105,volume:.036,wave:'triangle',cutoff:3100,room:.08},
      {source:'tone',frequency:2550,end:1860,duration:.047,volume:.018,wave:'sine',delay:.016},
      {source:'noise',duration:.17,volume:.017,frequency:2700,mode:'bandpass',q:2.1,delay:.025,room:.24,optional:true}
    ]},
    gatling:{gap:.052,jitter:.065,layers:[
      {source:'noise',duration:.014,volume:.04,frequency:2900,mode:'bandpass',q:.75,attack:.0005},
      {source:'tone',frequency:158,end:91,duration:.052,volume:.035,wave:'square',cutoff:690},
      {source:'tone',frequency:1020,end:710,duration:.025,volume:.014,wave:'triangle',delay:.002}
    ]},
    disruptor:{gap:.13,jitter:.025,layers:[
      {source:'noise',duration:.06,volume:.06,frequency:1350,mode:'bandpass',q:1.15,attack:.001},
      {source:'tone',frequency:198,end:61,duration:.34,volume:.105,wave:'sawtooth',cutoff:920,room:.14},
      {source:'tone',frequency:870,end:215,duration:.17,volume:.044,wave:'square',cutoff:1800,delay:.008,room:.1},
      {source:'noise',duration:.32,volume:.024,frequency:520,mode:'bandpass',q:1.3,delay:.035,room:.36,optional:true}
    ]}
  };
  globalThis.ICEBOUND_AUDIO={weaponProfiles:WEAPON_AUDIO_PROFILES};
  const $=s=>document.querySelector(s);
  const compactLayout=()=>globalThis.matchMedia?.('(max-width:950px)').matches;
  function activePlanet(){return PLANETS.find(p=>p.id===activePlanetId)||PLANETS[0]}
  function activeMission(){return activePlanet().missions[activeMissionIndex]||activePlanet().missions[0]}
  /* Fortschritt: Missionen eines Planeten laufen der Reihe nach, der naechste
     Planet oeffnet erst, wenn alle Missionen des Vorgaengers geschafft sind. */
  function missionKey(planetId,index){return `${planetId}:${index}`}
  function missionCleared(planetId,index){return progress.cleared.includes(missionKey(planetId,index))}
  function planetCleared(planet){return planet.missions.every((_,index)=>missionCleared(planet.id,index))}
  function planetUnlocked(planetId){const at=PLANETS.findIndex(p=>p.id===planetId);if(at<=0)return true;return PLANETS.slice(0,at).every(planetCleared)}
  function missionUnlocked(planetId,index){if(!planetUnlocked(planetId))return false;return index===0||missionCleared(planetId,index-1)}
  function markMissionCleared(planetId,index){const key=missionKey(planetId,index);if(progress.cleared.includes(key))return;progress.cleared.push(key);saveProgress()}
  /* Luftwaffen tauchen erst auf, wenn es ueberhaupt Luftziele gibt: ab der
     ersten erreichbaren Schwer- oder Final-Mission. */
  function airTierReached(){return PLANETS.some(planet=>planet.missions.some((mission,index)=>(mission.level==='SCHWER'||mission.level==='FINAL')&&missionUnlocked(planet.id,index)))}
  function towerUnlocked(type){return progress.unlocked.includes(type)}
  function towerAvailable(type){return types[type]?.targets==='air'?airTierReached():true}
  function unlockXpCost(type){return Math.round(types[type].cost*UNLOCK_XP_FACTOR)}
  function unlockTower(type){if(towerUnlocked(type))return;progress.unlocked.push(type);saveProgress()}
  function arsenalTuningLabel(mode=state?.testTuningMode){return TEST_TUNING_MODES[mode]||TEST_TUNING_MODES.zero}
  function arsenalEnemyLabel(kind=state?.testEnemyType){return kind==='mixed'?'GEMISCHT':(enemyTypes[kind]||enemyTypes[GAME_BALANCE.arsenalTest.enemyType]).name}
  function arsenalEnemyKindForBatch(batchIndex=0){const selected=state?.testEnemyType||GAME_BALANCE.arsenalTest.enemyType;if(selected!=='mixed'&&TEST_ENEMY_TYPES.includes(selected))return selected;const waveOffset=Math.max(0,(state?.wave||1)-1)*GAME_BALANCE.arsenalTest.batchesPerWave;return TEST_ENEMY_TYPES[(waveOffset+batchIndex)%TEST_ENEMY_TYPES.length]}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
  /* Jede Zeilenangabe laeuft hierdurch, damit nichts oberhalb des Spielfelds
     landet. Die Basis braucht zusaetzlich Platz fuer ihr 3x3-Feld. */
  function playRow(row){return clamp(row,ROW_TOP,ROWS-1)}
  function baseRow(row){return clamp(row,ROW_TOP+1,ROWS-2)}
  function missionSpawnPoints(mission){const count=GAME_BALANCE.spawnLineCount[mission.level]||1,offsets=GAME_BALANCE.spawnLineOffsets[count]||[0],start=playRow(mission.spawnY),rows=[...new Set(offsets.map(offset=>ROW_TOP+(((start-ROW_TOP+offset)%PLAY_ROWS)+PLAY_ROWS)%PLAY_ROWS))];return rows.slice(0,count).map(y=>({x:0,y}))}
  function reserveRoute(mission,start=spawn,laneIndex=0){
    const cells=new Set(),layout=mission.layout+laneIndex*17,waypoints=[start,{x:4,y:playRow(start.y+Math.round((seeded(layout,71)-.5)*5))},{x:9,y:playRow(ROW_TOP+Math.floor(seeded(layout,72)*PLAY_ROWS))},{x:14,y:playRow(baseRow(mission.baseY)+Math.round((seeded(layout,73)-.5)*7))},base];let current={...start};cells.add(key(current.x,current.y));
    waypoints.slice(1).forEach((target,index)=>{const walk=(axis)=>{while(current[axis]!==target[axis]){current[axis]+=Math.sign(target[axis]-current[axis]);cells.add(key(current.x,current.y))}};(layout+index)%2?(walk('y'),walk('x')):(walk('x'),walk('y'))});
    return cells
  }
  function buildMapObstacles(planet,mission){
    const reserved=new Set(),cells=new Map(),density=mission.level==='FINAL'?12:mission.level==='SCHWER'?10:mission.level==='MITTEL'?8:6,shapes=[[[0,0],[1,0],[0,1]],[[0,0],[0,1],[0,2]],[[0,0],[1,0],[2,0]],[[0,0],[1,0],[1,1]],[[0,0],[-1,1],[1,1]]];spawnPoints.forEach((point,index)=>reserveRoute(mission,point,index).forEach(cell=>reserved.add(cell)));
    for(let i=0;i<density;i++){const anchorX=2+Math.floor(seeded(worldSeed+i,80)*15),anchorY=ROW_TOP+Math.floor(seeded(worldSeed+i,81)*PLAY_ROWS),shape=shapes[(mission.layout+i)%shapes.length];for(let part=0;part<shape.length;part++){const [dx,dy]=shape[part],x=anchorX+dx,y=anchorY+dy,k=key(x,y);if(x<2||x>16||y<ROW_TOP||y>=ROWS||cells.has(k)||reserved.has(k)||Math.abs(x-base.x)<=1&&Math.abs(y-base.y)<=1)continue;const layout=GAME_BALANCE.obstacleLayout,radius=layout.neighborRadius||1,neighborTypes=new Set();if(layout.preventSameTypeNeighbors)for(let nx=x-radius;nx<=x+radius;nx++)for(let ny=y-radius;ny<=y+radius;ny++){const neighbor=cells.get(key(nx,ny));if(neighbor)neighborTypes.add(neighbor.type)}const start=(i+mission.layout+part*2)%planet.obstacleTypes.length,type=Array.from({length:planet.obstacleTypes.length},(_,offset)=>planet.obstacleTypes[(start+offset)%planet.obstacleTypes.length]).find(candidate=>!neighborTypes.has(candidate));if(!type)continue;cells.set(k,{x,y,type,seed:worldSeed+i*17+part*11})}}
    return [...cells.values()]
  }
  function configureWorld(){
    const planet=activePlanet(),mission=activeMission();worldSeed=planet.seed+mission.seed;base={x:18,y:baseRow(mission.baseY)};spawnPoints=missionSpawnPoints(mission);spawn=spawnPoints[0];obstacles=buildMapObstacles(planet,mission);
    scenery=Array.from({length:12},(_,i)=>{const edge=i%2===0,x=edge?18+seeded(worldSeed+i,90)*150:832+seeded(worldSeed+i,90)*150,y=35+seeded(worldSeed+i,91)*(H-55);return{x,y,h:22+seeded(worldSeed+i,92)*42,s:6+seeded(worldSeed+i,93)*8,c:planet.theme.crystal}});
    flora=Array.from({length:14},(_,i)=>{const side=i%4,x=side===0?70+seeded(worldSeed+i,94)*150:side===1?780+seeded(worldSeed+i,94)*150:160+seeded(worldSeed+i,94)*680,y=45+seeded(worldSeed+i,95)*(H-65);return{x,y,s:.55+seeded(worldSeed+i,96)*.62,lean:(seeded(worldSeed+i,97)-.5)*.25,kind:planet.flora,seed:worldSeed+i}});
    groundPatches=Array.from({length:32},(_,i)=>{const x=seeded(worldSeed+i,1)*W,y=20+seeded(worldSeed+i,2)*(H-32),field=terrainFractalNoise(x,y,41);return{x,y,rx:48+seeded(worldSeed+i,3)*118,ry:20+seeded(worldSeed+i,4)*58,tone:Math.min(7,Math.floor((field*.7+seeded(worldSeed+i,5)*.3)*8)),angle:(seeded(worldSeed+i,6)-.5)*1.35,material:Math.floor(seeded(worldSeed+i,7)*3),opacity:.64+seeded(worldSeed+i,8)*.34,seed:worldSeed+i}});
    groundVeins=Array.from({length:26},(_,i)=>({x:seeded(worldSeed+i,18)*W,y:48+seeded(worldSeed+i,19)*(H-68),length:34+seeded(worldSeed+i,20)*96,angle:(seeded(worldSeed+i,21)-.5)*Math.PI,bend:(seeded(worldSeed+i,22)-.5)*34,branches:seeded(worldSeed+i,23)>.58?2:1,seed:worldSeed+i}));
    groundDetails=Array.from({length:460},(_,i)=>{const x=seeded(worldSeed+i,31)*W,y=28+seeded(worldSeed+i,32)*(H-42),density=terrainFractalNoise(x,y,71);return{x,y,density,kind:Math.floor(seeded(worldSeed+i,33)*9),size:.65+seeded(worldSeed+i,34)*1.25,angle:(seeded(worldSeed+i,35)-.5)*Math.PI,seed:worldSeed+i}}).filter(detail=>seeded(detail.seed,36)<.17+detail.density*.56);
    materialAssetsReady=false;surfacePattern=null;terrainReady=false;gridReady=false;skyCtx.clearRect(0,0,W,H);terrainCtx.clearRect(0,0,W,H);pathCtx.clearRect(0,0,W,H);wallCtx.clearRect(0,0,W,H);gridCtx.clearRect(0,0,W,H);const wrap=document.querySelector('.canvas-wrap');if(wrap)wrap.dataset.planet=planet.id;document.documentElement.style.setProperty('--world-accent',planet.theme.accent);document.documentElement.style.setProperty('--world-glow',planet.theme.glow)
  }
  function renderWorldPicker(){
    const planet=activePlanet(),mission=activeMission();document.querySelectorAll('[data-planet]').forEach(button=>{const open=planetUnlocked(button.dataset.planet);button.classList.toggle('active',button.dataset.planet===planet.id);button.classList.toggle('locked',!open);button.disabled=!open;button.title=open?'':'Erst alle Missionen des vorherigen Planeten abschliessen'});$('#missionPicker').innerHTML=planet.missions.map((item,index)=>{const open=missionUnlocked(planet.id,index),done=missionCleared(planet.id,index);return`<button class="mission-card ${index===activeMissionIndex?'active':''} ${open?'':'locked'} ${done?'cleared':''}" data-mission="${index}" ${open?'':'disabled'}><b>${item.name}</b><em>${done?'✔':open?item.stars:'🔒'}</em><span>${item.level} · ${item.waves} WELLEN</span></button>`}).join('');$('#worldBrief').innerHTML=`${mission.brief}<span>${planet.trait}</span>`;$('#sectorName').textContent=`${planet.code} · ${mission.level}`;$('#messageEyebrow').textContent=`${planet.code} // ${planet.title}`;$('#messageTitle').textContent=mission.name;$('#messageCopy').textContent=`${planet.name}: ${mission.level.toLowerCase()}er Einsatz mit ${mission.waves} automatischen Wellen und ${mission.credits} Startenergie.`
  }
  function setMissionScreen(visible){$('#message').classList.toggle('hidden',!visible);$('#missionBackdrop').hidden=!visible;document.body.classList.toggle('mission-screen',visible);syncRotateHint()}
  function selectWorld(planetId,missionIndex=0){if(!missionUnlocked(planetId,missionIndex)){pulse('EINSATZ NOCH GESPERRT');return}activePlanetId=planetId;activeMissionIndex=missionIndex;configureWorld();reset();renderWorldPicker();setMissionScreen(true);$('#startBtn').textContent='MISSION STARTEN'}
  function reset(){const mission=activeMission(),integrity=Math.max(1,GAME_BALANCE.baseIntegrity);selected=null;selectedTowerId=null;selectedEnemyId=null;renderDetail=2;framePressure=0;state={credits:mission.credits,integrity,maxIntegrity:integrity,wave:0,maxWaves:mission.waves,nextTowerId:1,nextEnemyId:1,towers:[],drones:[],enemies:[],shots:[],particles:[],floaters:[],cracks:[],shocks:[],shake:0,baseFlash:0,impactFlash:0,impactColor:'#ffffff',path:null,paths:[],spawnLaneCursor:0,testStations:[],testTowerIds:new Set(),testTuningMode:'zero',testEnemyType:GAME_BALANCE.arsenalTest.enemyType,testElapsed:0,wallSlowCells:new Set(),buildPhase:false,pending:[],waveActive:false,intermission:0,spawnLeft:0,spawnTimer:0,waveSpawned:0,waveSpawnTotal:0,waveKills:0,waveBreaches:0,kills:0,breaches:0,testMode:false,endless:false,started:false,over:false,result:null};state.paths=spawnPoints.map(point=>pathfind(null,point));state.path=state.paths[0];uiSnapshot='';intelSnapshot='';uiNext=0;placementCache.key='';document.querySelectorAll('.tower-card').forEach(b=>b.classList.remove('active'));const selectionSection=$('#selectionSection'),buildSection=$('#buildSection');if(selectionSection)selectionSection.open=false;if(buildSection)buildSection.open=true;rebuildPathCache();rebuildWallSystems();updateUI()}
  function arsenalTestPath(row,fromLeft){const path=[],test=GAME_BALANCE.arsenalTest;if(fromLeft)for(let x=0;x<=test.leftPathEndColumn;x++)path.push({x,y:row});else for(let x=COLS-1;x>=test.rightPathEndColumn;x--)path.push({x,y:row});return path}
  function setupArsenalTest(){
    selected=null;selectedTowerId=null;selectedEnemyId=null;placementCache.key='';obstacles=[];scenery=[];flora=[];terrainReady=false;gridReady=false;
    state.towers=[];state.drones=[];state.enemies=[];state.shots=[];state.particles=[];state.floaters=[];state.cracks=[];state.shocks=[];state.wallSlowCells=new Set();state.testStations=[];state.testTowerIds=new Set();state.testTuningMode='zero';state.testEnemyType=GAME_BALANCE.arsenalTest.enemyType;state.testElapsed=0;state.nextTowerId=1;state.nextEnemyId=1;
    const test=GAME_BALANCE.arsenalTest,rows=test.laneRows;ARSENAL_TYPES.forEach((type,index)=>{const fromLeft=index<4,row=rows[index%rows.length],path=arsenalTestPath(row,fromLeft),tower={id:state.nextTowerId++,x:fromLeft?test.leftTowerColumn:test.rightTowerColumn,y:row+test.towerRowOffset,type,cool:0,angle:fromLeft?Math.PI:0,pulse:0,salvo:0,tuning:{power:0,rate:0,range:0},investment:types[type].cost,damageDealt:0,kills:0,xpEarned:0,testStation:index};const station={index,type,towerId:tower.id,towerX:tower.x,towerY:tower.y,path,spawn:path[0],depot:path.at(-1),maxDepotHp:test.depotHp,depotHp:test.depotHp,depotDamage:0,leaks:0,hit:0};state.towers.push(tower);state.testStations.push(station);state.testTowerIds.add(tower.id);syncDrones(tower)});
    state.paths=state.testStations.map(station=>station.path);state.path=state.paths[0];document.querySelectorAll('.tower-card').forEach(b=>b.classList.remove('active'));closeSelectionSection();rebuildPathCache();rebuildWallSystems();uiSnapshot='';intelSnapshot=''
  }
  function restartArsenalMeasurement(){if(!state.testMode||!state.started)return;state.wave=0;state.waveActive=false;state.intermission=0;state.spawnLeft=0;state.spawnTimer=0;state.waveSpawned=0;state.waveKills=0;state.waveBreaches=0;state.kills=0;state.breaches=0;state.testElapsed=0;state.enemies=[];state.shots=[];state.particles=[];state.floaters=[];state.cracks=[];state.shocks=[];state.drones=[];for(const tower of state.towers){tower.cool=0;tower.pulse=0;tower.salvo=0;tower.damageDealt=0;tower.kills=0;tower.xpEarned=0;tower.angle=tower.testStation<4?Math.PI:0;syncDrones(tower)}for(const station of state.testStations){station.depotHp=station.maxDepotHp;station.depotDamage=0;station.leaks=0;station.hit=0}uiSnapshot='';intelSnapshot='';startWave();updateSelectionPanel();updateUI()}
  function setArsenalTuningMode(mode){if(!state.testMode||!state.started||!TEST_TUNING_MODES[mode]||state.testTuningMode===mode)return;state.testTuningMode=mode;restartArsenalMeasurement();pulse(`ARSENAL-MESSUNG · ${arsenalTuningLabel()}`)}
  function setArsenalEnemyType(kind){if(!state.testMode||!state.started||(kind!=='mixed'&&!TEST_ENEMY_TYPES.includes(kind))||state.testEnemyType===kind)return;state.testEnemyType=kind;restartArsenalMeasurement();pulse(`TEST-GEGNER · ${arsenalEnemyLabel()}`)}
  function initAudio(){
    if(audio.ctx){if(audio.ctx.state==='suspended')audio.ctx.resume();return}
    const AudioEngine=globalThis.AudioContext||globalThis.webkitAudioContext;if(!AudioEngine)return;
    try{
      const ac=audio.ctx=new AudioEngine();audio.master=ac.createGain();audio.music=ac.createGain();audio.sfx=ac.createGain();audio.limiter=ac.createDynamicsCompressor();audio.room=ac.createConvolver();audio.roomGain=ac.createGain();audio.master.gain.value=audio.muted?0:.72;audio.music.gain.value=.18;audio.sfx.gain.value=.32;audio.roomGain.gain.value=.13;
      audio.limiter.threshold.value=-17;audio.limiter.knee.value=14;audio.limiter.ratio.value=5;audio.limiter.attack.value=.003;audio.limiter.release.value=.16;audio.music.connect(audio.master);audio.sfx.connect(audio.master);audio.room.connect(audio.roomGain);audio.roomGain.connect(audio.master);audio.master.connect(audio.limiter);audio.limiter.connect(ac.destination);
      const noiseLength=Math.floor(ac.sampleRate*.8),noiseBuffer=ac.createBuffer(1,noiseLength,ac.sampleRate),noiseData=noiseBuffer.getChannelData(0);for(let i=0;i<noiseLength;i++)noiseData[i]=Math.random()*2-1;audio.noise=noiseBuffer;
      const roomLength=Math.floor(ac.sampleRate*.48),impulse=ac.createBuffer(2,roomLength,ac.sampleRate);for(let channel=0;channel<2;channel++){const data=impulse.getChannelData(channel);for(let i=0;i<roomLength;i++){const envelope=(1-i/roomLength)**2.7,early=i<ac.sampleRate*.018?i/(ac.sampleRate*.018):1;data[i]=(Math.random()*2-1)*envelope*early}}audio.room.buffer=impulse;audio.room.normalize=true;
    }catch(_){audio.ctx=null}
  }
  function routeAudio(node,bus='sfx',room=0,pan=0){const dry=bus==='music'?audio.music:audio.sfx,ac=audio.ctx,panner=bus==='sfx'&&ac.createStereoPanner?ac.createStereoPanner():null,output=panner||node;if(panner){panner.pan.value=clamp(pan,-.78,.78);node.connect(panner)}output.connect(dry);if(bus==='sfx'&&room>0&&audio.room){const send=ac.createGain();send.gain.value=room;output.connect(send);send.connect(audio.room)}}
  function reserveAudioVoice(){if(!audio.ctx||audio.muted||audio.voices>=36)return false;audio.voices++;return true}
  function tone(freq,duration=.12,volume=.08,wave='sine',bus='sfx',delay=0,finish=freq,options={}){if(!reserveAudioVoice())return;const ac=audio.ctx,start=ac.currentTime+delay,osc=ac.createOscillator(),gain=ac.createGain(),attack=Math.max(.0005,Math.min(duration*.35,options.attack??.002)),filter=options.filter?ac.createBiquadFilter():null;osc.type=wave;osc.frequency.setValueAtTime(Math.max(20,freq),start);osc.frequency.exponentialRampToValueAtTime(Math.max(20,finish),start+duration);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),start+attack);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);if(filter){filter.type=options.filter.type||'lowpass';filter.frequency.value=options.filter.frequency||1800;filter.Q.value=options.filter.q||.7;osc.connect(filter);filter.connect(gain)}else osc.connect(gain);routeAudio(gain,bus,options.room||0,options.pan||0);osc.onended=()=>audio.voices=Math.max(0,audio.voices-1);osc.start(start);osc.stop(start+duration+.025)}
  function noise(duration=.18,volume=.08,frequency=480,delay=0,options={}){if(!audio.noise||!reserveAudioVoice())return;const ac=audio.ctx,start=ac.currentTime+delay,source=ac.createBufferSource(),filter=ac.createBiquadFilter(),gain=ac.createGain(),attack=Math.max(.0005,Math.min(duration*.35,options.attack??.001));source.buffer=audio.noise;source.loop=true;source.playbackRate.value=options.playbackRate||1;filter.type=options.type||'lowpass';filter.frequency.value=Math.max(30,frequency);filter.Q.value=options.q||.7;gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),start+attack);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);source.connect(filter);filter.connect(gain);routeAudio(gain,'sfx',options.room||0,options.pan||0);source.onended=()=>audio.voices=Math.max(0,audio.voices-1);source.start(start,Math.random()*.6);source.stop(start+duration+.02)}
  function playWeaponShot(name,pan=0){const profile=WEAPON_AUDIO_PROFILES[name];if(!profile)return;const pitch=1+(Math.random()*2-1)*profile.jitter,loudness=.95+Math.random()*.1;for(const layer of profile.layers){if(layer.optional&&audio.voices>22)continue;if(layer.source==='tone'){const frequency=layer.frequency*pitch,finish=(layer.end??layer.frequency)*pitch;tone(frequency,layer.duration,layer.volume*loudness,layer.wave||'sine','sfx',layer.delay||0,finish,{attack:layer.attack,room:layer.room,pan,filter:layer.cutoff?{type:layer.filterMode||'lowpass',frequency:layer.cutoff*pitch,q:layer.q||.7}:null})}else noise(layer.duration,layer.volume*loudness,layer.frequency*pitch,layer.delay||0,{type:layer.mode||'lowpass',q:layer.q||.7,attack:layer.attack,room:layer.room,pan,playbackRate:pitch})}}
  function sound(name,worldX=null){if(!audio.ctx||audio.muted||silentSimulation)return;const now=audio.ctx.currentTime,profile=WEAPON_AUDIO_PROFILES[name],gaps={kill:.055,rocketImpact:.1,mortarImpact:.1,breach:.25},gap=profile?.gap??gaps[name]??0;if(now-(audio.last[name]??-9)<gap)return;audio.last[name]=now;const pan=worldX==null?0:clamp((worldX/W-.5)*1.35,-.72,.72);if(profile){playWeaponShot(name,pan);return}if(name==='build'){tone(190,.12,.08,'triangle');tone(360,.18,.055,'sine','sfx',.06)}else if(name==='upgrade'){tone(260,.12,.08,'triangle');tone(390,.14,.07,'triangle','sfx',.08);tone(590,.2,.055,'sine','sfx',.17)}else if(name==='demolish'){tone(150,.2,.08,'sawtooth','sfx',0,70,{room:.08});noise(.24,.085,520,.03,{room:.12});tone(320,.12,.04,'triangle','sfx',.18,180)}else if(name==='rocketImpact'){noise(.04,.15,2600,0,{type:'bandpass',q:.65,attack:.0005,room:.12,pan});tone(58,.38,.14,'sine','sfx',0,27,{room:.22,pan});noise(.42,.072,620,.018,{type:'lowpass',q:.5,attack:.002,room:.38,pan})}else if(name==='mortarImpact'){noise(.055,.12,1700,0,{type:'bandpass',q:.75,attack:.0007,room:.14,pan});tone(74,.31,.11,'triangle','sfx',0,34,{room:.26,pan});tone(310,.14,.033,'sine','sfx',.012,125,{room:.2,pan});noise(.32,.052,480,.024,{type:'lowpass',q:.55,room:.32,pan})}else if(name==='kill'){tone(420,.07,.025,'triangle','sfx',0,250)}else if(name==='split'){tone(310,.16,.05,'square','sfx',0,570)}else if(name==='breach'){tone(46,.65,.16,'sawtooth','sfx',0,25,{room:.18});noise(.5,.16,310,0,{room:.24})}else if(name==='wave'){tone(150,.25,.07,'triangle');tone(225,.25,.065,'triangle','sfx',.13);tone(300,.34,.06,'triangle','sfx',.26)}else if(name==='victory'){[220,277,330,440].forEach((f,i)=>tone(f,.55,.065,'triangle','sfx',i*.16))}else if(name==='defeat'){[110,82,55].forEach((f,i)=>tone(f,.55,.08,'sawtooth','sfx',i*.18,35))}}
  function updateMusic(dt){if(!audio.ctx||audio.muted||!state.started||state.over)return;audio.beat-=dt;if(audio.beat>0)return;const roots=[55,65.41,73.42,49],root=roots[Math.floor(state.wave/2)%roots.length],active=state.waveActive;tone(root,active?1.15:1.7,active?.045:.032,'triangle','music');if(audio.step%2===0)tone(root*(active?3:2),.34,active?.021:.012,'sine','music',.05);if(active&&audio.step%4===3)tone(root*4.5,.12,.014,'square','music',.1);audio.step++;audio.beat=active?.48:.82}
  function toggleAudio(){initAudio();audio.muted=!audio.muted;if(audio.master)audio.master.gain.setTargetAtTime(audio.muted?0:.72,audio.ctx.currentTime,.03);const button=$('#soundBtn');button.textContent=audio.muted?'×':'♫';button.classList.toggle('muted',audio.muted)}
  function key(x,y){return `${x},${y}`}
  function obstacleAt(x,y){return obstacles.find(o=>o.x===x&&o.y===y)}
  function occupied(x,y,extra){return !!obstacleAt(x,y)||state.towers.some(t=>t.x===x&&t.y===y)||!!state.pending?.some(p=>p.x===x&&p.y===y)||(extra&&extra.x===x&&extra.y===y)}
  function pathfind(extra,startPoint=spawn){
    const q=[startPoint], prev=new Map([[key(startPoint.x,startPoint.y),null]]), dirs=[[1,0],[0,1],[0,-1],[-1,0]];
    while(q.length){const p=q.shift();if(p.x===base.x&&p.y===base.y){const path=[];let cur=p;while(cur){path.unshift(cur);cur=prev.get(key(cur.x,cur.y))}return path}
      for(const [dx,dy] of dirs){const n={x:p.x+dx,y:p.y+dy},k=key(n.x,n.y);if(n.x<0||n.y<ROW_TOP||n.x>=COLS||n.y>=ROWS||prev.has(k)||occupied(n.x,n.y,extra)||(n.x===19&&n.y!==base.y))continue;prev.set(k,p);q.push(n)}
    } return null
  }
  function allSpawnRoutes(extra=null){return spawnPoints.map(point=>pathfind(extra,point))}
  function spawnPointAt(x,y){return spawnPoints.some(point=>point.x===x&&point.y===y)}
  function cellCenter(p){return {x:p.x*CELL+CELL/2,y:p.y*CELL+CELL/2}}
  function project(x,y,z=0){const depth=Math.max(0,Math.min(1,y/H)),scale=CAMERA.farScale+(1-CAMERA.farScale)*depth;return{x:W/2+(x-W/2)*scale,y:CAMERA.horizon+y*CAMERA.compression-z*scale,scale}}
  function unproject(x,y){const wy=(y-CAMERA.horizon)/CAMERA.compression,depth=Math.max(0,Math.min(1,wy/H)),scale=CAMERA.farScale+(1-CAMERA.farScale)*depth;return{x:W/2+(x-W/2)/scale,y:wy}}
  let industrialRendering=false;
  const INDUSTRIAL={black:'#202629',dark:'#343c3e',mid:'#596264',light:'#8d9594',pale:'#bcc2bf',rust:'#785d48'};
  const TOWER_VISUALS={
    rail:{accent:'#a7afad',glow:false},drone:{accent:'#85858b',glow:false},rocket:{accent:'#9a8b68',glow:false},mortar:{accent:'#876b5d',glow:false},
    laser:{accent:'#d95b61',glow:true},cryo:{accent:'#78b7ad',glow:true},gatling:{accent:'#929996',glow:false},disruptor:{accent:'#a17eaa',glow:true},wall:{accent:'#8e9691',glow:false}
  };
  const ROUND_MECHANICAL_FILLS=new Set(['#555c50','#41484c','#52625f','#565c58','#554960','#252b2e','#d9dedc','#fff1dc','#3d4d4a','#202725','#596264','#737b7a','#555d5e','#303638','#89918d','#363e41']);
  function poly(points,fill,stroke){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke&&!industrialRendering){ctx.strokeStyle=stroke;ctx.stroke()}}
  function ellipseAt(p,rx,ry,fill,stroke){if(industrialRendering&&ROUND_MECHANICAL_FILLS.has(fill))ry=rx;ctx.beginPath();ctx.ellipse(p.x,p.y,rx*p.scale,ry*p.scale,0,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill()}if(stroke&&!industrialRendering){ctx.strokeStyle=stroke;ctx.stroke()}}
  function seeded(index,salt=0){const value=Math.sin(index*127.1+salt*311.7)*43758.5453;return value-Math.floor(value)}
  function mixColors(a,b,t){const pa=parseInt(a.slice(1),16),pb=parseInt(b.slice(1),16),ar=pa>>16&255,ag=pa>>8&255,ab=pa&255,br=pb>>16&255,bg=pb>>8&255,bb=pb&255,r=Math.round(ar+(br-ar)*t),g=Math.round(ag+(bg-ag)*t),bl=Math.round(ab+(bb-ab)*t);return`#${((1<<24)+(r<<16)+(g<<8)+bl).toString(16).slice(1)}`}
  function terrainValueNoise(x,y,scale,salt){const gx=x/scale,gy=y/scale,x0=Math.floor(gx),y0=Math.floor(gy),tx=(gx-x0)**2*(3-2*(gx-x0)),ty=(gy-y0)**2*(3-2*(gy-y0)),sample=(dx,dy)=>seeded(worldSeed+(x0+dx)*92821+(y0+dy)*68917,salt),a=sample(0,0)+(sample(1,0)-sample(0,0))*tx,b=sample(0,1)+(sample(1,1)-sample(0,1))*tx;return a+(b-a)*ty}
  function terrainFractalNoise(x,y,salt){return terrainValueNoise(x,y,270,salt)*.56+terrainValueNoise(x,y,96,salt+1)*.29+terrainValueNoise(x,y,34,salt+2)*.15}
  function buildMaterialAssets(){
    if(materialAssetsReady)return;
    const theme=activePlanet().theme;surfaceCtx.clearRect(0,0,256,256);macroSurfaceCtx.clearRect(0,0,80,52);shadowCtx.clearRect(0,0,128,64);
    const flecks=[theme.light+'24',theme.dark+'35','rgba(125,105,76,.14)',theme.plant+'2d','rgba(230,224,197,.1)'];
    for(let i=0;i<1260;i++){const x=seeded(worldSeed+i,1)*256,y=seeded(worldSeed+i,2)*256,w=.45+seeded(worldSeed+i,3)*2.8,h=.35+seeded(worldSeed+i,4)*1.6;surfaceCtx.fillStyle=flecks[Math.floor(seeded(worldSeed+i,5)*flecks.length)];surfaceCtx.fillRect(x,y,w,h)}
    surfaceCtx.strokeStyle='rgba(223,227,209,.09)';surfaceCtx.lineWidth=.7;
    for(let i=0;i<42;i++){const x=seeded(worldSeed+i,6)*232,y=seeded(worldSeed+i,7)*256,length=12+seeded(worldSeed+i,8)*34;surfaceCtx.beginPath();surfaceCtx.moveTo(x,y);surfaceCtx.quadraticCurveTo(x+length*.38,y+(seeded(worldSeed+i,9)-.5)*7,x+length,y+(seeded(worldSeed+i,10)-.5)*5);surfaceCtx.stroke()}
    const macroColors=[theme.ground[0]+'22',theme.ground[1]+'2e',theme.dark+'28',theme.plant+'1d',theme.light+'14'];for(let y=0;y<52;y++)for(let x=0;x<80;x++){const wx=x/79*W,wy=y/51*H,n=terrainFractalNoise(wx,wy,91),material=Math.min(macroColors.length-1,Math.floor(n*macroColors.length));macroSurfaceCtx.fillStyle=macroColors[material];macroSurfaceCtx.fillRect(x,y,1,1)}
    const shadow=shadowCtx.createRadialGradient(64,32,2,64,32,58);shadow.addColorStop(0,'rgba(8,17,15,.54)');shadow.addColorStop(.44,'rgba(8,17,15,.31)');shadow.addColorStop(1,'rgba(8,17,15,0)');shadowCtx.fillStyle=shadow;shadowCtx.fillRect(0,0,128,64);
    surfacePattern=terrainCtx.createPattern(surfaceCanvas,'repeat');materialAssetsReady=true;
  }
  function drawSoftShadow(x,y,rx,ry,height=18,alpha=.3){
    buildMaterialAssets();const p=project(x-height*.34,y+height*.18,0),scale=p.scale,baseAlpha=ctx.globalAlpha;
    if(renderDetail===0){ctx.globalAlpha=baseAlpha*alpha*.85;ctx.drawImage(shadowSprite,p.x-rx*1.6*scale,p.y-ry*1.45*scale,rx*3.2*scale,ry*2.9*scale);ctx.globalAlpha=baseAlpha;return}
    ctx.save();ctx.globalAlpha=baseAlpha*alpha;ctx.translate(p.x,p.y);ctx.rotate(-.12);ctx.drawImage(shadowSprite,-rx*1.65*scale,-ry*1.55*scale,rx*3.3*scale,ry*3.1*scale);ctx.restore();
  }
  function drawFastShadow(x,y,rx,ry,height=18,alpha=.3){
    buildMaterialAssets();const p=project(x-height*.34,y+height*.18,0),scale=p.scale,baseAlpha=ctx.globalAlpha;ctx.globalAlpha=baseAlpha*alpha*.9;ctx.drawImage(shadowSprite,p.x-rx*1.62*scale,p.y-ry*1.5*scale,rx*3.24*scale,ry*3*scale);ctx.globalAlpha=baseAlpha;
  }
  const DRONE_SPRITE_SIZE=64,DRONE_ANGLE_STEPS=48,DRONE_BANK_STEPS=7,droneSpriteCache=new Map();
  function getDroneSprite(angle,bank){
    const angleIndex=((Math.round(angle/(Math.PI*2)*DRONE_ANGLE_STEPS)%DRONE_ANGLE_STEPS)+DRONE_ANGLE_STEPS)%DRONE_ANGLE_STEPS,bankIndex=clamp(Math.round((clamp(bank,-.6,.6)+.6)/1.2*(DRONE_BANK_STEPS-1)),0,DRONE_BANK_STEPS-1),key=angleIndex*DRONE_BANK_STEPS+bankIndex,cached=droneSpriteCache.get(key);if(cached)return cached;
    const sprite=document.createElement('canvas');sprite.width=sprite.height=DRONE_SPRITE_SIZE;const paint=sprite.getContext('2d'),center=DRONE_SPRITE_SIZE/2,dir=angleIndex/DRONE_ANGLE_STEPS*Math.PI*2,quantizedBank=bankIndex/(DRONE_BANK_STEPS-1)*1.2-.6,cos=Math.cos(dir),sin=Math.sin(dir),point=(x,y,z=0)=>({x:center+x,y:center+y*CAMERA.compression-z}),path=(points,fill)=>{paint.beginPath();points.forEach((p,i)=>i?paint.lineTo(p.x,p.y):paint.moveTo(p.x,p.y));paint.closePath();paint.fillStyle=fill;paint.fill()},oval=(p,rx,ry,fill)=>{paint.beginPath();paint.ellipse(p.x,p.y,rx,ry,0,0,Math.PI*2);paint.fillStyle=fill;paint.fill()},p=point(0,0),nose=point(cos*16,sin*16,1),tail=point(-cos*12,-sin*12),left=point(-sin*13,cos*13,-2-quantizedBank*4),right=point(sin*13,-cos*13,-2+quantizedBank*4),leftPod=point(-sin*10-cos*2,cos*10-sin*2,-1-quantizedBank*3),rightPod=point(sin*10-cos*2,-cos*10-sin*2,-1+quantizedBank*3),leftExhaust=point(-cos*20-sin*8,-sin*20+cos*8,-1),rightExhaust=point(-cos*20+sin*8,-sin*20-cos*8,-1);
    paint.lineCap='round';paint.lineJoin='round';path([nose,left,tail,right],'#666472');path([nose,p,left],'#8f8a98');path([nose,right,p],'#4d4b57');paint.strokeStyle='#34333a';paint.lineWidth=4;paint.beginPath();paint.moveTo(left.x,left.y);paint.lineTo(right.x,right.y);paint.stroke();oval(leftPod,4.2,2,'#34323a');oval(rightPod,4.2,2,'#34323a');oval(point(cos*5,sin*5,3),4.5,2,'#c5d4dc');const tailFin=point(-cos*10,-sin*10,6);paint.strokeStyle='#9d98a6';paint.lineWidth=2;paint.beginPath();paint.moveTo(tail.x,tail.y);paint.lineTo(tailFin.x,tailFin.y);paint.stroke();sprite._droneGeometry={leftPod,rightPod,leftExhaust,rightExhaust};droneSpriteCache.set(key,sprite);return sprite;
  }
  const ROCKET_SPRITE_SIZE=52,ROCKET_ANGLE_STEPS=72,rocketSpriteCache=new Map();
  function getRocketSprite(angle){
    const angleIndex=((Math.round(angle/(Math.PI*2)*ROCKET_ANGLE_STEPS)%ROCKET_ANGLE_STEPS)+ROCKET_ANGLE_STEPS)%ROCKET_ANGLE_STEPS,cached=rocketSpriteCache.get(angleIndex);if(cached)return cached;const sprite=document.createElement('canvas');sprite.width=sprite.height=ROCKET_SPRITE_SIZE;const paint=sprite.getContext('2d'),center=ROCKET_SPRITE_SIZE/2,dir=angleIndex/ROCKET_ANGLE_STEPS*Math.PI*2,fx=Math.cos(dir),fy=Math.sin(dir),sx=-fy,sy=fx,point=(forward,side,z=0)=>({x:center+fx*forward+sx*side,y:center+(fy*forward+sy*side)*CAMERA.compression-z}),path=(points,fill)=>{paint.beginPath();points.forEach((p,i)=>i?paint.lineTo(p.x,p.y):paint.moveTo(p.x,p.y));paint.closePath();paint.fillStyle=fill;paint.fill()},tail=point(-10,0),nose=point(13,0,1),left=point(-2,-4),right=point(-2,4),top=point(1,0,4),finL=point(-8,-7,-1),finR=point(-8,7,-1),exhaust=point(-12,0);
    paint.lineCap='round';paint.lineJoin='round';path([tail,left,top],'#303638');path([left,nose,top],'#737a73');path([nose,right,top],'#505752');path([right,tail,top],'#252b2d');paint.strokeStyle='#3b4140';paint.lineWidth=3;paint.beginPath();paint.moveTo(finL.x,finL.y);paint.lineTo(tail.x,tail.y);paint.lineTo(finR.x,finR.y);paint.stroke();paint.fillStyle='#e6d59b';paint.beginPath();paint.arc(nose.x,nose.y,1.8,0,Math.PI*2);paint.fill();sprite._rocketGeometry={exhaust};rocketSpriteCache.set(angleIndex,sprite);return sprite;
  }
  function towerStats(t){const base=types[t.type],mods=activePlanet().mods,isTestTower=state?.testMode&&t.testStation!=null,currentTune=progress.upgrades[t.type]||{power:0,rate:0,range:0},testLevel=state?.testTuningMode==='max'?MAX_TUNING:0,tune=!isTestTower||state.testTuningMode==='current'?currentTune:{power:testLevel,rate:testLevel,range:testLevel},scaling=GAME_BALANCE.tuningPerLevel,power=tune.power||0,rate=tune.rate||0,range=tune.range||0;return{damage:base.damage*(1+power*scaling.damage),rate:base.rate?base.rate/(1+rate*scaling.fireRate):0,range:base.range*(1+range*scaling.range),splash:(base.splash||0)*(1+power*.09)*(base.splash?mods.splash:1),pierce:(base.pierce||0)+Math.floor(power/2)+(t.type==='rail'?mods.railPierce:0),turn:(base.turn||0)*(1+rate*.08),drones:base.drones||0,missiles:base.missiles||1,chain:(base.chain||0)+Math.floor(power/3),slow:base.slow||0,slowTime:(base.slowTime||0)*(1+rate*.08),shieldBonus:base.shieldBonus||1,minRange:(base.minRange||0)*(1+range*scaling.range),power,rateLevel:rate,rangeLevel:range,total:power+rate+range}}
  function tuningCost(t,axis){const tune=progress.upgrades[t.type],level=tune[axis],total=tune.power+tune.rate+tune.range,cost=GAME_BALANCE.tuningCost;return cost.base+level*cost.perLevel+Math.floor(total/3)*cost.perRank}
  function towerInvestment(t){return t.investment??types[t.type].cost}
  function builtCount(type){return state.towers.filter(t=>t.type===type).length+(state.pending?.filter(p=>p.type===type).length||0)}
  function towerCost(type){const base=types[type].cost;if(state?.testMode||!state?.towers)return base;const step=type==='wall'?GAME_BALANCE.wallCostStep:GAME_BALANCE.towerCostStep;return Math.round(base*(1+step*builtCount(type)))}
  function pendingSpend(){return(state?.pending||[]).reduce((sum,p)=>sum+p.cost,0)}
  function availableCredits(){return(state?.credits||0)-pendingSpend()}
  function affordableTowerCount(type){let credits=availableCredits(),count=state?.towers?builtCount(type):0,possible=0;const base=types[type].cost,step=type==='wall'?GAME_BALANCE.wallCostStep:GAME_BALANCE.towerCostStep;while(possible<99){const cost=Math.round(base*(1+step*(count+possible)));if(credits<cost)break;credits-=cost;possible++}return possible}
  function towerRefund(t){return Math.round(towerInvestment(t)*.5)}
  function makeDrone(t,index){const c=cellCenter(t);return{home:t,index,x:c.x,y:c.y,z:40,mode:'dock',target:null,fuel:0,rearm:index*.22,attackCool:0,angle:index*Math.PI*.7,bank:0}}
  function syncDrones(t){if(t.type!=='drone')return;const desired=towerStats(t).drones,current=state.drones.filter(d=>d.home.id===t.id);for(let i=current.length;i<desired;i++)state.drones.push(makeDrone(t,i))}
  function upgradeArsenal(type,axis,towerId=null){const tune=progress.upgrades[type],focus=state.towers.find(v=>v.id===towerId);if(!tune||types[type].tunable===false||!['power','rate','range'].includes(axis)||tune[axis]>=MAX_TUNING)return;const cost=tuningCost({type},axis);if(progress.xp<cost){pulse(`${cost-progress.xp} XP FÜR DAUER-UPGRADE FEHLEN`);return}progress.xp-=cost;tune[axis]++;saveProgress();state.towers.filter(v=>v.type===type).forEach(v=>{v.pulse=1.4;v.cool=0;syncDrones(v)});if(focus){const c=cellCenter(focus);state.shocks.push({x:c.x,y:c.y,life:.9,max:.9,color:types[type].color});burst(c.x,c.y,types[type].color,24,170)}sound('upgrade');pulse(`${types[type].name} · ${axis==='power'?'FEUERKRAFT':axis==='rate'?'TAKTUNG':'REICHWEITE'} DAUERHAFT +1`);if(!$('#codexOverlay')?.hidden)renderCodex();uiSnapshot='';updateUI()}
  function demolishTower(id){const index=state.towers.findIndex(t=>t.id===id);if(index<0||state.over)return;const tower=state.towers[index];if(state.testMode&&tower.testStation!=null){pulse('PRÜFSTAND BLEIBT FEST INSTALLIERT');return}const type=types[tower.type],refund=towerRefund(tower),c=cellCenter(tower);state.credits+=refund;state.towers.splice(index,1);state.drones=state.drones.filter(d=>d.home.id!==id);selectedTowerId=null;placementCache.key='';closeSelectionSection();updatePaths();if(tower.type==='wall')rebuildWallSystems();state.shocks.push({x:c.x,y:c.y,life:.72,max:.72,color:'#d69b78'});burst(c.x,c.y,'#c89472',18,135);if(state.floaters.length<42)state.floaters.push({x:c.x,y:c.y,z:48,life:.9,max:.9,text:`+${refund} E`,color:'#e8c78d'});sound('demolish');uiSnapshot='';updateSelectionPanel();updateUI();pulse(`${type.name} ABGERISSEN · +${refund} ENERGIE`)}
  function enterBuildPhase(){if(!state.started||state.over||state.buildPhase)return false;if(state.testMode){pulse('ARSENAL-TEST NUTZT FESTE PRÜFSTÄNDE');return false}state.buildPhase=true;state.pending=[];selected=null;selectedTowerId=null;selectedEnemyId=null;placementCache.key='';uiSnapshot='';sound('build');pulse('BAUMODUS · ZEIT ANGEHALTEN');updateSelectionPanel();updateUI();return true}
  function leaveBuildPhase(){state.buildPhase=false;state.pending=[];selected=null;selectedTowerId=null;selectedEnemyId=null;placementCache.key='';uiSnapshot='';closeSelectionSection();updateSelectionPanel();updateUI()}
  /* Jede Anlage wird einzeln geplant und einzeln bestaetigt. Der Baumodus bleibt
     danach offen und die Zeit steht weiter still, sodass mehrere Tuerme
     nacheinander entstehen koennen — nur eben jeder mit eigener Zusage. */
  function confirmPending(){if(!state.buildPhase)return;const plan=state.pending[0];
    if(!plan){pulse('ERST EIN BAUFELD ANTIPPEN');return}
    state.credits-=plan.cost;const tower={id:state.nextTowerId++,x:plan.x,y:plan.y,type:plan.type,cool:0,angle:0,pulse:1,salvo:0,tuning:{power:0,rate:0,range:0},investment:plan.cost,damageDealt:0,kills:0,xpEarned:0};state.towers.push(tower);syncDrones(tower);const c=cellCenter(tower);state.shocks.push({x:c.x,y:c.y,life:.8,max:.8,color:types[plan.type].color});burst(c.x,c.y,types[plan.type].color,plan.type==='wall'?9:18,plan.type==='wall'?90:145);
    state.pending=[];placementCache.key='';updatePaths();if(plan.type==='wall')rebuildWallSystems();sound('build');uiSnapshot='';updateSelectionPanel();updateUI();pulse(`${types[plan.type].name} GEBAUT · −${plan.cost} E · ${state.credits} E ÜBRIG`)}
  function discardBuild(){if(!state.buildPhase)return;const planned=state.pending.length;leaveBuildPhase();pulse(planned?'PLANUNG VERWORFEN · BAUMODUS BEENDET · ZEIT LÄUFT':'BAUMODUS BEENDET · ZEIT LÄUFT')}
  /* Das Kreuz raeumt zuerst nur die offene Planung weg. Erst wenn nichts mehr
     geplant ist, beendet es den Baumodus — so laeuft die Zeit nie ueberraschend
     weiter, waehrend man noch einen Bauplatz sucht. */
  function cancelPlacement(){if(!state.buildPhase)return;if(state.pending.length){removePending(0);return}discardBuild()}
  function removePending(index){const p=state.pending[index];if(!p)return;state.pending.splice(index,1);placementCache.key='';uiSnapshot='';sound('demolish');updateSelectionPanel();updateUI();pulse(`${types[p.type].name} VERWORFEN · NICHTS BEZAHLT`)}
  function baseReserved(gx,gy){return Math.abs(gx-base.x)<=1&&Math.abs(gy-base.y)<=1}
  /* Gebaut wird nur, was in der Arsenal-Uebersicht freigeschaltet ist. Die
     Freischaltung selbst kostet ausschliesslich XP und laeuft dort. */
  function addPending(gx,gy){if(!selected||state.over||!state.buildPhase)return;const towerType=selected,type=types[towerType];if(gx<0||gy<ROW_TOP||gx>=COLS||gy>=ROWS)return;if(!towerAvailable(towerType)){pulse(`${type.name} ERST AB EINER SCHWER-MISSION`);return}if(!towerUnlocked(towerType)){pulse(`${type.name} ERST IN DER WERKSTATT FREISCHALTEN`);return}
    /* Es gibt immer nur eine offene Planung. Preis, Budget und Wegpruefung
       rechnen deshalb ohne die alte, die hier ersetzt wird. Scheitert der neue
       Platz, bleibt die bisherige Planung erhalten. */
    const previous=state.pending;state.pending=[];
    const cost=towerCost(towerType),reject=message=>{state.pending=previous;placementCache.key='';pulse(message)};
    if(state.credits<cost){reject(`${cost-state.credits} ENERGIE FEHLEN`);return}
    if(obstacleAt(gx,gy)){reject('GELÄNDE BLOCKIERT');return}
    if(occupied(gx,gy)||spawnPointAt(gx,gy)||baseReserved(gx,gy)){reject('BAUPLATZ BLOCKIERT');return}
    if(allSpawnRoutes({x:gx,y:gy}).some(path=>!path)){reject('EINE ANGRIFFSLINIE WÄRE BLOCKIERT');return}
    state.pending=[{x:gx,y:gy,type:towerType,cost}];placementCache.key='';sound('build');uiSnapshot='';updateSelectionPanel();updateUI();pulse(`${type.name} · ${cost} E · MIT ✓ BAUEN`)
  }
  function updatePaths(){if(state.testMode){rebuildPathCache();return}state.paths=allSpawnRoutes();state.path=state.paths[0];placementCache.key='';state.enemies.forEach(e=>{if(enemyTypes[e.kind].direct)return;const path=state.paths[e.spawnLane]||state.path;e.path=path;e.pi=nearestPathIndex(e,path)});rebuildPathCache()}
  function nearestPathIndex(e,p){let best=0,dist=1e9;p.forEach((n,i)=>{const c=cellCenter(n),d=(c.x-e.x)**2+(c.y-e.y)**2;if(d<dist){dist=d;best=i}});return Math.min(best+1,p.length-1)}
  /* Offenes Tuning-Panel haelt die Zeit an, genau wie der Baumodus. Sonst muesste
     man mitten in einer laufenden Welle aufruesten. Im Arsenal-Test nicht, dort
     wuerde das Pausieren die laufende Messung verfaelschen. */
  function tuningPaused(){return !!selectedTowerId&&!state.testMode&&!!$('#selectionSection')?.open}
  function buildModePaused(){return state.started&&!state.over&&(!!state.buildPhase||tuningPaused())}
  function activeSpawnLane(wave,maxWaves,laneCount){if(laneCount<=1)return 0;const progress=Math.max(0,wave-1)/Math.max(1,maxWaves);return Math.min(laneCount-1,Math.floor(progress*laneCount))}
  function startWave(){if(!state.started||state.waveActive||state.over||buildModePaused()||(!state.endless&&state.wave>=state.maxWaves))return;const mission=activeMission(),difficulty=GAME_BALANCE.levelDifficulty[mission.level]||1;state.intermission=0;state.wave++;state.waveActive=true;state.waveSpawned=0;const previousLane=state.spawnLaneCursor;state.spawnLaneCursor=activeSpawnLane(state.wave,state.maxWaves,state.paths.length);if(state.spawnLaneCursor!==previousLane)rebuildPathCache();state.waveKills=0;state.waveBreaches=0;if(state.testMode)for(const station of state.testStations){station.depotHp=station.maxDepotHp;station.hit=0}state.waveSpawnTotal=state.testMode?GAME_BALANCE.arsenalTest.batchesPerWave:Math.max(5,Math.round((6+state.wave)*mission.count*difficulty));state.spawnLeft=state.waveSpawnTotal;state.spawnTimer=0;sound('wave');pulse(state.testMode?`ARSENAL-TEST · ${arsenalTuningLabel()} · ${arsenalEnemyLabel()} · WELLE ${state.wave}`:`WELLE ${state.wave} / ${state.maxWaves}`);updateUI()}
  /* Der Gegnermix kommt aus GAME_BALANCE.enemyPattern. Die Pruefreihenfolge ist
     fest, der erste Treffer gewinnt — deshalb verdraengen seltene Spezialtypen
     die haeufigen und nicht umgekehrt. */
  function enemyKindForSpawn(index){if(state.testMode)return arsenalEnemyKindForBatch(index);
    const level=activeMission().level,pattern=GAME_BALANCE.enemyPattern[level]||GAME_BALANCE.enemyPattern.LEICHT,total=state.waveSpawnTotal;
    if(state.wave===state.maxWaves&&!state.endless){for(let k=0;k<pattern.eliteFinal;k++)if(index===total-1-k)return'elite';
      if(index===Math.floor(total*.55)||index===Math.floor(total*.8))return'elite'}
    if(state.wave>=Math.ceil(state.maxWaves*.72)&&(state.endless||state.wave<state.maxWaves))for(let k=0;k<pattern.eliteLate;k++)if(index===Math.floor(total*(.6+.16*k)))return'elite';
    if(pattern.phaser&&state.wave>=4&&index%pattern.phaser===3)return'phaser';
    if(state.wave>=5&&index%pattern.splitter===2)return'splitter';
    if(state.wave>=4&&index%pattern.armored===4%pattern.armored)return'armored';
    if(state.wave>=3&&index%pattern.regenerator===1)return'regenerator';
    if(state.wave>=2&&index%pattern.runner===2%pattern.runner)return'runner';
    return'shard'}
  function createEnemy(kind,options={}){const def=enemyTypes[kind],mission=activeMission(),difficulty=GAME_BALANCE.levelDifficulty[mission.level]||1,mods=activePlanet().mods,p=options.path||state.path,hasSpawnIndex=Number.isFinite(options.spawnIndex),spawnIndex=hasSpawnIndex?clamp(Math.floor(options.spawnIndex),0,Math.max(0,p.length-2)):0,c=cellCenter(p[spawnIndex]||p[0]||spawn),wave=options.wave||state.wave,lateScale=1+Math.max(0,wave-GAME_BALANCE.enemyHpLateStart)*GAME_BALANCE.enemyHpLateStep,worldHp=GAME_BALANCE.worldHpRamp[activePlanetId]??1,maxHp=(GAME_BALANCE.enemyBaseHp+wave*GAME_BALANCE.enemyHpPerWave)*lateScale*def.hp*mission.hp*difficulty*worldHp,maxShield=maxHp*(def.shield||0),pace=GAME_BALANCE.gamePace,enemySpeed=(pace.enemyBaseSpeed+wave*pace.enemySpeedPerWave)*def.speed*mission.speed*mods.enemySpeed*Math.sqrt(difficulty);return{id:state.nextEnemyId++,x:options.x??c.x,y:options.y??c.y,angle:options.angle??0,path:p,pi:options.pi??Math.min(spawnIndex+1,p.length-1),spawnLane:options.spawnLane??0,hp:maxHp,maxHp,speed:enemySpeed,baseSpeed:enemySpeed,r:def.r,armor:def.armor||0,regen:(def.regen||0)*mods.regen,regenDelay:0,split:def.split||0,bounty:Math.max(1,Math.round(def.bounty*mission.bounty*mods.bounty)),breach:def.breach,kind,elite:kind==='elite',name:def.name,trait:def.short,color:def.color,shield:maxShield,maxShield,hit:0,phase:Math.random()*6,lastHitTowerId:null,xpAwarded:false}}
  /* Jeder Pruefstand bekommt einen Gegner, den seine Waffe ueberhaupt treffen
     kann. Passt der gewaehlte Typ nicht zum Zielprofil, springt die Station auf
     einen Ersatzgegner um, sonst waere die Messung immer null. */
  function arsenalFallbackKind(type){return types[type]?.targets==='air'?'phaser':'shard'}
  function arsenalKindForStation(stationType,kind){return canHit(stationType,{kind})?kind:arsenalFallbackKind(stationType)}
  function spawnArsenalTestBatch(){const test=GAME_BALANCE.arsenalTest,kind=arsenalEnemyKindForBatch(state.waveSpawned);for(const station of state.testStations){const start=cellCenter(station.spawn),enemy=createEnemy(arsenalKindForStation(station.type,kind),{path:station.path,x:start.x,y:start.y,pi:1,wave:test.enemyWave});enemy.testTarget=true;enemy.testTowerId=station.towerId;enemy.testStation=station.index;state.enemies.push(enemy)}}
  function spawnEnemy(){if(state.testMode&&state.testStations.length){spawnArsenalTestBatch();state.waveSpawned++;return 1}const lane=state.spawnLaneCursor,path=state.paths[lane]||state.path,kind=enemyKindForSpawn(state.waveSpawned++),route=enemyTypes[kind].direct?[path[0],{x:base.x,y:base.y}]:path;state.enemies.push(createEnemy(kind,{path:route,spawnLane:lane}));return 1}
  function spawnSplitChildren(e){for(let i=0;i<e.split;i++){const side=i?1:-1,child=createEnemy('splinter',{x:e.x+side*7,y:e.y+side*3,path:e.path,pi:e.pi,spawnLane:e.spawnLane});child.phase=e.phase+i;if(e.testTarget){child.testTarget=true;child.testTowerId=e.testTowerId;child.testStation=e.testStation}state.enemies.push(child)}sound('split');pulse('BRUTKERN TEILT SICH')}
  function weaponMuzzle(t,barrelIndex=null){
    const c=cellCenter(t),angle=t.angle||0,dx=Math.cos(angle),dy=Math.sin(angle),nx=-dy,ny=dx;
    if(t.type==='rocket'){const offset=[-10,0,10][barrelIndex??t.salvo%3];return{x:c.x+dx*29+nx*offset,y:c.y+dy*29+ny*offset,z:45}}
    if(t.type==='mortar')return{x:c.x+dx*24,y:c.y+dy*24,z:55};
    if(t.type==='laser'){const side=t.salvo++%2?1:-1;return{x:c.x+dx*36+nx*side*8,y:c.y+dy*36+ny*side*8,z:43}}
    if(t.type==='cryo')return{x:c.x+dx*47,y:c.y+dy*47,z:48};
    if(t.type==='gatling')return{x:c.x+dx*39,y:c.y+dy*39,z:43};
    if(t.type==='rail')return{x:c.x+dx*52,y:c.y+dy*52,z:39};
    if(t.type==='disruptor')return{x:c.x,y:c.y,z:46};
    return{x:c.x,y:c.y,z:40};
  }
  function railShot(t,target){
    const c=cellCenter(t),muzzle=weaponMuzzle(t),ty=towerStats(t),angle=Math.atan2(target.y-c.y,target.x-c.x),dx=Math.cos(angle),dy=Math.sin(angle);
    const hits=state.enemies.map(e=>{const ex=e.x-c.x,ey=e.y-c.y;return{e,along:ex*dx+ey*dy,side:Math.abs(ex*dy-ey*dx)}}).filter(h=>h.e.hp>0&&enemyBelongsToTower(h.e,t.id)&&h.along>0&&h.along<=ty.range&&h.side<h.e.r+9).sort((a,b)=>a.along-b.along).slice(0,ty.pierce);
    hits.forEach((h,i)=>damage(h.e,ty.damage*(1-i*.08),'rail',t.id));
    state.shots.push({kind:'rail',x:muzzle.x,y:muzzle.y,z:muzzle.z,tx:c.x+dx*ty.range,ty:c.y+dy*ty.range,hits:hits.map(h=>({x:h.e.x,y:h.e.y})),life:.22,max:.22,color:types.rail.color,towerId:t.id});burst(muzzle.x,muzzle.y,types.rail.color,8,120);sound('rail',muzzle.x);
  }
  const RAIL_BEAM_ON=1,RAIL_BEAM_PAUSE=1,RAIL_TICK=.1;
  // Dauerstrahl-Puls der Railgun: durchgehender Strahl mit Damage-over-Time
  // entlang der Durchschlagslinie, waehrend t.beamTime laeuft.
  function railBeamTick(t,target,stats,dt){
    const c=cellCenter(t),dx=Math.cos(t.angle),dy=Math.sin(t.angle);
    const hits=state.enemies.map(e=>{const ex=e.x-c.x,ey=e.y-c.y;return{e,along:ex*dx+ey*dy,side:Math.abs(ex*dy-ey*dx)}}).filter(h=>h.e.hp>0&&enemyBelongsToTower(h.e,t.id)&&h.along>0&&h.along<=stats.range&&h.side<h.e.r+9).sort((a,b)=>a.along-b.along).slice(0,stats.pierce);
    t.beamAccum=(t.beamAccum||0)+dt;if(t.beamAccum>=RAIL_TICK){const chunk=stats.damage*t.beamAccum;hits.forEach((h,i)=>damage(h.e,chunk*(1-i*.08),'rail',t.id));t.beamAccum=0}
    t.beamEndX=c.x+dx*stats.range;t.beamEndY=c.y+dy*stats.range;t.beamHits=hits.map(h=>({x:h.e.x,y:h.e.y}))
  }
  function beamShot(t,target){const muzzle=weaponMuzzle(t),base=types[t.type],stats=towerStats(t),hit=[];let current=target;for(let i=0;i<Math.max(1,stats.chain);i++){if(!current)break;hit.push(current);const amount=stats.damage*Math.pow(.72,i)*(current.shield>0?stats.shieldBonus:1);damage(current,amount,t.type,t.id);if(stats.slow){current.slowFactor=Math.min(current.slowFactor||1,stats.slow);current.slowTimer=Math.max(current.slowTimer||0,stats.slowTime)}const next=state.enemies.filter(e=>e.hp>0&&enemyBelongsToTower(e,t.id)&&canHit(t.type,e)&&!hit.includes(e)&&Math.hypot(e.x-current.x,e.y-current.y)<105).sort((a,b)=>Math.hypot(a.x-current.x,a.y-current.y)-Math.hypot(b.x-current.x,b.y-current.y))[0];current=next}const beamKind=t.type==='cryo'?'lightning':'rail';let from=muzzle;hit.forEach(enemy=>{state.shots.push({kind:beamKind,x:from.x,y:from.y,z:from.z??20,tx:enemy.x,ty:enemy.y,hits:[],life:t.type==='gatling'?.07:.15,max:t.type==='gatling'?.07:.15,color:base.color,towerId:t.id});from={x:enemy.x,y:enemy.y,z:20}});burst(muzzle.x,muzzle.y,base.color,4,70);if(t.type==='gatling')ejectCasings(t);sound(t.type,muzzle.x)}
  function ejectCasings(t){if(state.particles.length>170)return;const c=cellCenter(t),angle=t.angle||0,dx=Math.cos(angle),dy=Math.sin(angle),nx=-dy,ny=dx,side=(t.salvo=(t.salvo||0)+1)%2?1:-1,rx=c.x-dx*10,ry=c.y-dy*10;state.particles.push({x:rx+nx*side*6,y:ry+ny*side*6,z:40,vx:nx*side*46-dx*18+(Math.random()-.5)*18,vy:ny*side*46-dy*18+(Math.random()-.5)*18,vz:52+Math.random()*28,life:.5+Math.random()*.22,max:.72,size:2,color:'#d9b45a'})}
  function waveShot(t,target){const c=cellCenter(t),stats=towerStats(t),angle=Math.atan2(target.y-c.y,target.x-c.x);t.angle=angle;t.pulse=1;state.shots.push({kind:'wave',ox:c.x,oy:c.y,angle,r:16,maxR:stats.range,speed:440,half:.5,damage:stats.damage,shieldBonus:stats.shieldBonus,hitIds:new Set(),life:1.3,max:1.3,color:types.disruptor.color,towerId:t.id});burst(c.x,c.y,types.disruptor.color,6,80);sound('wave',c.x)}
  function rocketVolleyTargets(t,primary,rangeSq,limit){
    const c=cellCenter(t),candidates=state.enemies.filter(e=>{if(e.hp<=0||e.reached||!enemyBelongsToTower(e,t.id)||!canHit(t.type,e))return false;const dx=e.x-c.x,dy=e.y-c.y;return dx*dx+dy*dy<=rangeSq});
    candidates.sort((a,b)=>a===primary?-1:b===primary?1:(b.pi||0)-(a.pi||0)||Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y));
    return candidates.slice(0,limit);
  }
  function shoot(t,target){
    const tp=cellCenter(t),base=types[t.type],ty=towerStats(t);t.angle=Math.atan2(target.y-tp.y,target.x-tp.x);t.pulse=1;
    if(t.type==='rail')railShot(t,target);
    else if(t.type==='disruptor')waveShot(t,target);
    else if(base.beam)beamShot(t,target);
    else if(t.type==='rocket'){
      const missileCount=Math.max(1,Math.round(ty.missiles)),targets=rocketVolleyTargets(t,target,ty.range*ty.range,missileCount),barrels=targets.length===1?[1]:targets.length===2?[0,2]:[0,1,2],salvoId=`${t.id}:${t.salvo++}`,damagePerRocket=ty.damage/missileCount;
      targets.forEach((rocketTarget,index)=>{const barrel=barrels[index],muzzle=weaponMuzzle(t,barrel),bend=[-.44,0,.44][barrel];state.shots.push({kind:'rocket',x:muzzle.x,y:muzzle.y,z:muzzle.z,angle:t.angle+bend,speed:68,target:rocketTarget,damage:damagePerRocket,splash:ty.splash,turn:ty.turn,life:4.5,max:4.5,fly:0,trail:[],trailTick:0,color:base.color,towerId:t.id,salvoId,salvoSize:missileCount});burst(muzzle.x,muzzle.y,base.color,4,95)});sound('rocket',tp.x)
    }
    else{const muzzle=weaponMuzzle(t);state.shots.push({kind:'orb',x:muzzle.x,y:muzzle.y,z:muzzle.z,ox:muzzle.x,oy:muzzle.y,muzzleZ:muzzle.z,minR:ty.minRange||0,target,damage:ty.damage,splash:ty.splash,life:2.4,max:2.4,fly:0,color:base.color,towerId:t.id});burst(muzzle.x,muzzle.y,base.color,6,85);sound('mortar',muzzle.x)}
  }
  function burst(x,y,color,count=7,power=100){const busy=state.enemies.length+state.drones.length+state.shots.length,pressure=renderDetail===0?.35:renderDetail===1?.65:1,cap=Math.round((busy>30?110:busy>18?145:180)*pressure),available=Math.max(0,cap-state.particles.length),density=(busy>30?.55:busy>18?.75:1)*pressure;for(let i=0;i<Math.min(Math.ceil(count*density),available);i++)state.particles.push({x,y,z:10+Math.random()*18,vx:(Math.random()-.5)*power,vy:(Math.random()-.5)*power,vz:35+Math.random()*70,life:.45+Math.random()*.45,max:.9,size:1.5+Math.random()*3,color})}
  function damage(e,n,source='energy',towerId=null){
    let remaining=n,absorbed=0;if(e.shield>0&&source!=='rail'){absorbed=Math.min(e.shield,remaining);e.shield-=absorbed;remaining-=absorbed}const potential=remaining>0?Math.max(1,remaining*(source==='rail'?1:1-(e.armor||0))):0,dealt=Math.min(Math.max(0,e.hp),potential);e.hp-=dealt;e.hit=.13;e.regenDelay=2.7;if(towerId){e.lastHitTowerId=towerId;const tower=state.towers.find(t=>t.id===towerId);if(tower)tower.damageDealt+=dealt+absorbed}
    const shieldOnly=absorbed>0&&!dealt,feedbackColor=shieldOnly?'#e5a4ff':source==='rail'?'#dfffff':source==='rocket'?'#ffd36a':'#a7f7ff',impactCount=source==='drone'?(state.drones.length>=18?1:2):5;burst(e.x,e.y,shieldOnly?'#d78cff':source==='rocket'?'#ffd36a':'#a7f7ff',impactCount,source==='drone'?65:100);
    const amount=dealt?Math.max(1,Math.round(dealt)):0,existing=e.damageFloater;if(existing&&existing.life>0&&existing.shieldOnly===shieldOnly){existing.x=e.x;existing.y=e.y;existing.z=e.elite?70:48;existing.life=existing.max=.65;if(!shieldOnly){existing.amount+=amount;existing.text=`${existing.amount}`}}else if(state.floaters.length<42){const floater={kind:'damage',enemyId:e.id,x:e.x,y:e.y,z:e.elite?70:48,life:.65,max:.65,amount,shieldOnly,text:shieldOnly?'SCHILD':`${amount}`,color:feedbackColor};state.floaters.push(floater);e.damageFloater=floater}return dealt
  }
  function pushPriorityFloater(floater){if(state.floaters.length>=42){const damageIndex=state.floaters.findIndex(item=>item.kind==='damage');state.floaters.splice(damageIndex>=0?damageIndex:0,1)}state.floaters.push(floater)}
  function awardEnemyDefeat(e){if(e.xpAwarded)return 0;e.xpAwarded=true;
    /* Der Arsenal-Test ist eine Messbank, kein Einsatz: Er vergibt kein XP. */
    if(state.testMode){state.kills++;state.waveKills++;const tester=state.towers.find(t=>t.id===e.lastHitTowerId);if(tester)tester.kills=(tester.kills||0)+1;return 0}
    const earnedXp=Math.max(0,Math.round(GAME_BALANCE.experiencePerEnemy[e.kind]??2));progress.xp+=earnedXp;state.kills++;state.waveKills++;const killer=state.towers.find(t=>t.id===e.lastHitTowerId);if(killer){killer.kills=(killer.kills||0)+1;killer.xpEarned=(killer.xpEarned||0)+earnedXp}pushPriorityFloater({kind:'xp',x:e.x,y:e.y,z:e.elite?82:61,life:.9,max:.9,text:`+${earnedXp} XP`,color:'#ffe09a'});return earnedXp}
  function breachBase(e){if(e.reached)return;e.reached=true;if(selectedEnemyId===e.id)selectedEnemyId=null;const loss=e.breach||8;if(e.testTarget){const station=state.testStations[e.testStation];if(station){station.depotHp=Math.max(0,station.depotHp-loss);station.depotDamage+=loss;station.leaks++;station.hit=1;state.breaches++;state.waveBreaches++;const c=cellCenter(station.depot);state.shocks.push({x:c.x,y:c.y,life:.48,max:.48,color:'#e08369'});if(state.floaters.length<42)state.floaters.push({x:c.x,y:c.y,z:48,life:.75,max:.75,text:`LAGER −${loss}`,color:'#efae85'});burst(c.x,c.y,'#c97c62',8,80)}return}state.integrity=Math.max(0,state.integrity-loss);state.breaches++;state.waveBreaches++;state.baseFlash=1;state.shake=Math.max(state.shake,11);const c=cellCenter(base);state.shocks.push({x:c.x,y:c.y,life:.9,max:.9,color:'#ff665d'});burst(c.x,c.y,'#ff8a62',32,245);state.floaters.push({x:c.x,y:c.y,z:92,life:1.15,max:1.15,text:`−${loss}% INTEGRITÄT`,color:'#ff8478'});sound('breach');pulse(`DURCHBRUCH · −${loss}%`);if(state.integrity<=0)end(false)}
  function moveToward(unit,x,y,dt,speed){const dx=x-unit.x,dy=y-unit.y,d=Math.hypot(dx,dy)||1,m=Math.min(d,speed*dt);unit.x+=dx/d*m;unit.y+=dy/d*m;unit.angle=Math.atan2(dy,dx);return d}
  function enemyBelongsToTower(e,towerId){return !state.testMode||!!state.testTowerIds?.has(towerId)&&e.testTarget&&e.testTowerId===towerId}
  /* Luftziele sind genau die Gegner, die Mauern und Routen ignorieren. Waffen ohne
     targets-Profil treffen beides. Jede Trefferpruefung laeuft ueber canHit. */
  function enemyIsAir(e){return !!enemyTypes[e.kind]?.direct}
  function canHit(type,e){const profile=types[type]?.targets;return !profile||(profile==='air')===enemyIsAir(e)}
  function targetLabel(type){const profile=types[type]?.targets;return profile==='air'?'NUR LUFT':profile==='ground'?'NUR BODEN':'LUFT + BODEN'}
  function targetGlyph(type){const profile=types[type]?.targets;return profile==='air'?'▲':profile==='ground'?'▬':'◈'}
  function enemyThreatDistance(e){if(enemyTypes[e.kind].direct){const c=cellCenter(base);return Math.hypot(c.x-e.x,c.y-e.y)}const next=cellCenter(e.path[Math.min(e.pi,e.path.length-1)]);return(e.path.length-1-e.pi)*CELL+Math.hypot(next.x-e.x,next.y-e.y)}
  function acquireDroneTarget(home,rangeSq,towerId=null,minRangeSq=0,type=null){let target=null,best=Infinity;for(const e of state.enemies){if(e.hp<=0||e.reached||!enemyBelongsToTower(e,towerId))continue;if(type&&!canHit(type,e))continue;const dx=e.x-home.x,dy=e.y-home.y,distSq=dx*dx+dy*dy;if(distSq>rangeSq||distSq<minRangeSq)continue;const threat=enemyThreatDistance(e);if(threat<best){best=threat;target=e}}return target}
  const droneContextScratch=new Map();
  function droneTargetForContext(context){if(!context.targetScanned){context.target=acquireDroneTarget(context.home,context.rangeSq,context.towerId,0,'drone');context.targetScanned=true}return context.target}
  function updateDrones(dt){
    droneContextScratch.clear();for(const d of state.drones){let context=droneContextScratch.get(d.home.id);if(!context){const home=cellCenter(d.home),stats=towerStats(d.home);context={home,stats,rangeSq:stats.range*stats.range,towerId:d.home.id,targetScanned:false,target:null};droneContextScratch.set(d.home.id,context)}const home=context.home,stats=context.stats;d.attackCool-=dt;d.rearm-=dt;
      if(d.mode==='dock'){const a=sceneTime*1.9+d.index*Math.PI*2/stats.drones;d.x=home.x+Math.cos(a)*28;d.y=home.y+Math.sin(a)*17;d.z=43+Math.sin(sceneTime*3.4+d.index)*5;d.bank=Math.sin(a)*.2;if(d.rearm<=0&&(d.target=droneTargetForContext(context))){d.mode='chase';d.fuel=6.3;d.rearm=0}}
      else if(d.mode==='chase'){if(!d.target||d.target.hp<=0||d.target.reached){d.target=droneTargetForContext(context);if(!d.target)d.mode='return'}if(d.mode==='chase'){d.fuel-=dt;const e=d.target,node=e.path[e.pi],destX=node.x*CELL+CELL/2,destY=node.y*CELL+CELL/2,vx=destX-e.x,vy=destY-e.y,vl=Math.hypot(vx,vy)||1,side=(d.index%2?1:-1)*(1+Math.floor(d.index/2)*.35),tx=e.x-vx/vl*24-vy/vl*side*15,ty=e.y-vy/vl*24+vx/vl*side*15,oldAngle=d.angle;moveToward(d,tx,ty,dt,220+stats.rateLevel*14);d.bank=Math.max(-.6,Math.min(.6,angleDelta(oldAngle,d.angle)*2.5));d.z=49+Math.sin(sceneTime*6+d.index)*7;const targetDx=d.x-e.x,targetDy=d.y-e.y;if(targetDx*targetDx+targetDy*targetDy<14884&&d.attackCool<=0){const nx=-Math.sin(d.angle),ny=Math.cos(d.angle);state.shots.push({kind:'droneBolt',x:d.x,y:d.y,z:d.z,target:e,damage:stats.damage*1.12,towerId:d.home.id,life:.75,max:.75,fly:0,color:types.drone.color,px:d.x,py:d.y,barrelNx:nx,barrelNy:ny,barrelOffset:4});d.attackCool=stats.rate;sound('drone',d.x)}const homeDx=d.x-home.x,homeDy=d.y-home.y,maxDistance=stats.range*1.65;if(d.fuel<=0||homeDx*homeDx+homeDy*homeDy>maxDistance*maxDistance)d.mode='return'}}
      else if(d.mode==='return'){d.target=null;d.bank*=.9;d.z+=Math.sign(43-d.z)*Math.min(Math.abs(43-d.z),50*dt);if(moveToward(d,home.x,home.y,dt,260)<12){d.mode='dock';d.rearm=.8+d.index*.16}}
    }
  }
  function angleDelta(from,to){let d=(to-from+Math.PI)%(Math.PI*2)-Math.PI;return d<-Math.PI?d+Math.PI*2:d}
  function explode(s,source){const heavyBlast=s.damage>=50;state.enemies.forEach(e=>{const d=Math.hypot(e.x-s.x,e.y-s.y);if(e.hp>0&&enemyBelongsToTower(e,s.towerId)&&canHit(source,e)&&d<s.splash){damage(e,s.damage*(.34+.66*(1-d/s.splash)),source,s.towerId);if(heavyBlast)e.wobble=Math.max(e.wobble||0,.32*(1-d/s.splash*.5))}});state.shocks.push({x:s.x,y:s.y,life:.72,max:.72,color:s.color});state.impactFlash=.22;state.impactColor=s.color;const impactParticles=source==='rocket'?(s.salvoSize>1?18:38):31;burst(s.x,s.y,s.color,impactParticles,source==='rocket'?260:225);sound(source==='rocket'?'rocketImpact':'mortarImpact',s.x)}
  function nearestEnemyTarget(x,y,rangeSq,towerId=null,excludedIds=null,type=null){let target=null,best=rangeSq;for(const e of state.enemies){if(e.hp<=0||e.reached||excludedIds?.has(e.id)||!enemyBelongsToTower(e,towerId))continue;if(type&&!canHit(type,e))continue;const dx=e.x-x,dy=e.y-y,distance=dx*dx+dy*dy;if(distance<best){best=distance;target=e}}return target}
  function retargetRocket(s){const claimed=new Set();for(const other of state.shots)if(other!==s&&other.kind==='rocket'&&other.life>0&&other.salvoId===s.salvoId&&other.target&&other.target.hp>0&&!other.target.reached)claimed.add(other.target.id);return nearestEnemyTarget(s.x,s.y,180*180,s.towerId,claimed,'rocket')}
  function compactAlive(items){let write=0;for(let read=0;read<items.length;read++){const item=items[read];if(item.life>0)items[write++]=item}items.length=write}
  function updateShots(dt){
    for(const s of state.shots){s.life-=dt;s.fly=(s.fly||0)+dt;if(s.kind==='rail'||s.kind==='lightning')continue;
      if(s.kind==='wave'){s.r+=s.speed*dt;for(const e of state.enemies){if(e.hp<=0||e.reached||!enemyBelongsToTower(e,s.towerId)||s.hitIds.has(e.id)||!canHit('disruptor',e))continue;const dx=e.x-s.ox,dy=e.y-s.oy;if(dx*dx+dy*dy>s.r*s.r)continue;if(Math.abs(angleDelta(s.angle,Math.atan2(dy,dx)))>s.half)continue;s.hitIds.add(e.id);damage(e,s.damage*(e.shield>0?s.shieldBonus:1),'disruptor',s.towerId);e.wobble=Math.max(e.wobble||0,.3)}if(s.r>=s.maxR)s.life=0;continue}
      if(s.kind==='rocket'){
        if(!s.target||s.target.hp<=0||s.target.reached)s.target=retargetRocket(s);let targetDistance=0;if(s.target){const targetDx=s.target.x-s.x,targetDy=s.target.y-s.y;targetDistance=Math.sqrt(targetDx*targetDx+targetDy*targetDy);const desired=Math.atan2(targetDy,targetDx),turn=s.turn*(.55+Math.min(1,s.fly*.7))*dt;s.angle+=Math.max(-turn,Math.min(turn,angleDelta(s.angle,desired)))}s.speed=Math.min(245,s.speed+105*dt);s.x+=Math.cos(s.angle)*s.speed*dt;s.y+=Math.sin(s.angle)*s.speed*dt;s.trailTick+=dt;if(s.target){const dx=s.target.x-s.x,dy=s.target.y-s.y;targetDistance=Math.sqrt(dx*dx+dy*dy)}s.z=s.target?20+Math.min(55,targetDistance*.24):48;if(s.trailTick>.025){s.trail.push({x:s.x,y:s.y,z:s.z});s.trailTick=0;if(s.trail.length>26)s.trail.shift()}if(s.target&&targetDistance<s.target.r+10){explode(s,'rocket');s.life=0}else if(s.life<=0){explode(s,'rocket');s.life=0}continue;
      }
      if(!s.target||s.target.hp<=0||s.target.reached){s.life=0;continue}s.px=s.x;s.py=s.y;const dx=s.target.x-s.x,dy=s.target.y-s.y,d=Math.hypot(dx,dy),v=s.kind==='orb'?270:620;if(d<v*dt){if(s.kind==='orb')explode({...s,x:s.target.x,y:s.target.y},'mortar');else damage(s.target,s.damage,'drone',s.towerId);s.life=0}else{s.x+=dx/d*v*dt;s.y+=dy/d*v*dt}
    }compactAlive(state.shots);
  }
  function update(dt){if(!state.started||state.over||buildModePaused())return;updateMusic(dt);dt*=speed;if(state.testMode&&state.waveActive)state.testElapsed+=dt;for(const station of state.testStations)station.hit=Math.max(0,(station.hit||0)-dt*2.8);state.baseFlash=Math.max(0,state.baseFlash-dt*1.8);state.impactFlash=Math.max(0,state.impactFlash-dt*2.8);if(!state.waveActive&&state.intermission>0){state.intermission=Math.max(0,state.intermission-dt);if(state.intermission<=0)startWave()}
    if(state.waveActive&&state.spawnLeft){state.spawnTimer-=dt;if(state.spawnTimer<=0){const spawned=spawnEnemy(),pace=GAME_BALANCE.gamePace;state.spawnLeft=Math.max(0,state.spawnLeft-spawned);state.spawnTimer=state.testMode?GAME_BALANCE.arsenalTest.spawnInterval:Math.max(pace.minimumSpawnInterval,(pace.spawnIntervalBase-state.wave*pace.spawnIntervalWaveStep)*activeMission().spawn)*spawned}}
    for(const e of state.enemies){e.hit=Math.max(0,e.hit-dt);e.wobble=Math.max(0,(e.wobble||0)-dt*1.1);e.regenDelay=Math.max(0,e.regenDelay-dt);e.slowTimer=Math.max(0,(e.slowTimer||0)-dt);const wallSlowed=!enemyTypes[e.kind].direct&&state.wallSlowCells.has(key(Math.floor(e.x/CELL),Math.floor(e.y/CELL))),weaponSlow=e.slowTimer>0?(e.slowFactor||1):1;e.slowed=wallSlowed||weaponSlow<1;e.speed=e.baseSpeed*(wallSlowed?activePlanet().mods.wallSlow:1)*weaponSlow;if(e.regen&&e.regenDelay<=0&&e.hp>0&&e.hp<e.maxHp)e.hp=Math.min(e.maxHp,e.hp+e.maxHp*e.regen*dt);if(e.hp<=0)continue;const dest=cellCenter(e.path[e.pi]);let dx=dest.x-e.x,dy=dest.y-e.y,d=Math.hypot(dx,dy);if(d<3){if(e.pi>=e.path.length-1){breachBase(e);if(state.over)break;continue}e.pi++;continue}const desiredAngle=Math.atan2(dy,dx);e.angle+=angleDelta(e.angle||0,desiredAngle)*Math.min(1,dt*7);const mv=Math.min(d,e.speed*dt);e.x+=dx/d*mv;e.y+=dy/d*mv;e.phase+=dt*(e.kind==='runner'||e.kind==='splinter'?6:4)}
    const splitDeaths=[];let progressDirty=false;state.enemies=state.enemies.filter(e=>{if(e.reached)return false;if(e.hp<=0){if(selectedEnemyId===e.id)selectedEnemyId=null;state.credits+=e.bounty||14;awardEnemyDefeat(e);progressDirty=true;if(e.split)splitDeaths.push(e);state.cracks.push({x:e.x,y:e.y,life:3,seed:Math.random()*9});state.shocks.push({x:e.x,y:e.y,life:.55,max:.55,color:e.color});burst(e.x,e.y,e.color,e.elite?28:15,e.elite?210:145);sound('kill');return false}return true});if(progressDirty)saveProgress();splitDeaths.forEach(spawnSplitChildren);
    if(state.over){updateUI();return}
    for(const t of state.towers){t.pulse=Math.max(0,t.pulse-dt*4);if(t.type==='drone'||t.type==='wall'){t.cool-=dt;t.jam=0;continue}const c=cellCenter(t);
      if(t.type==='rail'){const stats=towerStats(t);t.jam=0;if(t.beamTime>0){t.beamTime-=dt;const target=acquireDroneTarget(c,stats.range*stats.range,t.id,0,t.type);if(target){t.angle=Math.atan2(target.y-c.y,target.x-c.x);t.pulse=1;railBeamTick(t,target,stats,dt)}else t.beamHits=[];if(t.beamTime<=0){t.cool=RAIL_BEAM_PAUSE;t.beamHits=null}continue}t.cool-=dt;const target=acquireDroneTarget(c,stats.range*stats.range,t.id,0,t.type);if(t.cool<=0&&target){t.beamTime=RAIL_BEAM_ON;t.beamAccum=0;t.angle=Math.atan2(target.y-c.y,target.x-c.x);sound('rail',c.x)}continue}
      let jam=0;for(const e of state.enemies){if(e.kind!=='splinter'||e.hp<=0)continue;const jx=e.x-c.x,jy=e.y-c.y;if(jx*jx+jy*jy<4900){jam++;if(jam>=2)break}}t.jam=jam;t.cool-=dt/(1+.4*jam);const stats=towerStats(t),minRangeSq=stats.minRange?stats.minRange*stats.minRange:0,target=acquireDroneTarget(c,stats.range*stats.range,t.id,minRangeSq,t.type);if(t.cool<=0&&target){shoot(t,target);t.cool=stats.rate}}
    updateDrones(dt);updateShots(dt);
    for(const p of state.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.z=Math.max(0,p.z+p.vz*dt);p.vz-=120*dt;p.life-=dt}compactAlive(state.particles);for(const f of state.floaters){f.z+=28*dt;f.life-=dt}compactAlive(state.floaters);for(const c of state.cracks)c.life-=dt;compactAlive(state.cracks);for(const s of state.shocks)s.life-=dt;compactAlive(state.shocks);state.shake=Math.max(0,state.shake-dt*16);
    if(state.waveActive&&!state.spawnLeft&&!state.enemies.length){state.waveActive=false;if(!state.endless&&state.wave===state.maxWaves)return end(true);const reward=state.testMode?GAME_BALANCE.arsenalTest.waveReward:Math.round((GAME_BALANCE.waveReward.base+state.wave*GAME_BALANCE.waveReward.perWave)*activeMission().bounty*activePlanet().mods.bounty*(activeMission().level==='FINAL'?.6:1));state.credits+=reward;state.intermission=state.testMode?GAME_BALANCE.arsenalTest.intermission:GAME_BALANCE.gamePace.normalIntermission;pulse(`${state.testMode?'TESTWELLE':'WELLE'} ${state.wave} GESÄUBERT · ${Math.ceil(state.intermission)}s BAUPAUSE`);updateSelectionPanel();updateUI();return}
    updateUI()
  }
  function end(win){if(state.over)return;if(win&&!state.testMode)markMissionCleared(activePlanetId,activeMissionIndex);state.over=true;state.result=win?'victory':'defeat';state.waveActive=false;state.intermission=0;state.spawnLeft=0;state.shake=0;state.baseFlash=win?0:.22;selected=null;selectedTowerId=null;selectedEnemyId=null;closeSelectionSection();sound(win?'victory':'defeat');const planet=activePlanet(),mission=activeMission(),waveGoal=state.endless?'∞':state.maxWaves,summary=`${state.kills} Feinde vernichtet · ${state.breaches} Durchbrüche · Welle ${state.wave}/${waveGoal}`;
    /* Nach einem Sieg kann eine Mission oder ein ganzer Planet neu offen sein.
       Ohne dieses Neuzeichnen blieben die Schalter gesperrt, bis man
       irgendeinen Planeten anklickt. */
    if(win&&!state.testMode)renderWorldPicker();
    setMissionScreen(true);$('#messageEyebrow').textContent=win?`${planet.code} // SEKTOR GESICHERT`:`${planet.code} // BASISSIGNAL VERLOREN`;$('#messageTitle').textContent=win?'MISSION ERFÜLLT':'ASTRO-BASIS GEFALLEN';$('#messageCopy').textContent=(win?`${mission.name} bleibt unter menschlicher Kontrolle. `:'Die Verteidigungslinie wurde durchbrochen. ')+summary;$('#startBtn').textContent='MISSION NEU STARTEN';uiSnapshot='';updateUI()}
  function buildTerrainCache(){
    const active=ctx;frameLightFromLeft=celestialLightPosition().x<W*.5;buildMaterialAssets();ctx=skyCtx;ctx.clearRect(0,0,W,H);drawSky();ctx=terrainCtx;ctx.clearRect(0,0,W,H);drawGround();drawHorizonRidges(activePlanet().theme);
    const staticScene=[...scenery.map(v=>({kind:'crystal',v,y:v.y})),...flora.map(v=>({kind:'flora',v,y:v.y})),...obstacles.map(v=>({kind:'obstacle',v,y:(v.y+.5)*CELL}))];
    staticScene.sort((a,b)=>a.y-b.y).forEach(item=>item.kind==='crystal'?drawCrystal(item.v):item.kind==='flora'?drawFlora(item.v,frameLightFromLeft):drawObstacle(item.v,frameLightFromLeft));
    drawTerrainGrade();ctx=active;terrainReady=true;
  }
  function rebuildPathCache(){
    const active=ctx;ctx=pathCtx;ctx.clearRect(0,0,W,H);drawPath();ctx=active;
  }
  function rebuildWallSystems(){const zones=new Set(),walls=state.towers.filter(t=>t.type==='wall');for(const wall of walls)for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++){const x=wall.x+dx,y=wall.y+dy;if(x>=0&&y>=ROW_TOP&&x<COLS&&y<ROWS)zones.add(key(x,y))}state.wallSlowCells=zones;const active=ctx;ctx=wallCtx;ctx.clearRect(0,0,W,H);walls.slice().sort((a,b)=>a.y-b.y).forEach(w=>{const pulseValue=w.pulse;w.pulse=0;drawTower(w);w.pulse=pulseValue});ctx=active}
  function buildGridCache(){const active=ctx;ctx=gridCtx;ctx.clearRect(0,0,W,H);drawBuildGrid();ctx=active;gridReady=true}
  function drawSelectionMarkers(){ctx.save();if(selectedTowerId){const t=state.towers.find(v=>v.id===selectedTowerId);if(t){const c=cellCenter(t),stats=towerStats(t),color=types[t.type].color;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.globalAlpha=.8;ellipseAt(project(c.x,c.y,3),27,10,'',color);if(stats.range){const segments=renderDetail===2?32:20;ctx.globalAlpha=.18;ctx.setLineDash([5,8]);ctx.beginPath();for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,p=project(c.x+Math.cos(a)*stats.range,c.y+Math.sin(a)*stats.range,2);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)}ctx.stroke();if(stats.minRange){ctx.globalAlpha=.22;ctx.beginPath();for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,p=project(c.x+Math.cos(a)*stats.minRange,c.y+Math.sin(a)*stats.minRange,2);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)}ctx.stroke()}ctx.setLineDash([])}}}if(selectedEnemyId){const e=state.enemies.find(v=>v.id===selectedEnemyId);if(e){const p=project(e.x,e.y,22),r=e.r+9+Math.sin(sceneTime*6)*2;ctx.strokeStyle='#ffdd83';ctx.globalAlpha=.9;ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<4;i++){const a=i*Math.PI/2;ctx.moveTo(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r*.55);ctx.lineTo(p.x+Math.cos(a)*(r+7),p.y+Math.sin(a)*(r+7)*.55)}ctx.stroke()}}ctx.restore()}
  const renderObjectScratch=[];
  function draw(){
    if(!terrainReady)buildTerrainCache();frameLightFromLeft=celestialLightPosition().x<W*.5;ctx.clearRect(0,0,W,H);ctx.drawImage(skyCanvas,0,0,W,H);drawCelestialBodies();drawAtmosphere();ctx.drawImage(terrainCanvas,0,0,W,H);ctx.drawImage(pathCanvas,0,0,W,H);ctx.drawImage(wallCanvas,0,0,W,H);ctx.save();
    if(state.shake)ctx.translate((Math.random()-.5)*state.shake,(Math.random()-.5)*state.shake);
    if(selected){if(!gridReady)buildGridCache();ctx.drawImage(gridCanvas,0,0,W,H)}state.cracks.forEach(drawCrack);state.shocks.forEach(drawShock);
    let objectCount=0,item;for(const v of state.towers)if(v.type!=='wall'){item=renderObjectScratch[objectCount]||(renderObjectScratch[objectCount]={});item.kind='tower';item.v=v;item.y=v.y*CELL+25;objectCount++}for(const v of state.drones){item=renderObjectScratch[objectCount]||(renderObjectScratch[objectCount]={});item.kind='drone';item.v=v;item.y=v.y;objectCount++}for(const v of state.enemies){item=renderObjectScratch[objectCount]||(renderObjectScratch[objectCount]={});item.kind='enemy';item.v=v;item.y=v.y;objectCount++}if(state.testMode)for(const v of state.testStations){item=renderObjectScratch[objectCount]||(renderObjectScratch[objectCount]={});item.kind='depot';item.v=v;item.y=v.depot.y*CELL+25;objectCount++}else{item=renderObjectScratch[objectCount]||(renderObjectScratch[objectCount]={});item.kind='base';item.v=null;item.y=base.y*CELL+25;objectCount++}renderObjectScratch.length=objectCount;
    renderObjectScratch.sort((a,b)=>a.y-b.y);for(const object of renderObjectScratch){if(object.kind==='tower')drawTower(object.v);else if(object.kind==='drone')drawDrone(object.v);else if(object.kind==='enemy')drawEnemy(object.v);else if(object.kind==='depot')drawTestDepot(object.v);else drawBase()}
    drawSelectionMarkers();drawShots();drawPending();drawGhost();drawWeather();ctx.restore();if(state.impactFlash>0){ctx.save();const impact=ctx.createRadialGradient(W/2,H/2,40,W/2,H/2,610);impact.addColorStop(0,state.impactColor+'00');impact.addColorStop(.55,state.impactColor+'12');impact.addColorStop(1,state.impactColor+'30');ctx.globalAlpha=state.impactFlash/.22;ctx.fillStyle=impact;ctx.fillRect(0,0,W,H);ctx.restore()}if(state.baseFlash>0){ctx.save();const warning=ctx.createRadialGradient(W/2,H/2,150,W/2,H/2,620);warning.addColorStop(0,'rgba(255,70,55,0)');warning.addColorStop(1,`rgba(180,25,20,${state.baseFlash*.55})`);ctx.fillStyle=warning;ctx.fillRect(0,0,W,H);ctx.strokeStyle=`rgba(255,105,90,${Math.min(1,state.baseFlash)})`;ctx.lineWidth=9;ctx.strokeRect(4,4,W-8,H-8);ctx.restore()}
  }
  function drawMoon(x,y,r,color,shade,seed=0){const glow=ctx.createRadialGradient(x,y,r*.35,x,y,r*1.75);glow.addColorStop(0,color+'52');glow.addColorStop(.55,color+'16');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(x-r*2,y-r*2,r*4,r*4);const body=ctx.createRadialGradient(x-r*.3,y-r*.35,r*.12,x,y,r);body.addColorStop(0,color);body.addColorStop(.72,color);body.addColorStop(1,shade);ctx.fillStyle=body;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.save();ctx.globalAlpha=.17;for(let i=0;i<7;i++){ctx.fillStyle=shade;ctx.beginPath();ctx.arc(x+(seeded(seed+i,101)-.5)*r*1.2,y+(seeded(seed+i,102)-.5)*r*1.2,1+seeded(seed+i,103)*r*.13,0,Math.PI*2);ctx.fill()}ctx.restore()}
  function celestialAnchor(slot=0){const tuning=GAME_BALANCE.celestialMotion,phase=seeded(worldSeed+slot*31,117)*Math.PI*2;return{x:170+seeded(worldSeed+slot*43,118)*660+Math.sin(sceneTime*tuning.speed+phase)*tuning.horizontalDrift,y:31+seeded(worldSeed+slot*47,119)*12+Math.sin(sceneTime*tuning.speed*.73+phase*1.7)*tuning.verticalDrift,phase}}
  function celestialLightPosition(anchor=celestialAnchor()){
    if(activePlanet().celestial==='twins'){
      const orbit=anchor.phase+sceneTime*GAME_BALANCE.celestialMotion.speed*.62;
      return{x:anchor.x+Math.cos(orbit)*34,y:anchor.y+Math.sin(orbit)*10};
    }
    return{x:anchor.x,y:anchor.y};
  }
  function drawCelestialBodies(){
    const planet=activePlanet(),anchor=celestialAnchor();ctx.save();ctx.beginPath();ctx.rect(0,0,W,CAMERA.horizon);ctx.clip();
    if(planet.celestial==='aurora')drawMoon(anchor.x,anchor.y,24,'#d9ecf3','#60798c',worldSeed+4);
    else if(planet.celestial==='twins'){const orbit=anchor.phase+sceneTime*GAME_BALANCE.celestialMotion.speed*.62,large={x:anchor.x+Math.cos(orbit)*34,y:anchor.y+Math.sin(orbit)*10},small={x:anchor.x-Math.cos(orbit)*52,y:anchor.y-Math.sin(orbit)*15};drawMoon(large.x,large.y,38,'#ffd9a1','#8f513f',worldSeed+9);drawMoon(small.x,small.y,19,'#f4b984','#754038',worldSeed+17);const haze=ctx.createRadialGradient(anchor.x,anchor.y,15,anchor.x,anchor.y,180);haze.addColorStop(0,'rgba(255,112,48,.18)');haze.addColorStop(1,'rgba(255,90,35,0)');ctx.fillStyle=haze;ctx.fillRect(anchor.x-190,anchor.y-100,380,200)}
    else if(planet.celestial==='rings'){ctx.save();ctx.translate(anchor.x,anchor.y);ctx.rotate(-.17+Math.sin(anchor.phase+sceneTime*.009)*.045);ctx.strokeStyle='rgba(194,255,210,.36)';ctx.lineWidth=11;ctx.beginPath();ctx.ellipse(0,0,105,24,0,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='rgba(99,209,169,.3)';ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,126,29,0,0,Math.PI*2);ctx.stroke();ctx.restore();drawMoon(anchor.x,anchor.y,48,'#85c6a0','#214b4c',worldSeed+27)}
    else{const halo=ctx.createRadialGradient(anchor.x,anchor.y,25,anchor.x,anchor.y,91);halo.addColorStop(0,'rgba(255,226,190,.9)');halo.addColorStop(.31,'rgba(162,111,255,.34)');halo.addColorStop(1,'rgba(96,60,180,0)');ctx.fillStyle=halo;ctx.fillRect(anchor.x-105,anchor.y-95,210,190);ctx.fillStyle='#030309';ctx.beginPath();ctx.arc(anchor.x,anchor.y,31,0,Math.PI*2);ctx.fill();ctx.save();ctx.globalAlpha=.16;ctx.strokeStyle='#c7a0ff';ctx.lineWidth=1.5;for(let i=0;i<7;i++){ctx.beginPath();ctx.ellipse(anchor.x,anchor.y,45+i*10,12+i*4,-.18,0,Math.PI*2);ctx.stroke()}ctx.restore()}
    ctx.restore()
  }
  function drawHorizonRidges(theme){
    const light=celestialLightPosition(),lightFromLeft=light.x<W*.5,lightEdgeOffset=lightFromLeft?-.85:.85;
    const smooth=value=>value*value*(3-2*value),noise=(x,scale,salt)=>{const cell=Math.floor(x/scale),t=smooth(x/scale-cell),a=seeded(worldSeed+cell,salt),b=seeded(worldSeed+cell+1,salt);return a+(b-a)*t};
    const trace=(points,bottom)=>{ctx.beginPath();ctx.moveTo(points[0].x,bottom);for(const point of points)ctx.lineTo(point.x,point.y);ctx.lineTo(points.at(-1).x,bottom);ctx.closePath()};
    const distant=[];for(let x=-24;x<=W+24;x+=8){const broad=noise(x,260,171)*16,ridge=(1-Math.abs(noise(x,118,172)*2-1))*13,detail=(noise(x,31,173)-.5)*4;distant.push({x,y:CAMERA.horizon+12-broad-ridge-detail})}
    const distantBottom=CAMERA.horizon+73,distantFill=ctx.createLinearGradient(0,CAMERA.horizon-20,0,distantBottom);distantFill.addColorStop(0,theme.ridge[0]+'d8');distantFill.addColorStop(.62,theme.ridge[0]+'c2');distantFill.addColorStop(.88,mixColors(theme.ridge[0],theme.ground[0],.45)+'70');distantFill.addColorStop(1,theme.ground[0]+'00');trace(distant,distantBottom);ctx.fillStyle=distantFill;ctx.fill();

    const slope=(apex,foot,count,seed,salt,roughness)=>{const points=[apex],shoulderIndex=2+Math.floor(seeded(seed,salt+3)*Math.max(1,count-3)),hasShoulder=seeded(seed,salt+4)>.36;for(let i=1;i<count;i++){const t=i/count,ease=Math.pow(t,.82+(seeded(seed+i,salt)-.5)*.18),wobble=(seeded(seed+i,salt+1)-.5)*roughness*Math.sin(Math.PI*t),shoulder=hasShoulder&&i===shoulderIndex?roughness*(.42+seeded(seed,salt+5)*.42):0;points.push({x:apex.x+(foot.x-apex.x)*ease+wobble,y:apex.y+(foot.y-apex.y)*t+(seeded(seed+i,salt+2)-.5)*roughness*.45-shoulder})}points.push(foot);return points};
    const ridgeLine=(mountain,seed)=>{const end={x:mountain.apex.x+mountain.width*(.025+(seeded(seed,181)-.5)*.12),y:mountain.baseY+2},points=[mountain.apex];for(let i=1;i<5;i++){const t=i/5;points.push({x:mountain.apex.x+(end.x-mountain.apex.x)*t+(seeded(seed+i,182)-.5)*mountain.width*.055*(1-t*.45),y:mountain.apex.y+mountain.height*t+(seeded(seed+i,183)-.5)*mountain.height*.075})}points.push(end);return points};
    const mountainPath=geometry=>{ctx.beginPath();ctx.moveTo(geometry.leftFoot.x,geometry.bottom);for(let i=geometry.left.length-1;i>=0;i--)ctx.lineTo(geometry.left[i].x,geometry.left[i].y);for(let i=1;i<geometry.right.length;i++)ctx.lineTo(geometry.right[i].x,geometry.right[i].y);ctx.lineTo(geometry.rightFoot.x,geometry.bottom);ctx.closePath()};
    const facePath=(apex,side,ridge)=>{ctx.beginPath();ctx.moveTo(apex.x,apex.y);for(let i=1;i<side.length;i++)ctx.lineTo(side[i].x,side[i].y);ctx.lineTo(ridge.at(-1).x,ridge.at(-1).y);for(let i=ridge.length-2;i>0;i--)ctx.lineTo(ridge[i].x,ridge[i].y);ctx.closePath()};
    const sampleLine=(line,t)=>{const scaled=Math.max(0,Math.min(line.length-1,t*(line.length-1))),index=Math.min(line.length-2,Math.floor(scaled)),mix=scaled-index,a=line[index],b=line[index+1];return{x:a.x+(b.x-a.x)*mix,y:a.y+(b.y-a.y)*mix}};
    const creaseLine=(mountain,side,ridge,seed,salt)=>{
      const sign=side.at(-1).x<mountain.apex.x?-1:1,start=.2+seeded(seed,salt)*.06,end=.76+seeded(seed,salt+1)*.12,targetX=mountain.apex.x+sign*mountain.width*(.045+seeded(seed,salt+2)*.045),points=[];
      for(let i=0;i<6;i++){
        const t=start+(end-start)*i/5,outer=sampleLine(side,t),inner=sampleLine(ridge,t),minX=Math.min(outer.x,inner.x)+2,maxX=Math.max(outer.x,inner.x)-2,zig=(i%2?1:-1)*(1.2+seeded(seed+i,salt+3)*mountain.width*.012),x=Math.max(minX,Math.min(maxX,targetX+zig));
        points.push({x,y:(outer.y+inner.y)*.5});
      }
      return points;
    };
    const strokeRelief=(points,darkAlpha,lightAlpha,width)=>{
      const traceLine=offset=>{ctx.beginPath();ctx.moveTo(points[0].x+offset,points[0].y);for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x+offset,points[i].y)};
      traceLine(0);ctx.strokeStyle=theme.ridge[0]+darkAlpha;ctx.lineWidth=width;ctx.stroke();
      traceLine(lightEdgeOffset);ctx.strokeStyle=theme.light+lightAlpha;ctx.lineWidth=Math.max(.55,width*.42);ctx.stroke();
    };
    const drawMountain=(mountain,index,detail)=>{const seed=worldSeed+index*67+detail*911,leftFoot={x:mountain.cx-mountain.width*.5,y:mountain.baseY+(seeded(seed,184)-.5)*5},rightFoot={x:mountain.cx+mountain.width*.5,y:mountain.baseY+(seeded(seed,185)-.5)*5},apex={x:mountain.cx+(seeded(seed,186)-.5)*mountain.width*.26,y:mountain.baseY-mountain.height},bottom=mountain.baseY+42,left=slope(apex,leftFoot,5,seed,187,mountain.width*.055),right=slope(apex,rightFoot,6,seed,191,mountain.width*.05),geometry={leftFoot,rightFoot,apex,bottom,left,right},ridge=ridgeLine({...mountain,apex},seed);
      const footFrac=Math.max(.3,Math.min(.85,mountain.height/(mountain.height+42)));
      const body=ctx.createLinearGradient(0,apex.y,0,bottom);body.addColorStop(0,detail?theme.ridge[2]:theme.ridge[1]);body.addColorStop(footFrac*.62,detail?theme.ridge[2]:theme.ridge[1]);body.addColorStop(footFrac,mixColors(theme.ridge[1],theme.ground[0],.55));body.addColorStop(1,theme.ground[0]);mountainPath(geometry);ctx.fillStyle=body;ctx.fill();
      ctx.save();mountainPath(geometry);ctx.clip();
      const litSide=lightFromLeft?left:right,shadowSide=lightFromLeft?right:left,litFoot=lightFromLeft?leftFoot:rightFoot,shadowFoot=lightFromLeft?rightFoot:leftFoot;
      const shadow=ctx.createLinearGradient(apex.x,apex.y,shadowFoot.x,mountain.baseY+5);shadow.addColorStop(0,theme.ridge[1]+'e6');shadow.addColorStop(.68,theme.ridge[0]+'96');shadow.addColorStop(1,theme.ridge[0]+'20');facePath(apex,shadowSide,ridge);ctx.fillStyle=shadow;ctx.fill();
      const highlight=ctx.createLinearGradient(apex.x,apex.y,litFoot.x,mountain.baseY+5);highlight.addColorStop(0,theme.light+(detail?'2a':'14'));highlight.addColorStop(.58,theme.light+(detail?'16':'0a'));highlight.addColorStop(1,theme.light+'00');facePath(apex,litSide,ridge);ctx.fillStyle=highlight;ctx.fill();
      const speckleCount=detail?36:28,groundNear=(y)=>Math.max(0,Math.min(1,(y-apex.y)/(mountain.baseY-apex.y+12)));
      for(let speckle=0;speckle<speckleCount;speckle++){const x=mountain.cx+(seeded(seed+speckle,215)-.5)*mountain.width*.82,y=apex.y+Math.pow(seeded(seed+speckle,216),.72)*(mountain.baseY-apex.y+12),size=.45+seeded(seed+speckle,217)*(detail?1.35:1.05),roll=seeded(seed+speckle,218),near=groundNear(y),patchAlpha=Math.round((70+near*100)*(detail?1:.72)).toString(16).padStart(2,'0');
        ctx.fillStyle=roll>.58?mixColors(theme.ground[0],theme.ridge[1],1-near*.75)+patchAlpha:roll>.32?theme.dark+(detail?'28':'22'):theme.light+(detail?'18':'14');
        ctx.beginPath();ctx.ellipse(x,y,size*1.8,size,seeded(seed+speckle,219)*Math.PI,0,Math.PI*2);ctx.fill()}
      ctx.lineCap='butt';ctx.lineJoin='miter';
      strokeRelief(creaseLine({...mountain,apex},left,ridge,seed,201),detail?'82':'55',detail?'38':'22',detail?1.45:.9);
      if(detail){
        strokeRelief(creaseLine({...mountain,apex},right,ridge,seed,207),'82','38',1.45);
        for(let rock=0;rock<3;rock++){const x=mountain.cx+(seeded(seed+rock,211)-.5)*mountain.width*.58,y=mountain.baseY-2+seeded(seed+rock,212)*9,size=1.5+seeded(seed+rock,213)*3.5;ctx.fillStyle=rock===0?theme.light+'20':theme.dark+'38';ctx.beginPath();ctx.moveTo(x-size,y+size*.25);ctx.lineTo(x-size*.15,y-size*.45);ctx.lineTo(x+size,y);ctx.lineTo(x+size*.3,y+size*.55);ctx.closePath();ctx.fill()}
      }else{
        const x=mountain.cx+(seeded(seed,211)-.5)*mountain.width*.5,y=mountain.baseY-2+seeded(seed,212)*8,size=1.3+seeded(seed,213)*2.6;ctx.fillStyle=theme.dark+'2c';ctx.beginPath();ctx.moveTo(x-size,y+size*.25);ctx.lineTo(x-size*.15,y-size*.45);ctx.lineTo(x+size,y);ctx.lineTo(x+size*.3,y+size*.55);ctx.closePath();ctx.fill();
      }
      strokeRelief(ridge,detail?'9a':'52',detail?'46':'24',detail?1.6:.85);ctx.restore()};
    const belt=(detail,baseY,minWidth,maxWidth,minHeight,maxHeight,salt)=>{const mountains=[];let cursor=-maxWidth*.42,index=0;while(cursor<W+maxWidth*.45){const width=minWidth+seeded(worldSeed+index,salt)*(maxWidth-minWidth),step=width*(.51+seeded(worldSeed+index,salt+1)*.17),height=minHeight+Math.pow(seeded(worldSeed+index,salt+2),.72)*(maxHeight-minHeight),cx=cursor+width*.5,base=baseY+(seeded(worldSeed+index,salt+3)-.5)*11;mountains.push({cx,width,height,baseY:base});cursor+=step;index++}mountains.sort((a,b)=>a.baseY-b.baseY).forEach((mountain,i)=>drawMountain(mountain,i+salt,detail))};
    belt(0,CAMERA.horizon+42,155,255,22,39,221);belt(1,CAMERA.horizon+61,205,340,34,66,251);

    const foothill=[];for(let x=-20;x<=W+20;x+=18){const broad=noise(x,190,281)*9,fine=(noise(x,48,282)-.5)*5;foothill.push({x,y:CAMERA.horizon+52-broad-fine})}const foothillBottom=CAMERA.horizon+103,foothillFill=ctx.createLinearGradient(0,CAMERA.horizon+38,0,foothillBottom);foothillFill.addColorStop(0,theme.ground[0]+'4c');foothillFill.addColorStop(.55,theme.ground[0]+'20');foothillFill.addColorStop(1,theme.ground[0]+'00');trace(foothill,foothillBottom);ctx.fillStyle=foothillFill;ctx.fill()
  }
  function drawSky(){
    const theme=activePlanet().theme,sky=ctx.createLinearGradient(0,0,0,CAMERA.horizon+34);sky.addColorStop(0,theme.sky[0]);sky.addColorStop(.56,theme.sky[1]);sky.addColorStop(1,theme.sky[2]);ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    ctx.save();for(let i=0;i<115;i++){const x=seeded(worldSeed+i,104)*W,y=4+seeded(worldSeed+i,105)*(CAMERA.horizon-18),r=i%19===0?1.5:i%7===0?1:.55;ctx.globalAlpha=.22+seeded(worldSeed+i,106)*.68;ctx.fillStyle=i%9===0?theme.accent:'#f2f4ff';ctx.fillRect(x,y,r,r)}ctx.restore();
  }
  function drawAtmosphere(){
    const planet=activePlanet(),theme=planet.theme;ctx.save();ctx.globalCompositeOperation='screen';if(planet.celestial==='aurora'){for(let i=0;i<(renderDetail===0?2:4);i++){const drift=Math.sin(sceneTime*.22+i)*35;ctx.strokeStyle=i%2?theme.glow+'20':theme.accent+'1b';ctx.lineWidth=11+i*4;ctx.beginPath();ctx.moveTo(-80,25+i*22);ctx.bezierCurveTo(210,15+drift,510,112-drift*.4,1080,28+i*15);ctx.stroke()}}else if(planet.celestial==='rings'){for(let i=0;i<(renderDetail===0?5:10);i++){const x=(i*137+sceneTime*(7+i%3))%W,y=18+(i*47)%180;ctx.fillStyle=theme.accent;ctx.globalAlpha=.08+(i%4)*.035;ctx.beginPath();ctx.arc(x,y,1+i%2,0,Math.PI*2);ctx.fill()}}else if(planet.celestial==='eclipse'){for(let i=0;i<(renderDetail===0?2:5);i++){const x=(i*263+sceneTime*(34+i*8))%(W+160)-80,y=(i*37+sceneTime*(13+i*3))%210;ctx.strokeStyle=theme.accent;ctx.globalAlpha=.12+i*.025;ctx.lineWidth=1+i%2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-24-i*5,y+9+i*2);ctx.stroke()}}ctx.restore()
  }
  function drawGround(){
    const theme=activePlanet().theme,top=CAMERA.horizon-28,g=ctx.createLinearGradient(0,top,0,H);g.addColorStop(0,theme.ground[0]+'00');g.addColorStop(.075,theme.ground[0]);g.addColorStop(.48,theme.ground[1]);g.addColorStop(1,theme.ground[2]);ctx.fillStyle=g;ctx.fillRect(0,top,W,H-top);
    const valley=ctx.createRadialGradient(W*.69,H*.18,18,W*.56,H*.44,710);valley.addColorStop(0,theme.warm);valley.addColorStop(.42,'rgba(225,219,176,.025)');valley.addColorStop(1,theme.dark+'3d');ctx.fillStyle=valley;ctx.fillRect(0,CAMERA.horizon+18,W,H-CAMERA.horizon-18);
    drawGroundTexture();
    drawGroundVeins();
    drawGroundDetails();
  }
  function drawGroundTexture(){
    const theme=activePlanet().theme,colors=theme.patches,top=CAMERA.horizon+8,patchPath=points=>{ctx.beginPath();const first=points[0],last=points.at(-1);ctx.moveTo((last.x+first.x)/2,(last.y+first.y)/2);for(let i=0;i<points.length;i++){const point=points[i],next=points[(i+1)%points.length];ctx.quadraticCurveTo(point.x,point.y,(point.x+next.x)/2,(point.y+next.y)/2)}ctx.closePath()};ctx.save();ctx.globalAlpha=.9;ctx.filter='blur(11px)';ctx.drawImage(macroSurfaceCanvas,-28,top-18,W+56,H-top+42);ctx.filter='none';ctx.globalAlpha=.56;ctx.fillStyle=surfacePattern;ctx.fillRect(0,CAMERA.horizon+12,W,H-CAMERA.horizon-12);ctx.globalAlpha=1;
    const prepared=groundPatches.map(p=>{const points=[];for(let i=0;i<18;i++){const a=i/18*Math.PI*2,wobble=.77+seeded(p.seed,i+41)*.31+Math.sin(i*2.31+seeded(p.seed,40)*6)*.07,rx=Math.cos(a)*p.rx*wobble,ry=Math.sin(a)*p.ry*wobble,ca=Math.cos(p.angle),sa=Math.sin(p.angle);points.push(project(p.x+rx*ca-ry*sa,p.y+rx*sa+ry*ca,1))}return{p,points,center:project(p.x,p.y,1)}});
    ctx.filter='blur(2px)';for(const item of prepared){ctx.globalAlpha=item.p.opacity;patchPath(item.points);ctx.fillStyle=colors[item.p.tone];ctx.fill()}ctx.filter='none';
    for(const {p,points,center} of prepared){ctx.globalAlpha=p.opacity;ctx.lineCap='round';const split=5+Math.floor(seeded(p.seed,61)*4);ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<=split;i++)ctx.lineTo(points[i].x,points[i].y);ctx.strokeStyle=theme.light+'20';ctx.lineWidth=.7;ctx.stroke();ctx.beginPath();ctx.moveTo(points[split+3].x,points[split+3].y);for(let i=split+4;i<Math.min(points.length,split+10);i++)ctx.lineTo(points[i].x,points[i].y);ctx.strokeStyle=theme.dark+'30';ctx.lineWidth=1;ctx.stroke();
      if(p.material===1||p.material===2){ctx.save();patchPath(points);ctx.clip();const count=p.material===2?4:2,dx=Math.cos(p.angle),dy=Math.sin(p.angle)*CAMERA.compression;for(let line=0;line<count;line++){const offset=(line-(count-1)/2)*(7+seeded(p.seed+line,62)*9),length=p.rx*(.38+seeded(p.seed+line,63)*.38);ctx.beginPath();ctx.moveTo(center.x-dx*length+(-dy)*offset,center.y-dy*length+dx*offset);ctx.quadraticCurveTo(center.x+(seeded(p.seed+line,64)-.5)*18,center.y+offset*.4,center.x+dx*length+(-dy)*offset,center.y+dy*length+dx*offset);ctx.strokeStyle=p.material===2?theme.dark+'28':theme.light+'1b';ctx.lineWidth=.65+seeded(p.seed+line,65)*.65;ctx.stroke()}ctx.restore()}}
    ctx.globalAlpha=1;ctx.restore();
  }
  function drawGroundVeins(){
    const theme=activePlanet().theme,curve=(a,b,c,color,width,ox=0,oy=0)=>{ctx.beginPath();ctx.moveTo(a.x+ox,a.y+oy);ctx.quadraticCurveTo(b.x+ox,b.y+oy,c.x+ox,c.y+oy);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()};ctx.save();ctx.lineCap='round';for(const vein of groundVeins){const dx=Math.cos(vein.angle)*vein.length,dy=Math.sin(vein.angle)*vein.length,wa={x:vein.x,y:vein.y},wb={x:vein.x+dx*.48,y:vein.y+dy*.48+vein.bend},wc={x:vein.x+dx,y:vein.y+dy},a=project(wa.x,wa.y,1),b=project(wb.x,wb.y,1),c=project(wc.x,wc.y,1),width=vein.seed%5===0?1.55:.9;curve(a,b,c,theme.dark+'82',width);curve(a,b,c,theme.light+'38',Math.max(.45,width*.48),-.8,-.7);
      for(let branch=0;branch<vein.branches;branch++){const t=.3+branch*.32+seeded(vein.seed+branch,72)*.08,omt=1-t,sx=omt*omt*wa.x+2*omt*t*wb.x+t*t*wc.x,sy=omt*omt*wa.y+2*omt*t*wb.y+t*t*wc.y,direction=vein.angle+(branch%2?1:-1)*(.58+seeded(vein.seed+branch,73)*.62),length=vein.length*(.16+seeded(vein.seed+branch,74)*.18),start=project(sx,sy,1),end=project(sx+Math.cos(direction)*length,sy+Math.sin(direction)*length,1),mid={x:(start.x+end.x)/2+(seeded(vein.seed+branch,75)-.5)*7,y:(start.y+end.y)/2+(seeded(vein.seed+branch,76)-.5)*5};curve(start,mid,end,theme.dark+'68',width*.72);curve(start,mid,end,theme.light+'27',Math.max(.35,width*.34),-.6,-.5)}}ctx.restore();
  }
  function drawGroundDetails(){
    const theme=activePlanet().theme;ctx.save();ctx.lineCap='round';
    for(const d of groundDetails){const p=project(d.x,d.y,1),scale=p.scale*d.size,variance=seeded(d.seed,8);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(d.angle);ctx.globalAlpha=.48+d.density*.42;
      if(d.kind===0){ctx.fillStyle=theme.dark+'86';ctx.beginPath();ctx.moveTo(-3.2*scale,1.1*scale);ctx.lineTo(-.4*scale,-2.1*scale);ctx.lineTo(3.5*scale,.5*scale);ctx.lineTo(1.2*scale,2.1*scale);ctx.closePath();ctx.fill();ctx.fillStyle=theme.light+'50';ctx.beginPath();ctx.moveTo(-2.1*scale,.1*scale);ctx.lineTo(-.3*scale,-1.5*scale);ctx.lineTo(1.7*scale,-.1*scale);ctx.closePath();ctx.fill()}
      else if(d.kind===1){ctx.strokeStyle=theme.plant+'9e';ctx.lineWidth=.7*scale;for(let j=-2;j<=2;j++){ctx.beginPath();ctx.moveTo(j*.45*scale,1.5*scale);ctx.quadraticCurveTo(j*1.1*scale,-2.2*scale,j*1.8*scale+(variance-.5)*2,-5.5*scale-Math.abs(j));ctx.stroke()}}
      else if(d.kind===2){ctx.fillStyle=theme.light+'3f';ctx.beginPath();ctx.ellipse(0,0,(3.2+variance*4)*scale,(1+variance*.8)*scale,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=theme.dark+'42';ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(-2.5*scale,.5*scale);ctx.lineTo(2.8*scale,-.35*scale);ctx.stroke()}
      else if(d.kind===3){const crack=()=>{ctx.beginPath();ctx.moveTo(-5*scale,1*scale);ctx.lineTo(-1.4*scale,-1.2*scale);ctx.lineTo(1.1*scale,.5*scale);ctx.lineTo(4.8*scale,-1.6*scale)};ctx.strokeStyle=theme.dark+'88';ctx.lineWidth=.85*scale;crack();ctx.stroke();ctx.translate(-.45*scale,-.55*scale);ctx.strokeStyle=theme.light+'2b';ctx.lineWidth=.4*scale;crack();ctx.stroke()}
      else if(d.kind===4){ctx.fillStyle=theme.plant+'6d';for(let i=0;i<3+Math.floor(variance*3);i++){ctx.beginPath();ctx.arc((i-1.5)*1.8*scale,(i%2)*1.1*scale,.65*scale+variance*.55,0,Math.PI*2);ctx.fill()}}
      else if(d.kind===5){ctx.strokeStyle=theme.dark+'55';ctx.lineWidth=.65*scale;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(-5*scale,i*1.15*scale);ctx.quadraticCurveTo(0,i*.7*scale+(variance-.5),5*scale,i*1.15*scale-.6);ctx.stroke()}}
      else if(d.kind===6){for(let i=0;i<3;i++){const x=(i-1)*2.4*scale,y=(i%2)*1.1*scale,r=(.8+seeded(d.seed+i,81))*scale;ctx.fillStyle=i===0?theme.light+'36':theme.dark+'69';ctx.beginPath();ctx.moveTo(x-r,y+r*.4);ctx.lineTo(x,y-r);ctx.lineTo(x+r,y+r*.3);ctx.closePath();ctx.fill()}}
      else if(d.kind===7){ctx.strokeStyle=theme.dark+'62';ctx.lineWidth=1.1*scale;ctx.beginPath();ctx.ellipse(0,0,(3.6+variance*3)*scale,(1.4+variance)*scale,0,.05,Math.PI);ctx.stroke();ctx.strokeStyle=theme.light+'35';ctx.lineWidth=.65*scale;ctx.beginPath();ctx.ellipse(-.4*scale,-.5*scale,(3+variance*2.5)*scale,(1.1+variance*.7)*scale,0,Math.PI,Math.PI*2);ctx.stroke()}
      else{ctx.fillStyle=theme.dark+'72';ctx.fillRect(-4*scale,-1.2*scale,8*scale,2.4*scale);ctx.fillStyle=theme.light+'38';ctx.beginPath();ctx.moveTo(-4*scale,-1.2*scale);ctx.lineTo(2.2*scale,-2.2*scale);ctx.lineTo(4*scale,-1.2*scale);ctx.closePath();ctx.fill()}
      ctx.restore();
    }
    ctx.restore();
  }
  function drawTerrainGrade(){
    const theme=activePlanet().theme,top=CAMERA.horizon+18;ctx.save();ctx.beginPath();ctx.rect(0,top,W,H-top);ctx.clip();const warmth=ctx.createLinearGradient(W,0,0,H);warmth.addColorStop(0,theme.warm);warmth.addColorStop(.48,'rgba(255,255,255,.015)');warmth.addColorStop(1,theme.dark+'38');ctx.fillStyle=warmth;ctx.fillRect(0,top,W,H-top);
    const vignette=ctx.createRadialGradient(W*.53,H*.46,180,W*.5,H*.5,690);vignette.addColorStop(.42,'rgba(12,25,23,0)');vignette.addColorStop(1,'rgba(3,8,12,.32)');ctx.fillStyle=vignette;ctx.fillRect(0,top,W,H-top);ctx.restore();
  }
  function drawBuildGrid(){const top=ROW_TOP*CELL;ctx.save();ctx.globalCompositeOperation='screen';ctx.setLineDash([2,7]);ctx.lineWidth=.7;ctx.strokeStyle='rgba(189,220,216,.09)';for(let x=0;x<=W;x+=CELL){const a=project(x,top,1),b=project(x,H,1);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}for(let y=top;y<=H;y+=CELL){const a=project(0,y,1),b=project(W,y,1);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}ctx.setLineDash([]);ctx.restore()}
  function drawWeather(){const planet=activePlanet(),theme=planet.theme;ctx.save();ctx.strokeStyle=theme.weather;ctx.fillStyle=theme.weather;ctx.lineCap='round';const count=renderDetail===0?8:renderDetail===1?14:21;for(let i=0;i<count;i++){const direction=planet.id==='pyra'?-1:1,x=(i*227+sceneTime*(planet.id==='pyra'?18:10+i%4*3))%(W+90)-45,y=(i*91+sceneTime*(planet.id==='pyra'?-9:12+i%3*4)+H+70)%(H+70)-35,len=planet.id==='umbra'?8+i%5:i%9===0?4:1.2;ctx.globalAlpha=.07+(i%5)*.035;ctx.lineWidth=i%9===0?1.2:.7;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-direction*len,y+(planet.id==='pyra'?-len*.8:len*.35));ctx.stroke()}ctx.restore()}
  function drawPath(){
    const routes=state?.testMode&&state.testStations?.length?state.testStations.map(station=>({path:station.path,station,lineIndex:station.index})):(state?.paths?.length?state.paths:[state?.path]).map((path,lineIndex)=>({path,station:null,lineIndex})),theme=activePlanet().theme,highlightActive=!state?.testMode&&routes.length>1;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    for(const route of routes){const path=route.path;if(!path||!path.length)continue;if(highlightActive&&route.lineIndex!==state.spawnLaneCursor)continue;
      const points=path.map(n=>{const c=cellCenter(n);return project(c.x,c.y)}),trace=()=>{ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(let i=1;i<points.length-1;i++){const p=points[i],next=points[i+1];ctx.quadraticCurveTo(p.x,p.y,(p.x+next.x)/2,(p.y+next.y)/2)}ctx.lineTo(points.at(-1).x,points.at(-1).y)};
      ctx.setLineDash([8,12]);trace();ctx.strokeStyle='rgba(19,29,23,.58)';ctx.lineWidth=4;ctx.stroke();trace();ctx.strokeStyle=theme.accent+'cc';ctx.lineWidth=1.8;ctx.stroke();ctx.setLineDash([]);
      ctx.strokeStyle=theme.light+'e0';ctx.lineWidth=1.7;for(let i=2;i<points.length-1;i+=3){const p=points[i],prev=points[i-1],next=points[i+1],dx=next.x-prev.x,dy=next.y-prev.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,nx=-uy,ny=ux;ctx.beginPath();ctx.moveTo(p.x-ux*4+nx*3.4,p.y-uy*4+ny*3.4);ctx.lineTo(p.x+ux*2.5,p.y+uy*2.5);ctx.lineTo(p.x-ux*4-nx*3.4,p.y-uy*4-ny*3.4);ctx.stroke()}
      const start=points[0];ctx.fillStyle=theme.accent+'33';ctx.strokeStyle=theme.light+'cc';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(start.x,start.y,8,4,0,0,Math.PI*2);ctx.fill();ctx.stroke();if(route.station||routes.length>1){ctx.fillStyle=theme.light;ctx.font='700 7px monospace';ctx.textAlign='center';ctx.fillText(route.station?`S${route.station.index+1}`:`E${route.lineIndex+1}`,start.x,start.y-7)}
    }ctx.restore();
  }
  function drawPlatform(x,y,r,h,color,stroke){
    const depth=Math.max(0,Math.min(1,y/H)),scale=CAMERA.farScale+(1-CAMERA.farScale)*depth,flat=(px,py,pz)=>({x:W/2+(px-W/2)*scale,y:CAMERA.horizon+py*CAMERA.compression-pz*scale,scale}),bottom=[],top=[],lightAngle=frameLightFromLeft?Math.PI:0;
    for(let i=0;i<8;i++){const a=i*Math.PI/4;bottom.push(flat(x+Math.cos(a)*r,y+Math.sin(a)*r,0));top.push(flat(x+Math.cos(a)*r,y+Math.sin(a)*r,h))}drawSoftShadow(x,y,r*1.12,r*.48,h+14,.34);for(let i=0;i<8;i++){const n=(i+1)%8,mid=(i+.5)*Math.PI/4,illumination=(Math.cos(mid-lightAngle)+1)*.5,tone=25+illumination*9;poly([bottom[i],bottom[n],top[n],top[i]],`hsl(157,11%,${tone}%)`,stroke)}
    const center=flat(x,y,h),topGradient=ctx.createRadialGradient(center.x,center.y,r*.12*scale,center.x,center.y,r*1.05*scale);topGradient.addColorStop(0,color);topGradient.addColorStop(.7,color);topGradient.addColorStop(1,'rgba(0,0,0,.2)');poly(top,topGradient,stroke);
    if(renderDetail>0){ctx.fillStyle='rgba(222,220,195,.34)';for(let i=0;i<8;i++){const a=i*Math.PI/4+Math.PI/8,p=flat(x+Math.cos(a)*r*.72,y+Math.sin(a)*r*.72,h+.5);ctx.beginPath();ctx.arc(p.x,p.y,1.1*scale,0,Math.PI*2);ctx.fill()}ctx.strokeStyle='rgba(0,0,0,.16)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(center.x,center.y,r*.6*scale,0,Math.PI*2);ctx.stroke()}
    return center}
  function drawBlock(x,y,w,d,z,h,colors){
    const bbL=project(x-w/2,y-d/2,z),bbR=project(x+w/2,y-d/2,z),bfR=project(x+w/2,y+d/2,z),bfL=project(x-w/2,y+d/2,z),tbL=project(x-w/2,y-d/2,z+h),tbR=project(x+w/2,y-d/2,z+h),tfR=project(x+w/2,y+d/2,z+h),tfL=project(x-w/2,y+d/2,z+h);
    const leftTone=frameLightFromLeft?colors.side:(colors.dark||colors.side),rightTone=frameLightFromLeft?(colors.dark||colors.side):colors.side;drawSoftShadow(x,y,w*.68,d*.48,z+h,.22);poly([bfL,bfR,tfR,tfL],colors.front,colors.stroke);poly([bfR,bbR,tbR,tfR],rightTone,colors.stroke);poly([bbL,bfL,tfL,tbL],leftTone,colors.stroke);
    const topGradient=ctx.createLinearGradient(tbL.x,tbL.y,tfL.x,tfL.y);topGradient.addColorStop(0,'rgba(255,255,255,.1)');topGradient.addColorStop(.3,colors.top);topGradient.addColorStop(1,colors.top);
    poly([tbL,tbR,tfR,tfL],topGradient,colors.stroke);
    if(renderDetail>0&&w>14){
      ctx.save();ctx.beginPath();ctx.moveTo(bfL.x,bfL.y);ctx.lineTo(bfR.x,bfR.y);ctx.lineTo(tfR.x,tfR.y);ctx.lineTo(tfL.x,tfL.y);ctx.closePath();ctx.clip();
      const lines=Math.min(4,Math.max(1,Math.round(w/15)));ctx.strokeStyle='rgba(0,0,0,.2)';ctx.lineWidth=1;
      for(let i=1;i<lines;i++){const t=i/lines,a={x:bfL.x+(bfR.x-bfL.x)*t,y:bfL.y+(bfR.y-bfL.y)*t},b={x:tfL.x+(tfR.x-tfL.x)*t,y:tfL.y+(tfR.y-tfL.y)*t};ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()}
      ctx.strokeStyle='rgba(255,255,255,.08)';ctx.beginPath();ctx.moveTo(tfL.x,tfL.y+1);ctx.lineTo(tfR.x,tfR.y+1);ctx.stroke();
      ctx.restore();
    }
    return{top:project(x,y,z+h),frontY:y+d/2};
  }
  function drawCrystal(c){
    const ground=project(c.x,c.y),top=project(c.x,c.y,c.h),l=project(c.x-c.s,c.y,3),r=project(c.x+c.s,c.y,3),back=project(c.x,c.y-c.s*.55,2),front=project(c.x,c.y+c.s*.55,1);
    drawSoftShadow(c.x,c.y,c.s*1.5,c.s*.55,c.h,.28);ctx.save();poly([l,back,top],'#3f494b');poly([back,r,top],'#697476');poly([r,front,top],'#30393c');poly([front,l,top],'#222a2d');ctx.globalAlpha=.24;const seamA=project(c.x,c.y,c.h*.22),seamB=project(c.x+1,c.y,c.h*.76);ctx.strokeStyle=c.c;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(seamA.x,seamA.y);ctx.lineTo(seamB.x,seamB.y);ctx.stroke();ctx.globalAlpha=1;ctx.restore();
  }
  function drawFlora(f,lightFromLeft=frameLightFromLeft){
    const previousStyle=industrialRendering;industrialRendering=true;const theme=activePlanet().theme,depth=Math.max(0,Math.min(1,f.y/H)),distanceScale=.45+.55*depth,fs=f.s*distanceScale,h=42*fs,spread=15*fs,lean=f.lean||0,basePoint=project(f.x,f.y,1),top=project(f.x+lean*h,f.y,h);drawSoftShadow(f.x,f.y,spread*1.15,spread*.5,h,.3);ctx.save();ctx.filter='saturate(.5)';
    if(f.kind==='spire'){const left=project(f.x-spread*.65,f.y+3,1),right=project(f.x+spread*.7,f.y+2,1),mid=project(f.x+lean*h*.4,f.y,h*.52),lit='#655047',shade='#473b38';poly([left,mid,top],lightFromLeft?lit:shade);poly([mid,right,top],lightFromLeft?shade:lit);ctx.strokeStyle='#806b60';ctx.globalAlpha=.35;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(basePoint.x,basePoint.y);ctx.lineTo(mid.x,mid.y);ctx.lineTo(top.x,top.y+5);ctx.stroke()}
    else if(f.kind==='fan'){ctx.strokeStyle='#344743';ctx.lineWidth=Math.max(2,3*fs);ctx.beginPath();ctx.moveTo(basePoint.x,basePoint.y);ctx.lineTo(top.x,top.y);ctx.stroke();for(let i=0;i<3;i++){const z=(15+i*10)*distanceScale,center=project(f.x+lean*z,f.y,z),fanL=project(f.x-spread*(1-i*.18),f.y,z+3),fanR=project(f.x+spread*(1-i*.18),f.y,z+3);ctx.fillStyle=i%2?'#4c665a':'#60766a';ctx.beginPath();ctx.moveTo(center.x,center.y);ctx.quadraticCurveTo(center.x,center.y-8*fs,fanL.x,fanL.y);ctx.quadraticCurveTo(center.x,center.y-4*fs,fanR.x,fanR.y);ctx.closePath();ctx.fill()}}
    else if(f.kind==='shard'){for(let i=-1;i<=1;i++){const offset=i*7*fs,tip=project(f.x+offset+lean*h,f.y,h*(.55+Math.abs(i)*.2)),l=project(f.x+offset-4*fs,f.y,1),r=project(f.x+offset+4*fs,f.y,1),lit=(lightFromLeft&&i<=0)||(!lightFromLeft&&i>=0);poly([l,r,tip],lit?'#545363':'#3e3c49')}}
    else{ctx.strokeStyle='#3d4b48';ctx.lineWidth=Math.max(1.5,3*fs);ctx.beginPath();ctx.moveTo(basePoint.x,basePoint.y);ctx.lineTo(top.x,top.y);ctx.stroke();for(let i=0;i<4;i++){const z=(9+i*8)*distanceScale,half=spread*(1-i*.17),centerX=f.x+lean*z,l=project(centerX-half,f.y+2,z),r=project(centerX+half,f.y+1,z),tip=project(f.x+lean*(z+13*distanceScale),f.y,z+15*distanceScale);poly([l,r,tip],i%2?'#44534f':'#596963');ctx.strokeStyle='#7b8984';ctx.globalAlpha=.45;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(r.x,r.y);ctx.stroke();ctx.globalAlpha=1}}
    ctx.restore();industrialRendering=previousStyle;
  }
  function drawBoulder(o,lightFromLeft=frameLightFromLeft){const c=cellCenter(o),seed=o.seed,r=19+(seed%4)*2,lit='#596263',shade='#30383a';if(o.type==='ridge'){const h=11+(seed%4)*2;drawSoftShadow(c.x,c.y,r*1.55,r*.48,h,.28);for(let i=-1;i<=1;i++){const offset=i*10,backL=project(c.x-r+offset,c.y-7+i*2,2),backR=project(c.x+r+offset,c.y-5+i*2,2),frontR=project(c.x+r*.82+offset,c.y+9+i*3,1),frontL=project(c.x-r*.88+offset,c.y+10+i*3,1),topL=project(c.x-r*.72+offset,c.y-2+i*2,h-i),topR=project(c.x+r*.68+offset,c.y+i*2,h-2+i);poly([frontL,frontR,topR,topL],i?'#353d3f':'#41494a');poly([backL,backR,topR,topL],lightFromLeft?(i<=0?'#707775':'#565e5e'):(i>=0?'#707775':'#565e5e'))}}else{const h=20+(seed%5)*2,left=project(c.x-r,c.y+2,2),right=project(c.x+r,c.y+5,2),backL=project(c.x-r*.62,c.y-r*.45,3),backR=project(c.x+r*.52,c.y-r*.38,3),front=project(c.x+2,c.y+r*.7,1),topL=project(c.x-r*.46,c.y-2,h*.72),topR=project(c.x+r*.38,c.y-1,h*.77),topFront=project(c.x+1,c.y+r*.18,h*.6);drawSoftShadow(c.x,c.y,r*1.3,r*.55,h,.3);poly([left,backL,topL],lightFromLeft?lit:shade);poly([backL,backR,topR,topL],'#69706e');poly([backR,right,topFront,topR],lightFromLeft?shade:lit);poly([right,front,topFront],lightFromLeft?'#343c3e':'#4b5354');poly([front,left,topL,topFront],lightFromLeft?'#465052':'#282f31');poly([topL,topR,topFront],'#7a807c')}}
  function drawWreck(o){
    const c=cellCenter(o),variant=Math.abs(o.seed)%3,angle=[-.28,.22,.46][variant],fx=Math.cos(angle),fy=Math.sin(angle),nx=-fy,ny=fx,point=(forward,side,z=0)=>project(c.x+fx*forward+nx*side,c.y+fy*forward+ny*side,z);
    drawSoftShadow(c.x,c.y,variant===0?37:31,variant===0?13:15,22,.32);ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    if(variant===0){
      // Abgerissener Flügel: breite Panzerflächen, sichtbare Bruchrippen.
      const rootL=point(-25,-12,3),rootR=point(-25,12,3),shoulderL=point(-5,-10,7),shoulderR=point(-5,10,7),tip=point(30,0,4),topL=point(-22,-9,12),topR=point(-22,9,12),spine=point(4,0,9);
      poly([rootL,rootR,shoulderR,tip,shoulderL],'#353d3f');poly([topL,topR,spine,tip],'#6b7270');poly([rootL,shoulderL,tip,topL],'#4a5354');poly([rootR,topR,tip,shoulderR],'#293134');
      const tearL=point(-26,-8,5),tearR=point(-26,8,5),tearTopR=point(-26,7,12),tearTopL=point(-26,-7,12);poly([tearL,tearR,tearTopR,tearTopL],'#20282b');ctx.strokeStyle='#8a9290';ctx.lineWidth=2;for(const side of [-6,0,6]){const ribA=point(-25,side,7),ribB=point(-8,side*.55,9);ctx.beginPath();ctx.moveTo(ribA.x,ribA.y);ctx.lineTo(ribB.x,ribB.y);ctx.stroke()}const markA=point(-3,-7,10),markB=point(10,-4,8);ctx.strokeStyle='#805f45';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(markA.x,markA.y);ctx.lineTo(markB.x,markB.y);ctx.stroke();poly([point(18,13,1),point(29,16,1),point(23,22,1),point(14,18,1)],'#4e5756');
    }else if(variant===1){
      // Abgerissene Triebwerksgondel: facettierte Hülle, dunkle Düse, Kabel.
      const bLL=point(-23,-11,3),bLR=point(-23,11,3),fLR=point(21,9,4),fLL=point(21,-9,4),bTL=point(-21,-8,17),bTR=point(-21,8,17),fTR=point(17,7,15),fTL=point(17,-7,15);
      poly([bLL,bLR,fLR,fLL],'#293134');poly([bLL,fLL,fTL,bTL],'#3e4749');poly([bLR,bTR,fTR,fLR],'#252d30');poly([bTL,bTR,fTR,fTL],'#68706e');poly([bLL,bLR,bTR,bTL],'#1f2629');poly([point(-24,-5,7),point(-24,5,7),point(-24,5,13),point(-24,-5,13)],'#4a352f');
      ctx.strokeStyle='#89918e';ctx.lineWidth=2;for(const forward of [-8,7]){const seamL=point(forward,-9,7),seamR=point(forward,9,7);ctx.beginPath();ctx.moveTo(seamL.x,seamL.y);ctx.lineTo(seamR.x,seamR.y);ctx.stroke()}const cableA=point(18,7,10),cableB=point(28,13,4),cableC=point(23,19,2);ctx.strokeStyle='#252b2d';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(cableA.x,cableA.y);ctx.quadraticCurveTo(cableB.x,cableB.y,cableC.x,cableC.y);ctx.stroke();poly([point(19,-13,2),point(31,-11,1),point(27,-3,1),point(16,-5,2)],'#59615f');
    }else{
      // Ausgebranntes Panzerchassis: Laufwerk, flacher Rumpf, gebrochenes Rohr.
      for(const side of [-1,1]){const trackA=point(-23,side*13,4),trackB=point(19,side*13,4);ctx.strokeStyle='#202629';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(trackA.x,trackA.y);ctx.lineTo(trackB.x,trackB.y);ctx.stroke();for(const forward of [-15,0,14]){const wheel=point(forward,side*13,5);ellipseAt(wheel,3.8,3.8,'#596160');ellipseAt(wheel,1.3,1.3,'#929895')}}
      const rearL=point(-22,-11,7),rearR=point(-22,11,7),frontR=point(20,9,7),frontL=point(20,-9,7),topRearL=point(-17,-8,16),topRearR=point(-17,8,16),topFrontR=point(13,7,15),topFrontL=point(13,-7,15);poly([rearL,rearR,frontR,frontL],'#30383a');poly([rearL,frontL,topFrontL,topRearL],'#3e4748');poly([rearR,topRearR,topFrontR,frontR],'#272f31');poly([topRearL,topRearR,topFrontR,topFrontL],'#68706e');
      poly([point(-7,-6,16),point(6,-6,16),point(5,5,16),point(-8,5,16)],'#252c2e');ctx.strokeStyle='#303638';ctx.lineWidth=6;const barrelA=point(1,0,18),barrelB=point(24,0,11);ctx.beginPath();ctx.moveTo(barrelA.x,barrelA.y);ctx.lineTo(barrelB.x,barrelB.y);ctx.stroke();ctx.strokeStyle='#765548';ctx.lineWidth=2.5;const scarA=point(-11,-8,17),scarB=point(3,-7,16);ctx.beginPath();ctx.moveTo(scarA.x,scarA.y);ctx.lineTo(scarB.x,scarB.y);ctx.stroke();poly([point(17,15,2),point(30,17,1),point(26,24,1),point(14,21,1)],'#4a5352');
    }
    ctx.restore()
  }
  function drawObstacle(o,lightFromLeft=frameLightFromLeft){const c=cellCenter(o),crystal=activePlanet().theme.crystal,previousStyle=industrialRendering;industrialRendering=true;if(o.type==='crystal'){drawCrystal({x:c.x-5,y:c.y+4,h:30+(o.seed%4)*5,s:9,c:crystal});drawCrystal({x:c.x+9,y:c.y-4,h:18+(o.seed%3)*4,s:6,c:crystal});drawCrystal({x:c.x+7,y:c.y+10,h:13+(o.seed%2)*4,s:5,c:crystal})}else if(o.type==='wreck')drawWreck(o);else drawBoulder(o,lightFromLeft);industrialRendering=previousStyle}
  function drawDome(x,y,r,hz,topCol,botCol,accent){
    const rimC=project(x,y,0),apex=project(x,y,hz),rxp=r*rimC.scale,ryp=r*.42*rimC.scale,neckY=apex.y+(rimC.y-apex.y)*.16;
    drawSoftShadow(x,y,r*1.06,r*.5,hz,.24);
    const grad=ctx.createLinearGradient(apex.x,apex.y,apex.x,rimC.y+ryp);grad.addColorStop(0,topCol);grad.addColorStop(1,botCol);
    ctx.beginPath();ctx.moveTo(rimC.x-rxp,rimC.y);ctx.bezierCurveTo(rimC.x-rxp,neckY,apex.x-rxp*.55,apex.y,apex.x,apex.y);ctx.bezierCurveTo(apex.x+rxp*.55,apex.y,rimC.x+rxp,neckY,rimC.x+rxp,rimC.y);ctx.ellipse(rimC.x,rimC.y,rxp,ryp,0,0,Math.PI,false);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
    ctx.save();ctx.globalAlpha=.16;const hp=project(x+(frameLightFromLeft?-r*.3:r*.3),y,hz*.8);ctx.fillStyle='#f2f8f5';ctx.beginPath();ctx.ellipse(hp.x,hp.y,r*.24*hp.scale,r*.14*hp.scale,frameLightFromLeft?-.5:.5,0,Math.PI*2);ctx.fill();ctx.restore();
    // Nur der vordere Bogen als Sockelkante — der volle Ring wuerde hinten
    // durch die Kuppel scheinen und sie durchsichtig wirken lassen.
    ctx.strokeStyle='rgba(26,40,43,.34)';ctx.lineWidth=1;for(const t of [.4,.7]){const zz=hz*Math.sin(t*Math.PI/2),rr=r*Math.cos(t*Math.PI/2),pc=project(x,y,zz);ctx.beginPath();ctx.ellipse(pc.x,pc.y,rr*pc.scale,rr*.42*pc.scale,0,.14*Math.PI,.86*Math.PI);ctx.stroke()}
    ctx.strokeStyle='rgba(18,28,31,.45)';ctx.lineWidth=1.1;ctx.beginPath();ctx.ellipse(rimC.x,rimC.y,rxp,ryp,0,0,Math.PI);ctx.stroke();
  }
  function drawTube(x1,y1,x2,y2,z,thick,col,hi){
    const a=project(x1,y1,z),b=project(x2,y2,z),w=thick*a.scale;ctx.save();ctx.lineCap='round';ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.strokeStyle=hi;ctx.globalAlpha=.55;ctx.lineWidth=w*.34;ctx.beginPath();ctx.moveTo(a.x,a.y-w*.24);ctx.lineTo(b.x,b.y-w*.24);ctx.stroke();ctx.restore();
  }
  // Boden-montiertes Solarpaneel, das sich zum Himmelskoerper neigt (leanX = horizontale Richtung dorthin).
  function drawSolarArray(x,y,leanX,accent){
    const hw=14,hd=6,z0=7,rise=15,shift=leanX*11;
    const post0=project(x,y,0),post1=project(x,y,z0);ctx.strokeStyle='#5c6866';ctx.lineWidth=Math.max(2,3*post0.scale);ctx.beginPath();ctx.moveTo(post0.x,post0.y);ctx.lineTo(post1.x,post1.y);ctx.stroke();
    const bl=project(x-hw+shift,y-hd,z0+rise),br=project(x+hw+shift,y-hd,z0+rise),fr=project(x+hw,y+hd,z0),fl=project(x-hw,y+hd,z0);
    poly([bl,br,fr,fl],'#1b4258');ctx.save();ctx.beginPath();ctx.moveTo(bl.x,bl.y);ctx.lineTo(br.x,br.y);ctx.lineTo(fr.x,fr.y);ctx.lineTo(fl.x,fl.y);ctx.closePath();ctx.clip();
    ctx.strokeStyle='#3f7a92';ctx.lineWidth=.8;for(let i=1;i<4;i++){const t=i/4;ctx.beginPath();ctx.moveTo(bl.x+(br.x-bl.x)*t,bl.y+(br.y-bl.y)*t);ctx.lineTo(fl.x+(fr.x-fl.x)*t,fl.y+(fr.y-fl.y)*t);ctx.stroke()}const ml=project(x-hw+shift*.5,(y-hd+y+hd)/2,z0+rise*.5),mr=project(x+hw+shift*.5,(y-hd+y+hd)/2,z0+rise*.5);ctx.beginPath();ctx.moveTo((bl.x+fl.x)/2,(bl.y+fl.y)/2);ctx.lineTo((br.x+fr.x)/2,(br.y+fr.y)/2);ctx.stroke();ctx.restore();
    ctx.save();ctx.globalAlpha=.2;ctx.fillStyle=accent||'#bfe6ff';poly([bl,br,project(x+hw*.4+shift,y-hd,z0+rise),project(x-hw*.4+shift,y-hd,z0+rise)]);ctx.restore();
  }
  // Stehender Gastank (Zylinder mit Kuppeldeckel).
  function drawGasTank(x,y,r,h){
    const b=project(x,y,0),t=project(x,y,h),rB=r*b.scale,ryB=r*.4*b.scale,rT=r*t.scale,ryT=r*.4*t.scale;drawSoftShadow(x,y,r*1.15,r*.5,h,.24);
    const bl={x:b.x-rB,y:b.y},br={x:b.x+rB,y:b.y},tr={x:t.x+rT,y:t.y},tl={x:t.x-rT,y:t.y};
    const g=ctx.createLinearGradient(bl.x,0,br.x,0);g.addColorStop(0,'#4c5754');g.addColorStop(.5,'#8c9895');g.addColorStop(1,'#3f4a49');
    ctx.beginPath();ctx.moveTo(tl.x,tl.y);ctx.lineTo(bl.x,bl.y);ctx.ellipse(b.x,b.y,rB,ryB,0,Math.PI,0,true);ctx.lineTo(tr.x,tr.y);ctx.ellipse(t.x,t.y,rT,ryT,0,0,Math.PI,true);ctx.closePath();ctx.fillStyle=g;ctx.fill();
    ctx.beginPath();ctx.ellipse(t.x,t.y,rT,ryT,0,0,Math.PI*2);ctx.fillStyle='#9ba6a2';ctx.fill();
    ctx.strokeStyle='rgba(30,40,40,.4)';ctx.lineWidth=1;for(const hz2 of [h*.35,h*.7]){const p=project(x,y,hz2);ctx.beginPath();ctx.ellipse(p.x,p.y,r*p.scale,r*.4*p.scale,0,0,Math.PI);ctx.stroke()}
  }
  function drawBase(){
    const previousStyle=industrialRendering;industrialRendering=true;const c=cellCenter(base),planet=activePlanet(),theme=planet.theme;
    const anchor=celestialAnchor(),leanX=Math.max(-1,Math.min(1,(anchor.x-c.x)/420)),mainR=28,mainH=40;
    // Hinten: Gastanks und zwei Solaranlagen, die sich zum Himmelskoerper neigen.
    drawGasTank(c.x-42,c.y-15,6,26);drawGasTank(c.x-33,c.y-17,5,21);
    drawSolarArray(c.x-70,c.y-2,leanX,theme.accent);drawSolarArray(c.x+70,c.y-3,leanX,theme.accent);
    // Getrennte Seitenkuppeln, ueber kurze Tunnel angebunden.
    drawTube(c.x-19,c.y+4,c.x-40,c.y+6,4,7,'#586460','#94a19c');drawTube(c.x+19,c.y+3,c.x+40,c.y+5,4,7,'#586460','#94a19c');
    drawDome(c.x-44,c.y+6,14,22,'#aeb8b3','#4a5755',theme.accent);drawDome(c.x+44,c.y+5,13,20,'#aeb8b3','#4a5755',theme.accent);
    // Hauptkuppel.
    drawDome(c.x,c.y,mainR,mainH,'#c4ccc7','#5c6a67',theme.accent);
    // Leuchtende Fenster auf der Vorderseite der Hauptkuppel.
    ctx.save();ctx.shadowColor=theme.accent;ctx.shadowBlur=5;for(const wx of [-13,-4.5,4.5,13]){const w=project(c.x+wx,c.y+9,13),ww=2.4*w.scale,wh=3.4*w.scale;ctx.fillStyle=Math.sin(sceneTime*.9+wx)>-.5?'#dff6ef':'#3a4a49';ctx.fillRect(w.x-ww/2,w.y-wh/2,ww,wh)}ctx.restore();ctx.shadowBlur=0;
    // Antenne, deren Fuss auf der Kuppel sitzt.
    const mastFoot=project(c.x+11,c.y-5,36),mastTop=project(c.x+12,c.y-5,62);ctx.strokeStyle='#727f7c';ctx.lineWidth=Math.max(2,3*mastFoot.scale);ctx.beginPath();ctx.moveTo(mastFoot.x,mastFoot.y);ctx.lineTo(mastTop.x,mastTop.y);ctx.stroke();ellipseAt(mastFoot,2.5,2.5,'#5c6866');const dish=project(c.x+12,c.y-5,55);ctx.fillStyle='#aebbb7';ctx.beginPath();ctx.ellipse(dish.x,dish.y,10*dish.scale,3.4*dish.scale,-.2,0,Math.PI*2);ctx.fill();const beacon=project(c.x+12,c.y-5,64);ctx.shadowColor=theme.accent;ctx.shadowBlur=7;ellipseAt(beacon,2.3,1.3,theme.accent);ctx.shadowBlur=0;
    // Vordere Luftschleuse, per Tunnel an die Hauptkuppel angebunden.
    drawTube(c.x,c.y+12,c.x,c.y+26,4,7,'#586460','#94a19c');drawDome(c.x,c.y+29,10,14,'#9aa5a1','#3d4a4b',theme.accent);const airlock=project(c.x,c.y+35,9);ctx.fillStyle='#16262b';ctx.fillRect(airlock.x-4.5,airlock.y-8,9,13);ctx.strokeStyle='#6a7876';ctx.lineWidth=1.2;ctx.strokeRect(airlock.x-4.5,airlock.y-8,9,13);ellipseAt(project(c.x,c.y+35,17),1.8,1,theme.accent);
    const label=project(c.x,c.y,76);ctx.font='700 9px Arial';ctx.textAlign='center';ctx.fillStyle=theme.light;ctx.fillText(`${planet.code} ASTRO OUTPOST`,label.x,label.y);const integrity=Math.max(0,state.integrity)/state.maxIntegrity,bar=project(c.x,c.y,88);ctx.fillStyle='#111d21';ctx.fillRect(bar.x-30,bar.y,60,5);ctx.fillStyle=integrity>.55?theme.accent:integrity>.25?'#d7a85a':'#e35f55';ctx.fillRect(bar.x-30,bar.y,60*integrity,5);
    if(state.integrity<70){ctx.save();const smokeCount=state.integrity<35?3:1;for(let i=0;i<smokeCount;i++){const drift=(sceneTime*12+i*17)%34,p=project(c.x-13+i*13+Math.sin(sceneTime*1.4+i)*5,c.y-3,55+drift);ctx.globalAlpha=.16+(1-drift/34)*.18;ellipseAt(p,7+drift*.16,3+drift*.08,'#283334')}ctx.restore()}if(state.baseFlash>.05){ctx.save();ctx.strokeStyle='#ff7768';ctx.globalAlpha=state.baseFlash;ctx.lineWidth=3;ellipseAt(project(c.x,c.y,6),50+state.baseFlash*20,18+state.baseFlash*5,'','#ff7768');ctx.restore()}industrialRendering=previousStyle;
  }
  function formatCombatNumber(value){const amount=Math.max(0,value||0);return amount>=1e6?(amount/1e6).toFixed(1)+'M':amount>=1e3?(amount/1e3).toFixed(1)+'K':Math.round(amount).toString()}
  function drawTestDepot(station){
    const previousStyle=industrialRendering;industrialRendering=true;const c=cellCenter(station.depot),tower=state.towers.find(t=>t.id===station.towerId),damage=tower?.damageDealt||0,dps=damage/Math.max(.01,state.testElapsed),hpRatio=station.depotHp/station.maxDepotHp,flash=station.hit||0,topColor=flash>.05?'#8b5d52':'#737b78';drawPlatform(c.x,c.y,21,5,'#46514f');drawBlock(c.x,c.y,31,25,5,17,{top:topColor,front:'#4b5553',side:'#343d3e',dark:'#272e30'});drawBlock(c.x+(station.index<4?-9:9),c.y+9,11,8,5,11,{top:'#848b86',front:'#30383a',side:'#252c2e',dark:'#202629'});const antennaBase=project(c.x+(station.index<4?10:-10),c.y-5,22),antennaTop=project(c.x+(station.index<4?10:-10),c.y-5,31);ctx.strokeStyle='#707975';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(antennaBase.x,antennaBase.y);ctx.lineTo(antennaTop.x,antennaTop.y);ctx.stroke();ellipseAt(antennaTop,1.7,1.7,flash>.05?'#c56f62':'#8b9a90');const bar=project(c.x,c.y,28);ctx.fillStyle='#1b2425';ctx.fillRect(bar.x-22,bar.y,44,3);ctx.fillStyle=hpRatio>.55?'#8eaa91':hpRatio>.25?'#c49c5c':'#c86b5e';ctx.fillRect(bar.x-22,bar.y,44*hpRatio,3);const label=project(c.x,c.y,40);ctx.globalAlpha=.86;ctx.fillStyle='#182221';ctx.fillRect(label.x-55,label.y-17,110,15);ctx.globalAlpha=1;ctx.textAlign='center';ctx.font='700 7px monospace';ctx.fillStyle='#d8e0d9';ctx.fillText(`DMG ${formatCombatNumber(damage)} · ${formatCombatNumber(dps)}/s`,label.x,label.y-10);ctx.fillStyle=station.depotDamage?'#e0ad83':'#aebbb2';ctx.fillText(`LAGER ${Math.ceil(station.depotHp)}/${station.maxDepotHp} · LECK ${station.leaks}`,label.x,label.y-3);industrialRendering=previousStyle;
  }
  function drawTowerVector(t){
    const c=cellCenter(t),visual=TOWER_VISUALS[t.type]||{accent:INDUSTRIAL.light,glow:false},ty={...types[t.type],color:visual.accent},stats=towerStats(t),low=false,dir=t.angle,dx=Math.cos(dir),dy=Math.sin(dir),nx=-dy,ny=dx,previousStyle=industrialRendering,chassis={rail:[23,7,'#4a5553'],drone:[25,6,'#505958'],rocket:[24,7,'#55584f'],mortar:[22,10,'#574e49'],laser:[20,8,'#484f52'],cryo:[21,9,'#465553'],gatling:[21,7,'#505350'],disruptor:[20,11,'#4a464c'],wall:[22,9,'#59685f']}[t.type]||[20,9,'#4f5d56'];industrialRendering=true;const deck=drawPlatform(c.x,c.y,chassis[0],chassis[1],chassis[2]);
    ctx.save();ctx.shadowBlur=0;ctx.lineCap='round';ctx.lineJoin='round';
    if(t.type==='wall'){const material={top:INDUSTRIAL.light,front:INDUSTRIAL.mid,side:INDUSTRIAL.dark,dark:INDUSTRIAL.black,stroke:null};drawBlock(c.x,c.y,42,18,8,18,material);for(const ox of [-17,17])drawBlock(c.x+ox,c.y,8,23,8,24,{top:INDUSTRIAL.pale,front:INDUSTRIAL.mid,side:INDUSTRIAL.dark,dark:INDUSTRIAL.black,stroke:null});ellipseAt(project(c.x,c.y+10,31),2.8,1.4,'#d7b65c');ctx.restore();industrialRendering=previousStyle;return}
    const stem=(height=29,width=11,color='#27322f')=>{const pivot=project(c.x,c.y,height);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(deck.x,deck.y);ctx.lineTo(pivot.x,pivot.y);ctx.stroke();return pivot},roundJoint=(point,r,fill)=>ellipseAt(point,r,r,fill),rotatingBand=(distance,sideOffset,halfWidth,z,width,color)=>{const a=project(c.x+dx*distance+nx*(sideOffset-halfWidth),c.y+dy*distance+ny*(sideOffset-halfWidth),z),b=project(c.x+dx*distance+nx*(sideOffset+halfWidth),c.y+dy*distance+ny*(sideOffset+halfWidth),z);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke()},carrier=(back,front,halfWidth,z,height,colors={top:'#747c7a',side:'#41494a',dark:'#2a3234'})=>{const bL=project(c.x+dx*back-nx*halfWidth,c.y+dy*back-ny*halfWidth,z),bR=project(c.x+dx*back+nx*halfWidth,c.y+dy*back+ny*halfWidth,z),fR=project(c.x+dx*front+nx*halfWidth,c.y+dy*front+ny*halfWidth,z+2),fL=project(c.x+dx*front-nx*halfWidth,c.y+dy*front-ny*halfWidth,z+2),tbL=project(c.x+dx*(back+2)-nx*(halfWidth-2),c.y+dy*(back+2)-ny*(halfWidth-2),z+height),tbR=project(c.x+dx*(back+2)+nx*(halfWidth-2),c.y+dy*(back+2)+ny*(halfWidth-2),z+height),tfR=project(c.x+dx*(front-2)+nx*(halfWidth-2),c.y+dy*(front-2)+ny*(halfWidth-2),z+height+1),tfL=project(c.x+dx*(front-2)-nx*(halfWidth-2),c.y+dy*(front-2)-ny*(halfWidth-2),z+height+1),leftTone=frameLightFromLeft?colors.side:colors.dark,rightTone=frameLightFromLeft?colors.dark:colors.side,topGradient=ctx.createLinearGradient(tbL.x,tbL.y,tfL.x,tfL.y);topGradient.addColorStop(0,'rgba(255,255,255,.14)');topGradient.addColorStop(.35,colors.top);topGradient.addColorStop(1,colors.top);poly([fL,fR,tfR,tfL],colors.side);poly([bR,fR,tfR,tbR],rightTone);poly([bL,fL,tfL,tbL],leftTone);poly([tbL,tbR,tfR,tfL],topGradient)};
    if(t.type==='rail'){
      const pivot=stem(low?34:36,low?11:13),rear=project(c.x-dx*22,c.y-dy*22,38),muzzle=project(c.x+dx*(low?47:52),c.y+dy*(low?47:52),39),railRear=project(c.x-dx*16+nx*7,c.y-dy*16+ny*7,31),railFront=project(c.x+dx*39+nx*7,c.y+dy*39+ny*7,33);carrier(-15,12,11,29,11,{top:'#717977',side:'#404849',dark:'#282f31'});ctx.strokeStyle='#22292c';ctx.lineWidth=low?7:9;ctx.beginPath();ctx.moveTo(rear.x,rear.y);ctx.lineTo(muzzle.x,muzzle.y);ctx.stroke();ctx.strokeStyle='#7c8481';ctx.lineWidth=2;ctx.stroke();ctx.strokeStyle='#3c4446';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(railRear.x,railRear.y);ctx.lineTo(railFront.x,railFront.y);ctx.stroke();roundJoint(pivot,low?7:8,'#555e5f');for(const distance of low?[18,38]:[10,25,40])rotatingBand(distance,0,6,38,3,'#8f9795');const opticBase=project(c.x+dx*12-nx*10,c.y+dy*12-ny*10,43),optic=project(c.x+dx*20-nx*10,c.y+dy*20-ny*10,43);ctx.strokeStyle='#303739';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(opticBase.x,opticBase.y);ctx.lineTo(optic.x,optic.y);ctx.stroke();roundJoint(optic,2.2,'#9f4e49');if(!low){const markingA=project(c.x-dx*7,c.y-dy*7,42),markingB=project(c.x+dx*3,c.y+dy*3,42);ctx.strokeStyle='#765648';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(markingA.x,markingA.y);ctx.lineTo(markingB.x,markingB.y);ctx.stroke()}
    }else if(t.type==='drone'){
      const hub=stem(24,low?9:11,'#41484a'),count=3;roundJoint(hub,8,'#596163');for(let i=0;i<count;i++){const a=-Math.PI/2+i*Math.PI*2/count,ux=Math.cos(a),uy=Math.sin(a),vx=-uy,vy=ux,px=c.x+ux*20,py=c.y+uy*20,inner=project(c.x+ux*8,c.y+uy*8,23),padBackL=project(px-ux*8-vx*7,py-uy*8-vy*7,22),padBackR=project(px-ux*8+vx*7,py-uy*8+vy*7,22),padFrontR=project(px+ux*8+vx*7,py+uy*8+vy*7,24),padFrontL=project(px+ux*8-vx*7,py+uy*8-vy*7,24),padLowerR=project(px+ux*8+vx*7,py+uy*8+vy*7,20),padLowerL=project(px+ux*8-vx*7,py+uy*8-vy*7,20),padCenter=project(px,py,25);ctx.strokeStyle='#4c5557';ctx.lineWidth=low?3:4;ctx.beginPath();ctx.moveTo(hub.x,hub.y);ctx.lineTo(inner.x,inner.y);ctx.stroke();poly([padLowerL,padLowerR,padFrontR,padFrontL],'#2e3638');poly([padBackL,padBackR,padFrontR,padFrontL],i===0?'#697172':'#4a5254');roundJoint(padCenter,1.5,i===0?'#8c654f':'#7d8583')}if(!low){const mastBase=project(c.x-5,c.y+3,29),mast=project(c.x-5,c.y+3,42),sweep=project(c.x-5+Math.cos(sceneTime*2.4)*8,c.y+3+Math.sin(sceneTime*2.4)*8,42);ctx.strokeStyle='#777f7e';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(mastBase.x,mastBase.y);ctx.lineTo(mast.x,mast.y);ctx.lineTo(sweep.x,sweep.y);ctx.stroke();roundJoint(mast,2.5,'#9ba19f')}
    }else if(t.type==='rocket'){
      const pivot=stem(31,13,'#444940'),carrierBackL=project(c.x-dx*14-nx*17,c.y-dy*14-ny*17,31),carrierBackR=project(c.x-dx*14+nx*17,c.y-dy*14+ny*17,31),carrierFrontR=project(c.x+dx*13+nx*17,c.y+dy*13+ny*17,37),carrierFrontL=project(c.x+dx*13-nx*17,c.y+dy*13-ny*17,37),carrierTopL=project(c.x-dx*10-nx*15,c.y-dy*10-ny*15,42),carrierTopR=project(c.x-dx*10+nx*15,c.y-dy*10+ny*15,42),carrierNoseR=project(c.x+dx*10+nx*15,c.y+dy*10+ny*15,43),carrierNoseL=project(c.x+dx*10-nx*15,c.y+dy*10-ny*15,43);roundJoint(pivot,10,'#555c50');poly([carrierBackL,carrierBackR,carrierFrontR,carrierFrontL],'#383f3d');poly([carrierBackL,carrierFrontL,carrierNoseL,carrierTopL],'#292f2f');poly([carrierTopL,carrierTopR,carrierNoseR,carrierNoseL],'#69706a');for(const offset of [-10,0,10]){const tail=project(c.x+nx*offset-dx*10,c.y+ny*offset-dy*10,40),nose=project(c.x+nx*offset+dx*29,c.y+ny*offset+dy*29,45);ctx.strokeStyle='#353a37';ctx.lineWidth=low?8:10;ctx.beginPath();ctx.moveTo(tail.x,tail.y);ctx.lineTo(nose.x,nose.y);ctx.stroke();roundJoint(nose,3.5,'#8d866f');if(!low){for(const distance of [1,16])rotatingBand(distance,offset,5,43,3,'#77796d');const warningA=project(c.x+nx*offset-dx*5,c.y+ny*offset-dy*5,44),warningB=project(c.x+nx*offset+dx*1,c.y+ny*offset+dy*1,44);ctx.strokeStyle='#a38848';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(warningA.x,warningA.y);ctx.lineTo(warningB.x,warningB.y);ctx.stroke()}}
    }else if(t.type==='mortar'){
      const pivot=stem(25,13,'#403c39'),baseRing=project(c.x-dx*3,c.y-dy*3,34),middleRing=project(c.x+dx*11,c.y+dy*11,43),orb=project(c.x+dx*24,c.y+dy*24,53),canister=project(c.x-dx*5-nx*14,c.y-dy*5-ny*14,31),hoseJoint=project(c.x+dx*4-nx*8,c.y+dy*4-ny*8,38);carrier(-12,8,14,20,11,{top:'#716864',side:'#49413e',dark:'#2f2b2a'});ctx.strokeStyle='#5e4840';ctx.lineWidth=low?5:7;ctx.beginPath();ctx.moveTo(pivot.x,pivot.y);ctx.lineTo(orb.x,orb.y);ctx.stroke();roundJoint(baseRing,low?12:15,'#62554f');roundJoint(baseRing,low?7:9,'#282d2e');roundJoint(middleRing,low?7:9,'#70615b');roundJoint(middleRing,low?3.5:5,'#282d2e');roundJoint(orb,low?4.5:6,ty.color);roundJoint(canister,low?5:6,'#4a5251');ctx.strokeStyle='#2e3536';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(canister.x,canister.y);ctx.lineTo(hoseJoint.x,hoseJoint.y);ctx.stroke();if(!low){const warning=project(c.x-dx*5-nx*14,c.y-dy*5-ny*14,34);roundJoint(warning,1.5,'#936047')}
    }else if(t.type==='laser'){
      const pivot=stem(31,11,'#343943'),bodyBackL=project(c.x-dx*8-nx*13,c.y-dy*8-ny*13,35),bodyBackR=project(c.x-dx*8+nx*13,c.y-dy*8+ny*13,35),bodyFrontR=project(c.x+dx*13+nx*13,c.y+dy*13+ny*13,40),bodyFrontL=project(c.x+dx*13-nx*13,c.y+dy*13-ny*13,40),bodyTopL=project(c.x-dx*5-nx*11,c.y-dy*5-ny*11,45),bodyTopR=project(c.x-dx*5+nx*11,c.y-dy*5+ny*11,45),bodyNoseR=project(c.x+dx*11+nx*11,c.y+dy*11+ny*11,45),bodyNoseL=project(c.x+dx*11-nx*11,c.y+dy*11-ny*11,45),lens=project(c.x+dx*4,c.y+dy*4,48);roundJoint(pivot,9,'#41484c');poly([bodyBackL,bodyBackR,bodyFrontR,bodyFrontL],'#343b40');poly([bodyBackL,bodyFrontL,bodyNoseL,bodyTopL],'#252c31');poly([bodyTopL,bodyTopR,bodyNoseR,bodyNoseL],'#697174');for(const side of [-1,1]){const start=project(c.x+dx*9+nx*side*8,c.y+dy*9+ny*side*8,43),tip=project(c.x+dx*36+nx*side*8,c.y+dy*36+ny*side*8,43);ctx.strokeStyle='#41494e';ctx.lineWidth=low?5:7;ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(tip.x,tip.y);ctx.stroke();roundJoint(tip,2.5,'#252b2e')}roundJoint(lens,low?4:5,'#d9dedc');ctx.strokeStyle='#b84e54';ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(lens.x-4,lens.y);ctx.lineTo(lens.x+4,lens.y);ctx.moveTo(lens.x,lens.y-3);ctx.lineTo(lens.x,lens.y+3);ctx.stroke();const chargeWindow=Math.min(.13,stats.rate*.72);if(t.cool>0&&t.cool<chargeWindow){const charge=1-t.cool/chargeWindow,side=t.salvo%2?1:-1,from=9+charge*27,pulse=project(c.x+dx*from+nx*side*8,c.y+dy*from+ny*side*8,43);ctx.save();ctx.globalAlpha=.35+charge*.65;ctx.shadowColor='#ff6b6f';ctx.shadowBlur=8;roundJoint(pulse,3,'#fff1dc');ctx.restore()}
    }else if(t.type==='cryo'){
      const core=stem(31,12,'#344143'),bridge=project(c.x+dx*8,c.y+dy*8,40),muzzle=project(c.x+dx*41,c.y+dy*41,47);carrier(-11,11,11,29,10,{top:'#707a78',side:'#44504f',dark:'#2d3637'});roundJoint(core,low?8:10,'#52605f');ctx.strokeStyle='#4b5859';ctx.lineWidth=low?7:9;ctx.beginPath();ctx.moveTo(core.x,core.y);ctx.lineTo(muzzle.x,muzzle.y);ctx.stroke();ctx.strokeStyle='#667573';ctx.lineWidth=1.2;ctx.stroke();for(const side of [-1,1]){const size=side<0?(low?5:6):(low?3.5:4.5),pod=project(c.x+nx*side*(side<0?14:10)-dx*4,c.y+ny*side*(side<0?14:10)-dy*4,33),joint=project(c.x+nx*side*7+dx*8,c.y+ny*side*7+dy*8,39);ctx.strokeStyle='#626e6d';ctx.lineWidth=side<0?(low?5:7):(low?3:5);ctx.beginPath();ctx.moveTo(pod.x,pod.y);ctx.lineTo(joint.x,joint.y);ctx.lineTo(bridge.x,bridge.y);ctx.stroke();roundJoint(pod,size,'#3d4747')}const crystalTop={x:muzzle.x,y:muzzle.y-6},crystalBottom={x:muzzle.x,y:muzzle.y+6};ctx.fillStyle='#687574';ctx.beginPath();ctx.moveTo(muzzle.x+7,muzzle.y);ctx.lineTo(crystalTop.x,crystalTop.y);ctx.lineTo(muzzle.x-5,muzzle.y);ctx.lineTo(crystalBottom.x,crystalBottom.y);ctx.closePath();ctx.fill();ctx.save();ctx.shadowColor=ty.color;ctx.shadowBlur=low?3:6;roundJoint(muzzle,2.2,ty.color);ctx.restore();
    }else if(t.type==='gatling'){
      const pivot=stem(31,12,'#494b48'),start=project(c.x-dx*5,c.y-dy*5,39),tip=project(c.x+dx*39,c.y+dy*39,43),boxBackL=project(c.x-dx*10-nx*15,c.y-dy*10-ny*15,29),boxBackR=project(c.x-dx*10-nx*5,c.y-dy*10-ny*5,29),boxFrontR=project(c.x+dx*8-nx*5,c.y+dy*8-ny*5,37),boxFrontL=project(c.x+dx*8-nx*15,c.y+dy*8-ny*15,37),boxTopL=project(c.x-dx*7-nx*14,c.y-dy*7-ny*14,43),boxTopR=project(c.x-dx*7-nx*6,c.y-dy*7-ny*6,43);roundJoint(pivot,9,'#565c58');poly([boxBackL,boxBackR,boxFrontR,boxFrontL],'#303739');poly([boxBackL,boxFrontL,boxTopR,boxTopL],'#4e5757');ctx.save();ctx.lineCap='butt';ctx.strokeStyle='#414846';ctx.lineWidth=low?10:13;ctx.beginPath();ctx.moveTo(start.x,start.y);ctx.lineTo(tip.x,tip.y);ctx.stroke();ctx.strokeStyle='#89918d';ctx.lineWidth=1.5;ctx.stroke();const travel=t.cool>0?(sceneTime*8)%1:.38,side=6-travel*12,bandStart=project(c.x-dx*5+nx*side,c.y-dy*5+ny*side,40),bandEnd=project(c.x+dx*39+nx*side,c.y+dy*39+ny*side,43);ctx.strokeStyle=t.cool>0?'#a58b58':'#707975';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(bandStart.x,bandStart.y);ctx.lineTo(bandEnd.x,bandEnd.y);ctx.stroke();ctx.restore();roundJoint(tip,low?4:5,'#202725');
    }else if(t.type==='disruptor'){
      const pivot=stem(31,11,'#3b4042'),core=project(c.x+dx*4,c.y+dy*4,42),rear=project(c.x-dx*8,c.y-dy*8,39);carrier(-12,8,12,28,10,{top:'#686c6e',side:'#414649',dark:'#292e31'});roundJoint(pivot,9,'#555d5f');ctx.strokeStyle='#363e41';ctx.lineWidth=low?8:10;ctx.beginPath();ctx.moveTo(rear.x,rear.y);ctx.lineTo(core.x,core.y);ctx.stroke();for(const side of [-1,1]){const shoulder=project(c.x+dx*5+nx*side*7,c.y+dy*5+ny*side*7,42),tip=project(c.x+dx*24+nx*side*14,c.y+dy*24+ny*side*14,46);ctx.strokeStyle=side<0?'#697173':'#4b5355';ctx.lineWidth=low?6:8;ctx.beginPath();ctx.moveTo(shoulder.x,shoulder.y);ctx.lineTo(tip.x,tip.y);ctx.stroke();roundJoint(tip,3,'#77807f')}roundJoint(core,low?5:7,'#343a3c');roundJoint(core,low?2.5:3.5,'#9a78a1');if(!low&&t.cool<stats.rate*.35){ctx.save();ctx.strokeStyle='#a885af';ctx.globalAlpha=.45;ctx.lineWidth=1.5;const left=project(c.x+dx*23-nx*13,c.y+dy*23-ny*13,46),right=project(c.x+dx*23+nx*13,c.y+dy*23+ny*13,46);ctx.beginPath();ctx.moveTo(left.x,left.y);ctx.lineTo(core.x+3,core.y-2);ctx.lineTo(right.x,right.y);ctx.stroke();ctx.restore()}
    }
    const status=project(c.x-12,c.y+12,15);ctx.shadowBlur=visual.glow?4:0;ellipseAt(status,2.4,1.2,t.cool>0?'#9c8152':'#789083');if(stats.total){const badge=project(c.x,c.y,61);for(let i=0;i<stats.total;i++){ctx.fillStyle=INDUSTRIAL.light;ctx.globalAlpha=.38+i/stats.total*.22;ctx.fillRect(badge.x-stats.total*2+i*4,badge.y,3,2)}}ctx.restore();industrialRendering=previousStyle;
  }
  const DRONE_NEST_SPRITE_SIZE=160,DRONE_NEST_PHASES=8,droneNestSpriteCache=new Map();
  function getDroneNestSprite(t){
    const phaseIndex=((Math.floor(sceneTime*2.4/(Math.PI*2)*DRONE_NEST_PHASES)%DRONE_NEST_PHASES)+DRONE_NEST_PHASES)%DRONE_NEST_PHASES,tuning=progress.upgrades.drone,total=tuning.power+tuning.rate+tuning.range,key=`${activePlanetId}:${total}:${phaseIndex}:${frameLightFromLeft?'L':'R'}`,cached=droneNestSpriteCache.get(key);if(cached)return cached;if(droneNestSpriteCache.size>63)droneNestSpriteCache.clear();
    const sprite=document.createElement('canvas');sprite.width=sprite.height=DRONE_NEST_SPRITE_SIZE*DPR;const paint=sprite.getContext('2d'),fake={...t,x:9,y:6,angle:0,cool:0,pulse:0},center=cellCenter(fake),anchor=project(center.x,center.y,0),anchorX=DRONE_NEST_SPRITE_SIZE/2,anchorY=112,previousCtx=ctx,previousTime=sceneTime,previousDetail=renderDetail,previousStyle=industrialRendering;paint.setTransform(DPR,0,0,DPR,(anchorX-anchor.x)*DPR,(anchorY-anchor.y)*DPR);ctx=paint;sceneTime=phaseIndex/DRONE_NEST_PHASES*Math.PI*2/2.4;renderDetail=2;try{drawTowerVector(fake)}finally{ctx=previousCtx;sceneTime=previousTime;renderDetail=previousDetail;industrialRendering=previousStyle}sprite._spriteAnchor={x:anchorX,y:anchorY,scale:anchor.scale};droneNestSpriteCache.set(key,sprite);return sprite;
  }
  function drawTower(t){
    if(t.type!=='drone'||t.id===-1)drawTowerVector(t);else{const c=cellCenter(t),anchor=project(c.x,c.y,0),sprite=getDroneNestSprite(t),meta=sprite._spriteAnchor,scale=anchor.scale/meta.scale;ctx.drawImage(sprite,anchor.x-meta.x*scale,anchor.y-meta.y*scale,DRONE_NEST_SPRITE_SIZE*scale,DRONE_NEST_SPRITE_SIZE*scale)}
    if(t.jam){const c=cellCenter(t),p=project(c.x,c.y,36);ctx.save();ctx.globalAlpha=.35+.25*Math.sin(sceneTime*9+t.id);ctx.strokeStyle='#f3c1ff';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(p.x,p.y,15,6.5,0,0,Math.PI*2);ctx.stroke();ctx.restore()}
  }
  function drawDrone(d){
    const previousStyle=industrialRendering;industrialRendering=true;const p=project(d.x,d.y,d.z),sprite=getDroneSprite(d.angle,d.bank||0),geometry=sprite._droneGeometry,scale=p.scale,toScreen=local=>({x:p.x+(local.x-DRONE_SPRITE_SIZE/2)*scale,y:p.y+(local.y-DRONE_SPRITE_SIZE/2)*scale}),color=types.drone.color;drawFastShadow(d.x,d.y,13,5,d.z,.22);ctx.save();ctx.shadowBlur=0;if(d.mode!=='dock'){const leftPod=toScreen(geometry.leftPod),rightPod=toScreen(geometry.rightPod),leftExhaust=toScreen(geometry.leftExhaust),rightExhaust=toScreen(geometry.rightExhaust);ctx.strokeStyle=d.mode==='chase'?'#c8bfff':'#69eaff';ctx.globalAlpha=.72;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(leftPod.x,leftPod.y);ctx.lineTo(leftExhaust.x,leftExhaust.y);ctx.moveTo(rightPod.x,rightPod.y);ctx.lineTo(rightExhaust.x,rightExhaust.y);ctx.stroke()}ctx.globalAlpha=1;ctx.drawImage(sprite,p.x-DRONE_SPRITE_SIZE*.5*scale,p.y-DRONE_SPRITE_SIZE*.5*scale,DRONE_SPRITE_SIZE*scale,DRONE_SPRITE_SIZE*scale);ctx.fillStyle=d.mode==='chase'?'#e3b761':d.mode==='return'?'#75b8bd':'#8fc2aa';ctx.fillRect(p.x-1.5,p.y-1.5,3,3);ctx.restore();
    if(renderDetail>1&&d.index===0&&d.mode==='chase'&&d.target&&d.target.hp>0){const lock=project(d.target.x,d.target.y,22);ctx.save();ctx.globalAlpha=.2;ctx.strokeStyle=color;ctx.setLineDash([3,7]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(lock.x,lock.y);ctx.stroke();ctx.setLineDash([]);ctx.restore()}industrialRendering=previousStyle;
  }
  function drawMechanicalEnemyVector(e,bodyOnly=false){
    const previousStyle=industrialRendering;industrialRendering=true;const def=enemyTypes[e.kind],model=def.model,color=e.hit?'#efffff':e.color,bob=Math.sin(e.phase)*2,p=project(e.x,e.y,model==='drone'?25+bob:12),litFace=frameLightFromLeft?'#747e7e':'#343c40',shadowFace=frameLightFromLeft?'#343c40':'#747e7e',roundJoint=(point,r,fill)=>ellipseAt(point,r,r,fill);if(!bodyOnly)drawSoftShadow(e.x,e.y,e.r*1.5,e.r*.55,model==='drone'?25:14,.38);ctx.save();ctx.strokeStyle='#263338';ctx.fillStyle='#52636a';ctx.lineWidth=3;
    if(model==='drone'&&e.kind==='shard'){
      const shell=e.hit?'#efffff':'#737d80',panel='#3e494d',edge='#9ba5a6';ellipseAt(p,e.r+7,7,shell,edge);ellipseAt(project(e.x,e.y,30+bob),e.r*.62,4,'#9aa1a0','#c5ccca');for(const side of [-1,1]){const wing=project(e.x+side*(e.r+8),e.y,24+bob),pod=project(e.x+side*(e.r+13),e.y+1,21+bob);ctx.strokeStyle='#596468';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(wing.x,wing.y);ctx.lineTo(pod.x,pod.y);ctx.stroke();ellipseAt(pod,5,3,panel,edge);ellipseAt({x:pod.x+side*1.5,y:pod.y},1.3,.9,side<0?'#e26762':'#70bde2')}ctx.strokeStyle='#313b3e';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(p.x-e.r*.65,p.y-1);ctx.lineTo(p.x+e.r*.65,p.y-1);ctx.moveTo(p.x,p.y-5);ctx.lineTo(p.x,p.y+4);ctx.stroke();for(const offset of [-7,0,7])ellipseAt({x:p.x+offset,y:p.y+3},1,.7,'#c4c9c7','#222a2c');if(!bodyOnly){const blink=project(e.x,e.y+3,25+bob);ellipseAt(blink,2.5,1.5,Math.sin(sceneTime*5)>0?'#d95d55':'#582b2b','#f0aaa2')}
    }else if(model==='drone'&&e.kind==='runner'){
      const angle=e.angle||0,fx=Math.cos(angle),fy=Math.sin(angle),sx=-fy,sy=fx,point=(forward,side,z)=>project(e.x+fx*forward+sx*side,e.y+fy*forward+sy*side,z),bodyZ=25+bob,nose=point(e.r+11,0,bodyZ+1),tail=point(-e.r-7,0,bodyZ),left=point(-2,-e.r-10,bodyZ-2),right=point(-2,e.r+10,bodyZ-2),top=point(2,0,bodyZ+7);poly([tail,left,top],shadowFace);poly([left,nose,top],litFace);poly([nose,right,top],frameLightFromLeft?'#505a5d':'#667072');poly([right,tail,top],frameLightFromLeft?'#283034':'#4b5557');for(const side of [-1,1]){const finRoot=point(-4,side*(e.r+4),bodyZ),finTip=point(-11,side*(e.r+13),bodyZ-2);ctx.strokeStyle='#596366';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(finRoot.x,finRoot.y);ctx.lineTo(finTip.x,finTip.y);ctx.stroke()}roundJoint(nose,1.8,'#a85b50');const exhaust=point(-e.r-7,0,bodyZ);roundJoint(exhaust,2,'#8b866a');
    }else if(model==='drone'){
      const angle=e.angle||0,fx=Math.cos(angle),fy=Math.sin(angle),sx=-fy,sy=fx,point=(forward,side,z)=>project(e.x+fx*forward+sx*side,e.y+fy*forward+sy*side,z),bodyZ=23+bob,nose=point(e.r+7,0,bodyZ),tail=point(-e.r-5,0,bodyZ),left=point(0,-e.r-5,bodyZ-1),right=point(0,e.r+5,bodyZ-1),top=point(-1,0,bodyZ+5);poly([tail,left,top],'#30383b');poly([left,nose,top],'#667072');poly([nose,right,top],'#444e51');poly([right,tail,top],'#262e31');const sensor=point(e.r+4,0,bodyZ+1);roundJoint(sensor,1.4,'#9b5650');for(const side of [-1,1]){const thruster=point(-e.r-3,side*3,bodyZ-1);roundJoint(thruster,1.6,'#777b68')}
    }else if(model==='tank'){
      const angle=e.angle||0,fx=Math.cos(angle),fy=Math.sin(angle),sx=-fy,sy=fx,point=(forward,side,z)=>project(e.x+fx*forward+sx*side,e.y+fy*forward+sy*side,z),halfLength=e.elite?29:25,halfWidth=e.elite?14:12;
      for(const side of [-1,1]){const trackBack=point(-halfLength+3,side*halfWidth,5),trackFront=point(halfLength-3,side*halfWidth,5);ctx.strokeStyle='#202629';ctx.lineWidth=e.elite?9:8;ctx.beginPath();ctx.moveTo(trackBack.x,trackBack.y);ctx.lineTo(trackFront.x,trackFront.y);ctx.stroke();for(const forward of [-halfLength+7,0,halfLength-7]){const wheel=point(forward,side*halfWidth,5);ellipseAt(wheel,e.elite?4.3:3.8,e.elite?4:3.5,'#4d5556');ellipseAt(wheel,1.4,1.4,'#929997')}ctx.strokeStyle='#777f7e';ctx.lineWidth=1;for(let i=0;i<5;i++){const forward=-halfLength+5+i*(halfLength*2-10)/4,tread=point(forward,side*halfWidth,8);ctx.beginPath();ctx.moveTo(tread.x+sx*2,tread.y+sy);ctx.lineTo(tread.x-sx*2,tread.y-sy);ctx.stroke()}}
      const bodyHalfWidth=halfWidth*.78,rearL=point(-halfLength+2,-bodyHalfWidth,9),rearR=point(-halfLength+2,bodyHalfWidth,9),frontL=point(halfLength-2,-bodyHalfWidth,9),frontR=point(halfLength-2,bodyHalfWidth,9),topRearL=point(-halfLength+2,-bodyHalfWidth,21),topRearR=point(-halfLength+2,bodyHalfWidth,21),topFrontL=point(halfLength-2,-bodyHalfWidth,21),topFrontR=point(halfLength-2,bodyHalfWidth,21);poly([rearL,rearR,frontR,frontL],'#293134');poly([rearL,frontL,topFrontL,topRearL],'#3d4648');poly([frontR,rearR,topRearR,topFrontR],'#30383a');poly([topRearL,topRearR,topFrontR,topFrontL],'#697274');poly([frontL,frontR,topFrontR,topFrontL],'#596264');poly([rearR,rearL,topRearL,topRearR],'#252d30');const bumperL=point(halfLength+1,-bodyHalfWidth,11),bumperR=point(halfLength+1,bodyHalfWidth,11);ctx.strokeStyle='#303739';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(bumperL.x,bumperL.y);ctx.lineTo(bumperR.x,bumperR.y);ctx.stroke();const panelA=point(-10,-bodyHalfWidth-1,17),panelB=point(7,-bodyHalfWidth-1,17);ctx.strokeStyle='#765348';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(panelA.x,panelA.y);ctx.lineTo(panelB.x,panelB.y);ctx.stroke();
      const turretContact=point(1,0,23),turret=point(1,0,27),barrelEnd=point(halfLength+17,0,29);roundJoint(turretContact,e.elite?12:10,'#252c2e');ellipseAt(turret,e.elite?11:9,5,'#596264');ctx.strokeStyle='#303638';ctx.lineWidth=e.elite?7:6;ctx.beginPath();ctx.moveTo(turret.x,turret.y);ctx.lineTo(barrelEnd.x,barrelEnd.y);ctx.stroke();const sight=point(7,-5,31);ellipseAt(sight,1.8,1.1,'#a9574f');if(e.elite){const mast=point(-8,6,34),antenna=point(-8,6,46);ctx.strokeStyle='#737b79';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(mast.x,mast.y);ctx.lineTo(antenna.x,antenna.y);ctx.stroke();ellipseAt(antenna,1.4,.8,'#9e4d48');const sensor=point(-4,-8,32);ellipseAt(sensor,4,2,'#30383a');ellipseAt(sensor,1.3,.8,'#aa5a50')}
    }else{
      const angle=e.angle||0,fx=Math.cos(angle),fy=Math.sin(angle),sx=-fy,sy=fx,point=(forward,side,z)=>project(e.x+fx*forward+sx*side,e.y+fy*forward+sy*side,z),bodyZ=27+bob;for(const side of [-1,1])for(const front of [-1,1]){const step=Math.sin(e.phase+side+front)*3,hip=point(front*6,side*e.r*.62,18+bob),knee=point(front*9+step,side*(e.r+5),9),foot=point(front*13+step,side*(e.r+9),1);ctx.strokeStyle='#30383a';ctx.lineWidth=e.kind==='splitter'?4:3;ctx.beginPath();ctx.moveTo(hip.x,hip.y);ctx.lineTo(knee.x,knee.y);ctx.lineTo(foot.x,foot.y);ctx.stroke();ellipseAt(hip,3.5,2.5,'#737b7a');ellipseAt(knee,3,2.4,'#555d5e');ellipseAt(foot,4,2,'#303638')}const rear=point(-11,0,bodyZ),front=point(13,0,bodyZ),left=point(0,-e.r*.72,bodyZ),right=point(0,e.r*.72,bodyZ),top=point(-1,0,bodyZ+10),bodyContact=point(-1,0,bodyZ-2);roundJoint(bodyContact,e.r*.62,'#252d30');poly([rear,left,top],'#353d40');poly([left,front,top],'#6b7475');poly([front,right,top],'#4b5557');poly([right,rear,top],'#293134');const stripeA=point(-6,-e.r*.73,bodyZ+2),stripeB=point(5,-e.r*.73,bodyZ+2);ctx.strokeStyle='#765348';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(stripeA.x,stripeA.y);ctx.lineTo(stripeB.x,stripeB.y);ctx.stroke();if(e.kind==='regenerator'){const packBack=point(-14,-7,bodyZ+2),packFront=point(-5,-7,bodyZ+3),packTop=point(-10,-7,bodyZ+13);poly([packBack,packFront,packTop],'#596362');const boomBase=point(-8,7,bodyZ+8),boomElbow=point(-14,15,bodyZ+14),tool=point(-2,19,bodyZ+9);ctx.strokeStyle='#737c7a';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(boomBase.x,boomBase.y);ctx.lineTo(boomElbow.x,boomElbow.y);ctx.lineTo(tool.x,tool.y);ctx.stroke();roundJoint(boomElbow,3,'#41494a');roundJoint(tool,2.5,'#6f8975');roundJoint(packTop,1.5,'#77907d')}else{const rackL=point(-8,-e.r-8,bodyZ+10),rackR=point(-8,e.r+8,bodyZ+10);ctx.strokeStyle='#525b5c';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(rackL.x,rackL.y);ctx.lineTo(rackR.x,rackR.y);ctx.stroke();for(const side of [-1,1]){const cage=point(-7,side*(e.r+7),bodyZ+10),brace=point(1,side*(e.r+4),bodyZ+5);roundJoint(cage,5,'#343c3f');ctx.strokeStyle='#727a79';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cage.x,cage.y);ctx.lineTo(brace.x,brace.y);ctx.stroke()}const sensor=point(8,0,bodyZ+5);roundJoint(sensor,2.5,'#9e514c')}
    }
    if(bodyOnly){ctx.restore();industrialRendering=previousStyle;return}if(e.shield>0){ctx.globalAlpha=.35;ellipseAt(project(e.x,e.y,22),e.r+10,13,'rgba(213,140,255,.08)')}ctx.restore();industrialRendering=previousStyle;const hp=project(e.x,e.y,model==='drone'?46+bob:47),w=e.elite?44:32;ctx.fillStyle='#031017';ctx.fillRect(hp.x-w/2,hp.y,w,4);ctx.fillStyle=e.hp/e.maxHp>.35?'#55f3b4':'#ff6268';ctx.fillRect(hp.x-w/2,hp.y,w*Math.max(0,e.hp/e.maxHp),4);
  }
  const ENEMY_ANGLE_STEPS=72,mechanicalEnemySpriteCache=new Map();
  function getMechanicalEnemySprite(e){
    const model=enemyTypes[e.kind].model,steps=e.kind==='shard'?1:ENEMY_ANGLE_STEPS,angleIndex=steps===1?0:((Math.round((e.angle||0)/(Math.PI*2)*steps)%steps)+steps)%steps,hit=e.kind==='shard'&&e.hit>0?1:0,key=`${e.kind}:${angleIndex}:${hit}:${frameLightFromLeft?'L':'R'}`,cached=mechanicalEnemySpriteCache.get(key);if(cached)return cached;if(mechanicalEnemySpriteCache.size>479)mechanicalEnemySpriteCache.clear();
    const size=model==='tank'?160:96,anchorX=size/2,anchorY=model==='tank'?98:60,sprite=document.createElement('canvas');sprite.width=sprite.height=size;const paint=sprite.getContext('2d'),fake={...e,x:W/2,y:H/2,angle:angleIndex/steps*Math.PI*2,phase:0,hit:hit ? .1 : 0,shield:0},worldAnchor=project(fake.x,fake.y,0),previousCtx=ctx,previousDetail=renderDetail,previousStyle=industrialRendering;paint.setTransform(1,0,0,1,anchorX-worldAnchor.x,anchorY-worldAnchor.y);ctx=paint;renderDetail=2;try{drawMechanicalEnemyVector(fake,true)}finally{ctx=previousCtx;renderDetail=previousDetail;industrialRendering=previousStyle}sprite._spriteAnchor={x:anchorX,y:anchorY,scale:worldAnchor.scale};mechanicalEnemySpriteCache.set(key,sprite);return sprite;
  }
  function drawMechanicalEnemy(e){
    const model=enemyTypes[e.kind].model;if(model!=='tank'&&model!=='drone'){drawMechanicalEnemyVector(e);return}const bob=model==='drone'?Math.sin(e.phase)*2:0,sprite=getMechanicalEnemySprite(e),meta=sprite._spriteAnchor,anchor=project(e.x,e.y,bob),scale=anchor.scale/meta.scale,previousStyle=industrialRendering;drawFastShadow(e.x,e.y,e.r*1.5,e.r*.55,model==='drone'?25:14,.38);ctx.drawImage(sprite,anchor.x-meta.x*scale,anchor.y-meta.y*scale,sprite.width*scale,sprite.height*scale);industrialRendering=true;if(e.kind==='shard'){const blink=project(e.x,e.y+3,25+bob);ellipseAt(blink,2.5,1.5,Math.sin(sceneTime*5)>0?'#d95d55':'#582b2b')}if(e.shield>0){ctx.save();ctx.globalAlpha=.35;ellipseAt(project(e.x,e.y,22),e.r+10,13,'rgba(213,140,255,.08)');ctx.restore()}industrialRendering=previousStyle;const hp=project(e.x,e.y,model==='drone'?46+bob:47),w=e.elite?44:32;ctx.fillStyle='#031017';ctx.fillRect(hp.x-w/2,hp.y,w,4);ctx.fillStyle=e.hp/e.maxHp>.35?'#55f3b4':'#ff6268';ctx.fillRect(hp.x-w/2,hp.y,w*Math.max(0,e.hp/e.maxHp),4);
  }
  function drawEnemy(e){
    const wobble=e.wobble>0?Math.min(1,e.wobble/.32):0;if(wobble){ctx.save();ctx.translate((Math.random()-.5)*wobble*6,(Math.random()-.5)*wobble*4.5)}
    if(enemyTypes[e.kind].model){drawMechanicalEnemy(e);if(wobble)ctx.restore();return}
    const bob=6+Math.sin(e.phase)*3,h=e.elite?50:e.kind==='armored'?43:e.kind==='runner'||e.kind==='splinter'?27:e.kind==='splitter'?41:35,ground=project(e.x,e.y,1),top=project(e.x,e.y,h+bob),l=project(e.x-e.r,e.y,7+bob),r=project(e.x+e.r,e.y,7+bob),front=project(e.x,e.y+e.r*.7,5+bob),back=project(e.x,e.y-e.r*.55,9+bob),baseColor=e.color||enemyTypes[e.kind].color,color=e.hit?'#efffff':baseColor;
    drawSoftShadow(e.x,e.y,e.r*1.45,e.r*.56,h+bob,.38);if(renderDetail>0){ctx.save();ctx.strokeStyle=e.kind==='armored'?'#293a36':'#334a42';ctx.lineWidth=e.elite?3:2;for(let i=0;i<4;i++){const side=i<2?-1:1,frontLeg=i%2?1:-1,hip=project(e.x+side*e.r*.55,e.y+frontLeg*e.r*.15,9+bob),knee=project(e.x+side*e.r*1.05,e.y+frontLeg*e.r*.48,5+bob),foot=project(e.x+side*e.r*(1.15+.08*Math.sin(e.phase+i)),e.y+frontLeg*e.r*.9,1);ctx.beginPath();ctx.moveTo(hip.x,hip.y);ctx.lineTo(knee.x,knee.y);ctx.lineTo(foot.x,foot.y);ctx.stroke()}ctx.restore()}ctx.save();ctx.shadowColor=baseColor;ctx.shadowBlur=renderDetail===0?0:e.elite?6:2;if(renderDetail>1&&e.kind==='runner'){ctx.globalAlpha=.14;for(let i=1;i<=3;i++){const trail=project(e.x-i*9,e.y,13+bob);ctx.strokeStyle=baseColor;ctx.lineWidth=4-i*.7;ctx.beginPath();ctx.moveTo(trail.x,trail.y);ctx.lineTo(l.x,l.y);ctx.stroke()}ctx.globalAlpha=1}poly([l,back,top],color+'96',baseColor);poly([back,r,top],e.hit?'#f5f5e8':baseColor+'c2',baseColor);poly([r,front,top],color+'68',baseColor);poly([front,l,top],e.kind==='armored'?'#273e54':'#314c48',baseColor);if(renderDetail>1){const core=project(e.x,e.y,18+bob);ctx.strokeStyle='rgba(235,241,216,.42)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(top.x,top.y+3);ctx.lineTo(core.x,core.y);ctx.lineTo(front.x,front.y);ctx.stroke();ellipseAt(core,2.5,1.4,baseColor,'rgba(245,244,218,.55)')}
    if(renderDetail>0&&e.kind==='runner'){const finL=project(e.x-e.r-7,e.y+2,13+bob),finR=project(e.x+e.r+7,e.y+2,13+bob);poly([l,finL,top],baseColor+'66',baseColor);poly([r,finR,top],baseColor+'66',baseColor)}
    if(renderDetail>0&&e.kind==='armored'){ctx.lineWidth=3;ellipseAt(project(e.x,e.y,17+bob),e.r+5,5,'',baseColor);ellipseAt(project(e.x,e.y,29+bob),e.r+2,4,'',baseColor);if(renderDetail>1)for(const side of [-1,1]){const plate=project(e.x+side*(e.r+3),e.y,24+bob);ellipseAt(plate,5,3,'#28447a','#b4d0ff')}}
    if(e.regen&&renderDetail>0){const core=project(e.x,e.y,24+bob);ctx.globalAlpha=.55+.2*Math.sin(sceneTime*5+e.phase);ctx.lineWidth=2;ellipseAt(core,e.r+6,6,'',baseColor);ellipseAt(core,5+Math.sin(sceneTime*5)*1.5,3,baseColor,'#efffd5');if(renderDetail>1)for(let i=0;i<3;i++){const a=sceneTime*1.7+i*Math.PI*2/3,p=project(e.x+Math.cos(a)*(e.r+9),e.y+Math.sin(a)*(e.r+9),16+bob+Math.sin(a)*5);ellipseAt(p,2.2,1.2,baseColor)}}
    if(e.split&&renderDetail>0){for(let i=0;i<(renderDetail>1?4:2);i++){const a=sceneTime*2.4+i*Math.PI*2/(renderDetail>1?4:2),p=project(e.x+Math.cos(a)*(e.r+7),e.y+Math.sin(a)*(e.r+7),20+bob+Math.sin(a*2)*4);ellipseAt(p,3.5,2,baseColor,'#ffeaff')}if(renderDetail>1)for(const side of [-1,1]){const spike=project(e.x+side*(e.r+8),e.y,30+bob);ctx.strokeStyle='#ffeaff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(top.x,top.y);ctx.lineTo(spike.x,spike.y);ctx.stroke()}}
    if(renderDetail>0&&e.elite){for(let i=0;i<5;i++){const a=i*Math.PI*2/5+sceneTime*.25,crown=project(e.x+Math.cos(a)*(e.r+9),e.y+Math.sin(a)*(e.r+9),h+bob-6);ctx.strokeStyle='#ffb6dd';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(top.x,top.y);ctx.lineTo(crown.x,crown.y);ctx.stroke()}}
    if(e.shield>0){ctx.globalAlpha=.35+.12*Math.sin(sceneTime*6);ctx.lineWidth=2;ellipseAt(project(e.x,e.y,24+bob),e.r+9,13,'rgba(222,139,255,.08)','#e7a3ff')}if(renderDetail>0&&e.slowed){ctx.globalAlpha=.5;ctx.setLineDash([3,4]);ellipseAt(project(e.x,e.y,2),e.r+7,5,'','#b8f1e1');ctx.setLineDash([])}ctx.restore();
    const hp=project(e.x,e.y,h+bob+15),w=e.elite?44:32;ctx.fillStyle='#031017';ctx.fillRect(hp.x-w/2,hp.y,w,4);ctx.fillStyle=e.hp/e.maxHp>.35?'#55f3b4':'#ff6268';ctx.fillRect(hp.x-w/2,hp.y,w*Math.max(0,e.hp/e.maxHp),4);if(e.maxShield){ctx.fillStyle='#221833';ctx.fillRect(hp.x-w/2,hp.y+6,w,3);ctx.fillStyle='#d78cff';ctx.fillRect(hp.x-w/2,hp.y+6,w*Math.max(0,e.shield/e.maxShield),3)}if((renderDetail>0||selectedEnemyId===e.id)&&e.kind!=='shard'){ctx.fillStyle=baseColor;ctx.font='700 7px Arial';ctx.textAlign='center';ctx.fillText(e.trait,hp.x,hp.y-3)}
    if(wobble)ctx.restore();
  }
  const rocketRenderScratch=[],rocketLockedTargetScratch=new Set(),ROCKET_TRAIL_BUCKETS=[{from:0,to:.42,color:'#71878a',width:2,alpha:.28},{from:.42,to:.72,color:'#9b9d83',width:3,alpha:.4},{from:.72,to:1.01,color:'#ffcf63',width:4.2,alpha:.58}];
  function drawShots(){
    // Aktive Railgun-Dauerstrahlen
    for(const t of state.towers){if(t.type!=='rail'||!(t.beamTime>0)||t.beamEndX===undefined)continue;const m=weaponMuzzle(t),a=project(m.x,m.y,m.z),b=project(t.beamEndX,t.beamEndY,20);ctx.save();ctx.lineCap='round';ctx.strokeStyle=types.rail.color;ctx.shadowColor=types.rail.color;ctx.shadowBlur=renderDetail===0?0:10;ctx.globalAlpha=.82+.18*Math.sin(sceneTime*38);ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.strokeStyle='#ffffff';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();if(t.beamHits)for(let i=0;i<t.beamHits.length;i++){const p=project(t.beamHits[i].x,t.beamHits[i].y,20),rr=8+Math.sin(sceneTime*30+i)*2;ctx.strokeStyle=i?types.rail.color:'#ffffff';ctx.lineWidth=2;ellipseAt(p,rr,rr*.5,'',ctx.strokeStyle)}ctx.restore()}
    let droneBoltCount=0;ctx.save();ctx.strokeStyle='#e8e2ff';ctx.fillStyle=types.drone.color;ctx.shadowBlur=0;ctx.lineWidth=2;ctx.beginPath();for(const s of state.shots){if(s.kind!=='droneBolt'||s.px===undefined)continue;droneBoltCount++;const z=s.z||34;for(const barrel of [-1,1]){const ox=(s.barrelNx||0)*(s.barrelOffset||0)*barrel,oy=(s.barrelNy||0)*(s.barrelOffset||0)*barrel,prev=project(s.px+ox,s.py+oy,z),bolt=project(s.x+ox,s.y+oy,z),rx=3.5*bolt.scale,ry=1.8*bolt.scale;ctx.moveTo(prev.x,prev.y);ctx.lineTo(bolt.x,bolt.y);ctx.moveTo(bolt.x+rx,bolt.y);ctx.ellipse(bolt.x,bolt.y,rx,ry,0,0,Math.PI*2)}}if(droneBoltCount){ctx.globalAlpha=.58;ctx.stroke();ctx.globalAlpha=1;ctx.fill()}ctx.restore();

    rocketRenderScratch.length=0;for(const shot of state.shots)if(shot.kind==='rocket')rocketRenderScratch.push(shot);const rockets=rocketRenderScratch,trailStep=renderDetail===2?1:2;ctx.save();ctx.lineCap='round';for(const bucket of ROCKET_TRAIL_BUCKETS){let segments=0;ctx.beginPath();for(const rocket of rockets){const length=rocket.trail.length,start=Math.max(trailStep,Math.ceil(length*bucket.from));for(let i=start;i<Math.min(length,Math.ceil(length*bucket.to));i+=trailStep){const previous=rocket.trail[Math.max(0,i-trailStep)],current=rocket.trail[i],a=project(previous.x,previous.y,previous.z),b=project(current.x,current.y,current.z);ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);segments++}}if(segments){ctx.globalAlpha=bucket.alpha;ctx.strokeStyle=bucket.color;ctx.lineWidth=bucket.width;ctx.stroke()}}if(rockets.length){ctx.beginPath();for(const rocket of rockets){const cos=Math.cos(rocket.angle),sin=Math.sin(rocket.angle),tail=project(rocket.x-cos*10,rocket.y-sin*10,rocket.z),flame=project(rocket.x-cos*17,rocket.y-sin*17,rocket.z);ctx.moveTo(tail.x,tail.y);ctx.lineTo(flame.x,flame.y)}ctx.globalAlpha=.9;ctx.strokeStyle='#fff2a9';ctx.lineWidth=2.5;ctx.stroke()}ctx.restore();

    rocketLockedTargetScratch.clear();const lockedTargets=rocketLockedTargetScratch;for(const s of state.shots){if(s.kind==='droneBolt')continue;ctx.save();ctx.strokeStyle=ctx.fillStyle=s.color;ctx.shadowColor=s.color;ctx.shadowBlur=renderDetail===0?0:7;
      if(s.kind==='rail'){const a=project(s.x,s.y,s.z??39),b=project(s.tx,s.ty,20);ctx.globalAlpha=Math.max(0,s.life/s.max);ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();s.hits.forEach((h,i)=>{const p=project(h.x,h.y,20);ctx.strokeStyle=i?'#8deaff':'#fff';ctx.lineWidth=2;ellipseAt(p,10+i*2,5+i,'',ctx.strokeStyle)})}
      else if(s.kind==='rocket'){ctx.shadowBlur=0;const p=project(s.x,s.y,s.z),sprite=getRocketSprite(s.angle),scale=p.scale;ctx.drawImage(sprite,p.x-ROCKET_SPRITE_SIZE*.5*scale,p.y-ROCKET_SPRITE_SIZE*.5*scale,ROCKET_SPRITE_SIZE*scale,ROCKET_SPRITE_SIZE*scale);if(renderDetail>1&&s.target&&s.target.hp>0&&!lockedTargets.has(s.target.id)){lockedTargets.add(s.target.id);const lock=project(s.target.x,s.target.y,21),r=12+Math.sin(sceneTime*8)*2;ctx.strokeStyle=s.color;ctx.globalAlpha=.7;ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<4;i++){const a=sceneTime+i*Math.PI/2;ctx.moveTo(lock.x+Math.cos(a)*r,lock.y+Math.sin(a)*r);ctx.lineTo(lock.x+Math.cos(a)*(r+6),lock.y+Math.sin(a)*(r+6))}ctx.stroke()}}
      else if(s.kind==='lightning'){const a=project(s.x,s.y,s.z??20),b=project(s.tx,s.ty,20),segs=6;ctx.globalAlpha=Math.max(0,s.life/s.max);ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(a.x,a.y);for(let i=1;i<segs;i++){const f=i/segs,mx=a.x+(b.x-a.x)*f,my=a.y+(b.y-a.y)*f,perpx=-(b.y-a.y),perpy=(b.x-a.x),pl=Math.hypot(perpx,perpy)||1,off=Math.sin(f*Math.PI)*8*Math.sin(sceneTime*44+i*2.7+s.tx*.13);ctx.lineTo(mx+perpx/pl*off,my+perpy/pl*off)}ctx.lineTo(b.x,b.y);ctx.stroke();ctx.strokeStyle='#eaffff';ctx.lineWidth=1;ctx.stroke();ctx.shadowBlur=0;ellipseAt(b,4,2.6,s.color)}
      else if(s.kind==='wave'){ctx.lineCap='round';const fade=Math.max(.18,1-s.r/s.maxR),steps=18,inner=Math.max(4,s.r-34),arcPt=(a,rr)=>project(s.ox+Math.cos(a)*rr,s.oy+Math.sin(a)*rr,4);ctx.globalAlpha=.14*fade;ctx.fillStyle=s.color;ctx.beginPath();for(let i=0;i<=steps;i++){const a=s.angle-s.half+2*s.half*i/steps,p=arcPt(a,s.r);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)}for(let i=steps;i>=0;i--){const a=s.angle-s.half+2*s.half*i/steps,p=arcPt(a,inner);ctx.lineTo(p.x,p.y)}ctx.closePath();ctx.fill();for(const ring of [{rr:s.r,al:.9*fade,lw:5},{rr:s.r-16,al:.45*fade,lw:3}]){if(ring.rr<4)continue;ctx.globalAlpha=ring.al;ctx.lineWidth=ring.lw;ctx.beginPath();for(let i=0;i<=steps;i++){const a=s.angle-s.half+2*s.half*i/steps,p=arcPt(a,ring.rr);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)}ctx.stroke()}}
      else{const r=Math.hypot(s.x-(s.ox??s.x),s.y-(s.oy??s.y)),minR=s.minR||0;let z;if(minR>0&&r<minR){const t=r/minR;z=(s.muzzleZ??28)*(1-t)+5*t+Math.sin(t*Math.PI)*72}else{z=5+Math.sin((r-minR)*.05+sceneTime*3)*2}const p=project(s.x,s.y,z);ctx.save();ctx.shadowBlur=0;ctx.globalAlpha=.26;ellipseAt(project(s.x,s.y,1),6,3,'#05090b');ctx.restore();ellipseAt(p,9,5,s.color);ctx.globalAlpha=.35;ellipseAt(p,18,9,s.color)}ctx.restore()}
    ctx.shadowBlur=0;const particleStep=renderDetail===0?3:1;for(let i=0;i<state.particles.length;i+=particleStep){const particle=state.particles[i],s=project(particle.x,particle.y,particle.z);ctx.globalAlpha=Math.max(0,particle.life/particle.max);ctx.fillStyle=particle.color;ctx.fillRect(s.x,s.y,particle.size,particle.size)}ctx.font='700 10px Arial';ctx.textAlign='center';for(const f of state.floaters){if(renderDetail===0&&f.kind==='damage'&&f.enemyId%2)continue;const p=project(f.x,f.y,f.z);ctx.globalAlpha=f.life/f.max;ctx.fillStyle=f.color;ctx.fillText(f.text,p.x,p.y)}ctx.globalAlpha=1;
  }
  function drawCrack(c){const center=project(c.x,c.y);ctx.save();ctx.globalAlpha=c.life/3;ctx.strokeStyle='#8cefff';for(let i=0;i<5;i++){const a=i*1.256+c.seed,len=10+((i*13+c.seed*7)%11),end=project(c.x+Math.cos(a)*len,c.y+Math.sin(a)*len);ctx.beginPath();ctx.moveTo(center.x,center.y);ctx.lineTo(end.x,end.y);ctx.stroke()}ctx.restore()}
  function drawShock(s){const t=1-s.life/s.max,r=12+t*65,segments=renderDetail===2?24:renderDetail===1?14:8;ctx.save();ctx.globalAlpha=s.life/s.max;ctx.strokeStyle=s.color;ctx.lineWidth=3;ctx.beginPath();for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,p=project(s.x+Math.cos(a)*r,s.y+Math.sin(a)*r,2);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)}ctx.stroke();ctx.restore()}
  function placementValid(gx,gy){const affordable=!!selected&&availableCredits()>=towerCost(selected),special=spawnPointAt(gx,gy)||baseReserved(gx,gy),inside=gx>=0&&gy>=ROW_TOP&&gx<COLS&&gy<ROWS,cacheKey=`${gx},${gy},${selected},${state.towers.length},${state.pending?.length||0},${affordable}`;if(placementCache.key!==cacheKey){placementCache.key=cacheKey;placementCache.valid=inside&&affordable&&!special&&!occupied(gx,gy)&&allSpawnRoutes({x:gx,y:gy}).every(Boolean)}return placementCache.valid}
  function drawPending(){if(!state.pending?.length)return;const flicker=.55+.16*Math.sin(sceneTime*4);for(const p of state.pending){const c=cellCenter(p),x=p.x*CELL,y=p.y*CELL;ctx.save();ctx.globalAlpha=.5;poly([project(x,y,2),project(x+CELL,y,2),project(x+CELL,y+CELL,2),project(x,y+CELL,2)],'#8fc9bc22','#8fc9bc');ctx.globalAlpha=flicker;drawTower({id:-1,x:p.x,y:p.y,type:p.type,cool:0,angle:-.62,pulse:0,salvo:0,investment:p.cost,damageDealt:0,kills:0});ctx.globalAlpha=.9;const tag=project(c.x,c.y,46);ctx.fillStyle='#0b1a1f';ctx.strokeStyle='#8fc9bc';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(tag.x,tag.y,17,6.5,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#cdeee2';ctx.font='700 8px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('BAUEN?',tag.x,tag.y);ctx.textBaseline='alphabetic';ctx.restore()}}
  function drawGhost(){if(!selected||!pointerIsMouse||mouse.gx<0||mouse.gx>=COLS||mouse.gy<ROW_TOP||mouse.gy>=ROWS)return;const valid=placementValid(mouse.gx,mouse.gy),c=cellCenter({x:mouse.gx,y:mouse.gy}),type=types[selected],color=valid?'#8fc9bc':'#c8615d',x=mouse.gx*CELL,y=mouse.gy*CELL;ctx.save();ctx.globalAlpha=.42;poly([project(x,y,2),project(x+CELL,y,2),project(x+CELL,y+CELL,2),project(x,y+CELL,2)],color+'22',color);if(type.range){const segments=renderDetail===2?28:18;ctx.strokeStyle=color;ctx.setLineDash([8,6]);ctx.beginPath();for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,p=project(c.x+Math.cos(a)*type.range,c.y+Math.sin(a)*type.range,2);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)}ctx.stroke();if(type.minRange){ctx.beginPath();for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,p=project(c.x+Math.cos(a)*type.minRange,c.y+Math.sin(a)*type.minRange,2);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)}ctx.stroke()}ctx.setLineDash([])}ctx.globalAlpha=valid?.62:.38;drawTower({id:-1,x:mouse.gx,y:mouse.gy,type:selected,cool:0,angle:-.62,pulse:0,salvo:0,investment:type.cost,damageDealt:0,kills:0});ctx.restore()}
  function pulse(text){const b=$('#waveBanner');b.textContent=text;b.classList.remove('show');b.classList.toggle('compact',text.length>28);void b.offsetWidth;b.classList.add('show')}
  function rosterForWave(wave){if(state.testMode)return state.testEnemyType==='mixed'?TEST_ENEMY_TYPES:[arsenalEnemyKindForBatch(0)];const level=activeMission().level,roster=['shard'];if(wave>=2)roster.push('runner');if(wave>=3)roster.push('regenerator');if(wave>=4)roster.push('armored');if(wave>=5)roster.push('splitter');if((level==='SCHWER'||level==='FINAL')&&wave>=6)roster.push('phaser');if(wave===state.maxWaves||wave>=Math.ceil(state.maxWaves*.72))roster.push('elite');return roster}
  function updateEnemyIntel(){const intel=$('#enemyIntel'),counts={};state.enemies.forEach(e=>counts[e.kind]=(counts[e.kind]||0)+1);const signature=`${state.wave}|${state.maxWaves}|${state.endless}|${state.testEnemyType}|${state.started}|${state.over}|${state.waveActive}|${Object.entries(counts).sort().join(';')}`;if(signature===intelSnapshot)return;intelSnapshot=signature;const active=Object.keys(counts);let title,roster;if(active.length){title=`AKTIV · WELLE ${state.wave}`;roster=active}else if(state.started&&!state.over&&(state.endless||state.wave<state.maxWaves)){const next=state.waveActive?state.wave:state.wave+1;title=state.endless?`${state.waveActive?'EINGEHEND':'NÄCHSTE WELLE'} · ${next} / ∞`:`${state.waveActive?'EINGEHEND':'NÄCHSTE WELLE'} · ${next}/${state.maxWaves}`;roster=rosterForWave(next)}else if(state.over){title=state.result==='victory'?'SEKTOR GESÄUBERT':'MISSION BEENDET';roster=[]}else{title='BEKANNTE EIGENSCHAFTEN';roster=['runner','armored','regenerator','splitter','elite']}intel.innerHTML=`<small>${title}</small>${roster.length?`<div class="enemy-roster">${roster.map(kind=>{const e=enemyTypes[kind],count=counts[kind];return`<span class="enemy-chip" title="${e.detail}">${e.name}${count?` ×${count}`:''}<i>${e.short} · −${e.breach}%</i></span>`}).join('')}</div>`:`<p>${state.result==='victory'?'Keine Biosignaturen verbleiben.':'Kolonieverbindung beendet.'}</p>`}`}
  function statPercent(type,axis,tower=null){const current=towerStats(tower||{type}),metric=axis==='rate'?60/current.rate:current[axis],weapons=Object.keys(types).filter(key=>types[key].tunable!==false),scaling=GAME_BALANCE.tuningPerLevel,maximum=Math.max(...weapons.map(key=>axis==='damage'?types[key].damage*(1+MAX_TUNING*scaling.damage):axis==='rate'?(60/types[key].rate)*(1+MAX_TUNING*scaling.fireRate):types[key].range*(1+MAX_TUNING*scaling.range)));return clamp(Math.round(metric/maximum*10)*10,10,100)}
  function statBar(label,percent,value){return`<div class="stat-bar"><span>${label}<b>${percent}% · ${value}</b></span><i><u style="width:${percent}%"></u></i></div>`}
  function tuningButton(type,axis,label,towerId=null){const level=progress.upgrades[type][axis],maxed=level>=MAX_TUNING,cost=maxed?0:tuningCost({type},axis),disabled=maxed||progress.xp<cost;return`<button data-upgrade-type="${type}" ${towerId?`data-tower="${towerId}"`:''} data-upgrade="${axis}" ${disabled?'disabled':''}>${label} ${level}/${MAX_TUNING}<i>${maxed?'MAX':cost+' XP'}</i></button>`}
  function demolishButton(t){if(state.testMode&&t.testStation!=null)return'';const investment=towerInvestment(t),refund=towerRefund(t);return`<div class="entity-actions"><button class="demolish-button" data-demolish="${t.id}">✕ ABREISSEN · +${refund} E<i>50% von ${investment} E Gesamtwert</i></button></div>`}
  function setSelectionTitle(text='AUSWAHL'){const title=$('#selectionTitle');if(title)title.textContent=text}
  const BUILD_RAIL_TYPES=[...ARSENAL_TYPES,'wall'],BUILD_RAIL_GLYPHS={rail:'⌁',drone:'✣',rocket:'➤',mortar:'◉',laser:'╋',cryo:'❄',gatling:'⁙',disruptor:'◇',wall:'▰'};
  function buildRailMarkup(){return BUILD_RAIL_TYPES.map(type=>`<button data-build-type="${type}" title="${types[type].name} · ${targetLabel(type)}" aria-label="${types[type].name} planen, ${targetLabel(type)}"><span class="icon ${type}">${BUILD_RAIL_GLYPHS[type]}</span><i class="target-mark">${targetGlyph(type)}</i><em data-rail-cost="${type}">${types[type].cost}</em></button>`).join('')}
  function updateBuildUi(){
    const rail=$('#buildRail'),bar=$('#buildConfirmBar'),buildBtn=$('#buildBtn'),active=!!state.buildPhase;
    if(rail){if(!rail.dataset.ready){rail.innerHTML=buildRailMarkup();rail.dataset.ready='1';rail.addEventListener('click',e=>{const button=e.target.closest?.('[data-build-type]');if(button)setSelected(button.dataset.buildType)})}
      /* Gesperrtes bleibt sichtbar und zeigt seinen XP-Preis. */
      rail.hidden=!active;if(active)for(const button of rail.querySelectorAll('[data-build-type]')){const type=button.dataset.buildType,cost=towerCost(type),available=towerAvailable(type),unlocked=towerUnlocked(type);button.classList.toggle('active',selected===type);button.classList.toggle('locked',!available||!unlocked);button.classList.toggle('disabled',available&&unlocked&&availableCredits()<cost);const tag=button.querySelector('em'),label=!available?'🔒':!unlocked?`${unlockXpCost(type)}XP`:String(cost);if(tag&&tag.textContent!==label)tag.textContent=label}}
    if(bar){bar.hidden=!active;
      if(active){const plan=state.pending[0],commit=$('#buildCommitBtn'),discard=$('#buildDiscardBtn');
        $('#buildSummaryCount').textContent=plan?`${types[plan.type].name} HIER BAUEN?`:selected?`${types[selected].name} · BAUFELD ANTIPPEN`:'ANLAGE IM ARSENAL WÄHLEN';
        $('#buildSummaryCost').textContent=plan?`${plan.cost} E · DANACH ${availableCredits()} E`:`${state.credits} E VERFÜGBAR`;
        if(commit){commit.disabled=!plan;commit.title=plan?`${types[plan.type].name} für ${plan.cost} E bauen`:'Erst ein Baufeld antippen'}
        if(discard)discard.title=plan?'Planung verwerfen':'Baumodus beenden, Zeit läuft weiter';
      }}
    if(buildBtn){buildBtn.disabled=!state.started||state.over||state.testMode;buildBtn.textContent=active?'⚒ BAUMODUS BEENDEN':'⚒ BAUEN'}
    canvas.parentElement?.classList.toggle('building',active);document.body.classList.toggle('build-active',active);
  }
  function openSelectionSection(title){const section=$('#selectionSection');if(section)section.open=true;setSelectionTitle(title)}
  function closeSelectionSection(){const section=$('#selectionSection');if(section)section.open=false;setSelectionTitle()}
  function updateSelectionPanel(){
    const box=$('#selection');document.querySelectorAll('.tower-card').forEach(b=>b.classList.toggle('active',b.dataset.type===selected));
    if(selected){const type=types[selected],currentCost=towerCost(selected),possible=affordableTowerCount(selected);setSelectionTitle(type.name);if(type.tunable===false){box.innerHTML=`<small>⚒ BAUMODUS</small><div class="entity-title"><b>${type.name}</b><span class="rank">${currentCost} E</span></div><p>${type.detail}</p><div class="stat-grid"><span>RANGE<b>–</b></span><span>KOSTEN<b>${currentCost}</b></span><span>MÖGLICH<b>${possible}</b></span></div>`;return}const stats=towerStats({type:selected}),rpm=Math.round(60/stats.rate),damage=selected==='drone'?`${Math.round(stats.damage*1.12)} ×${stats.drones}`:selected==='rocket'?`${Math.round(stats.damage/stats.missiles)} ×${stats.missiles}`:Math.round(stats.damage);box.innerHTML=`<small>⚒ BAUMODUS · ★ ${progress.xp} XP</small><div class="entity-title"><b>${type.name}</b><span class="rank">${currentCost} E · RANG ${stats.total+1}</span></div><div class="stat-bars">${statBar('KRAFT',statPercent(selected,'damage'),damage)}${statBar('TAKT',statPercent(selected,'rate'),rpm+'/MIN')}${statBar('REICHWEITE',statPercent(selected,'range'),Math.round(stats.range))}</div><p>${type.detail} Jetzt tunen oder anschließend auf dem Feld platzieren.</p><div class="tuning-grid">${tuningButton(selected,'power','KRAFT')}${tuningButton(selected,'rate','TAKT')}${tuningButton(selected,'range','RANGE')}</div>`;return}
      if(selectedTowerId){const t=state.towers.find(v=>v.id===selectedTowerId);if(t){const type=types[t.type],stats=towerStats(t);setSelectionTitle(type.name);if(t.type==='wall'){const slow=Math.round((1-activePlanet().mods.wallSlow)*100);box.innerHTML=`<small>▰ ROUTENKONTROLLE</small><div class="entity-title"><b>${type.name}</b><span class="rank">#${t.id}</span></div><div class="stat-grid"><span>BREMSUNG<b>−${slow}%</b></span><span>WERT<b>${towerInvestment(t)}</b></span><span>STATUS<b>AKTIV</b></span></div>${demolishButton(t)}`;return}const rpm=Math.round(60/stats.rate),damage=t.type==='drone'?`${Math.round(stats.damage*1.12)} ×${stats.drones}`:t.type==='rocket'?`${Math.round(stats.damage/stats.missiles)} ×${stats.missiles}`:Math.round(stats.damage),special=t.type==='rail'?`Pierce ${stats.pierce}`:t.type==='drone'?`${stats.drones} Jäger`:t.type==='rocket'?`${stats.missiles} Ziele · Radius ${Math.round(stats.splash)}`:stats.chain?`${stats.chain} Sprünge`:stats.slow?`−${Math.round((1-stats.slow)*100)}% Tempo`:stats.shieldBonus>1?'Schild ×'+stats.shieldBonus:stats.splash?`Radius ${Math.round(stats.splash)}`:'Präzision';if(state.testMode&&t.testStation!=null){const station=state.testStations[t.testStation],totalDamage=Math.round(t.damageDealt),dps=Math.round(t.damageDealt/Math.max(.01,state.testElapsed)),testRank=arsenalTuningLabel();box.innerHTML=`<small>▣ ARSENAL-MESSUNG · ${testRank}</small><div class="entity-title"><b>${type.name}</b><span class="rank">${testRank}</span></div><div class="stat-bars">${statBar('KRAFT',statPercent(t.type,'damage',t),damage)}${statBar('TAKT',statPercent(t.type,'rate',t),rpm+'/MIN')}${statBar('REICHWEITE',statPercent(t.type,'range',t),Math.round(stats.range))}</div><div class="stat-grid"><span>SCHADEN<b>${formatCombatNumber(totalDamage)}</b></span><span>Ø DPS<b>${formatCombatNumber(dps)}</b></span><span>LAGER-DMG<b>${station.depotDamage}</b></span></div><p>${t.kills} Abschüsse · ${station.leaks} Durchbrüche · Lager ${Math.ceil(station.depotHp)}/${station.maxDepotHp}. ${targetLabel(t.type)} · passt der gewählte Gegner nicht zum Zielprofil, misst die Station am Ersatzgegner. Der Test vergibt kein XP.</p>`;return}box.innerHTML=`<small>★ DAUER-ARSENAL · ${targetLabel(t.type)} · ${special}</small><div class="entity-title"><b>${type.name}</b><span class="rank">RANG ${stats.total+1}</span></div><div class="stat-bars">${statBar('KRAFT',statPercent(t.type,'damage'),damage)}${statBar('TAKT',statPercent(t.type,'rate'),rpm+'/MIN')}${statBar('REICHWEITE',statPercent(t.type,'range'),Math.round(stats.range))}</div><p>${type.detail} Upgrades gelten dauerhaft. ${t.kills} Abschüsse · ${t.xpEarned||0} XP erzeugt.</p><div class="tuning-grid">${tuningButton(t.type,'power','KRAFT',t.id)}${tuningButton(t.type,'rate','TAKT',t.id)}${tuningButton(t.type,'range','RANGE',t.id)}</div>${demolishButton(t)}`;return}selectedTowerId=null}
    if(selectedEnemyId){const e=state.enemies.find(v=>v.id===selectedEnemyId);if(e){const def=enemyTypes[e.kind],shield=e.maxShield?` · Schild ${Math.ceil(e.shield)}/${Math.ceil(e.maxShield)}`:'';setSelectionTitle(def.name);box.innerHTML=`<small>☣ LIVE-SCAN</small><div class="entity-title"><b>${def.name}</b><span class="rank">${def.short}</span></div><p>${def.detail}</p><div class="stat-grid"><span>LEBEN<b>${Math.ceil(e.hp)}/${Math.ceil(e.maxHp)}</b></span><span>TEMPO<b>×${def.speed}</b></span><span>PANZER<b>${Math.round(def.armor*100)}%</b></span></div><p>Durchbruch −${def.breach}% · Prämie +${def.bounty}${shield}${e.slowed?' · VERLANGSAMT':''}</p>`;return}selectedEnemyId=null}
    setSelectionTitle();box.innerHTML='<small>SYSTEMBEREIT</small><p>Turm, Gegner oder Bausymbol auswählen.</p>'
  }
  function clearSelection(){selected=null;selectedTowerId=null;selectedEnemyId=null;placementCache.key='';uiSnapshot='';closeSelectionSection();updateSelectionPanel()}
  function setSelected(type){if(state.over)return;
    if(types[type]&&!towerUnlocked(type)&&types[type].tunable!==false){
      if(!towerAvailable(type)){pulse(`${types[type].name} ERST AB EINER SCHWER-MISSION`);return}
      /* Direkt dorthin, wo man es freischalten kann. */
      pulse(`${types[type].name} ERST FREISCHALTEN · ${unlockXpCost(type)} XP`);openCodex();return}
    if(state.testMode){const stationTower=state.towers.find(t=>t.type===type&&t.testStation!=null);if(stationTower){inspectTower(stationTower);return}pulse('IM ARSENAL-TEST SIND NUR WAFFEN-PRÜFSTÄNDE AKTIV');return}if(!state.started){pulse('MISSION ZUERST STARTEN');return}if(!towerAvailable(type)){pulse(`${types[type].name} ERST AB EINER SCHWER-MISSION`);return}if(!state.buildPhase&&!enterBuildPhase())return;if(selected===type){selected=null;placementCache.key='';uiSnapshot='';closeSelectionSection();updateSelectionPanel();updateUI();return}selected=type;selectedTowerId=null;selectedEnemyId=null;placementCache.key='';uiSnapshot='';const buildSection=$('#buildSection');if(buildSection)buildSection.open=true;if(compactLayout())setSelectionTitle(types[type].name);else openSelectionSection(types[type].name);updateSelectionPanel();updateUI()}
  function inspectTower(t){selected=null;selectedTowerId=t.id;selectedEnemyId=null;placementCache.key='';uiSnapshot='';openSelectionSection(types[t.type].name);updateUI()}
  function inspectEnemy(e){selected=null;selectedTowerId=null;selectedEnemyId=e.id;placementCache.key='';uiSnapshot='';openSelectionSection(enemyTypes[e.kind].name);updateUI()}
  function handleCanvasClick(){if(state.buildPhase){const pendingIndex=state.pending.findIndex(p=>p.x===mouse.gx&&p.y===mouse.gy);if(pendingIndex>=0){removePending(pendingIndex);return}const placed=state.towers.find(t=>t.x===mouse.gx&&t.y===mouse.gy);if(placed){inspectTower(placed);return}if(selected){addPending(mouse.gx,mouse.gy);return}pulse('ERST EINE ANLAGE IM ARSENAL WÄHLEN');return}
    const tower=state.towers.find(t=>t.x===mouse.gx&&t.y===mouse.gy);if(tower){inspectTower(tower);return}const enemy=state.enemies.map(e=>({e,d:Math.hypot(e.x-mouse.x,e.y-mouse.y)})).filter(v=>v.d<Math.max(24,v.e.r+10)).sort((a,b)=>a.d-b.d)[0];if(enemy)inspectEnemy(enemy.e);else{clearSelection();updateUI()}}
  function developerCatalog(){
    const weapon=Object.fromEntries(Object.entries(types).map(([id,definition])=>[id,{...definition,balance:{...GAME_BALANCE.weapons[id]},tuningPerLevel:{...GAME_BALANCE.tuningPerLevel},maxTuning:MAX_TUNING,renderer:`drawTower(${id})`}]))
    const enemy=Object.fromEntries(Object.entries(enemyTypes).map(([id,definition])=>[id,{...definition,balance:{...GAME_BALANCE.enemies[id]},hpFormula:`(${GAME_BALANCE.enemyBaseHp} + Welle × ${GAME_BALANCE.enemyHpPerWave}) × HP-Faktor × Mission × Schwierigkeit`,renderer:`drawMechanicalEnemy(${definition.model})`}]))
    return{weapon,enemy,obstacle:{crystal:{name:'KRISTALLFELD',renderer:'drawObstacle → drawCrystal',parameters:{seed:'bestimmt Höhe und Anordnung',themeColor:'planet.theme.crystal'}},ridge:{name:'FELSRÜCKEN',renderer:'drawObstacle → drawBoulder',parameters:{type:'ridge',seed:'bestimmt Höhe, Radius und Deckfläche',colors:'planet.theme'}},rock:{name:'FELSBLOCK',renderer:'drawObstacle → drawBoulder',parameters:{type:'rock',seed:'bestimmt Höhe, Radius und Deckfläche',colors:'planet.theme'}},wreck:{name:'WRACKTEIL',renderer:'drawObstacle → drawWreck',parameters:{seedModulo3:'0 Flügelbruch · 1 Triebwerksgondel · 2 Panzerchassis',colors:'feste matte Metallpalette'}}},scenery:{pine:{name:'FROSTBAUM',planet:'nivalis',renderer:'drawFlora(pine)',parameters:{size:.95,lean:.08}},spire:{name:'BASALTSPIRE',planet:'pyra',renderer:'drawFlora(spire)',parameters:{size:.95,lean:.08}},fan:{name:'FÄCHERPFLANZE',planet:'verdant',renderer:'drawFlora(fan)',parameters:{size:.95,lean:.08}},shard:{name:'SCHATTENSCHERBE',planet:'umbra',renderer:'drawFlora(shard)',parameters:{size:.95,lean:.08}}},world:{base:{name:'KOLONIE-BASIS',renderer:'drawBase',parameters:{integrity:GAME_BALANCE.baseIntegrity,footprint:'3 × 3 Rasterfelder',colors:'planet.theme'}},spawn:{name:'GEGNER-EINGÄNGE',renderer:'drawPath (E1–E3)',parameters:{lineCount:{...GAME_BALANCE.spawnLineCount},lineOffsets:{...GAME_BALANCE.spawnLineOffsets}}},route:{name:'GEGNERROUTEN',renderer:'drawPath',parameters:{dynamic:true,multiple:true}},buildcell:{name:'BAUFELD',renderer:'drawBuildGrid',parameters:{cellSize:CELL,columns:COLS,rows:ROWS}}}};
  }
  const developerSimulations=new Map();
  function developerEnemy(sim,orbitOffset=0){const def=enemyTypes.shard,maxHp=Math.max(90,towerStats(sim.towers[0]).damage*1.8),orbit=sim.dev.orbit+orbitOffset;return{id:sim.nextEnemyId++,x:sim.dev.cx+Math.cos(orbit)*sim.dev.radius,y:sim.dev.cy+Math.sin(orbit)*sim.dev.radius,angle:orbit+Math.PI/2,kind:'shard',r:def.r,color:def.color,hit:0,phase:orbitOffset,hp:maxHp,maxHp,shield:0,maxShield:0,elite:false,trait:def.short,regen:0,regenDelay:0,split:0,armor:0,reached:false,slowTimer:0,slowFactor:1,baseSpeed:0,speed:0,path:[{x:0,y:0}],pi:0,bounty:0,breach:0,orbitOffset}}
  function developerEnemies(sim){return sim.dev.id==='rocket'?[developerEnemy(sim,0),developerEnemy(sim,.46),developerEnemy(sim,.92)]:[developerEnemy(sim)]}
  function createDeveloperSimulation(id,time,radius=105){const cell={x:9,y:7},center=cellCenter(cell),tower={id:9001,x:cell.x,y:cell.y,type:id,cool:0,angle:0,pulse:0,salvo:0,investment:types[id].cost,damageDealt:0,kills:0},sim={started:true,over:false,testMode:false,testStations:[],testTowerIds:new Set(),towers:[tower],drones:[],enemies:[],shots:[],particles:[],floaters:[],shocks:[],cracks:[],wallSlowCells:new Set(),nextEnemyId:9100,shake:0,dev:{id,lastTime:time,cx:center.x,cy:center.y,radius,orbit:0,respawn:0}};const realState=state;state=sim;sim.enemies=developerEnemies(sim);syncDrones(tower);state=realState;return sim}
  function advanceDeveloperSimulation(id,time,radius=105){const simKey=`${id}@${radius}`;let sim=developerSimulations.get(simKey);if(!sim||time<sim.dev.lastTime||time-sim.dev.lastTime>1){sim=createDeveloperSimulation(id,time,radius);developerSimulations.set(simKey,sim);return sim}const realState=state;state=sim;let remaining=Math.min(.3,time-sim.dev.lastTime);while(remaining>.0001){const dt=Math.min(1/30,remaining);remaining-=dt;sim.dev.lastTime+=dt;if(sim.enemies.length){sim.dev.orbit+=dt*.72;for(const enemy of sim.enemies){const orbit=sim.dev.orbit+(enemy.orbitOffset||0);enemy.x=sim.dev.cx+Math.cos(orbit)*sim.dev.radius;enemy.y=sim.dev.cy+Math.sin(orbit)*sim.dev.radius;enemy.angle=orbit+Math.PI/2;enemy.phase+=dt*4;const nextAngle=orbit+.08,nextX=sim.dev.cx+Math.cos(nextAngle)*sim.dev.radius,nextY=sim.dev.cy+Math.sin(nextAngle)*sim.dev.radius;enemy.path=[{x:nextX/CELL-.5,y:nextY/CELL-.5}];enemy.pi=0;enemy.hit=Math.max(0,enemy.hit-dt);enemy.wobble=Math.max(0,(enemy.wobble||0)-dt*1.1)}}else{sim.dev.respawn-=dt;if(sim.dev.respawn<=0)sim.enemies=developerEnemies(sim)}const tower=sim.towers[0];tower.cool-=dt;tower.pulse=Math.max(0,tower.pulse-dt*4);const target=sim.enemies[0];if(id!=='drone'&&id!=='wall'&&target&&tower.cool<=0){shoot(tower,target);tower.cool=towerStats(tower).rate}updateDrones(dt);updateShots(dt);sim.particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.z=Math.max(0,p.z+p.vz*dt);p.vz-=120*dt;p.life-=dt});sim.particles=sim.particles.filter(p=>p.life>0);sim.floaters.forEach(f=>{f.z+=28*dt;f.life-=dt});sim.floaters=sim.floaters.filter(f=>f.life>0);sim.shocks.forEach(s=>s.life-=dt);sim.shocks=sim.shocks.filter(s=>s.life>0);const dead=sim.enemies.filter(enemy=>enemy.hp<=0);for(const enemy of dead){sim.shocks.push({x:enemy.x,y:enemy.y,life:.72,max:.72,color:enemy.color});burst(enemy.x,enemy.y,enemy.color,22,180)}if(dead.length){sim.enemies=sim.enemies.filter(enemy=>enemy.hp>0);if(!sim.enemies.length)sim.dev.respawn=1.05}}state=realState;return sim}
  function renderDeveloperReference(kind,id,options={}){
    const stage=document.createElement('canvas'),output=document.createElement('canvas');stage.width=W;stage.height=H;output.width=440;output.height=240;
    const previous={ctx,renderDetail,sceneTime,planet:activePlanetId,base,state,selectedTowerId,selectedEnemyId};
    try{
      ctx=stage.getContext('2d',{alpha:false});renderDetail=options.detail??2;sceneTime=options.time??1.35;activePlanetId=options.planet||'nivalis';base={x:9,y:7};state={...previous.state,path:null,paths:[],testMode:false,testStations:[],testTowerIds:new Set(),towers:[],drones:[],enemies:[],shots:[],particles:[],floaters:[],shocks:[],cracks:[],wallSlowCells:new Set()};selectedTowerId=null;selectedEnemyId=null;
      const theme=activePlanet().theme,sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,theme.sky[1]);sky.addColorStop(1,theme.ground[1]);ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);drawBuildGrid();
      const cell={x:9,y:7},center=cellCenter(cell);
      if(kind==='weapon'){
        const tower={id:9001,x:cell.x,y:cell.y,type:id,cool:options.firing?1:0,angle:-.62,pulse:options.firing?1:.15,salvo:0,investment:types[id].cost,damageDealt:0,kills:0};state.towers=[tower];
        if(options.combat&&id!=='wall'){
          state=advanceDeveloperSimulation(id,sceneTime);const simTower=state.towers[0],targets=state.enemies,orbitRadius=state.dev.radius;ctx.save();ctx.strokeStyle=theme.accent+'88';ctx.lineWidth=1.5;ctx.setLineDash([5,7]);ctx.beginPath();for(let i=0;i<=48;i++){const a=i/48*Math.PI*2,p=project(state.dev.cx+Math.cos(a)*orbitRadius,state.dev.cy+Math.sin(a)*orbitRadius,2);i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)}ctx.stroke();ctx.setLineDash([]);ctx.restore();targets.filter(target=>target.y<state.dev.cy).forEach(drawEnemy);drawTower(simTower);state.drones.forEach(drawDrone);targets.filter(target=>target.y>=state.dev.cy).forEach(drawEnemy);drawShots();state.shocks.forEach(drawShock);
        }else{if(options.selected)selectedTowerId=tower.id;drawTower(tower);if(options.selected)drawSelectionMarkers()}
      }else if(kind==='enemy'){
        const def=enemyTypes[id],maxHp=500,maxShield=maxHp*(def.shield||0),enemy={id:9002,x:center.x,y:center.y,angle:options.angle??-.45,kind:id,r:def.r,color:def.color,hit:options.hit?1:0,phase:1.4,hp:maxHp,maxHp,shield:options.shield===false?0:maxShield,maxShield,elite:id==='elite',trait:def.short,regen:def.regen||0,split:def.split||0,slowed:!!options.slowed};state.enemies=[enemy];if(options.selected)selectedEnemyId=enemy.id;drawEnemy(enemy);if(options.selected)drawSelectionMarkers();
      }else if(kind==='obstacle')drawObstacle({x:cell.x,y:cell.y,type:id,seed:options.seed??37});
      else if(kind==='scenery')drawFlora({x:center.x,y:center.y,s:options.size??.95,lean:options.lean??.08,kind:id,seed:37});
      else if(kind==='world'&&id==='base')drawBase();
      else if(kind==='world'&&id==='route'){const savedPath=state.path;state.path=[{x:5,y:8},{x:7,y:8},{x:9,y:7},{x:11,y:6},{x:13,y:6}];drawPath();state.path=savedPath}
      else if(kind==='world'&&id==='spawn'){const savedPath=state.path;state.path=[{x:7,y:7},{x:8,y:7},{x:9,y:7},{x:10,y:7}];drawPath();state.path=savedPath}
      else if(kind==='world'&&id==='buildcell'){ctx.save();ctx.fillStyle=theme.accent+'33';ctx.strokeStyle=theme.light;ctx.lineWidth=2;const a=project(cell.x*CELL,cell.y*CELL,2),b=project((cell.x+1)*CELL,cell.y*CELL,2),c=project((cell.x+1)*CELL,(cell.y+1)*CELL,2),d=project(cell.x*CELL,(cell.y+1)*CELL,2);poly([a,b,c,d],ctx.fillStyle,ctx.strokeStyle);ctx.restore()}
      // Engerer Ausschnitt nur für die Entwickler-Scorecard: Das echte Modell
      // bleibt unverändert, erscheint dort aber größer und leichter vergleichbar.
      const focus=project(center.x,center.y,22),sourceWidth=410,sourceHeight=sourceWidth*240/440;
      output.getContext('2d').drawImage(stage,focus.x-sourceWidth/2,focus.y-sourceHeight/2,sourceWidth,sourceHeight,0,0,440,240);return output.toDataURL('image/png');
    }finally{ctx=previous.ctx;renderDetail=previous.renderDetail;sceneTime=previous.sceneTime;activePlanetId=previous.planet;base=previous.base;state=previous.state;selectedTowerId=previous.selectedTowerId;selectedEnemyId=previous.selectedEnemyId}
  }
  globalThis.ICEBOUND_DEV={getCatalog:developerCatalog,renderReference:renderDeveloperReference};
  /* BALANCING-ZUGANG — nur mit ?balance-probe in der URL. Im normalen Spiel
     existiert dieses Objekt nicht. Erlaubt einem Test-Skript, Missionen ohne
     Zeichnen durchzurechnen und Anlagen zu planen.
     Ablauf und Testbot: Docs/BALANCING.md */
  if(new URLSearchParams(location.search).has('balance-probe'))globalThis.ICEBOUND_PROBE={
    snapshot:()=>({wave:state.wave,maxWaves:state.maxWaves,credits:state.credits,integrity:state.integrity,
      xp:progress.xp,over:state.over,result:state.result,started:state.started,buildPhase:state.buildPhase,
      waveActive:state.waveActive,enemies:state.enemies.length,spawnLeft:state.spawnLeft,
      kills:state.kills,breaches:state.breaches,
      towers:state.towers.map(t=>({type:t.type,x:t.x,y:t.y,dmg:Math.round(t.damageDealt||0),kills:t.kills||0})),
      paths:state.paths.map(p=>p.length)}),
    allPaths:()=>state.paths.map(p=>p.map(c=>({x:c.x,y:c.y}))),
    obstacles:()=>obstacles.map(o=>({x:o.x,y:o.y})),
    obstacleColumns:()=>{const cols=new Array(COLS).fill(0);for(const o of obstacles)cols[o.x]++;return cols},
    map:()=>({base:{...base},spawns:spawnPoints.map(s=>({...s})),cols:COLS,rows:ROWS,rowTop:ROW_TOP,cell:CELL}),
    pending:()=>(state.pending||[]).map(p=>({x:p.x,y:p.y,type:p.type,cost:p.cost})),
    pointer:()=>({gx:mouse.gx,gy:mouse.gy}),
    canBuild:(gx,gy)=>!obstacleAt(gx,gy)&&!occupied(gx,gy)&&!spawnPointAt(gx,gy)&&!baseReserved(gx,gy),
    routesStayOpen:(gx,gy)=>allSpawnRoutes({x:gx,y:gy}).every(Boolean),
    routeLengths:()=>allSpawnRoutes().map(p=>p?p.length:0),
    cost:type=>towerCost(type),
    credits:()=>availableCredits(),
    setSpeed:v=>{speed=v;return speed},
    /* Simulation ohne Zeichnen: requestAnimationFrame laeuft in einem
       unsichtbaren Tab nicht, deshalb wird update() direkt getaktet. */
    run:(seconds,dt=.02)=>{const steps=Math.max(1,Math.round(seconds/dt));for(let i=0;i<steps;i++){if(state.over)break;sceneTime+=dt;update(dt)}return{wave:state.wave,over:state.over}},
    render:()=>{draw();return true},
    enterBuild:()=>enterBuildPhase(),
    plan:(type,gx,gy)=>{if(selected!==type)setSelected(type);const before=state.pending.length;addPending(gx,gy);return state.pending.length>before},
    unplanLast:()=>{if(!state.pending.length)return false;removePending(state.pending.length-1);return true},
    commit:()=>{confirmPending();return state.towers.length},
    tuneAll:level=>{for(const type of Object.keys(types))if(types[type].tunable!==false)for(const axis of ['power','rate','range'])progress.upgrades[type][axis]=clamp(level,0,MAX_TUNING);saveProgress();state.towers.forEach(t=>syncDrones(t));return progress.upgrades}
  };
  addEventListener('message',event=>{const message=event.data;if(!message||message.channel!=='icebound-scorecard')return;if(message.action==='catalog')event.source?.postMessage({channel:'icebound-scorecard',action:'catalog-result',catalog:developerCatalog()},'*');if(message.action==='render')event.source?.postMessage({channel:'icebound-scorecard',action:'render-result',requestId:message.requestId,image:renderDeveloperReference(message.kind,message.id,message.options)},'*')});
  function updateUI(){
    if(uiSnapshot&&sceneTime<uiNext)return;uiNext=sceneTime+.12;const enemySignature=state.enemies.map(e=>e.kind).sort().join(','),tower=state.towers.find(t=>t.id===selectedTowerId),enemy=state.enemies.find(e=>e.id===selectedEnemyId),station=tower?.testStation!=null?state.testStations[tower.testStation]:null,paused=buildModePaused(),missionComplete=!state.endless&&state.wave>=state.maxWaves,selectionSignature=tower?`${tower.id}:${JSON.stringify(progress.upgrades[tower.type])}:${tower.kills}:${Math.round(tower.damageDealt)}:${station?.depotDamage||0}:${station?.leaks||0}`:enemy?`${enemy.id}:${Math.ceil(enemy.hp)}:${Math.ceil(enemy.shield)}`:'-',testClock=state.testMode?Math.floor(state.testElapsed*2):0,pause=Math.ceil(state.intermission),snapshot=`${state.integrity}|${state.credits}|${state.buildPhase}|${paused}|${state.pending?.length||0}|${pendingSpend()}|${progress.xp}|${state.wave}|${state.maxWaves}|${state.endless}|${enemySignature}|${state.spawnLeft}|${state.testMode}|${state.testTuningMode}|${state.testEnemyType}|${testClock}|${state.started}|${state.waveActive}|${state.over}|${selected}|${selectionSignature}|${pause}|${audio.muted}`;if(snapshot===uiSnapshot)return;uiSnapshot=snapshot;
    $('#lives').textContent=Math.max(0,Math.ceil(state.integrity));$('#integrityStat').classList.toggle('critical',state.integrity<=35);/* Die Anzeige bleibt beim echten Vorrat: Bezahlt wird erst beim Bestaetigen,
   die Leiste oben nennt den Preis und den Rest danach. */
    $('#credits').textContent=state.credits;$('#xp').textContent=progress.xp;$('#wave').textContent=state.testMode?`TEST ${state.wave} / ∞`:`${state.wave}/${state.maxWaves}`;const pendingSpawns=state.spawnLeft*(state.testMode?(state.testStations?.length||1):1);$('#hostiles').textContent=`${state.enemies.length+pendingSpawns} FEINDE`;
    const waveBtn=$('#waveBtn'),waveLabel=state.testMode?'TESTWELLE':'WELLE';waveBtn.disabled=!state.started||state.waveActive||missionComplete||state.over||paused;waveBtn.textContent=!state.started?'AUTOWELLEN BEREIT':paused?(state.buildPhase?'BAUMODUS · ZEIT ANGEHALTEN':'TUNING · ZEIT ANGEHALTEN'):state.waveActive?`${waveLabel} ${state.wave} LÄUFT`:missionComplete?'MISSION BEENDET':state.intermission>0?`${waveLabel} ${state.wave+1} IN ${pause}s · JETZT`:`${waveLabel} ${state.wave+1} VORZIEHEN`;const testControls=$('#testControls'),testTuneSelect=$('#testTuneSelect'),testEnemySelect=$('#testEnemySelect'),testControlsDisabled=!state.testMode||!state.started||state.over;testControls.hidden=!state.testMode;testTuneSelect.disabled=testControlsDisabled;testEnemySelect.disabled=testControlsDisabled;if(testTuneSelect.value!==state.testTuningMode)testTuneSelect.value=state.testTuningMode;if(testEnemySelect.value!==state.testEnemyType)testEnemySelect.value=state.testEnemyType;
    updateBuildUi();$('#exitBtn').disabled=!state.started&&!state.over;
    /* Gesperrte Anlagen bleiben sichtbar, aber ausgegraut und mit ihrem
       XP-Preis — so sieht man, worauf man sparen kann. Freigeschaltet wird
       ausschliesslich in der Werkstatt. */
    let locked=0;
    document.querySelectorAll('.tower-card').forEach(b=>{const type=b.dataset.type,cost=towerCost(type),available=towerAvailable(type),unlocked=towerUnlocked(type);
      b.hidden=false;
      if(!available||!unlocked)locked++;
      b.classList.toggle('locked',!available||!unlocked);
      b.classList.toggle('disabled',available&&unlocked&&availableCredits()<cost);
      b.title=!available?`${types[type].name} · GESPERRT · erst ab einer Schwer-Mission`
        :!unlocked?`${types[type].name} · GESPERRT · ${targetLabel(type)} · in der Werkstatt für ${unlockXpCost(type)} XP freischalten`
        :availableCredits()<cost?`${types[type].name} · ${targetLabel(type)} · ${cost} E · es fehlen ${cost-availableCredits()} E`
        :`${types[type].name} · ${targetLabel(type)} · ${cost} E`;
      const priceTag=b.querySelector('em'),label=!available?'🔒':!unlocked?`${unlockXpCost(type)} XP`:String(cost);
      if(priceTag&&priceTag.textContent!==label)priceTag.textContent=label});
    const hint=$('#codexHint');if(hint){const text=locked?`${locked} ANLAGE${locked>1?'N':''} NOCH GESPERRT`:'TUNEN & NACHSCHLAGEN';if(hint.textContent!==text)hint.textContent=text}
    updateSelectionPanel();updateEnemyIntel()
  }
  function loop(ts){const gap=ts-lastRender;if(gap<15.5){requestAnimationFrame(loop);return}if(lastRender)updatePerformanceMode(gap);const dt=Math.min(.035,(ts-last)/1000||0);last=lastRender=ts;sceneTime=ts/1000;update(dt);draw();requestAnimationFrame(loop)}
  function trackPointer(e){const r=canvas.getBoundingClientRect(),sx=(e.clientX-r.left)*W/r.width,sy=(e.clientY-r.top)*H/r.height,p=unproject(sx,sy);mouse.x=p.x;mouse.y=p.y;mouse.gx=Math.floor(mouse.x/CELL);mouse.gy=Math.floor(mouse.y/CELL)}
  canvas.addEventListener('mousemove',trackPointer);canvas.addEventListener('click',e=>{trackPointer(e);handleCanvasClick()});
  canvas.addEventListener('pointermove',e=>{pointerIsMouse=e.pointerType==='mouse'});canvas.addEventListener('pointerdown',e=>{pointerIsMouse=e.pointerType==='mouse'});canvas.addEventListener('mouseleave',()=>{pointerIsMouse=false});
  canvas.addEventListener('contextmenu',e=>{e.preventDefault();clearSelection();updateUI()});document.querySelectorAll('.tower-card').forEach(b=>b.addEventListener('click',()=>setSelected(b.dataset.type)));$('#selection').addEventListener('click',e=>{const upgrade=e.target.closest?.('[data-upgrade]'),demolish=e.target.closest?.('[data-demolish]');if(upgrade)upgradeArsenal(upgrade.dataset.upgradeType,upgrade.dataset.upgrade,Number(upgrade.dataset.tower)||null);else if(demolish)demolishTower(Number(demolish.dataset.demolish))});
  function begin(testMode=false){initAudio();if(state.over)reset();state.testMode=testMode;state.endless=testMode;if(testMode){state.credits=2600;state.integrity=state.maxIntegrity;setupArsenalTest()}state.started=true;state.over=false;state.result=null;audio.beat=0;setMissionScreen(false);uiSnapshot='';startWave()}
  function exitMission(){speed=1;$('#speedBtn').textContent='1×';const banner=$('#waveBanner');banner.classList.remove('show');selectWorld(activePlanetId,activeMissionIndex)}
  /* WERKSTATT — freischalten, tunen und nachschlagen. Zeigt vor dem Kauf,
     was eine Waffe kann. Alle Werte
     kommen aus towerStats(), enthalten also das eigene Tuning und die
     Planetenboni. Die Zielzeile steht bewusst oben: eine Luftwaffe gegen
     Bodengegner ist die teuerste Fehlinvestition im Spiel. */
  const CODEX_GLYPHS={rail:'⌁',drone:'✣',rocket:'➤',mortar:'◉',laser:'╋',cryo:'❄',gatling:'⁙',disruptor:'◇',wall:'▰'};
  function codexSpecial(type,stats){
    if(type==='rail')return `Durchschlägt ${stats.pierce} Ziele und ignoriert Panzerung`;
    if(type==='drone')return `${stats.drones} mobile Jäger, treffen auch um Ecken`;
    if(type==='rocket')return `${stats.missiles} zielsuchende Raketen, Radius ${Math.round(stats.splash)}`;
    if(type==='mortar')return `Flächenschlag Radius ${Math.round(stats.splash)}, Mindestabstand ${Math.round(stats.minRange)}`;
    if(type==='cryo')return `Bremst auf ${Math.round((stats.slow||1)*100)} %, springt auf ${stats.chain} Ziele über`;
    if(type==='disruptor')return `+${Math.round((stats.shieldBonus-1)*100)} % Schaden gegen Schilde`;
    if(type==='laser')return 'Fast ohne Feuerpause, dafür sehr leichter Einzeltreffer';
    if(type==='gatling')return 'Höchste Feuerrate, aber kurze Reichweite';
    return '';
  }
  /* Freischalten kostet nur XP und passiert hier — deshalb funktioniert es auch
     ausserhalb einer Mission, wo es gar keine Energie gibt. */
  function unlockFromCodex(type){
    if(towerUnlocked(type)||types[type].tunable===false)return;
    if(!towerAvailable(type)){pulse(`${types[type].name} ERST AB EINER SCHWER-MISSION`);return}
    const cost=unlockXpCost(type);
    if(progress.xp<cost){pulse(`${cost-progress.xp} XP FÜR DIE FREISCHALTUNG FEHLEN`);return}
    progress.xp-=cost;unlockTower(type);
    sound('upgrade');pulse(`${types[type].name} FREIGESCHALTET · −${cost} XP`);
    renderCodex();uiSnapshot='';updateUI();
  }
  function codexTuneButton(type,axis,label){
    const level=progress.upgrades[type][axis],maxed=level>=MAX_TUNING,cost=maxed?0:tuningCost({type},axis);
    const disabled=maxed||progress.xp<cost;
    return `<button class="codex-tune" data-codex-tune="${axis}" data-codex-type="${type}" ${disabled?'disabled':''}>${label} ${level}/${MAX_TUNING}<i>${maxed?'MAX':cost+' XP'}</i></button>`;
  }
  /* Werkstatt-Vorschau: statt eines Schriftzeichens laeuft je Waffe eine kleine
     Live-Szene mit dem echten Turmmodell, das auf ein Ziel feuert. Es ist
     dieselbe Simulation wie in der Entwickler-Scorecard, nur mit engerem Orbit,
     stummgeschaltet und auf ein Kaertchen zugeschnitten. */
  const WORKSHOP_PREVIEW={w:132,h:108,scale:.72,ground:.64,radius:62,fps:24};
  let workshopPreviewRaf=0,workshopPreviewCanvases=[],workshopPreviewNext=0;
  function renderWorkshopPreview(canvas,type,time){
    const paint=canvas._paint||(canvas._paint=canvas.getContext('2d')),{w,h,scale}=WORKSHOP_PREVIEW;
    const theme=activePlanet().theme,sky=paint.createLinearGradient(0,0,0,h);
    paint.setTransform(DPR,0,0,DPR,0,0);
    sky.addColorStop(0,theme.sky[1]);sky.addColorStop(1,theme.ground[1]);
    paint.fillStyle=sky;paint.fillRect(0,0,w,h);
    const previous={ctx,state,renderDetail,sceneTime,selectedTowerId,selectedEnemyId,industrial:industrialRendering,silent:silentSimulation};
    try{
      silentSimulation=true;
      const sim=advanceDeveloperSimulation(type,time,WORKSHOP_PREVIEW.radius),center=cellCenter({x:9,y:7}),anchor=project(center.x,center.y,0);
      paint.setTransform(scale*DPR,0,0,scale*DPR,(w/2-anchor.x*scale)*DPR,(h*WORKSHOP_PREVIEW.ground-anchor.y*scale)*DPR);
      ctx=paint;state=sim;renderDetail=1;sceneTime=time;selectedTowerId=null;selectedEnemyId=null;
      const cy=sim.dev.cy;
      sim.enemies.filter(enemy=>enemy.y<cy).forEach(drawEnemy);
      drawTower(sim.towers[0]);
      sim.drones.forEach(drawDrone);
      sim.enemies.filter(enemy=>enemy.y>=cy).forEach(drawEnemy);
      drawShots();sim.shocks.forEach(drawShock);
    }finally{
      ctx=previous.ctx;state=previous.state;renderDetail=previous.renderDetail;sceneTime=previous.sceneTime;
      selectedTowerId=previous.selectedTowerId;selectedEnemyId=previous.selectedEnemyId;
      industrialRendering=previous.industrial;silentSimulation=previous.silent;
    }
  }
  function workshopPreviewTick(ts){
    const overlay=$('#codexOverlay');
    if(!overlay||overlay.hidden||!workshopPreviewCanvases.length){workshopPreviewRaf=0;return}
    workshopPreviewRaf=requestAnimationFrame(workshopPreviewTick);
    if(ts<workshopPreviewNext)return;
    workshopPreviewNext=ts+1000/WORKSHOP_PREVIEW.fps;
    /* Nur zeichnen, was gerade sichtbar ist — gescrollte Karten kosten sonst
       unnoetig Rechenzeit, besonders auf dem Handy. */
    const time=ts/1000,viewport=window.innerHeight||0;
    for(const canvas of workshopPreviewCanvases){
      const box=canvas.getBoundingClientRect();
      if(box.bottom<-40||box.top>viewport+40)continue;
      try{renderWorkshopPreview(canvas,canvas.dataset.preview,time)}
      catch(_){canvas.hidden=true;workshopPreviewCanvases=workshopPreviewCanvases.filter(item=>item!==canvas)}
    }
  }
  function syncWorkshopPreviews(){
    workshopPreviewCanvases=[...document.querySelectorAll('#codexList canvas[data-preview]')];
    if(workshopPreviewCanvases.length&&!workshopPreviewRaf){workshopPreviewNext=0;workshopPreviewRaf=requestAnimationFrame(workshopPreviewTick)}
  }
  function renderCodex(){
    const xpBox=$('#codexXp');if(xpBox)xpBox.textContent=progress.xp;
    const rows=[...ARSENAL_TYPES,'wall'].map(type=>{
      const def=types[type],available=towerAvailable(type),unlocked=towerUnlocked(type);
      const tags=[`<span class="codex-tag cost">${towerCost(type)} E</span>`];
      if(def.tunable!==false){
        const profile=def.targets;
        tags.unshift(`<span class="codex-tag ${profile==='air'?'air':profile==='ground'?'ground':'both'}">${targetLabel(type)}</span>`);
      }else tags.unshift('<span class="codex-tag both">SPERRE</span>');
      if(!available)tags.push('<span class="codex-tag lock">🔒 ERST AB EINER SCHWER-MISSION</span>');
      let stats='';
      if(def.tunable===false){
        const slow=Math.round((1-activePlanet().mods.wallSlow)*100);
        stats=`<span>BREMST<b>−${slow} %</b></span><span>BAUKOSTEN<b>${towerCost(type)} E</b></span>`;
      }else{
        const s=towerStats({type}),tune=progress.upgrades[type],rank=tune.power+tune.rate+tune.range;
        const dmg=type==='drone'?`${Math.round(s.damage*1.12)} ×${s.drones}`:type==='rocket'?`${Math.round(s.damage/s.missiles)} ×${s.missiles}`:Math.round(s.damage);
        stats=`<span>SCHADEN<b>${dmg}</b></span><span>SCHUSS/MIN<b>${Math.round(60/s.rate)}</b></span>`
             +`<span>REICHWEITE<b>${Math.round(s.range)}</b></span><span>TUNING<b>${tune.power}/${tune.rate}/${tune.range}</b></span>`
             +`<span>RANG<b>${rank+1}</b></span>`;
      }
      const special=def.tunable===false?'Führt die Gegner um. Eine vollständige Blockade bleibt verboten.':codexSpecial(type,towerStats({type}));
      /* Aktionszeile: entweder freischalten oder tunen. Die Feldmauer kennt
         beides nicht, sie ist von Anfang an da und hat keine Stufen. */
      let actions='';
      if(def.tunable===false)actions='';
      else if(!available)actions='<div class="codex-actions"><span class="codex-note">Wird sichtbar, sobald eine Schwer-Mission erreichbar ist.</span></div>';
      else if(!unlocked){
        const cost=unlockXpCost(type),genug=progress.xp>=cost;
        actions=`<div class="codex-actions"><button class="codex-unlock" data-codex-unlock="${type}" ${genug?'':'disabled'}>FREISCHALTEN · ${cost} XP</button>`
               +`<span class="codex-note">${genug?'Danach im Arsenal baubar.':`Es fehlen ${cost-progress.xp} XP.`}</span></div>`;
      }else actions=`<div class="codex-actions codex-tuning">${codexTuneButton(type,'power','KRAFT')}${codexTuneButton(type,'rate','TAKT')}${codexTuneButton(type,'range','RANGE')}</div>`;
      return `<div class="codex-item ${available&&unlocked?'':'locked'}">
        <div class="codex-mark" style="color:${def.color}"><canvas class="codex-preview" data-preview="${type}" width="${WORKSHOP_PREVIEW.w*DPR}" height="${WORKSHOP_PREVIEW.h*DPR}" aria-hidden="true"></canvas><span class="codex-mark-glyph">${CODEX_GLYPHS[type]||'?'}</span></div>
        <div class="codex-main"><b style="color:${def.color}">${def.name}</b>
          <div class="codex-tags">${tags.join('')}</div>
          <div class="codex-stats">${stats}</div>
          <p>${special?special+' · ':''}${def.detail}</p>${actions}</div></div>`;
    });
    $('#codexList').innerHTML=rows.join('');
    syncWorkshopPreviews();
  }
  function openCodex(){renderCodex();$('#codexOverlay').hidden=false}
  function closeCodex(){$('#codexOverlay').hidden=true}
  function openSettings(){$('#settingsXpValue').textContent=progress.xp;$('#resetConfirm').hidden=true;$('#settingsOverlay').hidden=false}
  function closeSettings(){$('#settingsOverlay').hidden=true;$('#resetConfirm').hidden=true}
  function toggleIntel(){const section=$('#intelSection');if(section)section.open=!section.open}
  $('#intelBtn')?.addEventListener('click',toggleIntel);$('#selectionSection')?.addEventListener('toggle',event=>{if(event.target.open){const intel=$('#intelSection');if(intel)intel.open=false}uiSnapshot='';updateUI()});$('#intelSection')?.addEventListener('toggle',event=>{if(event.target.open){const sel=$('#selectionSection');if(sel)sel.open=false}});
  const ROTATE_HINT_KEY='icebound-rotate-hint-dismissed';const rotateHint=$('#rotateHint');
  function syncRotateHint(){if(!rotateHint)return;const portrait=matchMedia('(orientation:portrait) and (max-width:950px)').matches,dismissed=localStorage.getItem(ROTATE_HINT_KEY)==='1';rotateHint.hidden=!(portrait&&state?.started&&!state.over&&!dismissed)}
  $('#rotateHintClose')?.addEventListener('click',()=>{try{localStorage.setItem(ROTATE_HINT_KEY,'1')}catch(_){}syncRotateHint()});
  matchMedia('(orientation:portrait)').addEventListener?.('change',syncRotateHint);
  /* Optionale Verdrahtung: index.html und game.js koennen im PWA-Cache
     unterschiedlich alt sein. Ohne die Fragezeichen wuerde ein fehlendes
     Element den restlichen Startcode abbrechen und die Weltauswahl leer lassen. */
  $('#codexBtn')?.addEventListener('click',openCodex);$('#codexOpenBtn')?.addEventListener('click',openCodex);$('#codexCloseBtn')?.addEventListener('click',closeCodex);$('#codexOverlay')?.addEventListener('click',event=>{if(event.target.id==='codexOverlay')closeCodex()});
  $('#codexList')?.addEventListener('click',event=>{
    const unlock=event.target.closest?.('[data-codex-unlock]'),tune=event.target.closest?.('[data-codex-tune]');
    if(unlock)unlockFromCodex(unlock.dataset.codexUnlock);
    else if(tune)upgradeArsenal(tune.dataset.codexType,tune.dataset.codexTune);
  });
  $('#settingsBtn').addEventListener('click',openSettings);$('#settingsCloseBtn').addEventListener('click',closeSettings);$('#settingsOverlay').addEventListener('click',event=>{if(event.target.id==='settingsOverlay')closeSettings()});$('#resetProgressBtn').addEventListener('click',()=>{$('#resetConfirm').hidden=false});$('#resetCancelBtn').addEventListener('click',()=>{$('#resetConfirm').hidden=true});$('#resetConfirmBtn').addEventListener('click',resetProgress);
  $('#waveBtn').addEventListener('click',startWave);$('#testTuneSelect').addEventListener('change',event=>setArsenalTuningMode(event.target.value));$('#testEnemySelect').addEventListener('change',event=>setArsenalEnemyType(event.target.value));$('#buildBtn').addEventListener('click',()=>{if(state.buildPhase)discardBuild();else enterBuildPhase()});$('#buildCommitBtn').addEventListener('click',confirmPending);$('#buildDiscardBtn').addEventListener('click',cancelPlacement);$('#exitBtn').addEventListener('click',exitMission);$('#speedBtn').addEventListener('click',()=>{$('#speedBtn').textContent=(speed=speed===1?2:1)+'×'});$('#soundBtn').addEventListener('click',toggleAudio);$('#startBtn').addEventListener('click',()=>begin(false));$('#testBtn').addEventListener('click',()=>begin(true));
  $('#planetPicker').addEventListener('click',event=>{const button=event.target.closest('[data-planet]');if(button)selectWorld(button.dataset.planet,0)});$('#missionPicker').addEventListener('click',event=>{const button=event.target.closest('[data-mission]');if(button)selectWorld(activePlanetId,Number(button.dataset.mission))});
  addEventListener('keydown',e=>{const codex=$('#codexOverlay');
    if(e.code==='KeyI'&&codex&&!e.metaKey&&!e.ctrlKey){e.preventDefault();if(codex.hidden)openCodex();else closeCodex();return}
    if(e.key==='Escape'){if(codex&&!codex.hidden){closeCodex();return}if(!$('#settingsOverlay').hidden){closeSettings();return}if(state.buildPhase)cancelPlacement();else{clearSelection();updateUI()}return}if(e.key==='Enter'&&state.buildPhase){e.preventDefault();confirmPending();return}if(e.code==='KeyB'&&!state.buildPhase){e.preventDefault();enterBuildPhase();return}if(/^Digit[1-8]$/.test(e.code)){const towerType=ARSENAL_TYPES[Number(e.code.at(-1))-1];setSelected(towerType)}if(e.code==='KeyW')setSelected('wall');if(e.code==='Space'){e.preventDefault();if(state.buildPhase)confirmPending();else startWave()}});setInterval(()=>{$('#clock').textContent=new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})},1000);
  configureWorld();reset();renderWorldPicker();setMissionScreen(true);if(new URLSearchParams(location.search).has('developer-scorecard'))parent.postMessage({channel:'icebound-scorecard',action:'ready'},'*');else requestAnimationFrame(loop);
})();
