'use client';

import { AppLayout } from '@/components/Layout/AppLayout';
import { Title, Grid, Card, Text, Group, ThemeIcon, Select, Table, Badge, RingProgress, Loader, Center } from '@mantine/core';
import { IconChartPie, IconChartBar, IconCoin, IconFileInvoice, IconCash } from '@tabler/icons-react';
import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { Campaign } from '@/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

import { BRANDS } from '@/constants/brands';

// Fixed Brand List for the matrix table
const MATRIX_BRANDS = BRANDS;

export default function DashboardPage() {
    const [year, setYear] = useState<string>('2025');
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'campaigns'), where('year', '==', parseInt(year)));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Campaign[];
            setCampaigns(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [year]);

    // 1. Metrics Calculation: Plan / Actual / Closed
    const metrics = useMemo(() => {
        let totalPlan = 0;
        let totalActual = 0;
        let totalClosed = 0;

        campaigns.forEach(c => {
            const executions = c.executions || []; // Defensive: Default to empty array

            // Plan: Sum of all executions' planAmount (internal plan)
            const planSum = executions.reduce((sum, e) => sum + Number(e.planAmount || 0), 0);
            totalPlan += planSum;

            // Actual: Sum of all executions' actualAmount (internal spent)
            const actualSum = executions.reduce((sum, e) => sum + Number(e.actualAmount || 0), 0);
            totalActual += actualSum;

            // Closed: Final Vendor Amount (only if closed)
            if (c.status === 'closed') {
                totalClosed += Number(c.finalVendorAmountKrw || c.totalAmount || 0);
            }
        });

        return { totalPlan, totalActual, totalClosed };
    }, [campaigns]);

    // 2. Breakdown Table Data: Brand x Quarter Matrix (showing 'Actual' Amount)
    const breakdownData = useMemo(() => {
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

        return MATRIX_BRANDS.map(brand => {
            const rowData: any = { brand };
            let rowTotal = 0;

            quarters.forEach(q => {
                // Sum 'actualAmount' of executions for campaigns matching Brand & Quarter
                const amount = campaigns
                    .filter(c => c.brand === brand && c.quarter === q)
                    .reduce((total, c) => {
                        const executions = c.executions || [];
                        const execSum = executions.reduce((s, e) => s + Number(e.actualAmount || 0), 0);
                        return total + execSum;
                    }, 0);

                rowData[q] = amount;
                rowTotal += amount;
            });

            rowData.total = rowTotal;
            return rowData;
        });
    }, [campaigns]);

    // 3. Brand Share Data (Based on Actual Amount)
    const brandData = useMemo(() => {
        const grouped: Record<string, number> = {};
        campaigns.forEach(c => {
            const key = c.brand || 'Unknown';
            const executions = c.executions || [];
            const actualSum = executions.reduce((sum, e) => sum + Number(e.actualAmount || 0), 0);
            grouped[key] = (grouped[key] || 0) + actualSum;
        });

        const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
        return Object.entries(grouped)
            .filter(([_, val]) => val > 0)
            .map(([name, value], index) => ({
                name,
                value,
                color: COLORS[index % COLORS.length]
            })).sort((a, b) => b.value - a.value);
    }, [campaigns]);

    return (
        <AppLayout>
            <Group justify="space-between" mb="lg">
                <Title order={2}>대시보드</Title>
                <Select
                    value={year}
                    onChange={(val) => setYear(val || '2025')}
                    data={['2024', '2025', '2026']}
                    w={120}
                    allowDeselect={false}
                />
            </Group>

            {loading ? (
                <Center h={400}>
                    <Loader size="lg" />
                </Center>
            ) : (
                <>
                    {/* 3 Metrics Cards */}
                    <Grid mb="lg">
                        <Grid.Col span={{ base: 12, sm: 4 }}>
                            <Card shadow="sm" padding="lg" radius="md" withBorder>
                                <Group justify="space-between" mb="xs">
                                    <Text fw={500} c="dimmed">총 기안 금액 (Plan)</Text>
                                    <ThemeIcon color="blue" variant="light" size="lg">
                                        <IconFileInvoice size={20} />
                                    </ThemeIcon>
                                </Group>
                                <Text fw={700} size="xl" c="blue.7">₩{metrics.totalPlan.toLocaleString()}</Text>
                                <Text size="xs" c="dimmed" mt="xs">내부 기안(Plan) 합계</Text>
                            </Card>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 4 }}>
                            <Card shadow="sm" padding="lg" radius="md" withBorder>
                                <Group justify="space-between" mb="xs">
                                    <Text fw={500} c="dimmed">실 집행 금액 (Actual)</Text>
                                    <ThemeIcon color="orange" variant="light" size="lg">
                                        <IconChartBar size={20} />
                                    </ThemeIcon>
                                </Group>
                                <Text fw={700} size="xl" c="orange.7">₩{metrics.totalActual.toLocaleString()}</Text>
                                <Text size="xs" c="dimmed" mt="xs">실제 집행(Activity) 합계</Text>
                            </Card>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 4 }}>
                            <Card shadow="sm" padding="lg" radius="md" withBorder>
                                <Group justify="space-between" mb="xs">
                                    <Text fw={500} c="dimmed">최종 정산 금액 (Closed)</Text>
                                    <ThemeIcon color="green" variant="light" size="lg">
                                        <IconCoin size={20} />
                                    </ThemeIcon>
                                </Group>
                                <Text fw={700} size="xl" c="green.7">₩{metrics.totalClosed.toLocaleString()}</Text>
                                <Text size="xs" c="dimmed" mt="xs">정산 완료(Closed) 건 합계</Text>
                            </Card>
                        </Grid.Col>
                    </Grid>

                    <Grid mb="lg">
                        <Grid.Col span={{ base: 12, md: 8 }}>
                            {/* Granular Table */}
                            <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                                <Title order={5} mb="md">브랜드/분기별 실 집행 현황 (Actual)</Title>
                                <Table striped highlightOnHover withTableBorder withColumnBorders>
                                    <Table.Thead bg="gray.1">
                                        <Table.Tr>
                                            <Table.Th>Brand</Table.Th>
                                            <Table.Th style={{ textAlign: 'right' }}>Q1</Table.Th>
                                            <Table.Th style={{ textAlign: 'right' }}>Q2</Table.Th>
                                            <Table.Th style={{ textAlign: 'right' }}>Q3</Table.Th>
                                            <Table.Th style={{ textAlign: 'right' }}>Q4</Table.Th>
                                            <Table.Th style={{ textAlign: 'right' }}>Total</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {breakdownData.map((row) => (
                                            <Table.Tr key={row.brand}>
                                                <Table.Td fw={600} bg="gray.0">{row.brand}</Table.Td>
                                                <Table.Td style={{ textAlign: 'right' }}>{row.Q1 > 0 ? `₩${row.Q1.toLocaleString()}` : '-'}</Table.Td>
                                                <Table.Td style={{ textAlign: 'right' }}>{row.Q2 > 0 ? `₩${row.Q2.toLocaleString()}` : '-'}</Table.Td>
                                                <Table.Td style={{ textAlign: 'right' }}>{row.Q3 > 0 ? `₩${row.Q3.toLocaleString()}` : '-'}</Table.Td>
                                                <Table.Td style={{ textAlign: 'right' }}>{row.Q4 > 0 ? `₩${row.Q4.toLocaleString()}` : '-'}</Table.Td>
                                                <Table.Td style={{ textAlign: 'right' }} fw={700} bg="gray.0">₩{row.total.toLocaleString()}</Table.Td>
                                            </Table.Tr>
                                        ))}
                                        <Table.Tr style={{ borderTop: '2px solid #dee2e6' }}>
                                            <Table.Td fw={700} align='center'>Total</Table.Td>
                                            <Table.Td style={{ textAlign: 'right' }} fw={700}>
                                                ₩{breakdownData.reduce((acc, row) => acc + row.Q1, 0).toLocaleString()}
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'right' }} fw={700}>
                                                ₩{breakdownData.reduce((acc, row) => acc + row.Q2, 0).toLocaleString()}
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'right' }} fw={700}>
                                                ₩{breakdownData.reduce((acc, row) => acc + row.Q3, 0).toLocaleString()}
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'right' }} fw={700}>
                                                ₩{breakdownData.reduce((acc, row) => acc + row.Q4, 0).toLocaleString()}
                                            </Table.Td>
                                            <Table.Td style={{ textAlign: 'right' }} fw={900} c="blue">
                                                ₩{breakdownData.reduce((acc, row) => acc + row.total, 0).toLocaleString()}
                                            </Table.Td>
                                        </Table.Tr>
                                    </Table.Tbody>
                                </Table>
                            </Card>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 4 }}>
                            {/* Pie Chart */}
                            <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                                <Title order={5} mb="xl">실 집행 비중 (Share)</Title>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={brandData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        >
                                            {brandData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(value: number) => `₩${value.toLocaleString()}`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                                {brandData.length === 0 && (
                                    <Center h={200}>
                                        <Text c="dimmed">데이터가 없습니다.</Text>
                                    </Center>
                                )}
                            </Card>
                        </Grid.Col>
                    </Grid>
                </>
            )}
        </AppLayout>
    );
}
