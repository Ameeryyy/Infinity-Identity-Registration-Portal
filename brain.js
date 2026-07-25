const SESSION_STATE_PREFIX = 'inf_page_state';
let brainPageStateSyncAttached = false;

function saveSessionData(key, value) {
    if (!key || !window.sessionStorage) return null;

    if (value === undefined || value === null) {
        window.sessionStorage.removeItem(key);
        return null;
    }

    const payload = typeof value === 'string' ? value : JSON.stringify(value);
    window.sessionStorage.setItem(key, payload);
    window.dispatchEvent(new CustomEvent('brainSessionDataUpdated', { detail: { key, value } }));
    return payload;
}

function getSessionData(key, fallback = null) {
    if (!key || !window.sessionStorage) return fallback;

    const rawValue = window.sessionStorage.getItem(key);
    if (rawValue === null) return fallback;

    try {
        return JSON.parse(rawValue);
    } catch (error) {
        return rawValue;
    }
}

function clearSessionData(keys) {
    if (!window.sessionStorage) return;

    if (!keys) {
        window.sessionStorage.clear();
        window.dispatchEvent(new CustomEvent('brainSessionDataUpdated', { detail: { action: 'clear-all' } }));
        return;
    }

    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.forEach((key) => {
        if (key) window.sessionStorage.removeItem(key);
    });

    window.dispatchEvent(new CustomEvent('brainSessionDataUpdated', { detail: { action: 'clear', keys: keyList } }));
}

function getPageStateKey(pageName = window.location.pathname.split('/').pop() || 'default') {
    return `${SESSION_STATE_PREFIX}:${pageName}`;
}

function syncPageState(pageName = window.location.pathname.split('/').pop() || 'default') {
    if (!document || !window.sessionStorage) return {};

    const state = {};
    const elements = document.querySelectorAll('input, select, textarea');

    elements.forEach((element) => {
        const key = element.getAttribute('data-session-key') || element.name || element.id;
        if (!key) return;

        if (element.type === 'checkbox' || element.type === 'radio') {
            state[key] = element.checked;
        } else if (element.type !== 'file') {
            state[key] = element.value;
        }
    });

    saveSessionData(getPageStateKey(pageName), state);
    return state;
}

function restorePageState(pageName = window.location.pathname.split('/').pop() || 'default') {
    if (!document) return {};

    const state = getSessionData(getPageStateKey(pageName), {});
    if (!state || typeof state !== 'object') return {};

    Object.entries(state).forEach(([key, value]) => {
        const target = document.querySelector(`[name="${key}"]`) || document.getElementById(key);
        if (!target) return;

        if (target.type === 'checkbox' || target.type === 'radio') {
            target.checked = Boolean(value);
        } else if (target.type !== 'file') {
            target.value = value ?? '';
        }
    });

    return state;
}

function autoSyncPageState(pageName = window.location.pathname.split('/').pop() || 'default') {
    if (brainPageStateSyncAttached) return;

    brainPageStateSyncAttached = true;

    restorePageState(pageName);

    const syncState = () => syncPageState(pageName);

    document.addEventListener('input', syncState, true);
    document.addEventListener('change', syncState, true);
    window.addEventListener('beforeunload', syncState);
    window.addEventListener('pagehide', syncState);
}

window.saveSessionData = saveSessionData;
window.getSessionData = getSessionData;
window.clearSessionData = clearSessionData;
window.syncPageState = syncPageState;
window.restorePageState = restorePageState;
window.autoSyncPageState = autoSyncPageState;
window.getPageStateKey = getPageStateKey;

const globalStyle = document.createElement('style');
globalStyle.innerHTML = `
    *:not(input):not(textarea) {
        -webkit-tap-highlight-color: transparent !important;
        outline: none !important;
        user-select: none !important;
        -webkit-user-select: none !important;
    }
`;
document.head.appendChild(globalStyle);

const themeStyle = document.createElement('style');
document.head.appendChild(themeStyle);

function applyGlobalTheme() {
    const theme = localStorage.getItem('inf_theme') || 'dark';
    if (theme === 'dark') {
        themeStyle.innerHTML = `:root { --bg: #000000 !important; --fg: #ffffff !important; --c-blue: #007bff !important; --c-red: #ff4444 !important; --c-green: #00C851 !important; --c-yellow: #ffbb33 !important; --c-cyan: #00e5ff !important; }`;
    } else if (theme === 'light') {
        themeStyle.innerHTML = `:root { --bg: #ffffff !important; --fg: #000000 !important; --c-blue: #0056b3 !important; --c-red: #cc0000 !important; --c-green: #007e33 !important; --c-yellow: #ff8800 !important; --c-cyan: #0099cc !important; }`;
    } else {
        themeStyle.innerHTML = ``;
    }
}
applyGlobalTheme();
window.addEventListener('themeChanged', applyGlobalTheme);
window.addEventListener('storage', (e) => {
    if(e.key === 'inf_theme') applyGlobalTheme();
});

