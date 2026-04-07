// pricing.js

// 1. Fetch and Display Dynamic Pricing
async function updatePricing() {
    try {
        const API_URL = 'https://us-central1-decodr-app.cloudfunctions.net/api';
        const response = await fetch(`${API_URL}/exchange/pricing`);
        const data = await response.json();

        if (data.success && data.display) {
            const { plus, lifetime } = data.display;

            // Helper to safely update text
            const setText = (id, text) => {
                const el = document.getElementById(id);
                if (el) el.textContent = `$${text}`;
            };

            setText('price-monthly', plus.monthly);
            setText('price-yearly', plus.yearly);
            setText('price-lifetime', lifetime);
        }
    } catch (error) {
        console.warn('Failed to fetch dynamic pricing, using defaults:', error);
    }
}

// 2. Handle Payment Buttons
function setupButtons() {
    const handleUpgrade = (plan) => {
        // specific check for chrome runtime availability
        if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage({
                type: 'INIT_PAYMENT',
                payload: { plan }
            }, (response) => {
                if (response && response.success && response.authorization_url) {
                    window.open(response.authorization_url, '_blank');
                } else {
                    alert('Failed to initialize payment. Please check your internet connection or try again.');
                }
            });
        } else {
            console.warn('Chrome runtime not available. Are you viewing this page outside the extension?');
            alert('Error: Cannot communicate with extension. Please ensure you are opening this page from the Decodr extension.');
        }
    };

    const btnMonthly = document.getElementById('btn-monthly');
    if (btnMonthly) btnMonthly.addEventListener('click', () => handleUpgrade('plus_monthly'));

    const btnYearly = document.getElementById('btn-yearly');
    if (btnYearly) btnYearly.addEventListener('click', () => handleUpgrade('plus_yearly'));

    const btnLifetime = document.getElementById('btn-lifetime');
    if (btnLifetime) btnLifetime.addEventListener('click', () => handleUpgrade('lifetime'));
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updatePricing();
    setupButtons();
});
