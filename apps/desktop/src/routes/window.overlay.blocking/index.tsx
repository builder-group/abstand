import { createFileRoute } from '@tanstack/react-router';
import { useFeatureState } from 'feature-react/state';
import React from 'react';
import * as z from 'zod';
import {
	ArrowUpRightIcon,
	Button,
	ClockIcon,
	GlobeIcon,
	LogOutIcon,
	ShieldIcon,
	Spinner,
	TimerIcon,
	useToastsCx
} from '@/components';
import { specta } from '@/environment';
import { cn, formatActiveTimeRangeLabel } from '@/lib';
import { BlockingOverlayCx, useCreateBlockingOverlayCx } from './lib';

export const Route = createFileRoute('/window/overlay/blocking/')({
	validateSearch: (search) => {
		const result = SBlockingOverlayRouteSearch.safeParse(search);
		return result.success ? result.data : { key: '', manualClose: false };
	},
	loaderDeps: ({ search }) => ({ key: search.key }),
	loader: async ({ deps }) => {
		if (!deps.key.length) {
			return null;
		}

		return specta.commands.getBlockingViolation(deps.key);
	},
	pendingComponent: BlockingOverlayLoading,
	pendingMs: 150,
	component: RouteComponent
});

const SBlockingOverlayRouteSearch = z.object({
	key: z.string().catch(''),
	manualClose: z.union([z.boolean(), z.stringbool()]).catch(false)
});

function RouteComponent() {
	const initialBlockingViolation = Route.useLoaderData();
	const { key, manualClose } = Route.useSearch();
	const toastsCx = useToastsCx();
	const cx = useCreateBlockingOverlayCx(key, initialBlockingViolation, toastsCx);
	const violation = useFeatureState(cx.$violation);

	// MARK: - UI

	if (violation == null) {
		return <BlockingOverlayLoading />;
	}

	return <BlockingOverlay violation={violation} manualClose={manualClose} cx={cx} />;
}

const BlockingOverlay: React.FC<TBlockingOverlayProps> = (props) => {
	const { violation, manualClose, cx } = props;
	const target = violation.blockedTarget;
	const isDeviceBlock = target.type === 'device';

	return (
		<main className="bg-base-0/55 text-base-950 relative grid h-screen w-screen grid-rows-[auto_1fr_auto] overflow-hidden px-6 py-8 text-center select-none supports-backdrop-filter:backdrop-blur-xl sm:px-12 sm:py-10">
			<BlockingOverlayAtmosphere
				accentColor={target.type !== 'device' ? (target.color ?? undefined) : undefined}
			/>

			<div className="text-base-600 relative z-10 flex min-w-0 items-center justify-center gap-2 text-[15px] leading-6 font-medium">
				<ClockIcon className="size-4 shrink-0" />
				<span className="min-w-0 truncate">
					{formatActiveTimeRangeLabel({
						startedAt: violation.sessionStartedAt,
						endsAt: violation.sessionAutomaticEndAt
					})}
				</span>
			</div>

			<div className="relative z-10 flex min-h-0 flex-col items-center justify-center gap-5 py-8 sm:gap-6">
				<BlockedTargetIcon target={target} />
				<div className="flex max-w-2xl flex-col items-center gap-4">
					<h1 className="text-base-950 max-w-full text-[34px] leading-[1.08] font-semibold text-balance wrap-break-word sm:text-[40px]">
						{isDeviceBlock ? 'Screen time can wait' : `${target.displayName} can wait`}
					</h1>
					<p className="text-base-500 max-w-xl text-[15px] leading-6 font-medium text-balance">
						<IntentionNameLink name={violation.intentionName} cx={cx} /> is active.{' '}
						{isDeviceBlock
							? 'You chose to step away from this device.'
							: `You asked for distance from ${target.displayName}.`}
					</p>
				</div>
			</div>

			<BlockingOverlayActions target={target} manualClose={manualClose} cx={cx} />
		</main>
	);
};

interface TBlockingOverlayProps {
	violation: specta.BlockingViolation;
	manualClose: boolean;
	cx: BlockingOverlayCx;
}

const IntentionNameLink: React.FC<TIntentionNameLinkProps> = (props) => {
	const { name, cx } = props;
	const isOpeningIntention = useFeatureState(cx.$isOpeningIntention);

	return (
		<button
			type="button"
			className="focus-ring text-base-600 hover:text-base-950 disabled:text-base-400 rounded-xs underline decoration-current/35 underline-offset-3 transition-colors disabled:pointer-events-none disabled:opacity-50"
			disabled={isOpeningIntention}
			onClick={() => void cx.openIntention()}
		>
			"{name}"
		</button>
	);
};

