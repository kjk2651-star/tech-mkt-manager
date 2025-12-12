'use client';

import { AppLayout } from '@/components/Layout/AppLayout';
import { Title, Tabs, Card, NumberInput, Button, Grid, Group, Text, SegmentedControl, TextInput, ActionIcon, Stack, Divider, Table, Badge, LoadingOverlay } from '@mantine/core';
import { IconDeviceFloppy, IconPlus, IconTrash, IconCurrencyDollar, IconCurrencyWon } from '@tabler/icons-react';
import { useState, useMemo, useEffect } from 'react';
import { Budget, ExtraBudget, Campaign } from '@/types';
import { BRANDS } from '@/constants/brands';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, setDoc, doc, getDocs, where } from 'firebase/firestore';

const DEFAULT_RATE = 1400;

export default function BudgetPage() {
    const [year, setYear] = useState('2025');
    const [activeTab, setActiveTab] = useState<string | null>('Q1');
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);

    // Initialize/Fetch Budgets & Campaigns
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Fetch Campaigns
                const campaignQ = query(collection(db, 'campaigns'));
                const campaignUnsub = onSnapshot(campaignQ, (snapshot) => {
                    const campaignsData = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as Campaign[];
                    setCampaigns(campaignsData);
                });

                // 2. Fetch Budgets for current year
                const budgetsRef = collection(db, 'budgets');
                const budgetsSnap = await getDocs(budgetsRef); // Initial fetch

                let loadedBudgets: Budget[] = [];
                if (!budgetsSnap.empty) {
                    loadedBudgets = budgetsSnap.docs.map(doc => doc.data() as Budget);
                }

                // Merge with default structure to ensure all brands/quarters exist
                const finalBudgets: Budget[] = [];
                const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

                quarters.forEach(q => {
                    BRANDS.forEach(brand => {
                        const existing = loadedBudgets.find(b => b.year === parseInt(year) && b.quarter === q && b.brand === brand);
                        if (existing) {
                            finalBudgets.push(existing);
                        } else {
                            finalBudgets.push({
                                year: parseInt(year),
                                quarter: q,
                                brand,
                                exchangeRate: DEFAULT_RATE,
                                mdf: 0,
                                mdfUsd: 0,
                                mpor: 0,
                                mporUsd: 0,
                                rebate: 0,
                                rebateUsd: 0,
                                extraBudgets: []
                            });
                        }
                    });
                });

                // Only set state if we are currently looking at the relevant data
                // For simplicity, we filter in memory
                setBudgets(finalBudgets);

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        // Note: Real-time listener for budgets is trickier with dynamic structure, using manual save for budgets.
    }, [year]);

    // Calculate used amount based on campaigns
    // Calculate used amount based on campaigns -> executions
    const getUsedAmount = (brand: string, source: string) => {
        return campaigns
            .filter(c =>
                c.brand === brand &&
                c.quarter === activeTab &&
                c.status !== 'planned' // Count executing/executed/closed
            )
            .reduce((total, campaign) => {
                const campaignTotal = (campaign.executions || [])
                    .filter(exec => exec.budgetSource && exec.budgetSource.toLowerCase().includes(source.toLowerCase()))
                    .reduce((acc, exec) => acc + (exec.actualAmount || 0), 0);
                return total + campaignTotal;
            }, 0);
    };

    const handleBudgetChange = (
        brand: string,
        field: keyof Budget | string,
        value: number,
        isUsd: boolean,
        extraId?: string
    ) => {
        setBudgets(prev => prev.map(b => {
            if (b.brand !== brand || b.quarter !== activeTab || b.year !== parseInt(year)) return b;

            const rate = b.exchangeRate || DEFAULT_RATE;

            if (extraId) {
                // Handle Extra Budgets
                const updatedExtras = b.extraBudgets.map(ex => {
                    if (ex.id !== extraId) return ex;
                    if (isUsd) {
                        return { ...ex, amountUsd: value, amount: Math.round(value * rate) };
                    } else {
                        return { ...ex, amount: value, amountUsd: parseFloat((value / rate).toFixed(2)) };
                    }
                });
                return { ...b, extraBudgets: updatedExtras };
            }

            // Handle Standard Fields (MDF, MPOR, Rebate)
            if (isUsd) {
                // USD Changed -> Update USD and auto-calc KRW
                const krwVal = Math.round(value * rate);
                return { ...b, [field]: value, [field.replace('Usd', '')]: krwVal };
            } else {
                // KRW Changed -> Update KRW and auto-calc USD
                const usdField = field + 'Usd';
                const usdVal = parseFloat((value / rate).toFixed(2));
                return { ...b, [field]: value, [usdField]: usdVal };
            }
        }));
    };

    const handleRateChange = (brand: string, newRate: number) => {
        setBudgets(prev => prev.map(b => {
            if (b.brand !== brand || b.quarter !== activeTab || b.year !== parseInt(year)) return b;

            // Recalculate KRW based on existing USD values
            return {
                ...b,
                exchangeRate: newRate,
                mdf: Math.round((b.mdfUsd || 0) * newRate),
                mpor: Math.round((b.mporUsd || 0) * newRate),
                rebate: Math.round((b.rebateUsd || 0) * newRate),
                extraBudgets: b.extraBudgets.map(ex => ({
                    ...ex,
                    amount: Math.round((ex.amountUsd || 0) * newRate)
                }))
            };
        }));
    };

    const handleAddExtra = (brand: string) => {
        const id = Math.random().toString(36).substr(2, 9);
        setBudgets(prev => prev.map(b => {
            if (b.brand !== brand || b.quarter !== activeTab || b.year !== parseInt(year)) return b;
            return {
                ...b,
                extraBudgets: [...b.extraBudgets, { id, label: 'New Budget', amount: 0, amountUsd: 0 }]
            };
        }));
    };

    const handleUpdateExtraLabel = (brand: string, id: string, label: string) => {
        setBudgets(prev => prev.map(b => {
            if (b.brand !== brand || b.quarter !== activeTab || b.year !== parseInt(year)) return b;
            return {
                ...b,
                extraBudgets: b.extraBudgets.map(ex => ex.id === id ? { ...ex, label } : ex)
            };
        }));
    };

    const handleDeleteExtra = (brand: string, id: string) => {
        setBudgets(prev => prev.map(b => {
            if (b.brand !== brand || b.quarter !== activeTab || b.year !== parseInt(year)) return b;
            return {
                ...b,
                extraBudgets: b.extraBudgets.filter(ex => ex.id !== id)
            };
        }));
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            // Batch write logic (or simple loop for now as volume is low)
            const promises = budgets.map(b => {
                const docId = `${b.brand}_${b.year}_${b.quarter}`;
                return setDoc(doc(db, 'budgets', docId), b, { merge: true });
            });
            await Promise.all(promises);
            alert('예산이 저장되었습니다.');
        } catch (error) {
            console.error("Error saving budgets:", error);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const renderDualInput = (
        usdVal: number | undefined,
        krwVal: number,
        onChange: (val: number, isUsd: boolean) => void
    ) => (
        <Group gap="xs" grow>
            <NumberInput
                leftSection={<IconCurrencyDollar size={14} />}
                placeholder="0"
                value={usdVal}
                onChange={(val) => onChange(Number(val), true)}
                thousandSeparator=","
                decimalScale={2}
                hideControls
                styles={{ input: { fontSize: '0.9rem' } }}
            />
            <NumberInput
                leftSection={<IconCurrencyWon size={14} />}
                placeholder="0"
                value={krwVal}
                onChange={(val) => onChange(Number(val), false)}
                thousandSeparator=","
                hideControls
                styles={{ input: { fontSize: '0.9rem' } }}
            />
        </Group>
    );

    return (
        <AppLayout>
            <Group justify="space-between" mb="lg">
                <Title order={2}>예산 관리</Title>
                <Button leftSection={<IconDeviceFloppy size={16} />} onClick={handleSave}>저장</Button>
            </Group>

            <Stack gap="lg">
                <Group justify="center">
                    <SegmentedControl
                        value={year}
                        onChange={setYear}
                        data={['2024', '2025', '2026']}
                        size="md"
                    />
                </Group>

                <Card shadow="sm" padding="lg" radius="md" withBorder pos="relative">
                    <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
                    <Tabs value={activeTab} onChange={setActiveTab}>
                        <Tabs.List mb="md">
                            <Tabs.Tab value="Q1">1분기 (Q1)</Tabs.Tab>
                            <Tabs.Tab value="Q2">2분기 (Q2)</Tabs.Tab>
                            <Tabs.Tab value="Q3">3분기 (Q3)</Tabs.Tab>
                            <Tabs.Tab value="Q4">4분기 (Q4)</Tabs.Tab>
                        </Tabs.List>

                        <Tabs.Panel value={activeTab || 'Q1'}>
                            <Grid>
                                {budgets
                                    .filter(b => b.quarter === activeTab && b.year === parseInt(year)) // Display filter
                                    .map((budget) => (
                                        <Grid.Col key={budget.brand} span={{ base: 12, lg: 6 }}>
                                            <Card withBorder padding="md" radius="md">
                                                <Group justify="space-between" mb="md">
                                                    <Title order={4}>{budget.brand}</Title>
                                                    <NumberInput
                                                        label="기준 환율"
                                                        size="xs"
                                                        value={budget.exchangeRate}
                                                        onChange={(val) => handleRateChange(budget.brand, Number(val))}
                                                        thousandSeparator=","
                                                        w={120}
                                                    />
                                                </Group>

                                                <Table withTableBorder withColumnBorders>
                                                    <Table.Thead>
                                                        <Table.Tr>
                                                            <Table.Th width="20%">항목</Table.Th>
                                                            <Table.Th width="40%">배정액 (USD / KRW)</Table.Th>
                                                            <Table.Th style={{ textAlign: 'right' }}>소진 (KRW)</Table.Th>
                                                            <Table.Th style={{ textAlign: 'right' }}>잔액</Table.Th>
                                                        </Table.Tr>
                                                    </Table.Thead>
                                                    <Table.Tbody>
                                                        <Table.Tr>
                                                            <Table.Td>MDF</Table.Td>
                                                            <Table.Td>
                                                                {renderDualInput(
                                                                    budget.mdfUsd,
                                                                    budget.mdf,
                                                                    (val, isUsd) => handleBudgetChange(budget.brand, isUsd ? 'mdfUsd' : 'mdf', val, isUsd)
                                                                )}
                                                            </Table.Td>
                                                            <Table.Td style={{ textAlign: 'right' }}>
                                                                ₩{getUsedAmount(budget.brand, 'MDF').toLocaleString()}
                                                            </Table.Td>
                                                            <Table.Td style={{ textAlign: 'right' }}>
                                                                <Text c={budget.mdf - getUsedAmount(budget.brand, 'MDF') < 0 ? 'red' : 'green'} fw={700}>
                                                                    ₩{(budget.mdf - getUsedAmount(budget.brand, 'MDF')).toLocaleString()}
                                                                </Text>
                                                            </Table.Td>
                                                        </Table.Tr>

                                                        <Table.Tr>
                                                            <Table.Td>MPOR</Table.Td>
                                                            <Table.Td>
                                                                {renderDualInput(
                                                                    budget.mporUsd,
                                                                    budget.mpor,
                                                                    (val, isUsd) => handleBudgetChange(budget.brand, isUsd ? 'mporUsd' : 'mpor', val, isUsd)
                                                                )}
                                                            </Table.Td>
                                                            <Table.Td style={{ textAlign: 'right' }}>
                                                                ₩{getUsedAmount(budget.brand, 'MPOR').toLocaleString()}
                                                            </Table.Td>
                                                            <Table.Td style={{ textAlign: 'right' }}>
                                                                <Text c={budget.mpor - getUsedAmount(budget.brand, 'MPOR') < 0 ? 'red' : 'green'} fw={700}>
                                                                    ₩{(budget.mpor - getUsedAmount(budget.brand, 'MPOR')).toLocaleString()}
                                                                </Text>
                                                            </Table.Td>
                                                        </Table.Tr>

                                                        <Table.Tr>
                                                            <Table.Td>Rebate</Table.Td>
                                                            <Table.Td>
                                                                {renderDualInput(
                                                                    budget.rebateUsd,
                                                                    budget.rebate,
                                                                    (val, isUsd) => handleBudgetChange(budget.brand, isUsd ? 'rebateUsd' : 'rebate', val, isUsd)
                                                                )}
                                                            </Table.Td>
                                                            <Table.Td style={{ textAlign: 'right' }}>
                                                                ₩{getUsedAmount(budget.brand, 'Rebate').toLocaleString()}
                                                            </Table.Td>
                                                            <Table.Td style={{ textAlign: 'right' }}>
                                                                <Text c={budget.rebate - getUsedAmount(budget.brand, 'Rebate') < 0 ? 'red' : 'green'} fw={700}>
                                                                    ₩{(budget.rebate - getUsedAmount(budget.brand, 'Rebate')).toLocaleString()}
                                                                </Text>
                                                            </Table.Td>
                                                        </Table.Tr>

                                                        {/* Extra Budgets */}
                                                        {budget.extraBudgets.map((extra) => (
                                                            <Table.Tr key={extra.id}>
                                                                <Table.Td>
                                                                    <Group gap={4}>
                                                                        <TextInput
                                                                            variant="unstyled"
                                                                            size="xs"
                                                                            value={extra.label}
                                                                            onChange={(e) => handleUpdateExtraLabel(budget.brand, extra.id, e.currentTarget.value)}
                                                                        />
                                                                        <ActionIcon color="red" variant="subtle" size="xs" onClick={() => handleDeleteExtra(budget.brand, extra.id)}>
                                                                            <IconTrash size={12} />
                                                                        </ActionIcon>
                                                                    </Group>
                                                                </Table.Td>
                                                                <Table.Td>
                                                                    {renderDualInput(
                                                                        extra.amountUsd,
                                                                        extra.amount,
                                                                        (val, isUsd) => handleBudgetChange(budget.brand, '', val, isUsd, extra.id)
                                                                    )}
                                                                </Table.Td>
                                                                <Table.Td style={{ textAlign: 'right' }}>
                                                                    ₩{getUsedAmount(budget.brand, 'Extra').toLocaleString()}
                                                                </Table.Td>
                                                                <Table.Td style={{ textAlign: 'right' }}>
                                                                    <Text c={extra.amount - getUsedAmount(budget.brand, 'Extra') < 0 ? 'red' : 'green'} fw={700}>
                                                                        -
                                                                    </Text>
                                                                </Table.Td>
                                                            </Table.Tr>
                                                        ))}

                                                        {/* Total Row */}
                                                        <Table.Tr bg="gray.1" style={{ borderTop: '2px solid #dee2e6' }}>
                                                            <Table.Td fw={700}>Total</Table.Td>
                                                            <Table.Td fw={700}>
                                                                ₩{(
                                                                    (budget.mdf || 0) +
                                                                    (budget.mpor || 0) +
                                                                    (budget.rebate || 0) +
                                                                    budget.extraBudgets.reduce((sum, ex) => sum + (ex.amount || 0), 0)
                                                                ).toLocaleString()}
                                                            </Table.Td>
                                                            <Table.Td fw={700} style={{ textAlign: 'right' }}>
                                                                ₩{(
                                                                    getUsedAmount(budget.brand, 'MDF') +
                                                                    getUsedAmount(budget.brand, 'MPOR') +
                                                                    getUsedAmount(budget.brand, 'Rebate') +
                                                                    getUsedAmount(budget.brand, 'Extra')
                                                                ).toLocaleString()}
                                                            </Table.Td>
                                                            <Table.Td fw={700} style={{ textAlign: 'right' }}>
                                                                <Text c={
                                                                    ((budget.mdf || 0) + (budget.mpor || 0) + (budget.rebate || 0) + budget.extraBudgets.reduce((sum, ex) => sum + (ex.amount || 0), 0)) -
                                                                        (getUsedAmount(budget.brand, 'MDF') + getUsedAmount(budget.brand, 'MPOR') + getUsedAmount(budget.brand, 'Rebate') + getUsedAmount(budget.brand, 'Extra'))
                                                                        < 0 ? 'red' : 'teal'
                                                                }>
                                                                    ₩{(
                                                                        ((budget.mdf || 0) + (budget.mpor || 0) + (budget.rebate || 0) + budget.extraBudgets.reduce((sum, ex) => sum + (ex.amount || 0), 0)) -
                                                                        (getUsedAmount(budget.brand, 'MDF') + getUsedAmount(budget.brand, 'MPOR') + getUsedAmount(budget.brand, 'Rebate') + getUsedAmount(budget.brand, 'Extra'))
                                                                    ).toLocaleString()}
                                                                </Text>
                                                            </Table.Td>
                                                        </Table.Tr>
                                                    </Table.Tbody>
                                                </Table>
                                                <Button
                                                    variant="light"
                                                    size="xs"
                                                    fullWidth
                                                    mt="xs"
                                                    leftSection={<IconPlus size={14} />}
                                                    onClick={() => handleAddExtra(budget.brand)}
                                                >
                                                    항목 추가
                                                </Button>
                                            </Card>
                                        </Grid.Col>
                                    ))}
                            </Grid>
                        </Tabs.Panel>
                    </Tabs>
                </Card>
            </Stack>
        </AppLayout>
    );
}
