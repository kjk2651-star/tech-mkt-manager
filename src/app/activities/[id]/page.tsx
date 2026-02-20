'use client';

import { AppLayout } from '@/components/Layout/AppLayout';
import { Title, Card, Button, Group, TextInput, NumberInput, Select, Switch, Textarea, Grid, Divider, ActionIcon } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, addDoc, collection, updateDoc, deleteDoc } from 'firebase/firestore';
import { BRANDS } from '@/constants/brands';
import { IconDeviceFloppy, IconArrowLeft, IconTrash } from '@tabler/icons-react';
import { MarketingActivity } from '@/types';

export default function ActivityDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const isNew = id === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);

    const form = useForm<Omit<MarketingActivity, 'id' | 'createdAt' | 'updatedAt'>>({
        initialValues: {
            brand: '',
            quarter: 'Q1',
            year: new Date().getFullYear(),
            place: '',
            description: '',
            product: '',
            cost: 0,
            planCost: 0,
            internalDraftId: '',
            status: '준비',
            impressions: 0,
            clicks: 0,
            salesVolume: 0,
            giftQuantity: 0,
            resultNote: '',
        },
        validate: {
            brand: (value) => (value ? null : '브랜드를 선택해주세요'),
            description: (value) => (value ? null : '내용을 입력해주세요'),
        },
    });

    useEffect(() => {
        if (!isNew) {
            const loadData = async () => {
                const docRef = doc(db, 'marketing_activities', id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data() as MarketingActivity;
                    form.setValues({
                        brand: data.brand,
                        quarter: data.quarter,
                        year: data.year,
                        place: data.place,
                        description: data.description,
                        product: data.product,
                        cost: data.cost,
                        planCost: data.planCost || 0,
                        internalDraftId: data.internalDraftId || '',
                        status: data.status,
                        impressions: data.impressions || 0,
                        clicks: data.clicks || 0,
                        salesVolume: data.salesVolume || 0,
                        giftQuantity: data.giftQuantity || 0,
                        resultNote: data.resultNote || '',
                    });
                }
                setLoading(false);
            };
            loadData();
        }
    }, [id]);

    const handleSave = async (values: typeof form.values) => {
        setSaving(true);
        try {
            const activityData = {
                ...values,
                updatedAt: new Date().toISOString(),
            };

            if (isNew) {
                await addDoc(collection(db, 'marketing_activities'), {
                    ...activityData,
                    createdAt: new Date().toISOString(),
                });
            } else {
                await updateDoc(doc(db, 'marketing_activities', id), activityData);
            }
            router.push('/activities');
        } catch (error) {
            console.error('Error saving activity:', error);
            alert('저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await deleteDoc(doc(db, 'marketing_activities', id));
            router.push('/activities');
        } catch (error) {
            console.error('Error deleting activity:', error);
            alert('삭제 중 오류가 발생했습니다.');
        }
    };

    if (loading) return <AppLayout>Loading...</AppLayout>;

    return (
        <AppLayout>
            <form onSubmit={form.onSubmit(handleSave)}>
                <Group justify="space-between" mb="lg">
                    <Group>
                        <ActionIcon variant="subtle" onClick={() => router.back()}>
                            <IconArrowLeft size={20} />
                        </ActionIcon>
                        <Title order={2}>{isNew ? '새 활동 등록' : '활동 상세/수정'}</Title>
                    </Group>
                    <Group>
                        {!isNew && (
                            <Button color="red" variant="subtle" leftSection={<IconTrash size={16} />} onClick={handleDelete}>
                                삭제
                            </Button>
                        )}
                        <Button type="submit" leftSection={<IconDeviceFloppy size={16} />} loading={saving}>
                            저장
                        </Button>
                    </Group>
                </Group>

                <Grid>
                    {/* Section 1: Overview */}
                    <Grid.Col span={12}>
                        <Card withBorder shadow="sm" radius="md" p="lg">
                            <Title order={4} mb="md">활동 개요 (Overview)</Title>
                            <Grid>
                                <Grid.Col span={4}>
                                    <Select
                                        label="년도"
                                        data={['2024', '2025', '2026']}
                                        {...form.getInputProps('year')}
                                        onChange={(val) => form.setFieldValue('year', parseInt(val || '2024'))}
                                        value={form.values.year.toString()}
                                    />
                                </Grid.Col>
                                <Grid.Col span={4}>
                                    <Select
                                        label="분기"
                                        data={['Q1', 'Q2', 'Q3', 'Q4']}
                                        {...form.getInputProps('quarter')}
                                    />
                                </Grid.Col>
                                <Grid.Col span={4}>
                                    <Select
                                        label="브랜드"
                                        data={BRANDS}
                                        {...form.getInputProps('brand')}
                                        searchable
                                    />
                                </Grid.Col>

                                <Grid.Col span={6}>
                                    <TextInput
                                        label="진행 장소/채널 (Place)"
                                        placeholder="예: 다나와, 인스타그램"
                                        {...form.getInputProps('place')}
                                    />
                                </Grid.Col>
                                <Grid.Col span={6}>
                                    <TextInput
                                        label="타겟 제품 (Product)"
                                        placeholder="주요 제품명"
                                        {...form.getInputProps('product')}
                                    />
                                </Grid.Col>

                                <Grid.Col span={12}>
                                    <TextInput
                                        label="활동 명/내용 (Description)"
                                        placeholder="활동에 대한 설명"
                                        {...form.getInputProps('description')}
                                    />
                                </Grid.Col>

                                <Grid.Col span={4}>
                                    <TextInput
                                        label="내부 기안 번호"
                                        placeholder="예: D-202X-XXX"
                                        {...form.getInputProps('internalDraftId')}
                                    />
                                </Grid.Col>

                                <Grid.Col span={4}>
                                    <NumberInput
                                        label="예산 (Plan Budget)"
                                        thousandSeparator=","
                                        leftSection="₩"
                                        {...form.getInputProps('planCost')}
                                    />
                                </Grid.Col>
                                <Grid.Col span={4}>
                                    <NumberInput
                                        label="실 집행 금액 (Actual Cost)"
                                        description="실제 집행된 금액"
                                        thousandSeparator=","
                                        leftSection="₩"
                                        {...form.getInputProps('cost')}
                                    />
                                </Grid.Col>
                                <Grid.Col span={4}>
                                    <Select
                                        label="진행 상태"
                                        data={['준비', '진행중', '완료']}
                                        {...form.getInputProps('status')}
                                    />
                                </Grid.Col>
                            </Grid>
                        </Card>
                    </Grid.Col>

                    {/* Section 2: Results & KPI */}
                    <Grid.Col span={12}>
                        <Card withBorder shadow="sm" radius="md" p="lg">
                            <Title order={4} mb="md">성과 분석 (Result & KPIs)</Title>
                            <Grid>
                                <Grid.Col span={3}>
                                    <NumberInput
                                        label="노출 수 (Impressions)"
                                        thousandSeparator=","
                                        {...form.getInputProps('impressions')}
                                    />
                                </Grid.Col>
                                <Grid.Col span={3}>
                                    <NumberInput
                                        label="클릭 수 (Clicks)"
                                        thousandSeparator=","
                                        {...form.getInputProps('clicks')}
                                    />
                                </Grid.Col>
                                <Grid.Col span={3}>
                                    <NumberInput
                                        label="판매량 (Sales Volume)"
                                        thousandSeparator=","
                                        {...form.getInputProps('salesVolume')}
                                    />
                                </Grid.Col>
                                <Grid.Col span={3}>
                                    <NumberInput
                                        label="경품/기프트 수량"
                                        thousandSeparator=","
                                        {...form.getInputProps('giftQuantity')}
                                    />
                                </Grid.Col>

                                <Grid.Col span={12}>
                                    <Textarea
                                        label="성과 총평 (Result Note)"
                                        placeholder="성과에 대한 상세 코멘트나 피드백을 기록하세요."
                                        minRows={4}
                                        {...form.getInputProps('resultNote')}
                                    />
                                </Grid.Col>
                            </Grid>
                        </Card>
                    </Grid.Col>
                </Grid>
            </form>
        </AppLayout>
    );
}
