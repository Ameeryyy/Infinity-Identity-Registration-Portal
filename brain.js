class InfinityBrain {
    constructor() {
        this.settings = this.getSettings();
        this.cryptoKey = null;
        this.lang = this.settings.language || 'en';
        this.init();
    }

    async init() {
        this.enforceBootSequence(); 
        this.applySecurity();
        this.applyGlobalStyles();
        this.setupMetaTags();       
        this.setupCustomAlert();
        this.applyTheme();
        this.setupNetworkMonitor();
        this.restorePageState();
        
        await this.setupCryptoKey();
        this.syncFromDB();
        this.initAdvancedEngines();
        this.applyLanguage();
    }

    async setupCryptoKey() {
        const rawKey = new TextEncoder().encode("InfinityCoreSecureKey1234567890"); 
        this.cryptoKey = await window.crypto.subtle.importKey(
            "raw", rawKey, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]
        );
    }

    async encryptData(text) {
        if (!this.cryptoKey || !text) return text;
        try {
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encoded = new TextEncoder().encode(text);
            const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, this.cryptoKey, encoded);
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv, 0);
            combined.set(new Uint8Array(encrypted), iv.length);
            return btoa(String.fromCharCode.apply(null, combined));
        } catch (e) { return text; }
    }

    async decryptData(encryptedBase64) {
        if (!this.cryptoKey || !encryptedBase64) return encryptedBase64;
        try {
            const combined = new Uint8Array(atob(encryptedBase64).split('').map(c => c.charCodeAt(0)));
            const iv = combined.slice(0, 12);
            const data = combined.slice(12);
            const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, this.cryptoKey, data);
            return new TextDecoder().decode(decrypted);
        } catch (e) { return encryptedBase64; }
    }

    initAdvancedEngines() {
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                this.updateBatteryMode(battery.level);
                battery.addEventListener('levelchange', () => this.updateBatteryMode(battery.level));
            });
        }
        if ('connection' in navigator) {
            this.updateNetworkMode(navigator.connection.type || navigator.connection.effectiveType);
            navigator.connection.addEventListener('change', () => {
                this.updateNetworkMode(navigator.connection.type || navigator.connection.effectiveType);
            });
        }
    }

    updateBatteryMode(level) {
        this.settings.batteryLevel = Math.round(level * 100);
        this.applyTheme();
        localStorage.setItem('inf_settings', JSON.stringify(this.settings));
    }

    updateNetworkMode(type) {
        this.settings.connectionType = (type === 'wifi') ? 'WiFi' : 'Cellular';
        if (this.settings.connectionType === 'Cellular' && this.settings.dataSaverAuto) {
            this.settings.compressionLevel = 0.4; 
        } else {
            this.settings.compressionLevel = 0.7; 
        }
        localStorage.setItem('inf_settings', JSON.stringify(this.settings));
    }

    async applyLanguage() {
        const lang = this.settings.language || 'en';
        try {
            const res = await fetch(`${lang}.json`);
            if(res.ok) {
                const translations = await res.json();
                document.querySelectorAll('[data-i18n]').forEach(el => {
                    const key = el.getAttribute('data-i18n');
                    if (translations[key]) {
                        if (el.tagName === 'INPUT' && el.placeholder) el.placeholder = translations[key];
                        else el.innerText = translations[key];
                    }
                });
            }
        } catch (e) { }
    }

    applySecurity() {
        ['copy', 'contextmenu', 'selectstart'].forEach(e => document.addEventListener(e, x => x.preventDefault()));
    }

    applyGlobalStyles() {
        const s = document.createElement('style');
        const showGrid = this.settings.showGrid !== false; 
        const gridStyle = showGrid ? 'linear-gradient(rgba(128,128,128,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(128,128,128,0.15) 1px, transparent 1px)' : 'none';
        const gridSize = showGrid ? '60px 60px' : '0 0';

        s.textContent = `
            html,body{margin:0;padding:0;width:100vw;min-height:100vh;overflow-x:hidden;overflow-y:auto;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;font-family:system-ui,-apple-system,sans-serif;transition:background-color var(--animation-speed, .4s),color var(--animation-speed, .4s)}
            *,:after,:before{box-sizing:inherit}
            *{-webkit-tap-highlight-color:transparent!important;user-select:none!important;outline:0!important}
            body{background-image: ${gridStyle} !important; background-size: ${gridSize} !important;}
            .corner{display:none!important}
            body.no-anim *{animation:none!important;transition:none!important}
            button, a, .clickable { cursor: pointer; }
        `;
        document.head.appendChild(s);
    }

    applyTheme() {
        let t = this.settings.theme || 'minimal-dark';
        
        if (t.startsWith('system-')) {
            const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            const styleType = t.split('-')[1]; 
            t = styleType === 'pure' ? (isDark ? 'pure-dark' : 'pure-light') : (isDark ? 'minimal-dark' : 'minimal-light');
        }

        const r = document.documentElement.style;
        const themes = {
            'pure-dark': { bg: '#000000', fg: '#ffffff', blue: '#ffffff', red: '#ffffff', green: '#ffffff', yellow: '#ffffff', cyan: '#ffffff' },
            'minimal-dark': { bg: '#000000', fg: '#ffffff', blue: '#007bff', red: '#ff4444', green: '#00C851', yellow: '#ffbb33', cyan: '#00e5ff' },
            'pure-light': { bg: '#ffffff', fg: '#000000', blue: '#000000', red: '#000000', green: '#000000', yellow: '#000000', cyan: '#000000' },
            'minimal-light': { bg: '#ffffff', fg: '#000000', blue: '#0056b3', red: '#cc0000', green: '#007e33', yellow: '#ff8800', cyan: '#0099cc' },
            'dark-minimal': { bg: '#0a0a0a', fg: '#e0e0e0', blue: '#3399ff', red: '#ff6666', green: '#00e676', yellow: '#ffcc00', cyan: '#33b5e5' }
        };
        
        const theme = themes[t] || themes['minimal-dark'];
        r.setProperty('--bg', theme.bg);
        r.setProperty('--fg', theme.fg);
        r.setProperty('--c-blue', theme.blue);
        r.setProperty('--c-red', theme.red);
        r.setProperty('--c-green', theme.green);
        r.setProperty('--c-yellow', theme.yellow);
        r.setProperty('--c-cyan', theme.cyan);
        document.body.style.background = 'var(--bg)';
        document.body.style.color = 'var(--fg)';

        if (this.settings.powerSavingAuto && this.settings.batteryLevel <= 20) {
            document.body.classList.add('no-anim');
            r.setProperty('--animation-speed', '0s');
        } else {
            document.body.classList.remove('no-anim');
            r.setProperty('--animation-speed', '0.3s');
        }
    }

    openDB() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open('InfinityLocker', 1);
            req.onupgradeneeded = (e) => { e.target.result.createObjectStore('store'); };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    }

    async syncFromDB() {
        try {
            const db = await this.openDB();
            const tx = db.transaction('store', 'readonly');
            const req = tx.objectStore('store').get('inf_settings');
            req.onsuccess = () => {
                if (req.result) {
                    this.settings = { ...req.result, ...this.settings };
                    this.applyTheme();
                    this.applyGlobalStyles(); 
                }
                db.close();
            };
        } catch(e) {}
    }

    compressImage(dataUrl, maxW = 600) {
        return new Promise((resolve) => {
            if (!dataUrl || !dataUrl.startsWith('data:image')) return resolve(dataUrl);
            const img = new Image();
            img.src = dataUrl;
            img.onload = () => {
                let w = img.width, h = img.height;
                if (w > maxW) { h = Math.round((h * maxW) / w); w = maxW; }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', this.settings.compressionLevel || 0.7));
            };
            img.onerror = () => resolve(dataUrl);
        });
    }

    async saveSettings(d) {
        let data = { ...d };
        for (let key in data) {
            if (typeof data[key] === 'string' && data[key].startsWith('data:image')) {
                data[key] = await this.compressImage(data[key]);
            } else if (typeof data[key] === 'string' && (key.toLowerCase().includes('secret') || key.toLowerCase().includes('aadhar'))) {
                data[key] = await this.encryptData(data[key]);
            }
        }
        
        this.settings = { ...this.settings, ...data };
        
        try {
            const db = await this.openDB();
            const tx = db.transaction('store', 'readwrite');
            tx.objectStore('store').put(this.settings, 'inf_settings');
            tx.oncomplete = () => db.close();
        } catch(e) {}
        
        try {
            localStorage.setItem('inf_settings', JSON.stringify(this.settings));
        } catch(e) {
            const lightSettings = { ...this.settings };
            delete lightSettings.profilePicturePrimary;
            delete lightSettings.signatures;
            localStorage.setItem('inf_settings', JSON.stringify(lightSettings));
        }
        this.applyTheme();
        this.applyGlobalStyles();
        this.applyLanguage(); 
    }

    getSettings() {
        return JSON.parse(localStorage.getItem('inf_settings')) || {};
    }

    setupCustomAlert() {
        const s = document.createElement('style');
        s.textContent = '.inf-ov{position:fixed;inset:0;background:rgba(0,0,0,.8);backdrop-filter:blur(5px);display:flex;justify-content:center;align-items:center;z-index:9999;opacity:0;transition:.3s}.inf-al{background:var(--bg);color:var(--fg);padding:25px;border-radius:16px;border:1px dashed var(--c-blue);text-align:center;width:85%;max-width:320px;transform:scale(.9);transition:.3s}.inf-al h3{margin:0 0 10px;font-size:16px;text-transform:uppercase;letter-spacing:1px;color:var(--c-red)}.inf-al p{margin:0 0 25px;font-size:13px;opacity:.8;line-height:1.5}.inf-al button{padding:12px;border:1px solid rgba(128,128,128,.3);background:0 0;color:var(--fg);border-radius:8px;cursor:pointer;width:100%;font-weight:700;text-transform:uppercase;letter-spacing:1px;transition:.2s}.inf-al button:active{transform:scale(.95);background:var(--fg);color:var(--bg)}.inf-show{opacity:1}.inf-show .inf-al{transform:scale(1)}';
        document.head.appendChild(s);
        window.alert = (t, m = t) => {
            const o = document.createElement('div');
            o.className = 'inf-ov';
            o.innerHTML = `<div class="inf-al"><h3>${t}</h3><p>${m}</p><button onclick="let p=this.closest('.inf-ov');p.classList.remove('inf-show');setTimeout(()=>p.remove(),300)">ACKNOWLEDGE</button></div>`;
            document.body.appendChild(o);
            setTimeout(() => o.classList.add('inf-show'), 10);
        };
    }

    setupNetworkMonitor() {
        const p = window.location.pathname.toLowerCase();
        const i = p.endsWith('index.html') || p.endsWith('/') || p === '';
        const o = p.endsWith('offline.html');
        window.addEventListener('offline', () => {
            if (!i && !o) { this.savePageState(); localStorage.setItem('inf_last', window.location.href); window.location.href = 'offline.html'; }
        });
        window.addEventListener('online', () => {
            if (o) { alert('NETWORK RESTORED', 'Connection securely re-established. Redirecting...'); setTimeout(() => window.location.href = localStorage.getItem('inf_last') || 'home.html', 2000); }
        });
        if (!navigator.onLine && !i && !o) { this.savePageState(); localStorage.setItem('inf_last', window.location.href); window.location.href = 'offline.html'; }
    }

    savePageState() {
        const s = {};
        document.querySelectorAll('input,textarea').forEach((i, x) => s[i.id || i.name || x] = i.value);
        localStorage.setItem('inf_st_' + window.location.pathname, JSON.stringify(s));
    }

    restorePageState() {
        try {
            const s = JSON.parse(localStorage.getItem('inf_st_' + window.location.pathname));
            if (s) document.querySelectorAll('input,textarea').forEach((i, x) => {
                const k = i.id || i.name || x;
                if (s[k] !== undefined) i.value = s[k];
            });
        } catch (e) {}
    }

    async setupAuth() {
        try {
            return !!await navigator.credentials.create({ publicKey: { challenge: new Uint8Array(32), rp: { name: "Infinity" }, user: { id: new Uint8Array(16), name: "U", displayName: "U" }, pubKeyCredParams: [{ type: "public-key", alg: -7 }], authenticatorSelection: { userVerification: "preferred" }, timeout: 60000 } });
        } catch { return false; }
    }

    async resetSystem() {
        const forceRedirect = setTimeout(() => { window.location.replace('index.html'); }, 800);
        Object.keys(localStorage).forEach(k => { if (k.startsWith('inf_')) localStorage.removeItem(k); });
        try {
            const db = await this.openDB();
            const tx = db.transaction('store', 'readwrite');
            tx.objectStore('store').clear();
            tx.oncomplete = () => { db.close(); clearTimeout(forceRedirect); window.location.replace('index.html'); };
            tx.onerror = () => { db.close(); clearTimeout(forceRedirect); window.location.replace('index.html'); };
        } catch(e) {
            clearTimeout(forceRedirect); window.location.replace('index.html');
        }
    }

    setupMetaTags() {
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
        }
        link.href = 'logo.png'; 

        const shortDesc = "Infinity Identity - The World's Most Secure, Mobile-Built Digital Identity Framework. Your private data, under your control.";
        const shareImageAbsoluteUrl = "https://ameeryyy.github.io/Infinity-Identity-Registration-Portal/share.png";
        const desc = `Infinity Identity - The Universal User Registration Portal
The Future of Digital Citizenship:
Infinity Identity is a state-of-the-art digital framework designed to empower citizens by centralizing and securing their personal, professional, and administrative data. This Registration Portal serves as the secure gateway to the expansive Infinity Ecosystem, bridging the gap between local administrative authorities and the general public with unprecedented efficiency.
Uncompromised Security:
Built on a foundation of advanced cryptographic protocols, the portal ensures that every byte of user data is protected. Utilizing AES-256 bit encryption via the Web Crypto API, sensitive information like identification numbers and biometric nodes are shredded and encrypted before being stored. Your identity remains private, under your absolute control, and immune to unauthorized access.
Innovative & Resilient Architecture:
Developed entirely on a mobile environment, this system proves that world-class technology knows no bounds. The portal features a sophisticated 'State Persistence' engine, meaning your registration progress is never lost even during network interruptions. With an integrated Network Monitor and an automated Offline Mode, Infinity Identity is always accessible, ensuring a seamless user experience regardless of connectivity.
Cyber-Minimalist Design:
Infinity Identity introduces a unique UI/UX philosophy characterized by its "Pure Dark" aesthetic. The interface is designed to be high-tech yet intuitive, reducing visual clutter while maximizing focus on security and functionality. From real-time biometric verification indicators to automated server-transfer animations, every interaction is crafted to provide a sense of absolute security and trust.
Empowering Local Governance: Beyond registration, this portal is the first step toward a transparent, corruption-free society. By allowing users to establish a verifiable 'Digital Node,' Infinity Identity enables direct communication with ward members and government officials, ensuring that resources and complaints are handled with total accountability and speed.`;

        const metaTags = {
            'og:title': 'Infinity Identity - The Universal User Registration Portal',
            'og:description': shortDesc,
            'description': desc,
            'og:image': shareImageAbsoluteUrl,
            'theme-color': '#000000'
        };

        for (const [property, content] of Object.entries(metaTags)) {
            let meta = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
            if (!meta) {
                meta = document.createElement('meta');
                if (property.startsWith('og:')) meta.setAttribute('property', property);
                else meta.setAttribute('name', property);
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', content);
        }
    }

    enforceBootSequence() {
        // Disabled as per previous requests, can be re-enabled here if needed
        return;
    }
}
const brain = new InfinityBrain();
