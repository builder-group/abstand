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
	HelpCarousel,
	HelpPopover,
	HelpPopoverLink,
	IconBubble,
	Input,
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
	InputGroupStepper,
	InputGroupText,
	InputGroupTextarea,
	Kbd,
	LibraryBigIcon,
	MonitorIcon,
	MoonIcon,
	PanelLeftCloseIcon,
	PanelLeftOpenIcon,
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
	SearchIcon,
	SegmentedControl,
	SegmentedControlItem,
	Select,
	SettingsPage,
	Slider,
	SunIcon,
	Switch,
	Textarea,
	Toggle,
	ToggleGroup,
	ToggleGroupItem,
	Tooltip,
	useComboboxAnchor,
	useToastsCx,
	XCircleIcon
} from '@/components';
import { clampNumber, cn } from '@/lib';
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
			<ButtonSection />
			<InputSection />
			<InputGroupSection />
			<TextareaSection />
			<SwitchSection />
			<SliderSection />
			<ToggleSection />
			<ToggleGroupSection />
			<SegmentedControlSection />
			<SelectSection />
			<ComboboxSection />
			<BadgeSection />
			<KbdSection />
			<IconBubbleSection />
			<TooltipSection />
			<PopoverSection />
			<ToastSection />
			<HelpPopoverSection />
			<DialogSection />
			<SettingsSection />
		</SettingsPage>
	);
}

// MARK: - Button