interface TIntentionNameLinkProps {
	name: string;
	cx: BlockingOverlayCx;
}

const BlockingOverlayActions: React.FC<TBlockingOverlayActionsProps> = (props) => {
	const { target, manualClose, cx } = props;
	const blockedAppCloseStatus = useFeatureState(cx.$blockedAppCloseStatus);
	const isOpeningIntention = useFeatureState(cx.$isOpeningIntention);
	const isPausingOverlay = useFeatureState(cx.$isPausingOverlay);

	const isQuittingApp = blockedAppCloseStatus === 'quitting';
	const canQuitBlockedApp = target.type === 'app' && blockedAppCloseStatus !== 'needsManualClose';
	const canPauseOverlay = manualClose || blockedAppCloseStatus === 'needsManualClose';

	return (
		<div className="relative z-10 flex flex-col items-center gap-3">
			<div className="flex flex-wrap items-center justify-center gap-2.5">
				{canQuitBlockedApp && (
					<Button
						size="lg"
						variant="soft"
						className="rounded-full"
						disabled={isQuittingApp}
						onClick={() => void cx.quitBlockedApp()}
					>
						{isQuittingApp ? <Spinner size="sm" tone="current" /> : <LogOutIcon />}
						{isQuittingApp ? 'Quitting...' : `Quit ${target.displayName}`}
					</Button>
				)}
				{canPauseOverlay && (
					<Button
						size="lg"
						variant="soft"
						className="rounded-full"
						disabled={isPausingOverlay}
						onClick={() => void cx.pauseOverlayTemporarily()}
					>
						{isPausingOverlay ? <Spinner size="sm" tone="current" /> : <TimerIcon />}
						{isPausingOverlay
							? 'Pausing...'
							: target.type === 'website'
								? 'Pause 5s to close tab'
								: 'Pause 5s to quit'}
					</Button>
				)}
				<Button
					size="lg"
					variant="soft"
					className="rounded-full"
					disabled={isOpeningIntention}
					onClick={() => void cx.openIntention()}
				>
					<ArrowUpRightIcon />
					{isOpeningIntention ? 'Opening...' : 'Open Intention'}
				</Button>
			</div>
		</div>
	);
};

interface TBlockingOverlayActionsProps {
	target: specta.BlockedTarget;
	manualClose: boolean;
	cx: BlockingOverlayCx;
}

function BlockingOverlayLoading() {
	return (
		<main className="bg-base-0/55 text-base-500 flex h-screen w-screen items-center justify-center overflow-hidden select-none supports-backdrop-filter:backdrop-blur-xl">
			<Spinner size="md" tone="current" className="size-5" />
		</main>
	);
}

const BlockedTargetIcon: React.FC<TBlockedTargetIconProps> = (props) => {
	const { target } = props;
	const iconUrl = target.type === 'device' ? null : target.icon;
	const FallbackTargetIcon = target.type === 'website' ? GlobeIcon : ShieldIcon;

	return (
		<div className="border-base-200/50 bg-base-950/6 flex size-16 shrink-0 items-center justify-center rounded-[20px] border">
			{iconUrl != null ? (
				<img
					src={iconUrl}
					alt=""
					className={cn(
						'rounded-2xl object-contain',
						target.type === 'app' && 'size-14',
						target.type === 'website' && 'size-11'
					)}
				/>
			) : (
				<FallbackTargetIcon className="text-base-600 size-7" />
			)}
		</div>
	);
};

interface TBlockedTargetIconProps {
	target: specta.BlockedTarget;
}

const BlockingOverlayAtmosphere: React.FC<TBlockingOverlayAtmosphereProps> = (props) => {
	const { accentColor = '#0a84ff' } = props;

	return (
		<div className="pointer-events-none absolute inset-0 overflow-hidden">
			<div
				className="absolute inset-0"
				style={{
					background: [
						// Vertical accent
						`linear-gradient(180deg, color-mix(in srgb, ${accentColor} 20%, transparent) 0%, color-mix(in srgb, ${accentColor} 8%, transparent) 52%, transparent 100%)`,
						// Diagonal accent
						`linear-gradient(125deg, color-mix(in srgb, ${accentColor} 7%, transparent) 0%, transparent 46%, color-mix(in srgb, ${accentColor} 5%, transparent) 100%)`
					].join(', ')
				}}
			/>
			<div className="absolute inset-0 bg-linear-to-b from-white/20 via-transparent to-white/10" />
			<div className="absolute inset-0 bg-[linear-gradient(125deg,rgb(255_255_255/0.05)_0%,transparent_44%,rgb(255_255_255/0.035)_100%)]" />
		</div>
	);
};

interface TBlockingOverlayAtmosphereProps {
	accentColor?: string;
}
