let client;
let deviceIP;
const ssdpDevices = [];
let canEnable = false;

const events = {
    SetConfig: 0,
    ReadConfig: 1,
    ReadConfigResult: 2,
    ScanSSDP: 3,
    SSDPScanResult: 4
};

function open() {
    if (!deviceIP) {
        console.error("Keine Device-IP vorhanden, WebSocket kann nicht geöffnet werden.");
        return;
    }
    
    // Verbindung zum lokalen HyperTizen-Dienst auf dem TV
    client = new WebSocket(`ws://${deviceIP}:8086`);
    
    client.onopen = onOpen;
    client.onmessage = onMessage;
    
    client.onerror = (err) => {
        console.error("Backend WebSocket Fehler:", err);
        document.getElementById('status').innerHTML = '<span style="color:red">Backend nicht erreichbar!</span>';
        // KEIN location.reload() hier, um Boot-Loops zu vermeiden
    };
}

function send(json) {
    if (client && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(json));
    }
}

function onOpen() {
    document.getElementById('status').innerHTML = 'Verbunden mit lokalem Dienst';
    
    document.getElementById('enabled').onchange = (e) => {
        if (!canEnable) {
            alert('Bitte wähle zuerst einen Hyperion-Server aus!');
            e.target.checked = false;
            return;
        }
        send({ event: events.SetConfig, key: 'enabled', value: e.target.checked.toString() });
    };

    // Aktuelle Konfiguration vom Backend abfragen
    send({ event: events.ReadConfig, key: 'rpcServer' });
    send({ event: events.ReadConfig, key: 'enabled' });
    
    // Standard-SSDP Scan anstoßen
    send({ event: events.ScanSSDP });
}

function onMessage(data) {
    const msg = JSON.parse(data.data);
    switch(msg.Event) {
        case events.ReadConfigResult:
            if(msg.key === 'rpcServer' && !msg.error) {
                canEnable = true;
                document.getElementById('ssdpDeviceTitle').innerText = `Aktiv: ${msg.value}`;
            } else if(msg.key === 'enabled' && !msg.error) {
                document.getElementById('enabled').checked = msg.value === 'true';
            }
            break;
            
        case events.SSDPScanResult:
            // Verarbeite Geräte, die das Backend per SSDP gefunden hat
            if (msg.devices) {
                for (const device of msg.devices) {
                    const url = device.UrlBase.indexOf('https') === 0 ? 
                                device.UrlBase.replace('https', 'wss') : 
                                device.UrlBase.replace('http', 'ws');
                    addDeviceToList(url, device.FriendlyName);
                }
            }
            break;
    }
}

// Hilfsfunktion, um Geräte in die Liste einzutragen (wird auch vom Smart-Scan genutzt)
function addDeviceToList(url, name) {
    if (ssdpDevices.some(d => d.url === url)) return;

    const container = document.getElementById('ssdpItems');
    const div = document.createElement('div');
    div.className = 'ssdpItem';
    div.setAttribute('data-uri', url);
    div.setAttribute('tabindex', '0');
    div.innerHTML = `<a>${name} (${url})</a>`;
    
    // Klick-Event für die Auswahl
    div.onclick = () => setRPC(url);
    
    container.appendChild(div);
    ssdpDevices.push({ url, name });
}

window.setRPC = (url) => {
    canEnable = true;
    send({ event: events.SetConfig, key: 'rpcServer', value: url });
    document.getElementById('ssdpDeviceTitle').innerText = `Verbunden mit: ${url}`;
    alert("Server gespeichert!");
};
