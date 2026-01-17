
export enum InspectorRole {
  CHIEF = '주임',
  MANAGER = '과장'
}

export interface HouseholdReading {
  floor: string;
  unit: string;
  inspector: InspectorRole;
  outdoorUnit: number | '';
  heating: number | '';
  hotWater: number | '';
  water: number | '';
  // 전기 계량기 7종
  elec13: number | '';
  elec14: number | '';
  elec15: number | '';
  elec16: number | '';
  elec17: number | '';
  elec19: number | '';
  elec20: number | '';
}

export interface CommercialReading {
  unit: string;
  inspector: InspectorRole;
  water: number | '';
}

export interface MonthlyRecord {
  id: string; // YYYY-MM
  name: string; // YYYY년 M월
  mainMeter: number | '';
  households: HouseholdReading[];
  commercials: CommercialReading[];
}

export interface ReadingDiff {
  outdoorUnit: number;
  heating: number;
  hotWater: number;
  water: number;
  elecTotal: number;
}
