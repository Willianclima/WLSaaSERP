/**
 * Utilitários Backend para Validação e Formatação de Documentos Fiscais Brasileiros (CPF e CNPJ)
 */

export interface DocumentValidationResult {
  isValid: boolean;
  cleanValue: string;
  formattedValue: string;
  error?: string;
}

export function cleanDocument(value: string): string {
  return (value || "").replace(/\D/g, "");
}

export function formatCPF(value: string): string {
  const digits = cleanDocument(value).slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function formatCNPJ(value: string): string {
  const digits = cleanDocument(value).slice(0, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12, 14)}`;
}

export function validateCPF(cpf: string): DocumentValidationResult {
  const clean = cleanDocument(cpf);
  const formatted = formatCPF(clean);

  if (!clean) {
    return { isValid: false, cleanValue: "", formattedValue: "", error: "O CPF é obrigatório." };
  }

  if (clean.length !== 11) {
    return { isValid: false, cleanValue: clean, formattedValue: formatted, error: `CPF incompleto (${clean.length}/11 dígitos).` };
  }

  if (/^(\d)\1{10}$/.test(clean)) {
    return { isValid: false, cleanValue: clean, formattedValue: formatted, error: "CPF inválido (sequência de números repetidos)." };
  }

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(clean.charAt(9), 10)) {
    return { isValid: false, cleanValue: clean, formattedValue: formatted, error: "CPF inválido (1º dígito verificador incorreto)." };
  }

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(clean.charAt(10), 10)) {
    return { isValid: false, cleanValue: clean, formattedValue: formatted, error: "CPF inválido (2º dígito verificador incorreto)." };
  }

  return { isValid: true, cleanValue: clean, formattedValue: formatted };
}

export function validateCNPJ(cnpj: string): DocumentValidationResult {
  const clean = cleanDocument(cnpj);
  const formatted = formatCNPJ(clean);

  if (!clean) {
    return { isValid: false, cleanValue: "", formattedValue: "", error: "O CNPJ é obrigatório." };
  }

  if (clean.length !== 14) {
    return { isValid: false, cleanValue: clean, formattedValue: formatted, error: `CNPJ incompleto (${clean.length}/14 dígitos).` };
  }

  if (/^(\d)\1{13}$/.test(clean)) {
    return { isValid: false, cleanValue: clean, formattedValue: formatted, error: "CNPJ inválido (sequência de números repetidos)." };
  }

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean.charAt(i), 10) * weights1[i];
  }
  let rest = sum % 11;
  const digit1 = rest < 2 ? 0 : 11 - rest;
  if (digit1 !== parseInt(clean.charAt(12), 10)) {
    return { isValid: false, cleanValue: clean, formattedValue: formatted, error: "CNPJ inválido (1º dígito verificador incorreto)." };
  }

  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(clean.charAt(i), 10) * weights2[i];
  }
  rest = sum % 11;
  const digit2 = rest < 2 ? 0 : 11 - rest;
  if (digit2 !== parseInt(clean.charAt(13), 10)) {
    return { isValid: false, cleanValue: clean, formattedValue: formatted, error: "CNPJ inválido (2º dígito verificador incorreto)." };
  }

  return { isValid: true, cleanValue: clean, formattedValue: formatted };
}
