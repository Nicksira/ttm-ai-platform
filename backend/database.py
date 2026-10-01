# backend/database.py
from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text, JSON
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
import datetime

# --- 1. ตั้งค่าการเชื่อมต่อฐานข้อมูล (เปลี่ยนมาใช้ PostgreSQL บน Neon.tech แบบ Async) ---
# 💡 ก๊อปปี้ลิงก์จาก Neon มาวางตรงนี้ และอย่าลืมเปลี่ยนคำหน้าสุดเป็น postgresql+asyncpg://
DATABASE_URL = "postgresql+asyncpg://[ยูสเซอร์]:[รหัสผ่าน]@[เซิร์ฟเวอร์].neon.tech/neondb?sslmode=require"

engine = create_async_engine(DATABASE_URL, echo=True)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
Base = declarative_base()

# --- 2. ออกแบบโครงสร้างตาราง (Multi-Tenant Architecture) ---

class Clinic(Base):
    """ตารางหน่วยบริการ (Tenants): ข้อมูลของคลินิกหรือ รพ.สต. แต่ละแห่ง"""
    __tablename__ = "clinics"

    id = Column(Integer, primary_key=True, index=True)
    tenant_code = Column(String, unique=True, index=True) # เช่น "HOSP-107"
    name = Column(String)
    
    # ความสัมพันธ์: 1 คลินิก มีคนไข้ได้หลายคน
    patients = relationship("Patient", back_populates="clinic")

class Patient(Base):
    """ตารางประวัติผู้ป่วย: ผูกติดกับคลินิก (Tenant) ห้ามข้ามคลินิกเด็ดขาด"""
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    hn_code = Column(String, index=True) # รหัส HN
    clinic_id = Column(Integer, ForeignKey("clinics.id")) # 🔑 หัวใจของ Multi-Tenant
    
    # ข้อมูลส่วนตัว (ในระบบจริงควรเข้ารหัส (Encrypt) ก่อนลงฐานข้อมูล)
    name = Column(String)
    underlying_disease = Column(String, default="ไม่มี")
    current_meds = Column(String, default="ไม่มี")
    allergies = Column(String, default="ไม่มี")
    
    clinic = relationship("Clinic", back_populates="patients")
    visits = relationship("GaitVisit", back_populates="patient", order_by="desc(GaitVisit.created_at)")

class GaitVisit(Base):
    """ตารางประวัติการรักษา (Visits): เก็บผลลัพธ์จากการสแกน AI แต่ละครั้ง"""
    __tablename__ = "gait_visits"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # สัญญาณชีพและผลแล็บ ณ วันที่ตรวจ (Precision Data)
    age_at_visit = Column(Integer)
    weight = Column(Float)
    height = Column(Float)
    pain_score = Column(Integer)
    systolic = Column(Integer)
    diastolic = Column(Integer)
    egfr = Column(Float)
    ast_alt = Column(Float)
    
    # ผลลัพธ์จาก AI (เก็บเป็น JSON เพื่อความยืดหยุ่น)
    ai_risk_level = Column(String)
    ai_gait_defect = Column(Text)
    ai_ruesi_dat_ton = Column(JSON) # เก็บ List ของท่าบริหาร
    ai_medicine = Column(JSON) # เก็บโครงสร้างตำรับยา Oral และ Topical
    
    patient = relationship("Patient", back_populates="visits")

# --- 3. ฟังก์ชันสำหรับสร้างตารางในครั้งแรก ---
async def init_db():
    async with engine.begin() as conn:
        # สร้างตารางทั้งหมด (ถ้ายังไม่มี)
        await conn.run_sync(Base.metadata.create_all)

# --- 4. ฟังก์ชันสำหรับดึง Session ไปใช้งานใน API ---
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session