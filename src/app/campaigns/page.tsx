'use client';

import { AppLayout } from '@/components/Layout/AppLayout';
import { Title, Card, Table, Button, Group, Badge, Text, ActionIcon, LoadingOverlay, Select, Tooltip } from '@mantine/core';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { Campaign } from '@/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { BRANDS } from '@/constants/brands';

export default function CampaignsPage() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
    const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);

    useEffect(() => {
        const q = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const campaignsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Campaign[];
            setCampaigns(campaignsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredCampaigns = campaigns.filter(campaign => {
        const matchBrand = !selectedBrand || campaign.brand === selectedBrand;
        const matchQuarter = !selectedQuarter || campaign.quarter === selectedQuarter;
        return matchBrand && matchQuarter;
    });

    const summaryData = useMemo(() => {
        const grouped: Record<string, { brand: string, quarter: string, receivable: number, executed: number }> = {};

        filteredCampaigns.forEach(c => {
            const key = `${c.brand}-${c.quarter}`;
            if (!grouped[key]) {
                grouped[key] = { brand: c.brand, quarter: c.quarter, receivable: 0, executed: 0 };
            }

            const receivableRate = c.brand === 'ASUS MB' ? 0.5 : 1;
            const receivable = Math.round((c.closedAmount || 0) * receivableRate);

            grouped[key].receivable += receivable;
            grouped[key].executed += (c.totalAmount || 0);
        });

        return Object.values(grouped).sort((a, b) => {
            if (a.brand !== b.brand) return a.brand.localeCompare(b.brand);
            return a.quarter.localeCompare(b.quarter);
        });
    }, [filteredCampaigns]);

    const rows = filteredCampaigns.map((campaign) => (
        <Table.Tr
            key={campaign.id}
            onClick={() => router.push(`/campaigns/${campaign.id}`)}
            style={{ cursor: 'pointer' }}
        >
            <Table.Td>
                <Badge variant="light" color="gray">{campaign.brand}</Badge>
            </Table.Td>
            <Table.Td>{campaign.quarter}</Table.Td>
            <Table.Td fw={500}>{campaign.vendorDescription}</Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>₩{campaign.closedAmount?.toLocaleString() || 0}</Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>
                ₩{Math.round((campaign.closedAmount || 0) * (campaign.brand === 'ASUS MB' ? 0.5 : 1)).toLocaleString()}
            </Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>₩{campaign.totalAmount?.toLocaleString() || 0}</Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>
                <Text fw={700} c={Math.round((campaign.closedAmount || 0) * (campaign.brand === 'ASUS MB' ? 0.5 : 1)) - (campaign.totalAmount || 0) < 0 ? 'red' : 'teal'}>
                    ₩{(Math.round((campaign.closedAmount || 0) * (campaign.brand === 'ASUS MB' ? 0.5 : 1)) - (campaign.totalAmount || 0)).toLocaleString()}
                </Text>
            </Table.Td>
            <Table.Td>
                <Badge
                    color={
                        campaign.status === 'executed' ? 'blue' :
                            campaign.status === 'executing' ? 'yellow' :
                                campaign.status === 'closed' ? 'gray' : 'green'
                    }
                    variant="dot"
                >
                    {
                        campaign.status === 'executed' ? '집행 완료' :
                            campaign.status === 'executing' ? '집행 중' :
                                campaign.status === 'closed' ? '정산 완료' : '계획'
                    }
                </Badge>
            </Table.Td>
            <Table.Td>
                <Group gap={0} justify="flex-end" onClick={(e) => e.stopPropagation()}>
                    <ActionIcon variant="subtle" color="red">
                        <IconTrash size={16} />
                    </ActionIcon>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <AppLayout>
            <Group justify="space-between" mb="lg">
                <Title order={2}>캠페인 관리</Title>
                <Button onClick={() => router.push('/campaigns/new')}>
                    + 새 Vendor 건 등록
                </Button>
            </Group>

            <Group mb="md">
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
                    }}
                >
                    필터 초기화
                </Button>
            </Group>

            {/* Summary Table */}
            {summaryData.length > 0 && (
                <Card shadow="sm" padding="lg" radius="md" withBorder mb="lg" bg="gray.0">
                    <Title order={5} mb="md">브랜드/분기별 집행 현황 (Summary)</Title>
                    <Table verticalSpacing="xs" withTableBorder withColumnBorders bg="white">
                        <Table.Thead>
                            <Table.Tr bg="gray.1">
                                <Table.Th>브랜드</Table.Th>
                                <Table.Th>분기</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>받을 금액 (Receivable)</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>집행 금액 (Executed)</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>남은 금액 (Remaining)</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {summaryData.map((item) => {
                                const remaining = item.receivable - item.executed;
                                return (
                                    <Table.Tr key={`${item.brand}-${item.quarter}`}>
                                        <Table.Td fw={600}>{item.brand}</Table.Td>
                                        <Table.Td>{item.quarter}</Table.Td>
                                        <Table.Td style={{ textAlign: 'right' }}>₩{item.receivable.toLocaleString()}</Table.Td>
                                        <Table.Td style={{ textAlign: 'right' }}>₩{item.executed.toLocaleString()}</Table.Td>
                                        <Table.Td style={{ textAlign: 'right' }}>
                                            <Text fw={700} c={remaining < 0 ? 'red' : 'teal'}>
                                                ₩{remaining.toLocaleString()}
                                            </Text>
                                        </Table.Td>
                                    </Table.Tr>
                                );
                            })}

                            {/* Grand Total Row */}
                            <Table.Tr bg="gray.1" style={{ borderTop: '2px solid #dee2e6' }}>
                                <Table.Td fw={700} colSpan={2} style={{ textAlign: 'center' }}>전체 합계 (Total)</Table.Td>
                                <Table.Td fw={700} style={{ textAlign: 'right' }}>
                                    ₩{summaryData.reduce((acc, curr) => acc + curr.receivable, 0).toLocaleString()}
                                </Table.Td>
                                <Table.Td fw={700} style={{ textAlign: 'right' }}>
                                    ₩{summaryData.reduce((acc, curr) => acc + curr.executed, 0).toLocaleString()}
                                </Table.Td>
                                <Table.Td fw={700} style={{ textAlign: 'right' }}>
                                    <Text fw={700} c={summaryData.reduce((acc, curr) => acc + (curr.receivable - curr.executed), 0) < 0 ? 'red' : 'teal'}>
                                        ₩{summaryData.reduce((acc, curr) => acc + (curr.receivable - curr.executed), 0).toLocaleString()}
                                    </Text>
                                </Table.Td>
                            </Table.Tr>
                        </Table.Tbody>
                    </Table>
                </Card>
            )}

            <Card shadow="sm" padding="lg" radius="md" withBorder pos="relative">
                <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
                <Table striped highlightOnHover verticalSpacing="sm">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>브랜드</Table.Th>
                            <Table.Th>분기</Table.Th>
                            <Table.Th>Vendor Description</Table.Th>
                            <Table.Th style={{ textAlign: 'right' }}>클로징 제출 금액</Table.Th>
                            <Table.Th style={{ textAlign: 'right' }}>받을 금액</Table.Th>
                            <Table.Th style={{ textAlign: 'right' }}>총 집행금액</Table.Th>
                            <Table.Th style={{ textAlign: 'right' }}>잔액 (Balance)</Table.Th>
                            <Table.Th>상태</Table.Th>
                            <Table.Th style={{ textAlign: 'right' }}>관리</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {campaigns.length === 0 && !loading ? (
                            <Table.Tr>
                                <Table.Td colSpan={9} align="center">등록된 캠페인이 없습니다.</Table.Td>
                            </Table.Tr>
                        ) : rows}
                    </Table.Tbody>
                </Table>
            </Card>
        </AppLayout>
    );
}
