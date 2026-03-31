// Initialize Lucide Icons
lucide.createIcons();

// --- Navigation Logic ---
function navigateTo(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
        setTimeout(() => page.classList.add('hidden'), 50); // small delay for animation readiness
    });

    // Deselect all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    // Show target page
    const targetPage = document.getElementById(`page-${pageId}`);
    targetPage.classList.remove('hidden');
    // Force reflow
    void targetPage.offsetWidth;
    targetPage.classList.add('active');

    // Highlight active nav button (if exists)
    const activeBtn = document.querySelector(`.nav-btn[data-target="${pageId}"]`);
    if(activeBtn) activeBtn.classList.add('active');

    // Scroll to top
    window.scrollTo(0, 0);
}

// Add event listeners to nav buttons
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        navigateTo(e.target.dataset.target);
    });
});

window.navigateToDetails = function(category) {
    navigateTo(category);
};

// --- Form & Mock AI Logic ---
const form = document.getElementById('analyzer-form');

form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Gather Data
    const formData = new FormData(form);
    const data = {
        age: parseInt(formData.get('age')),
        gender: formData.get('gender'),
        height: parseFloat(formData.get('height')),
        weight: parseFloat(formData.get('weight')),
        smoking: formData.get('smoking'),
        alcohol: formData.get('alcohol'),
        activity: formData.get('activity'),
        conditions: formData.getAll('conditions')
    };

    // Calculate BMI
    // Height in cm to meters
    const heightM = data.height / 100;
    const bmi = data.weight / (heightM * heightM);
    
    // Process Mock AI Risk Score (Scale 0 to 100)
    let riskScore = 10; // base score

    // Age Factor
    if (data.age > 45) riskScore += 10;
    if (data.age > 60) riskScore += 15;

    // BMI Factor
    let bmiStatus = "Normal";
    let bmiClass = "bg-success";
    if (bmi < 18.5) {
        bmiStatus = "Underweight";
        bmiClass = "bg-warning";
        riskScore += 5;
    } else if (bmi >= 25 && bmi < 30) {
        bmiStatus = "Overweight";
        bmiClass = "bg-warning";
        riskScore += 15;
    } else if (bmi >= 30) {
        bmiStatus = "Obese";
        bmiClass = "bg-danger";
        riskScore += 25;
    }

    // Smoking
    if (data.smoking === 'regular') riskScore += 25;
    if (data.smoking === 'occasional') riskScore += 10;
    if (data.smoking === 'former') riskScore += 5;

    // Alcohol
    if (data.alcohol === 'frequent') riskScore += 15;
    if (data.alcohol === 'moderate') riskScore += 5;

    // Activity
    if (data.activity === 'sedentary') riskScore += 15;
    if (data.activity === 'light') riskScore += 5;
    if (data.activity === 'very') riskScore -= 5; // healthy habit

    // Conditions
    riskScore += (data.conditions.length * 15);

    // Normalize
    riskScore = Math.max(0, Math.min(riskScore, 100));

    // Determine Level
    let riskLevel = "Low";
    let themeColor = "var(--success)";
    let themeStr = "success";
    let alertMsg = "Your overall health profile looks great. Maintain your current lifestyle to keep risks low.";

    if (riskScore >= 40 && riskScore < 70) {
        riskLevel = "Medium";
        themeColor = "var(--warning)";
        themeStr = "warning";
        alertMsg = "Our AI has identified some moderate risk factors. Consider adjusting your lifestyle habits.";
    } else if (riskScore >= 70) {
        riskLevel = "High";
        themeColor = "var(--danger)";
        themeStr = "danger";
        alertMsg = "High risk indicators detected. We strongly recommend consulting a healthcare professional.";
    }

    // --- Update Results UI ---
    
    // BMI
    document.getElementById('bmi-value').innerText = bmi.toFixed(1);
    const bmiBadge = document.getElementById('bmi-status');
    bmiBadge.innerText = bmiStatus;
    bmiBadge.className = `bmi-badge ${bmiClass}`;

    // Risk Meter & Level
    document.getElementById('risk-level-text').innerText = riskLevel;
    document.getElementById('risk-level-text').className = `risk-value text-${themeStr}`;
    
    // Animate Circular Progress (conic-gradient)
    const riskCircle = document.getElementById('risk-circle');
    // Calculate degree (0 to 360) based on score (0 to 100)
    const degree = Math.round((riskScore / 100) * 360);
    riskCircle.style.background = `conic-gradient(${themeColor} ${degree}deg, var(--border-color) 0deg)`;

    // Alert Panel
    document.getElementById('risk-summary-text').innerText = alertMsg;
    const alertBox = document.getElementById('risk-alert');
    alertBox.style.borderLeftColor = themeColor;
    alertBox.querySelector('.alert-icon').style.color = themeColor;

    // Possible Risks
    const risksList = document.getElementById('possible-risks-list');
    risksList.innerHTML = ''; // clear
    let detectedRisks = [];
    
    if (bmi >= 25 || data.conditions.includes('diabetes')) detectedRisks.push({ icon: 'activity', name: 'Metabolic Syndrome' });
    if (data.smoking === 'regular' || data.smoking === 'occasional') detectedRisks.push({ icon: 'wind', name: 'Respiratory Issues' });
    if (data.conditions.includes('hypertension') || data.conditions.includes('heartDisease') || riskScore > 60) detectedRisks.push({ icon: 'heart-pulse', name: 'Cardiovascular Risk' });
    
    if (detectedRisks.length === 0) {
        detectedRisks.push({ icon: 'shield-check', name: 'No Specific Flagged Risks' });
    }

    detectedRisks.forEach(risk => {
        const tag = document.createElement('div');
        tag.className = 'risk-tag';
        tag.innerHTML = `<i data-lucide="${risk.icon}" style="width: 16px;"></i> ${risk.name}`;
        risksList.appendChild(tag);
    });

    // Generate Tips
    const dietTips = document.getElementById('diet-tips');
    const exerciseTips = document.getElementById('exercise-tips');
    const lifestyleTips = document.getElementById('lifestyle-tips');

    if (riskLevel === "High") {
        dietTips.innerText = "Crucial: Reduce sodium and processed foods. Prioritize a Mediterranean diet.";
        exerciseTips.innerText = "Consult a doctor before starting exercise, then aim for gentle daily walks.";
        lifestyleTips.innerText = "Urgent: Eliminate smoking if applicable and seek medical guidance for current conditions.";
    } else if (riskLevel === "Medium") {
        dietTips.innerText = "Focus on portion control and lean proteins. Cut back on added sugars.";
        exerciseTips.innerText = "Increase cardiovascular activities to at least 150 minutes per week.";
        lifestyleTips.innerText = "Improve sleep hygiene and find active ways to manage daily stress.";
    } else {
        dietTips.innerText = "Maintain your current balanced diet. Stay hydrated daily.";
        exerciseTips.innerText = "Keep up the great work! Try adding some strength training 2x a week.";
        lifestyleTips.innerText = "Continue your healthy habits and ensure 7-8 hours of sleep.";
    }

    // Populate Detailed Pages
    populateDetailsPages(riskLevel);

    // Re-initialize any dynamic icons
    lucide.createIcons();

    // Navigate to results
    navigateTo('results');
});

