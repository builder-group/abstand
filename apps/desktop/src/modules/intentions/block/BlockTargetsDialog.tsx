import { useCompute, useFeatureState } from 'feature-react/state';
import { createState } from 'feature-state';
import React from 'react';
import {
	Button,
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	XCircleIcon
} from '@/components';
import { specta } from '@/environment';
import { cn, createComputedState, createMountLifecycle } from '@/lib';
import {
	addBlockTarget,
	getBlockTargetKey,
	getBlockTargetLabel,
	getBlockTargetSublabel,
	hasBlockTarget,
	removeBlockTarget,
	type TBlockTarget
} from './block-target';
import { BlockTargetIcon } from './BlockTargetIcon';
import { BlockTargetTypeBadge } from './BlockTargetTypeBadge';
import { CatalogSearch } from './CatalogSearch';

const BlockTargetsDialog: React.FC<TBlockTargetsDialogProps> = ({ cx }) => {
	const isOpen = useFeatureState(cx.$isOpen);
	const selectedTargets = useFeatureState(cx.$selectedTargets);
	const isDirty = useFeatureState(cx.$isDirty);

	// MARK: - UI

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) cx.cancel();
			}}
		>
			<DialogContent className="flex h-[480px] max-w-xl flex-col">
				<DialogHeader>
					<DialogTitle>Select Targets</DialogTitle>
				</DialogHeader>

				<DialogBody className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
					<CatalogSearch cx={cx} />

					<div className="flex min-h-0 flex-1 flex-col gap-2">
						<p className="text-base-600 ml-1 shrink-0 px-1 text-[13px] font-semibold">Selected</p>
						<div className="no-scrollbar bg-base-50/70 min-h-0 flex-1 overflow-y-auto rounded-xl">
							{selectedTargets.length === 0 ? (
								<div className="text-base-400 flex h-full items-center justify-center text-sm">
									No targets selected
								</div>
							) : (
								selectedTargets.map((target, i) => (
									<SelectedTargetRow
										key={getBlockTargetKey(target)}
										cx={cx}
										target={target}
										isFirst={i === 0}
										onRemove={() => cx.remove(target)}
									/>
								))
							)}
						</div>
					</div>
				</DialogBody>

				<DialogFooter>
					<Button onClick={() => cx.cancel()}>Cancel</Button>
					<Button variant="primary" onClick={() => cx.confirm()} disabled={!isDirty}>
						Done
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

interface TBlockTargetsDialogProps {
	cx: BlockTargetsDialogCx;
}

const SelectedTargetRow: React.FC<TSelectedTargetRowProps> = (props) => {
	const { cx, target, isFirst, onRemove } = props;
	const icon = useCompute(cx.$iconAssets, ({ value }) => value[getBlockTargetKey(target)]?.icon);

	return (
		<div
			className={cn(
				'group/selected-target hover:bg-base-950/6 relative flex w-full items-center gap-3 px-4 py-2.5',
				!isFirst &&
					"before:bg-base-100 before:absolute before:inset-x-4 before:top-0 before:h-px before:content-['']"
			)}
		>
			<BlockTargetIcon target={target} icon={icon} />
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
	cx: BlockTargetsDialogCx;
	target: TBlockTarget;
	isFirst: boolean;
	onRemove: () => void;
}

// MARK: - Cx

export class BlockTargetsDialogCx {
	public readonly $isOpen = createState(false);
	public readonly $iconAssets = createState<Record<string, specta.CatalogIconDto>>({});
	public readonly $selectedTargets = createState<TBlockTarget[]>([]);
	private readonly $committedTargets = createState<TBlockTarget[]>([]);
	private _activeCatalogSearchSessionId: number | null = null;

	private readonly _hooks: {
		onConfirm: (targets: TBlockTarget[]) => void;
	} = { onConfirm: () => {} };

	constructor(onConfirm: (targets: TBlockTarget[]) => void) {
		this._hooks.onConfirm = onConfirm;
	}

	public mount(): () => void {
		const lifecycle = createMountLifecycle();
		lifecycle.addCleanup(() => {
			void this.cancelActiveCatalogSearchSession();
		});

		void (async () => {
			lifecycle.addCleanup(
				await specta.events.catalogIconLoadedEvent.listen(({ payload }) => {
					this.cacheIcon(payload.targetKey, payload.asset);
				})
			);
		})();

		return lifecycle.unmount;
	}

	public readonly $isDirty = createComputedState(
		[this.$selectedTargets, this.$committedTargets] as const,
		([selectedTargets, committedTargets]) => {
			if (selectedTargets.length !== committedTargets.length) {
				return true;
			}

			const committedKeys = new Set(committedTargets.map(getBlockTargetKey));
			return selectedTargets.some((target) => !committedKeys.has(getBlockTargetKey(target)));
		}
	);

	public open(targets: TBlockTarget[]): void {
		this.$committedTargets.set([...targets]);
		this.$selectedTargets.set([...targets]);
		this.$isOpen.set(true);
	}

	public toggle(target: TBlockTarget): void {
		const current = this.$selectedTargets._v;
		this.$selectedTargets.set(
			hasBlockTarget(current, target)
				? removeBlockTarget(current, target)
				: addBlockTarget(current, target)
		);
	}

	public remove(target: TBlockTarget): void {
		this.$selectedTargets.set(removeBlockTarget(this.$selectedTargets._v, target));
	}

	public confirm(): void {
		void this.cancelActiveCatalogSearchSession();
		this.$committedTargets.set([...this.$selectedTargets._v]);
		this._hooks.onConfirm(this.$selectedTargets._v);
		this.$isOpen.set(false);
	}

	public cancel(): void {
		void this.cancelActiveCatalogSearchSession();
		this.$selectedTargets.set([...this.$committedTargets._v]);
		this.$isOpen.set(false);
	}

	public setActiveCatalogSearchSessionId(sessionId: number | null): void {
		this._activeCatalogSearchSessionId = sessionId;
	}

	public async cancelActiveCatalogSearchSession(): Promise<void> {
		const sessionId = this._activeCatalogSearchSessionId;
		this._activeCatalogSearchSessionId = null;
		if (sessionId == null) {
			return;
		}

		await specta.commands.cancelCatalogSearchSession({ sessionId });
	}

	private cacheIcon(targetKey: string, asset: specta.CatalogIconDto): void {
		const currentAsset = this.$iconAssets._v[targetKey];
		if (currentAsset?.icon === asset.icon && currentAsset?.color === asset.color) {
			return;
		}

		this.$iconAssets.set({
			...this.$iconAssets._v,
			[targetKey]: asset
		});
	}
}

// MARK: - Hook

export function useBlockTargetsDialog(
	options: TUseBlockTargetsDialogOptions
): TBlockTargetsDialogHandle {
	const { onConfirm } = options;

	const cx = React.useMemo(() => new BlockTargetsDialogCx(onConfirm), [onConfirm]);

	React.useEffect(() => {
		return cx.mount();
	}, [cx]);

	const Modal = React.useCallback(() => <BlockTargetsDialog cx={cx} />, [cx]);

	return { open: (targets) => cx.open(targets), Modal };
}

export interface TUseBlockTargetsDialogOptions {
	onConfirm: (targets: TBlockTarget[]) => void;
}

export interface TBlockTargetsDialogHandle {
	open: (targets: TBlockTarget[]) => void;
	Modal: React.FC;
}
