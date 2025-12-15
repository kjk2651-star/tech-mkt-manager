'use client';

import { AppLayout } from '@/components/Layout/AppLayout';
import { Title, Card, Grid, Group, Badge, Button, Text, Divider, Select, NumberInput, TextInput, Textarea, Stack, Tabs, Image, Modal, SimpleGrid, Loader, LoadingOverlay, Table, ActionIcon } from '@mantine/core';
import { IconArrowLeft, IconDeviceFloppy, IconTrash, IconUpload, IconLink, IconPhoto, IconFile, IconPlus, IconEdit, IconX, IconCalculator } from '@tabler/icons-react';
import { useRouter, useParams } from 'next/navigation';
import { BRANDS } from '@/constants/brands';
import { useDisclosure } from '@mantine/hooks';
import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Campaign, Execution } from '@/types';

export default function CampaignDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const [imageModalOpened, { open: openImageModal, close: closeImageModal }] = useDisclosure(false);
    const [executionModalOpened, { open: openExecutionModal, close: closeExecutionModal }] = useDisclosure(false);
    const [selectedImage, setSelectedImage] = useState<string>('');

    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Root Level Editable States
    const [vendorDescription, setVendorDescription] = useState('');
    const [status, setStatus] = useState<'planned' | 'executing' | 'executed' | 'closed'>('planned');
    const [brand, setBrand] = useState('');
    const [quarter, setQuarter] = useState('');
    const [year, setYear] = useState(2025);
    const [caseId, setCaseId] = useState('');
    const [invoice, setInvoice] = useState('');
    const [description, setDescription] = useState('');

    // Financials
    const [closedAmount, setClosedAmount] = useState<number | string>(0);
    const [closedAmountUsd, setClosedAmountUsd] = useState<number | string>(0);
    const [exchangeRate, setExchangeRate] = useState<number | string>(1400);

    // Final Vendor Closing Amount (Invoice)
    const [finalVendorAmountUsd, setFinalVendorAmountUsd] = useState<number | string>(0);
    const [finalVendorExchangeRate, setFinalVendorExchangeRate] = useState<number | string>(1400);
    const [finalVendorAmountKrw, setFinalVendorAmountKrw] = useState<number | string>(0);

    // Execution Form State
    const [editingExecution, setEditingExecution] = useState<Execution | null>(null);
    const [execForm, setExecForm] = useState<Partial<Execution>>({});

    // Fetch Data
    useEffect(() => {
        const fetchCampaign = async () => {
            if (!id) return;
            try {
                const docRef = doc(db, 'campaigns', id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = { id: docSnap.id, ...docSnap.data() } as Campaign;
                    setCampaign(data);

                    // Initialize States
                    setVendorDescription(data.vendorDescription || '');
                    setStatus(data.status || 'planned');
                    setBrand(data.brand || '');
                    setQuarter(data.quarter || 'Q1');
                    setYear(data.year || 2025);
                    setCaseId(data.caseId || '');
                    setInvoice(data.invoice || '');
                    setDescription(data.description || '');

                    setClosedAmount(data.closedAmount || 0);
                    setClosedAmountUsd(data.closedAmountUsd || 0);
                    setExchangeRate(data.appliedExchangeRate || 1400);

                    setFinalVendorAmountUsd(data.finalVendorAmountUsd || 0);
                    setFinalVendorExchangeRate(data.finalVendorExchangeRate || 1400);
                    setFinalVendorAmountKrw(data.finalVendorAmountKrw || 0);
                } else {
                    console.log("No such document!");
                }
            } catch (error) {
                console.error("Error getting document:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchCampaign();
    }, [id]);

    // Save Root Data
    const handleSaveRoot = async () => {
        if (!campaign || !id) return;
        setSaving(true);

        let newStatus = status;
        let autoClosed = false;

        // Auto-Close Logic: If Final KRW or USD is entered (>0), force status to 'closed'
        if ((Number(finalVendorAmountKrw) > 0 || Number(finalVendorAmountUsd) > 0) && status !== 'closed') {
            newStatus = 'closed';
            setStatus('closed');
            autoClosed = true;
        }

        try {
            const docRef = doc(db, 'campaigns', id);
            await updateDoc(docRef, {
                vendorDescription,
                status: newStatus,
                brand,
                quarter,
                year,
                caseId,
                invoice,
                description,
                closedAmount: Number(closedAmount),
                closedAmountUsd: Number(closedAmountUsd),
                appliedExchangeRate: Number(exchangeRate),
                // New Fields
                finalVendorAmountUsd: Number(finalVendorAmountUsd),
                finalVendorExchangeRate: Number(finalVendorExchangeRate),
                finalVendorAmountKrw: Number(finalVendorAmountKrw)
            });

            setCampaign(prev => prev ? ({
                ...prev,
                vendorDescription, status: newStatus, brand, quarter, year, caseId, invoice, description,
                closedAmount: Number(closedAmount),
                closedAmountUsd: Number(closedAmountUsd),
                appliedExchangeRate: Number(exchangeRate),
                finalVendorAmountUsd: Number(finalVendorAmountUsd),
                finalVendorExchangeRate: Number(finalVendorExchangeRate),
                finalVendorAmountKrw: Number(finalVendorAmountKrw)
            }) : null);

            if (autoClosed) {
                alert('최종 금액이 입력되어 상태가 \'정산 완료\'로 변경되었습니다.');
            } else {
                alert('기본 정보가 저장되었습니다.');
            }
        } catch (error) {
            console.error("Error updating document:", error);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRoot = async () => {
        if (!confirm('정말로 이 Vendor 건을 삭제하시겠습니까? 포함된 모든 집행 내역이 삭제됩니다.')) return;
        if (!id) return;
        try {
            await deleteDoc(doc(db, 'campaigns', id));
            router.push('/campaigns');
        } catch (error) {
            console.error("Error deleting document:", error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    // --- Execution Management ---

    const handleOpenAddExecution = () => {
        setEditingExecution(null);
        setExecForm({
            internalTitle: '',
            draftId: '',
            planAmount: 0,
            actualAmount: 0,
            budgetSource: 'MDF',
            note: ''
        });
        openExecutionModal();
    };

    const handleOpenEditExecution = (exec: Execution) => {
        setEditingExecution(exec);
        setExecForm({ ...exec });
        openExecutionModal();
    };

    const handleSaveExecution = async () => {
        if (!campaign || !id) return;

        // Validation
        if (!execForm.internalTitle) {
            alert('내부 플랜명은 필수입니다.');
            return;
        }

        const newExecutions = [...(campaign.executions || [])];

        if (editingExecution) {
            // Edit existing
            const index = newExecutions.findIndex(e => e.id === editingExecution.id);
            if (index !== -1) {
                newExecutions[index] = {
                    ...editingExecution,
                    ...execForm,
                    planAmount: Number(execForm.planAmount),
                    actualAmount: Number(execForm.actualAmount)
                } as Execution;
            }
        } else {
            // Add new
            const newExecution: Execution = {
                id: crypto.randomUUID(),
                createdAt: new Date(),
                internalTitle: execForm.internalTitle || '',
                draftId: execForm.draftId || '',
                planAmount: Number(execForm.planAmount) || 0,
                actualAmount: Number(execForm.actualAmount) || 0,
                budgetSource: execForm.budgetSource || 'MDF',
                note: execForm.note || ''
            };
            newExecutions.push(newExecution);
        }

        // Calculate Total Amount
        const newTotalAmount = newExecutions.reduce((sum, exec) => sum + (exec.actualAmount || 0), 0);

        setSaving(true);
        try {
            const docRef = doc(db, 'campaigns', id);
            await updateDoc(docRef, {
                executions: newExecutions,
                totalAmount: newTotalAmount
            });

            setCampaign(prev => prev ? ({ ...prev, executions: newExecutions, totalAmount: newTotalAmount }) : null);
            closeExecutionModal();
        } catch (error) {
            console.error("Error saving execution:", error);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteExecution = async (execId: string) => {
        if (!confirm('이 집행 내역을 삭제하시겠습니까?')) return;
        if (!campaign || !id) return;

        const newExecutions = (campaign.executions || []).filter(e => e.id !== execId);
        const newTotalAmount = newExecutions.reduce((sum, exec) => sum + (exec.actualAmount || 0), 0);

        setSaving(true);
        try {
            const docRef = doc(db, 'campaigns', id);
            await updateDoc(docRef, {
                executions: newExecutions,
                totalAmount: newTotalAmount
            });

            setCampaign(prev => prev ? ({ ...prev, executions: newExecutions, totalAmount: newTotalAmount }) : null);
        } catch (error) {
            console.error("Error deleting execution:", error);
            alert('삭제 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    // --- Image Preview ---
    const handleImageClick = (src: string) => {
        setSelectedImage(src);
        openImageModal();
    };


    if (loading) return <AppLayout><Group justify="center" h="50vh"><Loader size="xl" /></Group></AppLayout>;
    if (!campaign) return <AppLayout><Title>Campaign not found</Title></AppLayout>;

    return (
        <AppLayout>
            <LoadingOverlay visible={saving} zIndex={1000} overlayProps={{ radius: "sm", blur: 2 }} />

            {/* Header / Main Title Area */}
            <Group justify="space-between" mb="lg" align="flex-start">
                <Group style={{ flex: 1 }}>
                    <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => router.back()} color="gray">
                        목록
                    </Button>
                    <Stack gap={0} style={{ flex: 1 }}>
                        <TextInput
                            value={vendorDescription}
                            onChange={(e) => setVendorDescription(e.currentTarget.value)}
                            size="lg"
                            fw={700}
                            variant="unstyled"
                            placeholder="Vendor Description (제목)"
                            style={{ fontSize: '24px' }}
                        />
                        <Text size="sm" c="dimmed">ID: {campaign.id}</Text>
                    </Stack>
                </Group>
                <Group>
                    <Badge size="xl" variant="light" color="blue">
                        Total: ₩{campaign.totalAmount?.toLocaleString() || 0}
                    </Badge>
                    {campaign.finalVendorAmountKrw && campaign.finalVendorAmountKrw > 0 && (
                        <Badge size="xl" variant="filled" color="green">
                            (최종: ₩{campaign.finalVendorAmountKrw.toLocaleString()})
                        </Badge>
                    )}
                    <Select
                        data={[
                            { value: 'planned', label: '🟢 계획' },
                            { value: 'executing', label: '🟡 집행 중' },
                            { value: 'executed', label: '🔵 집행 완료' },
                            { value: 'closed', label: '⚫ 정산 완료' },
                        ]}
                        value={status}
                        onChange={(val) => setStatus(val as any)}
                        allowDeselect={false}
                        w={140}
                    />
                    <Button leftSection={<IconDeviceFloppy size={16} />} onClick={handleSaveRoot}>
                        저장
                    </Button>
                    <Button variant="light" color="red" leftSection={<IconTrash size={16} />} onClick={handleDeleteRoot}>
                        삭제
                    </Button>
                </Group>
            </Group>

            <Tabs defaultValue="executions">
                <Tabs.List mb="md">
                    <Tabs.Tab value="executions" leftSection={<IconCalculator size={16} />}>집행 내역 관리 (Executions)</Tabs.Tab>
                    <Tabs.Tab value="info" leftSection={<IconFile size={16} />}>기본 정보</Tabs.Tab>
                    <Tabs.Tab value="images" leftSection={<IconPhoto size={16} />}>이미지 / 증빙</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="executions">
                    <Card withBorder shadow="sm" radius="md" p="md">
                        <Group justify="space-between" mb="md">
                            <Title order={4}>내부 집행 내역 ({campaign.executions?.length || 0}건)</Title>
                            <Button leftSection={<IconPlus size={16} />} onClick={handleOpenAddExecution} variant="light">
                                집행 내역 추가
                            </Button>
                        </Group>

                        <Table striped highlightOnHover withTableBorder>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>내부 플랜명</Table.Th>
                                    <Table.Th>기안 번호</Table.Th>
                                    <Table.Th>예산 출처</Table.Th>
                                    <Table.Th style={{ textAlign: 'right' }}>예상 금액</Table.Th>
                                    <Table.Th style={{ textAlign: 'right' }}>실 집행 금액</Table.Th>
                                    <Table.Th>관리</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {campaign.executions && campaign.executions.length > 0 ? (
                                    campaign.executions.map((exec) => (
                                        <Table.Tr key={exec.id}>
                                            <Table.Td fw={500}>{exec.internalTitle}</Table.Td>
                                            <Table.Td>{exec.draftId || '-'}</Table.Td>
                                            <Table.Td><Badge color="gray" variant="outline">{exec.budgetSource}</Badge></Table.Td>
                                            <Table.Td style={{ textAlign: 'right' }} c="dimmed">₩{exec.planAmount?.toLocaleString()}</Table.Td>
                                            <Table.Td style={{ textAlign: 'right' }} fw={700}>₩{exec.actualAmount?.toLocaleString()}</Table.Td>
                                            <Table.Td>
                                                <Group gap="xs">
                                                    <ActionIcon variant="subtle" color="blue" onClick={() => handleOpenEditExecution(exec)}>
                                                        <IconEdit size={16} />
                                                    </ActionIcon>
                                                    <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteExecution(exec.id)}>
                                                        <IconTrash size={16} />
                                                    </ActionIcon>
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))
                                ) : (
                                    <Table.Tr>
                                        <Table.Td colSpan={6} style={{ textAlign: 'center', padding: '20px' }} c="dimmed">
                                            등록된 집행 내역이 없습니다.
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </Card>
                </Tabs.Panel>

                <Tabs.Panel value="info">
                    <Card withBorder shadow="sm" radius="md" p="lg">
                        <SimpleGrid cols={{ base: 1, md: 2 }}>
                            <Select label="브랜드" data={BRANDS} value={brand} onChange={(v) => setBrand(v || '')} />
                            <Select label="분기" data={['Q1', 'Q2', 'Q3', 'Q4']} value={quarter} onChange={(v) => setQuarter(v || 'Q1')} />
                            <NumberInput label="연도" value={year} onChange={(v) => setYear(Number(v))} hideControls />
                        </SimpleGrid>
                        <SimpleGrid cols={{ base: 1, md: 2 }} mt="md">
                            <TextInput label="Case ID" value={caseId} onChange={(e) => setCaseId(e.currentTarget.value)} />
                            <TextInput label="Invoice" value={invoice} onChange={(e) => setInvoice(e.currentTarget.value)} />
                        </SimpleGrid>

                        <Card withBorder radius="md" bg="gray.0" mt="lg">
                            <Text size="sm" fw={700} mb="xs" c="dimmed">
                                <IconCalculator size={14} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                                Vendor Closing Amount (예산)
                            </Text>
                            <SimpleGrid cols={{ base: 1, sm: 3 }}>
                                <NumberInput
                                    label="Closing Amount ($)"
                                    placeholder="0"
                                    thousandSeparator=","
                                    prefix="$"
                                    value={closedAmountUsd}
                                    onChange={(v) => {
                                        setClosedAmountUsd(v);
                                        if (v && exchangeRate) setClosedAmount(Math.round(Number(v) * Number(exchangeRate)));
                                    }}
                                />
                                <NumberInput
                                    label="적용 환율 (₩/$)"
                                    placeholder="1400"
                                    thousandSeparator=","
                                    prefix="₩"
                                    value={exchangeRate}
                                    onChange={(v) => {
                                        setExchangeRate(v);
                                        if (closedAmountUsd && v) setClosedAmount(Math.round(Number(closedAmountUsd) * Number(v)));
                                    }}
                                />
                                <NumberInput
                                    label="Closing Amount (₩)"
                                    placeholder="0"
                                    thousandSeparator=","
                                    prefix="₩"
                                    value={closedAmount}
                                    onChange={(v) => {
                                        setClosedAmount(v);
                                        // Optional: Reverse calc USD? Let's keep one-way for simplicity unless requested
                                    }}
                                />
                            </SimpleGrid>
                        </Card>

                        <Card withBorder radius="md" bg="green.0" mt="lg">
                            <Text size="sm" fw={700} mb="xs" c="green.9">
                                <IconCalculator size={14} style={{ marginRight: 5, verticalAlign: 'middle' }} />
                                최종 Vendor Closing Amount (Invoice)
                            </Text>
                            <SimpleGrid cols={{ base: 1, sm: 3 }}>
                                <NumberInput
                                    label="Final Amount ($)"
                                    placeholder="0"
                                    thousandSeparator=","
                                    prefix="$"
                                    value={finalVendorAmountUsd}
                                    onChange={(v) => {
                                        setFinalVendorAmountUsd(v);
                                        if (v && finalVendorExchangeRate) setFinalVendorAmountKrw(Math.round(Number(v) * Number(finalVendorExchangeRate)));
                                    }}
                                />
                                <NumberInput
                                    label="Exchange Rate (₩/$)"
                                    placeholder="1400"
                                    thousandSeparator=","
                                    prefix="₩"
                                    value={finalVendorExchangeRate}
                                    onChange={(v) => {
                                        setFinalVendorExchangeRate(v);
                                        if (finalVendorAmountUsd && v) setFinalVendorAmountKrw(Math.round(Number(finalVendorAmountUsd) * Number(v)));
                                        // Also update USD if KRW exists? Usually Rate change affects calculated value.
                                        // If we follow 'USD * Rate = KRW' dominance:
                                        if (finalVendorAmountUsd && v) setFinalVendorAmountKrw(Math.round(Number(finalVendorAmountUsd) * Number(v)));
                                    }}
                                />
                                <NumberInput
                                    label="Final Amount (₩)"
                                    placeholder="0"
                                    thousandSeparator=","
                                    prefix="₩"
                                    value={finalVendorAmountKrw}
                                    onChange={(v) => {
                                        setFinalVendorAmountKrw(v);
                                        // Reverse calculation: KRW / Rate = USD
                                        if (v && finalVendorExchangeRate) setFinalVendorAmountUsd(Number((Number(v) / Number(finalVendorExchangeRate)).toFixed(2)));
                                    }}
                                />
                            </SimpleGrid>
                        </Card>

                        <Textarea label="메모" value={description} onChange={(e) => setDescription(e.currentTarget.value)} mt="md" minRows={3} />
                    </Card>
                </Tabs.Panel>

                <Tabs.Panel value="images">
                    {/* Image component logic reuse or simple display - keeping it simple for now */}
                    <Card withBorder shadow="sm" radius="md">
                        <Text c="dimmed" ta="center" py="xl">이미지 관리는 폼 업데이트 예정입니다.</Text>
                    </Card>
                </Tabs.Panel>
            </Tabs>

            {/* Execution Modal */}
            <Modal opened={executionModalOpened} onClose={closeExecutionModal} title={editingExecution ? "집행 내역 수정" : "새 집행 내역 추가"} centered>
                <Stack>
                    <TextInput
                        label="내부 플랜명"
                        placeholder="예: 인텔 번들 프로모션"
                        required
                        value={execForm.internalTitle || ''}
                        onChange={(e) => setExecForm({ ...execForm, internalTitle: e.currentTarget.value })}
                        data-autofocus
                    />
                    <TextInput
                        label="기안 번호"
                        placeholder="D-202X-XXX"
                        value={execForm.draftId || ''}
                        onChange={(e) => setExecForm({ ...execForm, draftId: e.currentTarget.value })}
                    />
                    <Select
                        label="예산 출처"
                        data={['MDF', 'MPOR', 'Rebate', 'Extra', 'Direct']}
                        value={execForm.budgetSource}
                        onChange={(v) => setExecForm({ ...execForm, budgetSource: v || 'MDF' })}
                    />
                    <NumberInput
                        label="예상 금액 (Plan)"
                        prefix="₩"
                        thousandSeparator=","
                        value={execForm.planAmount}
                        onChange={(v) => setExecForm({ ...execForm, planAmount: Number(v) })}
                    />
                    <NumberInput
                        label="실 집행 금액 (Actual)"
                        prefix="₩"
                        thousandSeparator=","
                        value={execForm.actualAmount}
                        onChange={(v) => setExecForm({ ...execForm, actualAmount: Number(v) })}
                    />
                    <Textarea
                        label="비고 / 노트"
                        value={execForm.note || ''}
                        onChange={(e) => setExecForm({ ...execForm, note: e.currentTarget.value })}
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={closeExecutionModal}>취소</Button>
                        <Button onClick={handleSaveExecution}>{editingExecution ? '수정' : '추가'}</Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Image Preview Modal */}
            <Modal opened={imageModalOpened} onClose={closeImageModal} size="xl" centered withCloseButton={false}>
                <Image src={selectedImage} alt="Large Preview" />
            </Modal>
        </AppLayout>
    );
}
