// Utility functions
export function extractDateFromFilename(source: string): { display: string; isoDate: string; period: string } | null {
  // Pattern 1: underscore or hyphen before date
  const match1 = source.match(/[_-](\d{8})[._?&\s]/);
  if (match1) {
    const raw = match1[1];
    const year = raw.slice(0, 4);
    const month = raw.slice(4, 6);
    const day = raw.slice(6, 8);
    const y = parseInt(year), mo = parseInt(month), d = parseInt(day);
    if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return {
      isoDate: `${year}-${month}-${day}`,
      period: `${year}-${month}`,
      display: `${day}/${month}/${year}`,
    };
  }
  // Pattern 2: parentheses around date
  const match2 = source.match(/\((\d{8})\)/);
  if (match2) {
    const raw = match2[1];
    const year = raw.slice(0, 4);
    const month = raw.slice(4, 6);
    const day = raw.slice(6, 8);
    const y = parseInt(year), mo = parseInt(month), d = parseInt(day);
    if (y < 2000 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return {
      isoDate: `${year}-${month}-${day}`,
      period: `${year}-${month}`,
      display: `${day}/${month}/${year}`,
    };
  }
  return null;
}

