
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, Table as TableIcon, BarChart3, Save, Trash2, 
  Calendar, ChevronRight, Wand2, Printer, ArrowUpRight,
  X, Check, AlertCircle, Info, Filter, User, UserCheck,
  CheckCircle2, ChevronDown, ChevronUp, ArrowRight,
  ListFilter, LayoutGrid, Search, Tag, Droplets, Download, FileSpreadsheet
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { MonthlyRecord, HouseholdReading, CommercialReading, InspectorRole, ReadingDiff } from './types';
import { COMMERCIAL_UNITS, HOUSEHOLD_COLUMNS, APP_TITLE } from './constants';

const App: React.FC = () => {
  // --- 상태 관리 ---
  const [records, setRecords] = useState<MonthlyRecord[]>([]);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'household' | 'commercial' | 'main' | 'summary'>('household');
  const [selectedFloor, setSelectedFloor] = useState<string>('2층');
  const [selectedUnit, setSelectedUnit] = useState<string>('1호');
  
  // 전역 검침 수행자 세션
  const [activeInspector, setActiveInspector] = useState<InspectorRole>(InspectorRole.CHIEF);
  
  // 모달 상태
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newMonthInput, setNewMonthInput] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  // 필드 레이블 변환 맵
  const fieldLabels: Record<string, string> = {
    water: '급수',
    heating: '난방',
    hotWater: '온수',
    outdoorUnit: '실외기'
  };

  // --- 데이터 로드 및 저장 ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem('meter_records_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecords(parsed);
          if (parsed.length > 0) {
            const sorted = [...parsed].sort((a, b) => a.id.localeCompare(b.id));
            setCurrentRecordId(sorted[sorted.length - 1].id);
          }
        }
      }
    } catch (e) {
      console.error("데이터 로딩 오류:", e);
      localStorage.removeItem('meter_records_v2');
    }
  }, []);

  useEffect(() => {
    if (records.length > 0) {
      localStorage.setItem('meter_records_v2', JSON.stringify(records));
    } else {
      localStorage.removeItem('meter_records_v2');
    }
  }, [records]);

  // --- 계산된 값들 ---
  const currentRecord = useMemo(() => 
    records.find(r => r.id === currentRecordId) || null
  , [records, currentRecordId]);

  const prevRecord = useMemo(() => {
    if (!currentRecordId) return null;
    const sorted = [...records].sort((a, b) => a.id.localeCompare(b.id));
    const index = sorted.findIndex(r => r.id === currentRecordId);
    return index > 0 ? sorted[index - 1] : null;
  }, [records, currentRecordId]);

  const getRoomLabel = (floor: string, unit: string) => {
    const f = parseInt(floor);
    const u = parseInt(unit.replace('호', ''));
    return `${f}${u < 10 ? '0' + u : u}호`;
  };

  const activeHousehold = useMemo(() => {
    if (!currentRecord) return null;
    const originalIndex = currentRecord.households.findIndex(h => h.floor === selectedFloor && h.unit === selectedUnit);
    if (originalIndex === -1) return null;
    return { ...currentRecord.households[originalIndex], originalIndex };
  }, [currentRecord, selectedFloor, selectedUnit]);

  const isUnitCompleted = (floor: string, unit: string) => {
    const h = currentRecord?.households.find(h => h.floor === floor && h.unit === unit);
    return !!h && (h.water !== '' || h.heating !== '' || h.outdoorUnit !== '' || h.hotWater !== '');
  };

  // --- 핸들러 함수 ---
  
  const handleUpdateHousehold = (originalIndex: number, field: keyof HouseholdReading, value: string) => {
    if (!currentRecordId) return;
    setRecords(prev => prev.map(r => {
      if (r.id !== currentRecordId) return r;
      const updated = [...r.households];
      const finalVal = value === '' ? '' : parseFloat(value);
      
      updated[originalIndex] = { 
        ...updated[originalIndex], 
        [field]: finalVal,
        inspector: activeInspector 
      } as HouseholdReading;
      return { ...r, households: updated };
    }));
  };

  const handleUpdateCommercial = (originalIndex: number, field: keyof CommercialReading, value: string) => {
    if (!currentRecordId) return;
    setRecords(prev => prev.map(r => {
      if (r.id !== currentRecordId) return r;
      const updated = [...r.commercials];
      const finalVal = value === '' ? '' : parseFloat(value);
      
      updated[originalIndex] = { 
        ...updated[originalIndex], 
        [field]: finalVal,
        inspector: activeInspector 
      } as CommercialReading;
      return { ...r, commercials: updated };
    }));
  };

  const openCreateModal = () => {
    const today = new Date();
    setNewMonthInput(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  const handleCreateMonth = () => {
    if (!/^\d{4}-\d{2}$/.test(newMonthInput)) {
      setCreateError("YYYY-MM 형식을 확인해주세요.");
      return;
    }
    if (records.some(r => r.id === newMonthInput)) {
      setCreateError("이미 존재하는 월입니다.");
      return;
    }
    const [year, month] = newMonthInput.split('-');
    const newRecord: MonthlyRecord = {
      id: newMonthInput,
      name: `${year}년 ${parseInt(month)}월`,
      mainMeter: '',
      households: Array.from({ length: 16 * 19 }, (_, i) => {
        const f = Math.floor(i / 19) + 2;
        const u = (i % 19) + 1;
        return {
          floor: `${f}층`, unit: `${u}호`, inspector: InspectorRole.CHIEF,
          outdoorUnit: '', heating: '', hotWater: '', water: '',
          elec13: '', elec14: '', elec15: '', elec16: '', elec17: '', elec19: '', elec20: ''
        };
      }),
      commercials: COMMERCIAL_UNITS.map(unit => ({ unit, inspector: InspectorRole.CHIEF, water: '' }))
    };
    setRecords(prev => [...prev, newRecord].sort((a, b) => a.id.localeCompare(b.id)));
    setCurrentRecordId(newMonthInput);
    setIsCreateModalOpen(false);
  };

  const handleExportToExcel = () => {
    if (!currentRecord) return;

    // 1. 세대 검침 데이터 가공
    const householdData = currentRecord.households.map(h => ({
      '층': h.floor,
      '호': h.unit,
      '담당자': h.inspector,
      '실외기': h.outdoorUnit,
      '난방': h.heating,
      '온수': h.hotWater,
      '급수': h.water,
      '전기13': h.elec13,
      '전기14': h.elec14,
      '전기15': h.elec15,
      '전기16': h.elec16,
      '전기17': h.elec17,
      '전기19': h.elec19,
      '전기20': h.elec20,
    }));

    // 2. 상가 검침 데이터 가공
    const commercialData = currentRecord.commercials.map(c => ({
      '호수': c.unit,
      '담당자': c.inspector,
      '수도계량검침': c.water,
    }));

    // 3. 상수도 메인 데이터 가공
    const mainMeterData = [{
      '항목': '상수도 메인 계량기',
      '검침값': currentRecord.mainMeter,
      '전월 검침값': prevRecord?.mainMeter || 0,
      '당월 사용량': currentRecord.mainMeter !== '' && prevRecord?.mainMeter !== '' 
        ? ((currentRecord.mainMeter as number) - (prevRecord?.mainMeter as number || 0)).toFixed(2) 
        : '-'
    }];

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    
    // 시트 추가
    const wsHouseholds = XLSX.utils.json_to_sheet(householdData);
    XLSX.utils.book_append_sheet(wb, wsHouseholds, "세대검침");
    
    const wsCommercials = XLSX.utils.json_to_sheet(commercialData);
    XLSX.utils.book_append_sheet(wb, wsCommercials, "상가검침");
    
    const wsMain = XLSX.utils.json_to_sheet(mainMeterData);
    XLSX.utils.book_append_sheet(wb, wsMain, "상수도메인");

    // 파일 다운로드
    XLSX.writeFile(wb, `검침기록_${currentRecord.id}.xlsx`);
  };

  const floors = Array.from({ length: 16 }, (_, i) => `${i + 2}층`);
  const units = Array.from({ length: 19 }, (_, i) => `${i + 1}호`);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* --- 상단 헤더 (모바일에서도 가로 정렬 유지) --- */}
      <header className="bg-slate-900 text-white px-4 md:px-6 py-4 shadow-2xl sticky top-0 z-50 print:hidden">
        <div className="max-w-[1600px] mx-auto flex justify-between items-center gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg md:rounded-xl">
              <TableIcon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <h1 className="text-sm md:text-xl font-black tracking-tight truncate">{APP_TITLE}</h1>
          </div>
          <div className="flex items-center gap-2">
            <select 
              className="bg-slate-800 border-none rounded-lg px-2 md:px-4 py-1.5 md:py-2 text-[10px] md:text-sm font-bold outline-none cursor-pointer"
              value={currentRecordId || ''}
              onChange={(e) => setCurrentRecordId(e.target.value)}
            >
              {records.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-500 px-3 md:px-5 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-sm font-black transition-all whitespace-nowrap">
              <Plus className="w-3 h-3 md:w-4 md:h-4 inline mr-1" /> 새 월 생성
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 md:p-8 space-y-4 md:y-6">
        {!currentRecord ? (
          <div className="h-[50vh] flex flex-col items-center justify-center text-slate-400">
            <Calendar className="w-16 h-16 mb-4 opacity-20" />
            <p className="font-bold text-center">데이터를 선택하거나 새로 생성해주세요.</p>
          </div>
        ) : (
          <>
            {/* 검침 수행자 설정 위젯 (모바일에서도 가로 구성 유지) */}
            <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border-2 border-emerald-100 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-4 w-full md:w-auto">
                 <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">검침 수행자 선택:</span>
                 <div className="flex flex-1 md:flex-none bg-slate-100 rounded-xl p-1">
                    {[InspectorRole.CHIEF, InspectorRole.MANAGER].map(role => (
                      <button
                        key={role}
                        onClick={() => setActiveInspector(role)}
                        className={`flex-1 md:flex-none px-4 md:px-8 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-black transition-all ${activeInspector === role ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {role}
                      </button>
                    ))}
                 </div>
              </div>
              <div className="flex items-center gap-2.5 px-6 py-2 md:py-3 bg-slate-900 text-white rounded-xl md:rounded-2xl text-[10px] md:text-sm font-black shadow-lg w-full md:w-auto justify-center">
                <UserCheck className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" /> {activeInspector} 모드 가동 중
              </div>
            </div>

            {/* 탭 영역 (모바일에서도 가로 스크롤 가능하게) */}
            <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col min-h-[600px] md:min-h-[700px]">
              <div className="flex bg-slate-100/50 p-1 md:p-2 gap-1 md:gap-2 border-b border-slate-200 overflow-x-auto no-scrollbar">
                {[
                  { id: 'household', label: '세대 검침', icon: TableIcon },
                  { id: 'commercial', label: '상가 검침', icon: BarChart3 },
                  { id: 'main', label: '상수도 메인', icon: Droplets },
                  { id: 'summary', label: '작업 이력', icon: Search },
                ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl text-[11px] md:text-sm font-black transition-all whitespace-nowrap flex-1 md:flex-none ${activeTab === tab.id ? 'bg-white shadow-lg text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'}`}
                  >
                    <tab.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* 세대 검침 */}
              {activeTab === 'household' && (
                <div className="flex flex-col lg:flex-row h-full">
                  {/* 사이드바: 층/호실 선택 */}
                  <div className="w-full lg:w-96 border-r border-slate-100 flex flex-col bg-slate-50/50 p-4 md:p-6 space-y-4 md:space-y-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">빠른 층/호실 이동</label>
                      <div className="grid grid-cols-2 gap-2 md:gap-3">
                        <select 
                          value={selectedFloor} 
                          onChange={(e) => { setSelectedFloor(e.target.value); setSelectedUnit('1호'); }}
                          className="bg-white border-2 border-slate-100 rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-[11px] md:text-sm font-black outline-none focus:border-blue-400"
                        >
                          {floors.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <select 
                          value={selectedUnit} 
                          onChange={(e) => setSelectedUnit(e.target.value)}
                          className="bg-white border-2 border-slate-100 rounded-xl px-3 py-2.5 md:px-4 md:py-3 text-[11px] md:text-sm font-black outline-none focus:border-blue-400"
                        >
                          {units.map(u => <option key={u} value={u}>{getRoomLabel(selectedFloor, u)}</option>)}
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-auto max-h-[300px] md:max-h-full no-scrollbar">
                      <div className="grid grid-cols-3 md:grid-cols-3 gap-2">
                        {units.map(u => {
                           const completed = isUnitCompleted(selectedFloor, u);
                           const h = currentRecord.households.find(h => h.floor === selectedFloor && h.unit === u);
                           return (
                            <button 
                              key={u}
                              onClick={() => setSelectedUnit(u)}
                              className={`py-2.5 md:py-3 rounded-xl md:rounded-2xl text-[11px] font-black transition-all border-2 relative ${selectedUnit === u ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105 z-10' : completed ? 'bg-emerald-100 border-emerald-200 text-emerald-800' : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'}`}
                            >
                              {getRoomLabel(selectedFloor, u).replace('호', '')}
                              {completed && (
                                <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                                   <Tag className={`w-2.5 h-2.5 ${h?.inspector === InspectorRole.CHIEF ? 'text-emerald-500' : 'text-indigo-500'}`} fill="currentColor" />
                                </div>
                              )}
                            </button>
                           );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* 세부 검침 입력 영역 */}
                  <div className="flex-1 bg-white p-6 md:p-8 lg:p-12 overflow-auto">
                    {activeHousehold && (
                      <div className="max-w-2xl mx-auto space-y-6 md:space-y-10">
                        <div className="flex justify-between items-end border-b-2 border-slate-50 pb-4 md:pb-6">
                           <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter">{getRoomLabel(selectedFloor, selectedUnit)}</h2>
                           <div className={`flex items-center gap-1.5 md:gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black ${activeHousehold.inspector === InspectorRole.CHIEF ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                             <User className="w-3.5 h-3.5 md:w-4 md:h-4" />
                             최종 입력: {activeHousehold.inspector}
                           </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                           <div className="space-y-4 md:space-y-6">
                             <h3 className="text-[10px] md:text-[11px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 border-b border-blue-50 pb-1">
                               <LayoutGrid className="w-3.5 h-3.5 md:w-4 md:h-4" /> 수도 및 에너지
                             </h3>
                             {['water', 'heating', 'hotWater', 'outdoorUnit'].map(field => (
                               <div key={field} className="relative group">
                                  <label className="text-[12px] md:text-[14px] font-black text-slate-800 uppercase ml-1 block mb-1">
                                    {fieldLabels[field] || field}
                                  </label>
                                  <input 
                                    type="number"
                                    value={activeHousehold[field as keyof HouseholdReading] || ''}
                                    onChange={(e) => handleUpdateHousehold(activeHousehold.originalIndex, field as keyof HouseholdReading, e.target.value)}
                                    className="w-full h-12 md:h-16 bg-slate-50 border-2 border-transparent rounded-xl md:rounded-2xl px-4 md:px-6 text-right font-black text-xl md:text-2xl focus:bg-white focus:border-blue-400 outline-none transition-all"
                                    placeholder="0.00"
                                  />
                               </div>
                             ))}
                           </div>
                           <div className="space-y-4">
                             <h3 className="text-[10px] md:text-[11px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2 border-b border-indigo-50 pb-1">
                               <BarChart3 className="w-3.5 h-3.5 md:w-4 md:h-4" /> 전기 설비
                             </h3>
                             <div className="bg-slate-50 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] space-y-2 md:space-y-3">
                               {['elec13', 'elec14', 'elec15', 'elec16', 'elec17', 'elec19', 'elec20'].map(field => (
                                 <div key={field} className="flex items-center gap-2 md:gap-4">
                                    <span className="text-[11px] md:text-[12px] font-black text-slate-700 w-12 md:w-16 whitespace-nowrap">
                                      {field.toUpperCase()}
                                    </span>
                                    <input 
                                      type="number"
                                      value={activeHousehold[field as keyof HouseholdReading] || ''}
                                      onChange={(e) => handleUpdateHousehold(activeHousehold.originalIndex, field as keyof HouseholdReading, e.target.value)}
                                      className="flex-1 h-8 md:h-10 bg-white border border-slate-200 rounded-lg px-3 md:px-4 text-right font-bold text-sm md:text-base focus:border-indigo-400 outline-none"
                                      placeholder="0"
                                    />
                                 </div>
                               ))}
                             </div>
                           </div>
                        </div>

                        <div className="pt-4 md:pt-6 flex gap-3 md:gap-4">
                          <button 
                            onClick={() => {
                              const idx = units.indexOf(selectedUnit);
                              if(idx > 0) setSelectedUnit(units[idx-1]);
                            }}
                            className="flex-1 h-12 md:h-16 bg-slate-100 text-slate-500 rounded-xl md:rounded-2xl text-[11px] md:text-base font-black hover:bg-slate-200 transition-all"
                          >
                            이전 호실
                          </button>
                          <button 
                            onClick={() => {
                              const idx = units.indexOf(selectedUnit);
                              if(idx < units.length-1) setSelectedUnit(units[idx+1]);
                              else {
                                const fIdx = floors.indexOf(selectedFloor);
                                if(fIdx < floors.length-1) { setSelectedFloor(floors[fIdx+1]); setSelectedUnit('1호'); }
                              }
                            }}
                            className="flex-[2] h-12 md:h-16 bg-blue-600 text-white rounded-xl md:rounded-2xl text-[11px] md:text-base font-black hover:bg-blue-500 shadow-xl shadow-blue-900/20 transition-all flex items-center justify-center gap-2 md:gap-3"
                          >
                            다음 호실 <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 상가 검침 */}
              {activeTab === 'commercial' && (
                <div className="p-4 md:p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {currentRecord.commercials.map((row, index) => (
                      <div key={index} className="bg-white rounded-2xl md:rounded-3xl border-2 border-slate-100 p-4 md:p-6 hover:shadow-xl transition-all group relative overflow-hidden">
                        <div className="flex justify-between items-center mb-4 md:mb-6">
                           <span className="text-base md:text-lg font-black text-slate-900">{row.unit}</span>
                           <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] md:text-[10px] font-black ${row.inspector === InspectorRole.CHIEF ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                             <Tag className="w-3 h-3" /> {row.inspector}
                           </div>
                        </div>
                        <div className="space-y-2">
                           <div className="flex justify-between px-1 text-[9px] md:text-[10px] font-bold text-slate-400">
                             <span>{fieldLabels.water} 검침값</span>
                             <span>{prevRecord?.commercials[index]?.water || '0.00'} (전월)</span>
                           </div>
                           <input 
                             type="number"
                             value={row.water || ''}
                             onChange={(e) => handleUpdateCommercial(index, 'water', e.target.value)}
                             className="w-full h-12 md:h-14 bg-slate-50 border-2 border-transparent rounded-xl md:rounded-2xl px-4 text-right font-black text-lg md:text-xl focus:bg-white focus:border-indigo-400 outline-none transition-all"
                             placeholder="0.00"
                           />
                        </div>
                        <div className={`absolute top-0 left-0 bottom-0 w-1 ${row.inspector === InspectorRole.CHIEF ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 상수도 메인 */}
              {activeTab === 'main' && (
                <div className="p-6 md:p-12 max-w-2xl mx-auto w-full space-y-8 md:space-y-12">
                  <div className="bg-blue-50/50 p-6 md:p-10 rounded-2xl md:rounded-[3rem] border-2 border-blue-100 space-y-6 md:space-y-8">
                    <div className="flex items-center gap-4 text-blue-600 mb-2">
                      <div className="bg-blue-600 p-2 md:p-3 rounded-xl md:rounded-2xl text-white shadow-lg">
                        <Droplets className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg md:text-2xl font-black tracking-tight">상수도 메인 계량기</h3>
                        <p className="text-[9px] md:text-xs font-bold text-blue-400 uppercase tracking-widest">Main Water Meter Management</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 md:space-y-4">
                      <div className="flex justify-between items-end px-2">
                        <label className="text-[9px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest">현재 검침값 입력</label>
                        {prevRecord && (
                          <div className="text-[9px] md:text-[11px] font-black text-slate-400">
                            전월: <span className="text-slate-600 ml-1">{prevRecord.mainMeter || '0.00'}</span>
                          </div>
                        )}
                      </div>
                      <input 
                        type="number"
                        value={currentRecord.mainMeter}
                        onChange={(e) => setRecords(prev => prev.map(r => r.id === currentRecordId ? {...r, mainMeter: e.target.value === '' ? '' : parseFloat(e.target.value)} : r))}
                        className="w-full h-16 md:h-24 bg-white border-4 border-slate-100 rounded-xl md:rounded-[2rem] px-6 md:px-10 text-right font-black text-3xl md:text-5xl text-blue-600 focus:border-blue-400 outline-none transition-all shadow-inner"
                        placeholder="0.00"
                      />
                    </div>

                    {prevRecord && currentRecord.mainMeter !== '' && (
                      <div className="pt-4 border-t border-blue-100 flex justify-between items-center">
                        <span className="text-[11px] md:text-sm font-black text-slate-500">이번 달 사용량</span>
                        <div className="flex items-center gap-2 md:gap-3">
                           <span className="text-xl md:text-3xl font-black text-slate-900">
                             {((currentRecord.mainMeter as number) - (prevRecord.mainMeter as number || 0)).toFixed(2)}
                           </span>
                           <span className="text-[10px] md:text-sm font-bold text-slate-400">m³</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 md:gap-6">
                    <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm text-center md:text-left">
                      <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-1 md:mb-2">마지막 업데이트</div>
                      <div className="text-xs md:text-sm font-black text-slate-700">{new Date().toLocaleDateString()}</div>
                    </div>
                    <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm text-center md:text-left">
                      <div className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase mb-1 md:mb-2">상태</div>
                      <div className="flex items-center justify-center md:justify-start gap-1.5 md:gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-500" />
                        <span className="text-xs md:text-sm font-black text-emerald-600">입력 활성</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 작업 이력 / 통계 / 엑셀 내보내기 */}
              {activeTab === 'summary' && (
                <div className="p-6 md:p-12 max-w-5xl mx-auto w-full space-y-8 md:space-y-12">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                      {[InspectorRole.CHIEF, InspectorRole.MANAGER].map(role => {
                        const hCount = currentRecord.households.filter(h => h.inspector === role && (h.water !== '' || h.heating !== '')).length;
                        const cCount = currentRecord.commercials.filter(c => c.inspector === role && c.water !== '').length;
                        return (
                          <div key={role} className="bg-white p-6 md:p-10 rounded-2xl md:rounded-[2.5rem] border-2 border-slate-100 shadow-sm space-y-4 md:space-y-6">
                             <div className="flex justify-between items-center">
                               <div className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">{role} 담당자 검침 완료</div>
                               <div className={`p-2 rounded-lg md:rounded-xl ${role === InspectorRole.CHIEF ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                 <UserCheck className="w-5 h-5 md:w-6 md:h-6" />
                               </div>
                             </div>
                             <div className="text-3xl md:text-5xl font-black text-slate-900">{hCount + cCount} <span className="text-base md:text-xl text-slate-300 font-bold uppercase ml-1 md:ml-2">Units</span></div>
                             <div className="space-y-3 md:space-y-4 pt-2 md:pt-4">
                               <div className="flex justify-between text-[10px] md:text-xs font-black text-slate-500">
                                  <span>세대 검침 ({hCount} / 304)</span>
                                  <span>{Math.round((hCount / 304) * 100)}%</span>
                               </div>
                               <div className="w-full bg-slate-100 h-1.5 md:h-2 rounded-full overflow-hidden">
                                 <div className={`h-full ${role === InspectorRole.CHIEF ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${(hCount / 304) * 100}%` }}></div>
                               </div>
                             </div>
                          </div>
                        );
                      })}
                   </div>

                   {/* 엑셀 내보내기 섹션 */}
                   <div className="bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl">
                      <div className="flex items-center gap-6">
                         <div className="bg-emerald-500/20 p-5 rounded-3xl border border-emerald-500/30">
                            <FileSpreadsheet className="w-10 h-10 text-emerald-400" />
                         </div>
                         <div>
                            <h4 className="text-2xl font-black tracking-tight">{currentRecord.name} 데이터 내보내기</h4>
                            <p className="text-slate-400 text-sm font-bold mt-1">세대/상가 검침 및 상수도 메인 포함</p>
                         </div>
                      </div>
                      <button 
                        onClick={handleExportToExcel}
                        className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 px-10 py-5 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 active:scale-95"
                      >
                         <Download className="w-6 h-6" /> 엑셀 파일로 저장
                      </button>
                   </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      {/* 모달: 월 생성 */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsCreateModalOpen(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-2xl md:rounded-[3rem] p-8 md:p-12 shadow-2xl animate-in zoom-in-95 duration-200">
             <h2 className="text-2xl md:text-3xl font-black mb-6 md:mb-8 text-slate-900">새 검침 데이터 생성</h2>
             <div className="space-y-6">
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">대상 년월 (YYYY-MM)</label>
                   <input 
                    type="text"
                    value={newMonthInput}
                    onChange={(e) => { setNewMonthInput(e.target.value); setCreateError(null); }}
                    className={`w-full h-14 md:h-16 bg-slate-50 border-2 rounded-xl md:rounded-2xl px-5 md:px-6 text-xl md:text-2xl font-black mt-2 focus:outline-none transition-all ${createError ? 'border-red-400' : 'border-slate-100 focus:border-blue-400'}`}
                    placeholder="2026-03"
                   />
                   {createError && <p className="text-red-500 text-xs font-bold mt-2 ml-1">{createError}</p>}
                </div>
                <button onClick={handleCreateMonth} className="w-full h-14 md:h-16 bg-blue-600 text-white rounded-xl md:rounded-2xl text-lg md:text-xl font-black shadow-xl shadow-blue-900/20 active:scale-95 transition-all">시작하기</button>
             </div>
          </div>
        </div>
      )}

      <footer className="bg-white border-t border-slate-200 px-4 md:px-6 py-4 flex justify-between items-center text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-tight md:tracking-[0.2em] print:hidden">
        <div className="flex items-center gap-2 md:gap-4">
          <div className="flex items-center gap-1.5 text-emerald-500">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
            Syncing Active
          </div>
          <span className="hidden sm:inline">BUILDING METERING MASTER V3.3</span>
        </div>
        <div className="text-right">PROUDLY BUILT FOR PRECISION</div>
      </footer>
    </div>
  );
};

export default App;
