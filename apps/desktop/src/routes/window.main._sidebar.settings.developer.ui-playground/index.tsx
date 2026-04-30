import { createFileRoute } from '@tanstack/react-router';
import { cva, type VariantProps } from 'class-variance-authority';
import React from 'react';
import {
	Badge,
	Button,
	CheckIcon,
	CircleQuestionMarkIcon,
	CodeXmlIcon,
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
	ComboboxStatus,
	Dialog,
	DialogBody,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	IconBubble,
	Input,
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupText,
	Kbd,
	LibraryBigIcon,
	MonitorIcon,
	SearchIcon,
	SegmentedControl,
	SegmentedControlItem,
	SettingsPage,
	Switch,
	Textarea,
	Toggle,
	Tooltip,
	useComboboxAnchor,
	XCircleIcon
} from '@/components';
import { cn } from '@/lib';
import { SettingsGroup, SettingsRow } from '@/modules/settings';

export const Route = createFileRoute('/window/main/_sidebar/settings/developer/ui-playground/')({
	component: RouteComponent
});

function RouteComponent() {
	return (
		<SettingsPage
			title="UI Playground"
			subtitle="Sizes, states, and variants for shared desktop components."
			icon={<LibraryBigIcon />}
			iconVariant="secondary"
			backTo="/window/main/settings/developer"
		>
			<div className="space-y-6">
				<ButtonSection />
				<InputSection />
				<InputGroupSection />
				<TextareaSection />
				<SwitchSection />
				<ToggleSection />
				<SegmentedControlSection />
				<ComboboxSection />
				<BadgeSection />
				<KbdSection />
				<IconBubbleSection />
				<TooltipSection />
				<DialogSection />
				<SettingsSection />
			</div>
		</SettingsPage>
	);
}

// MARK: - Button

