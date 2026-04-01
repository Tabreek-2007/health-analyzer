// Initialize Lucide Icons
lucide.createIcons();

// --- API Config ---
// For deployment, change this to your hosted backend URL (e.g. https://your-app.onrender.com/api/analyze)
const API_URL = "https://health-analyzer-p2y8.onrender.com/api/analyze";

// --- Global State ---
let progressHistory = JSON.parse(localStorage.getItem('healthRiskHistory')) || [];
let progressChartInstance = null;

// --- Navigation Logic ---
function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        setTimeout(() => page.classList.add('hidden'), 50);
    });

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const targetPage = document.getElementById(`page-${pageId}`);
    targetPage.classList.remove('hidden');
    void targetPage.offsetWidth; // Force reflow
    targetPage.classList.add('active');

    const activeBtn = document.querySelector(`.nav-btn[data-target="${pageId}"]`);
    if(activeBtn) activeBtn.classList.add('active');
    
    // Close mobile menu if open
    document.getElementById('nav-links').classList.remove('active');

    if (pageId === 'progress') {
        setTimeout(renderProgressDashboard, 100); // Wait for page to display
    }

    window.scrollTo(0, 0);
}

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        navigateTo(e.target.dataset.target);
    });
});

document.querySelector('.mobile-toggle').addEventListener('click', () => {
    document.getElementById('nav-links').classList.toggle('active');
});

window.navigateToDetails = function(category) {
    navigateTo(category);
};

// --- Form Validation ---
const form = document.getElementById('analyzer-form');
const submitBtn = document.getElementById('submit-btn');
const inputs = form.querySelectorAll('input, select, textarea');

function validateForm() {
    let isValid = true;
    inputs.forEach(input => {
        if (!input.hasAttribute('required')) return;
        const errorMsg = document.getElementById(`error-${input.id}`);
        if (!errorMsg) return;

        if (!input.value) {
            isValid = false;
            errorMsg.innerText = "This field is required.";
            input.classList.add('input-error');
        } else if (input.type === 'number') {
            const val = parseFloat(input.value);
            const min = parseFloat(input.getAttribute('min'));
            const max = parseFloat(input.getAttribute('max'));
            if (val < min || val > max) {
                isValid = false;
                errorMsg.innerText = `Must be between ${min} and ${max}.`;
                input.classList.add('input-error');
            } else {
                errorMsg.innerText = "";
                input.classList.remove('input-error');
            }
        } else {
            errorMsg.innerText = "";
            input.classList.remove('input-error');
        }
    });

    submitBtn.disabled = !isValid;
    return isValid;
}

inputs.forEach(input => {
    input.addEventListener('input', validateForm);
    input.addEventListener('change', validateForm);
});

// --- Form Submission & API Call ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    submitBtn.disabled = true;
    const oldIcon = document.getElementById('submit-icon').getAttribute('data-lucide');
    document.getElementById('submit-icon').setAttribute('data-lucide', 'loader-2');
    document.getElementById('submit-text').innerText = "Analyzing Server Data...";
    lucide.createIcons();

    const formData = new FormData(form);
    const payload = {
        age: parseInt(formData.get('age')),
        gender: formData.get('gender'),
        height: parseFloat(formData.get('height')),
        weight: parseFloat(formData.get('weight')),
        smoking: formData.get('smoking'),
        alcohol: formData.get('alcohol'),
        activity: formData.get('activity'),
        fitness_goal: formData.get('fitnessGoal'),
        existing_illnesses: formData.get('existingIllnesses') || "",
        family_history: formData.get('familyHistory') || ""
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("API request failed: " + response.statusText);
        
        const result = await response.json();
        
        saveProgress(result);
        updateResultsUI(result);
        navigateTo('results');
        
    } catch (error) {
        alert("Error connecting to server. Make sure the FastAPI backend is running locally or deployed.");
        console.error(error);
    } finally {
        submitBtn.disabled = false;
        document.getElementById('submit-icon').setAttribute('data-lucide', 'cpu');
        document.getElementById('submit-text').innerText = "Generate AI Insight";
        lucide.createIcons();
    }
});

function saveProgress(result) {
    const entry = {
        date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        bmi: result.bmi,
        riskScore: result.riskScore,
        riskLevel: result.riskLevel
    };
    progressHistory.push(entry);
    localStorage.setItem('healthRiskHistory', JSON.stringify(progressHistory));
}

