document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const ui = {
    overlay: document.getElementById('overlay'),
    overlayEyebrow: document.getElementById('overlayEyebrow'),
    overlayTitle: document.getElementById('overlayTitle'),
    overlayText: document.getElementById('overlayText'),
    overlayButton: document.getElementById('overlayButton'),
    restartButton: document.getElementById('restartButton'),
    waveBanner: document.getElementById('waveBanner'),
    eventFeed: document.getElementById('eventFeed'),
    healthFill: document.getElementById('healthFill'),
    ammoFill: document.getElementById('ammoFill'),
    nitroFill: document.getElementById('nitroFill'),
    healthValue: document.getElementById('healthValue'),
    ammoValue: document.getElementById('ammoValue'),
    nitroValue: document.getElementById('nitroValue'),
    scoreValue: document.getElementById('scoreValue'),
    waveValue: document.getElementById('waveValue'),
    comboValue: document.getElementById('comboValue'),
    killsValue: document.getElementById('killsValue'),
    grenadeValue: document.getElementById('grenadeValue'),
    highScoreValue: document.getElementById('highScoreValue'),
    objectiveTitle: document.getElementById('objectiveTitle'),
    objectiveText: document.getElementById('objectiveText'),
    threatValue: document.getElementById('threatValue'),
    threatText: document.getElementById('threatText'),
    netAddressInput: document.getElementById('netAddressInput'),
    hostLanButton: document.getElementById('hostLanButton'),
    joinLanButton: document.getElementById('joinLanButton'),
    netStatus: document.getElementById('netStatus')
  };

  const WORLD = { width: 2600, height: 1600 };
  const MAX_WAVE = 20;
  const HIGH_SCORE_KEY = 'zombie_racing_last_outrun_best';
  const NETWORK_TICK = 0.12;
  const FORCED_JOIN_ADDRESS = 'ws://oivazombi.com:8080';

  const roads = [
    { x: 390, y: 620, width: 1580, height: 210 },
    { x: 955, y: 100, width: 220, height: 680 },
    { x: 335, y: 500, width: 210, height: 820 },
    { x: 1815, y: 470, width: 220, height: 920 },
    { x: 780, y: 1145, width: 1290, height: 190 }
  ];

  const curvedRoads = [
    {
      width: 144,
      points: [
        { x: 390, y: 620 },
        { x: 430, y: 340 },
        { x: 720, y: 250 },
        { x: 1080, y: 230 },
        { x: 1450, y: 300 },
        { x: 1780, y: 430 },
        { x: 1925, y: 620 }
      ]
    },
    {
      width: 132,
      points: [
        { x: 980, y: 220 },
        { x: 760, y: 430 },
        { x: 820, y: 700 },
        { x: 1090, y: 900 },
        { x: 1360, y: 1030 },
        { x: 1510, y: 1280 },
        { x: 1390, y: 1240 }
      ]
    },
    {
      width: 128,
      points: [
        { x: 1925, y: 620 },
        { x: 2230, y: 760 },
        { x: 2320, y: 980 },
        { x: 2240, y: 1230 },
        { x: 1925, y: 1240 }
      ]
    },
    {
      width: 124,
      points: [
        { x: 430, y: 980 },
        { x: 320, y: 1190 },
        { x: 560, y: 1360 },
        { x: 860, y: 1390 },
        { x: 1180, y: 1240 }
      ]
    }
  ];

  normalizeCurvedRoadEndpoints(curvedRoads, roads);
  weldNearbyCurveEndpoints(curvedRoads, 28);

  function normalizeCurvedRoadEndpoints(curves, roadRects) {
    for (const curve of curves) {
      if (!curve.points || curve.points.length < 2) {
        continue;
      }

      snapCurveEndpointToNearestRoad(curve, 0, roadRects);
      snapCurveEndpointToNearestRoad(curve, curve.points.length - 1, roadRects);
    }
  }

  function snapCurveEndpointToNearestRoad(curve, endpointIndex, roadRects) {
    const point = curve.points[endpointIndex];
    const neighbor = endpointIndex === 0 ? curve.points[1] : curve.points[curve.points.length - 2];
    const tangentX = point.x - neighbor.x;
    const tangentY = point.y - neighbor.y;
    const tangentLength = Math.hypot(tangentX, tangentY) || 1;
    const tangentUnitX = tangentX / tangentLength;
    const tangentUnitY = tangentY / tangentLength;

    let best = null;

    for (const road of roadRects) {
      const isHorizontal = road.width >= road.height;
      let snappedX;
      let snappedY;
      let axisX;
      let axisY;

      if (isHorizontal) {
        snappedX = clamp(point.x, road.x, road.x + road.width);
        snappedY = road.y + road.height * 0.5;
        axisX = 1;
        axisY = 0;
      } else {
        snappedX = road.x + road.width * 0.5;
        snappedY = clamp(point.y, road.y, road.y + road.height);
        axisX = 0;
        axisY = 1;
      }

      const dx = point.x - snappedX;
      const dy = point.y - snappedY;
      const distanceSq = dx * dx + dy * dy;
      const alignment = Math.abs(tangentUnitX * axisX + tangentUnitY * axisY);
      const score = distanceSq * (1.2 - alignment * 0.35);

      if (!best || score < best.score) {
        best = { x: snappedX, y: snappedY, score };
      }
    }

    if (best) {
      point.x = Math.round(best.x);
      point.y = Math.round(best.y);
    }
  }

  function weldNearbyCurveEndpoints(curves, maxDistance) {
    const endpoints = [];
    const maxDistanceSq = maxDistance * maxDistance;

    for (let curveIndex = 0; curveIndex < curves.length; curveIndex++) {
      const points = curves[curveIndex].points;
      if (!points || points.length < 2) {
        continue;
      }
      endpoints.push({ curveIndex, pointIndex: 0, point: points[0] });
      endpoints.push({ curveIndex, pointIndex: points.length - 1, point: points[points.length - 1] });
    }

    for (let i = 0; i < endpoints.length; i++) {
      for (let j = i + 1; j < endpoints.length; j++) {
        const a = endpoints[i].point;
        const b = endpoints[j].point;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distanceSq = dx * dx + dy * dy;

        if (distanceSq <= maxDistanceSq) {
          const mergedX = Math.round((a.x + b.x) * 0.5);
          const mergedY = Math.round((a.y + b.y) * 0.5);
          a.x = mergedX;
          a.y = mergedY;
          b.x = mergedX;
          b.y = mergedY;
        }
      }
    }
  }

  const roadJunctions = curvedRoads.flatMap((curve) => {
    const start = curve.points[0];
    const end = curve.points[curve.points.length - 1];
    const radius = curve.width * 0.62;
    return [
      { x: start.x, y: start.y, radius },
      { x: end.x, y: end.y, radius }
    ];
  });

  const buildingLots = [
    { x: 60, y: 50, width: 220, height: 150, tone: '#0f1f2f', kind: 'power', name: 'GRID', accent: '#8dd3ff' },
    { x: 560, y: 70, width: 220, height: 140, tone: '#0d1826', kind: 'bar', name: 'NOVA BAR', accent: '#ff6fa2' },
    { x: 1220, y: 70, width: 330, height: 150, tone: '#101a27', kind: 'hotel', name: 'GRAND HOTEL', accent: '#79d8ff' },
    { x: 2080, y: 70, width: 300, height: 150, tone: '#0a1521', kind: 'garage', name: 'AUTO FIX', accent: '#ffd16e' },
    { x: 60, y: 430, width: 220, height: 130, tone: '#111e2e', kind: 'clinic', name: 'CLINIC', accent: '#8dff74' },
    { x: 560, y: 430, width: 170, height: 130, tone: '#132235', kind: 'office', name: 'OFFICES', accent: '#84c4ff' },
    { x: 1220, y: 430, width: 320, height: 130, tone: '#111e31', kind: 'diner', name: 'MOONLIGHT DINER', accent: '#ff8c6e' },
    { x: 2080, y: 430, width: 300, height: 130, tone: '#0b1725', kind: 'arcade', name: 'ARCADE', accent: '#74b2ff' },
    { x: 60, y: 870, width: 220, height: 170, tone: '#101a29', kind: 'apartments', name: 'LOFTS', accent: '#ca8dff' },
    { x: 560, y: 870, width: 220, height: 170, tone: '#13253a', kind: 'warehouse', name: 'DEPOT', accent: '#ffaf7f' },
    { x: 1500, y: 870, width: 290, height: 170, tone: '#101a29', kind: 'market', name: 'MARKET', accent: '#9cffc4' },
    { x: 2080, y: 870, width: 300, height: 170, tone: '#0c1623', kind: 'club', name: 'NIGHT CLUB', accent: '#7fffd0' },
    { x: 60, y: 1385, width: 220, height: 180, tone: '#111c2b', kind: 'station', name: 'STATION', accent: '#ffd37a' },
    { x: 560, y: 1450, width: 220, height: 110, tone: '#132032', kind: 'cinema', name: 'CINEMA', accent: '#ff7f92' },
    { x: 1260, y: 1385, width: 320, height: 180, tone: '#0d1724', kind: 'mall', name: 'CENTRAL', accent: '#87e0ff' },
    { x: 2080, y: 1385, width: 300, height: 180, tone: '#101d2f', kind: 'bank', name: 'BANK', accent: '#d1d8e8' }
  ];

  normalizeBuildingLotsAwayFromRoads(buildingLots, roads, curvedRoads);

  const boostPads = [
    { x: 1045, y: 722, radius: 28, cooldown: 0 },
    { x: 1445, y: 724, radius: 28, cooldown: 0 },
    { x: 982, y: 420, radius: 28, cooldown: 0 },
    { x: 2095, y: 840, radius: 28, cooldown: 0 },
    { x: 2210, y: 1105, radius: 28, cooldown: 0 },
    { x: 670, y: 1362, radius: 28, cooldown: 0 },
    { x: 1480, y: 1210, radius: 28, cooldown: 0 }
  ];

  const barricades = [];

  const streetLights = [
    { x: 505, y: 620, angle: Math.PI / 2 },
    { x: 805, y: 620, angle: Math.PI / 2 },
    { x: 1135, y: 620, angle: Math.PI / 2 },
    { x: 1470, y: 620, angle: Math.PI / 2 },
    { x: 1780, y: 620, angle: Math.PI / 2 },
    { x: 960, y: 210, angle: 0 },
    { x: 960, y: 470, angle: 0 },
    { x: 960, y: 760, angle: 0 },
    { x: 1830, y: 560, angle: Math.PI },
    { x: 1830, y: 860, angle: Math.PI },
    { x: 1830, y: 1180, angle: Math.PI },
    { x: 820, y: 1145, angle: -Math.PI / 2 },
    { x: 1220, y: 1145, angle: -Math.PI / 2 },
    { x: 1620, y: 1145, angle: -Math.PI / 2 },
    { x: 2010, y: 1145, angle: -Math.PI / 2 },
    { x: 430, y: 360, angle: 0.62 },
    { x: 760, y: 258, angle: 1.35 },
    { x: 1465, y: 322, angle: 2.0 },
    { x: 2225, y: 1000, angle: -2.75 },
    { x: 630, y: 1380, angle: 2.25 }
  ];

  const trafficLights = [
    { x: 980, y: 640, angle: 0, phaseOffset: 0.1 },
    { x: 1148, y: 640, angle: Math.PI, phaseOffset: 0.5 },
    { x: 1840, y: 690, angle: Math.PI / 2, phaseOffset: 1.2 },
    { x: 1840, y: 860, angle: -Math.PI / 2, phaseOffset: 1.8 },
    { x: 980, y: 1170, angle: Math.PI / 2, phaseOffset: 2.6 },
    { x: 1150, y: 1170, angle: -Math.PI / 2, phaseOffset: 3.1 }
  ];

  const crosswalks = [
    { x: 1065, y: 618, width: 86, height: 28, angle: 0 },
    { x: 1065, y: 812, width: 86, height: 28, angle: 0 },
    { x: 1822, y: 780, width: 30, height: 86, angle: 0 },
    { x: 1822, y: 1148, width: 30, height: 86, angle: 0 },
    { x: 980, y: 1160, width: 30, height: 86, angle: Math.PI / 2 }
  ];

  const roadSigns = [
    { x: 925, y: 612, angle: 0, type: 'speed40' },
    { x: 1190, y: 612, angle: 0, type: 'speed40' },
    { x: 1768, y: 740, angle: Math.PI / 2, type: 'stop' },
    { x: 1768, y: 1090, angle: Math.PI / 2, type: 'stop' },
    { x: 560, y: 1360, angle: 0.56, type: 'curve' },
    { x: 2085, y: 955, angle: -1.85, type: 'curve' },
    { x: 1430, y: 1248, angle: 0, type: 'oneway' },
    { x: 350, y: 1095, angle: 0.8, type: 'parking' }
  ];

  normalizeRoadFurniturePlacement(trafficLights, roadSigns, roads, curvedRoads);

  const parkedCars = [];

  const neonSigns = [
    { x: 705, y: 128, text: 'NOVA BAR', hue: '#ff6fa2' },
    { x: 1960, y: 134, text: 'AUTO FIX', hue: '#ffd16e' },
    { x: 700, y: 535, text: 'OPEN', hue: '#8dff74' },
    { x: 1945, y: 528, text: 'ARCADE', hue: '#74b2ff' },
    { x: 705, y: 930, text: 'MOTEL', hue: '#ca8dff' },
    { x: 1330, y: 930, text: 'MARKET', hue: '#ffaf7f' },
    { x: 1940, y: 930, text: 'CLUB', hue: '#7fffd0' }
  ];

  const mines = [
    { x: 760, y: 260, radius: 18, armed: true, pulse: rand(0, Math.PI * 2) },
    { x: 1490, y: 320, radius: 18, armed: true, pulse: rand(0, Math.PI * 2) },
    { x: 495, y: 725, radius: 18, armed: true, pulse: rand(0, Math.PI * 2) },
    { x: 1240, y: 722, radius: 18, armed: true, pulse: rand(0, Math.PI * 2) },
    { x: 1945, y: 722, radius: 18, armed: true, pulse: rand(0, Math.PI * 2) },
    { x: 2250, y: 1030, radius: 18, armed: true, pulse: rand(0, Math.PI * 2) },
    { x: 1510, y: 1270, radius: 18, armed: true, pulse: rand(0, Math.PI * 2) },
    { x: 700, y: 1390, radius: 18, armed: true, pulse: rand(0, Math.PI * 2) }
  ];

  const zombieTypes = {
    walker: { label: 'Walker', health: 70, speed: 76, radius: 18, damage: 11, reward: 110, tint: '#90c45f' },
    runner: { label: 'Runner', health: 42, speed: 138, radius: 14, damage: 8, reward: 135, tint: '#f6a23d' },
    brute: { label: 'Brute', health: 220, speed: 54, radius: 28, damage: 18, reward: 300, tint: '#bf4e4e' },
    spitter: { label: 'Spitter', health: 90, speed: 70, radius: 19, damage: 9, reward: 190, tint: '#55d16f' },
    boss: { label: 'Behemoth', health: 620, speed: 62, radius: 42, damage: 26, reward: 1250, tint: '#d64f9e' }
  };

  const pickupPalette = {
    ammo: { color: '#ffd84d', ring: '#fff4b0', label: 'AMMO' },
    nitro: { color: '#2ed1ff', ring: '#b0f4ff', label: 'N2O' },
    medkit: { color: '#ff6f77', ring: '#ffc2c5', label: 'MED' },
    grenade: { color: '#8dff74', ring: '#d6ffcd', label: 'BOOM' }
  };

  const weaponTiers = [
    { name: 'Street Repeater', pellets: 1, spread: 0, damage: 36, cooldown: 0.11, speed: 780, life: 0.85, radius: 4, soundStart: 390, soundEnd: 180 },
    { name: 'Twin Fang', pellets: 2, spread: 0.09, damage: 34, cooldown: 0.105, speed: 800, life: 0.88, radius: 4, soundStart: 410, soundEnd: 190 },
    { name: 'Riot Lance', pellets: 4, spread: 0.18, damage: 34, cooldown: 0.092, speed: 830, life: 0.9, radius: 4.8, soundStart: 450, soundEnd: 205 }
  ];

  const synth = createSynth();
  const keys = {};

  let car = createCar();
  let game = createGameState();
  let zombies = [];
  let bullets = [];
  let grenades = [];
  let enemyProjectiles = [];
  let acidPools = [];
  let particles = [];
  let floatingTexts = [];
  let pickups = [];
  let skidMarks = [];
  let lastTimestamp = 0;
  let supportGunner = createSupportGunner();
  let network = createNetworkState();

  const camera = { x: 0, y: 0, shake: 0, flash: 0, shakeTimer: 0 };

  queueEvent('Moottori kylmänä. Käynnistä hyökkäys ja avaa viimeinen reitti.', 'warning');
  syncHud();
  render(0);

  ui.overlayButton.addEventListener('click', startGame);
  ui.restartButton.addEventListener('click', startGame);
  ui.hostLanButton.addEventListener('click', () => connectLan('host'));
  ui.joinLanButton.addEventListener('click', () => connectLan('client'));

  document.addEventListener('keydown', (event) => {
    keys[event.code] = true;
    if (event.code === 'Space' || event.code.startsWith('Arrow')) {
      event.preventDefault();
    }
    if (event.code === 'Enter' && game.over) {
      startGame();
    }
    sendClientInput();
  });

  document.addEventListener('keyup', (event) => {
    keys[event.code] = false;
    sendClientInput();
  });

  requestAnimationFrame(loop);

  function createCar() {
    return {
      x: 1100,
      y: 715,
      angle: -Math.PI / 2,
      speed: 0,
      velocityX: 0,
      velocityY: 0,
      steer: 0,
      bodyRoll: 0,
      suspensionPitch: 0,
      width: 86,
      height: 44,
      radius: 30,
        health: 200,
        maxHealth: 200,
      ammo: 180,
      maxAmmo: 180,
      grenades: 5,
      nitro: 100,
      maxNitro: 100,
      fireCooldown: 0,
      grenadeCooldown: 0,
      hurtCooldown: 0,
      obstacleCooldown: 0,
      tireSoundTimer: 0,
      driftSoundTimer: 0,
      weaponLevel: 0,
      boostGlow: 0,
      roadkillGlow: 0,
      offroadDust: 0
    };
  }

  function createSupportGunner() {
    return {
      fireCooldown: 0
    };
  }

  function createNetworkState() {
    return {
      mode: 'solo',
      socket: null,
      connected: false,
      lastSend: 0,
      lastClientInputSent: 0,
      lastPlayerStateSent: 0,
      remoteInputs: {},
      latestSnapshot: null,
      myPlayerId: null,
      remotePlayers: {},  // playerId -> {x, y, angle, health, maxHealth, radius}
      clientDead: false
    };
  }

  function ensureRemotePlayer(playerId) {
    if (!network.remotePlayers[playerId]) {
      network.remotePlayers[playerId] = {
        x: car.x,
        y: car.y,
        angle: 0,
        health: 200,
        maxHealth: 200,
        radius: car.radius || 30
      };
    }
    return network.remotePlayers[playerId];
  }

  function setNetworkStatus(text) {
    if (ui.netStatus) {
      ui.netStatus.textContent = text;
    }
  }

  function prepareClientDriveState() {
    if (network.clientCarReady && !network.clientDead) {
      return;
    }
    car = createCar();
    car.x = 1100 + rand(-120, 120);
    car.y = 850 + rand(-120, 120);
    camera.x = car.x - canvas.width / 2;
    camera.y = car.y - canvas.height / 2;
    camera.shake = 0;
    camera.flash = 0;
    network.clientCarReady = true;
    network.clientDead = false;
  }

  function normalizeLanAddress(mode = network.mode) {
    if (mode === 'client') {
      return FORCED_JOIN_ADDRESS;
    }

    const raw = (ui.netAddressInput?.value || '').trim();
    if (raw) {
      return raw;
    }
    return `ws://${window.location.hostname || 'localhost'}:8080`;
  }

  function connectLan(mode) {
    const address = normalizeLanAddress(mode);
    if (mode === 'client' && ui.netAddressInput) {
      ui.netAddressInput.value = FORCED_JOIN_ADDRESS;
    }
    if (network.socket) {
      network.socket.close();
    }

    network.mode = mode;
    network.connected = false;
    network.remoteInputs = {};
    network.latestSnapshot = null;
    network.remotePlayers = {};

    setNetworkStatus(`Yhdistetaan: ${address}`);
    const socket = new WebSocket(address);
    network.socket = socket;

    socket.addEventListener('open', () => {
      network.connected = true;
      socket.send(JSON.stringify({ type: mode === 'host' ? 'host' : 'join' }));
      setNetworkStatus(mode === 'host' ? 'LAN host aktiivinen' : 'Liitytty hostiin');
      queueEvent(mode === 'host' ? 'LAN host kaynnissa. Pelaajat voivat liittya verkosta.' : 'Liityit LAN-peliin. Host paivittaa maailman.', 'accent');
      if (mode === 'client') {
        prepareClientDriveState();
        showOverlay('LAN Client', 'Waiting For Host', 'Odotetaan hostin pelitilaa. Kun host kaynnistaa ajon, maailma synkataan automaattisesti.', 'Valmis');
      }
    });

    socket.addEventListener('message', (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      if (payload.type === 'status' && typeof payload.text === 'string') {
        setNetworkStatus(payload.text);
        return;
      }

      if (payload.type === 'hello') {
        network.myPlayerId = payload.playerId;
        return;
      }

      if (payload.type === 'playerState') {
        // Another player's car position update
        const existing = ensureRemotePlayer(payload.playerId);
        network.remotePlayers[payload.playerId] = {
          ...existing,
          ...(payload.car || {})
        };
        return;
      }

      if (payload.type === 'state' && network.mode === 'client') {
        network.latestSnapshot = payload.payload;
        return;
      }

      if (payload.type === 'remoteInput' && network.mode === 'host') {
        network.remoteInputs[payload.playerId] = payload.payload;
      }
    });

    socket.addEventListener('close', () => {
      network.connected = false;
      if (network.mode !== 'solo') {
        setNetworkStatus('LAN-yhteys katkaistu');
      }
    });

    socket.addEventListener('error', () => {
      setNetworkStatus('LAN-yhteys epaonnistui');
    });
  }

  function sendNetworkMessage(message) {
    if (!network.socket || network.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    try {
      network.socket.send(JSON.stringify(message));
    } catch (error) {
      setNetworkStatus('LAN-lahetys epaonnistui');
      console.error('LAN send failed:', error);
    }
  }

  function sendClientInput() {
    if (network.mode !== 'client' || !network.connected || !network.socket || network.clientDead) {
      return;
    }

    const now = performance.now();
    if (now - network.lastClientInputSent < 25) {
      return;
    }
    network.lastClientInputSent = now;

    const payload = {
      fire: Boolean(keys.Space || keys.KeyF || keys.KeyP),
      grenade: Boolean(keys.KeyG),
      carX: car.x,
      carY: car.y,
      carAngle: normalizeAngle(car.angle)
    };
    sendNetworkMessage({ type: 'input', payload });
  }

  function sendPlayerState() {
    if (!network.connected || !network.socket) return;
    const now = performance.now();
    if (now - network.lastPlayerStateSent < 50) return;
    network.lastPlayerStateSent = now;
    sendNetworkMessage({
      type: 'playerState',
      car: { x: car.x, y: car.y, angle: normalizeAngle(car.angle) }
    });
  }

  function buildNetworkSnapshot() {
    const snapshotZombies = zombies.slice(0, 220);
    const snapshotBullets = bullets.slice(0, 320);
    const snapshotGrenades = grenades.slice(0, 80);
    const snapshotProjectiles = enemyProjectiles.slice(0, 120);
    const snapshotAcid = acidPools.slice(0, 70);
    const snapshotPickups = pickups.slice(0, 100);

    return {
      car,
      game,
      zombies: snapshotZombies,
      bullets: snapshotBullets,
      grenades: snapshotGrenades,
      enemyProjectiles: snapshotProjectiles,
      acidPools: snapshotAcid,
      pickups: snapshotPickups,
      remotePlayers: network.remotePlayers,
      camera,
      supportGunner
    };
  }

  function applyNetworkSnapshot(snapshot) {
    if (!snapshot) {
      return;
    }

    if (network.mode === 'client') {
      // In client mode: keep our local car, only take world state from host
      const savedCar = car;
      game = snapshot.game;
      zombies = snapshot.zombies || [];
      bullets = snapshot.bullets || [];
      grenades = snapshot.grenades || [];
      enemyProjectiles = snapshot.enemyProjectiles || [];
      acidPools = snapshot.acidPools || [];
      floatingTexts = snapshot.floatingTexts || floatingTexts;
      pickups = snapshot.pickups || [];
      network.remotePlayers = snapshot.remotePlayers || network.remotePlayers;
      skidMarks = skidMarks; // keep own skids
      supportGunner = snapshot.supportGunner || supportGunner;

      if (network.myPlayerId && snapshot.remotePlayers && snapshot.remotePlayers[network.myPlayerId]) {
        const remoteSelf = snapshot.remotePlayers[network.myPlayerId];
        if (Number.isFinite(remoteSelf.health)) {
          savedCar.health = clamp(remoteSelf.health, 0, savedCar.maxHealth);
          if (savedCar.health <= 0 && !network.clientDead) {
            network.clientDead = true;
            showOverlay('Game Over', 'Remote Unit Destroyed', 'Hull Integrity romahti nollaan. Et voi liikkua ennen seuraavaa ajoa tai uutta liittymistä.', 'Valmis');
            queueEvent('Remote auto tuhoutui. Liike ja tuli estetty.', 'danger');
            setNetworkStatus('Remote auto tuhottu');
          }
        }
      }
      car = savedCar;

      // Save host's car as a remote player for rendering
      if (snapshot.car && network.myPlayerId) {
        network.remotePlayers['__host__'] = { x: snapshot.car.x, y: snapshot.car.y, angle: snapshot.car.angle, isHost: true };
      }
    } else {
      car = snapshot.car;
      game = snapshot.game;
      zombies = snapshot.zombies || [];
      bullets = snapshot.bullets || [];
      grenades = snapshot.grenades || [];
      enemyProjectiles = snapshot.enemyProjectiles || [];
      acidPools = snapshot.acidPools || [];
      particles = snapshot.particles || particles;
      floatingTexts = snapshot.floatingTexts || floatingTexts;
      pickups = snapshot.pickups || [];
      skidMarks = snapshot.skidMarks || skidMarks;
      supportGunner = snapshot.supportGunner || supportGunner;

      if (snapshot.camera) {
        camera.x = snapshot.camera.x;
        camera.y = snapshot.camera.y;
        camera.shake = snapshot.camera.shake;
        camera.flash = snapshot.camera.flash;
      }
    }

    if (game.started && !network.clientDead) {
      hideOverlay();
    }

    syncHud();
  }

  function getWeaponProfile(level = car.weaponLevel) {
    return weaponTiers[Math.min(level, weaponTiers.length - 1)];
  }

  function getNextWeaponUnlock() {
    if (car.weaponLevel >= weaponTiers.length - 1) {
      return null;
    }
    return (car.weaponLevel + 1) * 100;
  }

  function upgradeWeaponIfNeeded() {
    const unlockedLevel = Math.min(Math.floor(game.kills / 100), weaponTiers.length - 1);
    if (unlockedLevel <= car.weaponLevel) {
      return;
    }

    car.weaponLevel = unlockedLevel;
    const weapon = getWeaponProfile();
    queueEvent(`Uusi ase avattu: ${weapon.name}. ${game.kills} tappoa takana.`, 'accent');
    floatingTexts.push({ x: car.x, y: car.y - 56, text: weapon.name.toUpperCase(), color: '#89f0ff', life: 1.2, maxLife: 1.2 });
    camera.flash = Math.max(camera.flash, 0.18);
    synth.pulse({ type: 'triangle', start: 360, end: 760, duration: 0.18, volume: 0.03 });
  }

  function createGameState() {
    return {
      started: false,
      over: false,
      victory: false,
      wave: 0,
      phase: 'intro',
      intermission: 0,
      score: 0,
      combo: 1,
      comboTimer: 0,
      kills: 0,
      liveEnemies: 0,
      highScore: Number.parseInt(localStorage.getItem(HIGH_SCORE_KEY) || '0', 10),
      bannerTimer: 0,
      elapsed: 0,
      objective: 'Odota käynnistystä',
      threat: 'Matala',
      threatText: 'Tutka aktivoituu heti kun moottori herää.'
    };
  }

  function createSynth() {
    return {
      context: null,
      enabled: true,
      engineNodes: null,
      tireNodes: null,
      unlock() {
        if (!this.context) {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (!AudioContext) {
            this.enabled = false;
            return;
          }
          this.context = new AudioContext();
        }
        if (this.context.state === 'suspended') {
          this.context.resume().catch(() => {});
        }
      },
      ensureEngine() {
        if (!this.enabled) {
          return;
        }
        this.unlock();
        if (!this.context || this.engineNodes) {
          return;
        }

        const master = this.context.createGain();
        master.gain.value = 0.0001;

        const body = this.context.createOscillator();
        body.type = 'sawtooth';
        body.frequency.value = 110;

        const rasp = this.context.createOscillator();
        rasp.type = 'square';
        rasp.frequency.value = 220;

        const bodyGain = this.context.createGain();
        bodyGain.gain.value = 0.55;
        const raspGain = this.context.createGain();
        raspGain.gain.value = 0.32;

        const lowpass = this.context.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 1400;
        lowpass.Q.value = 2.2;

        const highpass = this.context.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.value = 80;

        body.connect(bodyGain);
        rasp.connect(raspGain);
        bodyGain.connect(lowpass);
        raspGain.connect(lowpass);
        lowpass.connect(highpass);
        highpass.connect(master);
        master.connect(this.context.destination);

        body.start();
        rasp.start();

        this.engineNodes = { master, body, rasp, lowpass };
      },
      setEngine(options) {
        if (!this.enabled) {
          return;
        }
        this.ensureEngine();
        if (!this.context || !this.engineNodes) {
          return;
        }

        const { rpm, load, boosting } = options;
        const time = this.context.currentTime;
        const engineRpm = clamp(rpm, 0, 1);
        const engineLoad = clamp(load, 0, 1);
        const bodyHz = 110 + engineRpm * 220 + (boosting ? 40 : 0);
        const raspHz = bodyHz * 2.0 + (boosting ? 80 : 0);
        const cutoff = 900 + engineLoad * 2200 + (boosting ? 600 : 0);
        const gain = Math.max(0.0001, 0.025 + engineRpm * 0.038 + engineLoad * 0.018 + (boosting ? 0.018 : 0));

        this.engineNodes.body.frequency.cancelScheduledValues(time);
        this.engineNodes.rasp.frequency.cancelScheduledValues(time);
        this.engineNodes.lowpass.frequency.cancelScheduledValues(time);
        this.engineNodes.master.gain.cancelScheduledValues(time);

        this.engineNodes.body.frequency.exponentialRampToValueAtTime(bodyHz, time + 0.08);
        this.engineNodes.rasp.frequency.exponentialRampToValueAtTime(raspHz, time + 0.08);
        this.engineNodes.lowpass.frequency.exponentialRampToValueAtTime(cutoff, time + 0.08);
        this.engineNodes.master.gain.exponentialRampToValueAtTime(gain, time + 0.08);
      },
      stopEngine() {
        if (!this.context || !this.engineNodes) {
          return;
        }
        const time = this.context.currentTime;
        this.engineNodes.master.gain.cancelScheduledValues(time);
        this.engineNodes.master.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
      },
      ensureTires() {
        if (!this.enabled) return;
        this.unlock();
        if (!this.context || this.tireNodes) return;

        const ctx = this.context;
        // 2-second looped white noise buffer
        const sampleRate = ctx.sampleRate;
        const bufLen = sampleRate * 2;
        const buf = ctx.createBuffer(1, bufLen, sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;

        // Rolling chain: noise → hp → lp → rollGain → master
        const rollSrc = ctx.createBufferSource();
        rollSrc.buffer = buf;
        rollSrc.loop = true;
        const rollHp = ctx.createBiquadFilter();
        rollHp.type = 'highpass';
        rollHp.frequency.value = 200;
        const rollLp = ctx.createBiquadFilter();
        rollLp.type = 'lowpass';
        rollLp.frequency.value = 600;
        rollLp.Q.value = 0.8;
        const rollGain = ctx.createGain();
        rollGain.gain.value = 0.0001;
        rollSrc.connect(rollHp);
        rollHp.connect(rollLp);
        rollLp.connect(rollGain);
        rollGain.connect(ctx.destination);
        rollSrc.start();

        // Screech chain: noise → screeHp → screeLp → screechGain → master
        const screechSrc = ctx.createBufferSource();
        screechSrc.buffer = buf;
        screechSrc.loop = true;
        screechSrc.loopStart = 0.3;
        const screeHp = ctx.createBiquadFilter();
        screeHp.type = 'highpass';
        screeHp.frequency.value = 900;
        const screeLp = ctx.createBiquadFilter();
        screeLp.type = 'lowpass';
        screeLp.frequency.value = 4800;
        screeLp.Q.value = 2.5;
        const screechGain = ctx.createGain();
        screechGain.gain.value = 0.0001;
        screechSrc.connect(screeHp);
        screeHp.connect(screeLp);
        screeLp.connect(screechGain);
        screechGain.connect(ctx.destination);
        screechSrc.start();

        this.tireNodes = { rollHp, rollLp, rollGain, screeHp, screeLp, screechGain };
      },
      setTires({ speed, slip, onRoad }) {
        if (!this.enabled) return;
        this.ensureTires();
        if (!this.context || !this.tireNodes) return;

        const ctx = this.context;
        const t = ctx.currentTime;
        const ramp = 0.06;
        const speedN = clamp(speed / 430, 0, 1);

        // Rolling: volume proportional to speed, filter rises with speed
        const rollVol = speed > 40
          ? clamp(0.0018 + speedN * 0.014 + (onRoad ? 0 : 0.006), 0, 0.024)
          : 0.0001;
        const rollHpFreq = onRoad ? 160 : 280;
        const rollLpFreq = clamp(380 + speedN * 1100, 380, 1480);

        this.tireNodes.rollHp.frequency.cancelScheduledValues(t);
        this.tireNodes.rollLp.frequency.cancelScheduledValues(t);
        this.tireNodes.rollGain.gain.cancelScheduledValues(t);
        this.tireNodes.rollHp.frequency.linearRampToValueAtTime(rollHpFreq, t + ramp);
        this.tireNodes.rollLp.frequency.linearRampToValueAtTime(rollLpFreq, t + ramp);
        this.tireNodes.rollGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, rollVol), t + ramp);

        // Screech: volume proportional to lateral slip
        const slipN = clamp((slip - 18) / 160, 0, 1);
        const screeVol = (onRoad && speed > 100 && slipN > 0)
          ? clamp(slipN * 0.028 + speedN * 0.004, 0.0001, 0.036)
          : 0.0001;
        const screeLpFreq = clamp(2600 + slipN * 2200 + speedN * 600, 2600, 5400);

        this.tireNodes.screeLp.frequency.cancelScheduledValues(t);
        this.tireNodes.screechGain.gain.cancelScheduledValues(t);
        this.tireNodes.screeLp.frequency.linearRampToValueAtTime(screeLpFreq, t + ramp);
        this.tireNodes.screechGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, screeVol), t + ramp);
      },
      stopTires() {
        if (!this.context || !this.tireNodes) return;
        const t = this.context.currentTime;
        this.tireNodes.rollGain.gain.cancelScheduledValues(t);
        this.tireNodes.screechGain.gain.cancelScheduledValues(t);
        this.tireNodes.rollGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        this.tireNodes.screechGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      },
      pulse(options) {
        if (!this.enabled) {
          return;
        }
        this.unlock();
        if (!this.context) {
          return;
        }

        const { type, start, end, duration, volume } = options;
        const time = this.context.currentTime;
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(start, time);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), time + duration);
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        oscillator.connect(gain);
        gain.connect(this.context.destination);
        oscillator.start(time);
        oscillator.stop(time + duration);
      },
      noise(options) {
        if (!this.enabled) {
          return;
        }
        this.unlock();
        if (!this.context) {
          return;
        }

        const { duration, volume, highpass = 380, lowpass = 2400 } = options;
        const time = this.context.currentTime;
        const sampleRate = this.context.sampleRate;
        const frameCount = Math.max(1, Math.floor(sampleRate * duration));
        const buffer = this.context.createBuffer(1, frameCount, sampleRate);
        const data = buffer.getChannelData(0);
        for (let index = 0; index < frameCount; index++) {
          data[index] = (Math.random() * 2 - 1) * (1 - index / frameCount);
        }

        const source = this.context.createBufferSource();
        source.buffer = buffer;

        const hp = this.context.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.setValueAtTime(highpass, time);

        const lp = this.context.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(lowpass, time);

        const gain = this.context.createGain();
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

        source.connect(hp);
        hp.connect(lp);
        lp.connect(gain);
        gain.connect(this.context.destination);
        source.start(time);
        source.stop(time + duration);
      }
    };
  }

  function startGame() {
    if (network.mode === 'client') {
      synth.unlock();
      prepareClientDriveState();
      supportGunner = createSupportGunner();
      setNetworkStatus('LAN client: aja omaa autoa! World synkataan hostilta.');
      queueEvent('Liityit LAN-peliin. Aja omaa autoa – zombiet tulevat hostilta.', 'accent');
      showOverlay('LAN Client', 'Odotetaan hostin peliä', 'Aja omalla autolla. Peli alkaa kun host käynnistää.', 'Valmis');
      return;
    }

    synth.unlock();
    car = createCar();
    supportGunner = createSupportGunner();
    game = createGameState();
    zombies = [];
    bullets = [];
    grenades = [];
    enemyProjectiles = [];
    acidPools = [];
    particles = [];
    floatingTexts = [];
    pickups = [];
    skidMarks = [];

    camera.x = car.x - canvas.width / 2;
    camera.y = car.y - canvas.height / 2;
    camera.shake = 0;
    camera.flash = 0;

    game.started = true;
    game.phase = 'wave';
    hideOverlay();
    spawnWave(1);
    queueEvent('Reitti aukesi. Pidä auto liikkeessä ja lauma hajallaan.', 'accent');
    queueEvent('Co-op aktiivinen: P1 ajaa, P2 ampuu P-näppäimellä.', 'accent');
    if (network.mode === 'host' && network.connected) {
      queueEvent('LAN host: liittyneet pelaajat voivat ampua tukitulena.', 'accent');
    }
    synth.pulse({ type: 'sawtooth', start: 180, end: 90, duration: 0.22, volume: 0.05 });
    syncHud();
  }

  function showOverlay(eyebrow, title, text, buttonText) {
    ui.overlayEyebrow.textContent = eyebrow;
    ui.overlayTitle.textContent = title;
    ui.overlayText.textContent = text;
    ui.overlayButton.textContent = buttonText;
    ui.overlay.classList.add('visible');
  }

  function hideOverlay() {
    ui.overlay.classList.remove('visible');
  }

  function spawnWave(number) {
    game.wave = number;
    game.phase = 'wave';

    const entries = [];
    const walkerCount = 6 + number * 2;
    const runnerCount = Math.max(0, number - 1) * 2;
    const spitterCount = Math.max(0, Math.floor(number / 2));
    const bruteCount = Math.max(0, Math.floor((number - 1) / 2));

    for (let index = 0; index < walkerCount; index++) entries.push('walker');
    for (let index = 0; index < runnerCount; index++) entries.push('runner');
    for (let index = 0; index < spitterCount; index++) entries.push('spitter');
    for (let index = 0; index < bruteCount; index++) entries.push('brute');

    if (number === MAX_WAVE) {
      entries.push('boss', 'brute', 'spitter', 'runner', 'runner');
    }

    entries.forEach((type) => {
      const position = findSpawnPoint();
      zombies.push(createZombie(type, position.x, position.y));
    });

    game.liveEnemies = zombies.length;
    setObjective(
      number === MAX_WAVE ? `Wave ${MAX_WAVE}: Doom Behemoth saapuu` : `Wave ${number}: Pidä väylä puhtaana`,
      `Eliminioi ${entries.length} uhkaa ja säilytä runko ehjänä.`
    );

    updateThreatLevel();
    showBanner(number === MAX_WAVE ? 'Final Wave // Doom Behemoth inbound' : `Wave ${number} // Dead city rising`);
    queueEvent(number === MAX_WAVE ? 'Doom Behemoth havaittu. Wave 20 on täysi painajainen.' : `Wave ${number} hyökkää kaikkialta.`, number === MAX_WAVE ? 'danger' : 'warning');
    synth.pulse({ type: 'square', start: 240, end: 110, duration: 0.18, volume: 0.04 });
  }

  function createZombie(type, x, y) {
    const stats = zombieTypes[type];
    const isFinalBoss = type === 'boss' && game.wave === MAX_WAVE;
    return {
      type,
      x,
      yBase: y,
      y,
      velocityX: 0,
      velocityY: 0,
      health: isFinalBoss ? stats.health * 4 : stats.health,
      maxHealth: isFinalBoss ? stats.health * 4 : stats.health,
      speed: isFinalBoss ? stats.speed + 22 : stats.speed,
      radius: isFinalBoss ? stats.radius + 16 : stats.radius,
      damage: isFinalBoss ? stats.damage + 16 : stats.damage,
      reward: (isFinalBoss ? stats.reward * 3 : stats.reward) + game.wave * 12,
      tint: stats.tint,
      attackCooldown: isFinalBoss ? rand(0.25, 0.8) : rand(0.4, 1.2),
      facing: rand(0, Math.PI * 2),
      pulse: rand(0, Math.PI * 2),
      strafeSeed: rand(-1, 1),
      walkCycle: rand(0, Math.PI * 2),
      gaitOffset: rand(-0.35, 0.35),
      limp: 0,
      breathe: rand(0, Math.PI * 2),
      blinkTimer: rand(0.6, 2.2),
      blink: 0,
      headYaw: 0,
      pace: 0,
      isFinalBoss
    };
  }

  function setObjective(title, text) {
    game.objective = title;
    ui.objectiveTitle.textContent = title;
    ui.objectiveText.textContent = text;
  }

  function updateThreatLevel() {
    if (!game.started) {
      ui.threatValue.textContent = game.threat;
      ui.threatText.textContent = game.threatText;
      return;
    }

    if (zombies.some((zombie) => zombie.isFinalBoss)) {
      game.threat = 'Sukupuutto';
      game.threatText = 'Doom Behemoth syöksee happoa ja murskaa kaiken tieltään.';
    } else if (game.wave >= MAX_WAVE || zombies.some((zombie) => zombie.type === 'boss')) {
      game.threat = 'Apokalyptinen';
      game.threatText = 'Behemoth tai loppuaallon paine vaatii täyden liikkuvuuden.';
    } else if (zombies.some((zombie) => zombie.type === 'brute' || zombie.type === 'spitter')) {
      game.threat = 'Korkea';
      game.threatText = 'Brutet tankkaavat osumia ja spitters pakottavat väistämään happoa.';
    } else if (zombies.length > 10) {
      game.threat = 'Kasvava';
      game.threatText = 'Lauma tihenee. Pidä combo käynnissä tai jäät mottiin.';
    } else {
      game.threat = 'Hallinnassa';
      game.threatText = 'Paina eteenpäin ja kerää kentälle tippuneet tarvikkeet.';
    }

    ui.threatValue.textContent = game.threat;
    ui.threatText.textContent = game.threatText;
  }

  function findSpawnPoint() {
    for (let attempt = 0; attempt < 30; attempt++) {
      const angle = rand(0, Math.PI * 2);
      const distance = rand(520, 860);
      const x = clamp(car.x + Math.cos(angle) * distance, 40, WORLD.width - 40);
      const y = clamp(car.y + Math.sin(angle) * distance, 40, WORLD.height - 40);
      if (distanceBetween(x, y, car.x, car.y) > 430) {
        return { x, y };
      }
    }
    return { x: rand(60, WORLD.width - 60), y: rand(60, WORLD.height - 60) };
  }

  function spawnSupplyDrops() {
    const options = ['ammo', 'nitro', 'medkit', 'grenade'];
    for (let index = 0; index < 3; index++) {
      const road = roads[(game.wave + index) % roads.length];
      const x = road.x + rand(50, road.width - 50);
      const y = road.y + rand(40, road.height - 40);
      spawnPickup(options[(game.wave + index) % options.length], x, y);
    }
    queueEvent('Supply drops osuvat asfaltille. Ota ne ennen seuraavaa aaltoa.', 'accent');
    synth.pulse({ type: 'triangle', start: 330, end: 660, duration: 0.18, volume: 0.04 });
  }

  function spawnPickup(type, x, y) {
    pickups.push({ type, x, y, radius: 16, bob: rand(0, Math.PI * 2), life: 18 });
  }

  function loop(timestamp) {
    const delta = Math.min(0.033, (timestamp - lastTimestamp) / 1000 || 0.016);
    lastTimestamp = timestamp;
    try {
      update(delta);
      render(delta);
    } catch (error) {
      // Keep RAF alive even if one frame fails.
      console.error('Frame error:', error);
      if (network.mode !== 'client') {
        queueEvent('Frame error recovered. Jatketaan ajoa.', 'warning');
      }
    }
    requestAnimationFrame(loop);
  }

  function update(delta) {
    if (network.mode === 'client') {
      if (network.latestSnapshot) {
        applyNetworkSnapshot(network.latestSnapshot);
        network.latestSnapshot = null;
      }

      // Run local car physics if client has started their car
      if (network.clientCarReady) {
        if (network.clientDead || car.health <= 0) {
          network.clientDead = true;
          synth.stopEngine();
          synth.stopTires();
          return;
        }

        camera.shakeTimer = Math.max(0, camera.shakeTimer - delta);
        if (camera.shakeTimer <= 0) camera.shake = Math.max(0, camera.shake - delta * 3.5);
        camera.flash = Math.max(0, camera.flash - delta * 2.6);
        car.hurtCooldown = Math.max(0, car.hurtCooldown - delta);
        car.obstacleCooldown = Math.max(0, car.obstacleCooldown - delta);
        car.tireSoundTimer = Math.max(0, car.tireSoundTimer - delta);
        car.driftSoundTimer = Math.max(0, car.driftSoundTimer - delta);
        car.fireCooldown = Math.max(0, car.fireCooldown - delta);
        car.grenadeCooldown = Math.max(0, car.grenadeCooldown - delta);
        car.boostGlow = Math.max(0, car.boostGlow - delta * 1.6);
        car.offroadDust = Math.max(0, car.offroadDust - delta * 2.4);
        supportGunner.fireCooldown = Math.max(0, supportGunner.fireCooldown - delta);

        updateCar(delta);
        updateCamera();

        // No local bullet spawning - host handles bullets, we just send input
        updateParticles(delta);
        updateFloatingTexts(delta);
        updateSkidMarks(delta);

        sendClientInput();
        sendPlayerState();
        syncHud();
      }
      return;
    }

    // Keep ambient animations and host/client sync alive even outside active run.
    game.elapsed += delta;
    if (network.mode === 'host' && network.connected && network.socket) {
      network.lastSend += delta;
      if (network.lastSend >= NETWORK_TICK) {
        network.lastSend = 0;
        sendNetworkMessage({ type: 'state', payload: buildNetworkSnapshot() });
      }
    }

    if (!game.started || game.over) {
      synth.stopEngine();
      synth.stopTires();
      return;
    }

    car.hurtCooldown = Math.max(0, car.hurtCooldown - delta);
    car.obstacleCooldown = Math.max(0, car.obstacleCooldown - delta);
    car.tireSoundTimer = Math.max(0, car.tireSoundTimer - delta);
    car.driftSoundTimer = Math.max(0, car.driftSoundTimer - delta);
    car.fireCooldown = Math.max(0, car.fireCooldown - delta);
    car.grenadeCooldown = Math.max(0, car.grenadeCooldown - delta);
    car.boostGlow = Math.max(0, car.boostGlow - delta * 1.6);
    car.roadkillGlow = Math.max(0, car.roadkillGlow - delta * 1.8);
    car.offroadDust = Math.max(0, car.offroadDust - delta * 2.4);
    supportGunner.fireCooldown = Math.max(0, supportGunner.fireCooldown - delta);
    camera.shakeTimer = Math.max(0, camera.shakeTimer - delta);
    if (camera.shakeTimer <= 0) camera.shake = Math.max(0, camera.shake - delta * 3.5);
    camera.flash = Math.max(0, camera.flash - delta * 2.6);

    if (game.comboTimer > 0) {
      game.comboTimer -= delta;
      if (game.comboTimer <= 0) {
        game.combo = 1;
        queueEvent('Combo katkesi. Aloita uusi ketju aggressiivisesti.', 'warning');
      }
    }

    updateBoostPads(delta);
    updateCar(delta);
    // Process remote player inputs: fire from their car's position
    for (const [playerId, input] of Object.entries(network.remoteInputs)) {
      if (!input) continue;

      const remoteStateForInput = ensureRemotePlayer(playerId);
      if ((remoteStateForInput.health ?? remoteStateForInput.maxHealth ?? 200) <= 0) {
        network.remoteInputs[playerId] = null;
        continue;
      }

      // Track per-remote-player fire cooldown
      if (!network.remoteFireCooldowns) network.remoteFireCooldowns = {};
      if (!network.remoteFireCooldowns[playerId]) network.remoteFireCooldowns[playerId] = 0;
      network.remoteFireCooldowns[playerId] = Math.max(0, network.remoteFireCooldowns[playerId] - delta);

      // Track per-remote-player ammo
      if (!network.remoteAmmo) network.remoteAmmo = {};
      if (network.remoteAmmo[playerId] === undefined) network.remoteAmmo[playerId] = 180;

      const inputX = Number(input.carX);
      const inputY = Number(input.carY);
      const inputAngle = normalizeAngle(Number(input.carAngle) || 0);
      if (!Number.isFinite(inputX) || !Number.isFinite(inputY)) {
        network.remoteInputs[playerId] = null;
        continue;
      }
      const safeX = clamp(inputX, 20, WORLD.width - 20);
      const safeY = clamp(inputY, 20, WORLD.height - 20);

      if (input.fire && network.remoteFireCooldowns[playerId] <= 0 && network.remoteAmmo[playerId] > 0) {
        // Fire from the remote player's car using weapon profile and proper cooldown
        const weapon = getWeaponProfile();
        network.remoteFireCooldowns[playerId] = weapon.cooldown;
        network.remoteAmmo[playerId] = Math.max(0, network.remoteAmmo[playerId] - 1);
        const remoteAngle = inputAngle;
        const pelletCount = weapon.pellets;
        const spreadStart = pelletCount === 1 ? 0 : -weapon.spread / 2;
        const spreadStep = pelletCount === 1 ? 0 : weapon.spread / (pelletCount - 1);
        for (let p = 0; p < pelletCount; p++) {
          const shotAngle = remoteAngle + spreadStart + spreadStep * p;
          bullets.push({
            x: safeX + Math.cos(shotAngle) * 42,
            y: safeY + Math.sin(shotAngle) * 42,
            vx: Math.cos(shotAngle) * weapon.speed,
            vy: Math.sin(shotAngle) * weapon.speed,
            life: weapon.life,
            radius: weapon.radius,
            damage: weapon.damage,
            remote: true
          });
        }
        synth.pulse({ type: 'square', start: weapon.soundStart, end: weapon.soundEnd, duration: 0.06, volume: 0.009 });
      }
      if (!network.remoteGrenadeCooldowns) network.remoteGrenadeCooldowns = {};
      if (!network.remoteGrenadeCooldowns[playerId]) network.remoteGrenadeCooldowns[playerId] = 0;
      network.remoteGrenadeCooldowns[playerId] = Math.max(0, network.remoteGrenadeCooldowns[playerId] - delta);

      if (input.grenade && network.remoteGrenadeCooldowns[playerId] <= 0) {
        network.remoteGrenadeCooldowns[playerId] = 0.48;
        const remoteAngle = inputAngle;
        grenades.push({
          x: safeX - Math.cos(remoteAngle) * 34,
          y: safeY - Math.sin(remoteAngle) * 34,
          vx: -Math.cos(remoteAngle) * 55,
          vy: -Math.sin(remoteAngle) * 55,
          life: 1,
          maxLife: 1,
          blastRadius: 220,
          blastDamage: 185,
          rotation: rand(0, Math.PI * 2),
          fusePulse: rand(0, Math.PI * 2)
        });
      }
      // Store remote player position for rendering; clear fire/grenade intent
      const remoteState = ensureRemotePlayer(playerId);
      network.remotePlayers[playerId] = {
        ...remoteState,
        x: safeX,
        y: safeY,
        angle: inputAngle
      };
      network.remoteInputs[playerId] = null;
    }
    const remoteSupportFire = false; // now handled above with real positions
    if (keys.KeyP && supportGunner.fireCooldown <= 0) {
      fireSupportShot();
    }
    // Update remote player positions for rendering
    for (const [pid, input] of Object.entries(network.remoteInputs)) {
      if (input && typeof input.carX === 'number') {
        network.remotePlayers[pid] = { x: input.carX, y: input.carY, angle: input.carAngle || 0 };
      }
    }
    updateBarricades();
    updateBullets(delta);
    updateGrenades(delta);
    updateEnemyProjectiles(delta);
    updateAcidPools(delta);
    updatePickups(delta);
    updateMines(delta);
    updateZombies(delta);
    updateParticles(delta);
    updateFloatingTexts(delta);
    updateSkidMarks(delta);
    updateWaveFlow(delta);
    updateCamera();

    if (car.health <= 0 && !game.over) {
      finishRun(false);
    }

    syncHud();
  }

  function updateBoostPads(delta) {
    for (const pad of boostPads) {
      pad.cooldown = Math.max(0, pad.cooldown - delta);
      if (pad.cooldown <= 0 && distanceBetween(car.x, car.y, pad.x, pad.y) < car.radius + pad.radius) {
        pad.cooldown = 5;
        car.nitro = clamp(car.nitro + 26, 0, car.maxNitro);
        car.speed += 90;
        car.boostGlow = 1;
        spawnRing(pad.x, pad.y, '#2ed1ff', 22, 34);
        addScore(45, pad.x, pad.y - 20, 'BOOST');
        queueEvent('Nitro pad ladattu. Käytä kiihtyvyyttä laumaa vastaan.', 'accent');
        synth.pulse({ type: 'triangle', start: 520, end: 860, duration: 0.14, volume: 0.04 });
      }
    }
  }

  function updateCar(delta) {
    const accelerating = keys.KeyW || keys.ArrowUp;
    const braking = keys.KeyS || keys.ArrowDown;
    const turningLeft = keys.KeyA || keys.ArrowLeft;
    const turningRight = keys.KeyD || keys.ArrowRight;
    const boosting = (keys.ShiftLeft || keys.ShiftRight) && car.nitro > 0;
    const onRoad = isOnRoad(car.x, car.y);

    let maxSpeed = onRoad ? 420 : 290;
    let acceleration = onRoad ? 330 : 205;
    const reverseMaxSpeed = onRoad ? 195 : 140;

    const forwardX = Math.cos(car.angle);
    const forwardY = Math.sin(car.angle);
    const rightX = -forwardY;
    const rightY = forwardX;

    let forwardVelocity = car.velocityX * forwardX + car.velocityY * forwardY;
    let lateralVelocity = car.velocityX * rightX + car.velocityY * rightY;
    let requestedSteer = 0;
    if (turningLeft) requestedSteer -= 1;
    if (turningRight) requestedSteer += 1;
    car.steer = lerp(car.steer, requestedSteer, clamp(7.4 * delta, 0, 1));

    if (boosting) {
      maxSpeed += 140;
      acceleration += 190;
      car.nitro = clamp(car.nitro - 28 * delta, 0, car.maxNitro);
      car.boostGlow = Math.max(car.boostGlow, 0.55);

      for (let index = 0; index < 2; index++) {
        particles.push({
          x: car.x - Math.cos(car.angle) * 28 + Math.sin(car.angle) * (index === 0 ? 16 : -16),
          y: car.y - Math.sin(car.angle) * 28 - Math.cos(car.angle) * (index === 0 ? 16 : -16),
          vx: -Math.cos(car.angle) * rand(70, 120),
          vy: -Math.sin(car.angle) * rand(70, 120),
          life: 0.24,
          maxLife: 0.24,
          size: rand(6, 10),
          color: 'rgba(46, 209, 255, 0.95)'
        });
      }
    } else {
      car.nitro = clamp(car.nitro + (onRoad ? 9 : 5) * delta, 0, car.maxNitro);
    }

    if (accelerating) {
      forwardVelocity = Math.min(maxSpeed, forwardVelocity + acceleration * delta);
    } else if (braking) {
      forwardVelocity = Math.max(-reverseMaxSpeed, forwardVelocity - 275 * delta);
    } else {
      forwardVelocity = moveToward(forwardVelocity, 0, (onRoad ? 145 : 210) * delta);
    }

    const speedRatio = clamp(Math.abs(forwardVelocity) / maxSpeed, 0, 1.4);
    const yawRate = car.steer * (1.5 + speedRatio * 1.6) * clamp(forwardVelocity / 210, -1.3, 1.3);
    car.angle += yawRate * delta;
    car.angle = normalizeAngle(car.angle);

    const gripStrength = onRoad ? 8.2 : 3.1;
    const lateralDecay = (onRoad ? 220 : 120) * delta + Math.abs(forwardVelocity) * gripStrength * delta * 0.024;
    lateralVelocity = moveToward(lateralVelocity, 0, lateralDecay);

    if (!onRoad && Math.abs(forwardVelocity) > 80) {
      forwardVelocity *= 0.989;
      lateralVelocity *= 0.97;
      car.offroadDust = 1;

      if (Math.random() < 0.3) {
        particles.push({
          x: car.x + rand(-18, 18),
          y: car.y + rand(-18, 18),
          vx: rand(-40, 40),
          vy: rand(-40, 40),
          life: 0.5,
          maxLife: 0.5,
          size: rand(5, 8),
          color: 'rgba(166, 146, 112, 0.55)'
        });
      }
    }

    const drag = onRoad ? 0.992 : 0.984;
    forwardVelocity *= drag;
    lateralVelocity *= onRoad ? 0.94 : 0.89;

    car.velocityX = forwardX * forwardVelocity + rightX * lateralVelocity;
    car.velocityY = forwardY * forwardVelocity + rightY * lateralVelocity;
    car.speed = forwardVelocity;

    const speedForTilt = clamp(Math.abs(forwardVelocity) / 260, 0, 1);
    const targetRoll = clamp(-lateralVelocity / 190, -0.22, 0.22) + car.steer * 0.04 * speedForTilt;
    car.bodyRoll = lerp(car.bodyRoll, targetRoll, clamp(8.5 * delta, 0, 1));

    const targetPitch = clamp((accelerating ? -1 : 0) + (braking ? 1 : 0), -1, 1) * 0.08 + (boosting ? -0.05 : 0);
    car.suspensionPitch = lerp(car.suspensionPitch, targetPitch, clamp(7.2 * delta, 0, 1));

    car.x = clamp(car.x + car.velocityX * delta, 30, WORLD.width - 30);
    car.y = clamp(car.y + car.velocityY * delta, 30, WORLD.height - 30);
    resolveBuildingCollisions();
    updateRoadsideObstacleCollisions();

    const correctedForward = car.velocityX * Math.cos(car.angle) + car.velocityY * Math.sin(car.angle);
    car.speed = correctedForward;

    if (Math.abs(car.speed) > 120 && (Math.abs(lateralVelocity) > 14 || (turningLeft || turningRight)) && Math.random() < 0.5) {
      skidMarks.push({
        x: car.x - Math.cos(car.angle) * 18 + rand(-3, 3),
        y: car.y - Math.sin(car.angle) * 18 + rand(-3, 3),
        angle: car.angle + clamp(lateralVelocity / 420, -0.25, 0.25),
        life: 0.9,
        maxLife: 0.9
      });
    }

    updateTireAudio(delta, forwardVelocity, lateralVelocity, onRoad, turningLeft || turningRight);
    updateEngineAudio(accelerating, boosting, onRoad);

    if ((keys.Space || keys.KeyF) && car.ammo > 0 && car.fireCooldown <= 0) {
      fireBullet();
    }
    if (keys.KeyG && car.grenades > 0 && car.grenadeCooldown <= 0) {
      throwGrenade();
    }
  }

  function updateBarricades() {
    for (const barricade of barricades) {
      const hit = Math.abs(car.x - barricade.x) < car.radius + barricade.width * 0.35 && Math.abs(car.y - barricade.y) < car.radius + barricade.height * 0.35;
      if (hit && Math.abs(car.speed) > 90) {
        car.speed *= -0.28;
        damageCar(8, 'Barricade collision');
        spawnRing(barricade.x, barricade.y, '#ffb23f', 12, 26);
        camera.shake = Math.max(camera.shake, 0.3);
      }
    }
  }

  function updateTireAudio(delta, forwardVelocity, lateralVelocity, onRoad, steering) {
    const speed = Math.abs(forwardVelocity);
    const slip = Math.abs(lateralVelocity) + (steering && speed > 180 ? speed * 0.08 : 0);
    synth.setTires({ speed, slip, onRoad });
  }

  function updateEngineAudio(accelerating, boosting, onRoad) {
    const speedRatio = clamp(Math.abs(car.speed) / 430, 0, 1);
    const rpm = clamp(0.16 + speedRatio * 0.7 + (accelerating ? 0.08 : 0) + (boosting ? 0.12 : 0), 0.12, 1);
    const load = clamp(0.12 + speedRatio * 0.34 + (accelerating ? 0.24 : 0) + (boosting ? 0.3 : 0) + (!onRoad ? 0.08 : 0), 0.1, 1);
    synth.setEngine({ rpm, load, boosting });
  }

  function updateRoadsideObstacleCollisions() {
    for (const obstacle of getRoadsideObstacles()) {
      const dx = car.x - obstacle.x;
      const dy = car.y - obstacle.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = car.radius + obstacle.radius;
      if (distance >= minDistance) {
        continue;
      }

      const safeDistance = Math.max(distance, 0.001);
      const normalX = dx / safeDistance;
      const normalY = dy / safeDistance;
      const overlap = minDistance - safeDistance;

      car.x += normalX * overlap;
      car.y += normalY * overlap;

      const impact = clamp(Math.abs(car.speed) / 280, 0.2, 1);
      car.velocityX *= 0.78 - impact * 0.12;
      car.velocityY *= 0.78 - impact * 0.12;
      car.speed *= 0.72 - impact * 0.08;
      camera.shake = Math.max(camera.shake, 0.14 + impact * 0.18);

      if (car.obstacleCooldown <= 0) {
        car.obstacleCooldown = 0.45;
        damageCar(3 + impact * 5, `${obstacle.label} collision`);
        queueEvent(`Osuit esteeseen: ${obstacle.label}.`, 'warning');
        spawnRing(obstacle.x, obstacle.y, '#ffb23f', 10, 20 + impact * 10);
      }
    }
  }

  function getRoadsideObstacles() {
    // Merkit ja valot ovat vain visuaalisia objekteja: niihin ei voi osua.
    return [];
  }

  function normalizeRoadFurniturePlacement(lights, signs, roadRects, curves) {
    for (const light of lights) {
      snapFurnitureToRoadEdge(light, roadRects, curves, 24);
    }

    for (const sign of signs) {
      snapFurnitureToRoadEdge(sign, roadRects, curves, 22);
    }
  }

  function snapFurnitureToRoadEdge(item, roadRects, curves, edgeOffset) {
    const nearestRoad = getNearestRoadRect(item.x, item.y, roadRects);
    if (nearestRoad) {
      const isHorizontal = nearestRoad.width >= nearestRoad.height;
      if (isHorizontal) {
        const centerY = nearestRoad.y + nearestRoad.height * 0.5;
        const side = item.y >= centerY ? 1 : -1;
        item.x = clamp(item.x, nearestRoad.x + 16, nearestRoad.x + nearestRoad.width - 16);
        item.y = centerY + side * (nearestRoad.height * 0.5 + edgeOffset);
        item.angle = side > 0 ? 0 : Math.PI;
      } else {
        const centerX = nearestRoad.x + nearestRoad.width * 0.5;
        const side = item.x >= centerX ? 1 : -1;
        item.x = centerX + side * (nearestRoad.width * 0.5 + edgeOffset);
        item.y = clamp(item.y, nearestRoad.y + 16, nearestRoad.y + nearestRoad.height - 16);
        item.angle = side > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
      return;
    }

    let nearestCurvePoint = null;
    for (const curve of curves) {
      const candidate = getNearestPointOnPolyline(item.x, item.y, curve.points);
      if (!candidate) {
        continue;
      }
      if (!nearestCurvePoint || candidate.distance < nearestCurvePoint.distance) {
        nearestCurvePoint = candidate;
      }
    }
    if (!nearestCurvePoint) {
      return;
    }

    const normalX = -nearestCurvePoint.segmentY;
    const normalY = nearestCurvePoint.segmentX;
    item.x = nearestCurvePoint.x + normalX * edgeOffset;
    item.y = nearestCurvePoint.y + normalY * edgeOffset;
    item.angle = Math.atan2(normalY, normalX);
  }

  function getNearestRoadRect(x, y, roadRects) {
    let best = null;

    for (const road of roadRects) {
      const nx = clamp(x, road.x, road.x + road.width);
      const ny = clamp(y, road.y, road.y + road.height);
      const dx = x - nx;
      const dy = y - ny;
      const distanceSq = dx * dx + dy * dy;

      if (!best || distanceSq < best.distanceSq) {
        best = { road, distanceSq };
      }
    }

    return best ? best.road : null;
  }

  function resolveBuildingCollisions() {
    for (const lot of buildingLots) {
      const inset = 14;
      const nearestX = clamp(car.x, lot.x + inset, lot.x + lot.width - inset);
      const nearestY = clamp(car.y, lot.y + inset, lot.y + lot.height - inset);
      const dx = car.x - nearestX;
      const dy = car.y - nearestY;
      const distance = Math.hypot(dx, dy);

      if (distance < car.radius) {
        const overlap = car.radius - Math.max(distance, 0.001);
        const normalX = distance > 0.001 ? dx / distance : (car.x < lot.x + lot.width / 2 ? -1 : 1);
        const normalY = distance > 0.001 ? dy / distance : 0;

        car.x += normalX * overlap;
        car.y += normalY * overlap;

        const velocityAlongNormal = car.velocityX * normalX + car.velocityY * normalY;
        if (velocityAlongNormal < 0) {
          car.velocityX -= normalX * velocityAlongNormal * 1.45;
          car.velocityY -= normalY * velocityAlongNormal * 1.45;
          car.velocityX *= 0.72;
          car.velocityY *= 0.72;
        }

        if (Math.abs(car.speed) > 80) {
          spawnRing(nearestX, nearestY, '#9dc4ff', 12, 30);
          camera.shake = Math.max(camera.shake, 0.24);
        }
      }
    }
  }

  function normalizeBuildingLotsAwayFromRoads(lots, roadRects, curves) {
    const worldMargin = 24;
    const maxIterations = 40;

    for (const lot of lots) {
      for (let iteration = 0; iteration < maxIterations; iteration++) {
        const push = getBuildingRoadPushVector(lot, roadRects, curves);
        if (!push) {
          break;
        }

        lot.x = clamp(lot.x + push.x, worldMargin, WORLD.width - lot.width - worldMargin);
        lot.y = clamp(lot.y + push.y, worldMargin, WORLD.height - lot.height - worldMargin);
      }
    }
  }

  function getBuildingRoadPushVector(lot, roadRects, curves) {
    const safetyMargin = 16;
    let totalX = 0;
    let totalY = 0;
    let hits = 0;

    for (const road of roadRects) {
      const push = getRectSeparationVector(lot, road, safetyMargin);
      if (!push) {
        continue;
      }
      totalX += push.x;
      totalY += push.y;
      hits += 1;
    }

    for (const curve of curves) {
      const push = getCurveSeparationVector(lot, curve, safetyMargin);
      if (!push) {
        continue;
      }
      totalX += push.x;
      totalY += push.y;
      hits += 1;
    }

    if (hits === 0) {
      return null;
    }

    const length = Math.hypot(totalX, totalY) || 1;
    const step = Math.min(28, 8 + hits * 4);
    return {
      x: (totalX / length) * step,
      y: (totalY / length) * step
    };
  }

  function getRectSeparationVector(lot, road, margin) {
    const lotCx = lot.x + lot.width * 0.5;
    const lotCy = lot.y + lot.height * 0.5;
    const roadCx = road.x + road.width * 0.5;
    const roadCy = road.y + road.height * 0.5;

    const halfW = lot.width * 0.5 + road.width * 0.5 + margin;
    const halfH = lot.height * 0.5 + road.height * 0.5 + margin;

    const dx = lotCx - roadCx;
    const dy = lotCy - roadCy;
    const overlapX = halfW - Math.abs(dx);
    const overlapY = halfH - Math.abs(dy);

    if (overlapX <= 0 || overlapY <= 0) {
      return null;
    }

    if (overlapX < overlapY) {
      return { x: dx >= 0 ? overlapX : -overlapX, y: 0 };
    }

    return { x: 0, y: dy >= 0 ? overlapY : -overlapY };
  }

  function getCurveSeparationVector(lot, curve, margin) {
    const centerX = lot.x + lot.width * 0.5;
    const centerY = lot.y + lot.height * 0.5;
    const nearest = getNearestPointOnPolyline(centerX, centerY, curve.points);
    const threshold = curve.width * 0.5 + Math.min(lot.width, lot.height) * 0.28 + margin;

    if (!nearest || nearest.distance >= threshold) {
      return null;
    }

    let pushX = centerX - nearest.x;
    let pushY = centerY - nearest.y;
    let length = Math.hypot(pushX, pushY);

    if (length < 0.001) {
      const tangentX = nearest.segmentX;
      const tangentY = nearest.segmentY;
      pushX = -tangentY;
      pushY = tangentX;
      length = Math.hypot(pushX, pushY) || 1;
    }

    const penetration = threshold - nearest.distance;
    const scalar = penetration + 6;
    return {
      x: (pushX / length) * scalar,
      y: (pushY / length) * scalar
    };
  }

  function getNearestPointOnPolyline(px, py, points) {
    let best = null;

    for (let index = 1; index < points.length; index++) {
      const start = points[index - 1];
      const end = points[index];
      const projection = projectPointToSegment(px, py, start.x, start.y, end.x, end.y);
      if (!best || projection.distance < best.distance) {
        best = projection;
      }
    }

    return best;
  }

  function projectPointToSegment(px, py, x1, y1, x2, y2) {
    const segX = x2 - x1;
    const segY = y2 - y1;
    const segLenSq = segX * segX + segY * segY;

    if (segLenSq <= 0.0001) {
      const dx = px - x1;
      const dy = py - y1;
      return {
        x: x1,
        y: y1,
        distance: Math.hypot(dx, dy),
        segmentX: 1,
        segmentY: 0
      };
    }

    const t = clamp(((px - x1) * segX + (py - y1) * segY) / segLenSq, 0, 1);
    const closestX = x1 + segX * t;
    const closestY = y1 + segY * t;
    const dx = px - closestX;
    const dy = py - closestY;
    const length = Math.hypot(segX, segY) || 1;

    return {
      x: closestX,
      y: closestY,
      distance: Math.hypot(dx, dy),
      segmentX: segX / length,
      segmentY: segY / length
    };
  }

  function fireBullet() {
    const weapon = getWeaponProfile();
    car.fireCooldown = weapon.cooldown;
    car.ammo = Math.max(0, car.ammo - 1);
    const pelletCount = weapon.pellets;
    const spreadStart = pelletCount === 1 ? 0 : -weapon.spread / 2;
    const spreadStep = pelletCount === 1 ? 0 : weapon.spread / (pelletCount - 1);

    for (let pelletIndex = 0; pelletIndex < pelletCount; pelletIndex++) {
      const shotAngle = car.angle + spreadStart + spreadStep * pelletIndex;
      bullets.push({
        x: car.x + Math.cos(shotAngle) * 42,
        y: car.y + Math.sin(shotAngle) * 42,
        vx: Math.cos(shotAngle) * weapon.speed + Math.cos(car.angle) * Math.max(0, car.speed) * 0.18,
        vy: Math.sin(shotAngle) * weapon.speed + Math.sin(car.angle) * Math.max(0, car.speed) * 0.18,
        life: weapon.life,
        radius: weapon.radius,
        damage: weapon.damage
      });
    }

    synth.pulse({ type: 'square', start: weapon.soundStart, end: weapon.soundEnd, duration: 0.06, volume: 0.018 });
  }

  function fireSupportShot() {
    if (zombies.length === 0) {
      return;
    }

    let nearest = zombies[0];
    let nearestDistance = distanceBetween(car.x, car.y, nearest.x, nearest.y);
    for (let index = 1; index < zombies.length; index++) {
      const zombie = zombies[index];
      const distance = distanceBetween(car.x, car.y, zombie.x, zombie.y);
      if (distance < nearestDistance) {
        nearest = zombie;
        nearestDistance = distance;
      }
    }

    supportGunner.fireCooldown = 0.14;
    const angle = Math.atan2(nearest.y - car.y, nearest.x - car.x);
    bullets.push({
      x: car.x + Math.cos(angle) * 36,
      y: car.y + Math.sin(angle) * 36,
      vx: Math.cos(angle) * 910,
      vy: Math.sin(angle) * 910,
      life: 0.72,
      radius: 3.6,
      damage: 24,
      color: '#89f0ff',
      width: 2.4
    });
    synth.pulse({ type: 'triangle', start: 520, end: 250, duration: 0.05, volume: 0.014 });
  }

  function throwGrenade() {
    car.grenadeCooldown = 0.42;
    car.grenades -= 1;
    grenades.push({
      x: car.x - Math.cos(car.angle) * 36,
      y: car.y - Math.sin(car.angle) * 36,
      vx: -Math.cos(car.angle) * 70 + car.velocityX * 0.38,
      vy: -Math.sin(car.angle) * 70 + car.velocityY * 0.38,
      life: 1,
      maxLife: 1,
      blastRadius: 220,
      blastDamage: 185,
      rotation: rand(0, Math.PI * 2),
      fusePulse: rand(0, Math.PI * 2)
    });
    synth.pulse({ type: 'triangle', start: 230, end: 120, duration: 0.08, volume: 0.025 });
  }

  function updateBullets(delta) {
    for (let index = bullets.length - 1; index >= 0; index--) {
      const bullet = bullets[index];
      bullet.x += bullet.vx * delta;
      bullet.y += bullet.vy * delta;
      bullet.life -= delta;

      if (bullet.life <= 0 || !isInsideWorld(bullet.x, bullet.y)) {
        bullets.splice(index, 1);
        continue;
      }

      let hit = false;
      for (const zombie of zombies) {
        if (distanceBetween(bullet.x, bullet.y, zombie.x, zombie.y) <= zombie.radius + bullet.radius) {
          damageZombie(zombie, bullet.damage, 'bullet', bullet.x, bullet.y);
          bullets.splice(index, 1);
          hit = true;
          break;
        }
      }
      if (hit) continue;
    }
  }

  function updateGrenades(delta) {
    for (let index = grenades.length - 1; index >= 0; index--) {
      const grenade = grenades[index];
      grenade.fusePulse += delta * 14;
      grenade.x += grenade.vx * delta;
      grenade.y += grenade.vy * delta;
      grenade.vx *= 0.91;
      grenade.vy *= 0.91;
      grenade.rotation += delta * 12;
      grenade.life -= delta;

      if (Math.random() < 0.3) {
        particles.push({
          x: grenade.x + rand(-2, 2),
          y: grenade.y + rand(-2, 2),
          vx: rand(-25, 25),
          vy: rand(-25, 25),
          life: 0.16,
          maxLife: 0.16,
          size: rand(2, 4),
          color: 'rgba(255, 188, 92, 0.9)'
        });
      }

      if (grenade.life <= 0) {
        explode(grenade.x, grenade.y, grenade.blastRadius || 220, grenade.blastDamage || 185, 'grenade');
        grenades.splice(index, 1);
      }
    }
  }

  function updateEnemyProjectiles(delta) {
    for (let index = enemyProjectiles.length - 1; index >= 0; index--) {
      const projectile = enemyProjectiles[index];
      projectile.x += projectile.vx * delta;
      projectile.y += projectile.vy * delta;
      projectile.life -= delta;

      if (distanceBetween(projectile.x, projectile.y, car.x, car.y) < car.radius + projectile.radius) {
        damageCar(projectile.damage, 'Acid hit');
        spawnAcidPool(projectile.x, projectile.y, 54, 4.4);
        enemyProjectiles.splice(index, 1);
        continue;
      }

      if (projectile.life <= 0 || !isInsideWorld(projectile.x, projectile.y)) {
        spawnAcidPool(projectile.x, projectile.y, 44, 3.5);
        enemyProjectiles.splice(index, 1);
      }
    }
  }

  function updateAcidPools(delta) {
    for (let index = acidPools.length - 1; index >= 0; index--) {
      const pool = acidPools[index];
      pool.life -= delta;
      pool.pulse += delta * 4;
      if (pool.life <= 0) {
        acidPools.splice(index, 1);
        continue;
      }
      if (distanceBetween(car.x, car.y, pool.x, pool.y) < pool.radius + car.radius * 0.6) {
        damageCar(10 * delta, 'Acid pool');
        car.speed *= 0.992;
      }
    }
  }

  function spawnAcidPool(x, y, radius, duration) {
    acidPools.push({ x, y, radius, life: duration, pulse: rand(0, Math.PI * 2) });
    spawnRing(x, y, '#55d16f', radius * 0.6, radius);
    synth.pulse({ type: 'sawtooth', start: 150, end: 90, duration: 0.15, volume: 0.02 });
  }

  function updatePickups(delta) {
    for (let index = pickups.length - 1; index >= 0; index--) {
      const pickup = pickups[index];
      pickup.life -= delta;
      pickup.bob += delta * 3;
      if (pickup.life <= 0) {
        pickups.splice(index, 1);
        continue;
      }
      if (distanceBetween(car.x, car.y, pickup.x, pickup.y) < car.radius + pickup.radius + 8) {
        collectPickup(pickup);
        pickups.splice(index, 1);
      }
    }
  }

  function collectPickup(pickup) {
    if (pickup.type === 'ammo') {
      car.ammo = Math.min(car.maxAmmo, car.ammo + 42);
      addScore(75, pickup.x, pickup.y - 18, 'AMMO');
    } else if (pickup.type === 'nitro') {
      car.nitro = Math.min(car.maxNitro, car.nitro + 38);
      addScore(75, pickup.x, pickup.y - 18, 'NITRO');
    } else if (pickup.type === 'medkit') {
      car.health = Math.min(car.maxHealth, car.health + 24);
      addScore(95, pickup.x, pickup.y - 18, 'REPAIR');
    } else if (pickup.type === 'grenade') {
      car.grenades += 2;
      addScore(90, pickup.x, pickup.y - 18, 'BOOM');
    }

    queueEvent(`${pickupPalette[pickup.type].label} napattu. Käytettävissä enemmän painetta.`, 'accent');
    spawnRing(pickup.x, pickup.y, pickupPalette[pickup.type].color, 12, 28);
    synth.pulse({ type: 'triangle', start: 330, end: 710, duration: 0.1, volume: 0.025 });
  }

  function updateMines(delta) {
    for (let index = mines.length - 1; index >= 0; index--) {
      const mine = mines[index];
      mine.pulse += delta * 4.4;
      if (!mine.armed) {
        continue;
      }

      const carTrigger = distanceBetween(car.x, car.y, mine.x, mine.y) < car.radius + mine.radius * 0.9;
      const zombieTrigger = zombies.find((zombie) => distanceBetween(zombie.x, zombie.y, mine.x, mine.y) < zombie.radius + mine.radius * 0.7);

      if (carTrigger || zombieTrigger) {
        mines.splice(index, 1);
        explode(mine.x, mine.y, 120, 105, 'mine', true);
        queueEvent(carTrigger ? 'Miina repesi auton alla.' : 'Lauma laukaisi miinan kadulla.', 'danger');
      }
    }
  }

  function getNearestZombieTarget(zombie) {
    const candidates = [{ x: car.x, y: car.y, angle: car.angle, speed: car.speed, isHost: true }];

    if (network.mode === 'host') {
      for (const remote of Object.values(network.remotePlayers)) {
        if (!remote || !Number.isFinite(remote.x) || !Number.isFinite(remote.y)) {
          continue;
        }
        if ((remote.health ?? remote.maxHealth ?? 200) <= 0) {
          continue;
        }
        candidates.push({ x: remote.x, y: remote.y, angle: remote.angle || 0, speed: 0, isHost: false });
      }
    }

    let nearest = candidates[0];
    let nearestDistance = distanceBetween(zombie.x, zombie.y, nearest.x, nearest.y);
    for (let index = 1; index < candidates.length; index++) {
      const candidate = candidates[index];
      const distance = distanceBetween(zombie.x, zombie.y, candidate.x, candidate.y);
      if (distance < nearestDistance) {
        nearest = candidate;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  function updateZombies(delta) {
    for (let index = zombies.length - 1; index >= 0; index--) {
      const zombie = zombies[index];
      zombie.attackCooldown = Math.max(0, zombie.attackCooldown - delta);
      zombie.pulse += delta * (zombie.type === 'runner' ? 8 : 5);
      zombie.limp = lerp(zombie.limp, 1 - zombie.health / zombie.maxHealth, clamp(delta * 3.2, 0, 1));
      zombie.breathe += delta * (zombie.type === 'runner' ? 4.6 : 3.4);
      zombie.blinkTimer -= delta;
      if (zombie.blinkTimer <= 0) {
        zombie.blink = 0.14;
        zombie.blinkTimer = rand(1.2, 3.1);
      }
      zombie.blink = Math.max(0, zombie.blink - delta);

      const target = getNearestZombieTarget(zombie);
      const chaseLead = target.isHost ? clamp(Math.abs(target.speed) / 250, 0, 1) : 0;
      const predictedX = target.x + Math.cos(target.angle) * target.speed * 0.32 * chaseLead;
      const predictedY = target.y + Math.sin(target.angle) * target.speed * 0.32 * chaseLead;
      const dx = predictedX - zombie.x;
      const dy = predictedY - zombie.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);
      zombie.facing = angle;

      let speed = zombie.speed;
      if (zombie.type === 'runner') speed += Math.sin(zombie.pulse) * 12;
      if (zombie.type === 'boss') speed += Math.sin(zombie.pulse * 0.6) * 8;
      if (zombie.isFinalBoss) speed += 16 + Math.sin(zombie.pulse * 0.9) * 14;
      if (zombie.type === 'walker') speed *= 1 - zombie.limp * 0.22;
      if (zombie.type === 'brute') speed *= 1 - zombie.limp * 0.14;

      let desiredX = Math.cos(angle);
      let desiredY = Math.sin(angle);

      let separationX = 0;
      let separationY = 0;
      for (let otherIndex = 0; otherIndex < zombies.length; otherIndex++) {
        if (otherIndex === index) continue;
        const other = zombies[otherIndex];
        const ox = zombie.x - other.x;
        const oy = zombie.y - other.y;
        const d = Math.hypot(ox, oy);
        const minDistance = zombie.radius + other.radius + 18;
        if (d > 0.001 && d < minDistance) {
          const force = (minDistance - d) / minDistance;
          separationX += (ox / d) * force;
          separationY += (oy / d) * force;
        }
      }

      let obstacleX = 0;
      let obstacleY = 0;
      for (const lot of buildingLots) {
        const nearestX = clamp(zombie.x, lot.x, lot.x + lot.width);
        const nearestY = clamp(zombie.y, lot.y, lot.y + lot.height);
        const ox = zombie.x - nearestX;
        const oy = zombie.y - nearestY;
        const d = Math.hypot(ox, oy);
        if (d > 0.001 && d < zombie.radius + 30) {
          const force = (zombie.radius + 30 - d) / (zombie.radius + 30);
          obstacleX += (ox / d) * force * 1.45;
          obstacleY += (oy / d) * force * 1.45;
        }
      }

      for (const barricade of barricades) {
        const ox = zombie.x - barricade.x;
        const oy = zombie.y - barricade.y;
        const d = Math.hypot(ox, oy);
        if (d > 0.001 && d < zombie.radius + 28) {
          const force = (zombie.radius + 28 - d) / (zombie.radius + 28);
          obstacleX += (ox / d) * force * 1.2;
          obstacleY += (oy / d) * force * 1.2;
        }
      }

      const wander = Math.sin(zombie.pulse + zombie.gaitOffset * 3) * 0.2;
      desiredX += separationX * 0.95 + obstacleX + Math.cos(angle + Math.PI / 2) * wander;
      desiredY += separationY * 0.95 + obstacleY + Math.sin(angle + Math.PI / 2) * wander;

      const desiredLength = Math.hypot(desiredX, desiredY) || 1;
      desiredX /= desiredLength;
      desiredY /= desiredLength;

      if (zombie.type === 'spitter' && distance < 360) {
        const orbitAngle = angle + zombie.strafeSeed * 1.2;
        const orbitX = Math.cos(orbitAngle);
        const orbitY = Math.sin(orbitAngle);
        desiredX = desiredX * 0.3 + orbitX * 0.7;
        desiredY = desiredY * 0.3 + orbitY * 0.7;
        speed *= 0.68;

        if (zombie.attackCooldown <= 0) {
          zombie.attackCooldown = rand(1.4, 2.2);
          spitAcid(zombie, angle);
        }
      }

      if (zombie.isFinalBoss && distance < 560 && zombie.attackCooldown <= 0) {
        zombie.attackCooldown = rand(0.65, 1.05);
        for (const offset of [-0.22, 0, 0.22]) {
          spitAcid(zombie, angle + offset, { speed: 340, damage: 16, life: 2.1, radius: 10 });
        }
      }

      const smooth = clamp(delta * (zombie.type === 'runner' ? 9 : 6), 0, 1);
      zombie.velocityX = lerp(zombie.velocityX, desiredX * speed, smooth);
      zombie.velocityY = lerp(zombie.velocityY, desiredY * speed, smooth);

      zombie.x = clamp(zombie.x + zombie.velocityX * delta, 20, WORLD.width - 20);
      zombie.yBase = clamp((zombie.yBase || zombie.y) + zombie.velocityY * delta, 20, WORLD.height - 20);
      const bobAmplitude = zombie.type === 'runner' ? zombie.radius * 0.09 : zombie.radius * 0.06;
      zombie.y = zombie.yBase + Math.sin(zombie.walkCycle) * bobAmplitude;

      const pace = Math.hypot(zombie.velocityX, zombie.velocityY);
      zombie.pace = pace;
      zombie.walkCycle += delta * clamp(pace / (zombie.radius * 1.8), 0.65, 4.8);

      if (pace > 10) {
        zombie.facing = Math.atan2(zombie.velocityY, zombie.velocityX);
      }

      zombie.headYaw = lerp(zombie.headYaw, clamp(Math.sin(zombie.pulse * 0.5 + zombie.gaitOffset), -1, 1), clamp(delta * 2.4, 0, 1));

      // Resolve melee to one nearest target only (host OR one remote), not both.
      let nearestTarget = null;

      const hostDistance = distanceBetween(zombie.x, zombie.y, car.x, car.y);
      if (hostDistance < zombie.radius + car.radius + 6) {
        nearestTarget = { kind: 'host', distance: hostDistance };
      }

      if (network.mode === 'host') {
        for (const [playerId, remote] of Object.entries(network.remotePlayers)) {
          if (playerId === '__host__' || !remote || !Number.isFinite(remote.x) || !Number.isFinite(remote.y)) {
            continue;
          }
          const remoteRadius = remote.radius || car.radius || 30;
          const remoteDistance = distanceBetween(zombie.x, zombie.y, remote.x, remote.y);
          if (remoteDistance < zombie.radius + remoteRadius + 6) {
            if (!nearestTarget || remoteDistance < nearestTarget.distance) {
              nearestTarget = { kind: 'remote', playerId, distance: remoteDistance, remote };
            }
          }
        }
      }

      if (nearestTarget) {
        if (nearestTarget.kind === 'host' && Math.abs(car.speed) > 210) {
          damageZombie(zombie, 999, 'roadkill', zombie.x, zombie.y);
          car.speed *= 0.97;
          car.roadkillGlow = 1;
          camera.shake = Math.max(camera.shake, 0.45);
        } else if (zombie.attackCooldown <= 0) {
          zombie.attackCooldown = zombie.isFinalBoss ? 0.32 : zombie.type === 'boss' ? 0.55 : 0.9;
          if (nearestTarget.kind === 'host') {
            damageCar(zombie.damage, `${zombie.type} hit`);
            car.speed *= 0.88;
          } else {
            nearestTarget.remote.health = clamp((nearestTarget.remote.health ?? 200) - zombie.damage, 0, nearestTarget.remote.maxHealth || 200);
          }
        }
      }
    }

    game.liveEnemies = zombies.length;
    updateThreatLevel();
  }

  function spitAcid(zombie, angle, overrides = {}) {
    enemyProjectiles.push({
      x: zombie.x + Math.cos(angle) * zombie.radius,
      y: zombie.y + Math.sin(angle) * zombie.radius,
      vx: Math.cos(angle) * (overrides.speed || 280),
      vy: Math.sin(angle) * (overrides.speed || 280),
      radius: overrides.radius || 8,
      damage: overrides.damage || 12,
      life: overrides.life || 1.65
    });
    synth.pulse({ type: 'sawtooth', start: 220, end: 120, duration: 0.12, volume: 0.018 });
  }

  function damageZombie(zombie, amount, source, x, y) {
    zombie.health -= amount;

    for (let index = 0; index < 8; index++) {
      particles.push({
        x: x + rand(-8, 8),
        y: y + rand(-8, 8),
        vx: rand(-120, 120),
        vy: rand(-120, 120),
        life: 0.42,
        maxLife: 0.42,
        size: rand(3, 6),
        color: source === 'bullet' ? 'rgba(255, 216, 77, 0.9)' : 'rgba(191, 20, 20, 0.85)'
      });
    }

    if (zombie.health <= 0) {
      killZombie(zombie, source);
    }
  }

  function killZombie(zombie, source) {
    const index = zombies.indexOf(zombie);
    if (index !== -1) zombies.splice(index, 1);

    game.kills += 1;
    game.combo = clamp(game.combo + 0.3, 1, 8);
    game.comboTimer = 3.8;
    upgradeWeaponIfNeeded();

    const points = Math.round(zombie.reward * game.combo * (source === 'roadkill' ? 1.2 : 1));
    addScore(points, zombie.x, zombie.y - zombie.radius - 12, source === 'roadkill' ? 'ROADKILL' : zombieTypes[zombie.type].label.toUpperCase());

    for (let count = 0; count < 24; count++) {
      particles.push({
        x: zombie.x,
        y: zombie.y,
        vx: rand(-180, 180),
        vy: rand(-180, 180),
        life: rand(0.35, 0.75),
        maxLife: 0.75,
        size: rand(4, 9),
        color: count % 5 === 0 ? 'rgba(255, 185, 71, 0.85)' : 'rgba(145, 21, 21, 0.88)'
      });
    }

    spawnRing(zombie.x, zombie.y, source === 'roadkill' ? '#ffb23f' : '#ff5a5f', 16, zombie.radius * 1.5);
    synth.pulse({ type: source === 'roadkill' ? 'triangle' : 'square', start: 220, end: 90, duration: 0.14, volume: 0.025 });

    if (zombie.type === 'boss') {
      spawnPickup('medkit', zombie.x - 30, zombie.y);
      spawnPickup('grenade', zombie.x + 30, zombie.y);
      if (zombie.isFinalBoss) {
        spawnPickup('medkit', zombie.x, zombie.y - 36);
        spawnPickup('grenade', zombie.x, zombie.y + 36);
        queueEvent('Doom Behemoth kaatui. Kaupunki antoi periksi viimein.', 'accent');
      } else {
        queueEvent('Behemoth murskattu. Viimeinen väylä pysyi auki.', 'accent');
      }
    } else if (source === 'roadkill' && Math.random() < 0.3) {
      queueEvent('Täydellinen roadkill. Pidä painetta yllä.', 'accent');
    }

    if (Math.random() < 0.12) {
      const type = ['ammo', 'nitro', 'medkit', 'grenade'][Math.floor(Math.random() * 4)];
      spawnPickup(type, zombie.x + rand(-10, 10), zombie.y + rand(-10, 10));
    }
  }

  function explode(x, y, radius, damage, source, canHitCar = false) {
    camera.shake = Math.max(camera.shake, 0.65);
    camera.flash = Math.max(camera.flash, 0.35);
    spawnRing(x, y, source === 'grenade' ? '#ffb23f' : '#ff5a5f', radius * 0.25, radius);

    if (source === 'grenade') {
      spawnRing(x, y, '#ffd27a', radius * 0.12, radius * 1.2);
      for (let count = 0; count < 18; count++) {
        particles.push({
          x,
          y,
          vx: rand(-420, 420),
          vy: rand(-420, 420),
          life: rand(0.3, 0.65),
          maxLife: 0.65,
          size: rand(10, 18),
          color: count % 2 === 0 ? 'rgba(255, 214, 120, 0.95)' : 'rgba(88, 88, 88, 0.8)'
        });
      }
      queueEvent('Kranaatti räjähti ja repi kadun auki.', 'danger');
    }

    for (let count = 0; count < 36; count++) {
      const angle = (count / 36) * Math.PI * 2;
      const speed = rand(120, 260);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: rand(0.35, 0.7),
        maxLife: 0.7,
        size: rand(6, 12),
        color: count % 3 === 0 ? 'rgba(255, 220, 98, 0.95)' : 'rgba(255, 94, 64, 0.78)'
      });
    }

    for (const zombie of [...zombies]) {
      const distance = distanceBetween(x, y, zombie.x, zombie.y);
      if (distance <= radius + zombie.radius) {
        const scaled = Math.max(22, damage * (1 - distance / (radius + zombie.radius)));
        damageZombie(zombie, scaled, source, zombie.x, zombie.y);
      }
    }

    if (canHitCar) {
      const distanceToCar = distanceBetween(x, y, car.x, car.y);
      if (distanceToCar <= radius + car.radius) {
        const scaled = Math.max(10, damage * 0.35 * (1 - distanceToCar / (radius + car.radius)));
        damageCar(scaled, 'Mine blast');
        car.velocityX += Math.cos(Math.atan2(car.y - y, car.x - x)) * 80;
        car.velocityY += Math.sin(Math.atan2(car.y - y, car.x - x)) * 80;
        camera.shakeTimer = 2.0;
        camera.shake = 0.7;
      }
    }

    synth.pulse({ type: 'sawtooth', start: 160, end: 45, duration: 0.22, volume: 0.05 });
  }

  function damageCar(amount, reason) {
    if (car.hurtCooldown > 0) return;

    car.hurtCooldown = 0.18;
    car.health = Math.max(0, car.health - amount);
    camera.shake = Math.max(camera.shake, 0.28);
    camera.flash = Math.max(camera.flash, 0.12);
    floatingTexts.push({ x: car.x, y: car.y - 30, text: `-${Math.round(amount)}`, color: '#ff8f70', life: 0.65, maxLife: 0.65 });

    if (amount >= 14) {
      queueEvent(`${reason} rikkoi runkoa pahasti.`, 'danger');
    }

    synth.pulse({ type: 'square', start: 140, end: 70, duration: 0.08, volume: 0.028 });
  }

  function addScore(amount, x, y, label) {
    game.score += amount;
    floatingTexts.push({ x, y, text: `+${amount} ${label}`, color: '#ffe17a', life: 0.95, maxLife: 0.95 });
  }

  function spawnRing(x, y, color, fromRadius, toRadius) {
    particles.push({ x, y, vx: 0, vy: 0, life: 0.4, maxLife: 0.4, size: toRadius, ringFrom: fromRadius, ringTo: toRadius, color, ring: true });
  }

  function updateParticles(delta) {
    for (let index = particles.length - 1; index >= 0; index--) {
      const particle = particles[index];
      particle.life -= delta;
      if (particle.life <= 0) {
        particles.splice(index, 1);
        continue;
      }
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
    }
  }

  function updateFloatingTexts(delta) {
    for (let index = floatingTexts.length - 1; index >= 0; index--) {
      const item = floatingTexts[index];
      item.life -= delta;
      item.y -= 42 * delta;
      if (item.life <= 0) floatingTexts.splice(index, 1);
    }
  }

  function updateSkidMarks(delta) {
    for (let index = skidMarks.length - 1; index >= 0; index--) {
      skidMarks[index].life -= delta;
      if (skidMarks[index].life <= 0) skidMarks.splice(index, 1);
    }
  }

  function updateWaveFlow(delta) {
    if (zombies.length === 0 && game.phase === 'wave') {
      if (game.wave >= MAX_WAVE) {
        finishRun(true);
        return;
      }

      game.phase = 'intermission';
      game.intermission = 4.6;
      spawnSupplyDrops();
      setObjective(`Wave ${game.wave} puhdistettu`, 'Kerää kenttäpuvut ja valmistaudu seuraavaan hyökkäykseen.');
      const nextWave = game.wave + 1;
      showBanner(nextWave === MAX_WAVE ? `FINAL WAVE ${MAX_WAVE}` : `WAVE ${nextWave}`);
    }

    if (game.phase === 'intermission') {
      game.intermission -= delta;
      ui.objectiveText.textContent = `Seuraava aalto iskee ${Math.max(0, game.intermission).toFixed(1)} sekunnin kuluttua. Kerää kaikki mitä ehdit.`;
      if (game.intermission <= 0) spawnWave(game.wave + 1);
    }

    ui.waveBanner.classList.toggle('visible', game.bannerTimer > 0);
    if (game.bannerTimer > 0) game.bannerTimer -= delta;
  }

  function finishRun(victory) {
    game.over = true;
    game.victory = victory;
    game.started = false;
    synth.stopEngine();
    synth.stopTires();
    game.highScore = Math.max(game.highScore, game.score);
    localStorage.setItem(HIGH_SCORE_KEY, String(game.highScore));
    syncHud();

    if (victory) {
      queueEvent('Kaupunki jäi taakse. Viimeinen ulosajo onnistui.', 'accent');
      showOverlay(
        'Route Cleared',
        'Victory Run',
        `Selvisit kaikki ${MAX_WAVE} aaltoa. Lopullinen pistemääräsi on ${game.score.toLocaleString('fi-FI')} ja tappoja kertyi ${game.kills}.`,
        'Aloita uusi legenda'
      );
      synth.pulse({ type: 'triangle', start: 260, end: 700, duration: 0.32, volume: 0.045 });
    } else {
      queueEvent('Auto jäi lauman alle. Uusi ajo tarvitaan.', 'danger');
      showOverlay(
        'Engine Gone',
        'Run Lost',
        `Runko petti pisteissä ${game.score.toLocaleString('fi-FI')}. Tappoja kertyi ${game.kills}. Enter tai nappi käynnistää uuden ajon.`,
        'Yritä uudestaan'
      );
      synth.pulse({ type: 'sawtooth', start: 150, end: 45, duration: 0.28, volume: 0.045 });
    }
  }

  function updateCamera() {
    camera.x = lerp(camera.x, clamp(car.x - canvas.width / 2, 0, WORLD.width - canvas.width), 0.08);
    camera.y = lerp(camera.y, clamp(car.y - canvas.height / 2, 0, WORLD.height - canvas.height), 0.08);
  }

  function syncHud() {
    ui.healthFill.style.width = `${(car.health / car.maxHealth) * 100}%`;
    ui.ammoFill.style.width = `${(car.ammo / car.maxAmmo) * 100}%`;
    ui.nitroFill.style.width = `${(car.nitro / car.maxNitro) * 100}%`;
    ui.healthValue.textContent = `${Math.round(car.health)} / ${car.maxHealth}`;
    ui.ammoValue.textContent = `${car.ammo}`;
    ui.nitroValue.textContent = `${Math.round(car.nitro)}%`;
    ui.scoreValue.textContent = game.score.toLocaleString('fi-FI');
    ui.waveValue.textContent = `${game.wave} / ${MAX_WAVE}`;
    ui.comboValue.textContent = `x${game.combo.toFixed(1)}`;
    ui.killsValue.textContent = `${game.kills}`;
    ui.grenadeValue.textContent = `${car.grenades}`;
    ui.highScoreValue.textContent = game.highScore.toLocaleString('fi-FI');
  }

  function queueEvent(text, tone) {
    const items = Array.from(ui.eventFeed.children);
    const entry = document.createElement('div');
    entry.className = `event-item ${tone}`;
    entry.textContent = text;

    ui.eventFeed.prepend(entry);
    if (items.length >= 5) {
      items[items.length - 1].remove();
    }
  }

  function showBanner(text) {
    ui.waveBanner.textContent = text;
    const isEpicWaveBanner = text.startsWith('WAVE ') || text.startsWith('FINAL WAVE');
    game.bannerTimer = isEpicWaveBanner ? 3.2 : 2.2;
    ui.waveBanner.classList.add('visible');
  }

  function render(delta) {
    drawSky(delta);

    const shakeX = (Math.random() - 0.5) * camera.shake * 18;
    const shakeY = (Math.random() - 0.5) * camera.shake * 18;

    ctx.save();
    ctx.translate(-camera.x + shakeX, -camera.y + shakeY);

    drawCityFloor();
    drawLandmarkFacades();
    drawRoads();
    drawTrafficLights();
    drawMines();
    drawStreetLights();
    drawNeonSigns();
    drawDecorations();
    drawAcidPools();
    drawPickups();
    drawSkidMarks();
    drawBullets();
    drawGrenades();
    drawEnemyProjectiles();
    drawZombies();
    drawCar();
    drawRemotePlayers();
    drawAmbientFog();
    drawParticles();
    drawFloatingTexts();

    ctx.restore();

    drawRadar();
    drawCanvasHud();
    drawScreenFx();
  }

  function drawSky(delta) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#091420');
    gradient.addColorStop(0.5, '#051019');
    gradient.addColorStop(1, '#02060b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let index = 0; index < 12; index++) {
      const x = ((index * 137) + game.elapsed * 18) % (canvas.width + 140) - 70;
      const y = 60 + (index % 4) * 40;
      ctx.fillStyle = 'rgba(255, 113, 89, 0.06)';
      ctx.beginPath();
      ctx.arc(x, y, 42 + (index % 3) * 10, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let index = 0; index < 40; index++) {
      const x = (index * 67) % canvas.width;
      const y = 8 + (index * 23) % 140;
      const twinkle = 0.2 + Math.sin(game.elapsed * 1.8 + index * 0.7) * 0.15;
      ctx.fillStyle = `rgba(167, 203, 255, ${twinkle})`;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  function drawCityFloor() {
    const floorGradient = ctx.createLinearGradient(0, 0, 0, WORLD.height);
    floorGradient.addColorStop(0, '#1a1410');
    floorGradient.addColorStop(1, '#100d0a');
    ctx.fillStyle = floorGradient;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);

    ctx.fillStyle = 'rgba(255, 244, 228, 0.03)';
    for (let index = 0; index < 800; index++) {
      const x = (index * 73) % WORLD.width;
      const y = (index * 131) % WORLD.height;
      ctx.fillRect(x, y, 1, 1);
    }

    for (const lot of buildingLots) {
      drawBuildingLot(lot);
    }
  }

  function drawBuildingLot(lot) {
    // Drop shadow for depth
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(lot.x + 5, lot.y + 5, lot.width, lot.height);

    // Facade wall with gradient
    ctx.fillStyle = lot.tone;
    ctx.fillRect(lot.x, lot.y, lot.width, lot.height);

    // Lighter top face (roof parapet)
    const topLight = ctx.createLinearGradient(lot.x, lot.y, lot.x + lot.width, lot.y);
    topLight.addColorStop(0, 'rgba(255,255,255,0.14)');
    topLight.addColorStop(1, 'rgba(255,255,255,0.04)');
    ctx.fillStyle = topLight;
    ctx.fillRect(lot.x, lot.y, lot.width, 9);

    // Side shading (right edge darker)
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(lot.x + lot.width - 7, lot.y, 7, lot.height);

    // Bottom ledge
    ctx.fillStyle = 'rgba(0,0,0,0.30)';
    ctx.fillRect(lot.x, lot.y + lot.height - 7, lot.width, 7);

    // Horizontal floor lines (one per ~22px of height)
    ctx.strokeStyle = 'rgba(0,0,0,0.14)';
    ctx.lineWidth = 1;
    for (let fy = lot.y + 22; fy < lot.y + lot.height - 8; fy += 22) {
      ctx.beginPath();
      ctx.moveTo(lot.x + 2, fy);
      ctx.lineTo(lot.x + lot.width - 8, fy);
      ctx.stroke();
    }

    // Windows
    const cols = Math.max(2, Math.floor((lot.width - 18) / 36));
    const rows = Math.max(1, Math.floor((lot.height - 36) / 24));
    const winW = Math.max(10, Math.floor((lot.width - 18 - cols * 6) / cols));
    const winH = 13;
    const gridW = cols * (winW + 6) - 6;
    const startX = lot.x + Math.floor((lot.width - gridW) / 2);
    const startY = lot.y + 16;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const wx = startX + col * (winW + 6);
        const wy = startY + row * (winH + 8);
        if (wy + winH > lot.y + lot.height - 10) continue;
        // Frame recess
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(wx - 1, wy - 1, winW + 2, winH + 2);
        // Glass
        const lit = ((row * 7 + col * 3) % 5) !== 0;
        const glow = 0.22 + Math.sin(game.elapsed * 1.6 + col * 1.3 + row * 2.1) * 0.05;
        if (lit) {
          const warm = ((row + col) % 4) !== 3;
          ctx.fillStyle = warm ? `rgba(255, 210, 120, ${glow + 0.1})` : `rgba(130, 175, 240, ${glow})`;
        } else {
          ctx.fillStyle = 'rgba(15, 22, 38, 0.9)';
        }
        ctx.fillRect(wx, wy, winW, winH);
        // Reflection glint on top of glass
        ctx.fillStyle = 'rgba(255,255,255,0.09)';
        ctx.fillRect(wx, wy, winW, 3);
      }
    }

    // Ground-level entrance and awning for a more realistic street facade.
    const doorW = Math.max(16, Math.min(28, Math.floor(lot.width * 0.12)));
    const doorH = Math.max(26, Math.min(40, Math.floor(lot.height * 0.24)));
    const doorX = lot.x + Math.floor(lot.width * 0.5 - doorW / 2);
    const doorY = lot.y + lot.height - doorH - 8;
    ctx.fillStyle = '#161d28';
    ctx.fillRect(doorX, doorY, doorW, doorH);
    ctx.strokeStyle = 'rgba(186, 201, 223, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(doorX + 2, doorY + 2, doorW - 4, doorH - 4);
    ctx.fillStyle = 'rgba(210, 227, 245, 0.2)';
    ctx.fillRect(doorX + 3, doorY + 3, doorW - 6, Math.max(8, Math.floor(doorH * 0.28)));

    const awningW = Math.min(lot.width - 18, Math.max(44, Math.floor(lot.width * 0.36)));
    const awningX = lot.x + Math.floor((lot.width - awningW) / 2);
    const awningY = doorY - 8;
    ctx.fillStyle = 'rgba(24, 32, 46, 0.92)';
    ctx.beginPath();
    ctx.roundRect(awningX, awningY, awningW, 7, 2);
    ctx.fill();
    ctx.strokeStyle = withAlpha(lot.accent, 0.55);
    ctx.lineWidth = 1;
    ctx.strokeRect(awningX + 1, awningY + 1, awningW - 2, 5);

    // Roof details (HVAC units).
    const unitCount = Math.max(1, Math.min(3, Math.floor(lot.width / 120)));
    for (let unit = 0; unit < unitCount; unit++) {
      const unitW = 16;
      const unitH = 10;
      const unitX = lot.x + 12 + unit * 28;
      const unitY = lot.y + 10;
      ctx.fillStyle = '#6a7381';
      ctx.fillRect(unitX, unitY, unitW, unitH);
      ctx.fillStyle = '#4b5360';
      ctx.fillRect(unitX + 2, unitY + 2, unitW - 4, unitH - 4);
      ctx.strokeStyle = 'rgba(220, 230, 246, 0.25)';
      ctx.lineWidth = 0.8;
      for (let slat = 1; slat <= 3; slat++) {
        const sy = unitY + 2 + slat * 2;
        ctx.beginPath();
        ctx.moveTo(unitX + 2, sy);
        ctx.lineTo(unitX + unitW - 2, sy);
        ctx.stroke();
      }
    }

    // Sign / nameplate (not for hotel or diner which have custom facades)
    if (lot.kind !== 'hotel' && lot.kind !== 'diner') {
      const signW = Math.min(lot.width - 16, 100);
      const signX = lot.x + (lot.width - signW) / 2;
      const signY = lot.y + lot.height - 22;
      ctx.fillStyle = 'rgba(4, 8, 16, 0.92)';
      ctx.beginPath();
      ctx.roundRect(signX, signY, signW, 17, 4);
      ctx.fill();
      ctx.strokeStyle = withAlpha(lot.accent, 0.88);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(signX + 2, signY + 2, signW - 4, 13, 3);
      ctx.stroke();
      ctx.shadowColor = lot.accent;
      ctx.shadowBlur = 5;
      ctx.fillStyle = '#eef6ff';
      ctx.font = 'bold 9px Trebuchet MS';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lot.name, lot.x + lot.width / 2, signY + 8);
      ctx.shadowBlur = 0;
      ctx.textAlign = 'left';
    }

    // Kind-specific features
    if (lot.kind === 'garage') {
      const bays = Math.min(3, Math.floor((lot.width - 20) / 70));
      for (let b = 0; b < bays; b++) {
        const bw = Math.floor((lot.width - 20) / bays) - 8;
        const bx = lot.x + 10 + b * (bw + 8);
        ctx.fillStyle = '#1e2730';
        ctx.fillRect(bx, lot.y + 20, bw, lot.height - 34);
        ctx.strokeStyle = 'rgba(180, 200, 220, 0.2)';
        ctx.lineWidth = 1;
        const slatH = (lot.height - 40) / 7;
        for (let s = 0; s < 7; s++) {
          ctx.beginPath();
          ctx.moveTo(bx + 2, lot.y + 22 + s * slatH);
          ctx.lineTo(bx + bw - 2, lot.y + 22 + s * slatH);
          ctx.stroke();
        }
        ctx.strokeStyle = '#606e7e';
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(bx + bw * 0.38, lot.y + lot.height - 14);
        ctx.lineTo(bx + bw * 0.62, lot.y + lot.height - 14);
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
      return;
    }

    if (lot.kind === 'clinic') {
      ctx.shadowColor = '#4ddd44';
      ctx.shadowBlur = 10;
      ctx.fillStyle = '#8dff74';
      const cx = lot.x + lot.width / 2;
      const cy = lot.y + lot.height / 2 - 6;
      ctx.fillRect(cx - 5, cy - 14, 10, 28);
      ctx.fillRect(cx - 14, cy - 5, 28, 10);
      ctx.shadowBlur = 0;
    }

    if (lot.kind === 'bank') {
      // Columns
      ctx.fillStyle = 'rgba(210, 220, 235, 0.55)';
      const nc = 4;
      for (let c = 0; c < nc; c++) {
        const cx = lot.x + 12 + c * ((lot.width - 24) / (nc - 1));
        ctx.fillRect(cx - 4, lot.y + 9, 8, lot.height - 18);
        ctx.fillRect(cx - 7, lot.y + 9, 14, 5);
        ctx.fillRect(cx - 7, lot.y + lot.height - 14, 14, 5);
      }
    }

    if (lot.kind === 'cinema') {
      ctx.fillStyle = '#c41f3a';
      ctx.fillRect(lot.x + 6, lot.y + lot.height - 36, lot.width - 12, 14);
      ctx.fillStyle = '#ffdf3a';
      for (let m = lot.x + 14; m < lot.x + lot.width - 14; m += 11) {
        ctx.beginPath();
        ctx.arc(m, lot.y + lot.height - 29, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#fff0cc';
      ctx.font = 'bold 8px Trebuchet MS';
      ctx.textAlign = 'center';
      ctx.fillText('NOW SHOWING', lot.x + lot.width / 2, lot.y + lot.height - 20);
      ctx.textAlign = 'left';
    }

    if (lot.kind === 'station') {
      // Clock
      const clkX = lot.x + lot.width / 2;
      const clkY = lot.y + 22;
      ctx.fillStyle = '#dde8f5';
      ctx.beginPath();
      ctx.arc(clkX, clkY, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2a3855';
      ctx.lineWidth = 2;
      ctx.stroke();
      const t = game.elapsed;
      ctx.strokeStyle = '#1a2540';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(clkX, clkY);
      ctx.lineTo(clkX + Math.cos(t * 0.2 - Math.PI / 2) * 9, clkY + Math.sin(t * 0.2 - Math.PI / 2) * 9);
      ctx.stroke();
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(clkX, clkY);
      ctx.lineTo(clkX + Math.cos(t * 2.4 - Math.PI / 2) * 11, clkY + Math.sin(t * 2.4 - Math.PI / 2) * 11);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    if (lot.kind === 'warehouse') {
      ctx.fillStyle = '#1c2530';
      ctx.fillRect(lot.x + 8, lot.y + lot.height - 30, lot.width - 16, 22);
      ctx.strokeStyle = 'rgba(255, 220, 130, 0.3)';
      ctx.lineWidth = 1.5;
      const nd = Math.floor((lot.width - 20) / 52);
      for (let d = 0; d < nd; d++) {
        const dx = lot.x + 12 + d * 52;
        ctx.strokeRect(dx, lot.y + lot.height - 28, 38, 18);
      }
    }
  }

  function drawRoads() {
    for (const road of roads) {
      // Sidewalk / curb zone around roads.
      ctx.fillStyle = '#262b34';
      ctx.fillRect(road.x - 8, road.y - 8, road.width + 16, road.height + 16);

      ctx.fillStyle = '#262b34';
      ctx.fillRect(road.x, road.y, road.width, road.height);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 6;
      ctx.strokeRect(road.x + 3, road.y + 3, road.width - 6, road.height - 6);

      ctx.strokeStyle = 'rgba(185, 194, 207, 0.42)';
      ctx.lineWidth = 2;
      ctx.strokeRect(road.x + 10, road.y + 10, road.width - 20, road.height - 20);

      const laneSplit = road.width > road.height ? road.height / 3 : road.width / 3;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
      ctx.lineWidth = 1.5;
      if (road.width > road.height) {
        ctx.beginPath();
        ctx.moveTo(road.x + 12, road.y + laneSplit);
        ctx.lineTo(road.x + road.width - 12, road.y + laneSplit);
        ctx.moveTo(road.x + 12, road.y + laneSplit * 2);
        ctx.lineTo(road.x + road.width - 12, road.y + laneSplit * 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(road.x + laneSplit, road.y + 12);
        ctx.lineTo(road.x + laneSplit, road.y + road.height - 12);
        ctx.moveTo(road.x + laneSplit * 2, road.y + 12);
        ctx.lineTo(road.x + laneSplit * 2, road.y + road.height - 12);
        ctx.stroke();
      }

      if (road.width > road.height) {
        const center = road.y + road.height / 2;
        for (let x = road.x + 18; x < road.x + road.width - 18; x += 54) {
          ctx.fillStyle = 'rgba(255, 230, 150, 0.42)';
          ctx.fillRect(x, center - 3, 26, 6);
        }

        const beam = ctx.createLinearGradient(road.x, center, road.x + road.width, center);
        beam.addColorStop(0, 'rgba(120, 190, 255, 0)');
        beam.addColorStop(0.5, 'rgba(120, 190, 255, 0.08)');
        beam.addColorStop(1, 'rgba(120, 190, 255, 0)');
        ctx.fillStyle = beam;
        ctx.fillRect(road.x + 10, center - 10, road.width - 20, 20);
      } else {
        const center = road.x + road.width / 2;
        for (let y = road.y + 18; y < road.y + road.height - 18; y += 54) {
          ctx.fillStyle = 'rgba(255, 230, 150, 0.42)';
          ctx.fillRect(center - 3, y, 6, 26);
        }

        const beam = ctx.createLinearGradient(center, road.y, center, road.y + road.height);
        beam.addColorStop(0, 'rgba(120, 190, 255, 0)');
        beam.addColorStop(0.5, 'rgba(120, 190, 255, 0.08)');
        beam.addColorStop(1, 'rgba(120, 190, 255, 0)');
        ctx.fillStyle = beam;
        ctx.fillRect(center - 10, road.y + 10, 20, road.height - 20);
      }
    }

    drawCurvedRoadNetwork();
    drawCrosswalks();
    drawRoadSigns();

    for (const pad of boostPads) {
      const active = pad.cooldown <= 0;
      ctx.save();
      ctx.translate(pad.x, pad.y);
      ctx.fillStyle = active ? 'rgba(46, 209, 255, 0.22)' : 'rgba(60, 80, 92, 0.22)';
      ctx.beginPath();
      ctx.arc(0, 0, pad.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = active ? 'rgba(137, 240, 255, 0.8)' : 'rgba(120, 138, 155, 0.45)';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = active ? '#89f0ff' : '#607080';
      ctx.beginPath();
      ctx.moveTo(-8, 10);
      ctx.lineTo(2, -10);
      ctx.lineTo(10, -2);
      ctx.lineTo(2, 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawCurvedRoadNetwork() {
    for (const curve of curvedRoads) {
      ctx.save();
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      traceSmoothCurve(curve.points);

      ctx.strokeStyle = '#262b34';
      ctx.lineWidth = curve.width + 10;
      ctx.stroke();

      ctx.strokeStyle = '#262b34';
      ctx.lineWidth = curve.width;
      ctx.stroke();

      ctx.strokeStyle = '#1f252f';
      ctx.lineWidth = curve.width - 20;
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.setLineDash([28, 24]);
      ctx.strokeStyle = 'rgba(255, 230, 150, 0.45)';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();

      const start = curve.points[0];
      const end = curve.points[curve.points.length - 1];
      drawRoadJunctionBlend(start.x, start.y, curve.width);
      drawRoadJunctionBlend(end.x, end.y, curve.width);
    }
  }

  function drawRoadJunctionBlend(x, y, width) {
    const outer = width * 0.5 + 7;
    const road = width * 0.5;
    const inner = Math.max(2, width * 0.5 - 10);

    ctx.save();

    ctx.fillStyle = '#262b34';
    ctx.beginPath();
    ctx.arc(x, y, outer, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#262b34';
    ctx.beginPath();
    ctx.arc(x, y, road, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1f252f';
    ctx.beginPath();
    ctx.arc(x, y, inner, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function traceSmoothCurve(points) {
    if (!points || points.length === 0) {
      return;
    }

    ctx.moveTo(points[0].x, points[0].y);
    if (points.length === 1) {
      return;
    }

    for (let index = 1; index < points.length - 1; index++) {
      const current = points[index];
      const next = points[index + 1];
      const midX = (current.x + next.x) * 0.5;
      const midY = (current.y + next.y) * 0.5;
      ctx.quadraticCurveTo(current.x, current.y, midX, midY);
    }

    const penultimate = points[points.length - 2];
    const last = points[points.length - 1];
    ctx.quadraticCurveTo(penultimate.x, penultimate.y, last.x, last.y);
  }

  function drawCrosswalks() {
    for (const crossing of crosswalks) {
      ctx.save();
      ctx.translate(crossing.x, crossing.y);
      ctx.rotate(crossing.angle || 0);

      ctx.fillStyle = 'rgba(22, 28, 35, 0.55)';
      ctx.fillRect(-crossing.width / 2, -crossing.height / 2, crossing.width, crossing.height);

      const stripeCount = crossing.width > crossing.height ? 6 : 5;
      const stripeSpan = crossing.width > crossing.height ? crossing.width : crossing.height;
      const stripeStep = stripeSpan / (stripeCount + 1);

      ctx.fillStyle = 'rgba(236, 242, 250, 0.75)';
      for (let stripe = 1; stripe <= stripeCount; stripe++) {
        if (crossing.width > crossing.height) {
          const sx = -crossing.width / 2 + stripe * stripeStep - 3;
          ctx.fillRect(sx, -crossing.height / 2 + 3, 6, crossing.height - 6);
        } else {
          const sy = -crossing.height / 2 + stripe * stripeStep - 3;
          ctx.fillRect(-crossing.width / 2 + 3, sy, crossing.width - 6, 6);
        }
      }

      ctx.restore();
    }
  }

  function drawRoadSigns() {
    for (const sign of roadSigns) {
      ctx.save();
      ctx.translate(sign.x, sign.y);
      ctx.rotate(sign.angle);

      ctx.fillStyle = '#59606c';
      ctx.fillRect(-1.5, 8, 3, 18);

      if (sign.type === 'stop') {
        ctx.fillStyle = '#cb3434';
        ctx.beginPath();
        ctx.moveTo(0, -9);
        for (let index = 0; index < 8; index++) {
          const angle = Math.PI / 8 + (Math.PI * 2 * index) / 8;
          ctx.lineTo(Math.cos(angle) * 8, Math.sin(angle) * 8 - 1);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f2f5fa';
        ctx.font = 'bold 5px Trebuchet MS';
        ctx.textAlign = 'center';
        ctx.fillText('STOP', 0, 1);
      }

      if (sign.type === 'speed40') {
        ctx.fillStyle = '#f4f7fc';
        ctx.beginPath();
        ctx.arc(0, -2, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#d94d4d';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#11161d';
        ctx.font = 'bold 7px Trebuchet MS';
        ctx.textAlign = 'center';
        ctx.fillText('40', 0, 0.7);
      }

      if (sign.type === 'curve') {
        ctx.fillStyle = '#ffd84d';
        ctx.beginPath();
        ctx.roundRect(-7, -10, 14, 14, 2);
        ctx.fill();
        ctx.strokeStyle = '#2a2d33';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.strokeStyle = '#11161d';
        ctx.lineWidth = 1.7;
        ctx.beginPath();
        ctx.moveTo(-3, 0);
        ctx.quadraticCurveTo(-1, -6, 4, -7);
        ctx.stroke();
      }

      if (sign.type === 'oneway') {
        ctx.fillStyle = '#2f66d5';
        ctx.beginPath();
        ctx.roundRect(-11, -8, 22, 12, 2);
        ctx.fill();
        ctx.fillStyle = '#f1f6ff';
        ctx.fillRect(-6, -3, 10, 2.8);
        ctx.beginPath();
        ctx.moveTo(6, -4.5);
        ctx.lineTo(10, -1.6);
        ctx.lineTo(6, 1.3);
        ctx.closePath();
        ctx.fill();
      }

      if (sign.type === 'parking') {
        ctx.fillStyle = '#2f66d5';
        ctx.beginPath();
        ctx.roundRect(-7, -10, 14, 14, 2);
        ctx.fill();
        ctx.fillStyle = '#f0f5ff';
        ctx.font = 'bold 10px Trebuchet MS';
        ctx.textAlign = 'center';
        ctx.fillText('P', 0, 1.5);
      }

      ctx.textAlign = 'left';
      ctx.restore();
    }
  }

  function drawLandmarkFacades() {
    drawHotelFacade();
    drawDinerFacade();
    drawSupercarBillboard();
  }

  function drawHotelFacade() {
    const x = 1190;
    const y = 80;
    const width = 330;
    const height = 150;

    ctx.save();

    const wall = ctx.createLinearGradient(x, y, x + width, y + height);
    wall.addColorStop(0, '#2a3347');
    wall.addColorStop(1, '#161d2a');
    ctx.fillStyle = wall;
    ctx.beginPath();
    ctx.roundRect(x + 8, y + 10, width - 16, height - 18, 10);
    ctx.fill();

    ctx.fillStyle = '#20283a';
    ctx.fillRect(x + 12, y + 6, width - 24, 14);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 9; col++) {
        const wx = x + 26 + col * 31;
        const wy = y + 30 + row * 27;
        const lit = ((row + col) % 3) !== 0;
        const glow = 0.1 + Math.sin(game.elapsed * 2.2 + col * 0.8 + row) * 0.03;
        ctx.fillStyle = lit ? `rgba(255, 222, 164, ${0.35 + glow})` : 'rgba(111, 145, 190, 0.15)';
        ctx.fillRect(wx, wy, 16, 12);
      }
    }

    ctx.fillStyle = '#d8e6ff';
    ctx.fillRect(x + width * 0.45, y + 28, width * 0.1, 54);
    ctx.fillStyle = '#3e4f69';
    ctx.fillRect(x + width * 0.46, y + 34, width * 0.08, 44);

    ctx.fillStyle = '#121824';
    ctx.beginPath();
    ctx.roundRect(x + width * 0.37, y + height - 30, width * 0.26, 22, 6);
    ctx.fill();
    ctx.strokeStyle = '#79d8ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + width * 0.38, y + height - 28, width * 0.24, 18);

    ctx.shadowColor = '#79d8ff';
    ctx.shadowBlur = 14;
    ctx.fillStyle = '#d9f6ff';
    ctx.font = 'bold 14px Trebuchet MS';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GRAND HOTEL', x + width / 2, y + height - 19);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#2b3850';
    ctx.fillRect(x + width * 0.48, y + height - 44, width * 0.04, 16);
    ctx.fillStyle = 'rgba(255, 225, 150, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x + width * 0.5, y + height - 20, 34, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawDinerFacade() {
    const x = 1190;
    const y = 490;
    const width = 330;
    const height = 100;

    ctx.save();

    const shell = ctx.createLinearGradient(x, y, x, y + height);
    shell.addColorStop(0, '#6f747e');
    shell.addColorStop(0.45, '#404a58');
    shell.addColorStop(1, '#2c3541');
    ctx.fillStyle = shell;
    ctx.beginPath();
    ctx.roundRect(x + 8, y + 14, width - 16, height - 20, 18);
    ctx.fill();

    ctx.fillStyle = '#9aa4b4';
    ctx.beginPath();
    ctx.roundRect(x + 14, y + 20, width - 28, 18, 10);
    ctx.fill();

    const windowBand = ctx.createLinearGradient(x, y + 42, x, y + 78);
    windowBand.addColorStop(0, '#214b63');
    windowBand.addColorStop(1, '#132739');
    ctx.fillStyle = windowBand;
    ctx.beginPath();
    ctx.roundRect(x + 18, y + 44, width - 36, 30, 8);
    ctx.fill();

    ctx.strokeStyle = 'rgba(212, 227, 246, 0.55)';
    ctx.lineWidth = 2;
    for (let divider = x + 52; divider < x + width - 40; divider += 38) {
      ctx.beginPath();
      ctx.moveTo(divider, y + 46);
      ctx.lineTo(divider, y + 72);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(245, 122, 122, 0.32)';
    for (let booth = x + 30; booth < x + width - 40; booth += 44) {
      ctx.fillRect(booth, y + 62, 20, 10);
    }

    ctx.fillStyle = '#121824';
    ctx.beginPath();
    ctx.roundRect(x + width * 0.34, y + 6, width * 0.32, 20, 10);
    ctx.fill();
    ctx.strokeStyle = '#ff8c6e';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + width * 0.35, y + 8, width * 0.3, 16);

    ctx.shadowColor = '#ff8c6e';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#ffe6d7';
    ctx.font = 'bold 13px Trebuchet MS';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('MOONLIGHT DINER', x + width / 2, y + 17);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#d5dfef';
    ctx.fillRect(x + width * 0.48, y + 74, width * 0.04, 12);
    ctx.fillStyle = '#1f2938';
    ctx.fillRect(x + width * 0.46, y + 82, width * 0.08, 8);

    ctx.restore();
  }

  function drawSupercarBillboard() {
    const x = 1840;
    const y = 248;
    const width = 300;
    const height = 126;
    const flicker = 0.78 + Math.sin(game.elapsed * 2.8) * 0.08;

    ctx.save();

    ctx.fillStyle = '#2f3742';
    ctx.fillRect(x + 18, y + height, 12, 64);
    ctx.fillRect(x + width - 30, y + height, 12, 64);
    ctx.fillStyle = '#1b2027';
    ctx.fillRect(x + 8, y + height + 58, 34, 10);
    ctx.fillRect(x + width - 42, y + height + 58, 34, 10);

    const panel = ctx.createLinearGradient(x, y, x + width, y + height);
    panel.addColorStop(0, '#551717');
    panel.addColorStop(0.45, '#2b0f13');
    panel.addColorStop(1, '#100b12');
    ctx.fillStyle = panel;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 16);
    ctx.fill();

    ctx.strokeStyle = 'rgba(246, 209, 150, 0.24)';
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 4, y + 4, width - 8, height - 8);

    const glow = ctx.createRadialGradient(x + width * 0.72, y + height * 0.42, 10, x + width * 0.72, y + height * 0.42, 130);
    glow.addColorStop(0, `rgba(255, 183, 77, ${0.18 * flicker})`);
    glow.addColorStop(1, 'rgba(255, 183, 77, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x, y, width, height);

    ctx.fillStyle = '#11161d';
    ctx.beginPath();
    ctx.roundRect(x + 16, y + 16, 64, 64, 14);
    ctx.fill();
    ctx.strokeStyle = '#ffcf68';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 20, y + 20, 56, 56);
    ctx.fillStyle = '#ffcf68';
    ctx.beginPath();
    ctx.moveTo(x + 48, y + 28);
    ctx.lineTo(x + 66, y + 44);
    ctx.lineTo(x + 58, y + 66);
    ctx.lineTo(x + 38, y + 66);
    ctx.lineTo(x + 30, y + 44);
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = '#ff674d';
    ctx.shadowBlur = 16;
    ctx.fillStyle = `rgba(255, 236, 226, ${0.86 * flicker})`;
    ctx.font = 'bold 24px Impact';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('FEROXI', x + 96, y + 38);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffd7a6';
    ctx.font = 'bold 11px Trebuchet MS';
    ctx.fillText('V12 INTERCEPTOR // BLOOD RED EDITION', x + 98, y + 58);

    ctx.fillStyle = '#0f1318';
    ctx.beginPath();
    ctx.roundRect(x + 92, y + 70, 188, 36, 10);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 102, y + 99);
    ctx.lineTo(x + 268, y + 99);
    ctx.stroke();

    ctx.fillStyle = '#cf3f32';
    ctx.beginPath();
    ctx.moveTo(x + 114, y + 94);
    ctx.bezierCurveTo(x + 132, y + 74, x + 176, y + 70, x + 218, y + 74);
    ctx.lineTo(x + 238, y + 78);
    ctx.lineTo(x + 252, y + 88);
    ctx.lineTo(x + 246, y + 95);
    ctx.lineTo(x + 224, y + 98);
    ctx.lineTo(x + 132, y + 98);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffd84d';
    ctx.fillRect(x + 232, y + 82, 10, 4);
    ctx.fillStyle = '#1a2027';
    ctx.beginPath();
    ctx.arc(x + 144, y + 100, 8, 0, Math.PI * 2);
    ctx.arc(x + 226, y + 100, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#dce9ff';
    ctx.font = 'bold 12px Trebuchet MS';
    ctx.fillText('RUN FAST. DIE LAST.', x + 100, y + 112);

    ctx.restore();
  }

  function drawTrafficLights() {
    for (const light of trafficLights) {
      const cycleSeconds = 13;
      const phase = (game.elapsed + light.phaseOffset) % cycleSeconds;
      const redOn = phase < 5.5;
      const redYellowOn = phase >= 5.5 && phase < 6.2;
      const greenOn = phase >= 6.2 && phase < 11.2;
      const yellowOn = phase >= 11.2;

      ctx.save();
      ctx.translate(light.x, light.y);
      ctx.rotate(light.angle);

      // Pole and arm like a real street-side traffic light.
      ctx.fillStyle = '#3a424d';
      ctx.fillRect(-3, -52, 6, 52);
      ctx.fillStyle = '#4b5664';
      ctx.fillRect(-3, -52, 36, 4);
      ctx.fillStyle = '#29313c';
      ctx.fillRect(29, -52, 4, 10);

      // Two heads: near side and opposite direction.
      const heads = [
        { x: 32, y: -42 },
        { x: -18, y: -42 }
      ];

      for (const head of heads) {
        ctx.fillStyle = '#171d26';
        ctx.beginPath();
        ctx.roundRect(head.x - 8, head.y - 2, 16, 30, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(216, 227, 241, 0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(head.x - 7, head.y - 1, 14, 28);

        const lamps = [
          { y: head.y + 4, color: '#ff5e5e', on: redOn || redYellowOn },
          { y: head.y + 12, color: '#ffd056', on: redYellowOn || yellowOn },
          { y: head.y + 20, color: '#62f07a', on: greenOn }
        ];

        for (const bulb of lamps) {
          // Recessed lamp cavity so the light sits inside the housing.
          ctx.fillStyle = 'rgba(8, 12, 18, 0.95)';
          ctx.beginPath();
          ctx.arc(head.x, bulb.y, 4.1, 0, Math.PI * 2);
          ctx.fill();

          const cavityShade = ctx.createRadialGradient(head.x, bulb.y - 0.8, 0.8, head.x, bulb.y, 4.6);
          cavityShade.addColorStop(0, 'rgba(0, 0, 0, 0.18)');
          cavityShade.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
          ctx.fillStyle = cavityShade;
          ctx.beginPath();
          ctx.arc(head.x, bulb.y, 4.2, 0, Math.PI * 2);
          ctx.fill();

          // Small visor above each lamp like on real traffic lights.
          ctx.fillStyle = '#10151d';
          ctx.beginPath();
          ctx.moveTo(head.x - 4.3, bulb.y - 4.2);
          ctx.lineTo(head.x + 4.3, bulb.y - 4.2);
          ctx.lineTo(head.x + 3.2, bulb.y - 6.2);
          ctx.lineTo(head.x - 3.2, bulb.y - 6.2);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = 'rgba(205, 215, 232, 0.2)';
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.arc(head.x, bulb.y, 3.4, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = bulb.on ? bulb.color : 'rgba(41, 49, 58, 0.95)';
          ctx.beginPath();
          ctx.arc(head.x, bulb.y, 2.55, 0, Math.PI * 2);
          ctx.fill();

          // Glass reflection gives a lens look, not a flat dot.
          ctx.fillStyle = bulb.on ? 'rgba(255, 255, 255, 0.36)' : 'rgba(255, 255, 255, 0.12)';
          ctx.beginPath();
          ctx.ellipse(head.x - 0.9, bulb.y - 0.9, 1.15, 0.75, -0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }

  function drawStreetLights() {
    for (const lamp of streetLights) {
      const pulse = 0.72 + Math.sin(game.elapsed * 1.6 + lamp.x * 0.01) * 0.15;

      ctx.save();
      ctx.translate(lamp.x, lamp.y);
      ctx.rotate(lamp.angle);

      ctx.fillStyle = '#2c3440';
      ctx.fillRect(-2, -2, 4, 26);
      ctx.fillStyle = '#445165';
      ctx.fillRect(-8, -4, 16, 6);

      const lightGradient = ctx.createRadialGradient(0, 8, 2, 0, 8, 95);
      lightGradient.addColorStop(0, `rgba(255, 233, 171, ${0.24 * pulse})`);
      lightGradient.addColorStop(1, 'rgba(255, 233, 171, 0)');
      ctx.fillStyle = lightGradient;
      ctx.beginPath();
      ctx.ellipse(0, 50, 42, 62, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffe8a8';
      ctx.fillRect(-5, 2, 10, 3);
      ctx.restore();
    }
  }

  function drawMines() {
    for (const mine of mines) {
      const blink = 0.45 + Math.sin(mine.pulse) * 0.25;
      ctx.save();
      ctx.translate(mine.x, mine.y);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
      ctx.beginPath();
      ctx.ellipse(0, 10, mine.radius * 0.9, mine.radius * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#40464f';
      ctx.beginPath();
      ctx.arc(0, 0, mine.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6f7886';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = `rgba(255, 98, 98, ${blink})`;
      ctx.beginPath();
      ctx.arc(0, -2, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(210, 220, 235, 0.45)';
      for (let spike = 0; spike < 6; spike++) {
        const angle = (Math.PI * 2 * spike) / 6;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * (mine.radius - 2), Math.sin(angle) * (mine.radius - 2));
        ctx.lineTo(Math.cos(angle) * (mine.radius + 6), Math.sin(angle) * (mine.radius + 6));
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawNeonSigns() {
    for (const sign of neonSigns) {
      const pulse = 0.65 + Math.sin(game.elapsed * 4 + sign.x * 0.03) * 0.25;

      ctx.save();
      ctx.translate(sign.x, sign.y);

      ctx.fillStyle = 'rgba(11, 15, 23, 0.9)';
      ctx.fillRect(-54, -14, 108, 28);
      ctx.strokeStyle = 'rgba(145, 181, 240, 0.28)';
      ctx.strokeRect(-54, -14, 108, 28);

      ctx.shadowColor = sign.hue;
      ctx.shadowBlur = 18;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.55 + pulse * 0.25})`;
      ctx.font = 'bold 11px Trebuchet MS';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sign.text, 0, 1);

      ctx.shadowBlur = 0;
      ctx.fillStyle = sign.hue;
      ctx.fillRect(-44, 10, 88, 2);
      ctx.restore();
    }
  }

  function drawDecorations() {
    for (const carWreck of parkedCars) {
      ctx.save();
      ctx.translate(carWreck.x, carWreck.y);
      ctx.rotate(carWreck.angle);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.24)';
      ctx.beginPath();
      ctx.ellipse(0, 9, carWreck.width * 0.5, carWreck.height * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = carWreck.color;
      ctx.beginPath();
      ctx.roundRect(-carWreck.width / 2, -carWreck.height / 2, carWreck.width, carWreck.height, 4);
      ctx.fill();

      ctx.fillStyle = 'rgba(160, 195, 225, 0.45)';
      ctx.fillRect(-carWreck.width * 0.18, -carWreck.height * 0.28, carWreck.width * 0.36, carWreck.height * 0.3);
      ctx.fillStyle = '#181d26';
      ctx.fillRect(-carWreck.width * 0.56, -carWreck.height * 0.4, 6, carWreck.height * 0.8);
      ctx.fillRect(carWreck.width * 0.42, -carWreck.height * 0.4, 6, carWreck.height * 0.8);

      ctx.restore();
    }

    for (const barricade of barricades) {
      ctx.save();
      ctx.translate(barricade.x, barricade.y);
      ctx.rotate(barricade.angle);
      ctx.fillStyle = '#4b3628';
      ctx.fillRect(-barricade.width / 2, -barricade.height / 2, barricade.width, barricade.height);
      ctx.fillStyle = '#ffb23f';
      ctx.fillRect(-barricade.width / 2 + 3, -5, barricade.width - 6, 10);
      ctx.restore();
    }

    ctx.strokeStyle = 'rgba(255, 95, 95, 0.09)';
    ctx.lineWidth = 2;
    for (let x = 80; x < WORLD.width; x += 180) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 50, WORLD.height);
      ctx.stroke();
    }

    for (let index = 0; index < 28; index++) {
      const x = (index * 97) % WORLD.width;
      const y = (index * 191) % WORLD.height;
      ctx.fillStyle = 'rgba(170, 190, 214, 0.12)';
      ctx.fillRect(x, y, 10, 2);
      ctx.fillRect(x + 2, y + 2, 4, 4);
    }
  }

  function drawAmbientFog() {
    for (let index = 0; index < 7; index++) {
      const drift = (game.elapsed * (11 + index * 3)) % (WORLD.width + 420);
      const x = drift - 210;
      const y = 180 + index * 200 + Math.sin(game.elapsed * 0.6 + index) * 26;
      const cloud = ctx.createRadialGradient(x, y, 35, x, y, 170);
      cloud.addColorStop(0, 'rgba(123, 149, 176, 0.08)');
      cloud.addColorStop(1, 'rgba(123, 149, 176, 0)');
      ctx.fillStyle = cloud;
      ctx.beginPath();
      ctx.ellipse(x, y, 190, 110, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBullets() {
    for (const bullet of bullets) {
      ctx.strokeStyle = bullet.color || '#fff4b0';
      ctx.lineWidth = bullet.width || 3;
      ctx.beginPath();
      ctx.moveTo(bullet.x - bullet.vx * 0.01, bullet.y - bullet.vy * 0.01);
      ctx.lineTo(bullet.x, bullet.y);
      ctx.stroke();
    }
  }

  function drawGrenades() {
    for (const grenade of grenades) {
      const fuseBlink = 0.45 + Math.sin(grenade.fusePulse || 0) * 0.55;
      ctx.save();
      ctx.translate(grenade.x, grenade.y);
      ctx.rotate(grenade.rotation);
      ctx.fillStyle = '#39404b';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8dff74';
      ctx.fillRect(-2, -12, 4, 6);
      ctx.fillStyle = `rgba(255, 188, 92, ${fuseBlink})`;
      ctx.beginPath();
      ctx.arc(0, -11, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawEnemyProjectiles() {
    for (const projectile of enemyProjectiles) {
      ctx.fillStyle = '#8dff74';
      ctx.beginPath();
      ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawAcidPools() {
    for (const pool of acidPools) {
      const alpha = 0.22 + Math.sin(pool.pulse) * 0.05;
      ctx.fillStyle = `rgba(85, 209, 111, ${alpha})`;
      ctx.beginPath();
      ctx.arc(pool.x, pool.y, pool.radius + Math.sin(pool.pulse) * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(195, 255, 188, 0.32)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  function drawPickups() {
    for (const pickup of pickups) {
      const appearance = pickupPalette[pickup.type];
      const bob = Math.sin(pickup.bob) * 4;

      ctx.save();
      ctx.translate(pickup.x, pickup.y + bob);
      ctx.fillStyle = appearance.color;
      ctx.beginPath();
      ctx.arc(0, 0, pickup.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = appearance.ring;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.fillStyle = '#0b0f14';
      ctx.font = 'bold 10px Trebuchet MS';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(appearance.label, 0, 1);
      ctx.restore();
    }
  }

  function drawSkidMarks() {
    for (const mark of skidMarks) {
      ctx.save();
      ctx.translate(mark.x, mark.y);
      ctx.rotate(mark.angle);
      ctx.fillStyle = `rgba(10, 10, 10, ${(mark.life / mark.maxLife) * 0.2})`;
      ctx.fillRect(-3, -16, 6, 32);
      ctx.restore();
    }
  }

  function drawZombies() {
    for (const zombie of zombies) {
      const walk = zombie.walkCycle || zombie.pulse;
      const stride = Math.sin(walk) * zombie.radius * (0.16 + zombie.limp * 0.08);
      const oppositeStride = Math.sin(walk + Math.PI) * zombie.radius * (0.16 + zombie.limp * 0.08);
      const torsoLean = Math.cos(walk) * 0.08 + zombie.gaitOffset * 0.1 + clamp((zombie.pace || 0) / 260, 0, 0.1);
      const breathing = 1 + Math.sin(zombie.breathe || 0) * 0.03;
      const headTurn = (zombie.headYaw || 0) * 0.08;
      const isBlinking = zombie.blink > 0;
      const menace = clamp((zombie.pace || 0) / 210 + (zombie.type === 'boss' ? 0.35 : 0.1), 0.2, 1.4);
      const eyeGlow = zombie.type === 'boss' ? '#ff73c9' : zombie.type === 'spitter' ? '#8dff74' : '#ff6a6a';
      const mouthGlow = zombie.type === 'boss' ? 'rgba(255, 115, 201, 0.28)' : 'rgba(255, 90, 95, 0.22)';

      ctx.save();
      ctx.translate(zombie.x, zombie.y);
      ctx.rotate(zombie.facing + Math.PI / 2);

      ctx.fillStyle = `rgba(0, 0, 0, ${0.26 + menace * 0.08})`;
      ctx.beginPath();
      ctx.ellipse(0, zombie.radius * 0.86, zombie.radius * (0.95 + menace * 0.08), zombie.radius * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();

      if (zombie.type === 'boss') {
        const aura = ctx.createRadialGradient(0, 0, zombie.radius * 0.2, 0, 0, zombie.radius * 1.8);
        aura.addColorStop(0, 'rgba(255, 120, 196, 0.14)');
        aura.addColorStop(1, 'rgba(255, 120, 196, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, 0, zombie.radius * 1.9, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(17, 21, 18, 0.92)';
      ctx.lineWidth = Math.max(3, zombie.radius * 0.22);
      ctx.beginPath();
      ctx.moveTo(-zombie.radius * 0.2, zombie.radius * 0.55);
      ctx.lineTo(-zombie.radius * 0.22 + stride, zombie.radius * 1.2);
      ctx.moveTo(zombie.radius * 0.2, zombie.radius * 0.55);
      ctx.lineTo(zombie.radius * 0.22 + oppositeStride, zombie.radius * 1.2);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(-zombie.radius * 0.35, -zombie.radius * 0.28);
      ctx.lineTo(-zombie.radius * 0.6 + oppositeStride * 0.55, zombie.radius * 0.16);
      ctx.moveTo(zombie.radius * 0.35, -zombie.radius * 0.28);
      ctx.lineTo(zombie.radius * 0.6 + stride * 0.55, zombie.radius * 0.16);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(214, 223, 214, 0.42)';
      ctx.lineWidth = Math.max(1.2, zombie.radius * 0.05);
      ctx.beginPath();
      ctx.moveTo(-zombie.radius * 0.58 + oppositeStride * 0.55, zombie.radius * 0.16);
      ctx.lineTo(-zombie.radius * 0.78 + oppositeStride * 0.62, zombie.radius * 0.28);
      ctx.moveTo(-zombie.radius * 0.58 + oppositeStride * 0.55, zombie.radius * 0.16);
      ctx.lineTo(-zombie.radius * 0.75 + oppositeStride * 0.44, zombie.radius * 0.08);
      ctx.moveTo(zombie.radius * 0.58 + stride * 0.55, zombie.radius * 0.16);
      ctx.lineTo(zombie.radius * 0.78 + stride * 0.62, zombie.radius * 0.28);
      ctx.moveTo(zombie.radius * 0.58 + stride * 0.55, zombie.radius * 0.16);
      ctx.lineTo(zombie.radius * 0.75 + stride * 0.44, zombie.radius * 0.08);
      ctx.stroke();

      ctx.rotate(torsoLean);
      ctx.scale(1, breathing);

      const torsoGradient = ctx.createLinearGradient(0, -zombie.radius * 0.92, 0, zombie.radius * 0.7);
      torsoGradient.addColorStop(0, 'rgba(228, 232, 225, 0.12)');
      torsoGradient.addColorStop(0.35, withAlpha(zombie.tint, 0.92));
      torsoGradient.addColorStop(1, '#161913');

      ctx.fillStyle = torsoGradient;
      ctx.beginPath();
      ctx.roundRect(-zombie.radius * 0.48, -zombie.radius * 0.24, zombie.radius * 0.96, zombie.radius * 1.26, zombie.radius * 0.12);
      ctx.fill();

      ctx.fillStyle = 'rgba(10, 13, 12, 0.24)';
      ctx.fillRect(-zombie.radius * 0.12, zombie.radius * 0.04, zombie.radius * 0.24, zombie.radius * 0.68);

      ctx.fillStyle = 'rgba(240, 245, 235, 0.08)';
      for (let rib = 0; rib < 4; rib++) {
        const y = zombie.radius * (0.08 + rib * 0.16);
        ctx.fillRect(-zombie.radius * 0.24, y, zombie.radius * 0.48, zombie.radius * 0.04);
      }

      ctx.fillStyle = 'rgba(20, 22, 18, 0.55)';
      ctx.beginPath();
      ctx.moveTo(-zombie.radius * 0.34, -zombie.radius * 0.2);
      ctx.lineTo(-zombie.radius * 0.14, -zombie.radius * 0.42);
      ctx.lineTo(0, -zombie.radius * 0.24);
      ctx.lineTo(zombie.radius * 0.14, -zombie.radius * 0.46);
      ctx.lineTo(zombie.radius * 0.34, -zombie.radius * 0.18);
      ctx.lineTo(zombie.radius * 0.1, -zombie.radius * 0.12);
      ctx.lineTo(0, -zombie.radius * 0.02);
      ctx.lineTo(-zombie.radius * 0.1, -zombie.radius * 0.12);
      ctx.closePath();
      ctx.fill();

      const headGradient = ctx.createRadialGradient(0, -zombie.radius * 0.9, zombie.radius * 0.08, 0, -zombie.radius * 0.68, zombie.radius * 0.56);
      headGradient.addColorStop(0, '#d8c6b1');
      headGradient.addColorStop(0.45, '#6d7258');
      headGradient.addColorStop(1, '#262c21');
      ctx.fillStyle = headGradient;
      ctx.save();
      ctx.translate(headTurn * zombie.radius * 0.6, 0);
      ctx.beginPath();
      ctx.arc(0, -zombie.radius * 0.68, zombie.radius * 0.46, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(25, 28, 20, 0.75)';
      ctx.beginPath();
      ctx.arc(0, -zombie.radius * 0.62, zombie.radius * 0.34, 0.1, Math.PI - 0.1);
      ctx.fill();

      if (isBlinking) {
        ctx.strokeStyle = '#2f0d0d';
        ctx.lineWidth = Math.max(1.5, zombie.radius * 0.06);
        ctx.beginPath();
        ctx.moveTo(-zombie.radius * 0.24, -zombie.radius * 0.72);
        ctx.lineTo(-zombie.radius * 0.04, -zombie.radius * 0.72);
        ctx.moveTo(zombie.radius * 0.04, -zombie.radius * 0.72);
        ctx.lineTo(zombie.radius * 0.24, -zombie.radius * 0.72);
        ctx.stroke();
      } else {
        ctx.shadowColor = eyeGlow;
        ctx.shadowBlur = 10 + zombie.radius * 0.2;
        ctx.fillStyle = eyeGlow;
        ctx.beginPath();
        ctx.ellipse(-zombie.radius * 0.14, -zombie.radius * 0.72, Math.max(2, zombie.radius * 0.1), Math.max(1.5, zombie.radius * 0.07), -0.15, 0, Math.PI * 2);
        ctx.ellipse(zombie.radius * 0.14, -zombie.radius * 0.72, Math.max(2, zombie.radius * 0.1), Math.max(1.5, zombie.radius * 0.07), 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.fillStyle = mouthGlow;
      ctx.beginPath();
      ctx.arc(0, -zombie.radius * 0.52, zombie.radius * 0.22, 0.1, Math.PI - 0.1);
      ctx.fill();

      ctx.strokeStyle = 'rgba(34, 8, 8, 0.95)';
      ctx.lineWidth = Math.max(2, zombie.radius * 0.07);
      ctx.beginPath();
      ctx.moveTo(-zombie.radius * 0.16, -zombie.radius * 0.53);
      ctx.lineTo(-zombie.radius * 0.08, -zombie.radius * 0.43);
      ctx.lineTo(0, -zombie.radius * 0.56);
      ctx.lineTo(zombie.radius * 0.08, -zombie.radius * 0.43);
      ctx.lineTo(zombie.radius * 0.16, -zombie.radius * 0.53);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(232, 240, 226, 0.52)';
      ctx.lineWidth = Math.max(1, zombie.radius * 0.03);
      ctx.beginPath();
      ctx.moveTo(-zombie.radius * 0.1, -zombie.radius * 0.48);
      ctx.lineTo(-zombie.radius * 0.06, -zombie.radius * 0.42);
      ctx.moveTo(0, -zombie.radius * 0.5);
      ctx.lineTo(0, -zombie.radius * 0.41);
      ctx.moveTo(zombie.radius * 0.1, -zombie.radius * 0.48);
      ctx.lineTo(zombie.radius * 0.06, -zombie.radius * 0.42);
      ctx.stroke();

      if (zombie.type === 'boss') {
        ctx.strokeStyle = 'rgba(255, 154, 215, 0.6)';
        ctx.lineWidth = Math.max(2, zombie.radius * 0.04);
        ctx.beginPath();
        ctx.moveTo(-zombie.radius * 0.22, -zombie.radius * 1.02);
        ctx.lineTo(-zombie.radius * 0.08, -zombie.radius * 1.24);
        ctx.moveTo(zombie.radius * 0.22, -zombie.radius * 1.02);
        ctx.lineTo(zombie.radius * 0.08, -zombie.radius * 1.24);
        ctx.stroke();
      }
      ctx.restore();

      if (zombie.type === 'boss') {
        ctx.strokeStyle = '#ff9ad7';
        ctx.lineWidth = 4;
        ctx.strokeRect(-zombie.radius * 0.8, -zombie.radius * 1.1, zombie.radius * 1.6, zombie.radius * 2.1);
      }

      ctx.restore();

      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.fillRect(zombie.x - zombie.radius, zombie.y - zombie.radius - 20, zombie.radius * 2, 6);
      ctx.fillStyle = zombie.type === 'boss' ? '#ff78c4' : '#8dff74';
      ctx.fillRect(zombie.x - zombie.radius, zombie.y - zombie.radius - 20, zombie.radius * 2 * (zombie.health / zombie.maxHealth), 6);
    }
  }

  function drawCar() {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // Ground shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(2, 6, 50, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    if (car.boostGlow > 0) {
      ctx.fillStyle = `rgba(46, 209, 255, ${0.18 + car.boostGlow * 0.14})`;
      ctx.beginPath();
      ctx.arc(-4, 0, 56 + car.boostGlow * 10, 0, Math.PI * 2);
      ctx.fill();
    }

    const frontWheelTurn = clamp(car.steer, -1, 1) * 0.32;
    const chassisRoll = car.bodyRoll;
    const wear = 1 - clamp(car.health / car.maxHealth, 0, 1);

    ctx.save();
    ctx.translate(0, car.suspensionPitch * 20);
    ctx.rotate(chassisRoll);

    // Wheels — proper fat top-down tires
    const drawWheel = (x, y, steer = 0) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(steer);
      // Tire (fat, dark rubber)
      ctx.fillStyle = '#1a1c1f';
      ctx.beginPath();
      ctx.roundRect(-9, -14, 18, 28, 6);
      ctx.fill();
      // Tire sidewall highlight
      ctx.strokeStyle = 'rgba(80,90,100,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-8, -13, 16, 26, 5);
      ctx.stroke();
      // Rim
      ctx.fillStyle = '#8a9ab0';
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      // Rim spokes (3)
      ctx.strokeStyle = '#b0bcc8';
      ctx.lineWidth = 1.5;
      for (let s = 0; s < 3; s++) {
        const a = s * Math.PI * 2 / 3;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 5.5, Math.sin(a) * 5.5);
        ctx.stroke();
      }
      ctx.restore();
    };

    // Wheels positioned at corners — well outside the body
    drawWheel(30, -22, frontWheelTurn);
    drawWheel(30, 22, frontWheelTurn);
    drawWheel(-28, -22);
    drawWheel(-28, 22);

    // Main body — armored muscle car, flat rectangular with angular front
    const bodyGrad = ctx.createLinearGradient(-48, -18, 48, 18);
    bodyGrad.addColorStop(0, '#c4a832');
    bodyGrad.addColorStop(0.3, '#e8c94a');
    bodyGrad.addColorStop(0.7, '#c9a828');
    bodyGrad.addColorStop(1, '#8a6e1a');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    // Tapered front (right), squared rear (left) — car faces right (+x)
    ctx.moveTo(-46, -16);
    ctx.lineTo(-46, 16);
    ctx.lineTo(32, 18);
    ctx.lineTo(46, 10);
    ctx.lineTo(46, -10);
    ctx.lineTo(32, -18);
    ctx.closePath();
    ctx.fill();

    // Body center ridge (hood line)
    ctx.strokeStyle = 'rgba(255, 240, 130, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-42, 0);
    ctx.lineTo(44, 0);
    ctx.stroke();

    // Body left/right edge stripes (armor panels)
    ctx.strokeStyle = 'rgba(100, 75, 10, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-42, -14);
    ctx.lineTo(30, -16);
    ctx.moveTo(-42, 14);
    ctx.lineTo(30, 16);
    ctx.stroke();

    // Windshield / cab area
    const glassGrad = ctx.createLinearGradient(2, -10, 2, 10);
    glassGrad.addColorStop(0, 'rgba(190, 230, 255, 0.85)');
    glassGrad.addColorStop(1, 'rgba(60, 110, 145, 0.7)');
    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.moveTo(-10, -11);
    ctx.lineTo(18, -10);
    ctx.lineTo(20, 10);
    ctx.lineTo(-10, 11);
    ctx.closePath();
    ctx.fill();

    // Windshield pillar line
    ctx.strokeStyle = 'rgba(20, 35, 50, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -11);
    ctx.lineTo(-10, 11);
    ctx.moveTo(18, -10);
    ctx.lineTo(20, 10);
    ctx.stroke();

    // Roof / cabin darker panel
    const roofGrad = ctx.createLinearGradient(-12, -9, -12, 9);
    roofGrad.addColorStop(0, '#c49620');
    roofGrad.addColorStop(1, '#7a5e12');
    ctx.fillStyle = roofGrad;
    ctx.beginPath();
    ctx.moveTo(-22, -10);
    ctx.lineTo(-10, -11);
    ctx.lineTo(-10, 11);
    ctx.lineTo(-22, 10);
    ctx.closePath();
    ctx.fill();

    // Headlights (bright front)
    ctx.fillStyle = '#f0f4ff';
    ctx.shadowColor = '#c8e0ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(39, -9, 8, 6, 2);
    ctx.roundRect(39, 3, 8, 6, 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Grille
    ctx.fillStyle = '#1a1e24';
    ctx.beginPath();
    ctx.roundRect(38, -7, 6, 14, 1);
    ctx.fill();
    ctx.strokeStyle = 'rgba(150, 160, 170, 0.45)';
    ctx.lineWidth = 1;
    for (let g = 0; g < 4; g++) {
      ctx.beginPath();
      ctx.moveTo(39, -5 + g * 3.5);
      ctx.lineTo(43, -5 + g * 3.5);
      ctx.stroke();
    }

    // Taillights (red back)
    ctx.fillStyle = '#cc3333';
    ctx.shadowColor = '#ff4444';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.roundRect(-45, -12, 7, 5, 2);
    ctx.roundRect(-45, 7, 7, 5, 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Side exhaust pipes
    ctx.strokeStyle = '#3a3e46';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10, -17);
    ctx.lineTo(20, -17);
    ctx.moveTo(-10, 17);
    ctx.lineTo(20, 17);
    ctx.stroke();
    ctx.lineCap = 'butt';

    // Damage scorch marks
    if (wear > 0.15) {
      ctx.fillStyle = `rgba(80, 40, 10, ${wear * 0.4})`;
      ctx.beginPath();
      ctx.roundRect(-30, -8, 14, 6, 3);
      ctx.roundRect(5, 4, 12, 6, 3);
      ctx.fill();
    }

    ctx.restore(); // end chassis tilt

    // Roadkill glow
    if (car.roadkillGlow > 0) {
      ctx.strokeStyle = `rgba(255, 178, 63, ${car.roadkillGlow * 0.8})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(-50, -28, 100, 56);
    }

    // Nitro flame
    if ((keys.ShiftLeft || keys.ShiftRight) && car.nitro > 0) {
      ctx.fillStyle = '#2ed1ff';
      ctx.beginPath();
      ctx.moveTo(-48, -8);
      ctx.lineTo(-70 - Math.random() * 12, 0);
      ctx.lineTo(-48, 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 241, 176, 0.85)';
      ctx.beginPath();
      ctx.moveTo(-48, -4);
      ctx.lineTo(-64 - Math.random() * 8, 0);
      ctx.lineTo(-48, 4);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // Remote player colors for up to 4 remote players
  const REMOTE_PLAYER_COLORS = ['#2ed1ff', '#ff6fa2', '#8dff74', '#ffb23f'];

  function drawRemotePlayers() {
    const playerIds = Object.keys(network.remotePlayers);
    if (playerIds.length === 0) return;

    playerIds.forEach((pid, index) => {
      if (pid === network.myPlayerId) return;
      const remote = network.remotePlayers[pid];
      if (!remote || !Number.isFinite(remote.x) || !Number.isFinite(remote.y)) return;

      const color = REMOTE_PLAYER_COLORS[index % REMOTE_PLAYER_COLORS.length];
      ctx.save();
      ctx.translate(remote.x, remote.y);
      ctx.rotate(normalizeAngle(remote.angle || 0));

      // Chassis
      ctx.save();

      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(2, 6, 50, 20, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body glow ring for visibility
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 54, 28, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Wheels
      const drawRemoteWheel = (wx, wy, steer = 0) => {
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(steer);
        ctx.fillStyle = '#1a1c1f';
        ctx.beginPath();
        ctx.roundRect(-9, -14, 18, 28, 6);
        ctx.fill();
        ctx.fillStyle = '#8a9ab0';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };
      drawRemoteWheel(30, -22);
      drawRemoteWheel(30, 22);
      drawRemoteWheel(-28, -22);
      drawRemoteWheel(-28, 22);

      // Main body
      const bodyGrad = ctx.createLinearGradient(-48, -18, 48, 18);
      bodyGrad.addColorStop(0, withAlpha(color, 0.7));
      bodyGrad.addColorStop(0.4, color);
      bodyGrad.addColorStop(1, withAlpha(color, 0.5));
      ctx.fillStyle = bodyGrad;
      ctx.beginPath();
      ctx.moveTo(-46, -16);
      ctx.lineTo(-46, 16);
      ctx.lineTo(32, 18);
      ctx.lineTo(46, 10);
      ctx.lineTo(46, -10);
      ctx.lineTo(32, -18);
      ctx.closePath();
      ctx.fill();

      // Center ridge
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-42, 0);
      ctx.lineTo(44, 0);
      ctx.stroke();

      // Windshield
      ctx.fillStyle = 'rgba(180, 220, 255, 0.7)';
      ctx.beginPath();
      ctx.moveTo(-10, -11);
      ctx.lineTo(18, -10);
      ctx.lineTo(20, 10);
      ctx.lineTo(-10, 11);
      ctx.closePath();
      ctx.fill();

      // Headlights
      ctx.fillStyle = '#f0f4ff';
      ctx.beginPath();
      ctx.roundRect(39, -9, 8, 6, 2);
      ctx.roundRect(39, 3, 8, 6, 2);
      ctx.fill();

      // Player label
      ctx.fillStyle = color;
      ctx.font = 'bold 14px Trebuchet MS';
      ctx.textAlign = 'center';
      ctx.fillText(remote.isHost ? 'HOST' : `P${index + 2}`, 0, -42);
      ctx.textAlign = 'left';

      // Restore chassis save()
      ctx.restore();
      // Restore outer translate/rotate save()
      ctx.restore();
    });
  }

  function drawParticles() {
    for (const particle of particles) {
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      if (particle.ring) {
        const radius = lerp(particle.ringFrom, particle.ringTo, 1 - alpha);
        ctx.strokeStyle = withAlpha(particle.color, alpha * 0.8);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = withAlpha(particle.color, alpha);
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawFloatingTexts() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 18px Trebuchet MS';
    for (const item of floatingTexts) {
      ctx.fillStyle = withAlpha(item.color, item.life / item.maxLife);
      ctx.fillText(item.text, item.x, item.y);
    }
    ctx.textAlign = 'left';
  }

  function drawRadar() {
    const width = 170;
    const height = 170;
    const x = canvas.width - width - 18;
    const y = 18;
    const scaleX = width / WORLD.width;
    const scaleY = height / WORLD.height;

    ctx.save();
    ctx.fillStyle = 'rgba(5, 10, 18, 0.8)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = 'rgba(141, 255, 116, 0.25)';
    ctx.strokeRect(x, y, width, height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    for (const road of roads) {
      ctx.fillRect(x + road.x * scaleX, y + road.y * scaleY, road.width * scaleX, road.height * scaleY);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const curve of curvedRoads) {
      ctx.beginPath();
      ctx.moveTo(x + curve.points[0].x * scaleX, y + curve.points[0].y * scaleY);
      for (let index = 1; index < curve.points.length; index++) {
        const point = curve.points[index];
        ctx.lineTo(x + point.x * scaleX, y + point.y * scaleY);
      }
      ctx.stroke();
    }

    ctx.fillStyle = '#2ed1ff';
    ctx.beginPath();
    ctx.arc(x + car.x * scaleX, y + car.y * scaleY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Remote players on radar
    Object.values(network.remotePlayers).forEach((remote, index) => {
      if (!remote || typeof remote.x !== 'number') return;
      ctx.fillStyle = REMOTE_PLAYER_COLORS[index % REMOTE_PLAYER_COLORS.length];
      ctx.beginPath();
      ctx.arc(x + remote.x * scaleX, y + remote.y * scaleY, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.fillStyle = '#ff6f77';
    for (const zombie of zombies.slice(0, 45)) {
      ctx.fillRect(x + zombie.x * scaleX - 1, y + zombie.y * scaleY - 1, 3, 3);
    }

    ctx.fillStyle = '#8dff74';
    for (const pickup of pickups) {
      ctx.fillRect(x + pickup.x * scaleX - 1.5, y + pickup.y * scaleY - 1.5, 3, 3);
    }

    ctx.fillStyle = '#edf4ff';
    ctx.font = 'bold 11px Trebuchet MS';
    ctx.fillText('TUTKA', x + 10, y + 14);
    ctx.restore();
  }

  function drawCanvasHud() {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 10, 18, 0.78)';
    ctx.fillRect(16, 18, 300, 136);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.strokeRect(16, 18, 300, 136);

    ctx.fillStyle = '#edf4ff';
    ctx.font = 'bold 14px Trebuchet MS';
    const weapon = getWeaponProfile();
    ctx.fillText(`SPEED ${Math.round(Math.abs(car.speed))}`, 30, 44);
    ctx.fillText(`ENEMIES ${zombies.length}`, 30, 68);
    ctx.fillText(`COMBO x${game.combo.toFixed(1)}`, 30, 92);
    ctx.fillText(game.phase === 'intermission' ? `NEXT ${Math.max(0, game.intermission).toFixed(1)}s` : `WAVE ${game.wave}`, 30, 116);
    ctx.fillText(`WEAPON ${weapon.name}`, 30, 140);

    if (car.offroadDust > 0) {
      ctx.fillStyle = `rgba(255, 178, 63, ${car.offroadDust * 0.9})`;
      ctx.fillText('OFFROAD DRAG', 150, 44);
    }
    if (game.phase === 'intermission') {
      ctx.fillStyle = 'rgba(141, 255, 116, 0.82)';
      ctx.fillText('SUPPLY WINDOW', 150, 68);
    }
    if (zombies.some((zombie) => zombie.type === 'boss')) {
      ctx.fillStyle = 'rgba(255, 120, 196, 0.92)';
      ctx.fillText('BEHEMOTH LIVE', 150, 92);
    }

    const nextUnlock = getNextWeaponUnlock();
    ctx.fillStyle = 'rgba(137, 240, 255, 0.86)';
    ctx.fillText(nextUnlock === null ? 'WEAPON MAXED' : `NEXT GUN ${Math.max(0, nextUnlock - game.kills)} KILLS`, 150, 116);

    ctx.restore();
  }

  function drawScreenFx() {
    if (camera.flash > 0) {
      ctx.fillStyle = `rgba(255, 245, 220, ${camera.flash * 0.18})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const vignette = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, canvas.height * 0.16, canvas.width / 2, canvas.height / 2, canvas.height * 0.72);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function isOnRoad(x, y) {
    const straightRoadMargin = 10;
    const onStraightRoad = roads.some((road) => x >= road.x - straightRoadMargin && x <= road.x + road.width + straightRoadMargin && y >= road.y - straightRoadMargin && y <= road.y + road.height + straightRoadMargin);
    if (onStraightRoad) {
      return true;
    }

    const onJunction = roadJunctions.some((joint) => distanceBetween(x, y, joint.x, joint.y) <= joint.radius);
    if (onJunction) {
      return true;
    }

    return curvedRoads.some((curve) => isPointNearPolyline(x, y, curve.points, curve.width * 0.64));
  }

  function isPointNearPolyline(px, py, points, maxDistance) {
    const maxDistanceSq = maxDistance * maxDistance;
    for (let index = 1; index < points.length; index++) {
      const start = points[index - 1];
      const end = points[index];
      if (pointToSegmentDistanceSq(px, py, start.x, start.y, end.x, end.y) <= maxDistanceSq) {
        return true;
      }
    }
    return false;
  }

  function pointToSegmentDistanceSq(px, py, x1, y1, x2, y2) {
    const segX = x2 - x1;
    const segY = y2 - y1;
    const segLenSq = segX * segX + segY * segY;

    if (segLenSq === 0) {
      const dx = px - x1;
      const dy = py - y1;
      return dx * dx + dy * dy;
    }

    let t = ((px - x1) * segX + (py - y1) * segY) / segLenSq;
    t = clamp(t, 0, 1);

    const projX = x1 + t * segX;
    const projY = y1 + t * segY;
    const distX = px - projX;
    const distY = py - projY;
    return distX * distX + distY * distY;
  }

  function isInsideWorld(x, y) {
    return x >= 0 && x <= WORLD.width && y >= 0 && y <= WORLD.height;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function moveToward(value, target, amount) {
    if (value < target) return Math.min(target, value + amount);
    return Math.max(target, value - amount);
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function distanceBetween(x1, y1, x2, y2) {
    return Math.hypot(x2 - x1, y2 - y1);
  }

  function normalizeAngle(angle) {
    let normalized = Number(angle);
    if (!Number.isFinite(normalized)) {
      return 0;
    }
    while (normalized > Math.PI) normalized -= Math.PI * 2;
    while (normalized < -Math.PI) normalized += Math.PI * 2;
    return normalized;
  }

  function withAlpha(color, alpha) {
    if (color.startsWith('rgba')) {
      return color.replace(/,\s*[^,]+\)$/, `, ${alpha})`);
    }
    if (color.startsWith('rgb')) {
      return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
    }
    return color;
  }
});