const ButtonSection: React.FC = () => {
	return (
		<PlaygroundGroup title="Button">
			<PlaygroundRow label="Sizes">
				<Button>Default (sm)</Button>
				<Button size="md">Medium (md)</Button>
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
				<Button size="icon-xs" variant="outline" aria-label="Extra small icon">
					<XCircleIcon />
				</Button>
				<Button size="icon-sm" aria-label="Default icon">
					<SearchIcon />
				</Button>
				<Button size="icon-md" variant="primary" aria-label="Medium icon">
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
				<Input placeholder="Search files" className="w-44" />
				<Input size="md" placeholder="Search files" className="w-44" />
			</PlaygroundRow>
			<PlaygroundRow label="File">
				<Input type="file" className="w-56" />
				<Input type="file" size="md" className="w-60" />
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
	const [minutes, setMinutes] = React.useState(30);

	const handleMinutesChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const nextMinutes = Number(event.target.value);
		if (!Number.isFinite(nextMinutes)) {
			return;
		}

		setMinutes(clampNumber(nextMinutes, 0, 59));
	}, []);

	const handleIncrementMinutes = React.useCallback(() => {
		setMinutes((value) => clampNumber(value + 1, 0, 59));
	}, []);

	const handleDecrementMinutes = React.useCallback(() => {
		setMinutes((value) => clampNumber(value - 1, 0, 59));
	}, []);

	return (
		<PlaygroundGroup title="Input Group">
			<PlaygroundRow label="Sizes">
				<InputGroup className="w-56">
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
				<InputGroup size="md" className="w-64">
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
				<InputGroup className="w-56">
					<InputGroupAddon>
						<InputGroupText>https://</InputGroupText>
					</InputGroupAddon>
					<InputGroupInput placeholder="example.com" />
				</InputGroup>
				<InputGroup className="w-56">
					<InputGroupInput placeholder="Toggle sidebar" />
					<InputGroupAddon align="inline-end">
						<Kbd>⌘B</Kbd>
					</InputGroupAddon>
				</InputGroup>
				<InputGroup className="w-17">
					<InputGroupInput
						type="number"
						min={0}
						max={59}
						value={minutes}
						onChange={handleMinutesChange}
						aria-label="Minutes"
					/>
					<InputGroupAddon align="inline-end" className="pr-2 text-xs">
						M
					</InputGroupAddon>
					<InputGroupStepper
						onIncrement={handleIncrementMinutes}
						onDecrement={handleDecrementMinutes}
						incrementDisabled={minutes >= 59}
						decrementDisabled={minutes <= 0}
					/>
				</InputGroup>
			</PlaygroundRow>
			<PlaygroundRow label="Block Addons">
				<InputGroup className="w-72">
					<InputGroupAddon align="block-start">
						<InputGroupText>Prompt</InputGroupText>
					</InputGroupAddon>
					<InputGroupTextarea placeholder="Describe the change" rows={3} />
					<InputGroupAddon align="block-end">
						<Kbd>⌘↵</Kbd>
					</InputGroupAddon>
				</InputGroup>
				<InputGroup size="md" className="w-72">
					<InputGroupAddon align="block-start">
						<InputGroupText>Note</InputGroupText>
					</InputGroupAddon>
					<InputGroupTextarea placeholder="Roomy note" rows={2} />
				</InputGroup>
			</PlaygroundRow>
			<PlaygroundRow label="States">
				<InputGroup className="w-56">
					<InputGroupAddon>
						<XCircleIcon className="text-error" />
					</InputGroupAddon>
					<InputGroupInput aria-invalid defaultValue="Missing target" />
				</InputGroup>
				<InputGroup size="md" className="w-56">
					<InputGroupInput disabled defaultValue="Disabled group" />
					<InputGroupAddon align="inline-end">
						<Kbd size="md">⌥D</Kbd>
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
				<Textarea defaultValue="Quick note" className="w-60" />
				<Textarea size="md" defaultValue="Quick note" className="w-60" />
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
	const [mdValue, setMdValue] = React.useState(false);

	return (
		<PlaygroundGroup title="Switch">
			<PlaygroundRow label="Sizes">
				<Switch checked={defaultValue} onCheckedChange={setDefaultValue} />
				<Switch size="md" checked={mdValue} onCheckedChange={setMdValue} />
			</PlaygroundRow>
			<PlaygroundRow label="States">
				<Switch disabled />
				<Switch defaultChecked disabled />
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Slider

const SliderSection: React.FC = () => {
	const [defaultValue, setDefaultValue] = React.useState([50]);
	const [textSizeValue, setTextSizeValue] = React.useState([1]);

	const handleDefaultValueChange = React.useCallback((values: number | readonly number[]) => {
		setDefaultValue([getSliderValue(values, 50)]);
	}, []);

	const handleTextSizeValueChange = React.useCallback((values: number | readonly number[]) => {
		setTextSizeValue([getSliderValue(values, 1)]);
	}, []);

	return (
		<PlaygroundGroup title="Slider">
			<PlaygroundRow label="Default">
				<div className="flex w-56 items-center gap-3">
					<Slider value={defaultValue} onValueChange={handleDefaultValueChange} />
					<span className="text-base-400 w-8 text-right text-xs tabular-nums">
						{getSliderValue(defaultValue, 50)}
					</span>
				</div>
			</PlaygroundRow>
			<PlaygroundRow label="Ticks">
				<div className="flex w-64 items-center gap-2">
					<span className="text-base-400 w-3 text-center text-xs font-medium select-none">A</span>
					<Slider
						min={0.85}
						max={1.3}
						step={0.05}
						value={textSizeValue}
						onValueChange={handleTextSizeValueChange}
						showTicks
					/>
					<span className="text-base-400 w-4 text-center text-base leading-none font-medium select-none">
						A
					</span>
					<span className="text-base-400 w-10 text-right text-xs tabular-nums">
						{formatSliderScale(getSliderValue(textSizeValue, 1))}
					</span>
				</div>
			</PlaygroundRow>
			<PlaygroundRow label="States">
				<Slider defaultValue={[35]} className="w-56" disabled />
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Toggle

const ToggleSection: React.FC = () => {
	const [defaultValue, setDefaultValue] = React.useState(false);
	const [mdValue, setMdValue] = React.useState(true);
	const [outlineValue, setOutlineValue] = React.useState(false);
	const [iconValue, setIconValue] = React.useState(false);
	const [ghostValue, setGhostValue] = React.useState(true);

	return (
		<PlaygroundGroup title="Toggle">
			<PlaygroundRow label="Sizes">
				<Toggle pressed={defaultValue} onPressedChange={setDefaultValue}>
					Default (sm)
				</Toggle>
				<Toggle size="md" pressed={mdValue} onPressedChange={setMdValue}>
					Medium (md)
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
					size="icon-md"
					pressed={iconValue}
					onPressedChange={setIconValue}
					aria-label="Developer tools"
				>
					<CodeXmlIcon />
				</Toggle>
				<Toggle
					size="icon-sm"
					variant="ghost"
					pressed={ghostValue}
					onPressedChange={setGhostValue}
					aria-label={ghostValue ? 'Disable dark mode' : 'Enable dark mode'}
				>
					{ghostValue ? <MoonIcon /> : <SunIcon />}
				</Toggle>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Toggle Group

const ToggleGroupSection: React.FC = () => {
	const [viewValue, setViewValue] = React.useState(['preview']);
	const [mdViewValue, setMdViewValue] = React.useState(['preview']);
	const [defaultVariantValue, setDefaultVariantValue] = React.useState(['default']);
	const [ghostVariantValue, setGhostVariantValue] = React.useState(['theme']);
	const [sidebarVariantValue, setSidebarVariantValue] = React.useState(['sidebar']);
	const [outlineVariantValue, setOutlineVariantValue] = React.useState(['outline']);
	const [toolValues, setToolValues] = React.useState(['inspect', 'dark']);
	const [verticalValue, setVerticalValue] = React.useState(['local']);

	return (
		<PlaygroundGroup title="Toggle Group">
			<PlaygroundRow label="Sizes">
				<ToggleGroup value={viewValue} onValueChange={setViewValue}>
					<ToggleGroupItem value="preview">Default (sm)</ToggleGroupItem>
					<ToggleGroupItem value="code">Code</ToggleGroupItem>
					<ToggleGroupItem value="split">Split</ToggleGroupItem>
				</ToggleGroup>
				<ToggleGroup size="md" value={mdViewValue} onValueChange={setMdViewValue}>
					<ToggleGroupItem value="preview">Medium (md)</ToggleGroupItem>
					<ToggleGroupItem value="code">Code</ToggleGroupItem>
				</ToggleGroup>
			</PlaygroundRow>
			<PlaygroundRow label="Variants">
				<ToggleGroup value={defaultVariantValue} onValueChange={setDefaultVariantValue}>
					<ToggleGroupItem value="default">Default</ToggleGroupItem>
					<ToggleGroupItem value="preview">Preview</ToggleGroupItem>
				</ToggleGroup>
				<ToggleGroup variant="ghost" value={ghostVariantValue} onValueChange={setGhostVariantValue}>
					<ToggleGroupItem value="theme" aria-label="Toggle theme">
						{ghostVariantValue.includes('theme') ? <MoonIcon /> : <SunIcon />}
					</ToggleGroupItem>
				</ToggleGroup>
				<ToggleGroup
					variant="ghost"
					value={sidebarVariantValue}
					onValueChange={setSidebarVariantValue}
				>
					<ToggleGroupItem value="sidebar" aria-label="Toggle sidebar">
						{sidebarVariantValue.includes('sidebar') ? (
							<PanelLeftOpenIcon />
						) : (
							<PanelLeftCloseIcon />
						)}
					</ToggleGroupItem>
				</ToggleGroup>
				<ToggleGroup
					variant="outline"
					value={outlineVariantValue}
					onValueChange={setOutlineVariantValue}
				>
					<ToggleGroupItem value="outline">Outline</ToggleGroupItem>
					<ToggleGroupItem value="joined">Joined</ToggleGroupItem>
				</ToggleGroup>
			</PlaygroundRow>
			<PlaygroundRow label="Multiple">
				<ToggleGroup multiple value={toolValues} onValueChange={setToolValues} variant="outline">
					<ToggleGroupItem value="inspect">Inspect</ToggleGroupItem>
					<ToggleGroupItem value="console">Console</ToggleGroupItem>
					<ToggleGroupItem value="dark">
						<MoonIcon />
						Dark
					</ToggleGroupItem>
				</ToggleGroup>
			</PlaygroundRow>
			<PlaygroundRow label="Vertical">
				<ToggleGroup
					value={verticalValue}
					onValueChange={setVerticalValue}
					orientation="vertical"
					variant="outline"
				>
					<ToggleGroupItem value="local">Local</ToggleGroupItem>
					<ToggleGroupItem value="remote">Remote</ToggleGroupItem>
					<ToggleGroupItem value="both">Both</ToggleGroupItem>
				</ToggleGroup>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Segmented Control

const SegmentedControlSection: React.FC = () => {
	const [defaultValue, setDefaultValue] = React.useState('default');
	const [mdValue, setMdValue] = React.useState('medium');

	return (
		<PlaygroundGroup title="Segmented Control">
			<PlaygroundRow label="Sizes">
				<SegmentedControl value={defaultValue} onValueChange={setDefaultValue}>
					<SegmentedControlItem value="default">Default (sm)</SegmentedControlItem>
					<SegmentedControlItem value="compact">Compact</SegmentedControlItem>
				</SegmentedControl>
				<SegmentedControl value={mdValue} onValueChange={setMdValue} size="md">
					<SegmentedControlItem value="medium">Medium (md)</SegmentedControlItem>
					<SegmentedControlItem value="roomy">Roomy label</SegmentedControlItem>
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
					<option value="default">Default (sm) density</option>
					<option value="roomy">Roomy density</option>
					<option value="compact">Compact density</option>
				</Select>
				<Select size="md" defaultValue="roomy" className="w-44">
					<option value="default">Default (sm) density</option>
					<option value="roomy">Medium (md) density</option>
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
				<Select variant="ghost" size="md" defaultValue="medium">
					<option value="default">Default (sm)</option>
					<option value="medium">Medium (md)</option>
					<option value="roomy">Roomy</option>
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
	const [mdValue, setMdValue] = React.useState<string | null>(null);
	const [chipValues, setChipValues] = React.useState<string[]>(['Design', 'Frontend']);
	const [mdChipValues, setMdChipValues] = React.useState<string[]>(['Review']);

	const items = ['Sidebar density', 'Document density', 'Roomy density'] as const;
	const chipItems = ['Design', 'Frontend', 'Backend', 'Review', 'Polish', 'Docs'] as const;

	return (
		<PlaygroundGroup title="Combobox">
			<PlaygroundRow label="Sizes">
				<DensityCombobox
					items={items}
					value={value}
					onValueChange={setValue}
					placeholder="Choose density"
				/>
				<DensityCombobox
					size="md"
					items={items}
					value={mdValue}
					onValueChange={setMdValue}
					placeholder="Choose density"
					className="w-72"
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
					size="md"
					items={chipItems}
					values={mdChipValues}
					onValuesChange={setMdChipValues}
					placeholder="Add areas"
					className="w-80"
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
	size?: 'sm' | 'md';
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
	size?: 'sm' | 'md';
	className?: string;
}

// MARK: - Badge

const BadgeSection: React.FC = () => {
	return (
		<PlaygroundGroup title="Badge">
			<PlaygroundRow label="Sizes">
				<Badge size="xs">Extra small (xs)</Badge>
				<Badge>Default (sm)</Badge>
				<Badge size="md">Medium (md)</Badge>
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
				<Kbd size="md">⌘⇧K</Kbd>
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
				<IconBubble variant="neutral">
					<MonitorIcon />
				</IconBubble>
				<IconBubble size="md" variant="neutral">
					<MonitorIcon />
				</IconBubble>
			</PlaygroundRow>
			<PlaygroundRow label="Variants">
				<IconBubble>
					<MonitorIcon />
				</IconBubble>
				<IconBubble variant="secondary">
					<CodeXmlIcon />
				</IconBubble>
				<IconBubble variant="success">
					<CheckIcon />
				</IconBubble>
				<IconBubble variant="warning">
					<CircleQuestionMarkIcon />
				</IconBubble>
				<IconBubble variant="destructive">
					<XCircleIcon />
				</IconBubble>
				<IconBubble variant="neutral">
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
					<Button variant="soft">Default (sm)</Button>
				</Tooltip>
				<Tooltip size="md" content="Roomy help" shortcut="⌘?">
					<Button size="md" variant="ghost">
						Medium (md)
					</Button>
				</Tooltip>
			</PlaygroundRow>
			<PlaygroundRow label="Placement">
				<Tooltip side="top" content="Appears above">
					<Button variant="outline">Top</Button>
				</Tooltip>
				<Tooltip side="right" content="Appears to the right">
					<Button variant="outline">Right</Button>
				</Tooltip>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Popover

const PopoverSection: React.FC = () => {
	return (
		<PlaygroundGroup title="Popover">
			<PlaygroundRow label="Content">
				<Popover>
					<PopoverTrigger render={<Button variant="soft" />}>Display options</PopoverTrigger>
					<PopoverContent>
						<PopoverHeader>
							<PopoverTitle>Display</PopoverTitle>
							<PopoverDescription>Adjust how the current view is shown.</PopoverDescription>
						</PopoverHeader>
						<div className="-mx-1 flex flex-col gap-0.5">
							<div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5">
								<div className="flex flex-col gap-0.5">
									<span className="text-base-950 text-sm font-medium">Show previews</span>
									<span className="text-base-500 text-xs">Include compact thumbnails.</span>
								</div>
								<Switch defaultChecked aria-label="Show previews" />
							</div>
							<div className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5">
								<div className="flex flex-col gap-0.5">
									<span className="text-base-950 text-sm font-medium">Density</span>
									<span className="text-base-500 text-xs">Choose row spacing.</span>
								</div>
								<Select variant="ghost" defaultValue="comfortable" aria-label="Density">
									<option value="compact">Compact</option>
									<option value="comfortable">Comfortable</option>
									<option value="spacious">Spacious</option>
								</Select>
							</div>
						</div>
					</PopoverContent>
				</Popover>
			</PlaygroundRow>
			<PlaygroundRow label="Placement">
				<Popover>
					<PopoverTrigger render={<Button variant="outline" />}>Top</PopoverTrigger>
					<PopoverContent side="top" className="w-56">
						<PopoverHeader>
							<PopoverTitle>Top placement</PopoverTitle>
							<PopoverDescription>
								Use when the trigger sits near the lower edge.
							</PopoverDescription>
						</PopoverHeader>
					</PopoverContent>
				</Popover>
				<Popover>
					<PopoverTrigger render={<Button variant="outline" />}>Right</PopoverTrigger>
					<PopoverContent side="right" align="start" className="w-56">
						<PopoverHeader>
							<PopoverTitle>Right placement</PopoverTitle>
							<PopoverDescription>Use next to compact inline controls.</PopoverDescription>
						</PopoverHeader>
					</PopoverContent>
				</Popover>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Toast

const ToastSection: React.FC = () => {
	const toastsCx = useToastsCx();

	function showDefaultToast() {
		toastsCx.add({
			title: 'Sidebar updated',
			description: 'Density is now set to compact for this window.'
		});
	}

	function showSuccessToast() {
		toastsCx.add({
			type: 'success',
			title: 'Block saved',
			description: 'The focus block is ready to run.'
		});
	}

	function showWarningToast() {
		toastsCx.add({
			type: 'warning',
			title: 'Screen access needed',
			description: 'Grant screen recording permission before starting a block.',
			timeout: 0
		});
	}

	function showDestructiveToast() {
		toastsCx.add({
			type: 'destructive',
			title: 'Sync failed',
			description: 'The latest changes could not be uploaded.',
			priority: 'high'
		});
	}

	function showActionToast() {
		toastsCx.add({
			title: 'Block archived',
			description: 'The block was removed from Today.',
			timeout: 0,
			actionProps: {
				children: 'Undo',
				onClick: () => {
					toastsCx.add({
						type: 'success',
						title: 'Block restored',
						description: 'The archived block is back in Today.'
					});
				}
			}
		});
	}

	async function showPromiseToast() {
		await toastsCx.promise(new Promise<void>((resolve) => window.setTimeout(resolve, 1100)), {
			loading: {
				type: 'info',
				title: 'Syncing changes',
				description: 'Uploading the latest desktop state.'
			},
			success: {
				type: 'success',
				title: 'Sync complete',
				description: 'Everything is up to date.'
			},
			error: {
				type: 'destructive',
				title: 'Sync failed',
				description: 'Please try again.'
			}
		});
	}

	return (
		<PlaygroundGroup title="Toast">
			<PlaygroundRow label="Variants">
				<Button variant="outline" onClick={showDefaultToast}>
					Default
				</Button>
				<Button variant="outline" onClick={showSuccessToast}>
					Success
				</Button>
				<Button variant="outline" onClick={showWarningToast}>
					Warning
				</Button>
				<Button variant="outline" onClick={showDestructiveToast}>
					Destructive
				</Button>
			</PlaygroundRow>
			<PlaygroundRow label="Behavior">
				<Button variant="soft" onClick={showActionToast}>
					With action
				</Button>
				<Button variant="soft" onClick={() => void showPromiseToast()}>
					Promise flow
				</Button>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Help Popover

const HelpPopoverSection: React.FC = () => {
	return (
		<PlaygroundGroup title="Help Popover">
			<PlaygroundRow label="Sizes">
				<div className="flex items-center gap-0.5">
					<span className="text-base-950 text-sm">Status refresh</span>
					<HelpPopover description="The displayed status can lag briefly while the app waits for the next sync." />
				</div>
				<div className="flex items-center gap-0.5">
					<span className="text-base-950 text-sm">Status refresh</span>
					<HelpPopover
						size="md"
						description="The displayed status can lag briefly while the app waits for the next sync."
					/>
				</div>
			</PlaygroundRow>
			<PlaygroundRow label="Placement">
				<div className="flex items-center gap-0.5">
					<span className="text-base-950 text-sm">Top</span>
					<HelpPopover side="top" description="Appears above the trigger." />
				</div>
				<div className="flex items-center gap-0.5">
					<span className="text-base-950 text-sm">Bottom</span>
					<HelpPopover side="bottom" description="Appears below the trigger." />
				</div>
				<div className="flex items-center gap-0.5">
					<span className="text-base-950 text-sm">Right</span>
					<HelpPopover side="right" description="Appears to the right of the trigger." />
				</div>
			</PlaygroundRow>
			<PlaygroundRow label="Carousel">
				<div className="flex items-center gap-0.5">
					<span className="text-base-950 text-sm">Processing mode</span>
					<HelpPopover ariaLabel="About processing modes">
						<HelpCarousel
							items={[
								{
									title: 'Processing mode',
									description: (
										<>
											Choose how tasks are handled.{' '}
											<span className="text-base-400">Use arrows to compare options.</span>
										</>
									)
								},
								{
									title: 'Automatic',
									titlePrefix: 'Processing mode',
									description: 'Best behavior chosen for you automatically.',
									titleSuffix: (
										<Badge variant="success" size="xs">
											Selected
										</Badge>
									)
								},
								{
									title: 'Manual',
									titlePrefix: 'Processing mode',
									description: 'You review each step before it runs.'
								}
							]}
						/>
					</HelpPopover>
				</div>
				<div className="flex items-center gap-0.5">
					<span className="text-base-950 text-sm">With action</span>
					<HelpPopover ariaLabel="About processing modes">
						<HelpCarousel
							action={<HelpPopoverLink href="#">Learn more</HelpPopoverLink>}
							items={[
								{ title: 'Processing mode', description: 'Choose how tasks are handled.' },
								{
									title: 'Automatic',
									titlePrefix: 'Processing mode',
									description: 'Best behavior chosen for you automatically.'
								},
								{
									title: 'Manual',
									titlePrefix: 'Processing mode',
									description: 'You review each step before it runs.'
								}
							]}
						/>
					</HelpPopover>
				</div>
			</PlaygroundRow>
		</PlaygroundGroup>
	);
};

// MARK: - Dialog

const DialogSection: React.FC = () => {
	const [isDefaultOpen, setIsDefaultOpen] = React.useState(false);
	const [isMdOpen, setIsMdOpen] = React.useState(false);

	return (
		<PlaygroundGroup title="Dialog">
			<PlaygroundRow label="Sizes">
				<Button variant="primary" onClick={() => setIsDefaultOpen(true)}>
					Default (sm)
				</Button>
				<Button size="md" variant="primary" onClick={() => setIsMdOpen(true)}>
					Medium (md)
				</Button>
				<Dialog open={isDefaultOpen} onOpenChange={setIsDefaultOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Playground Dialog</DialogTitle>
							<DialogDescription>Default (sm) spacing and typography.</DialogDescription>
						</DialogHeader>
						<DialogBody className="space-y-3">
							<p className="text-base-500">
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
				<Dialog size="md" open={isMdOpen} onOpenChange={setIsMdOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Medium Dialog</DialogTitle>
							<DialogDescription>Medium (md) spacing and typography.</DialogDescription>
						</DialogHeader>
						<DialogBody className="space-y-2">
							<p className="text-base-500">
								Medium dialogs give dense workflows a little more breathing room.
							</p>
							<Input size="md" placeholder="Dialog input" />
						</DialogBody>
						<DialogFooter>
							<Button size="md" onClick={() => setIsMdOpen(false)}>
								Cancel
							</Button>
							<Button size="md" variant="primary" onClick={() => setIsMdOpen(false)}>
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
	const [mdTheme, setMdTheme] = React.useState('system');
	const [defaultDeveloperEnabled, setDefaultDeveloperEnabled] = React.useState(true);
	const [mdDeveloperEnabled, setMdDeveloperEnabled] = React.useState(false);
	const [colorProfile, setColorProfile] = React.useState('40c1r');
	const [refreshRate, setRefreshRate] = React.useState('100');
	const [highDynamicRange, setHighDynamicRange] = React.useState(false);
	const [rotation, setRotation] = React.useState('standard');
	const [tvBehavior, setTvBehavior] = React.useState('ask');

	const handleColorProfileChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			setColorProfile(event.target.value);
		},
		[]
	);

	const handleRefreshRateChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			setRefreshRate(event.target.value);
		},
		[]
	);

	const handleRotationChange = React.useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
		setRotation(event.target.value);
	}, []);

	const handleTvBehaviorChange = React.useCallback(
		(event: React.ChangeEvent<HTMLSelectElement>) => {
			setTvBehavior(event.target.value);
		},
		[]
	);

	return (
		<PlaygroundGroup title="Settings Group and Row" variant="outline">
			<PlaygroundRow label="Sizes" contentClassName="flex-col items-start">
				<SettingsGroup title="Appearance">
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
				<SettingsGroup title="Appearance" size="md">
					<SettingsRow size="md" label="Theme" description="Choose a display mode.">
						<SegmentedControl value={mdTheme} onValueChange={setMdTheme} size="md">
							<SegmentedControlItem value="system">System</SegmentedControlItem>
							<SegmentedControlItem value="light">Light</SegmentedControlItem>
							<SegmentedControlItem value="dark">Dark</SegmentedControlItem>
						</SegmentedControl>
					</SettingsRow>
					<SettingsRow size="md" label="Developer" description="Enable internal tools.">
						<Switch
							size="md"
							checked={mdDeveloperEnabled}
							onCheckedChange={setMdDeveloperEnabled}
						/>
					</SettingsRow>
				</SettingsGroup>
			</PlaygroundRow>
			<PlaygroundRow
				label="Native showcase"
				contentClassName="flex-col items-start gap-2.5 max-w-[460px]"
			>
				<SettingsGroup>
					<SettingsRow label="Color profile" variant="compact">
						<Select variant="ghost" value={colorProfile} onChange={handleColorProfileChange}>
							<option value="40c1r">40C1R</option>
							<option value="display-p3">Display P3</option>
							<option value="srgb">sRGB</option>
						</Select>
					</SettingsRow>
				</SettingsGroup>
				<SettingsGroup>
					<SettingsRow label="Refresh rate" variant="compact">
						<Select variant="ghost" value={refreshRate} onChange={handleRefreshRateChange}>
							<option value="100">100 Hertz</option>
							<option value="60">60 Hertz</option>
							<option value="120">120 Hertz</option>
						</Select>
					</SettingsRow>
					<SettingsRow
						label="High Dynamic Range"
						description="Automatically adjust the display to show high dynamic range content."
						className="items-start"
					>
						<Switch checked={highDynamicRange} onCheckedChange={setHighDynamicRange} />
					</SettingsRow>
				</SettingsGroup>
				<SettingsGroup>
					<SettingsRow label="Rotation" variant="compact">
						<Select variant="ghost" value={rotation} onChange={handleRotationChange}>
							<option value="standard">Standard</option>
							<option value="90">90 Degrees</option>
							<option value="180">180 Degrees</option>
							<option value="270">270 Degrees</option>
						</Select>
					</SettingsRow>
				</SettingsGroup>
				<SettingsGroup>
					<SettingsRow
						label="When connected to TV"
						description="Choose what to show or use the TV as a secondary display."
						className="items-start"
					>
						<Select variant="ghost" value={tvBehavior} onChange={handleTvBehaviorChange}>
							<option value="ask">Ask What to Show</option>
							<option value="mirror">Mirror Display</option>
							<option value="extend">Extend Display</option>
						</Select>
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
		<SettingsGroup
			title={title}
			className={className}
			contentClassName={playgroundGroupVariants({ variant })}
		>
			{children}
		</SettingsGroup>
	);
};

interface TPlaygroundGroupProps extends VariantProps<typeof playgroundGroupVariants> {
	title: string;
	children: React.ReactNode;
	className?: string;
}

const playgroundGroupVariants = cva('', {
	variants: {
		variant: {
			default: '',
			outline: 'border-base-100 bg-base-0 border'
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

interface TPlaygroundRowProps {
	label: string;
	children: React.ReactNode;
	contentClassName?: string;
}

const formatSliderScale = (value: number) => `${Math.round(value * 100)}%`;

const getSliderValue = (values: number | readonly number[], fallback: number) => {
	return Array.isArray(values) ? (values[0] ?? fallback) : values;
};
