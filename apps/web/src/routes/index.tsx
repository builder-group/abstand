import { createFileRoute } from '@tanstack/react-router';
import { CheckIcon } from 'lucide-react';
import { appConfig } from '@/environment';
import { useDetectPlatform, type TMacArchitecture } from '@/hooks';
import { cn, fetchLatestRelease } from '@/lib';

export const Route = createFileRoute('/')({
	loader: () => fetchLatestRelease(),
	head: () => ({
		meta: [
			{ title: 'Abstand: open-source macOS app and website blocker' },
			{
				name: 'description',
				content:
					'Block apps and websites before they pull you off track. Abstand is an open-source macOS app and website blocker for focus, wind-down, and digital detox.'
			},
			{
				property: 'og:title',
				content: 'Abstand: block apps and websites before they pull you off track'
			},
			{
				property: 'og:description',
				content:
					'Schedule focus, wind-down, and detox blocks for apps, websites, or your whole Mac. Choose how firm they should be, then let Abstand hold the boundary.'
			},
			{ property: 'og:type', content: 'website' },
			{ property: 'og:url', content: appConfig.website },
			{
				property: 'og:image',
				content: `${appConfig.website}/og.png`
			},
			{ name: 'twitter:card', content: 'summary_large_image' },
			{
				name: 'twitter:title',
				content: 'Abstand: block apps and websites before they pull you off track'
			},
			{
				name: 'twitter:description',
				content:
					'Schedule focus, wind-down, and detox blocks for apps, websites, or your whole Mac.'
			},
			{
				name: 'twitter:image',
				content: `${appConfig.website}/og.png`
			}
		],
		links: [{ rel: 'canonical', href: appConfig.website }]
	}),
	component: RouteComponent
});

