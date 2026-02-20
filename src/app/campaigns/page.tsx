'use client';

import { AppLayout } from '@/components/Layout/AppLayout';
import { Title, Card, Table, Button, Group, Badge, Text, ActionIcon, LoadingOverlay, Select, Tooltip, Tabs } from '@mantine/core';
import { IconPlus, IconEdit, IconTrash, IconArrowsSort, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { Campaign } from '@/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { BRANDS } from '@/constants/brands';
import { MarketingActivity } from '@/types'; // Import MarketingActivity
import { FundingSummary } from '@/components/Campaign/FundingSummary'; // Import FundingSummary

export default function CampaignsPage() {
    const router = useRouter();
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [activities, setActivities] = useState<MarketingActivity[]>([]); // New State
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<string | null>('asus_vga');
    const [selectedQuarter, setSelectedQuarter] = useState<string | null>(null);
    const [selectedYear, setSelectedYear] = useState<string | null>(new Date().getFullYear().toString()); // Year Filter

    // Sorting State
    const [sortBy, setSortBy] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        const q1 = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
        const unsubscribe1 = onSnapshot(q1, (snapshot) => {
            const campaignsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Campaign[];
            setCampaigns(campaignsData);
            setLoading(false);
        });

        const q2 = query(collection(db, 'marketing_activities'), orderBy('createdAt', 'desc'));
        const unsubscribe2 = onSnapshot(q2, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as MarketingActivity[];
            setActivities(data);
        });

        return () => {
            unsubscribe1();
            unsubscribe2();
        };
    }, []);

    // 1. Filter by Tab & Quarter
    const filteredCampaigns = useMemo(() => {
        return campaigns.filter(campaign => {
            let matchBrand = false;
            if (activeTab === 'asus_vga') {
                matchBrand = campaign.brand === 'ASUS VGA';
            } else if (activeTab === 'asus_mb') {
                matchBrand = campaign.brand === 'ASUS MB';
            } else if (activeTab === 'asus_lcd') {
                matchBrand = campaign.brand === 'ASUS LCD';
            } else if (activeTab === 'manli') {
                matchBrand = campaign.brand === 'MANLI';
            } else if (activeTab === 'intel') {
                matchBrand = campaign.brand === 'INTEL';
            } else if (activeTab === 'asrock') {
                matchBrand = campaign.brand === 'ASRock';
            } else if (activeTab === 'power') {
                matchBrand = campaign.brand === 'POWER';
            } else if (activeTab === 'ipc') {
                matchBrand = campaign.brand === 'iPC';
            } else if (activeTab === 'others') {
                matchBrand = campaign.brand === 'others';
            } else {
                matchBrand = true;
            }

            const matchQuarter = !selectedQuarter || campaign.quarter === selectedQuarter;
            const matchYear = !selectedYear || selectedYear === 'all' || campaign.year === parseInt(selectedYear);
            return matchBrand && matchQuarter && matchYear;
        });
    }, [campaigns, activeTab, selectedQuarter, selectedYear]);

    const filteredActivities = useMemo(() => {
        return activities.filter(activity => {
            let matchBrand = false;
            if (activeTab === 'asus_vga') {
                matchBrand = activity.brand === 'ASUS VGA';
            } else if (activeTab === 'asus_mb') {
                matchBrand = activity.brand === 'ASUS MB';
            } else if (activeTab === 'asus_lcd') {
                matchBrand = activity.brand === 'ASUS LCD';
            } else if (activeTab === 'manli') {
                matchBrand = activity.brand === 'MANLI';
            } else if (activeTab === 'intel') {
                matchBrand = activity.brand === 'INTEL';
            } else if (activeTab === 'asrock') {
                matchBrand = activity.brand === 'ASRock';
            } else if (activeTab === 'power') {
                matchBrand = activity.brand === 'POWER';
            } else if (activeTab === 'ipc') {
                matchBrand = activity.brand === 'iPC';
            } else if (activeTab === 'others') {
                matchBrand = activity.brand === 'others';
            } else {
                matchBrand = true;
            }

            const matchQuarter = !selectedQuarter || activity.quarter === selectedQuarter;
            const matchYear = !selectedYear || selectedYear === 'all' || activity.year === parseInt(selectedYear);
            return matchBrand && matchQuarter && matchYear;
        });
    }, [activities, activeTab, selectedQuarter, selectedYear]);

    // 2. Sort Logic
    const sortedCampaigns = useMemo(() => {
        if (!sortBy) return filteredCampaigns;

        return [...filteredCampaigns].sort((a, b) => {
            let valueA: any = a[sortBy as keyof Campaign];
            let valueB: any = b[sortBy as keyof Campaign];

            // Handle special cases or defaults
            if (sortBy === 'vendorDescription') {
                valueA = (valueA || '').toLowerCase();
                valueB = (valueB || '').toLowerCase();
            } else if (sortBy === 'totalAmount') {
                valueA = valueA || 0;
                valueB = valueB || 0;
            } else if (sortBy === 'status') {
                valueA = (valueA || '').toLowerCase();
                valueB = (valueB || '').toLowerCase();
            }

            if (valueA < valueB) return sortDirection === 'asc' ? -1 : 1;
            if (valueA > valueB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredCampaigns, sortBy, sortDirection]);

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortDirection('asc');
        }
    };

    const SortIcon = ({ field }: { field: string }) => {
        if (sortBy !== field) return <IconArrowsSort size={14} style={{ opacity: 0.3 }} />;
        return sortDirection === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />;
    };

    const resetData = async () => {
        if (confirm('정말로 모든 캠페인 데이터를 삭제하시겠습니까? (복구 불가)')) {
            const { resetCampaigns } = await import('@/lib/reset');
            await resetCampaigns();
            alert('데이터가 초기화되었습니다.');
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('정말로 이 제조사 펀딩 내역을 삭제하시겠습니까?')) return;

        try {
            await deleteDoc(doc(db, 'campaigns', id));
            // Snapshot listener will update the list automatically
        } catch (error) {
            console.error("Error deleting document:", error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    const rows = sortedCampaigns.map((campaign) => (
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
            <Table.Td>
                {campaign.cnNumber && <Badge variant="outline" color="gray" size="sm">{campaign.cnNumber}</Badge>}
            </Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>₩{campaign.closedAmount?.toLocaleString() || 0}</Table.Td>
            <Table.Td style={{ textAlign: 'right' }}>
                ₩{(campaign.closedAmount || 0).toLocaleString()}
            </Table.Td>
            {/* Removed Executed and Balance columns per request */}
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
                    <ActionIcon variant="subtle" color="red" onClick={(e) => handleDelete(campaign.id, e)}>
                        <IconTrash size={16} />
                    </ActionIcon>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <AppLayout>
            <Group justify="space-between" mb="lg">
                <Title order={2}>제조사 펀딩 관리</Title>
                <Group>
                    <Button variant="subtle" color="red" size="xs" onClick={resetData}>데이터 초기화 (Debug)</Button>
                    <Button onClick={() => router.push('/campaigns/new')}>
                        + 새 Vendor 건 등록
                    </Button>
                </Group>
            </Group>

            {/* Quarter Filter (Global) */}
            <Group mb="md" justify="flex-end">
                <Select
                    placeholder="년도"
                    data={[
                        { value: 'all', label: '전체 (Total)' },
                        { value: '2024', label: '2024' },
                        { value: '2025', label: '2025' },
                        { value: '2026', label: '2026' }
                    ]}
                    value={selectedYear}
                    onChange={setSelectedYear}
                    style={{ width: 120 }}
                    allowDeselect={false}
                />
                <Select
                    placeholder="분기 선택"
                    data={['Q1', 'Q2', 'Q3', 'Q4']}
                    value={selectedQuarter}
                    onChange={setSelectedQuarter}
                    clearable
                    style={{ width: 150 }}
                />
            </Group>

            <Tabs value={activeTab} onChange={setActiveTab} mb="lg">
                <Tabs.List>
                    <Tabs.Tab value="asus_vga">ASUS VGA</Tabs.Tab>
                    <Tabs.Tab value="asus_mb">ASUS MB</Tabs.Tab>
                    <Tabs.Tab value="asus_lcd">ASUS LCD</Tabs.Tab>
                    <Tabs.Tab value="manli">Manli</Tabs.Tab>
                    <Tabs.Tab value="intel">INTEL</Tabs.Tab>
                    <Tabs.Tab value="asrock">ASRock</Tabs.Tab>
                    <Tabs.Tab value="power">POWER</Tabs.Tab>
                    <Tabs.Tab value="ipc">iPC</Tabs.Tab>
                    <Tabs.Tab value="others">others</Tabs.Tab>
                </Tabs.List>
            </Tabs>

            <FundingSummary
                campaigns={filteredCampaigns}
                activities={filteredActivities}
                brand={activeTab}
                quarter={selectedQuarter}
            />

            <Card shadow="sm" padding="lg" radius="md" withBorder pos="relative">
                <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />
                <Table striped highlightOnHover verticalSpacing="sm">
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>브랜드</Table.Th>
                            <Table.Th>분기</Table.Th>
                            <Table.Th style={{ cursor: 'pointer' }} onClick={() => handleSort('vendorDescription')}>
                                <Group gap="xs">
                                    Vendor Description
                                    <SortIcon field="vendorDescription" />
                                </Group>
                            </Table.Th>
                            <Table.Th>CN#</Table.Th>
                            <Table.Th style={{ textAlign: 'right' }}>클로징 제출 금액</Table.Th>
                            <Table.Th style={{ textAlign: 'right' }}>받을 금액 (Confirmed)</Table.Th>
                            {/* Removed totalAmount and Balance headers */}
                            <Table.Th style={{ cursor: 'pointer' }} onClick={() => handleSort('status')}>
                                <Group gap="xs">
                                    상태
                                    <SortIcon field="status" />
                                </Group>
                            </Table.Th>
                            <Table.Th style={{ textAlign: 'right' }}>관리</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {sortedCampaigns.length === 0 && !loading ? (
                            <Table.Tr>
                                <Table.Td colSpan={10} align="center">등록된 캠페인이 없습니다.</Table.Td>
                            </Table.Tr>
                        ) : rows}
                    </Table.Tbody>
                </Table>
            </Card>
        </AppLayout>
    );
}
