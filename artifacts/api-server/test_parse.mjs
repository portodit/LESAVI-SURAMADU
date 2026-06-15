import fs from 'fs';
import { parseExcelBuffer } from './dist/features/import/excel.js';

const buffer = fs.readFileSync('/tmp/PERFORMANSI_RLEGS_2026.xlsx');

console.log('Testing parseExcelBuffer with pivot cache extraction...');

const rows = await parseExcelBuffer(buffer);

console.log('Total rows extracted:', rows.length);
console.log('First row keys:', Object.keys(rows[0] || {}));
console.log('Sample row:', rows[0]);

// Check for expected columns
if (rows.length > 0) {
  const firstRow = rows[0];
  const hasPeriode = 'PERIODE' in firstRow;
  const hasNik = 'NIK' in firstRow;
  const hasNamaAm = 'NAMA_AM' in firstRow;
  const hasStdName = 'STANDARD_NAME' in firstRow;

  console.log('\nColumn check:');
  console.log('  PERIODE:', hasPeriode);
  console.log('  NIK:', hasNik);
  console.log('  NAMA_AM:', hasNamaAm);
  console.log('  STANDARD_NAME:', hasStdName);

  if (hasPeriode && hasNik) {
    console.log('\n[PASS] Pivot cache extraction working correctly!');
  } else {
    console.log('\n[FAIL] Missing expected columns');
  }
}
