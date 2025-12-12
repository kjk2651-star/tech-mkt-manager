'use client';

import { AppLayout } from '@/components/Layout/AppLayout';
import { Title, Group, Button } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useRouter } from 'next/navigation';
import { CampaignForm } from '@/components/Campaign/CampaignForm';

export default function NewCampaignPage() {
    const router = useRouter();

    const handleSubmit = (data: any) => {
        // In a real app, this would send data to the API
        console.log('New Campaign Data:', data);
        alert('캠페인이 등록되었습니다. (Mock)');
        router.push('/campaigns');
    };

    return (
        <AppLayout>
            <Group mb="lg">
                <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => router.back()}>
                    목록으로
                </Button>
                <Title order={2}>새 캠페인 등록</Title>
            </Group>

            <CampaignForm onSubmit={handleSubmit} />
        </AppLayout>
    );
}
