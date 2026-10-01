"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Activity, UploadCloud, Loader2, FileText, CheckCircle2, AlertCircle, User, Syringe, HeartPulse, ShieldAlert, Users, History, Save, Edit3, Plus, Search, Trash2, Edit, TrendingDown, TrendingUp, Minus, LogOut, KeyRound, Building2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function OsteoarthritisPredictiveAI() {
  
  // ==========================================
  // 🔐 ระบบ Login & Authentication
  // ==========================================
  const [authData, setAuthData] = useState<{ clinic_id: number, clinic_name: string, tenant_code: string } | null>(null);
  const [loginForm, setLoginForm] = useState({ tenant_code: "", password: "" });
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await fetch("https://ttm-precision-api.onrender.com/api/v1/auth/login", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(loginForm)
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setAuthData({ clinic_id: data.clinic_id, clinic_name: data.clinic_name, tenant_code: data.tenant_code });
      } else {
        alert("รหัสหน่วยบริการ หรือ รหัสผ่านไม่ถูกต้อง");
      }
    } catch (error) {
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm("ต้องการออกจากระบบใช่หรือไม่?")) {
      setAuthData(null);
      setPatientData({ id: 0, patient_id: "HN-WAITING", name: "โปรดเลือกผู้ป่วย...", age: 0, height: 0, weight: 0, pain_score: 0, systolic: 0, diastolic: 0, egfr: 0, ast_alt: 0, underlying: "ไม่มี", current_meds: "ไม่มี", allergies: "ไม่มี" });
    }
  };

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    "x-clinic-id": authData ? authData.clinic_id.toString() : "0"
  });


  // ==========================================
  // 🏥 ระบบ Medical AI
  // ==========================================
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [activeInput, setActiveInput] = useState<{ field: string, label: string, value: any, type: string } | null>(null);
  const [isPatientListOpen, setIsPatientListOpen] = useState(false);
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [patientHistory, setPatientHistory] = useState<any[]>([]);
  const [patientList, setPatientList] = useState<any[]>([]);

  const [patientData, setPatientData] = useState({
    id: 0, patient_id: "HN-WAITING", name: "โปรดเลือกผู้ป่วย...", age: 0, height: 0, weight: 0, pain_score: 0, systolic: 0, diastolic: 0, egfr: 0, ast_alt: 0, underlying: "ไม่มี", current_meds: "ไม่มี", allergies: "ไม่มี"
  });
  const [newPatient, setNewPatient] = useState({ hn_code: "", name: "", underlying_disease: "ไม่มี", current_meds: "ไม่มี", allergies: "ไม่มี" });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchPatients = async () => {
    if (!authData) return;
    try {
      const res = await fetch("https://ttm-precision-api.onrender.com/api/v1/patients", { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.status === "success") setPatientList(data.data);
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    if (authData) fetchPatients();
  }, [authData]);

  const openEditModal = (p: any) => {
    setIsEditMode(true); setEditingId(p.id);
    setNewPatient({ hn_code: p.hn_code, name: p.name, underlying_disease: p.underlying_disease || "ไม่มี", current_meds: p.current_meds || "ไม่มี", allergies: p.allergies || "ไม่มี" });
    setIsAddPatientOpen(true);
  };

  const handleSavePatient = async () => {
    if (!newPatient.hn_code || !newPatient.name) return alert("กรุณากรอก HN และ ชื่อ-นามสกุล");
    try {
      const url = isEditMode ? `https://ttm-precision-api.onrender.com/api/v1/patients/${editingId}` : "https://ttm-precision-api.onrender.com/api/v1/patients";
      const res = await fetch(url, { method: isEditMode ? "PUT" : "POST", headers: getAuthHeaders(), body: JSON.stringify(newPatient) });
      if (res.ok) { setIsAddPatientOpen(false); fetchPatients(); }
    } catch (error) { alert("เกิดข้อผิดพลาดในการบันทึก"); }
  };

  const handleDeletePatient = async (id: number, name: string) => {
    if (!confirm(`คุณต้องการลบข้อมูลผู้ป่วย: ${name} ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`https://ttm-precision-api.onrender.com/api/v1/patients/${id}`, { method: "DELETE", headers: getAuthHeaders() });
      if (res.ok) {
        fetchPatients();
        if (patientData.id === id) setPatientData({ ...patientData, id: 0, patient_id: "HN-WAITING", name: "โปรดเลือกผู้ป่วย..." });
      }
    } catch (error) { console.error(error); }
  };

  const selectPatient = (p: any) => {
    setPatientData({ ...patientData, id: p.id, patient_id: p.hn_code, name: p.name, underlying: p.underlying_disease, current_meds: p.current_meds, allergies: p.allergies });
    setIsPatientListOpen(false); setAnalysisResult(null); 
  };

  const fetchHistory = async () => {
    if (patientData.id === 0) return;
    try {
      const res = await fetch(`https://ttm-precision-api.onrender.com/api/v1/patients/${patientData.id}/history`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.status === "success") { setPatientHistory(data.data); setIsHistoryOpen(true); }
    } catch (error) { console.error(error); }
  };

  const openInputModal = (field: string, label: string, value: any, type: string = 'number') => { setActiveInput({ field, label, value, type }); };
  const saveInputModal = () => { if (activeInput) { setPatientData({ ...patientData, [activeInput.field]: activeInput.value }); setActiveInput(null); } };

  const handleAnalyze = async () => {
    if (patientData.id === 0) return alert("โปรดเลือกผู้ป่วยก่อนเริ่มวิเคราะห์!");
    if (!selectedVideo) return alert("กรุณาอัปโหลดวิดีโอสแกนการเดิน");
    
    setIsLoading(true);
    const formData = new FormData();
    formData.append("video", selectedVideo);
    formData.append("patient_data", JSON.stringify(patientData));

    try {
      const response = await fetch("https://ttm-precision-api.onrender.com/api/v1/gait-analysis", {
        method: "POST", 
        headers: { "x-clinic-id": authData!.clinic_id.toString() }, 
        body: formData,
      });
      if (!response.ok) throw new Error("AI Analysis Failed");
      const data = await response.json();
      setAnalysisResult(data);
      setIsResultModalOpen(true);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };


  // ==========================================
  // 🎨 RENDER หน้าจอ Login
  // ==========================================
  if (!authData) {
    return (
      <>
        {/* 🌟 พื้นหลังอิสระแบบยึดตรึง */}
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -10,
            backgroundImage: "url('/wallpaper.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
            backgroundColor: '#F5F5F7'
          }}
        >
          {/* กระจกฝ้าหน้า Login */}
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[4px]"></div>
        </div>

        {/* เนื้อหาหน้า Login */}
        <div className="relative z-10 min-h-screen flex items-center justify-center font-sans p-4">
          <div className="bg-white/90 backdrop-blur-xl p-8 sm:p-12 rounded-[2.5rem] shadow-[0_20px_60px_rgba(0,0,0,0.1)] border border-white max-w-md w-full">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 mx-auto shadow-sm overflow-hidden bg-white p-1.5">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">TTM Arthritis Precision Care</h1>
              <p className="text-gray-500 font-medium text-sm">เข้าสู่ระบบสำหรับหน่วยบริการ</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest pl-1">รหัสหน่วยบริการ (Tenant Code)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Building2 size={20} className="text-gray-400" /></div>
                  <input type="text" required autoFocus className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 pl-12 pr-4 text-gray-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                    placeholder="●●●●●●●" value={loginForm.tenant_code} onChange={(e) => setLoginForm({...loginForm, tenant_code: e.target.value.toUpperCase()})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-widest pl-1">รหัสผ่าน (Password)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><KeyRound size={20} className="text-gray-400" /></div>
                  <input type="password" required className="w-full bg-white border border-gray-200 rounded-2xl py-3.5 pl-12 pr-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm"
                    placeholder="●●●●●●●" value={loginForm.password} onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} />
                </div>
              </div>
              
              <button type="submit" disabled={loginLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold tracking-wide transition-colors mt-2 flex items-center justify-center gap-2 shadow-md">
                {loginLoading ? <Loader2 className="animate-spin" /> : "เข้าสู่ระบบ (Sign In)"}
              </button>

              {/* 🌟 ระบุรหัสทดสอบโปรแกรมด้านล่างปุ่ม Login */}
              <div className="pt-4 mt-2 text-center border-t border-gray-100/80">
                <p className="text-xs font-medium text-gray-400">
                  รหัสทดสอบโปรแกรม: <span className="font-bold text-gray-600 tracking-wide">TTM2026</span>
                </p>
              </div>
            </form>
          </div>
        </div>
      </>
    );
  }

  // ==========================================
  // 🎨 RENDER หน้าจอหลัก (Responsive UX/UI)
  // ==========================================
  return (
    <>
      {/* 🌟 พื้นหลังอิสระแบบยึดตรึง 100vw/100vh (สั่งล็อกตายตัว ไม่ให้รูปหายเวลาหดจอ) */}
      <div 
        style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -10,
          backgroundImage: "url('/wallpaper.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
          backgroundColor: '#f8f9fa'
        }}
      >
        {/* ฟิล์มดำบางๆ 5% ตัดแสงไม่ให้กลืนตัวหนังสือ */}
        <div className="absolute inset-0 bg-black/5"></div>
      </div>

      {/* 🌟 เนื้อหาหน้าแอป (ลอยอยู่บนพื้นหลัง) */}
      <div className="relative z-10 min-h-screen font-sans pb-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
          
          {/* Header สไตล์แอปสุขภาพ */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-8 sm:mb-10">
            <div className="flex items-center gap-4 sm:gap-5">
              
              {/* รูป Logo ขยายใหญ่ */}
              <div className="w-20 h-20 sm:w-25 sm:h-25 bg-white rounded-full p-1.5 shadow-sm shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                  <img src="/logo.png" alt="Clinic Logo" className="w-full h-full object-contain" />
                </div>
              </div>
              
              {/* ข้อมูลหน่วยบริการ */}
              <div>
                <p className="text-gray-500 font-semibold text-xs sm:text-sm mb-1">เครื่องมือการดูแลรักษาโรคข้อเข่าเสื่อมอย่างแม่นยำ</p>
                <h1 className="text-xl sm:text-2xl font-bold text-[#1a202c] tracking-tight truncate max-w-[250px] sm:max-w-none">TTM Arthritis Precision Care</h1>
                <p className="text-blue-600 font-bold text-xs mt-1 bg-blue-50 inline-block px-2 py-0.5 rounded shadow-sm">หน่วยบริการ {authData.tenant_code}</p>
              </div>
            </div>
            
            {/* ปุ่มเมนูด้านขวา */}
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <button onClick={() => setIsPatientListOpen(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white/90 backdrop-blur-md hover:bg-white text-gray-800 px-4 py-2.5 rounded-full shadow-sm border border-gray-100 font-medium transition-colors">
                <Users size={18} className="text-blue-600" />
                <span>รายชื่อผู้ป่วย</span>
              </button>
              <button onClick={handleLogout} className="flex shrink-0 items-center justify-center w-11 h-11 bg-white/90 backdrop-blur-md hover:bg-red-50 text-red-500 rounded-full shadow-sm border border-gray-100 transition-colors" title="ออกจากระบบ">
                <LogOut size={18} />
              </button>
            </div>
          </header>

          {/* ข้อมูลคนไข้ที่กำลังเลือก */}
          <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-sm ${patientData.id === 0 ? 'bg-orange-100 text-orange-700 border border-orange-200' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                  {patientData.patient_id}
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-gray-900 leading-tight">
                {patientData.name}
              </h2>
            </div>
            {patientData.id !== 0 && (
              <button 
                onClick={fetchHistory}
                className="w-full sm:w-auto flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 font-semibold bg-white/90 backdrop-blur-md px-5 py-3 rounded-2xl shadow-sm border border-gray-100 transition-colors"
              >
                <History size={18} className="text-blue-500" /> ประวัติย้อนหลัง 6 เดือน
              </button>
            )}
          </div>

          {/* 🍱 สถาปัตยกรรม UI แบบ Bento Box */}
          <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 transition-opacity ${patientData.id === 0 ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            
            <div className="lg:col-span-7 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                
                <div className="bg-[#1C1C1E]/95 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[280px]">
                  <div className="absolute top-6 right-6 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold tracking-wider">Vitals</div>
                  <div>
                    <HeartPulse className="text-red-400 mb-3" size={28} />
                    <p className="text-gray-400 font-medium text-sm">Blood Pressure</p>
                    <div className="flex items-baseline mb-6 mt-1">
                      <span className="text-[4.5rem] sm:text-[5rem] leading-none font-black tracking-tighter">
                        {patientData.systolic}/{patientData.diastolic}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-auto">
                    <BentoButton label="SYS" value={patientData.systolic} onClick={() => openInputModal('systolic', 'SYS', patientData.systolic, 'number')} dark />
                    <BentoButton label="DIA" value={patientData.diastolic} onClick={() => openInputModal('diastolic', 'DIA', patientData.diastolic, 'number')} dark />
                  </div>
                </div>

                <div className="bg-white/85 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/60 flex flex-col">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center"><User size={24} /></div>
                  </div>
                  <div className="space-y-4 mt-auto">
                    <BentoButton label="Age (Years)" value={patientData.age} onClick={() => openInputModal('age', 'อายุ', patientData.age, 'number')} />
                    <BentoButton label="Weight (kg)" value={patientData.weight} onClick={() => openInputModal('weight', 'น้ำหนัก (kg)', patientData.weight, 'number')} />
                    <BentoButton label="Height (cm)" value={patientData.height} onClick={() => openInputModal('height', 'ส่วนสูง (cm)', patientData.height, 'number')} />
                  </div>
                </div>
              </div>

              <div className="bg-white/85 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/60 flex flex-col sm:flex-row gap-6">
                <div className="flex-1 space-y-4 border-b sm:border-b-0 sm:border-r border-gray-100 pb-6 sm:pb-0 sm:pr-6">
                  <div className="flex items-center gap-2 mb-3 text-gray-800 font-bold"><Syringe size={18} className="text-blue-500"/> Lab Results</div>
                  <div className="grid grid-cols-2 gap-4">
                    <BentoButton label="eGFR (ไต)" value={patientData.egfr} onClick={() => openInputModal('egfr', 'eGFR', patientData.egfr, 'number')} />
                    <BentoButton label="AST/ALT" value={patientData.ast_alt} onClick={() => openInputModal('ast_alt', 'AST/ALT', patientData.ast_alt, 'number')} />
                  </div>
                </div>
                <div className="w-full sm:w-1/3 space-y-4">
                  <div className="flex items-center gap-2 mb-3 text-gray-800 font-bold"><AlertCircle size={18} className="text-orange-500"/> Symptoms</div>
                  <BentoButton label="Pain Score (0-10)" value={patientData.pain_score} onClick={() => openInputModal('pain_score', 'Pain Score', patientData.pain_score, 'number')} />
                </div>
              </div>

              <div className="bg-white/85 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/60 space-y-4">
                <div className="flex items-center gap-2 mb-3 text-gray-800 font-bold"><ShieldAlert size={18} className="text-red-500"/> Clinical History</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <BentoButton label="โรคประจำตัว" value={patientData.underlying} onClick={() => openInputModal('underlying', 'โรคประจำตัว', patientData.underlying, 'text')} />
                  <BentoButton label="ยาแผนปัจจุบัน" value={patientData.current_meds} onClick={() => openInputModal('current_meds', 'ยาแผนปัจจุบัน', patientData.current_meds, 'text')} />
                  <BentoButton label="ประวัติแพ้ยา" value={patientData.allergies} onClick={() => openInputModal('allergies', 'ประวัติแพ้ยา', patientData.allergies, 'text')} />
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 h-full">
              <div className="bg-white/85 backdrop-blur-xl rounded-[2.5rem] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-white/60 h-full flex flex-col">
                <div className="flex-grow">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">สแกนวิดีโอวิเคราะห์ท่าทางการเดิน</h3>
                  <p className="text-gray-500 text-sm mb-6">อัปโหลดวิดีโอการเดิน 5-10 วินาที เพื่อวิเคราะห์องศาเฟรมต่อเฟรม</p>
                  <label className="flex flex-col items-center justify-center w-full h-56 sm:h-64 border-[3px] border-dashed border-gray-300/50 rounded-[2rem] cursor-pointer bg-white/50 hover:bg-white transition-colors group relative overflow-hidden">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-600 relative z-10">
                      <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 group-hover:-translate-y-1 transition-transform border border-gray-100">
                        <UploadCloud size={32} className="text-blue-500" />
                      </div>
                      <p className="font-semibold text-gray-800">แตะเพื่อเปิดกล้อง</p>
                    </div>
                    <input type="file" className="hidden" accept="video/*" capture="environment" ref={fileInputRef} onChange={(e) => { if (e.target.files && e.target.files[0]) setSelectedVideo(e.target.files[0]); }} />
                  </label>
                  {selectedVideo && (
                    <div className="mt-4 bg-green-50 rounded-2xl p-4 flex items-center gap-3 border border-green-100">
                      <CheckCircle2 className="text-green-500 shrink-0" />
                      <p className="text-sm font-medium text-green-800 truncate">{selectedVideo.name}</p>
                    </div>
                  )}
                </div>
                <div className="mt-8 space-y-3">
                  <button onClick={handleAnalyze} disabled={isLoading || !selectedVideo || patientData.id === 0} className="w-full bg-[#1C1C1E] hover:bg-black text-white py-5 rounded-[2rem] font-bold transition-all disabled:opacity-50 shadow-lg flex justify-center items-center gap-3 text-lg group">
                    {isLoading ? <Loader2 className="animate-spin" /> : <Activity className="group-hover:rotate-12 transition-transform" />}
                    {isLoading ? "Analyzing Frames..." : "Run AI Analysis"}
                  </button>
                  {analysisResult && !isLoading && (
                    <button onClick={() => setIsResultModalOpen(true)} className="w-full bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 py-4 rounded-[2rem] font-semibold transition-colors shadow-sm">
                      ดูผลการวิเคราะห์ล่าสุด
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ✨ Modals
            ========================================================================= */}
        
        {activeInput && (
          <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl relative">
              <h3 className="text-center font-bold text-gray-900 mb-6 text-lg">ระบุข้อมูล: {activeInput.label}</h3>
              <div className="mb-6">
                {activeInput.type === 'text' ? (
                  <textarea autoFocus className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 h-32" value={activeInput.value} onChange={(e) => setActiveInput({...activeInput, value: e.target.value})} />
                ) : (
                  <input type="number" autoFocus className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center text-3xl font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" value={activeInput.value} onChange={(e) => setActiveInput({...activeInput, value: e.target.value})} />
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setActiveInput(null)} className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold">ยกเลิก</button>
                <button onClick={saveInputModal} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold">บันทึก</button>
              </div>
            </div>
          </div>
        )}

        {isPatientListOpen && (
          <div className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
              <div className="p-6 sm:px-8 sm:py-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 bg-gray-50/50">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3"><Users className="text-blue-500"/> ฐานข้อมูลผู้ป่วย</h2>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button onClick={() => { setIsEditMode(false); setNewPatient({hn_code: "", name: "", underlying_disease: "ไม่มี", current_meds: "ไม่มี", allergies: "ไม่มี"}); setIsAddPatientOpen(true); }} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl sm:rounded-full text-sm font-semibold flex items-center justify-center gap-1 transition-colors"><Plus size={16}/> เพิ่มผู้ป่วย</button>
                  <button onClick={() => setIsPatientListOpen(false)} className="w-11 h-11 sm:w-10 sm:h-10 shrink-0 bg-gray-200 rounded-xl sm:rounded-full flex items-center justify-center text-gray-700 font-bold">✕</button>
                </div>
              </div>
              
              <div className="p-4 sm:p-8 overflow-y-auto bg-gray-50/30 flex-grow">
                {patientList.length === 0 ? (
                  <div className="text-center text-gray-400 py-12">ไม่พบรายชื่อผู้ป่วย โปรดลงทะเบียนใหม่</div>
                ) : (
                  <div className="space-y-3">
                    {patientList.map((p) => (
                      <div key={p.id} className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-blue-300 transition-colors">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] sm:text-xs font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">{p.hn_code}</span>
                          </div>
                          <h4 className="text-base sm:text-lg font-bold text-gray-900">{p.name}</h4>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button onClick={() => openEditModal(p)} className="p-2 sm:p-2.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-colors" title="แก้ไข">
                            <Edit size={18} />
                          </button>
                          <button onClick={() => handleDeletePatient(p.id, p.name)} className="p-2 sm:p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors" title="ลบ">
                            <Trash2 size={18} />
                          </button>
                          <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block"></div>
                          <button onClick={() => selectPatient(p)} className="flex-1 sm:flex-none bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors">
                            เลือกผู้ป่วย
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {isAddPatientOpen && (
          <div className="fixed inset-0 z-[130] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] w-full max-w-md p-6 sm:p-8 shadow-2xl relative">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6">{isEditMode ? "แก้ไขข้อมูลผู้ป่วย" : "ลงทะเบียนผู้ป่วยใหม่"}</h3>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">รหัส HN</label>
                  <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={newPatient.hn_code} onChange={(e) => setNewPatient({...newPatient, hn_code: e.target.value})} placeholder="●●●●●●"/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">ชื่อ-นามสกุล</label>
                  <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium" value={newPatient.name} onChange={(e) => setNewPatient({...newPatient, name: e.target.value})} placeholder="●●●●●●"/>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">โรคประจำตัว</label>
                    <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={newPatient.underlying_disease} onChange={(e) => setNewPatient({...newPatient, underlying_disease: e.target.value})}/>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">ประวัติแพ้ยา</label>
                    <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={newPatient.allergies} onChange={(e) => setNewPatient({...newPatient, allergies: e.target.value})}/>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => setIsAddPatientOpen(false)} className="w-full bg-gray-100 text-gray-700 py-3.5 rounded-2xl font-semibold">ยกเลิก</button>
                <button onClick={handleSavePatient} className="w-full bg-blue-600 text-white py-3.5 rounded-2xl font-semibold">{isEditMode ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}</button>
              </div>
            </div>
          </div>
        )}

        {isResultModalOpen && analysisResult && (
          <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            <div className="bg-[#F5F5F7] rounded-[2.5rem] sm:rounded-[3rem] w-full max-w-5xl max-h-[95vh] overflow-hidden shadow-2xl relative flex flex-col font-sans">
              <button onClick={() => setIsResultModalOpen(false)} className="absolute top-4 right-4 sm:top-6 sm:right-6 w-10 h-10 sm:w-12 sm:h-12 bg-gray-200/80 hover:bg-gray-300 backdrop-blur-md rounded-full flex items-center justify-center text-gray-700 transition-transform hover:scale-105 z-50 shadow-sm">✕</button>

              <div className="bg-white px-6 pt-10 pb-6 sm:px-10 sm:pt-12 sm:pb-8 rounded-b-[2rem] sm:rounded-b-[3rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] z-40 relative border-b border-gray-100/50">
                <p className="text-gray-400 font-bold tracking-widest text-[10px] sm:text-xs uppercase mb-1 sm:mb-2 text-center">AI Medical Report</p>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-gray-900 text-center">แผนการรักษาเฉพาะบุคคล</h2>
              </div>

              <div className="p-4 sm:p-6 md:p-10 overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                  
                  <div className="lg:col-span-5 space-y-6">
                    <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm">
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-red-50 rounded-full flex items-center justify-center">
                          <AlertCircle className="text-red-500" size={28} />
                        </div>
                        <span className="bg-red-100 text-red-700 px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wide">Danger</span>
                      </div>
                      <p className="text-gray-400 text-xs sm:text-sm font-semibold mb-2">ความเสี่ยงจับโปงแห้งเข่า</p>
                      <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 leading-tight mb-4">{analysisResult.risk_level}</h3>
                      <p className="text-gray-600 leading-relaxed text-xs sm:text-sm bg-gray-50 p-4 rounded-2xl">{analysisResult.gait_defect}</p>
                    </div>

                    <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 rounded-full flex items-center justify-center">
                          <Activity className="text-blue-600" size={20} />
                        </div>
                        <p className="text-gray-900 font-bold text-base sm:text-lg">ฤๅษีดัดตน</p>
                      </div>
                      <ul className="space-y-4">
                        {analysisResult.ruesi_dat_ton?.map((pose: string, i: number) => (
                          <li key={i} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl bg-blue-50/50 border border-blue-50">
                            <span className="w-6 h-6 sm:w-8 sm:h-8 shrink-0 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs sm:text-sm font-bold shadow-sm mt-0.5">{i+1}</span>
                            <span className="text-gray-800 font-medium leading-relaxed text-sm">{pose}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="lg:col-span-7">
                    <div className="bg-white p-6 sm:p-8 md:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm h-full flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-60 h-60 sm:w-80 sm:h-80 bg-green-100/50 rounded-full blur-3xl opacity-60 pointer-events-none -mr-20 -mt-20"></div>
                      
                      <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8 relative z-10">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 bg-[#1C1C1E] rounded-full flex items-center justify-center shadow-md">
                          <FileText className="text-white" size={20} />
                        </div>
                        <div>
                          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Precision Rx (ยาแผนไทย)</h3>
                          <p className="text-gray-500 text-xs sm:text-sm font-medium">ปรับขนาดตามค่า eGFR และ AST/ALT</p>
                        </div>
                      </div>
                      
                      <div className="space-y-6 sm:space-y-8 relative z-10 flex-grow">
                        <div className="bg-[#F8F9FA] p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-gray-100 hover:border-green-200 transition-colors">
                          <div className="flex items-center gap-2 mb-3 sm:mb-4">
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500 shadow-sm"></div>
                            <h4 className="text-gray-500 font-bold text-[10px] sm:text-xs tracking-widest uppercase">Oral Treatment</h4>
                          </div>
                          <h4 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">{analysisResult.medicine?.oral?.herb_name}</h4>
                          <div className="inline-block bg-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-sm border border-gray-100 mb-4 sm:mb-5">
                            <span className="text-green-700 font-bold text-xs sm:text-sm tracking-wide">Dose: {analysisResult.medicine?.oral?.dosage}</span>
                          </div>
                          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm text-gray-600 text-xs sm:text-sm leading-relaxed font-medium">
                            {analysisResult.medicine?.oral?.pharmacology_reason}
                          </div>
                        </div>

                        <div className="bg-[#F8F9FA] p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2rem] border border-gray-100 hover:border-orange-200 transition-colors">
                          <div className="flex items-center gap-2 mb-3 sm:mb-4">
                            <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-orange-400 shadow-sm"></div>
                            <h4 className="text-gray-500 font-bold text-[10px] sm:text-xs tracking-widest uppercase">Topical Treatment</h4>
                          </div>
                          <h4 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">{analysisResult.medicine?.topical?.herb_name}</h4>
                          <p className="text-gray-600 text-xs sm:text-sm leading-relaxed font-medium bg-white p-4 rounded-xl shadow-sm border border-gray-50">
                            {analysisResult.medicine?.topical?.instructions}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isHistoryOpen && (
          <div className="fixed inset-0 z-[140] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-[#F5F5F7] rounded-[2.5rem] sm:rounded-[3rem] w-full max-w-5xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col font-sans">
              
              <div className="bg-white p-5 sm:px-8 sm:py-6 rounded-b-[2rem] sm:rounded-b-[2.5rem] shadow-[0_4px_20px_rgb(0,0,0,0.03)] flex justify-between items-center z-10 border-b border-gray-100">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2"><History className="text-blue-500"/> ประวัติและแนวโน้มการรักษา</h2>
                  <p className="text-gray-500 text-xs sm:text-sm mt-1">{patientData.name} • {patientData.patient_id}</p>
                </div>
                <button onClick={() => setIsHistoryOpen(false)} className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-700 font-bold transition-colors">✕</button>
              </div>

              <div className="p-4 sm:p-8 overflow-y-auto flex-grow">
                {patientHistory.length === 0 ? (
                  <div className="text-center text-gray-400 py-12 flex flex-col items-center">
                    <Activity size={48} className="opacity-20 mb-4" />
                    <p>ยังไม่มีประวัติการวิเคราะห์ด้วย AI สำหรับผู้ป่วยรายนี้</p>
                  </div>
                ) : (
                  <div className="space-y-6 sm:space-y-8">
                    
                    {patientHistory.length >= 2 && (
                      <div className="bg-white p-6 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-gray-100">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6 sm:mb-8">
                          <div>
                            <h3 className="font-bold text-lg sm:text-xl text-gray-900 flex items-center gap-2">
                              <TrendingDown className="text-blue-500"/> AI Trend Analysis
                            </h3>
                            <p className="text-gray-500 text-xs sm:text-sm mt-1">เปรียบเทียบระดับความปวด (Pain Score) ย้อนหลัง</p>
                          </div>
                          
                          {(() => {
                            const latest = patientHistory[0].pain_score;
                            const previous = patientHistory[1].pain_score;
                            if (latest < previous) return (<div className="bg-green-100 text-green-700 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm"><TrendingDown size={16}/> อาการดีขึ้น</div>);
                            if (latest > previous) return (<div className="bg-red-100 text-red-700 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm"><TrendingUp size={16}/> อาการแย่ลง</div>);
                            return (<div className="bg-blue-100 text-blue-700 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm"><Minus size={16}/> อาการคงที่</div>);
                          })()}
                        </div>

                        <div className="h-56 sm:h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={[...patientHistory].reverse().map((v, i) => ({ name: `ครั้งที่ ${i+1}`, pain_score: v.pain_score, date: v.date }))}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#888'}} dy={10} />
                              <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#888'}} dx={-10} width={30} />
                              <Tooltip cursor={{stroke: '#f5f5f5', strokeWidth: 2}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', fontWeight: 'bold'}} />
                              <Line type="monotone" dataKey="pain_score" name="Pain Score" stroke="#3b82f6" strokeWidth={4} dot={{r: 5, fill: '#3b82f6', strokeWidth: 3, stroke: '#fff'}} activeDot={{r: 7, fill: '#2563eb', stroke: '#fff', strokeWidth: 3}} animationDuration={1500} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    <div>
                      <h3 className="font-bold text-gray-800 mb-4 px-2 text-sm sm:text-base">ประวัติการรักษาทั้งหมด</h3>
                      <div className="space-y-4">
                        {patientHistory.map((visit, index) => (
                          <div key={visit.id} className="bg-white p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 sm:gap-6 items-start md:items-center hover:border-blue-200 transition-colors">
                            <div className="w-full md:w-1/4 flex flex-row md:flex-col justify-between md:justify-start items-center md:items-start border-b md:border-b-0 md:border-r border-gray-100 pb-3 md:pb-0 md:pr-4">
                              <div className="inline-block bg-gray-100 text-gray-700 px-2 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold mb-0 md:mb-2">ครั้งที่ {patientHistory.length - index}</div>
                              <h4 className="text-base sm:text-lg font-bold text-gray-900">{visit.date}</h4>
                            </div>
                            <div className="w-full md:w-3/4 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                              <div className="bg-gray-50/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-gray-100/50">
                                <p className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 mb-1">Pain Score</p>
                                <p className={`text-xl sm:text-2xl font-bold ${visit.pain_score > 6 ? 'text-red-500' : 'text-green-500'}`}>{visit.pain_score}/10</p>
                              </div>
                              <div className="bg-gray-50/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-gray-100/50 flex flex-col justify-center">
                                <p className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 mb-1">ความเสี่ยง</p>
                                <p className="text-xs sm:text-sm font-bold text-gray-800 line-clamp-2">{visit.risk_level}</p>
                              </div>
                              <div className="bg-gray-50/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-gray-100/50 flex flex-col justify-center">
                                <p className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 mb-1">ยาที่จ่าย (Oral)</p>
                                <p className="text-xs sm:text-sm font-bold text-green-700 line-clamp-2">{visit.oral_med}</p>
                              </div>
                              <div className="bg-gray-50/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center border border-gray-100/50 flex flex-col justify-center">
                                <p className="text-[9px] sm:text-[10px] uppercase font-bold text-gray-400 mb-1">eGFR (ไต)</p>
                                <p className="text-lg sm:text-xl font-bold text-gray-700">{visit.egfr}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

function BentoButton({ label, value, onClick, dark = false }: any) {
  return (
    <button onClick={onClick} className={`w-full text-left p-3 sm:p-4 rounded-2xl transition-transform active:scale-95 ${dark ? 'bg-white/10 hover:bg-white/20' : 'bg-gray-50/80 hover:bg-gray-100 border border-gray-100/50'}`}>
      <label className={`block text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-1 cursor-pointer ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</label>
      <div className={`text-sm sm:text-base font-bold truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{value || <span className="opacity-50 font-normal">ว่าง...</span>}</div>
    </button>
  );
}