document.addEventListener("contextmenu", function(e) {
    e.preventDefault();
});

document.addEventListener("copy", function(e) {
    e.preventDefault();
});

window.setGlobalTheme = function(theme) {
    localStorage.setItem('inf_theme', theme);
    applyGlobalTheme();
    window.dispatchEvent(new Event('themeChanged'));
};

const currentPage = window.location.pathname.split("/").pop();

if (currentPage !== "index.html" && currentPage !== "offline.html" && currentPage !== "") {
    
    const popupStyle = document.createElement('style');
    popupStyle.innerHTML = `
        #brainOfflinePopup {
            position: fixed; top: 0; left: 0; width: 100vw; height: 100dvh;
            background-color: #000000; z-index: 9999999;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            opacity: 0; visibility: hidden; transition: opacity 0.5s ease-in-out, visibility 0.5s ease-in-out, background-color 0.5s ease, color 0.5s ease;
            font-family: system-ui, -apple-system, sans-serif;
            color: #ffffff; text-align: center;
        }
        #brainOfflinePopup.show {
            opacity: 1; visibility: visible; pointer-events: auto;
        }
        .brain-off-icon { margin-bottom: 20px; opacity: 0.8; animation: brainPulse 2s infinite; }
        .brain-off-icon svg { width: 64px; height: 64px; transition: fill 0.5s ease; fill: #ff4444; }
        .brain-off-text { font-size: 24px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; transition: color 0.5s ease; color: #ff4444; }
        .brain-sub-text { font-size: 11px; opacity: 0.6; margin-bottom: 40px; letter-spacing: 1px; text-transform: uppercase; max-width: 250px; line-height: 1.5; transition: color 0.5s ease; }
        .brain-btn {
            width: 90%; max-width: 260px; padding: 16px 14px;
            background: transparent; border: 2px solid; border-radius: 12px; cursor: pointer;
            font-size: 12px; font-weight: bold; transition: all 0.3s ease; text-transform: uppercase;
            letter-spacing: 2px; margin-bottom: 15px; display: flex; justify-content: center; align-items: center;
        }
        
        /* Check Connection Button Styles */
        .brain-btn-blue { border-color: #007bff; color: #007bff; }
        .brain-btn-blue:hover:not(.active-yellow):not(.active-green):not(.active-red) { background: #007bff; color: #ffffff; box-shadow: 0 5px 15px rgba(0, 123, 255, 0.4); }
        .brain-btn-blue.active-yellow { background: #ffbb33 !important; border-color: #ffbb33 !important; color: #000000 !important; }
        .brain-btn-blue.active-green { background: #00C851 !important; border-color: #00C851 !important; color: #000000 !important; }
        .brain-btn-blue.active-red { background: #ff4444 !important; border-color: #ff4444 !important; color: #000000 !important; }
        
        /* Go To Offline Page Button Styles */
        .brain-btn-white { background: #ffffff; border-color: #ffffff; color: #000000; }
        .brain-btn-white:hover { background: #007bff !important; border-color: #007bff !important; color: #ffffff !important; box-shadow: 0 5px 15px rgba(0, 123, 255, 0.4); }
        
        .brain-btn:active { transform: scale(0.95); }
        .brain-wave-dots { display: inline-block; margin-left: 2px; }
        .brain-wave-dots span { display: inline-block; animation: brainWave 1.2s infinite ease-in-out; }
        .brain-wave-dots span:nth-child(1) { animation-delay: 0s; }
        .brain-wave-dots span:nth-child(2) { animation-delay: 0.2s; }
        .brain-wave-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes brainWave { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes brainPulse { 0% { opacity: 0.5; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1); } 100% { opacity: 0.5; transform: scale(0.95); } }
    `;
    document.head.appendChild(popupStyle);

    let popupDiv;

    window.initBrainPopup = function() {
        if (document.getElementById('brainOfflinePopup')) return;
        popupDiv = document.createElement('div');
        popupDiv.id = 'brainOfflinePopup';
        popupDiv.innerHTML = `
            <div class="brain-off-icon">
                <svg id="brainNetIcon" viewBox="0 0 24 24">
                    <path d="M21,16.5C21,16.88 20.79,17.21 20.47,17.38L12.57,21.82C12.41,21.94 12.21,22 12,22C11.79,22 11.59,21.94 11.43,21.82L3.53,17.38C3.21,17.21 3,16.88 3,16.5V7.5C3,7.12 3.21,6.79 3.53,6.62L11.43,2.18C11.59,2.06 11.79,2 12,2C12.21,2 12.41,2.06 12.57,2.18L20.47,6.62C20.79,6.79 21,7.12 21,7.5V16.5M12,4.15L5,8.09V15.91L12,19.85L19,15.91V8.09L12,4.15M12,10.5C11.17,10.5 10.5,11.17 10.5,12C10.5,12.83 11.17,13.5 12,13.5C12.83,13.5 13.5,12.83 13.5,12C13.5,11.17 12.83,10.5 12,10.5M16.5,12C16.5,14.48 14.48,16.5 12,16.5C9.52,16.5 7.5,14.48 7.5,12C7.5,9.52 9.52,7.5 12,7.5C14.48,7.5 16.5,9.52 16.5,12Z"/>
                </svg>
            </div>
            <div class="brain-off-text" id="brainNetText">CONNECTION LOST</div>
            <div class="brain-sub-text" id="brainNetSub">Server link broken. Please verify your network status.</div>
            
            <button class="brain-btn brain-btn-blue" id="brainBtnCheck">CHECK CONNECTION</button>
            <button class="brain-btn brain-btn-white" id="brainBtnOffline">GO TO OFFLINE PAGE</button>
        `;
        document.body.appendChild(popupDiv);
        
        if (!navigator.onLine) showOfflinePopup();
    };

    function showOfflinePopup() {
        if (!popupDiv) return;
        popupDiv.classList.add('show');
        resetOfflineUI();
    }

    function hideOfflinePopup() {
        if (!popupDiv) return;
        popupDiv.classList.remove('show');
        setTimeout(() => {
            resetOfflineUI();
        }, 500);
    }

    function resetOfflineUI() {
        const icon = document.getElementById('brainNetIcon');
        const text = document.getElementById('brainNetText');
        const sub = document.getElementById('brainNetSub');
        const btnCheck = document.getElementById('brainBtnCheck');
        const btnOff = document.getElementById('brainBtnOffline');

        if(!icon || !text || !sub || !btnCheck || !btnOff) return;

        icon.style.fill = '#ff4444';
        text.style.color = '#ff4444';
        text.innerText = 'CONNECTION LOST';
        sub.innerText = 'Server link broken. Please verify your network status.';
        
        btnCheck.className = 'brain-btn brain-btn-blue';
        btnCheck.innerHTML = 'CHECK CONNECTION';
        btnCheck.style.pointerEvents = 'auto';
        
        btnOff.style.display = 'flex';
    }

    window.addEventListener("offline", showOfflinePopup);

    window.addEventListener("online", () => {
        if (popupDiv && popupDiv.classList.contains('show')) {
            triggerOnlineSequence();
        }
    });

    function triggerOnlineSequence() {
        const btnCheck = document.getElementById('brainBtnCheck');
        const btnOff = document.getElementById('brainBtnOffline');
        const icon = document.getElementById('brainNetIcon');
        const text = document.getElementById('brainNetText');
        
        if(!icon || !text || !btnCheck || !btnOff) return;

        const waveDots = '<span class="brain-wave-dots"><span>.</span><span>.</span><span>.</span></span>';
        
        btnCheck.style.pointerEvents = 'none';
        btnOff.style.display = 'none';
        
        btnCheck.className = 'brain-btn brain-btn-blue active-yellow';
        btnCheck.innerHTML = `REDIRECTING${waveDots}`;
        
        icon.style.fill = '#ffbb33';
        text.style.color = '#ffbb33';
        text.innerText = 'NETWORK DETECTED';
        
        setTimeout(() => {
            btnCheck.className = 'brain-btn brain-btn-blue active-green';
            btnCheck.innerHTML = 'ONLINE';
            
            icon.style.fill = '#00C851';
            text.style.color = '#00C851';
            text.innerText = 'NETWORK RESTORED';
            
            setTimeout(() => {
                hideOfflinePopup();
            }, 2000);
        }, 3000);
    }

    document.addEventListener('click', (e) => {
        const btnCheck = e.target.closest('#brainBtnCheck');
        if (btnCheck) {
            const waveDots = '<span class="brain-wave-dots"><span>.</span><span>.</span><span>.</span></span>';
            btnCheck.style.pointerEvents = 'none';
            btnCheck.className = 'brain-btn brain-btn-blue active-yellow';
            btnCheck.innerHTML = `CHECKING${waveDots}`;
            
            setTimeout(() => {
                if (navigator.onLine) {
                    triggerOnlineSequence();
                } else {
                    btnCheck.className = 'brain-btn brain-btn-blue active-red';
                    btnCheck.innerHTML = 'OFFLINE';
                    
                    setTimeout(() => {
                        btnCheck.className = 'brain-btn brain-btn-blue';
                        btnCheck.innerHTML = 'CHECK CONNECTION';
                        btnCheck.style.pointerEvents = 'auto';
                    }, 3000);
                }
            }, Math.floor(Math.random() * 2000) + 3000);
            return;
        }
        
        const btnOff = e.target.closest('#brainBtnOffline');
        if (btnOff) {
            window.location.href = 'offline.html';
        }
    });
}

function runBrainInit() {
    if (currentPage !== "index.html" && currentPage !== "offline.html" && currentPage !== "") {
        if(window.initBrainPopup) window.initBrainPopup();
    }

    if (window.autoSyncPageState) {
        window.autoSyncPageState(currentPage);
    }
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', runBrainInit);
} else {
    runBrainInit();
}