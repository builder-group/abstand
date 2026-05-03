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
	ComboboxChip,
	ComboboxChips,
	ComboboxChipsInput,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxLabel,
	ComboboxList,
	ComboboxSeparator,
	ComboboxStatus,
	Dialog,
	DialogBody,
	DialogContent,
	DialogDescription,
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
	InputGroupTextarea,
	Kbd,
	LibraryBigIcon,
	MonitorIcon,
	SearchIcon,
	SegmentedControl,
	SegmentedControlItem,
	Select,
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
				<SelectSection />
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
				<Button size="xs">Extra small</Button>
				<Button size="lg">Large</Button>
			</PlaygroundRow>
			<PlaygroundRow label="Variants">
				<Button>Default</Button>
				<Button variant="primary">Primary</Button>
				<Button variant="soft">Soft</Button>
				<Button variant="ghost">Ghost</Button>
				<Button variant="outline">Outline</Button>
				<Button variant="destructive">Destructive</Button>
				<Button variant="link">Link</Button>
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
				<Button size="icon-lg" variant="primary" aria-label="Confirm">
					<CheckIcon />
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
			<PlaygroundRow label="Sizes">
				<InputGroup className="w-64">
					<InputGroupAddon>
						<SearchIcon className="text-base-400" />
					</InputGroupAddon>
					<InputGroupInput placeholder="Search components" />
					<InputGroupAddon align="inline-end">
						<InputGroupButton aria-label="Submit search">
							<CheckIcon className="size-3.5" />
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
				<InputGroup size="sm" className="w-56">
					<InputGroupAddon>
						<SearchIcon className="text-base-400" />
					</InputGroupAddon>
					<InputGroupInput placeholder="Search components" />
					<InputGroupAddon align="inline-end">
						<InputGroupButton aria-label="Submit search">
							<CheckIcon />
						</InputGroupButton>
					</InputGroupAddon>
				</InputGroup>
			</PlaygroundRow>
			<PlaygroundRow label="Examples">
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
			<PlaygroundRow label="Block Addons">
				<InputGroup className="w-72">
					<InputGroupAddon align="block-start">
						<InputGroupText>Prompt</InputGroupText>
					</InputGroupAddon>
					<InputGroupTextarea placeholder="Describe the change" rows={3} />
					<InputGroupAddon align="block-end">
						<Kbd size="sm">⌘↵</Kbd>
					</InputGroupAddon>
				</InputGroup>
				<InputGroup size="sm" className="w-64">
					<InputGroupAddon align="block-start">
						<InputGroupText>Note</InputGroupText>
					</InputGroupAddon>
					<InputGroupTextarea placeholder="Compact note" rows={2} />
				</InputGroup>
			</PlaygroundRow>
			<PlaygroundRow label="States">
				<InputGroup className="w-56">
					<InputGroupAddon>
						<XCircleIcon className="text-error" />
					</InputGroupAddon>
					<InputGroupInput aria-invalid defaultValue="Missing target" />
				</InputGroup>
				<InputGroup size="sm" className="w-52">
					<InputGroupInput disabled defaultValue="Disabled group" />
					<InputGroupAddon align="inline-end">
						<Kbd size="sm">⌥D</Kbd>
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

// MARK: - Select

