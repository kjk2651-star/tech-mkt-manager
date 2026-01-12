'use client';

import { useState, useEffect } from 'react';
import { TextInput, Select, Textarea, Button, Group, Card, Title, SimpleGrid, Image, Text, Stack, ActionIcon, NumberInput, Divider } from '@mantine/core';
import { Dropzone, IMAGE_MIME_TYPE, FileWithPath } from '@mantine/dropzone';
import { IconUpload, IconPhoto, IconFile, IconX, IconDeviceFloppy, IconCalculator } from '@tabler/icons-react';
import { BRANDS } from '@/constants/brands';
import { Campaign } from '@/types';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

interface CampaignFormProps {
    initialData?: Partial<Campaign>;
    onSubmit?: (data: any) => void;
}

export function CampaignForm({ initialData }: CampaignFormProps) {
    const router = useRouter();
    const [brand, setBrand] = useState<string>(initialData?.brand || '');
    const [quarter, setQuarter] = useState<string>(initialData?.quarter || 'Q1');
    const [year, setYear] = useState<string>('2025');
    const [vendorDescription, setVendorDescription] = useState(initialData?.vendorDescription || '');

    const [caseId, setCaseId] = useState(initialData?.caseId || '');
    const [invoice, setInvoice] = useState(initialData?.invoice || '');
    const [cnNumber, setCnNumber] = useState(initialData?.cnNumber || '');
    const [status, setStatus] = useState<string>(initialData?.status || 'planned');
    const [description, setDescription] = useState(initialData?.description || '');

    // Financials
    const [closedAmountUsd, setClosedAmountUsd] = useState<number | string>('');
    const [exchangeRate, setExchangeRate] = useState<number | string>(1400);
    const [closedAmount, setClosedAmount] = useState<number | string>('');

    const [files, setFiles] = useState<FileWithPath[]>([]);
    const [docs, setDocs] = useState<FileWithPath[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch Exchange Rate on Mount
    useEffect(() => {
        const fetchRate = async () => {
            try {
                const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
                const data = await res.json();
                const rate = data.rates.KRW;
                setExchangeRate(rate);
            } catch (error) {
                console.error('Failed to fetch exchange rate:', error);
            }
        };
        fetchRate();
    }, []);



    const handleSubmit = async () => {
        if (!brand || !vendorDescription) {
            alert('브랜드와 Vendor Description은 필수입니다.');
            return;
        }

        setLoading(true);
        try {
            const campaignData = {
                brand,
                year: parseInt(year),
                quarter,
                vendorDescription,
                caseId,
                invoice,
                cnNumber,
                status,
                description,

                // Financials
                closedAmount: Number(closedAmount) || 0,
                closedAmountUsd: Number(closedAmountUsd) || 0,
                appliedExchangeRate: Number(exchangeRate) || 0,

                createdAt: new Date(),
                totalAmount: 0,
                executions: [], // Initial empty executions
                // Images/Docs upload logic would go here
            };

            await addDoc(collection(db, 'campaigns'), campaignData);

            alert('Vendor 건이 등록되었습니다. 상세 페이지에서 집행 내역을 추가해주세요.');
            router.push('/campaigns');
        } catch (error) {
            console.error('Error adding document: ', error);
            alert('등록 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const previews = files.map((file, index) => {
        const imageUrl = URL.createObjectURL(file);
        return (
            <Card key={index} padding="xs" radius="md" withBorder>
                <Card.Section>
                    <Image src={imageUrl} height={100} alt="Preview" />
                </Card.Section>
                <ActionIcon
                    color="red"
                    variant="filled"
                    size="xs"
                    style={{ position: 'absolute', top: 5, right: 5 }}
                    onClick={() => setFiles(files.filter((_, i) => i !== index))}
                >
                    <IconX size={12} />
                </ActionIcon>
            </Card>
        );
    });

    const docPreviews = docs.map((file, index) => (
        <Card key={index} padding="xs" radius="sm" withBorder mb="xs">
            <Group justify="space-between">
                <Group gap="xs">
                    <IconFile size={16} />
                    <Text size="sm" lineClamp={1}>{file.name}</Text>
                </Group>
                <ActionIcon
                    color="red"
                    variant="subtle"
                    size="xs"
                    onClick={() => setDocs(docs.filter((_, i) => i !== index))}
                >
                    <IconX size={14} />
                </ActionIcon>
            </Group>
        </Card>
    ));

    return (
        <Stack gap="lg">
            <Card withBorder shadow="sm" radius="md" p="lg">
                <Title order={4} mb="md">Vendor 등록 (1단계)</Title>
                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                    <Select
                        label="년도"
                        data={['2024', '2025', '2026', '2027']}
                        value={year}
                        onChange={(val) => setYear(val || '2025')}
                        required
                    />
                    <Select
                        label="분기"
                        data={['Q1', 'Q2', 'Q3', 'Q4']}
                        value={quarter}
                        onChange={(val) => setQuarter(val || 'Q1')}
                        required
                    />
                    <Select
                        label="브랜드"
                        placeholder="브랜드 선택"
                        data={BRANDS}
                        value={brand}
                        onChange={(val) => setBrand(val || '')}
                        required
                    />
                    <Select
                        label="진행 상태"
                        data={[
                            { value: 'planned', label: '계획 (Planned)' },
                            { value: 'executing', label: '집행 중 (Executing)' },
                            { value: 'executed', label: '집행 완료 (Executed)' },
                            { value: 'closed', label: '정산 완료 (Closed)' },
                        ]}
                        value={status}
                        onChange={(val) => setStatus(val || 'planned')}
                        required
                    />
                    <TextInput
                        label="Vendor Description (메인 제목)"
                        placeholder="예: ASUS 2025 Q1 통합 마케팅"
                        value={vendorDescription}
                        onChange={(e) => setVendorDescription(e.currentTarget.value)}
                        required
                        data-autofocus
                    />
                    <TextInput
                        label="Case ID"
                        placeholder="CASE-XXXX"
                        value={caseId}
                        onChange={(e) => setCaseId(e.currentTarget.value)}
                    />
                    <TextInput
                        label="Invoice"
                        placeholder="INV-XXXX"
                        value={invoice}
                        onChange={(e) => setInvoice(e.currentTarget.value)}
                    />
                    <TextInput
                        label="CN#"
                        placeholder="Credit Note 번호 입력"
                        value={cnNumber}
                        onChange={(e) => setCnNumber(e.currentTarget.value)}
                    />
                </SimpleGrid>

                <Textarea
                    label="메모 / 비고"
                    placeholder="기타 특이사항"
                    minRows={3}
                    mt="md"
                    value={description}
                    onChange={(e) => setDescription(e.currentTarget.value)}
                />

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
                            onChange={(val) => {
                                setClosedAmountUsd(val);
                                if (val && exchangeRate) {
                                    setClosedAmount(Math.round(Number(val) * Number(exchangeRate)));
                                }
                            }}
                        />
                        <NumberInput
                            label="적용 환율 (₩/$)"
                            placeholder="1400"
                            thousandSeparator=","
                            prefix="₩"
                            value={exchangeRate}
                            onChange={(val) => {
                                setExchangeRate(val);
                                if (closedAmountUsd && val) {
                                    setClosedAmount(Math.round(Number(closedAmountUsd) * Number(val)));
                                }
                            }}
                        />
                        <NumberInput
                            label="Closing Amount (₩)"
                            placeholder="0"
                            thousandSeparator=","
                            prefix="₩"
                            value={closedAmount}
                            onChange={setClosedAmount}
                        />
                    </SimpleGrid>
                </Card>
            </Card>

            <SimpleGrid cols={{ base: 1, md: 2 }}>
                {/* Image Upload Section */}
                <Card withBorder shadow="sm" radius="md" p="lg">
                    <Title order={4} mb="md">행사 이미지</Title>
                    <Dropzone
                        onDrop={setFiles}
                        onReject={(files) => console.log('rejected files', files)}
                        maxSize={3 * 1024 ** 2}
                        accept={IMAGE_MIME_TYPE}
                        mb="md"
                    >
                        <Group justify="center" gap="xl" style={{ minHeight: 100, pointerEvents: 'none' }}>
                            <Dropzone.Accept>
                                <IconUpload size={30} stroke={1.5} />
                            </Dropzone.Accept>
                            <Dropzone.Reject>
                                <IconX size={30} stroke={1.5} />
                            </Dropzone.Reject>
                            <Dropzone.Idle>
                                <IconPhoto size={30} stroke={1.5} />
                            </Dropzone.Idle>

                            <div>
                                <Text size="xl" inline>
                                    이미지를 드래그하거나 클릭하세요
                                </Text>
                                <Text size="sm" c="dimmed" inline mt={7}>
                                    파일당 최대 3MB
                                </Text>
                            </div>
                        </Group>
                    </Dropzone>

                    <SimpleGrid cols={3} mt="sm">
                        {previews}
                    </SimpleGrid>
                </Card>

                {/* Document Upload Section */}
                <Card withBorder shadow="sm" radius="md" p="lg">
                    <Title order={4} mb="md">증빙 / 문서</Title>
                    <Dropzone
                        onDrop={(newDocs) => setDocs((current) => [...current, ...newDocs])}
                        maxSize={5 * 1024 ** 2}
                        mb="md"
                    >
                        <Group justify="center" gap="xl" style={{ minHeight: 100, pointerEvents: 'none' }}>
                            <IconFile size={30} stroke={1.5} />
                            <div>
                                <Text size="xl" inline>
                                    문서를 드래그하거나 클릭하세요
                                </Text>
                            </div>
                        </Group>
                    </Dropzone>
                    <Stack gap="xs">
                        {docPreviews}
                    </Stack>
                </Card>
            </SimpleGrid>

            <Group justify="flex-end">
                <Button size="lg" leftSection={<IconDeviceFloppy size={20} />} onClick={handleSubmit} loading={loading}>
                    등록 (1단계 완료)
                </Button>
            </Group>
        </Stack>
    );
}
