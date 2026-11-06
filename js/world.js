/**
 * EarthDrive World Engine
 * - Curated famous world destinations
 * - OpenStreetMap Overpass API real road query & geometry generator
 * - Ultra-high fidelity procedural city, coastal expressway & countryside road generator
 * - Dynamic AI traffic system with civilian vehicles
 */

const WORLD_DESTINATIONS = [
  {
    id: 'tokyo',
    name: 'Tokyo · Shibuya & Shinjuku',
    country: 'Japan',
    lat: 35.6595,
    lon: 139.7004,
    desc: 'Dense neon boulevards, multi-level expressways, and famous pedestrian crossings.'
  },
  {
    id: 'paris',
    name: 'Paris · Champs-Élysées',
    country: 'France',
    lat: 48.8738,
    lon: 2.2950,
    desc: 'Grand radial avenues branching outwards from the Arc de Triomphe.'
  },
  {
    id: 'sanfrancisco',
    name: 'San Francisco · Lombard & Hills',
    country: 'United States',
    lat: 37.8021,
    lon: -122.4187,
    desc: 'Steep iconic roller-coaster hills overlooking the bay and suspension bridges.'
  },
  {
    id: 'monaco',
    name: 'Monaco · Grand Prix Circuit',
    country: 'Monaco',
    lat: 43.7347,
    lon: 7.4206,
    desc: 'Glamorous Mediterranean seaside hairpin curves and marina tunnels.'
  },
  {
    id: 'fuji',
    name: 'Mount Fuji · Hakone Touge',
    country: 'Japan',
    lat: 35.2104,
    lon: 139.0224,
    desc: 'Winding mountain pass touge with switchbacks through misty cedar forests.'
  },
  {
    id: 'newyork',
    name: 'New York · Manhattan Grid',
    country: 'United States',
    lat: 40.7580,
    lon: -73.9855,
    desc: 'Towering skyscrapers, Times Square neon lights, and continuous avenue traffic.'
  },
  {
    id: 'mumbai',
    name: 'Mumbai · Marine Drive',
    country: 'India',
    lat: 18.9430,
    lon: 72.8230,
    desc: 'The Queen’s Necklace coastal boulevard overlooking the Arabian Sea.'
  },
  {
    id: 'alps',
    name: 'Swiss Alps · Stelvio Pass',
    country: 'Switzerland / Italy',
    lat: 46.5294,
    lon: 10.4532,
    desc: 'Breathtaking alpine cliffs with 48 dramatic hairpin turns.'
  }
];

class WorldEngine {
  constructor(scene) {
    this.scene = scene;
    this.worldGroup = new THREE.Group();
    this.worldGroup.name = 'world-environment';
    this.scene.add(this.worldGroup);

    this.currentDestination = WORLD_DESTINATIONS[0];
    this.roads = [];
    this.buildings = [];
    this.streetlights = [];
    this.trees = [];
    this.trafficCars = [];

    this.materials = this.initMaterials();
    this.isOsmLoaded = false;
  }

