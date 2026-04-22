import { useLocation } from '@tanstack/react-router';
import React from 'react';
import { MainSidebarContent } from './MainSidebarContent';
import { SettingsSidebarContent } from './SettingsSidebarContent';

export const SidebarContent: React.FC = () => {
	const { pathname } = useLocation();

	if (pathname.startsWith('/window/main/settings')) {
		return <SettingsSidebarContent className="w-56" />;
	}

	return <MainSidebarContent className="w-56" />;
};
