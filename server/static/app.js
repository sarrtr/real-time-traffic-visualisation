let scene, camera, renderer, controls, globe;
const points = new Map();
const ACTIVE_DURATION = 10000; // 10 seconds
const GLOBE_RADIUS = 100;

class DataPoint {
    constructor(lat, lon, ip, suspicious) {
        this.lat = lat;
        this.lon = lon;
        this.ip = ip;
        this.suspicious = suspicious;
        this.mesh = this.createMesh();
        this.createdAt = Date.now();
    }

    createMesh() {
        const geometry = new THREE.SphereGeometry(0.5, 8, 8);
        const material = new THREE.MeshBasicMaterial({
            color: this.suspicious > 0 ? 0xff0000 : 0x00ff00
        });
        const mesh = new THREE.Mesh(geometry, material);
        
        // Convert lat/lon to 3D position
        const phi = (90 - this.lat) * (Math.PI / 180);
        const theta = (this.lon + 180) * (Math.PI / 180);
        
        mesh.position.set(
            -GLOBE_RADIUS * Math.sin(phi) * Math.cos(theta),
            GLOBE_RADIUS * Math.cos(phi),
            GLOBE_RADIUS * Math.sin(phi) * Math.sin(theta)
        );
        
        return mesh;
    }
}

function init() {
    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    camera.position.z = 300;

    // Create globe
    const globeGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 32, 32);
    const globeMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a237e,
        transparent: true,
        opacity: 0.8
    });
    globe = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globe);
    addCountryContours();

    // Add ambient light
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(100, 100, 300);
    scene.add(light);

    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
}

function addCountryContours() {
    // Load GeoJSON data for country boundaries.
    fetch('/static/countries.geo.json')
        .then(response => response.json())
        .then(geoData => {
            const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.6, transparent: true });
            geoData.features.forEach(feature => {
                const { type, coordinates } = feature.geometry;
                if (type === 'Polygon') {
                    // A Polygon may consist of several rings.
                    coordinates.forEach(polygon => {
                        const points = polygon.map(coord => {
                            const [lon, lat] = coord;
                            const phi = (90 - lat) * (Math.PI / 180);
                            const theta = (lon + 180) * (Math.PI / 180);
                            return new THREE.Vector3(
                                -GLOBE_RADIUS * Math.sin(phi) * Math.cos(theta),
                                GLOBE_RADIUS * Math.cos(phi),
                                GLOBE_RADIUS * Math.sin(phi) * Math.sin(theta)
                            );
                        });
                        const geometry = new THREE.BufferGeometry().setFromPoints(points);
                        const line = new THREE.Line(geometry, lineMaterial);
                        scene.add(line);
                    });
                } else if (type === 'MultiPolygon') {
                    // Loop through each polygon in MultiPolygon.
                    coordinates.forEach(multi => {
                        multi.forEach(polygon => {
                            const points = polygon.map(coord => {
                                const [lon, lat] = coord;
                                const phi = (90 - lat) * (Math.PI / 180);
                                const theta = (lon + 180) * (Math.PI / 180);
                                return new THREE.Vector3(
                                    -GLOBE_RADIUS * Math.sin(phi) * Math.cos(theta),
                                    GLOBE_RADIUS * Math.cos(phi),
                                    GLOBE_RADIUS * Math.sin(phi) * Math.sin(theta)
                                );
                            });
                            const geometry = new THREE.BufferGeometry().setFromPoints(points);
                            const line = new THREE.Line(geometry, lineMaterial);
                            scene.add(line);
                        });
                    });
                }
            });
        })
        .catch(error => {
            console.error('Error loading country boundaries:', error);
        });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects([...points.values()].map(p => p.mesh));
    
    const tooltip = document.getElementById('tooltip');
    if (intersects.length > 0) {
        const point = intersects[0].object.userData;
        tooltip.style.display = 'block';
        tooltip.style.left = `${event.clientX + 15}px`;
        tooltip.style.top = `${event.clientY}px`;
        tooltip.innerHTML = `IP: ${point.ip}<br>
                            Location: ${point.lat.toFixed(2)}, ${point.lon.toFixed(2)}<br>
                            Suspicious: ${point.suspicious}`;
    } else {
        tooltip.style.display = 'none';
    }
}

function updateCommonLocations(data) {
    const counts = data.reduce((acc, point) => {
        const key = `${point.lat.toFixed(2)}, ${point.lon.toFixed(2)}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    document.getElementById('common-locations').innerHTML = `
        <h4>Most Active Locations:</h4>
        ${sorted.map(([loc, count]) => `
            <div>${loc} (${count} hits)</div>
        `).join('')}
    `;
}

async function fetchData() {
    try {
        const response = await fetch('/api/data');
        const data = await response.json();
        const showSuspicious = document.getElementById('suspicious-toggle').checked;

        // Update points
        const now = Date.now();
        data.forEach(point => {
            const key = `${point.lat},${point.lon}`;
            if (!points.has(key) && (!point.suspicious || showSuspicious)) {
                const dataPoint = new DataPoint(
                    parseFloat(point.lat),
                    parseFloat(point.lon),
                    point.ip,
                    point.suspicious
                );
                dataPoint.mesh.userData = point;
                scene.add(dataPoint.mesh);
                points.set(key, dataPoint);
            }
        });

        // Remove old points
        points.forEach((value, key) => {
            if (now - value.createdAt > ACTIVE_DURATION) {
                scene.remove(value.mesh);
                points.delete(key);
            }
        });

        updateCommonLocations(data);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    // Rotate globe
    globe.rotation.y += 0.0005;
    
    renderer.render(scene, camera);
}

// Initialize and start
init();
animate();
setInterval(fetchData, 1000);
fetchData();