// --- Update UI ---
function updateResultsUI(data) {
    // Basic Info
    document.getElementById('bmi-value').innerText = data.bmi;
    
    // Status
    const bmiBadge = document.getElementById('bmi-status');
    if (data.bmi < 18.5) { bmiBadge.innerText = 'Underweight'; bmiBadge.className = 'bmi-badge bg-warning'; }
    else if (data.bmi < 25) { bmiBadge.innerText = 'Normal'; bmiBadge.className = 'bmi-badge bg-success'; }
    else if (data.bmi < 30) { bmiBadge.innerText = 'Overweight'; bmiBadge.className = 'bmi-badge bg-warning'; }
    else { bmiBadge.innerText = 'Obese'; bmiBadge.className = 'bmi-badge bg-danger'; }

    // Risk Meter Display
    document.getElementById('risk-level-text').innerText = data.riskLevel;
    let themeColor = "var(--success)";
    let themeStr = "success";
    if (data.riskLevel === "Medium") { themeColor = "var(--warning)"; themeStr = "warning"; }
    else if (data.riskLevel === "High") { themeColor = "var(--danger)"; themeStr = "danger"; }
    
    document.getElementById('risk-level-text').className = `risk-value text-${themeStr}`;
    const riskCircle = document.getElementById('risk-circle');
    const degree = Math.round((data.riskScore / 100) * 360);
    riskCircle.style.background = `conic-gradient(${themeColor} ${degree}deg, var(--border-color) 0deg)`;

    // Macros
    document.getElementById('tdee-value').innerText = data.targetCalories;
    document.getElementById('protein-value').innerText = data.macros.protein + "g";
    document.getElementById('carbs-value').innerText = data.macros.carbs + "g";
    document.getElementById('fats-value').innerText = data.macros.fats + "g";

    // Set Dynamic Tips
    document.getElementById('diet-tips').innerText = data.personalizedTips.diet;
    document.getElementById('exercise-tips').innerText = data.personalizedTips.exercise;
    document.getElementById('lifestyle-tips').innerText = data.personalizedTips.lifestyle;

    // Detailed Pages content update
    document.getElementById('diet-plan-content').innerHTML = `<p>${data.personalizedTips.diet}</p><p>Aim for ${data.targetCalories} calories (${data.macros.protein}g P, ${data.macros.carbs}g C, ${data.macros.fats}g F).</p>`;
    document.getElementById('exercise-plan-content').innerHTML = `<p>${data.personalizedTips.exercise}</p>`;
    document.getElementById('sleep-tips').innerText = data.personalizedTips.lifestyle;

    lucide.createIcons();
}

// --- PDF Generation ---
document.getElementById('download-pdf-btn').addEventListener('click', () => {
    const element = document.querySelector('.results-layout'); // What to download
    const opt = {
      margin:       10,
      filename:     'AI-Health-Report.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
});

// --- Progress Dashboard Logic ---
function renderProgressDashboard() {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    
    if (progressHistory.length === 0) {
        historyList.innerHTML = "<p style='color: var(--text-muted);'>No analysis history yet. Complete an analysis first!</p>";
        return;
    }

    // Populate List
    [...progressHistory].reverse().forEach((item, index) => {
        let badgeColor = item.riskLevel === 'Low' ? '#10b981' : item.riskLevel === 'Medium' ? '#f59e0b' : '#ef4444';
        const div = document.createElement('div');
        div.className = 'history-card';
        div.innerHTML = `
            <div>
                <strong style="font-size: 1.1rem;">${item.date}</strong>
                <div style="font-size: 0.9rem; margin-top: 4px; color: var(--text-muted);">
                    Risk Level: <span style="background: ${badgeColor}; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem;">${item.riskLevel}</span>
                </div>
            </div>
            <div style="text-align: right;">
                <div style="color: var(--primary); font-weight: bold; font-size: 1.2rem;">BMI: ${item.bmi}</div>
                <div style="color: var(--text-muted); font-size: 0.9rem;">Score: ${item.riskScore}</div>
            </div>
        `;
        historyList.appendChild(div);
    });

    // Populate Chart
    const ctx = document.getElementById('progressChart').getContext('2d');
    const labels = progressHistory.map(h => h.date.split(' ')[0]); // just date 
    const bmiData = progressHistory.map(h => h.bmi);
    const scoreData = progressHistory.map(h => h.riskScore); // fallback for typo if any

    if (progressChartInstance) {
        progressChartInstance.destroy();
    }

    progressChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'BMI Trend',
                    data: bmiData,
                    borderColor: '#006ce6',
                    backgroundColor: 'rgba(0, 108, 230, 0.1)',
                    yAxisID: 'y',
                    tension: 0.3,
                    fill: true
                },
                {
                    label: 'Risk Score (0-100)',
                    data: scoreData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    yAxisID: 'y1',
                    tension: 0.3,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: { 
                    type: 'linear', display: true, position: 'left', 
                    title: {display: true, text: 'BMI'} 
                },
                y1: { 
                    type: 'linear', display: true, position: 'right', 
                    min: 0, max: 100, 
                    title: {display: true, text: 'Risk Score'}, 
                    grid: {drawOnChartArea: false} 
                }
            }
        }
    });
}
