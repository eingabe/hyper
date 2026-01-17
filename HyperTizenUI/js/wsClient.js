let client;
const PORTS = [8090, 8096];
const IP_BASE = '192.168.0.';
let isScanning = false;

// UI Elemente umschalten
function showManualInput() {
    document.getElementById('status').innerHTML = 'Kein Gerät automatisch gefunden.';
    document.getElementById('manualDiscovery').style.display = 'block';
}

async function startSmartScan() {
    if (isScanning) return;
    isScanning = true;
    document.getElementById('status').innerHTML = 'Scanne Netzwerk (192.168.0.x)...';
    
    let foundAny = false;

    // Wir scannen in 10er Schritten, um den TV-Prozessor nicht zu blockieren
    for (let i = 1; i <= 254; i++) {
        const ip = IP_BASE + i;
        
        // Beide Ports gleichzeitig prüfen
        const promises = PORTS.map(port => checkDevice(ip, port));
        
        const results = await Promise.all(promises);
        if (results.some(r => r === true)) {
            foundAny = true;
            // Wir stoppen nicht zwingend beim ersten, damit die Liste voll wird
        }

        // Fortschrittsanzeige
        if (i % 25 === 0) {
            document.getElementById('status').innerHTML = `Scanning... ${Math.round((i/254)*100)}%`;
        }
    }

    isScanning = false;
    if (!foundAny) {
        showManualInput();
    }
}

function checkDevice(ip, port) {
    return new Promise((resolve) => {
        const testSocket = new WebSocket(`ws://${ip}:${port}`);
        
        // Timeout nach 1,5 Sekunden, falls der Port "hängt"
        const timer = setTimeout(() => {
            testSocket.close();
            resolve(false);
        }, 1500);

        testSocket.onopen = () => {
            clearTimeout(timer);
            addDeviceToList(ip, port);
            testSocket.close();
            resolve(true);
        };

        testSocket.onerror = () => {
            clearTimeout(timer);
            resolve(false);
        };
    });
}

function addDeviceToList(ip, port) {
    const url = `ws://${ip}:${port}`;
    const container = document.getElementById('ssdpItems');
    
    // Duplikate vermeiden
    if (document.querySelector(`[data-uri="${url}"]`)) return;

    const html = `
        <div class="ssdpItem" data-uri="${url}" tabindex="0" onclick="setRPC('${url}')">
            <a>Gefunden: ${ip} (Port ${port})</a>
        </div>
    `;
    container.innerHTML += html;
}

// Manuelle Eingabe Funktion
window.manualConnect = () => {
    const customIP = document.getElementById('manualIP').value;
    const customPort = document.getElementById('manualPort').value || '8090';
    if(customIP) {
        setRPC(`ws://${customIP}:${customPort}`);
    }
}