// --- Dynamic Population Logic for Details Pages ---
function populateDetailsPages(level) {
    // Diet Page
    const dietPlanContent = document.getElementById('diet-plan-content');
    const goodFoodsList = document.getElementById('good-foods-list');
    const badFoodsList = document.getElementById('bad-foods-list');
    const mealPlanTimeline = document.getElementById('meal-plan-timeline');

    // Exercise Page
    const exercisePlanContent = document.getElementById('exercise-plan-content');
    const exerciseIntensityBadge = document.getElementById('exercise-intensity-badge');
    const weeklySchedule = document.getElementById('weekly-schedule');

    // Lifestyle Page
    const sleepTips = document.getElementById('sleep-tips');
    const stressTips = document.getElementById('stress-tips');
    const dosList = document.getElementById('dos-list');
    const dontsList = document.getElementById('donts-list');

    if (level === "Low") {
        // Diet
        dietPlanContent.innerHTML = "<p>Maintain a <strong>Balanced Diet</strong> focusing on sustaining your current health metrics. You don't need strict restrictions.</p>";
        goodFoodsList.innerHTML = "<li>Mixed nuts and seeds</li><li>Lean proteins (chicken, tofu)</li><li>Whole grain bread</li><li>Fresh seasonal fruits</li>";
        badFoodsList.innerHTML = "<li>Excessive added sugars</li><li>Highly processed snacks</li>";
        mealPlanTimeline.innerHTML = `
            <div class="meal-slot"><div class="meal-time">8:00 AM</div><div class="meal-desc">Oatmeal with berries and a handful of almonds.</div></div>
            <div class="meal-slot"><div class="meal-time">1:00 PM</div><div class="meal-desc">Grilled chicken salad with olive oil dressing.</div></div>
            <div class="meal-slot"><div class="meal-time">7:00 PM</div><div class="meal-desc">Baked salmon with quinoa and steamed broccoli.</div></div>
        `;

        // Exercise
        exercisePlanContent.innerHTML = "<p>Keep up the great work! A mix of moderate cardio and light strength training is ideal to maintain your fitness.</p>";
        exerciseIntensityBadge.innerText = "Moderate";
        exerciseIntensityBadge.className = "badge badge-sm bg-success text-white";
        weeklySchedule.innerHTML = `
            <div class="day-card"><h5>Mon</h5><p>30m Jog</p></div>
            <div class="day-card"><h5>Tue</h5><p>Strength</p></div>
            <div class="day-card rest-day"><h5>Wed</h5><p>Rest/Yoga</p></div>
            <div class="day-card"><h5>Thu</h5><p>45m Cycle</p></div>
            <div class="day-card"><h5>Fri</h5><p>Strength</p></div>
            <div class="day-card"><h5>Sat</h5><p>Active Rec.</p></div>
            <div class="day-card rest-day"><h5>Sun</h5><p>Rest</p></div>
        `;

        // Lifestyle
        sleepTips.innerText = "Continue aiming for 7-8 hours. Establish a regular sleep schedule.";
        stressTips.innerText = "Your stress seems managed. Standard mindfulness like reading before bed works well.";
        dosList.innerHTML = "<li>Stay hydrated (8 glasses/day)</li><li>Take breaks from screens</li><li>Walk outdoors daily</li>";
        dontsList.innerHTML = "<li>Don't skip breakfast</li><li>Avoid late-night heavy meals</li>";
    } else if (level === "Medium") {
        // Diet
        dietPlanContent.innerHTML = "<p>Transition to a <strong>Lower-Carb / Mediterranean Diet</strong> to proactively manage risk factors before they escalate.</p>";
        goodFoodsList.innerHTML = "<li>Leafy greens (spinach, kale)</li><li>Fatty fish (salmon, mackerel)</li><li>Olive oil</li><li>Legumes</li>";
        badFoodsList.innerHTML = "<li>Refined carbohydrates (white bread)</li><li>Sugary drinks/sodas</li><li>Fried foods</li>";
        mealPlanTimeline.innerHTML = `
            <div class="meal-slot"><div class="meal-time">8:00 AM</div><div class="meal-desc">Greek yogurt with chia seeds and walnuts.</div></div>
            <div class="meal-slot"><div class="meal-time">1:00 PM</div><div class="meal-desc">Lentil soup with a side of mixed greens.</div></div>
            <div class="meal-slot"><div class="meal-time">7:00 PM</div><div class="meal-desc">Turkey meatballs with zucchini noodles.</div></div>
        `;

        // Exercise
        exercisePlanContent.innerHTML = "<p>Increase your cardiovascular activity to burn fat and improve heart health. Aim for 150 minutes weekly.</p>";
        exerciseIntensityBadge.innerText = "Cardio Focus";
        exerciseIntensityBadge.className = "badge badge-sm bg-warning text-dark";
        weeklySchedule.innerHTML = `
            <div class="day-card"><h5>Mon</h5><p>45m Brisk Walk</p></div>
            <div class="day-card"><h5>Tue</h5><p>Light Weights</p></div>
            <div class="day-card rest-day"><h5>Wed</h5><p>Rest</p></div>
            <div class="day-card"><h5>Thu</h5><p>30m Swim/Cycle</p></div>
            <div class="day-card"><h5>Fri</h5><p>45m Brisk Walk</p></div>
            <div class="day-card"><h5>Sat</h5><p>Yoga/Flexibility</p></div>
            <div class="day-card rest-day"><h5>Sun</h5><p>Rest</p></div>
        `;

        // Lifestyle
        sleepTips.innerText = "Crucial: Ensure strict 8-hour sleep. Avoid screens 1 hour before bed.";
        stressTips.innerText = "Introduce 10 minutes of deep breathing exercises daily to lower cortisol.";
        dosList.innerHTML = "<li>Track your daily steps (Goal: 8,000)</li><li>Drink green tea</li><li>Stretch daily</li>";
        dontsList.innerHTML = "<li>Don't sit for >2 hours straight</li><li>Avoid excessive caffeine after 2 PM</li>";
    } else {
        // High Risk
        // Diet
        dietPlanContent.innerHTML = "<p>Adopt a <strong>Strict Heart-Healthy / DASH Diet</strong>. Immediate dietary intervention is highly recommended.</p>";
        goodFoodsList.innerHTML = "<li>Oats and whole grains</li><li>Lots of vegetables</li><li>Skinless poultry</li><li>Berries</li>";
        badFoodsList.innerHTML = "<li>High-sodium prepared foods</li><li>Red meat</li><li>Alcohol</li><li>Trans fats</li>";
        mealPlanTimeline.innerHTML = `
            <div class="meal-slot"><div class="meal-time">8:00 AM</div><div class="meal-desc">Steel-cut oats with blueberries. No added sugar.</div></div>
            <div class="meal-slot"><div class="meal-time">1:00 PM</div><div class="meal-desc">Large spinach salad with grilled chicken, no salt added dressing.</div></div>
            <div class="meal-slot"><div class="meal-time">7:00 PM</div><div class="meal-desc">Baked white fish with steamed asparagus and brown rice.</div></div>
        `;

        // Exercise
        exercisePlanContent.innerHTML = "<p>Please consult a physician before starting. Begin with gentle, low-impact movements to avoid strain.</p>";
        exerciseIntensityBadge.innerText = "Low Impact / Beginner";
        exerciseIntensityBadge.className = "badge badge-sm bg-danger text-white";
        weeklySchedule.innerHTML = `
            <div class="day-card"><h5>Mon</h5><p>15m Gentle Walk</p></div>
            <div class="day-card rest-day"><h5>Tue</h5><p>Rest</p></div>
            <div class="day-card"><h5>Wed</h5><p>15m Gentle Walk</p></div>
            <div class="day-card rest-day"><h5>Thu</h5><p>Rest</p></div>
            <div class="day-card"><h5>Fri</h5><p>15m Gentle Walk</p></div>
            <div class="day-card"><h5>Sat</h5><p>Light Stretching</p></div>
            <div class="day-card rest-day"><h5>Sun</h5><p>Rest</p></div>
        `;

        // Lifestyle
        sleepTips.innerText = "Prioritize recovery. If sleep apnea is suspected, consult a doctor.";
        stressTips.innerText = "Chronic stress management is required. Consider guided meditation or therapy.";
        dosList.innerHTML = "<li>Schedule a doctor's checkup</li><li>Monitor blood pressure at home</li><li>Seek support from family/friends</li>";
        dontsList.innerHTML = "<li>Do NOT smoke or use tobacco</li><li>Do NOT engage in high-intensity exercise without clearance</li>";
    }
}