  initMaterials() {
    return {
      asphalt: new THREE.MeshStandardMaterial({
        color: 0x22252a,
        roughness: 0.88,
        metalness: 0.1
      }),
      roadMarkingWhite: new THREE.MeshBasicMaterial({
        color: 0xf5f5f5
      }),
      roadMarkingYellow: new THREE.MeshBasicMaterial({
        color: 0xf5be18
      }),
      sidewalk: new THREE.MeshStandardMaterial({
        color: 0x8e9297,
        roughness: 0.95
      }),
      grass: new THREE.MeshStandardMaterial({
        color: 0x3a5c37,
        roughness: 0.92
      }),
      buildingWallDay: new THREE.MeshStandardMaterial({
        color: 0xb5bcc7,
        roughness: 0.7,
        metalness: 0.25
      }),
      buildingWallNight: new THREE.MeshStandardMaterial({
        color: 0x1b2230,
        roughness: 0.6,
        metalness: 0.35
      }),
      windowGlow: new THREE.MeshStandardMaterial({
        color: 0xffe6a3,
        emissive: 0xffcc66,
        emissiveIntensity: 0.85
      }),
      windowDark: new THREE.MeshStandardMaterial({
        color: 0x151a24,
        roughness: 0.3,
        metalness: 0.8
      }),
      treeTrunk: new THREE.MeshStandardMaterial({
        color: 0x4a3728,
        roughness: 0.9
      }),
      treeLeaves: new THREE.MeshStandardMaterial({
        color: 0x2e6930,
        roughness: 0.85
      }),
      lampPost: new THREE.MeshStandardMaterial({
        color: 0x333b45,
        metalness: 0.7,
        roughness: 0.3
      }),
      lampBulb: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xfffae0,
        emissiveIntensity: 2.0
      }),
      water: new THREE.MeshStandardMaterial({
        color: 0x144252,
        roughness: 0.15,
        metalness: 0.8
      })
    };
  }

  clear() {
    while (this.worldGroup.children.length > 0) {
      const obj = this.worldGroup.children[0];
      this.worldGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
    }
    this.roads = [];
    this.buildings = [];
    this.streetlights = [];
    this.trees = [];
    this.trafficCars = [];
    this.isOsmLoaded = false;
  }

  getGroundHeight(x, z) {
    // Gentle rolling terrain
    const d = Math.hypot(x, z);
    const hill1 = Math.sin(x * 0.003) * Math.cos(z * 0.003) * 6.0;
    const hill2 = Math.sin(x * 0.008 + 1.2) * 2.5;
    // Keep roads near origin mostly flat
    const flatFactor = Math.min(1.0, d / 150);
    return (hill1 + hill2) * flatFactor;
  }

  /**
   * Generates a massive procedural world with high-speed expressways, city grid,
   * landmarks, streetlights, buildings, trees, and traffic.
   */
  buildProceduralWorld(theme = 'city') {
    this.clear();

    // 1. Terrain Base Ground
    const groundGeo = new THREE.PlaneGeometry(6000, 6000, 64, 64);
    groundGeo.rotateX(-Math.PI / 2);
    // Apply terrain elevation
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vz = pos.getZ(i);
      pos.setY(i, this.getGroundHeight(vx, vz) - 0.2);
    }
    groundGeo.computeVertexNormals();
    const groundMesh = new THREE.Mesh(groundGeo, this.materials.grass);
    groundMesh.receiveShadow = true;
    this.worldGroup.add(groundMesh);

    // 2. Coastal / Bay Water if coastal theme
    if (theme === 'monaco' || theme === 'sanfrancisco' || theme === 'mumbai') {
      const waterMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(4000, 2000).rotateX(-Math.PI / 2),
        this.materials.water
      );
      waterMesh.position.set(-800, -1.2, 0);
      this.worldGroup.add(waterMesh);
    }

    // 3. Road Network:
    // - Main North-South Grand Avenue (Width 18m, 4 lanes)
    // - East-West Boulevard (Width 16m, 4 lanes)
    // - Outer Ring Highway / Expressway (Loop around city)
    // - Grid of connector avenues
    this.createRoadSegment(0, -1200, 0, 1200, 18, 4, 'avenue');
    this.createRoadSegment(-1200, 0, 1200, 0, 18, 4, 'avenue');
    this.createRoadSegment(-450, -1000, -450, 1000, 12, 2, 'street');
    this.createRoadSegment(450, -1000, 450, 1000, 12, 2, 'street');
    this.createRoadSegment(-1000, -450, 1000, -450, 12, 2, 'street');
    this.createRoadSegment(-1000, 450, 1000, 450, 12, 2, 'street');

    // Curved High-Speed Outer Highway Loop
    this.createCurvedHighway(750, 14, 4);

    // 4. City Buildings & Architecture
    this.generateProceduralBuildings();

    // 5. Streetlights and Greenery
    this.generateRoadsideAmenities();

    // 6. Spawn AI Civilian Traffic
    this.spawnTraffic(18);
  }

  createRoadSegment(x1, z1, x2, z2, width, lanes, type) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    const angle = Math.atan2(dx, dz);

    const roadGeo = new THREE.PlaneGeometry(width, length);
    roadGeo.rotateX(-Math.PI / 2);
    roadGeo.rotateY(angle);

    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;
    const midY = this.getGroundHeight(midX, midZ) + 0.05;

    const roadMesh = new THREE.Mesh(roadGeo, this.materials.asphalt);
    roadMesh.position.set(midX, midY, midZ);
    roadMesh.receiveShadow = true;
    this.worldGroup.add(roadMesh);

    // Road Markings: Centerline
    const dashLength = 4.0;
    const gapLength = 4.0;
    const totalDashes = Math.floor(length / (dashLength + gapLength));
    const stepX = (dx / length) * (dashLength + gapLength);
    const stepZ = (dz / length) * (dashLength + gapLength);

    for (let i = 0; i < totalDashes; i++) {
      const dX = x1 + (dx / length) * (i * (dashLength + gapLength) + dashLength / 2);
      const dZ = z1 + (dz / length) * (i * (dashLength + gapLength) + dashLength / 2);
      const dashGeo = new THREE.PlaneGeometry(0.24, dashLength);
      dashGeo.rotateX(-Math.PI / 2);
      dashGeo.rotateY(angle);

      const dashMesh = new THREE.Mesh(
        dashGeo,
        lanes >= 4 ? this.materials.roadMarkingYellow : this.materials.roadMarkingWhite
      );
      dashMesh.position.set(dX, this.getGroundHeight(dX, dZ) + 0.07, dZ);
      this.worldGroup.add(dashMesh);
    }

    // Outer Solid White Road Edge Lines
    [-width / 2 + 0.4, width / 2 - 0.4].forEach(offset => {
      const edgeGeo = new THREE.PlaneGeometry(0.25, length);
      edgeGeo.rotateX(-Math.PI / 2);
      edgeGeo.rotateY(angle);
      const perpX = Math.cos(angle) * offset;
      const perpZ = -Math.sin(angle) * offset;
      const edgeMesh = new THREE.Mesh(edgeGeo, this.materials.roadMarkingWhite);
      edgeMesh.position.set(midX + perpX, midY + 0.06, midZ + perpZ);
      this.worldGroup.add(edgeMesh);
    });

    // Sidewalk Curbs
    [-width / 2 - 1.2, width / 2 + 1.2].forEach(offset => {
      const curbGeo = new THREE.BoxGeometry(2.4, 0.22, length);
      curbGeo.rotateY(angle);
      const perpX = Math.cos(angle) * offset;
      const perpZ = -Math.sin(angle) * offset;
      const curbMesh = new THREE.Mesh(curbGeo, this.materials.sidewalk);
      curbMesh.position.set(midX + perpX, midY + 0.08, midZ + perpZ);
      curbMesh.receiveShadow = true;
      this.worldGroup.add(curbMesh);
    });

    // Cache road metadata for traffic & physics
    this.roads.push({
      x1, z1, x2, z2, width, lanes, length, angle, type
    });
  }

  createCurvedHighway(radius, width, lanes) {
    const segments = 64;
    for (let i = 0; i < segments; i++) {
      const a1 = (i / segments) * Math.PI * 2;
      const a2 = ((i + 1) / segments) * Math.PI * 2;
      const x1 = Math.cos(a1) * radius;
      const z1 = Math.sin(a1) * radius;
      const x2 = Math.cos(a2) * radius;
      const z2 = Math.sin(a2) * radius;
      this.createRoadSegment(x1, z1, x2, z2, width, lanes, 'highway');
    }
  }

  generateProceduralBuildings() {
    const blocks = [
      { minX: 40, maxX: 400, minZ: 40, maxZ: 400 },
      { minX: -400, maxX: -40, minZ: 40, maxZ: 400 },
      { minX: -400, maxX: -40, minZ: -400, maxZ: -40 },
      { minX: 40, maxX: 400, minZ: -400, maxZ: -40 },
      { minX: 480, maxX: 700, minZ: -400, maxZ: 400 },
      { minX: -700, maxX: -480, minZ: -400, maxZ: 400 }
    ];

    blocks.forEach(block => {
      for (let x = block.minX + 30; x <= block.maxX - 30; x += 75) {
        for (let z = block.minZ + 30; z <= block.maxZ - 30; z += 75) {
          this.createSkyscraper(x, z);
        }
      }
    });
  }

  createSkyscraper(x, z) {
    const height = 45 + Math.random() * 110; // Tall varied heights
    const width = 28 + Math.random() * 20;
    const depth = 28 + Math.random() * 20;
    const baseY = this.getGroundHeight(x, z);

    const buildingGroup = new THREE.Group();
    buildingGroup.position.set(x, baseY + height / 2, z);

    // Main tower block
    const towerGeo = new THREE.BoxGeometry(width, height, depth);
    const towerMesh = new THREE.Mesh(towerGeo, this.materials.buildingWallDay);
    towerMesh.castShadow = true;
    towerMesh.receiveShadow = true;
    buildingGroup.add(towerMesh);

    // Glowing window bands on floors
    const floors = Math.floor(height / 3.5);
    for (let f = 2; f < floors; f += 2) {
      const winGeo = new THREE.BoxGeometry(width + 0.2, 1.2, depth + 0.2);
      const isLit = Math.random() > 0.35;
      const winMesh = new THREE.Mesh(
        winGeo,
        isLit ? this.materials.windowGlow : this.materials.windowDark
      );
      winMesh.position.y = -height / 2 + f * 3.5;
      buildingGroup.add(winMesh);
    }

    // Rooftop communications spire / HVAC
    const roofSpire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.8, 12, 8),
      this.materials.lampPost
    );
    roofSpire.position.y = height / 2 + 6;
    buildingGroup.add(roofSpire);

    this.worldGroup.add(buildingGroup);
    this.buildings.push({ x, z, width, depth, height, group: buildingGroup });
  }

  generateRoadsideAmenities() {
    // Place modern streetlights along main avenues
    for (let z = -900; z <= 900; z += 60) {
      if (Math.abs(z) < 25) continue; // Skip intersection
      this.createStreetlight(11.5, z, Math.PI / 2);
      this.createStreetlight(-11.5, z, -Math.PI / 2);
    }

    // Trees on sidewalk boulevards
    for (let z = -850; z <= 850; z += 35) {
      if (Math.abs(z) < 30) continue;
      this.createTree(13.8, z);
      this.createTree(-13.8, z);
    }
  }

  createStreetlight(x, z, rotY) {
    const postGroup = new THREE.Group();
    postGroup.position.set(x, this.getGroundHeight(x, z), z);
    postGroup.rotation.y = rotY;

    // Pole
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.18, 7.5, 8),
      this.materials.lampPost
    );
    pole.position.y = 3.75;
    pole.castShadow = true;
    postGroup.add(pole);

    // Overhang arm
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.12, 0.12),
      this.materials.lampPost
    );
    arm.position.set(1.0, 7.4, 0);
    postGroup.add(arm);

    // Lamp fixture / bulb
    const bulb = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 0.1, 0.3),
      this.materials.lampBulb
    );
    bulb.position.set(2.0, 7.3, 0);
    postGroup.add(bulb);

    this.worldGroup.add(postGroup);
    this.streetlights.push({ group: postGroup, bulb });
  }

  createTree(x, z) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, this.getGroundHeight(x, z), z);

    // Trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.35, 2.8, 8),
      this.materials.treeTrunk
    );
    trunk.position.y = 1.4;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Foliage canopy (layers of spheres/cones)
    const foliage = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 4.8, 8),
      this.materials.treeLeaves
    );
    foliage.position.y = 4.2;
    foliage.castShadow = true;
    treeGroup.add(foliage);

    this.worldGroup.add(treeGroup);
    this.trees.push(treeGroup);
  }

  spawnTraffic(count = 15) {
    const colors = [0xd63031, 0x0984e3, 0x00b894, 0xfdcb6e, 0x6c5ce7, 0x2d3436, 0xf5f6fa];

    for (let i = 0; i < count; i++) {
      const road = this.roads[Math.floor(Math.random() * this.roads.length)];
      if (!road) continue;

      const carGroup = new THREE.Group();
      const carColor = colors[Math.floor(Math.random() * colors.length)];
      const carMat = new THREE.MeshStandardMaterial({
        color: carColor,
        roughness: 0.3,
        metalness: 0.7
      });

      // Chassis
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 4.0), carMat);
      body.position.y = 0.55;
      body.castShadow = true;
      carGroup.add(body);

      // Cabin
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 2.2), this.materials.windowDark);
      cabin.position.set(0, 1.0, -0.2);
      carGroup.add(cabin);

      // Headlights & Taillights
      const hl = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), this.materials.lampBulb);
      hl.position.set(0, 0.55, 2.0);
      carGroup.add(hl);

      const tl = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.1, 0.1),
        new THREE.MeshBasicMaterial({ color: 0xff2222 })
      );
      tl.position.set(0, 0.55, -2.0);
      carGroup.add(tl);

      // Random position along the selected road
      const t = Math.random();
      const laneOffset = (Math.random() > 0.5 ? 1 : -1) * (road.width * 0.25);
      const perpX = Math.cos(road.angle) * laneOffset;
      const perpZ = -Math.sin(road.angle) * laneOffset;

      const posX = road.x1 + (road.x2 - road.x1) * t + perpX;
      const posZ = road.z1 + (road.z2 - road.z1) * t + perpZ;
      const posY = this.getGroundHeight(posX, posZ);

      carGroup.position.set(posX, posY, posZ);
      const isReverseLane = laneOffset < 0;
      carGroup.rotation.y = road.angle + (isReverseLane ? Math.PI : 0);

      this.worldGroup.add(carGroup);
      this.trafficCars.push({
        group: carGroup,
        speed: 12 + Math.random() * 14, // m/s (~45-90 km/h)
        road,
        progress: t,
        direction: isReverseLane ? -1 : 1,
        laneOffset
      });
    }
  }

  updateTraffic(dt) {
    this.trafficCars.forEach(car => {
      const road = car.road;
      const step = (car.speed * dt) / road.length;
      car.progress += step * car.direction;

      // Loop around road segment
      if (car.progress > 1.0) car.progress = 0;
      if (car.progress < 0) car.progress = 1.0;

      const perpX = Math.cos(road.angle) * car.laneOffset;
      const perpZ = -Math.sin(road.angle) * car.laneOffset;
      const x = road.x1 + (road.x2 - road.x1) * car.progress + perpX;
      const z = road.z1 + (road.z2 - road.z1) * car.progress + perpZ;
      const y = this.getGroundHeight(x, z);

      car.group.position.set(x, y, z);
    });
  }

  /**
   * Fetches real road networks from OpenStreetMap Overpass API
   */
  async loadOsmDestination(lat, lon, radius = 900) {
    const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json][timeout:15];(way["highway"](around:${radius},${lat},${lon}););out body geom;`;

    try {
      const resp = await fetch(overpassUrl);
      if (!resp.ok) throw new Error(`HTTP error: ${resp.status}`);
      const data = await resp.json();

      if (!data.elements || data.elements.length === 0) {
        throw new Error('No road data in this area');
      }

      this.clear();
      this.buildOsmWorld(data.elements, { lat, lon });
      this.isOsmLoaded = true;
      return true;
    } catch (err) {
      console.warn('OSM fetch failed or rate-limited; switching to procedural explorer:', err);
      this.buildProceduralWorld();
      return false;
    }
  }

  buildOsmWorld(elements, origin) {
    // 1. Terrain Base
    const groundGeo = new THREE.PlaneGeometry(3500, 3500);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMesh = new THREE.Mesh(groundGeo, this.materials.grass);
    groundMesh.receiveShadow = true;
    this.worldGroup.add(groundMesh);

    // Convert lat/lon coordinates to meters relative to origin
    const latRad = (origin.lat * Math.PI) / 180;
    const project = (lat, lon) => ({
      x: (lon - origin.lon) * 111320 * Math.cos(latRad),
      z: -(lat - origin.lat) * 111320
    });

    elements.forEach(el => {
      if (el.type === 'way' && el.geometry && el.geometry.length >= 2) {
        const highwayTag = el.tags?.highway || 'road';
        let roadWidth = 8;
        let lanes = 2;

        if (['motorway', 'trunk'].includes(highwayTag)) {
          roadWidth = 16;
          lanes = 4;
        } else if (['primary', 'secondary'].includes(highwayTag)) {
          roadWidth = 12;
          lanes = 2;
        } else if (['residential', 'service'].includes(highwayTag)) {
          roadWidth = 7;
          lanes = 2;
        }

        // Render each line segment of the way
        for (let i = 1; i < el.geometry.length; i++) {
          const p1 = project(el.geometry[i - 1].lat, el.geometry[i - 1].lon);
          const p2 = project(el.geometry[i].lat, el.geometry[i].lon);

          // Discard segments too far from center
          if (Math.hypot(p1.x, p1.z) < 1400 || Math.hypot(p2.x, p2.z) < 1400) {
            this.createRoadSegment(p1.x, p1.z, p2.x, p2.z, roadWidth, lanes, highwayTag);
          }
        }
      }
    });

    // Populate surrounding buildings and streetlights
    this.generateProceduralBuildings();
    this.generateRoadsideAmenities();
    this.spawnTraffic(12);
  }
}

window.WorldEngine = WorldEngine;
window.WORLD_DESTINATIONS = WORLD_DESTINATIONS;
