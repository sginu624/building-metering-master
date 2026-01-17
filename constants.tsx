
import { InspectorRole } from './types';

export const COMMERCIAL_UNITS = [
  "101호", "102호", "103호", "104호", "105호", "106호", "107호", "108호", 
  "109호", "110호", "111-1호", "111-2호", "112호", "113호", "114호", 
  "115호", "116호", "117호", "118호"
];

export const HOUSEHOLD_COLUMNS = [
  { id: 'floor', label: '층', width: 'w-14' },
  { id: 'unit', label: '호', width: 'w-14' },
  { id: 'inspector', label: '담당자', width: 'w-24' },
  { id: 'outdoorUnit', label: '실외기', width: 'w-20' },
  { id: 'heating', label: '난방', width: 'w-20' },
  { id: 'hotWater', label: '온수', width: 'w-20' },
  { id: 'water', label: '급수', width: 'w-20' },
  { id: 'elec13', label: '전기13', width: 'w-20' },
  { id: 'elec14', label: '전기14', width: 'w-20' },
  { id: 'elec15', label: '전기15', width: 'w-20' },
  { id: 'elec16', label: '전기16', width: 'w-20' },
  { id: 'elec17', label: '전기17', width: 'w-20' },
  { id: 'elec19', label: '전기19', width: 'w-20' },
  { id: 'elec20', label: '전기20', width: 'w-20' },
];

export const APP_TITLE = "빌딩 통합 검침 마스터";
