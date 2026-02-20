'use client';

import { AppLayout } from '@/components/Layout/AppLayout';
import { Title, Grid, Card, Text, Group, ThemeIcon, Select, Table, Badge, RingProgress, Loader, Center } from '@mantine/core';
import { IconChartPie, IconChartBar, IconCoin, IconFileInvoice, IconCash } from '@tabler/icons-react';
import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { Campaign, MarketingActivity } from '@/types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';

import { BRANDS } from '@/constants/brands';

// Fixed Brand List for the matrix table
const MATRIX_BRANDS = BRANDS;

export default function DashboardPage() {
    const [year, setYear] = useState<string>(new Date().getFullYear().toString());
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [activities, setActivities] = useState<MarketingActivity[]>([]); // New State
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);

        let q1;
        let q2;

        if (year === 'all') {
            q1 = query(collection(db, 'campaigns'));
            q2 = query(collection(db, 'marketing_activities'));
        } else {
            q1 = query(collection(db, 'campaigns'), where('year', '==', parseInt(year)));
            q2 = query(collection(db, 'marketing_activities'), where('year', '==', parseInt(year)));
        }

        // Use Promise.all or separate listeners? Dashboard usually snapshots.
        // Let's use snapshots for real-time updates.

        const unsubscribe1 = onSnapshot(q1, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Campaign[];
            setCampaigns(data);
        });

        const unsubscribe2 = onSnapshot(q2, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as MarketingActivity[];
            setActivities(data);
            setLoading(false); // Set loading false after both (simplification)
        });

        return () => {
            unsubscribe1();
            unsubscribe2();
        };
    }, [year]);

    // 1. Metrics Calculation: Plan / Actual / Closed / Value (Funding)
    const metrics = useMemo(() => {
        let totalPlan = 0;
        let totalActual = 0;
        let totalClosed = 0;
        let totalFunding = 0;

        // Plan & Actual from Activities
        activities.forEach(a => {
            totalPlan += Number(a.planCost || 0);
            totalActual += Number(a.cost || 0);
        });

        // Loop Campaigns for Closed & Funding
        campaigns.forEach(c => {
            // Closed (Settled) - usually based on Final status
            if (c.status === 'closed') {
                totalClosed += Number(c.finalVendorAmountKrw || c.closedAmount || 0);
            }

            // Total Funding (Received) - Apply ASUS MB 50% rule
            let amount = Number(c.closedAmount || 0);
            // if (c.brand === 'ASUS MB') {
            //     amount = amount * 0.5;
            // }
            totalFunding += amount;
        });

        return { totalActual, totalFunding };
    }, [campaigns, activities]);

    // 2. Breakdown Table Data: Brand x Quarter Matrix
    // Structure: { brand, Q1: { funding, actual }, ..., total: { funding, actual } }
    const breakdownData = useMemo(() => {
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];

        return MATRIX_BRANDS.map(brand => {
            const rowData: any = { brand };
            let rowFundingTotal = 0;
            let rowActualTotal = 0;

            quarters.forEach(q => {
                // 1. Funding (Campaigns)
                const funding = campaigns
                    .filter(c => c.brand === brand && c.quarter === q)
                    .reduce((sum, c) => {
                        let amount = Number(c.closedAmount || 0);
                        // if (c.brand === 'ASUS MB') amount = amount * 0.5;
                        return sum + amount;
                    }, 0);

                // 2. Actual (Activities)
                const actual = activities
                    .filter(a => a.brand === brand && a.quarter === q)
                    .reduce((sum, a) => sum + Number(a.cost || 0), 0);

                const balance = funding - actual;
                rowData[q] = { funding, actual, balance };
                rowFundingTotal += funding;
                rowActualTotal += actual;
            });

            rowData.total = { funding: rowFundingTotal, actual: rowActualTotal, balance: rowFundingTotal - rowActualTotal };
            return rowData;
        });
    }, [campaigns, activities]);

    // 3. Brand Share Data (Based on Actual Amount)
    const brandData = useMemo(() => {
        const grouped: Record<string, number> = {};

        activities.forEach(a => {
            const key = a.brand || 'Unknown';
            grouped[key] = (grouped[key] || 0) + Number(a.cost || 0);
        });

        const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];
        return Object.entries(grouped)
            .filter(([_, val]) => val > 0)
            .map(([name, value], index) => ({
                name,
                value,
                color: COLORS[index % COLORS.length]
            })).sort((a, b) => b.value - a.value);
    }, [activities]);

    // 4. Place Data (Pie Chart)
    const placeData = useMemo(() => {
        const grouped: Record<string, number> = {};
        activities.forEach(a => {
            const key = a.place || 'Unknown';
            grouped[key] = (grouped[key] || 0) + Number(a.cost || 0);
        });

        const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#a4de6c'];
        return Object.entries(grouped)
            .map(([name, value], index) => ({
                name,
                value,
                color: COLORS[index % COLORS.length]
            }))
            .sort((a, b) => b.value - a.value);
    }, [activities]);

    // 5. Quarterly Trend Data (Lines by Brand)
    const quarterlyData = useMemo(() => {
        const grouped: Record<string, any> = {};

        // We need all unique brands to know which lines to render
        // But distinct brands are usually in 'BRANDS' constant. 
        // We can just use that or discover from data. 
        // Let's iterate activities to build the structure.

        activities.forEach(a => {
            const y = a.year || 'Unknown';
            const q = a.quarter || 'Unknown';
            const key = `${y} ${q}`; // e.g. "2024 Q1"
            const brand = a.brand || 'Unknown';

            if (!grouped[key]) {
                grouped[key] = { name: key };
            }
            grouped[key][brand] = (grouped[key][brand] || 0) + Number(a.cost || 0);
        });

        // Convert to array and sort
        const result = Object.values(grouped).sort((a: any, b: any) => a.name.localeCompare(b.name));
        return result;
    }, [activities]);

    const activeBrands = useMemo(() => {
        // Find which brands actually have data in the filtered result to show lines for them
        const brands = new Set<string>();
        activities.forEach(a => {
            if (a.brand) brands.add(a.brand);
        });
        return Array.from(brands);
    }, [activities]);

    const placeTotal = useMemo(() => {
        return placeData.reduce((acc, curr) => acc + curr.value, 0);
    }, [placeData]);

    // Colors for Brand Lines
    const BRAND_COLORS: Record<string, string> = {
        'ASUS VGA': '#ff0000',
        'ASUS MB': '#0000ff',
        'ASUS LCD': '#00ff00',
        'MANLI': '#ff00ff',
        'INTEL': '#00ffff',
        'ASRock': '#e67700', // Changed from Yellow to Orange for visibility
        'POWER': '#800000',
        'iPC': '#808000',
        'others': '#800080',
        'Unknown': '#808080'
    };

    // Sort logic for Trend Table columns (Quarters)
    const trendQuarters = useMemo(() => {
        return quarterlyData.map(d => d.name);
    }, [quarterlyData]);

    return (
        <AppLayout>
            <Group justify="space-between" mb="lg">
                <Title order={2}>대시보드</Title>
                <Select
                    value={year}
                    onChange={(val) => setYear(val || new Date().getFullYear().toString())}
                    data={[
                        { value: 'all', label: '전체 (Total)' },
                        { value: '2024', label: '2024' },
                        { value: '2025', label: '2025' },
                        { value: '2026', label: '2026' }
                    ]}
                    w={130}
                    allowDeselect={false}
                />
            </Group>

            {loading ? (
                <Center h={400}>
                    <Loader size="lg" />
                </Center>
            ) : (
                <>
                    {/* 4 Metrics Cards */}
                    <Grid mb="lg">
                        <Grid.Col span={{ base: 12, sm: 6 }}>
                            <Card shadow="sm" padding="lg" radius="md" withBorder>
                                <Group justify="space-between" mb="xs">
                                    <Text fw={500} c="dimmed">총 펀딩 금액 (Funding)</Text>
                                    <ThemeIcon color="grape" variant="light" size="lg">
                                        <IconCash size={20} />
                                    </ThemeIcon>
                                </Group>
                                <Text fw={700} size="xl" c="grape.7">₩{metrics.totalFunding.toLocaleString()}</Text>
                                <Text size="xs" c="dimmed" mt="xs">확정된 제조사 펀딩 총액</Text>
                            </Card>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, sm: 6 }}>
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
                    </Grid>

                    <Grid mb="lg">
                        <Grid.Col span={{ base: 12, md: 8 }}>
                            {/* Granular Table */}
                            <Card shadow="sm" padding="lg" radius="md" withBorder h="100%">
                                <Title order={5} mb="md">브랜드/분기별 펀딩 vs 집행 현황 (Received / Actual)</Title>
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
                                                {['Q1', 'Q2', 'Q3', 'Q4'].map((q) => (
                                                    <Table.Td key={q} style={{ textAlign: 'right' }}>
                                                        <Text size="xs" c="dimmed">₩{row[q].funding.toLocaleString()}</Text>
                                                        <Text size="sm" fw={700}>₩{row[q].actual.toLocaleString()}</Text>
                                                        <Text size="xs" c={row[q].balance >= 0 ? "blue" : "red"}>₩{row[q].balance.toLocaleString()}</Text>
                                                    </Table.Td>
                                                ))}
                                                <Table.Td style={{ textAlign: 'right' }} bg="gray.0">
                                                    <Text size="xs" c="dimmed">₩{row.total.funding.toLocaleString()}</Text>
                                                    <Text size="sm" fw={700}>₩{row.total.actual.toLocaleString()}</Text>
                                                    <Text size="xs" c={row.total.balance >= 0 ? "blue" : "red"}>₩{row.total.balance.toLocaleString()}</Text>
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                        {/* Total Summary Row Calculation */}
                                        <Table.Tr style={{ borderTop: '2px solid #dee2e6' }}>
                                            <Table.Td fw={700} align='center'>Total</Table.Td>
                                            {['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
                                                const qFunding = breakdownData.reduce((acc, row) => acc + row[q].funding, 0);
                                                const qActual = breakdownData.reduce((acc, row) => acc + row[q].actual, 0);
                                                return (
                                                    <Table.Td key={q} style={{ textAlign: 'right' }}>
                                                        <Text size="xs" c="dimmed">₩{qFunding.toLocaleString()}</Text>
                                                        <Text size="sm" fw={700}>₩{qActual.toLocaleString()}</Text>
                                                        <Text size="xs" c={(qFunding - qActual) >= 0 ? "blue" : "red"}>₩{(qFunding - qActual).toLocaleString()}</Text>
                                                    </Table.Td>
                                                )
                                            })}
                                            <Table.Td style={{ textAlign: 'right' }} fw={900} bg="gray.1">
                                                <Text size="xs" c="dimmed">₩{breakdownData.reduce((acc, row) => acc + row.total.funding, 0).toLocaleString()}</Text>
                                                <Text size="sm" fw={900} c="blue">₩{breakdownData.reduce((acc, row) => acc + row.total.actual, 0).toLocaleString()}</Text>
                                                <Text size="xs" c={(breakdownData.reduce((acc, row) => acc + row.total.funding, 0) - breakdownData.reduce((acc, row) => acc + row.total.actual, 0)) >= 0 ? "blue" : "red"}>
                                                    ₩{(breakdownData.reduce((acc, row) => acc + row.total.funding, 0) - breakdownData.reduce((acc, row) => acc + row.total.actual, 0)).toLocaleString()}
                                                </Text>
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
                                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
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

                    {/* New Graphs Section */}

                    {/* Place Pie Chart & Table */}
                    <Card shadow="sm" padding="lg" radius="md" withBorder mb="lg">
                        <Title order={5} mb="xl">집행 처(Place)별 집행 비중</Title>
                        <Grid>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={placeData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            fill="#8884d8"
                                            paddingAngle={5}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                        >
                                            {placeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(value: number) => `₩${value.toLocaleString()}`} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                                {placeData.length === 0 && (
                                    <Center h={200}>
                                        <Text c="dimmed">데이터가 없습니다.</Text>
                                    </Center>
                                )}
                            </Grid.Col>
                            <Grid.Col span={{ base: 12, md: 6 }}>
                                <Table striped highlightOnHover withTableBorder>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>집행처 (Place)</Table.Th>
                                            <Table.Th style={{ textAlign: 'right' }}>금액 (Amount)</Table.Th>
                                            <Table.Th style={{ textAlign: 'right' }}>비율 (Ratio)</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {placeData.map((d) => (
                                            <Table.Tr key={d.name}>
                                                <Table.Td>
                                                    <Group gap="xs">
                                                        <div style={{ width: 10, height: 10, backgroundColor: d.color, borderRadius: '50%' }} />
                                                        {d.name}
                                                    </Group>
                                                </Table.Td>
                                                <Table.Td style={{ textAlign: 'right' }}>₩{d.value.toLocaleString()}</Table.Td>
                                                <Table.Td style={{ textAlign: 'right' }}>
                                                    {placeTotal > 0 ? ((d.value / placeTotal) * 100).toFixed(1) : 0}%
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                        <Table.Tr style={{ borderTop: '2px solid #dee2e6' }}>
                                            <Table.Td fw={700}>Total</Table.Td>
                                            <Table.Td style={{ textAlign: 'right' }} fw={700}>₩{placeTotal.toLocaleString()}</Table.Td>
                                            <Table.Td style={{ textAlign: 'right' }} fw={700}>100%</Table.Td>
                                        </Table.Tr>
                                    </Table.Tbody>
                                </Table>
                            </Grid.Col>
                        </Grid>
                    </Card>

                    {/* Quarterly Line Chart & Table */}
                    <Card shadow="sm" padding="lg" radius="md" withBorder>
                        <Title order={5} mb="xl">분기별/제조사별 집행 추이</Title>

                        {/* Chart */}
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={quarterlyData} margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RechartsTooltip formatter={(value: number) => `₩${value.toLocaleString()}`} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ paddingLeft: '20px' }} />
                                {activeBrands.map((brand, idx) => (
                                    <Line
                                        key={brand}
                                        type="monotone"
                                        dataKey={brand}
                                        name={brand}
                                        stroke={BRAND_COLORS[brand] || `hsl(${idx * 40}, 70%, 50%)`}
                                        strokeWidth={2}
                                        activeDot={{ r: 8 }}
                                        connectNulls // Connect points if gaps exist
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>

                        <div style={{ padding: '20px 0' }}></div>

                        {/* Table */}
                        <Table striped highlightOnHover withTableBorder withColumnBorders>
                            <Table.Thead bg="gray.1">
                                <Table.Tr>
                                    <Table.Th>제조사 (Brand)</Table.Th>
                                    {trendQuarters.map(q => (
                                        <Table.Th key={q} style={{ textAlign: 'right' }}>{q}</Table.Th>
                                    ))}
                                    <Table.Th style={{ textAlign: 'right' }}>Total</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {activeBrands.map(brand => {
                                    let rowTotal = 0;
                                    return (
                                        <Table.Tr key={brand}>
                                            <Table.Td fw={600} bg="gray.0">{brand}</Table.Td>
                                            {trendQuarters.map(q => {
                                                const qData = quarterlyData.find(d => d.name === q);
                                                const val = qData ? (qData[brand] || 0) : 0;
                                                rowTotal += val;
                                                return (
                                                    <Table.Td key={q} style={{ textAlign: 'right' }}>
                                                        {val > 0 ? `₩${val.toLocaleString()}` : '-'}
                                                    </Table.Td>
                                                );
                                            })}
                                            <Table.Td style={{ textAlign: 'right' }} fw={700} bg="gray.0">
                                                ₩{rowTotal.toLocaleString()}
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                            </Table.Tbody>
                        </Table>
                    </Card>
                    <div style={{ marginBottom: 50 }} />
                </>
            )}
        </AppLayout>
    );
}
