export const formatInteger = (value: unknown): string => {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '0';
};

export const formatDecimal = (value: unknown, digits: number): string => {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : (0).toFixed(digits);
};