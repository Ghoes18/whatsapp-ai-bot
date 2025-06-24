/**
 * Formata um número de telefone para o padrão internacional
 * Exemplo: 351925698714 -> +351 925 698 714
 * @param phone - Número de telefone bruto
 * @returns Número formatado ou texto padrão se inválido
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) {
    return "Sem telefone";
  }

  // Remover todos os caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Se o número não tiver pelo menos 9 dígitos, retornar original
  if (cleanPhone.length < 9) {
    return phone;
  }

  // Para números portugueses/europeus (351 + 9 dígitos)
  if (cleanPhone.length === 12 && cleanPhone.startsWith('351')) {
    const countryCode = cleanPhone.slice(0, 3); // 351
    const firstPart = cleanPhone.slice(3, 6); // 925
    const secondPart = cleanPhone.slice(6, 9); // 698
    const thirdPart = cleanPhone.slice(9, 12); // 714
    return `+${countryCode} ${firstPart} ${secondPart} ${thirdPart}`;
  }

  // Para números brasileiros (55 + 11 dígitos)
  if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
    const countryCode = cleanPhone.slice(0, 2); // 55
    const areaCode = cleanPhone.slice(2, 4); // área
    const firstPart = cleanPhone.slice(4, 9); // primeira parte
    const secondPart = cleanPhone.slice(9, 13); // segunda parte
    return `+${countryCode} ${areaCode} ${firstPart} ${secondPart}`;
  }

  // Para outros números internacionais com códigos de país comuns
  if (cleanPhone.length >= 10) {
    // Assumir que os primeiros 1-3 dígitos são código do país
    let countryCodeLength = 2;
    
    // Códigos de país de 1 dígito (EUA: 1)
    if (cleanPhone.startsWith('1') && cleanPhone.length === 11) {
      countryCodeLength = 1;
    }
    // Códigos de país de 3 dígitos (Portugal: 351)
    else if (cleanPhone.startsWith('351') || cleanPhone.startsWith('352') || cleanPhone.startsWith('353')) {
      countryCodeLength = 3;
    }

    const countryCode = cleanPhone.slice(0, countryCodeLength);
    const remaining = cleanPhone.slice(countryCodeLength);
    
    // Dividir o resto em grupos de 3 dígitos
    const groups = [];
    for (let i = 0; i < remaining.length; i += 3) {
      groups.push(remaining.slice(i, i + 3));
    }
    
    return `+${countryCode} ${groups.join(' ')}`;
  }

  // Se não conseguir formatar, retornar o número original
  return phone;
} 