function RouteComponent() {
	const release = Route.useLoaderData();
	const { github, githubReleases } = appConfig.distribution;
	const latestGitHubReleaseUrl = `${githubReleases}/latest`;
	const macAppleSiliconDownloadUrl = release.downloadLinks.macAppleSilicon;
	const macIntelDownloadUrl = release.downloadLinks.macIntel;

	const platformInfo = useDetectPlatform();
	const macArchitecture = platformInfo.platform === 'macos' ? platformInfo.macArchitecture : null;

	// Note: Keeps the unknown SSR snapshot neutral until client platform detection runs
	const isKnownNonMac = platformInfo.platform != null && platformInfo.platform !== 'macos';

	const directMacDownloadUrl =
		macArchitecture != null
			? macArchitecture === 'intel'
				? macIntelDownloadUrl
				: macAppleSiliconDownloadUrl
			: null;
	const alternateMacDownloadUrl =
		macArchitecture != null
			? macArchitecture === 'intel'
				? macAppleSiliconDownloadUrl
				: macIntelDownloadUrl
			: null;

	const downloadUrl = directMacDownloadUrl ?? latestGitHubReleaseUrl;

	return (
		<div className="flex min-h-screen flex-col items-center">
			<main className="flex w-full flex-col items-center px-8 pt-24 pb-9 sm:pt-28">
				<div
					className={cn(fadeInClassName, 'flex w-full max-w-4xl flex-col items-center text-center')}
				>
					<img
						src="/logo.svg"
						alt="Abstand app icon"
						className="border-base-200 mb-3 size-24 rounded-3xl border shadow-xl"
					/>
					<h1 className="mt-8 font-serif text-4xl leading-tight font-medium sm:text-5xl md:text-6xl">
						Block apps and websites <br className="hidden sm:block" />
						before they pull you off track
					</h1>
					<p className="text-base-600 mt-6 max-w-2xl text-lg leading-8 sm:text-xl">
						Abstand is an open-source app and website blocker for focus, wind-down, and digital
						detox. Schedule blocks for apps, websites, or your whole Mac, choose how firm they
						should be, and let Abstand hold the boundary.
					</p>

					<div className="mt-8 mb-16 flex flex-col items-center gap-2 sm:mb-20">
						<div className="flex flex-wrap items-center justify-center gap-3">
							<a
								href={downloadUrl}
								aria-label={getDownloadAriaLabel(directMacDownloadUrl != null, macArchitecture)}
								{...(directMacDownloadUrl != null
									? {}
									: { target: '_blank', rel: 'noopener noreferrer' })}
								className="bg-base-950 text-base-0 inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-base font-medium transition-opacity hover:opacity-90"
							>
								{isKnownNonMac ? 'View macOS downloads' : 'Download for macOS'}
							</a>
							<a
								href={github}
								target="_blank"
								rel="noopener noreferrer"
								className="border-base-200 bg-base-50 inline-flex items-center justify-center rounded-xl border px-5 py-2.5 text-base font-medium transition-opacity hover:opacity-90"
							>
								GitHub
							</a>
						</div>
						<p className="text-base-600 mt-4 text-sm">
							{isKnownNonMac && (
								<>
									macOS only for now
									<span className="text-base-400"> · </span>
								</>
							)}
							{release.version != null
								? `Latest release: ${release.version}`
								: 'Latest release on GitHub'}
							{alternateMacDownloadUrl != null && (
								<>
									<span className="text-base-400"> · </span>
									<a
										href={alternateMacDownloadUrl}
										aria-label={
											macArchitecture === 'intel'
												? 'Download Abstand for macOS Apple Silicon'
												: 'Download Abstand for Intel Mac'
										}
										className="underline transition-opacity hover:opacity-80"
									>
										{macArchitecture === 'intel' ? 'Apple Silicon Mac' : 'Intel Mac'}
									</a>
								</>
							)}
							<span className="text-base-400"> · </span>
							<a
								href={githubReleases}
								target="_blank"
								rel="noopener noreferrer"
								className="underline transition-opacity hover:opacity-80"
							>
								All downloads
							</a>
						</p>
					</div>
				</div>

				<div className={cn(fadeInDelayClassName, 'relative flex w-full justify-center')}>
					<div className="bg-base-0 overflow-hidden rounded-2xl shadow-2xl">
						<img
							src="/illustrations/screenshot_main-window.png"
							alt="Abstand showing a Deep work Block Intention with selected apps, websites, enforcement, and schedule settings."
							className="h-auto w-full max-w-220"
							width={880}
							height={700}
						/>
					</div>
				</div>

				<section className={cn(fadeInDelayClassName, 'mt-24 w-full max-w-5xl sm:mt-32')}>
					<div className="grid grid-cols-1 gap-x-8 gap-y-12 lg:grid-cols-5">
						<div className="lg:col-span-2">
							<h2 className="text-primary text-base leading-7 font-semibold">What Abstand does</h2>
							<p className="text-base-950 mt-2 font-serif text-3xl leading-tight font-medium tracking-normal text-pretty sm:text-4xl">
								Set the boundary once. Let your Mac hold it.
							</p>
							<p className="text-base-700 mt-6 text-base leading-7">
								Create scheduled blocks for apps, websites, or whole-device lockouts.
							</p>
						</div>
						<dl className="text-base-600 grid grid-cols-1 gap-x-8 gap-y-10 text-base leading-7 sm:grid-cols-2 lg:col-span-3 lg:gap-y-12">
							{features.map((feature) => (
								<div key={feature.name} className="relative pl-9">
									<dt className="text-base-950 font-semibold">
										<CheckIcon aria-hidden className="text-primary absolute top-1 left-0 size-5" />
										{feature.name}
									</dt>
									<dd className="mt-2">{feature.description}</dd>
								</div>
							))}
						</dl>
					</div>
				</section>

				<section
					className={cn(fadeInDelayClassName, 'mt-24 w-full max-w-4xl text-center sm:mt-32')}
				>
					<h2 className="text-base-950 font-serif text-3xl leading-tight font-medium sm:text-4xl">
						Your attention is not the problem. <br className="hidden sm:block" />
						The branches are.
					</h2>
					<p className="text-base-700 mt-6 text-lg leading-8">
						Attention is like a river. Concentrated, it moves with power. Branched across tabs,
						apps, notifications, and quick checks, it spreads thin: you feel busy, but nothing
						moves. Abstand does not fight the water. It builds the banks ahead of time, then keeps
						them in place when it matters.
					</p>
				</section>

				<footer className="flex flex-col items-center gap-3 pt-28 pb-16 sm:pt-36 sm:pb-12">
					<img src="/illustrations/logo_builder-group.svg" alt="" className="h-8 rounded-lg" />
					<p className="text-base-600 text-sm">
						Made by{' '}
						<a
							href="https://builder.group/"
							target="_blank"
							rel="noopener noreferrer"
							className="text-base-800 font-medium transition-opacity hover:opacity-70"
						>
							builder.group
						</a>
					</p>
				</footer>
			</main>
		</div>
	);
}

const fadeInClassName = 'animate-fade-in opacity-0';
const fadeInDelayClassName = 'animate-fade-in-delay opacity-0';

const features = [
	{
		name: 'Schedule blocks in advance',
		description: 'Plan focus, study, writing, wind-down, or detox sessions before they start.'
	},
	{
		name: 'Block apps, websites, or the whole Mac',
		description:
			'Keep selected distractions out of reach, or lock the whole device behind a full-screen overlay.'
	},
	{
		name: 'Make blocks as firm as they need to be',
		description: 'Use casual, balanced, or strict mode based on how hard it should be to end early.'
	},
	{
		name: 'Keep it local',
		description: 'Blocks run on your Mac. Your schedules and settings stay on your device.'
	}
] satisfies TFeature[];

interface TFeature {
	name: string;
	description: string;
}

function getDownloadAriaLabel(
	isDirectDownload: boolean,
	macArchitecture: TMacArchitecture
): string {
	if (!isDirectDownload) {
		return 'Open Abstand macOS downloads on GitHub';
	}
	if (macArchitecture === 'intel') {
		return 'Download Abstand for Intel Mac';
	}

	return 'Download Abstand for macOS Apple Silicon';
}
