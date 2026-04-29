import { createFileRoute, useNavigate } from '@tanstack/react-router';
import React from 'react';
import { Button, ContentPage, XCircleIcon } from '@/components';
import { cn } from '@/lib';
import {
	addBlockTarget,
	BlockTargetIcon,
	BlockTargetTypeBadge,
	getBlockTargetKey,
	getBlockTargetLabel,
	getBlockTargetSublabel,
	hasBlockTarget,
	removeBlockTarget,
	useNewIntentionCx,
	type TBlockTarget
} from '@/modules/intentions';
import { CatalogSearch } from './components';

export const Route = createFileRoute('/window/main/_sidebar/intentions/new/block/targets/')({
	component: RouteComponent
});

function RouteComponent() {
	const cx = useNewIntentionCx();
	const navigate = useNavigate();

	const [selectedTargets, setSelectedTargets] = React.useState<TBlockTarget[]>(
		() => cx.$blockForm.fields.selectedTargets._v ?? []
	);

	const selectedTargetKeys = React.useMemo(
		() => new Set(selectedTargets.map(getBlockTargetKey)),
		[selectedTargets]
	);

	// MARK: - Actions

	const handleToggle = React.useCallback((target: TBlockTarget) => {
		setSelectedTargets((current) => {
			if (hasBlockTarget(current, target)) {
				return removeBlockTarget(current, target);
			}
			return addBlockTarget(current, target);
		});
	}, []);

	const handleRemove = React.useCallback((target: TBlockTarget) => {
		setSelectedTargets((current) => removeBlockTarget(current, target));
	}, []);

	const handleDone = React.useCallback(() => {
		cx.$blockForm.fields.selectedTargets.set(selectedTargets);
		void navigate({ to: '/window/main/intentions/new/block' });
	}, [cx, navigate, selectedTargets]);

	const handleCancel = React.useCallback(() => {
		void navigate({ to: '/window/main/intentions/new/block' });
	}, [navigate]);

	// MARK: - UI

	return (
		<ContentPage
			title="Select Targets"
			subtitle="Choose what to block or allow."
			footer={
				<>
					<Button onClick={handleCancel}>Cancel</Button>
					<Button variant="primary" onClick={handleDone}>
						Done
					</Button>
				</>
			}
			footerClassName="justify-end"
		>
			<div className="space-y-3">
				<CatalogSearch selectedKeys={selectedTargetKeys} onToggle={handleToggle} />

				{selectedTargets.length > 0 && (
					<div className="space-y-2">
						<p className="text-base-600 ml-1 px-1 text-[13px] font-semibold">Selected</p>
						<div className="bg-base-50/70 overflow-hidden rounded-xl">
							{selectedTargets.map((target, i) => (
								<SelectedTargetRow
									key={getBlockTargetKey(target)}
									target={target}
									isFirst={i === 0}
									onRemove={() => handleRemove(target)}
								/>
							))}
						</div>
					</div>
				)}
			</div>
		</ContentPage>
	);
}

const SelectedTargetRow: React.FC<TSelectedTargetRowProps> = (props) => {
	const { target, isFirst, onRemove } = props;

	return (
		<div
			className={cn(
				'group/selected-target hover:bg-base-950/6 relative flex w-full items-center gap-3 px-4 py-2.5',
				!isFirst &&
					"before:bg-base-100 before:absolute before:inset-x-4 before:top-0 before:h-px before:content-['']"
			)}
		>
			<BlockTargetIcon target={target} />
			<div className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="text-base-950 truncate text-sm">{getBlockTargetLabel(target)}</span>
				<span className="text-base-400 truncate text-xs">{getBlockTargetSublabel(target)}</span>
			</div>
			<div className="flex shrink-0 items-center gap-0 transition-[gap] group-focus-within/selected-target:gap-2 group-hover/selected-target:gap-2">
				<BlockTargetTypeBadge target={target} />
				<Button
					variant="ghost"
					size="icon-xs"
					className="text-base-300 hover:text-base-950 focus-visible:text-base-950 size-6 w-0 shrink-0 overflow-hidden rounded-md transition-[width] group-focus-within/selected-target:w-6 group-hover/selected-target:w-6 focus-visible:w-6"
					aria-label={`Remove ${getBlockTargetLabel(target)}`}
					onClick={onRemove}
				>
					<XCircleIcon className="size-4" />
				</Button>
			</div>
		</div>
	);
};

interface TSelectedTargetRowProps {
	target: TBlockTarget;
	isFirst: boolean;
	onRemove: () => void;
}
