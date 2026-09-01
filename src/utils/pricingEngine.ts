import { OrganizationPaymentSettings, CalculatedInstallmentOption } from "../types";

/**
 * Motor de Precificação e Condições de Pagamento
 * Respeita estritamente o isolamento de OrganizationPaymentSettings por organização (Multi-Tenant).
 */

export const DEFAULT_ORGANIZATION_PAYMENT_SETTINGS: OrganizationPaymentSettings = {
  id: "pay-sett-lumina-01",
  organizationId: "org-lumina-01",
  pixEnabled: true,
  pixDiscountPercent: 5.0, // 5% no PIX
  pixKeyType: "CNPJ",
  pixKey: "48.291.802/0001-94",
  pixExpirationMinutes: 30,

  creditCardEnabled: true,
  maxInstallments: 6,
  freeInstallmentsCount: 6, // 6x sem juros
  minInstallmentAmount: 20.0, // Mínimo de R$ 20,00 por parcela
  
  // Tabela discriminada por parcela
  installmentRules: [
    { installments: 1, interestRatePercent: 0.0 },
    { installments: 2, interestRatePercent: 0.0 },
    { installments: 3, interestRatePercent: 0.0 },
    { installments: 4, interestRatePercent: 0.0 },
    { installments: 5, interestRatePercent: 0.0 },
    { installments: 6, interestRatePercent: 0.0 },
    { installments: 7, interestRatePercent: 2.5 },
    { installments: 8, interestRatePercent: 3.0 },
    { installments: 9, interestRatePercent: 3.5 },
    { installments: 10, interestRatePercent: 4.0 },
    { installments: 11, interestRatePercent: 4.5 },
    { installments: 12, interestRatePercent: 5.0 },
  ],

  boletoEnabled: false,
  boletoDiscountPercent: 0,

  whatsappCheckoutEnabled: true,
  freeShippingMinimumAmount: 250.0,
  defaultStandardShippingCost: 18.9,
  updatedAt: new Date().toISOString(),
};

/**
 * Calcula o preço à vista no PIX com base no desconto configurado da organização
 */
export function calculatePixPrice(
  basePrice: number,
  settings: OrganizationPaymentSettings = DEFAULT_ORGANIZATION_PAYMENT_SETTINGS
) {
  if (!settings.pixEnabled || settings.pixDiscountPercent <= 0) {
    return {
      pixPrice: basePrice,
      discountAmount: 0,
      discountPercent: 0,
      isDiscountActive: false,
    };
  }

  const discountAmount = Number(((basePrice * settings.pixDiscountPercent) / 100).toFixed(2));
  const pixPrice = Math.max(0, Number((basePrice - discountAmount).toFixed(2)));

  return {
    pixPrice,
    discountAmount,
    discountPercent: settings.pixDiscountPercent,
    isDiscountActive: true,
  };
}

/**
 * Calcula a grade completa de parcelamento com base nas regras de taxa/juros por parcela
 */
export function calculateInstallmentOptions(
  basePrice: number,
  settings: OrganizationPaymentSettings = DEFAULT_ORGANIZATION_PAYMENT_SETTINGS
): CalculatedInstallmentOption[] {
  if (!settings.creditCardEnabled || basePrice <= 0) {
    return [
      {
        installments: 1,
        installmentValue: basePrice,
        totalAmount: basePrice,
        interestRatePercent: 0,
        isInterestFree: true,
      },
    ];
  }

  const options: CalculatedInstallmentOption[] = [];
  const maxInst = Math.min(settings.maxInstallments || 6, 12);

  for (let n = 1; n <= maxInst; n++) {
    // Busca regra específica para esta parcela
    const rule = settings.installmentRules?.find((r) => r.installments === n);
    
    // Se a parcela for <= freeInstallmentsCount, é sem juros (0%)
    let interestRate = 0;
    if (rule) {
      interestRate = rule.interestRatePercent;
    } else if (n > settings.freeInstallmentsCount) {
      interestRate = (n - settings.freeInstallmentsCount) * 1.5;
    }

    const isInterestFree = interestRate <= 0;
    const totalAmount = Number((basePrice * (1 + interestRate / 100)).toFixed(2));
    const installmentValue = Number((totalAmount / n).toFixed(2));

    // Se o valor da parcela for menor que o mínimo estipulado (e não for 1x), interrompe
    if (n > 1 && settings.minInstallmentAmount && installmentValue < settings.minInstallmentAmount) {
      break;
    }

    options.push({
      installments: n,
      installmentValue,
      totalAmount,
      interestRatePercent: interestRate,
      isInterestFree,
    });
  }

  return options.length > 0
    ? options
    : [
        {
          installments: 1,
          installmentValue: basePrice,
          totalAmount: basePrice,
          interestRatePercent: 0,
          isInterestFree: true,
        },
      ];
}

/**
 * Retorna o texto de destaque de parcelamento para os cards da vitrine
 * Ex: "ou 6x de R$ 49,90 sem juros" ou "ou até 12x no cartão"
 */
export function getBestInstallmentHighlight(
  basePrice: number,
  settings: OrganizationPaymentSettings = DEFAULT_ORGANIZATION_PAYMENT_SETTINGS
): string {
  const options = calculateInstallmentOptions(basePrice, settings);
  if (options.length === 0) return `R$ ${basePrice.toFixed(2)}`;

  // Encontra a maior parcela sem juros disponível para esse valor
  const freeOptions = options.filter((o) => o.isInterestFree && o.installments > 1);
  if (freeOptions.length > 0) {
    const best = freeOptions[freeOptions.length - 1];
    return `ou ${best.installments}x de R$ ${best.installmentValue.toFixed(2)} sem juros`;
  }

  // Se todas tiverem juros além de 1x
  if (options.length > 1) {
    const maxOption = options[options.length - 1];
    return `ou até ${maxOption.installments}x de R$ ${maxOption.installmentValue.toFixed(2)}`;
  }

  return `1x de R$ ${basePrice.toFixed(2)}`;
}
