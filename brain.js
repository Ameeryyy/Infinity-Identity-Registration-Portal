// === SECURITY PROTOCOLS ===
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
    }
    
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
        e.preventDefault();
    }
    
    if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
        e.preventDefault();
    }
    
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
        e.preventDefault();
    }
    
    if (e.ctrlKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
        e.preventDefault();
    }
});

document.addEventListener('copy', function(e) {
    e.preventDefault();
});

document.addEventListener('cut', function(e) {
    e.preventDefault();
});

document.addEventListener('paste', function(e) {
    e.preventDefault();
});

document.addEventListener('dragstart', function(e) {
    e.preventDefault();
});

// Function to check if the current page is index.html
function isIndexPage() {
    const path = window.location.pathname;
    return path.endsWith('index.html') || path === '/' || path === '';
}

document.addEventListener('DOMContentLoaded', () => {
    const allInputs = document.querySelectorAll('input, textarea');
    allInputs.forEach(input => {
        input.setAttribute('autocomplete', 'off');
        input.setAttribute('autocorrect', 'off');
        input.setAttribute('autocapitalize', 'off');
        input.setAttribute('spellcheck', 'false');
    });

    // Check Network on Load (Ignore index.html)
    if (!navigator.onLine && window.location.pathname.indexOf('offline.html') === -1 && !isIndexPage()) {
        sessionStorage.setItem('brain_last_online_page', window.location.href);
        window.location.href = "offline.html";
    }
});

const securityStyles = document.createElement('style');
securityStyles.innerHTML = `
    * {
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        user-select: none !important;
        outline: none !important;
        -webkit-tap-highlight-color: transparent !important;
    }
    input, textarea {
        -webkit-user-select: auto !important;
        -moz-user-select: auto !important;
        -ms-user-select: auto !important;
        user-select: auto !important;
    }
`;
document.head.appendChild(securityStyles);

// === OFFLINE ROUTING SYSTEM ===
window.addEventListener('offline', () => {
    // Redirect to offline page if not already there, and ONLY if it's not the index page
    if (window.location.pathname.indexOf('offline.html') === -1 && !isIndexPage()) {
        sessionStorage.setItem('brain_last_online_page', window.location.href);
        document.body.style.opacity = '0';
        setTimeout(() => {
            window.location.href = "offline.html";
        }, 800);
    }
});

window.addEventListener('online', () => {
    if (window.location.pathname.indexOf('offline.html') === -1) {
        // Just in case they are somewhere else and come back online, do nothing special.
    }
});