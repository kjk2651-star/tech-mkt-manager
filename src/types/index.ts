export interface ExtraBudget {
    id: string;
    label: string;
    amount: number;
    amountUsd?: number;
}

export interface Budget {
    year: number;
    quarter: string;
    brand: string;
    exchangeRate?: number;
    mdf: number;
    mdfUsd?: number;
    mpor: number;
    mporUsd?: number;
    rebate: number;
    rebateUsd?: number;
    extraBudgets: ExtraBudget[];
}

export interface Execution {
    id: string;
    draftId: string;
    internalTitle: string; // Was 'title' in old model
    planAmount: number;
    actualAmount: number;
    budgetSource: string;
    note?: string;
    usdAmount?: number; // Optional tracking
    exchangeRate?: number; // Optional tracking
    createdAt: any;
}

export interface Campaign {
    id: string;
    vendorDescription: string; // Main Title now
    brand: string;
    year: number;
    quarter: string;
    status: 'planned' | 'executing' | 'executed' | 'closed';
    totalAmount: number; // Sum of actualAmount of executions
    executions: Execution[];

    // Vendor level meta
    caseId?: string;
    invoice?: string;
    createdAt?: any;

    // Financials (Vendor Closing)
    closedAmount?: number;
    closedAmountUsd?: number;
    appliedExchangeRate?: number;

    // Legacy/Optional - kept but might be unused or re-purposed
    description?: string; // Vendor level note
    url?: string;
    images?: string[];
    docs?: string[];
}

export interface BudgetSummary {
    totalBudget: number;
    totalExecuted: number;
    balance: number;
    executionRate: number;
}

export interface MarketingActivity {
    id: string;
    brand: string;
    quarter: string;
    year: number;
    place: string;       // 진행 장소/채널
    description: string; // 활동 명/내용
    product: string;     // 타겟 제품
    cost: number;        // 소요 비용 (예산 미반영)
    isVendorSupported: boolean; // 벤더 지원 유무
    status: '준비' | '진행중' | '완료'; // 진행 상태

    // KPIs
    impressions?: number;
    clicks?: number;
    salesVolume?: number;
    giftQuantity?: number;
    resultNote?: string;

    createdAt?: any;
    updatedAt?: any;
}
