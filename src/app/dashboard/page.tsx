'use client';

import { AppLayout } from '@/components/Layout/AppLayout';
import { Grid, Card, Text, Group, RingProgress, Table, Badge, Title, LoadingOverlay, Select, Tabs, SimpleGrid, SegmentedControl } from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { Campaign, Budget } from '@/types';
import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { BRANDS } from '@/constants/brands';
import { IconLayoutDashboard, IconTable } from '@tabler/icons-react';

export default function DashboardPage() {
    const [year, setYear] = useState<string>('2025');
    const [viewMode, setViewMode] = useState<string>('summary');

    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);

        // 1. Fetch Campaigns (All for now, filtering by year/status in memory logic is safer for small datasets)
        // Optimization: In a real large app, we'd query by year range.
        const campaignQ = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
        const unsubscribeCampaigns = onSnapshot(campaignQ, (snapshot) => {
            const campaignsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Campaign[];
            setCampaigns(campaignsData);
        });

        // 2. Fetch Budgets for selected year
        // We can use a query to only get budgets for the selected year
        // Note: Our budgets ID structure is brand_year_quarter, but we store 'year' field in document usually.
        // Let's assume we saved 'year' as number in the budget document as per my previous turn's code.
        const budgetsQ = query(collection(db, 'budgets'), where('year', '==', parseInt(year)));
        const unsubscribeBudgets = onSnapshot(budgetsQ, (snapshot) => {
            const budgetsData = snapshot.docs.map(doc => doc.data() as Budget);
            setBudgets(budgetsData);
            setLoading(false);
        });

        return () => {
            unsubscribeCampaigns();
            unsubscribeBudgets();
        };
    }, [year]);

    // Data Processing
    // Filter campaigns for selected Year
    const yearCampaigns = useMemo(() => {
        return campaigns.filter(c => c.year === parseInt(year));
    }, [campaigns, year]);

    // Calculate Total Budget for the Year
    const totalBudget = useMemo(() => {
        return budgets.reduce((acc, curr) => {
            const extraSum = curr.extraBudgets.reduce((sum, ex) => sum + ex.amount, 0);
            return acc + (curr.mdf || 0) + (curr.mpor || 0) + (curr.rebate || 0) + extraSum;
        }, 0);
    }, [budgets]);

    // Calculate Total Executed (Executing, Executed, Closed)
    const totalExecuted = useMemo(() => {
        return yearCampaigns
            .filter(c => ['executing', 'executed', 'closed'].includes(c.status))
            .reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    }, [yearCampaigns]);

    const balance = totalBudget - totalExecuted;
    const rate = totalBudget > 0 ? Math.round((totalExecuted / totalBudget) * 100) : 0;

    // Chart Data Preparation: Brand-wise Comparison
    const chartData = useMemo(() => {
        return BRANDS.map(brand => {
            // Budget Sum for Brand
            const brandBudgets = budgets.filter(b => b.brand === brand);
            const brandTotalBudget = brandBudgets.reduce((acc, curr) => {
                const extraSum = curr.extraBudgets.reduce((sum, ex) => sum + ex.amount, 0);
                return acc + (curr.mdf || 0) + (curr.mpor || 0) + (curr.rebate || 0) + extraSum;
            }, 0);

            // Executed Sum for Brand
            const brandExecuted = yearCampaigns
                .filter(c => c.brand === brand && ['executing', 'executed', 'closed'].includes(c.status))
                .reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

            return {
                brand,
                budget: brandTotalBudget,
                executed: brandExecuted
            };
        });
    }, [budgets, yearCampaigns]);

    // Detailed Table Data Preparation
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
    const detailTableRows = useMemo(() => {
        return BRANDS.map(brand => {
            const rowData: any = { brand };
            let brandTotalBudget = 0;
            let brandTotalUsed = 0;

            quarters.forEach(q => {
                // 1. Calculate Budget
                const budgetItem = budgets.find(b => b.brand === brand && b.quarter === q);
                const budgetAmount = budgetItem
                    ? (budgetItem.mdf || 0) + (budgetItem.mpor || 0) + (budgetItem.rebate || 0) + budgetItem.extraBudgets.reduce((s, e) => s + e.amount, 0)
                    : 0;

                // 2. Calculate Used
                const usedAmount = yearCampaigns
                    .filter(c => c.brand === brand && c.quarter === q && ['executing', 'executed', 'closed'].includes(c.status))
                    .reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);

                const balance = budgetAmount - usedAmount;

                rowData[q] = { budget: budgetAmount, used: usedAmount, balance };

                brandTotalBudget += budgetAmount;
                brandTotalUsed += usedAmount;
            });

            rowData.total = {
                budget: brandTotalBudget,
                used: brandTotalUsed,
                balance: brandTotalBudget - brandTotalUsed
            };
            return rowData;
        });
    }, [budgets, yearCampaigns]);

    const renderCell = (data: { budget: number, used: number, balance: number }) => (
        <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
            <Text size="xs" fw={700}>₩{data.budget.toLocaleString()}</Text>
            <Text size="xs" c="dimmed" style={{ fontSize: '0.7rem' }}>- {data.used.toLocaleString()}</Text>
            <Text size="xs" fw={700} c={data.balance < 0 ? 'red' : 'teal'}>
                {data.balance < 0 ? '' : '+'}
                {data.balance.toLocaleString()}
            </Text>
        </div>
    );

    return (
        <AppLayout>
            <Group justify="space-between" mb="lg">
                <Title order={2}>대시보드</Title>
                <Group>
                    <SegmentedControl
                        value={viewMode}
                        onChange={setViewMode}
                        data={[
                            { value: 'summary', label: '전체 요약' },
                            { value: 'detail', label: '상세 테이블' },
                        ]}
                    />
                    <Select
                        w={120}
                        value={year}
                        onChange={(val) => setYear(val || '2025')}
                        data={['2024', '2025', '2026']}
                        allowDeselect={false}
                    />
                </Group>
            </Group>

            <div style={{ position: 'relative', minHeight: 400 }}>
                <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />

                {viewMode === 'summary' ? (
                    <>
                        {/* Summary Cards */}
                        <Grid mb="lg">
                            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                                <Card shadow="sm" padding="lg" radius="md" withBorder>
                                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">전체 예산 ({year})</Text>
                                    <Text fw={700} size="xl">₩{totalBudget.toLocaleString()}</Text>
                                </Card>
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                                <Card shadow="sm" padding="lg" radius="md" withBorder>
                                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">집행 금액 (Confirmed)</Text>
                                    <Text fw={700} size="xl" c="blue">₩{totalExecuted.toLocaleString()}</Text>
                                </Card>
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                                <Card shadow="sm" padding="lg" radius="md" withBorder>
                                    <Text size="xs" c="dimmed" fw={700} tt="uppercase">잔액 (Balance)</Text>
                                    <Text fw={700} size="xl" c={balance < 0 ? 'red' : 'green'}>₩{balance.toLocaleString()}</Text>
                                </Card>
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                                <Card shadow="sm" padding="lg" radius="md" withBorder>
                                    <Group justify="space-between">
                                        <div>
                                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">집행률</Text>
                                            <Text fw={700} size="xl">{rate}%</Text>
                                        </div>
                                        <RingProgress
                                            size={80}
                                            roundCaps
                                            thickness={8}
                                            sections={[{ value: rate, color: 'blue' }]}
                                            label={<Text c="blue" fw={700} ta="center" size="xs">{rate}%</Text>}
                                        />
                                    </Group>
                                </Card>
                            </Grid.Col>
                        </Grid>

                        <Grid>
                            {/* Chart */}
                            <Grid.Col span={{ base: 12, md: 8 }}>
                                <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                                    <Title order={4} mb="md">브랜드별 예산 vs 집행 현황</Title>
                                    {chartData.some(d => d.budget > 0 || d.executed > 0) ? (
                                        <BarChart
                                            h={300}
                                            data={chartData}
                                            dataKey="brand"
                                            series={[
                                                { name: 'budget', label: '총 예산(Budget)', color: 'gray.5' },
                                                { name: 'executed', label: '집행(Executed)', color: 'blue.6' },
                                            ]}
                                            tickLine="y"
                                            tooltipAnimationDuration={200}
                                        />
                                    ) : (
                                        <Text c="dimmed" ta="center" py="xl">데이터가 없습니다.</Text>
                                    )}
                                </Card>
                            </Grid.Col>

                            {/* Recent Activity */}
                            <Grid.Col span={{ base: 12, md: 4 }}>
                                <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                                    <Title order={4} mb="md">최근 캠페인 활동</Title>
                                    <Table>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>브랜드</Table.Th>
                                                <Table.Th>내용</Table.Th>
                                                <Table.Th>상태</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {yearCampaigns.slice(0, 5).map((campaign) => (
                                                <Table.Tr key={campaign.id}>
                                                    <Table.Td><Badge size="xs" variant="light" color="gray">{campaign.brand}</Badge></Table.Td>
                                                    <Table.Td>
                                                        <Text size="sm" lineClamp={1} fw={500}>{campaign.vendorDescription}</Text>
                                                        <Text size="xs" c="dimmed">{campaign.year} {campaign.quarter}</Text>
                                                    </Table.Td>
                                                    <Table.Td>
                                                        <Badge
                                                            color={
                                                                campaign.status === 'executed' ? 'blue' :
                                                                    campaign.status === 'executing' ? 'yellow' :
                                                                        campaign.status === 'closed' ? 'gray' : 'green'
                                                            }
                                                            variant="dot"
                                                            size="xs"
                                                        >
                                                            {
                                                                campaign.status === 'executed' ? '완료' :
                                                                    campaign.status === 'executing' ? '진행' :
                                                                        campaign.status === 'closed' ? '정산' : '계획'
                                                            }
                                                        </Badge>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                            {yearCampaigns.length === 0 && (
                                                <Table.Tr>
                                                    <Table.Td colSpan={3} align="center">등록된 활동이 없습니다.</Table.Td>
                                                </Table.Tr>
                                            )}
                                        </Table.Tbody>
                                    </Table>
                                </Card>
                            </Grid.Col>
                        </Grid>
                    </>
                ) : (
                    /* Detailed Table View */
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Title order={4} mb="md">브랜드/분기별 예산 상세 (Unit: KRW)</Title>
                        <Table.ScrollContainer minWidth={800}>
                            <Table striped highlightOnHover withTableBorder withColumnBorders verticalSpacing="sm">
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th w={150}>Brand / Metric</Table.Th>
                                        <Table.Th style={{ textAlign: 'right' }}>Q1</Table.Th>
                                        <Table.Th style={{ textAlign: 'right' }}>Q2</Table.Th>
                                        <Table.Th style={{ textAlign: 'right' }}>Q3</Table.Th>
                                        <Table.Th style={{ textAlign: 'right' }}>Q4</Table.Th>
                                        <Table.Th style={{ textAlign: 'right', fontWeight: 'bold' }} bg="gray.0">Total</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {detailTableRows.map((row) => (
                                        <Table.Tr key={row.brand}>
                                            <Table.Td fw={600}>{row.brand}</Table.Td>
                                            <Table.Td>{renderCell(row.Q1)}</Table.Td>
                                            <Table.Td>{renderCell(row.Q2)}</Table.Td>
                                            <Table.Td>{renderCell(row.Q3)}</Table.Td>
                                            <Table.Td>{renderCell(row.Q4)}</Table.Td>
                                            <Table.Td bg="gray.0">{renderCell(row.total)}</Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </Table.ScrollContainer>
                    </Card>
                )}
            </div>
        </AppLayout>
    );
}
