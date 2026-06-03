import React from 'react';

export function useTodayHeader(): TTodayHeader {
	const [header, setHeader] = React.useState(() => createTodayHeader(new Date()));

	React.useEffect(() => {
		const intervalId = window.setInterval(() => {
			setHeader((currentHeader) => {
				const nextHeader = createTodayHeader(new Date());
				if (
					currentHeader.todayLabel === nextHeader.todayLabel &&
					currentHeader.greeting === nextHeader.greeting
				) {
					return currentHeader;
				}

				return nextHeader;
			});
		}, todayHeaderRefreshMs);

		return () => {
			window.clearInterval(intervalId);
		};
	}, []);

	return header;
}

const todayHeaderRefreshMs = 5 * 60_000;

interface TTodayHeader {
	todayLabel: string;
	greeting: string;
}

function createTodayHeader(date: Date): TTodayHeader {
	return {
		todayLabel: new Intl.DateTimeFormat('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric'
		}).format(date),
		greeting: getTimeOfDayGreeting(date)
	};
}

function getTimeOfDayGreeting(date: Date): string {
	const hour = date.getHours();

	if (hour < 12) {
		return 'Good morning.';
	}
	if (hour < 18) {
		return 'Good afternoon.';
	}

	return 'Good evening.';
}
