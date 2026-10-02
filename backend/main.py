import os
import json
import tempfile
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel

from google import genai
from google.genai import types

from database import init_db, get_db, Clinic, Patient, GaitVisit

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Initializing Database...")
    await init_db()
    yield
    print("🛑 Shutting down...")

app = FastAPI(title="Osteo Predictive AI (National SaaS)", version="4.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"]
)

class PatientCreate(BaseModel):
    hn_code: str
    name: str
    underlying_disease: str = "ไม่มี"
    current_meds: str = "ไม่มี"
    allergies: str = "ไม่มี"

class LoginRequest(BaseModel):
    tenant_code: str
    password: str

# ==========================================
# 🔐 API 0: ระบบ Login สำหรับหน่วยบริการ (Multi-Tenant Auth)
# ==========================================
@app.post("/api/v1/auth/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    # จำลองรหัสผ่านของกระทรวงสาธารณสุข
    if req.password != "TTM2026":
        raise HTTPException(status_code=401, detail="รหัสผ่านไม่ถูกต้อง")
    
    # เช็กว่ามีคลินิก/รพ. นี้ในระบบหรือยัง ถ้ายังให้สร้างใหม่ (จำลองการดึงชื่ออัตโนมัติ)
    result = await db.execute(select(Clinic).filter(Clinic.tenant_code == req.tenant_code))
    clinic = result.scalars().first()
    
    if not clinic:
        # สร้าง รพ. ใหม่ในฐานข้อมูล ถ้ามีคนพิมพ์รหัสใหม่เข้ามา
        name = "รพ.สต. ทับพริก" if req.tenant_code == "HOSP-107" else f"หน่วยบริการ {req.tenant_code}"
        clinic = Clinic(tenant_code=req.tenant_code, name=name)
        db.add(clinic)
        await db.commit()
        await db.refresh(clinic)
        
    # ส่ง Token กลับไปให้หน้าเว็บ (ในที่นี้เราใช้ clinic_id เป็น Token จำลองเพื่อความง่าย)
    return {"status": "success", "clinic_id": clinic.id, "clinic_name": clinic.name, "tenant_code": clinic.tenant_code}


# ==========================================
# 🏥 API 1: สร้างผู้ป่วยใหม่
# ==========================================
@app.post("/api/v1/patients")
async def create_patient(patient: PatientCreate, x_clinic_id: int = Header(...), db: AsyncSession = Depends(get_db)):
    # 🔑 เช็ก x_clinic_id ที่ส่งมาจาก Header ว่าหมออยู่ รพ. ไหน
    new_patient = Patient(
        hn_code=patient.hn_code,
        name=patient.name,
        clinic_id=x_clinic_id, # ล็อกข้อมูลคนไข้ให้ติดกับ รพ. นั้น
        underlying_disease=patient.underlying_disease,
        current_meds=patient.current_meds,
        allergies=patient.allergies
    )
    db.add(new_patient)
    await db.commit()
    await db.refresh(new_patient)
    return {"status": "success"}

# ==========================================
# 📋 API 2: ดึงรายชื่อผู้ป่วยทั้งหมดของคลินิก
# ==========================================
@app.get("/api/v1/patients")
async def get_patients(x_clinic_id: int = Header(...), db: AsyncSession = Depends(get_db)):
    # 🔑 ดึงเฉพาะคนไข้ที่ clinic_id ตรงกับ Header เท่านั้น (ข้าม รพ. ไม่ได้เด็ดขาด!)
    result = await db.execute(select(Patient).filter(Patient.clinic_id == x_clinic_id))
    return {"status": "success", "data": result.scalars().all()}

@app.put("/api/v1/patients/{patient_id}")
async def update_patient(patient_id: int, patient_update: PatientCreate, x_clinic_id: int = Header(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Patient).filter(Patient.id == patient_id, Patient.clinic_id == x_clinic_id))
    db_patient = result.scalars().first()
    if not db_patient: raise HTTPException(status_code=404)
    db_patient.hn_code = patient_update.hn_code
    db_patient.name = patient_update.name
    db_patient.underlying_disease = patient_update.underlying_disease
    db_patient.current_meds = patient_update.current_meds
    db_patient.allergies = patient_update.allergies
    await db.commit()
    return {"status": "success"}

@app.delete("/api/v1/patients/{patient_id}")
async def delete_patient(patient_id: int, x_clinic_id: int = Header(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Patient).filter(Patient.id == patient_id, Patient.clinic_id == x_clinic_id))
    db_patient = result.scalars().first()
    if not db_patient: raise HTTPException(status_code=404)
    try:
        await db.execute(GaitVisit.__table__.delete().where(GaitVisit.patient_id == patient_id))
        await db.delete(db_patient)
        await db.commit()
        return {"status": "success"}
    except Exception:
        await db.rollback()
        raise HTTPException(status_code=500)

# ==========================================
# 🤖 API 3: รัน AI และบันทึกผลการรักษา (Gait Analysis)
# ==========================================
@app.post("/api/v1/gait-analysis")
async def analyze_gait(
    patient_data: str = Form(...), video: UploadFile = File(...), x_clinic_id: int = Header(...), db: AsyncSession = Depends(get_db)
):
    if not video.content_type.startswith("video/"): raise HTTPException(status_code=400)
    patient_info = json.loads(patient_data)
    temp_file_path = None
    try:
        video_bytes = await video.read()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as temp_file:
            temp_file.write(video_bytes)
            temp_file_path = temp_file.name

        print("Uploading video to Gemini API...")
        uploaded_file = client.files.upload(file=temp_file_path)

        # --- ส่วนที่แก้ไข: เพิ่มระบบรอให้ Gemini ประมวลผลวิดีโอจนกว่าจะพร้อม (ACTIVE) ---
        import asyncio
        print("Waiting for Gemini to process the video...")
        while True:
            file_info = client.files.get(name=uploaded_file.name)
            state = getattr(file_info.state, "name", file_info.state)
            if state == "ACTIVE":
                print("Video is ready for analysis!")
                break
            elif state == "FAILED":
                raise Exception("Gemini video processing failed.")
            
            print(".", end="", flush=True)
            await asyncio.sleep(3) # ให้ FastAPI รอ 3 วินาทีแบบไม่บล็อกการทำงานของเซิร์ฟเวอร์
        # ----------------------------------------------------------------------

        prompt = f"""
        คุณคือ AI แพทย์แผนไทยผู้เชี่ยวชาญด้านเวชกรรมและเภสัชกรรม (TTM)
        ข้อมูลผู้ป่วย (Precision Data):
        - อายุ: {patient_info.get('age', 45)} ปี, BMI คำนวณจาก น้ำหนัก {patient_info.get('weight', 70)} kg, ส่วนสูง {patient_info.get('height', 165)} cm
        - ระดับความปวด: {patient_info.get('pain_score', 0)} / 10
        - ความดัน: {patient_info.get('systolic', 120)}/{patient_info.get('diastolic', 80)}
        - eGFR: {patient_info.get('egfr', 100)}, AST/ALT: {patient_info.get('ast_alt', 20)}
        - โรคประจำตัว: {patient_info.get('underlying', 'ไม่มี')}, ประวัติแพ้ยา: {patient_info.get('allergies', 'ไม่มี')}

        วิเคราะห์วิดีโอ พยากรณ์โรคจับโปงแห้งเข่า จัดท่าฤๅษีดัดตน และจ่ายยา
        ตอบกลับเป็น JSON: {{"risk_level": "", "gait_defect": "", "ruesi_dat_ton": [], "medicine": {{"oral": {{"herb_name": "", "dosage": "", "pharmacology_reason": ""}}, "topical": {{"herb_name": "", "instructions": ""}}}}}}
        """

        response = client.models.generate_content(
            model='gemini-3.5-flash-lite', contents=[uploaded_file, prompt], config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        ai_result = json.loads(response.text)
        client.files.delete(name=uploaded_file.name)

        new_visit = GaitVisit(
            patient_id=int(patient_info.get('id', 1)), 
            age_at_visit=int(patient_info.get('age', 0)), weight=float(patient_info.get('weight', 0)), height=float(patient_info.get('height', 0)),
            pain_score=int(patient_info.get('pain_score', 0)), systolic=int(patient_info.get('systolic', 0)), diastolic=int(patient_info.get('diastolic', 0)),
            egfr=float(patient_info.get('egfr', 0)), ast_alt=float(patient_info.get('ast_alt', 0)),
            ai_risk_level=ai_result.get('risk_level', ''), ai_gait_defect=ai_result.get('gait_defect', ''), ai_ruesi_dat_ton=ai_result.get('ruesi_dat_ton', []), ai_medicine=ai_result.get('medicine', {})
        )
        db.add(new_visit)
        await db.commit()
        return ai_result
    except Exception as e:
        import traceback
        traceback.print_exc()  # 👈 สั่งให้แฉ Error พิมพ์ลงใน Log ของ Render
        print(f"🔥 Gemini Error Detail: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")
    finally:
        if temp_file_path and os.path.exists(temp_file_path): os.remove(temp_file_path)

@app.get("/api/v1/patients/{patient_id}/history")
async def get_patient_history(patient_id: int, x_clinic_id: int = Header(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(GaitVisit).filter(GaitVisit.patient_id == patient_id).order_by(GaitVisit.created_at.desc()).limit(10))
    visits = result.scalars().all()
    formatted = [{"id": v.id, "date": v.created_at.strftime("%d %b %Y"), "pain_score": v.pain_score, "systolic": v.systolic, "diastolic": v.diastolic, "egfr": v.egfr, "risk_level": v.ai_risk_level, "oral_med": v.ai_medicine.get("oral", {}).get("herb_name", "-") if v.ai_medicine else "-"} for v in visits]
    return {"status": "success", "data": formatted}