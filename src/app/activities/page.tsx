'use client';

import { AppLayout } from '@/components/Layout/AppLayout';
import { Title, Card, Table, Button, Group, Badge, Text, Select, LoadingOverlay } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { MarketingActivity } from '@/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { BRANDS } from '@/constants/brands';

export default function ActivitiesPage() {
    const router = useRouter();
    const [activities, setActivities] = useState<MarketingActivity[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
    const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<string | null>(new Date().getFullYear().toString());

    useEffect(() => {
        const q = query(collection(db, 'marketing_activities'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as MarketingActivity[];
            setActivities(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredActivities = activities.filter(item => {
        const matchBrand = !selectedBrand || item.brand === selectedBrand;
        const matchQuarter = !selectedQuarter || item.quarter === selectedQuarter;
        const matchYear = !selectedYear || item.year === parseInt(selectedYear);
        return matchBrand && matchQuarter && matchYear;
    });

    const rows = filteredActivities.map((activity) => (
        <Table.Tr
            key={activity.id}
            onClick={() => router.push(`/activities/${activity.id}`)}
            style={{ cursor: 'pointer' }}
        >
            <Table.Td>{activity.place}</Table.Td>
            <Table.Td>{activity.product}</Table.Td>
            <Table.Td>{activity.description}</Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>₩{activity.cost?.toLocaleString() || 0}</Table.Td>
            <Table.Td align="center">
                {activity.isVendorSupported ? (
                    <Badge color="blue" variant="light">지원(O)</Badge>
                ) : (
                    <Text c="dimmed">-</Text>
                )}
            </Table.Td>
            <Table.Td>
                <Badge
                    color={
                        activity.status === '완료' ? 'green' :
                            activity.status === '진행중' ? 'blue' : 'gray'
                    }
                >
                    {activity.status}
                </Badge>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <AppLayout>
            <Group justify="space-between" mb="lg">
                <Title order={2}>MKT 활동 관리</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={() => router.push('/activities/new')}>
                    활동 등록
                </Button>
            </Group>

            <Group mb="md">
                <Select
                    placeholder="년도"
                    data={['2024', '2025', '2026']}
                    value={selectedYear}
                    onChange={setSelectedYear}
                    style={{ width: 100 }}
                />
                <Select
                    placeholder="브랜드 선택"
                    data={BRANDS}
                    value={selectedBrand}
                    onChange={setSelectedBrand}
                    clearable
                    style={{ width: 200 }}
                />
                <Select
                    placeholder="분기 선택"
                    data={['Q1', 'Q2', 'Q3', 'Q4']}
                    value={selectedQuarter}
                    onChange={setSelectedQuarter}
                    clearable
                    style={{ width: 150 }}
                />
                <Button
                    variant="subtle"
                    color="gray"
                    onClick={() => {
                        setSelectedBrand(null);
                        setSelectedQuarter(null);
                        setSelectedYear(null);
                    }}
                >
                    필터 초기화
                </Button>
            </Group>

            <Card shadow="sm" padding="lg" radius="md" withBorder pos="relative">
                <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
                <Table striped highlightOnHover verticalSpacing="sm">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Place</Table.Th>
                            <Table.Th>Product</Table.Th>
                            <Table.Th>Description</Table.Th>
                            <Table.Th style={{ textAlign: 'right' }}>비용</Table.Th>
                            <Table.Th style={{ textAlign: 'center' }}>Vendor 지원</Table.Th>
                            <Table.Th>상태</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {filteredActivities.length === 0 && !loading ? (
                            <Table.Tr>
                                <Table.Td colSpan={6} align="center">등록된 활동이 없습니다.</Table.Td>
                            </Table.Tr>
                        ) : rows}
                    </Table.Tbody>
                </Table>
            </Card>
        </AppLayout>
    );
}
