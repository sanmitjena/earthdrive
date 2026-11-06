# EarthDrive 3D — Real Roads & World Explorer

An open-world 3D driving simulator inspired by `hostevilnews.com/play` (EarthDrive), built with **Three.js**, procedural multi-vehicle physics, real-world OpenStreetMap cartography, synthesized Web Audio, and a cyber-glassmorphic HUD.

---

## 🎮 Play Live

👉 **Live Web App (GitHub Pages):** **[https://sanmitjena.github.io/earthdrive/](https://sanmitjena.github.io/earthdrive/)**

Or locally:
- Local Server: **[http://localhost:8080](http://localhost:8080)**
- Or open [`index.html`](file:///C:/Users/LENOVO/.gemini/antigravity/scratch/earthdrive/index.html) in your browser.

---

## 🚀 Key Features

### 1. Multiple Dynamic Vehicles
- **Apex GT Supercar**: High-speed aerodynamic sports car with drift physics, suspension pitch/roll, glowing LED headlights/taillights, and exhaust flame sparks.
- **Metro Cruiser Bus**: Long coach bus with passenger cabin, panoramic windows, heavier inertia, and realistic diesel engine acoustics.
- **Shinkansen Bullet Train**: Aerodynamic high-speed rail express with pantograph and long-range beam projector.
- **Supersonic Flight Jet**: Full 6-DOF aerial physics with elevator pitch, aileron banking roll, jet afterburners, and aerodynamic lift.

### 2. Global Real-World Maps & Seamless Procedural Worlds
- **Worldwide Destinations**:
  - 🇯🇵 Tokyo (Shibuya & Shinjuku)
  - 🇫🇷 Paris (Arc de Triomphe & Champs-Élysées)
  - 🇺🇸 San Francisco (Lombard St & steep bay hills)
  - 🇲🇨 Monaco (Grand Prix seaside hairpin circuit)
  - 🇯🇵 Mount Fuji (Hakone mountain touge)
  - 🇺🇸 New York (Manhattan grid & skyscrapers)
  - 🇮🇳 Mumbai (Marine Drive Queen's Necklace)
  - 🇨🇭 Swiss Alps (Stelvio Pass hairpins)
- **OpenStreetMap Overpass API**: Enter any city name or latitude, longitude coordinate to stream real-world road networks directly into 3D geometry!
- **Procedural City Generator**: Offline fallback with skyscrapers, animated civil traffic, streetlights, curbs, and road markings.

### 3. Procedural Web Audio Sound Synthesizer (0 External Audio Files)
- Multi-oscillator engine RPM tracking (idle, acceleration, redline growl).
- Turbo blow-off valve release on gear shifts.
- Dynamic tire screech sound when drifting or hard braking.
- Dual-tone horn on key `H`.
- Aerodynamic wind rush at speeds above 80 km/h.

### 4. Dynamic Lighting & Weather
- **Times of Day**: Bright Day, Golden Hour Sunset, Cyberpunk Night (with glowing streetlights and lit building windows), and Soft Dawn.
- **Weather Presets**: Clear Skies, 3D Rain Particle Storm with wet asphalt sheen, and Dense Fog / Mist.

### 5. Multi-Angle Cameras
- `C` to cycle between:
  - **Chase Cam**: Smooth spring-damped third-person view.
  - **Cockpit Cam**: Driver's seat perspective looking out past the steering wheel.
  - **Hood / Bumper Cam**: Adrenaline-fueled road-level camera.
  - **Drone Orbit Cam**: Cinematic 360° circular tracking.

---

## ⌨️ Controls

| Action | Keyboard | Touch / Mobile |
| :--- | :--- | :--- |
| **Accelerate** | `W` or `↑` | **GAS** Pedal |
| **Brake / Reverse** | `S` or `↓` | **BRAKE** Pedal |
| **Steering** | `A` / `D` or `←` / `→` | `◀` / `▶` Buttons |
| **Handbrake / Drift** | `SPACE` | `P` Handbrake |
| **Change Camera** | `C` | Camera button |
| **Car Horn** | `H` | 🎺 Horn button |
| **Headlights** | `L` | HUD Light pill |
| **Reset Vehicle** | `R` | — |

---

## 📁 Project Architecture

```
earthdrive/
├── index.html            # Main HTML with glassmorphic HUD & touch controls
├── styles.css            # Cyberpunk glassmorphic HUD, gauges, & animations
├── vendor/
│   └── three.min.js      # Three.js 3D WebGL engine
├── js/
│   ├── audio.js          # Web Audio procedural sound engine
│   ├── vehicles.js       # 3D procedural vehicle builders (Car, Bus, Train, Jet)
│   ├── physics.js        # Vehicle dynamics, drift slip, transmission, 6-DOF flight
│   ├── world.js          # OSM Overpass loader, procedural city & AI traffic
│   ├── weather.js        # Dynamic lighting, sun/moon shadows, rain particles
│   ├── minimap.js        # 2D Canvas tactical radar & compass
│   └── app.js            # Main loop, cameras, input, and HUD updates
└── README.md
```