const ButtonSection: React.FC = () => {
	return (
		<PlaygroundGroup title="Button">
			<PlaygroundRow label="Sizes">
				<Button>Default</Button>
				<Button size="sm">Small</Button>
				<Button size="lg">Large</Button>
			</PlaygroundRow>
			<PlaygroundRow label="Variants">
				<Button>Default</Button>
				<Button variant="primary">Primary</Button>
				<Button variant="soft">Soft</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="outline">Outline</Button>
			</PlaygroundRow>
			<PlaygroundRow label="States">
				<Button disabled>Disabled</Button>
				<Button variant="primary" disabled>
					Disabled Primary
				</Button>
			</PlaygroundRow>
			<PlaygroundRow label="Icon Buttons">
				<Button size="icon" aria-label="Search">
					<SearchIcon />
				</Button>
				<Button size="icon-sm" variant="ghost" aria-label="Developer">
					<CodeXmlIcon />
				</Button>
				<Button size="icon-xs" variant="outline" aria-label="Close">
					<XCircleIcon />
				</Button>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Input

const InputSection: React.FC = () => {
	return (
		<PlaygroundGroup title="Input">
			<PlaygroundRow label="Sizes">
				<Input placeholder="Default input" className="w-44" />
				<Input size="sm" placeholder="Small input" className="w-44" />
			</PlaygroundRow>
			<PlaygroundRow label="States">
				<Input defaultValue="With value" className="w-44" />
				<Input placeholder="Invalid" aria-invalid className="w-44" />
				<Input defaultValue="Disabled" disabled className="w-44" />
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Input Group

const InputGroupSection: React.FC = () => {
	return (
		<PlaygroundGroup title="Input Group">
			<PlaygroundRow label="Examples">
				<InputGroup className="w-64">
					<InputGroupAddon>
						<SearchIcon className="text-base-400 size-4" />
					</InputGroupAddon>
					<InputGroupInput placeholder="Search components" />
					<InputGroupAddon align="inline-end">
						<InputGroupButton aria-label="Submit search">
							<CheckIcon className="size-3.5" />
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
				<InputGroup className="w-44">
					<InputGroupAddon>
						<InputGroupText>cmd</InputGroupText>
					</InputGroupAddon>
					<InputGroupInput placeholder="K" />
				</InputGroup>
				<InputGroup className="w-56">
					<InputGroupInput placeholder="Toggle sidebar" />
					<InputGroupAddon align="inline-end">
						<Kbd>⌘B</Kbd>
					</InputGroupAddon>
				</InputGroup>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Textarea

const TextareaSection: React.FC = () => {
	return (
		<PlaygroundGroup title="Textarea">
			<PlaygroundRow label="Sizes">
				<Textarea defaultValue="Default textarea" className="w-60" />
				<Textarea size="sm" defaultValue="Small textarea" className="w-60" />
			</PlaygroundRow>
			<PlaygroundRow label="States">
				<Textarea placeholder="Invalid textarea" aria-invalid className="w-60" />
				<Textarea defaultValue="Disabled value" disabled className="w-60" />
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Switch

const SwitchSection: React.FC = () => {
	const [defaultValue, setDefaultValue] = React.useState(true);
	const [smallValue, setSmallValue] = React.useState(false);

	return (
		<PlaygroundGroup title="Switch">
			<PlaygroundRow label="Sizes">
				<Switch checked={defaultValue} onCheckedChange={setDefaultValue} />
				<Switch size="sm" checked={smallValue} onCheckedChange={setSmallValue} />
			</PlaygroundRow>
			<PlaygroundRow label="States">
				<Switch disabled />
				<Switch defaultChecked disabled />
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Toggle

const ToggleSection: React.FC = () => {
	const [defaultValue, setDefaultValue] = React.useState(false);
	const [smallValue, setSmallValue] = React.useState(true);
	const [outlineValue, setOutlineValue] = React.useState(false);
	const [iconValue, setIconValue] = React.useState(false);

	return (
		<PlaygroundGroup title="Toggle">
			<PlaygroundRow label="Sizes">
				<Toggle pressed={defaultValue} onPressedChange={setDefaultValue}>
					Default
				</Toggle>
				<Toggle size="sm" pressed={smallValue} onPressedChange={setSmallValue}>
					Small
				</Toggle>
			</PlaygroundRow>
			<PlaygroundRow label="Variants">
				<Toggle>Default</Toggle>
				<Toggle variant="outline" pressed={outlineValue} onPressedChange={setOutlineValue}>
					Outline
				</Toggle>
			</PlaygroundRow>
			<PlaygroundRow label="States">
				<Toggle disabled>Disabled</Toggle>
				<Toggle pressed disabled>
					Pressed
				</Toggle>
			</PlaygroundRow>
			<PlaygroundRow label="Icon">
				<Toggle
					size="icon"
					variant="icon"
					pressed={iconValue}
					onPressedChange={setIconValue}
					aria-label="Developer tools"
				>
					<CodeXmlIcon />
				</Toggle>
				<Toggle size="icon-sm" variant="icon" aria-label="Help">
					<CircleQuestionMarkIcon />
				</Toggle>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Segmented Control

const SegmentedControlSection: React.FC = () => {
	const [defaultValue, setDefaultValue] = React.useState('default');
	const [smallValue, setSmallValue] = React.useState('default');

	return (
		<PlaygroundGroup title="Segmented Control">
			<PlaygroundRow label="Sizes">
				<SegmentedControl value={defaultValue} onValueChange={setDefaultValue}>
					<SegmentedControlItem value="default">Default</SegmentedControlItem>
					<SegmentedControlItem value="compact">Compact</SegmentedControlItem>
				</SegmentedControl>
				<SegmentedControl value={smallValue} onValueChange={setSmallValue} size="sm">
					<SegmentedControlItem value="default">Default</SegmentedControlItem>
					<SegmentedControlItem value="compact">Compact</SegmentedControlItem>
				</SegmentedControl>
			</PlaygroundRow>
			<PlaygroundRow label="States">
				<SegmentedControl value="default" onValueChange={() => {}}>
					<SegmentedControlItem value="default">Default</SegmentedControlItem>
					<SegmentedControlItem value="disabled" disabled>
						Disabled
					</SegmentedControlItem>
				</SegmentedControl>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Combobox

const ComboboxSection: React.FC = () => {
	const anchorRef = useComboboxAnchor();
	const [value, setValue] = React.useState<string | null>(null);

	const items = ['28px default', '32px roomy', '24px compact'] as const;

	return (
		<PlaygroundGroup title="Combobox">
			<PlaygroundRow label="Single Select">
				<Combobox
					items={items}
					value={value}
					onValueChange={setValue}
					itemToStringValue={(item) => item ?? ''}
				>
					<ComboboxInput
						ref={anchorRef}
						className="w-72"
						leading={<SearchIcon className="text-base-400 size-4" />}
						placeholder="Choose a density"
						showClear
					/>
					<ComboboxContent anchor={anchorRef}>
						<ComboboxStatus>Density presets</ComboboxStatus>
						<ComboboxList>
							{items.map((item) => (
								<ComboboxItem key={item} value={item}>
									{item}
								</ComboboxItem>
							))}
							<ComboboxEmpty>No presets</ComboboxEmpty>
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Badge

const BadgeSection: React.FC = () => {
	return (
		<PlaygroundGroup title="Badge">
			<PlaygroundRow label="Sizes">
				<Badge>Default</Badge>
				<Badge size="sm">Small</Badge>
			</PlaygroundRow>
			<PlaygroundRow label="Variants">
				<Badge>Default</Badge>
				<Badge variant="secondary">Secondary</Badge>
				<Badge variant="outline">Outline</Badge>
				<Badge variant="ghost">Ghost</Badge>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Kbd

const KbdSection: React.FC = () => {
	return (
		<PlaygroundGroup title="Kbd">
			<PlaygroundRow label="Sizes">
				<Kbd>⌘K</Kbd>
				<Kbd size="md">⌘⇧P</Kbd>
			</PlaygroundRow>
			<PlaygroundRow label="Variants">
				<Kbd>Enter</Kbd>
				<Kbd variant="ghost">Esc</Kbd>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Icon Bubble

const IconBubbleSection: React.FC = () => {
	return (
		<PlaygroundGroup title="Icon Bubble">
			<PlaygroundRow label="Sizes">
				<IconBubble size="xs" variant="neutral">
					<MonitorIcon />
				</IconBubble>
				<IconBubble size="sm" variant="neutral">
					<MonitorIcon />
				</IconBubble>
				<IconBubble variant="neutral">
					<MonitorIcon />
				</IconBubble>
			</PlaygroundRow>
			<PlaygroundRow label="Variants">
				<IconBubble size="sm">
					<MonitorIcon />
				</IconBubble>
				<IconBubble size="sm" variant="secondary">
					<CodeXmlIcon />
				</IconBubble>
				<IconBubble size="sm" variant="success">
					<CheckIcon />
				</IconBubble>
				<IconBubble size="sm" variant="warning">
					<CircleQuestionMarkIcon />
				</IconBubble>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Tooltip

const TooltipSection: React.FC = () => {
	return (
		<PlaygroundGroup title="Tooltip">
			<PlaygroundRow label="Examples">
				<Tooltip content="Open the command palette" shortcut="⌘K">
					<Button variant="soft">Hover me</Button>
				</Tooltip>
				<Tooltip content="Compact help">
					<Button size="sm" variant="ghost">
						Help
					</Button>
				</Tooltip>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Dialog

const DialogSection: React.FC = () => {
	const [isOpen, setIsOpen] = React.useState(false);

	return (
		<PlaygroundGroup title="Dialog">
			<PlaygroundRow label="Preview">
				<Button variant="primary" onClick={() => setIsOpen(true)}>
					Open Dialog
				</Button>
				<Dialog open={isOpen} onOpenChange={setIsOpen}>
					<DialogContent className="max-w-md">
						<DialogHeader>
							<DialogTitle>Playground Dialog</DialogTitle>
						</DialogHeader>
						<DialogBody className="space-y-3">
							<p className="text-base-500 text-sm">
								Use this to compare button, body, and footer spacing against the rest of the desktop
								UI.
							</p>
							<Input placeholder="Dialog input" />
						</DialogBody>
						<DialogFooter>
							<Button onClick={() => setIsOpen(false)}>Cancel</Button>
							<Button variant="primary" onClick={() => setIsOpen(false)}>
								Done
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Settings

const SettingsSection: React.FC = () => {
	const [defaultTheme, setDefaultTheme] = React.useState('system');
	const [smallTheme, setSmallTheme] = React.useState('system');
	const [defaultDeveloperEnabled, setDefaultDeveloperEnabled] = React.useState(true);
	const [smallDeveloperEnabled, setSmallDeveloperEnabled] = React.useState(false);

	return (
		<PlaygroundGroup title="Settings Group and Row" variant="outline">
			<PlaygroundRow label="Default" contentClassName="flex-col items-start">
				<SettingsGroup title="Appearance" className="w-full">
					<SettingsRow label="Theme" description="Choose a display mode.">
						<SegmentedControl value={defaultTheme} onValueChange={setDefaultTheme}>
							<SegmentedControlItem value="system">System</SegmentedControlItem>
							<SegmentedControlItem value="light">Light</SegmentedControlItem>
							<SegmentedControlItem value="dark">Dark</SegmentedControlItem>
						</SegmentedControl>
					</SettingsRow>
					<SettingsRow label="Developer" description="Enable internal tools.">
						<Switch
							checked={defaultDeveloperEnabled}
							onCheckedChange={setDefaultDeveloperEnabled}
						/>
					</SettingsRow>
				</SettingsGroup>
			</PlaygroundRow>
			<PlaygroundRow label="Small" contentClassName="flex-col items-start">
				<SettingsGroup title="Appearance" size="sm" className="w-full">
					<SettingsRow size="sm" label="Theme" description="Choose a display mode.">
						<SegmentedControl value={smallTheme} onValueChange={setSmallTheme} size="sm">
							<SegmentedControlItem value="system">System</SegmentedControlItem>
							<SegmentedControlItem value="light">Light</SegmentedControlItem>
							<SegmentedControlItem value="dark">Dark</SegmentedControlItem>
						</SegmentedControl>
					</SettingsRow>
					<SettingsRow size="sm" label="Developer" description="Enable internal tools.">
						<Switch
							size="sm"
							checked={smallDeveloperEnabled}
							onCheckedChange={setSmallDeveloperEnabled}
						/>
					</SettingsRow>
				</SettingsGroup>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Playground Helpers

const PlaygroundGroup: React.FC<TPlaygroundGroupProps> = (props) => {
	const { title, variant = 'default', className, children } = props;

	return (
		<SettingsGroup title={title} className={cn(playgroundGroupVariants({ variant }), className)}>
			{children}
		</SettingsGroup>
	);
};

const playgroundGroupVariants = cva('', {
	variants: {
		variant: {
			default: '',
			outline: 'border border-base-100 bg-base-0'
		}
	},
	defaultVariants: {
		variant: 'default'
	}
});

const PlaygroundRow: React.FC<TPlaygroundRowProps> = (props) => {
	const { label, children, contentClassName } = props;

	return (
		<SettingsRow
			label={label}
			contentClassName={cn('w-full max-w-md flex-wrap justify-end gap-2', contentClassName)}
		>
			{children}
		</SettingsRow>
	);
};

interface TPlaygroundGroupProps extends VariantProps<typeof playgroundGroupVariants> {
	title: string;
	className?: string;
	children: React.ReactNode;
}

interface TPlaygroundRowProps {
	label: string;
	children: React.ReactNode;
	contentClassName?: string;
}
