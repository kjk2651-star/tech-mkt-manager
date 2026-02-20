import { Card, Group, Text, SimpleGrid, Paper, ThemeIcon, RingProgress, Stack } from '@mantine/core';
import { IconCoin, IconReceipt, IconScale } from '@tabler/icons-react';
import { Campaign, MarketingActivity } from '@/types';
import { useMemo } from 'react';

interface FundingSummaryProps {
    campaigns: Campaign[];
    activities: MarketingActivity[];
    brand: string | null;
    quarter: string | null;
}

export function FundingSummary({ campaigns, activities, brand, quarter }: FundingSummaryProps) {
    const summary = useMemo(() => {
        // Filter is handled by parent, but we double check if needed, or assume data passed is already filtered?
        // Actually, the parent passes *filtered* campaigns, but *all* activities? 
        // Let's assume parent passes relevant data or we filter here. 
        // Best practice: Parent filters data and passes it in.
        // BUT, calculating "Total Funding" requires summing up 'receivedAmount' (or closedAmount).

        const totalFunding = campaigns.reduce((sum, item) => {
            // "1-2. 실제로 금액을 얼마를 받았는지 확인" -> Use Final KRW if available, else Closed Amount, else 0?
            // The Campaign Type has: closedAmount, finalVendorAmountKrw.
            // Let's use finalVendorAmountKrw if > 0, otherwise closedAmount.
            // Adjust logic based on "Actual Received". 
            // The User uses "receivable" (Closed Amount).
            // Let's sum 'closedAmount' for now as "Received".

            // Note: In row logic: 
            // ₩{Math.round((campaign.closedAmount || 0) * (campaign.brand === 'ASUS MB' ? 0.5 : 1)).toLocaleString()}
            // There was a specific logic for ASUS MB (50%).

            let amount = item.closedAmount || 0;
            // if (item.brand === 'ASUS MB') {
            //     amount = Math.round(amount * 0.5);
            // }
            return sum + amount;
        }, 0);

        const totalSpent = activities.reduce((sum, item) => {
            // Use actual 'cost' (which we mapped to 'cost' in types, new 'planCost' is budget)
            return sum + (item.cost || 0);
        }, 0);

        const balance = totalFunding - totalSpent;
        const rate = totalFunding > 0 ? (totalSpent / totalFunding) * 100 : 0;

        return { totalFunding, totalSpent, balance, rate };
    }, [campaigns, activities]);

    return (
        <Paper withBorder p="md" radius="md" mb="lg" bg="gray.0">
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
                <Paper withBorder p="sm" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text c="dimmed" tt="uppercase" fw={700} fz="xs">총 펀딩 확보 금액 (Funding)</Text>
                            <Text fw={700} fz="xl">₩{summary.totalFunding.toLocaleString()}</Text>
                        </div>
                        <ThemeIcon color="blue" variant="light" size={38} radius="md">
                            <IconCoin size="1.8rem" stroke={1.5} />
                        </ThemeIcon>
                    </Group>
                </Paper>

                <Paper withBorder p="sm" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text c="dimmed" tt="uppercase" fw={700} fz="xs">MKT 집행 금액 (Spent)</Text>
                            <Text fw={700} fz="xl" c="orange">₩{summary.totalSpent.toLocaleString()}</Text>
                        </div>
                        <ThemeIcon color="orange" variant="light" size={38} radius="md">
                            <IconReceipt size="1.8rem" stroke={1.5} />
                        </ThemeIcon>
                    </Group>
                </Paper>

                <Paper withBorder p="sm" radius="md">
                    <Group justify="space-between">
                        <div>
                            <Text c="dimmed" tt="uppercase" fw={700} fz="xs">잔액 (Balance)</Text>
                            <Text fw={700} fz="xl" c={summary.balance < 0 ? 'red' : 'teal'}>
                                ₩{summary.balance.toLocaleString()}
                            </Text>
                        </div>
                        <ThemeIcon color={summary.balance < 0 ? 'red' : 'teal'} variant="light" size={38} radius="md">
                            <IconScale size="1.8rem" stroke={1.5} />
                        </ThemeIcon>
                    </Group>
                    <Text c="dimmed" fz="xs" mt="sm">
                        집행률: {summary.rate.toFixed(1)}%
                    </Text>
                </Paper>
            </SimpleGrid>
        </Paper>
    );
}
