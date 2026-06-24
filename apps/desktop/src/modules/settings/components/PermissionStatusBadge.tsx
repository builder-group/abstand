import React from 'react';
import { Badge, CheckIcon, CircleSlashIcon } from '@/components';

export const PermissionStatusBadge: React.FC<TPermissionStatusBadgeProps> = (props) => {
	const { isGranted } = props;

	if (isGranted) {
		return (
			<Badge variant="success">
				<CheckIcon />
				Granted
			</Badge>
		);
	}

	return (
		<Badge variant="warning">
			<CircleSlashIcon />
			Required
		</Badge>
	);
};

interface TPermissionStatusBadgeProps {
	isGranted: boolean;
}
