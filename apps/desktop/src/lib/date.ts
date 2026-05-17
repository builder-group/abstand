import { type specta } from '@/environment';

// MARK: - Date

export function getLocalDateEpochDays(date: Date): specta.DateOnly {
	return datePartsToEpochDays(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export function getCurrentDateEpochDays(): specta.DateOnly {
	return getLocalDateEpochDays(new Date());
}

export function getLocalDateTime(
	dateEpochDays: specta.DateOnly,
	timeOfDayMs: specta.TimeOnly
): Date {
	const date = new Date(dateEpochDays * msPerDay);
	const hours = Math.floor(timeOfDayMs / msPerHour);
	const minutes = Math.floor((timeOfDayMs % msPerHour) / msPerMinute);
	const seconds = Math.floor((timeOfDayMs % msPerMinute) / msPerSecond);
	const milliseconds = timeOfDayMs % msPerSecond;

	return new Date(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		date.getUTCDate(),
		hours,
		minutes,
		seconds,
		milliseconds
	);
}

export function isDateEpochDays(value: number): boolean {
	return Number.isInteger(value) && value >= minDateEpochDays && value <= maxDateEpochDays;
}

export function parseDateInput(value: string): specta.DateOnly | null {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (match == null) {
		return null;
	}

	return datePartsToEpochDaysOrNull(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function formatDateInput(dateEpochDays: specta.DateOnly): string {
	const date = new Date(dateEpochDays * msPerDay);
	const year = String(date.getUTCFullYear()).padStart(4, '0');
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

function datePartsToEpochDays(year: number, month: number, day: number): specta.DateOnly {
	const dateEpochDays = datePartsToEpochDaysOrNull(year, month, day);
	if (dateEpochDays == null) {
		throw new Error(`Invalid date: ${year}-${month}-${day}`);
	}

	return dateEpochDays;
}

function datePartsToEpochDaysOrNull(
	year: number,
	month: number,
	day: number
): specta.DateOnly | null {
	if (year < 1 || year > 9999) {
		return null;
	}

	const date = new Date(0);
	date.setUTCFullYear(year, month - 1, day);

	// Detects overflows like Feb 30 that Date silently normalizes to a different date
	const isValidDate =
		date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
	if (!isValidDate) {
		return null;
	}

	const dateEpochDays = Math.floor(date.getTime() / msPerDay);
	return isDateEpochDays(dateEpochDays) ? dateEpochDays : null;
}

// MARK: - Time

export function getLocalTimeOfDayMs(date: Date): specta.TimeOnly {
	return timePartsToTimeOfDayMs(
		date.getHours(),
		date.getMinutes(),
		date.getSeconds(),
		date.getMilliseconds()
	);
}

export function isTimeOfDayMs(value: number): boolean {
	return Number.isInteger(value) && value >= 0 && value < msPerDay;
}

export function timeOnlyFromMs(value: number): specta.TimeOnly {
	if (!isTimeOfDayMs(value)) {
		throw new Error(`Invalid time of day milliseconds: ${value}`);
	}

	return value;
}

export function parseTimeInput(value: string): specta.TimeOnly | null {
	const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.(\d{1,3}))?)?$/.exec(value);
	if (match == null) {
		return null;
	}

	const seconds = match[3] == null ? 0 : Number(match[3]);
	const milliseconds = match[4] == null ? 0 : Number(match[4].padEnd(3, '0'));
	return timePartsToTimeOfDayMs(Number(match[1]), Number(match[2]), seconds, milliseconds);
}

export function formatTimeInput(timeOfDayMs: specta.TimeOnly): string {
	const totalSeconds = Math.floor(timeOfDayMs / msPerSecond);
	const hours = Math.floor(totalSeconds / secondsPerHour);
	const minutes = Math.floor((totalSeconds % secondsPerHour) / secondsPerMinute);

	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function addTimeOfDayMs(timeOfDayMs: specta.TimeOnly, deltaMs: number): specta.TimeOnly {
	return normalizeTimeOfDayMs(timeOfDayMs + deltaMs);
}

export function minutesToMs(minutes: number): number {
	return minutes * msPerMinute;
}

function timePartsToTimeOfDayMs(
	hours: number,
	minutes: number,
	seconds: number,
	milliseconds: number
): specta.TimeOnly {
	return hours * msPerHour + minutes * msPerMinute + seconds * msPerSecond + milliseconds;
}

function normalizeTimeOfDayMs(timeOfDayMs: number): specta.TimeOnly {
	return ((Math.trunc(timeOfDayMs) % msPerDay) + msPerDay) % msPerDay;
}

// MARK: - Weekday mask

export function isWeekdayMask(value: number): value is specta.WeekdayMask {
	return Number.isInteger(value) && value >= minWeekdayMask && value <= maxWeekdayMask;
}

export function isWeekday(value: string): value is TWeekday {
	return weekdayValues.includes(value as TWeekday);
}

export function weekdayMaskFromWeekdays(weekdays: readonly TWeekday[]): specta.WeekdayMask {
	let mask = 0;
	for (const weekday of weekdays) {
		mask |= getWeekdayMaskBit(weekday);
	}

	if (!isWeekdayMask(mask)) {
		throw new Error(`Invalid weekday mask: ${mask}`);
	}

	return mask;
}

export function weekdaysFromWeekdayMask(weekdaysMask: specta.WeekdayMask): TWeekday[] {
	return weekdayValues.filter((weekday) => {
		return (weekdaysMask & getWeekdayMaskBit(weekday)) !== 0;
	});
}

function getWeekdayMaskBit(weekday: TWeekday): number {
	return 1 << weekdayValues.indexOf(weekday);
}

// MARK: - Constants

const secondsPerMinute = 60;
const secondsPerHour = 60 * secondsPerMinute;

const msPerSecond = 1_000;
const msPerMinute = secondsPerMinute * msPerSecond;
const msPerHour = secondsPerHour * msPerSecond;
const msPerDay = 24 * msPerHour;

const minDateEpochDays = -719162; // 0001-01-01
const maxDateEpochDays = 2932896; // 9999-12-31

const minWeekdayMask = 1;
const maxWeekdayMask = 0b111_1111;
// Order defines bit positions: index 0 = Mon (bit 0) .. index 6 = Sun (bit 6)
const weekdayValues = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

export type TWeekday = (typeof weekdayValues)[number];
