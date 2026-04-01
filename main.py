from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Health Risk Analyzer API")

# Add CORS so frontend can communicate with backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For production, restrict this to frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HealthData(BaseModel):
    age: int = Field(..., ge=1, le=120)
    gender: str = Field(...) # male, female, other
    height: float = Field(..., ge=50, le=300) # cm
    weight: float = Field(..., ge=20, le=300) # kg
    smoking: str = Field(...)
    alcohol: str = Field(...)
    activity: str = Field(...)
    fitness_goal: str = Field(...) # weight_loss, muscle_gain, maintenance, endurance
    existing_illnesses: str = ""
    family_history: str = ""

@app.post("/api/analyze")
async def analyze_health(data: HealthData):
    try:
        # --- 1. BMI Calculation ---
        height_m = data.height / 100.0
        bmi = data.weight / (height_m * height_m)
        
        # --- 2. BMR & TDEE Calculation ---
        # Mifflin-St Jeor Equation
        if data.gender.lower() == 'male':
            bmr = (10 * data.weight) + (6.25 * data.height) - (5 * data.age) + 5
        elif data.gender.lower() == 'female':
            bmr = (10 * data.weight) + (6.25 * data.height) - (5 * data.age) - 161
        else:
            # Average for 'other'
            bmr_male = (10 * data.weight) + (6.25 * data.height) - (5 * data.age) + 5
            bmr_female = (10 * data.weight) + (6.25 * data.height) - (5 * data.age) - 161
            bmr = (bmr_male + bmr_female) / 2
        
        activity_multipliers = {
            "sedentary": 1.2,
            "light": 1.375,
            "moderate": 1.55,
            "very": 1.725
        }
        tdee = bmr * activity_multipliers.get(data.activity.lower(), 1.2)
        
        # --- 3. Calorie & Macro Calculation based on Fitness Goal ---
        target_calories = tdee
        protein_per_kg = 1.2
        fat_percentage = 0.25 # 25% of calories
        
        if data.fitness_goal == 'weight_loss':
            target_calories = tdee - 500
            protein_per_kg = 1.5 # between 1.2 - 1.6
        elif data.fitness_goal == 'muscle_gain':
            target_calories = tdee + 400
            protein_per_kg = 2.0 # between 1.6 - 2.2
        elif data.fitness_goal == 'endurance':
            target_calories = tdee + 200
            protein_per_kg = 1.4
            fat_percentage = 0.20 # Lower fat, higher carbs for endurance
            
        protein_grams = min(data.weight * protein_per_kg, target_calories * 0.35 / 4) # cap at 35% of diet
        fat_calories = target_calories * fat_percentage
        fat_grams = fat_calories / 9.0
        
        protein_calories = protein_grams * 4.0
        remaining_calories = target_calories - (protein_calories + fat_calories)
        carbs_grams = remaining_calories / 4.0

        # --- 4. Risk Score Calculation (Weighted System) ---
        risk_score = 10 # Base risk
        
        # Age
        if data.age > 45: risk_score += 10
        if data.age > 60: risk_score += 15
        
        # BMI
        if bmi < 18.5:
            risk_score += 5
        elif 25 <= bmi < 30:
            risk_score += 15
        elif bmi >= 30:
            risk_score += 25
            
        # Smoking & Alcohol
        if data.smoking == 'regular': risk_score += 25
        elif data.smoking == 'occasional': risk_score += 10
        elif data.smoking == 'former': risk_score += 5
        
        if data.alcohol == 'frequent': risk_score += 15
        elif data.alcohol == 'moderate': risk_score += 5
        
        # Activity
        if data.activity == 'sedentary': risk_score += 15
        elif data.activity == 'light': risk_score += 5
        elif data.activity == 'very': risk_score -= 5
        
        # Health History (Text length used as a proxy for entered conditions)
        if len(data.existing_illnesses.strip()) > 5:
            risk_score += 15
        if len(data.family_history.strip()) > 5:
            risk_score += 15
            
        risk_score = max(0, min(risk_score, 100)) # Normalize 0-100
        
        # Risk Level Definition
        risk_level = "Low"
        if 40 <= risk_score < 70:
            risk_level = "Medium"
        elif risk_score >= 70:
            risk_level = "High"
            
        return {
            "bmi": round(bmi, 1),
            "bmr": round(bmr, 0),
            "tdee": round(tdee, 0),
            "targetCalories": round(target_calories, 0),
            "macros": {
                "protein": round(protein_grams, 0),
                "carbs": round(carbs_grams, 0),
                "fats": round(fat_grams, 0)
            },
            "riskScore": round(risk_score, 0),
            "riskLevel": risk_level,
            "personalizedTips": {
                "diet": generate_diet_tips(risk_level, data.fitness_goal),
                "exercise": generate_exercise_tips(risk_level, data.fitness_goal),
                "lifestyle": generate_lifestyle_tips(risk_level)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

def generate_diet_tips(level, goal):
    base_tips = "Maintain a balanced intake. "
    if level == "High":
        base_tips = "Crucial: Reduce processed foods, focus on heart-healthy meals (DASH diet). "
    elif level == "Medium":
        base_tips = "Focus on whole foods and reduce added sugars. "
        
    goal_tips = {
        "weight_loss": "Stay in your caloric deficit. Prioritize lean protein and volume-dense vegetables.",
        "muscle_gain": "Ensure steady caloric surplus. Eat protein-rich meals every few hours.",
        "maintenance": "Hit your daily macros to maintain current body composition.",
        "endurance": "Pre-load complex carbs before runs. Hydration is vital."
    }
    return base_tips + goal_tips.get(goal, "")

def generate_exercise_tips(level, goal):
    if level == "High":
        return "Always consult a physican before starting. Begin with low-impact 15m walks daily."
        
    goal_tips = {
        "weight_loss": "Combine 150m of steady-state cardio with 2x per week resistance training.",
        "muscle_gain": "Focus on progressive overload in compound lifts (3-4x/week).",
        "maintenance": "Mix cardio and light strength training 3 days a week.",
        "endurance": "Follow a structured running/cycling plan, but do not neglect core strength."
    }
    return goal_tips.get(goal, "")

def generate_lifestyle_tips(level):
    if level == "High":
        return "Urgent: Focus heavily on stress management and consult a healthcare provider."
    elif level == "Medium":
        return "Ensure 7-8 hours of sleep. Try to implement daily mobility/stretching."
    return "Great job! Keep up your healthy sleep schedule and active routines."
