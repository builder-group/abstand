import { useNavigate } from '@tanstack/react-router';
import { useListener } from 'feature-react/state';
import { createState } from 'feature-state';
import React from 'react';
import { Err, Ok, type TResult } from 'tuple-result';
import { Button, useToastsCx } from '@/components';
import { specta } from '@/environment';
import { createMountLifecycle, toTuple } from '@/lib';
import { useSettingsCx, type SettingsCx } from '@/modules/settings';

export class UpdaterCx {
	private readonly settingsCx: SettingsCx;

	public readonly $updateState = createState<TUpdaterState>({
		type: 'checking',
		source: 'automatic'
	});

	constructor(options: TUpdaterCxOptions) {
		this.settingsCx = options.settingsCx;
	}

	public mount(): () => void {
		const lifecycle = createMountLifecycle();

		// Note: SettingsCx sets $appSettings before $hasLoaded, so startup checks wait for $hasLoaded
		lifecycle.addCleanup(
			this.settingsCx.$hasLoaded.subscribe(({ value }) => {
				if (!value) {
					return;
				}

				this.applyAutomaticUpdateSettings(this.settingsCx.$appSettings.get());
			})
		);

		lifecycle.addCleanup(
			this.settingsCx.$appSettings.subscribe(({ value, prevValue }) => {
				if (!this.settingsCx.$hasLoaded.get()) {
					return;
				}

				const hasUpdateSettingsChanged =
					value.updates.automaticallyCheck !== prevValue?.updates.automaticallyCheck ||
					value.updates.releaseChannel !== prevValue?.updates.releaseChannel;
				if (!hasUpdateSettingsChanged) {
					return;
				}

				this.applyAutomaticUpdateSettings(value);
			})
		);

		return lifecycle.unmount;
	}

	private applyAutomaticUpdateSettings(settings: specta.AppSettings): void {
		if (!settings.updates.automaticallyCheck) {
			this.$updateState.set({ type: 'idle' });
			return;
		}

		void this.checkForUpdates('automatic');
	}

	public async checkForUpdates(
		source: TUpdaterCheckSource = 'manual'
	): Promise<TResult<null, string>> {
		const appInfo = await specta.commands.getAppInfo();
		const canCheckForUpdates = appInfo.stage === 'prod' && appInfo.distribution === 'direct';
		if (!canCheckForUpdates) {
			this.$updateState.set({ type: 'unsupported' });
			return Ok(null);
		}

		this.$updateState.set({ type: 'checking', source });

		const [isUpdateCheckOk, updateCheckErr, updateCheck] = toTuple(
			await specta.commands.checkForUpdate()
		);
		const shouldApplyAutomaticResult =
			source !== 'automatic' || this.settingsCx.$appSettings.get().updates.automaticallyCheck;
		if (!shouldApplyAutomaticResult) {
			return Ok(null);
		}
		if (!isUpdateCheckOk) {
			this.$updateState.set({
				type: 'error',
				message: updateCheckErr,
				source
			});
			return Err(updateCheckErr);
		}

		switch (updateCheck.status) {
			case 'available':
				this.$updateState.set({
					type: 'available',
					updateInfo: updateCheck.update,
					source
				});
				break;
			case 'upToDate':
				this.$updateState.set({ type: 'upToDate', source });
				break;
			case 'unsupported':
				this.$updateState.set({ type: 'unsupported' });
				break;
		}

		return Ok(null);
	}

	public async installUpdate(): Promise<TResult<null, string>> {
		if (this.$updateState._v.type !== 'available') {
			return Err('No update available');
		}

		const updateInfo = this.$updateState._v.updateInfo;
		this.$updateState.set({
			type: 'installing',
			updateInfo
		});

		const [isInstallOk, installErr] = toTuple(await specta.commands.installUpdate());
		if (!isInstallOk) {
			this.$updateState.set({
				type: 'available',
				updateInfo,
				source: 'manual'
			});
			return Err(installErr);
		}

		// Note: installUpdate restarts the app on success, so there is no success UI state to set
		return Ok(null);
	}
}

interface TUpdaterCxOptions {
	settingsCx: SettingsCx;
}

export type TUpdaterState =
	| { type: 'idle' }
	| { type: 'checking'; source: TUpdaterCheckSource }
	| { type: 'upToDate'; source: TUpdaterCheckSource }
	| {
			type: 'available';
			updateInfo: specta.UpdateInfo;
			source: TUpdaterCheckSource;
	  }
	| { type: 'installing'; updateInfo: specta.UpdateInfo }
	| { type: 'unsupported' }
	| { type: 'error'; message: string; source: TUpdaterCheckSource };

type TUpdaterCheckSource = 'automatic' | 'manual';

// MARK: - React Context

const ReactUpdaterContext = React.createContext<UpdaterCx | null>(null);

export const UpdaterCxProvider: React.FC<{ children: React.ReactNode }> = (props) => {
	const { children } = props;
	const navigate = useNavigate();
	const settingsCx = useSettingsCx();
	const toastsCx = useToastsCx();

	const cx = React.useMemo(() => new UpdaterCx({ settingsCx }), [settingsCx]);
	const notifiedUpdateVersionRef = React.useRef<string | null>(null);

	React.useEffect(() => {
		return cx.mount();
	}, [cx]);

	useListener(cx.$updateState, ({ value }) => {
		if (
			value.type !== 'available' ||
			value.source !== 'automatic' ||
			notifiedUpdateVersionRef.current === value.updateInfo.version
		) {
			return;
		}

		notifiedUpdateVersionRef.current = value.updateInfo.version;
		toastsCx.add({
			type: 'info',
			title: 'Update available',
			description: `Abstand ${value.updateInfo.version} is available.`,
			data: {
				action: (
					<Button
						type="button"
						variant="secondary"
						size="sm"
						onClick={() =>
							void navigate({
								to: '/window/main/settings/general',
								hash: 'updates'
							})
						}
					>
						Review Update
					</Button>
				)
			}
		});
	});

	return <ReactUpdaterContext value={cx}>{children}</ReactUpdaterContext>;
};

export function useUpdaterCx(): UpdaterCx {
	const cx = React.use(ReactUpdaterContext);
	if (cx == null) {
		throw new Error('useUpdaterCx must be used within an UpdaterCxProvider');
	}
	return cx;
}
