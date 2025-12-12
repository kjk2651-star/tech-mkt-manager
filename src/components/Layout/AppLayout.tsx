'use client';

import { AppShell, Burger, Group, NavLink, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconDashboard, IconCoin, IconSpeakerphone, IconRobot, IconActivity } from '@tabler/icons-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AppLayout({ children }: { children: React.ReactNode }) {
    const [opened, { toggle }] = useDisclosure();
    const pathname = usePathname();

    return (
        <AppShell
            header={{ height: 60 }}
            navbar={{
                width: 300,
                breakpoint: 'sm',
                collapsed: { mobile: !opened },
            }}
            padding="md"
        >
            <AppShell.Header>
                <Group h="100%" px="md">
                    <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                    <Title order={3}>Tech MKT Manager</Title>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md">
                <NavLink
                    component={Link}
                    href="/dashboard"
                    label="대시보드"
                    leftSection={<IconDashboard size="1rem" stroke={1.5} />}
                    active={pathname === '/dashboard'}
                />
                <NavLink
                    component={Link}
                    href="/budget"
                    label="예산 관리"
                    leftSection={<IconCoin size="1rem" stroke={1.5} />}
                    active={pathname === '/budget'}
                />
                <NavLink
                    component={Link}
                    href="/campaigns"
                    label="캠페인 관리"
                    leftSection={<IconSpeakerphone size="1rem" stroke={1.5} />}
                    active={pathname === '/campaigns'}
                />
                <NavLink
                    component={Link}
                    href="/activities"
                    label="MKT 활동"
                    leftSection={<IconActivity size="1rem" stroke={1.5} />}
                    active={pathname === '/activities'}
                />
            </AppShell.Navbar>

            <AppShell.Main bg="gray.0">{children}</AppShell.Main>
        </AppShell>
    );
}