const SelectSection: React.FC = () => {
	return (
		<PlaygroundGroup title="Select">
			<PlaygroundRow label="Sizes">
				<Select defaultValue="default" className="w-44">
					<option value="default">Default density</option>
					<option value="roomy">Roomy density</option>
					<option value="compact">Compact density</option>
				</Select>
				<Select size="sm" defaultValue="compact" className="w-40">
					<option value="default">Default density</option>
					<option value="compact">Compact density</option>
					<option value="sidebar">Sidebar density</option>
				</Select>
			</PlaygroundRow>
			<PlaygroundRow label="Variants">
				<Select defaultValue="system" className="w-40">
					<option value="system">System</option>
					<option value="light">Light</option>
					<option value="dark">Dark</option>
				</Select>
				<Select variant="ghost" defaultValue="today">
					<option value="today">Today</option>
					<option value="week">This week</option>
					<option value="month">This month</option>
				</Select>
				<Select variant="ghost" size="sm" defaultValue="small">
					<option value="small">Small</option>
					<option value="medium">Medium</option>
					<option value="large">Large</option>
				</Select>
			</PlaygroundRow>
			<PlaygroundRow label="States">
				<Select defaultValue="disabled" disabled className="w-40">
					<option value="disabled">Disabled</option>
				</Select>
				<Select defaultValue="missing" aria-invalid className="w-40">
					<option value="missing">Missing value</option>
					<option value="ready">Ready</option>
				</Select>
				<Select variant="ghost" defaultValue="invalid" aria-invalid>
					<option value="invalid">Invalid ghost</option>
					<option value="ready">Ready ghost</option>
				</Select>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Combobox

const ComboboxSection: React.FC = () => {
	const [value, setValue] = React.useState<string | null>(null);
	const [smallValue, setSmallValue] = React.useState<string | null>(null);
	const [chipValues, setChipValues] = React.useState<string[]>(['Design', 'Frontend']);
	const [smallChipValues, setSmallChipValues] = React.useState<string[]>(['Review']);

	const items = ['28px default', '32px roomy', '24px compact'] as const;
	const chipItems = ['Design', 'Frontend', 'Backend', 'Review', 'Polish', 'Docs'] as const;

	return (
		<PlaygroundGroup title="Combobox">
			<PlaygroundRow label="Sizes">
				<DensityCombobox
					items={items}
					value={value}
					onValueChange={setValue}
					placeholder="Default combobox"
				/>
				<DensityCombobox
					size="sm"
					items={items}
					value={smallValue}
					onValueChange={setSmallValue}
					placeholder="Small combobox"
					className="w-60"
				/>
			</PlaygroundRow>
			<PlaygroundRow label="Chips">
				<ChipCombobox
					items={chipItems}
					values={chipValues}
					onValuesChange={setChipValues}
					placeholder="Add areas"
				/>
				<ChipCombobox
					size="sm"
					items={chipItems}
					values={smallChipValues}
					onValuesChange={setSmallChipValues}
					placeholder="Add compact areas"
					className="w-64"
				/>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

const DensityCombobox: React.FC<TDensityComboboxProps> = (props) => {
	const { items, value, onValueChange, placeholder, size, className } = props;
	const anchorRef = useComboboxAnchor();

	return (
		<Combobox
			size={size}
			items={items}
			value={value}
			onValueChange={onValueChange}
			itemToStringValue={(item) => item ?? ''}
		>
			<ComboboxInput
				ref={anchorRef}
				className={cn('w-72', className)}
				leading={<SearchIcon className="text-base-400" />}
				placeholder={placeholder}
				showClear
			/>
			<ComboboxContent anchor={anchorRef}>
				<ComboboxStatus>Density presets</ComboboxStatus>
				<ComboboxList>
					<ComboboxGroup>
						<ComboboxLabel>Sizes</ComboboxLabel>
						{items.map((item) => (
							<ComboboxItem key={item} value={item}>
								{item}
							</ComboboxItem>
						))}
					</ComboboxGroup>
					<ComboboxSeparator />
					<ComboboxItem value="Match system density">Match system density</ComboboxItem>
					<ComboboxEmpty>No presets</ComboboxEmpty>
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
};

interface TDensityComboboxProps {
	items: readonly string[];
	value: string | null;
	onValueChange: (value: string | null) => void;
	placeholder: string;
	size?: 'default' | 'sm';
	className?: string;
}

const ChipCombobox: React.FC<TChipComboboxProps> = (props) => {
	const { items, values, onValuesChange, placeholder, size, className } = props;
	const anchorRef = useComboboxAnchor();

	return (
		<Combobox
			multiple
			size={size}
			items={items}
			value={values}
			onValueChange={onValuesChange}
			itemToStringValue={(item) => item ?? ''}
		>
			<ComboboxChips ref={anchorRef} className={cn('w-80', className)}>
				{values.map((value) => (
					<ComboboxChip key={value}>{value}</ComboboxChip>
				))}
				<ComboboxChipsInput placeholder={values.length > 0 ? '' : placeholder} />
			</ComboboxChips>
			<ComboboxContent anchor={anchorRef}>
				<ComboboxStatus>Areas</ComboboxStatus>
				<ComboboxList>
					<ComboboxGroup>
						<ComboboxLabel>Suggested</ComboboxLabel>
						{items.map((item) => (
							<ComboboxItem key={item} value={item}>
								{item}
							</ComboboxItem>
						))}
					</ComboboxGroup>
					<ComboboxEmpty>No areas</ComboboxEmpty>
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
};

interface TChipComboboxProps {
	items: readonly string[];
	values: string[];
	onValuesChange: (value: string[]) => void;
	placeholder: string;
	size?: 'default' | 'sm';
	className?: string;
}

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
				<Badge variant="success">Success</Badge>
				<Badge variant="warning">Warning</Badge>
				<Badge variant="destructive">Destructive</Badge>
				<Badge variant="outline">Outline</Badge>
				<Badge variant="ghost">Ghost</Badge>
				<Badge variant="link">Link</Badge>
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
				<Kbd size="sm">⌘K</Kbd>
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
				<IconBubble variant="neutral">
					<MonitorIcon />
				</IconBubble>
				<IconBubble size="sm" variant="neutral">
					<MonitorIcon />
				</IconBubble>
				<IconBubble size="xs" variant="neutral">
					<MonitorIcon />
				</IconBubble>
				<IconBubble size="lg" variant="neutral">
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
				<IconBubble size="sm" variant="destructive">
					<XCircleIcon />
				</IconBubble>
				<IconBubble size="sm" variant="neutral">
					<MonitorIcon />
				</IconBubble>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Tooltip

const TooltipSection: React.FC = () => {
	return (
		<PlaygroundGroup title="Tooltip">
			<PlaygroundRow label="Sizes">
				<Tooltip content="Open the command palette" shortcut="⌘K">
					<Button variant="soft">Hover me</Button>
				</Tooltip>
				<Tooltip size="sm" content="Compact help" shortcut="⌘?">
					<Button size="sm" variant="ghost">
						Help
					</Button>
				</Tooltip>
			</PlaygroundRow>
			<PlaygroundRow label="Placement">
				<Tooltip side="top" content="Appears above">
					<Button size="sm" variant="outline">
						Top
					</Button>
				</Tooltip>
				<Tooltip side="right" content="Appears to the right">
					<Button size="sm" variant="outline">
						Right
					</Button>
				</Tooltip>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Dialog

const DialogSection: React.FC = () => {
	const [isDefaultOpen, setIsDefaultOpen] = React.useState(false);
	const [isSmallOpen, setIsSmallOpen] = React.useState(false);

	return (
		<PlaygroundGroup title="Dialog">
			<PlaygroundRow label="Sizes">
				<Button variant="primary" onClick={() => setIsDefaultOpen(true)}>
					Default
				</Button>
				<Button size="sm" variant="primary" onClick={() => setIsSmallOpen(true)}>
					Small
				</Button>
				<Dialog open={isDefaultOpen} onOpenChange={setIsDefaultOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Playground Dialog</DialogTitle>
							<DialogDescription>Default spacing and typography.</DialogDescription>
						</DialogHeader>
						<DialogBody className="space-y-3">
							<p className="text-base-500 text-sm">
								Use this to compare button, body, and footer spacing against the rest of the desktop
								UI.
							</p>
							<Input placeholder="Dialog input" />
						</DialogBody>
						<DialogFooter>
							<Button onClick={() => setIsDefaultOpen(false)}>Cancel</Button>
							<Button variant="primary" onClick={() => setIsDefaultOpen(false)}>
								Done
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
				<Dialog size="sm" open={isSmallOpen} onOpenChange={setIsSmallOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Small Dialog</DialogTitle>
							<DialogDescription>Compact desktop spacing.</DialogDescription>
						</DialogHeader>
						<DialogBody className="space-y-2">
							<p className="text-base-500">
								Small dialogs keep controls readable while trimming padding.
							</p>
							<Input size="sm" placeholder="Dialog input" />
						</DialogBody>
						<DialogFooter>
							<Button size="sm" onClick={() => setIsSmallOpen(false)}>
								Cancel
							</Button>
							<Button size="sm" variant="primary" onClick={() => setIsSmallOpen(false)}>
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
			<PlaygroundRow label="Sizes" contentClassName="flex-col items-start">
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
	const { title, variant = 'default', children, className } = props;

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
	children: React.ReactNode;
	className?: string;
}

interface TPlaygroundRowProps {
	label: string;
	children: React.ReactNode;
	contentClassName?: string;
}
