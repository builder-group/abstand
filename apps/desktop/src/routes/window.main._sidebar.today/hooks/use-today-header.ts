import React from 'react';

export function useTodayHeader(): TTodayHeader {
	const [header, setHeader] = React.useState(() => createTodayHeaderContent(new Date()));

	React.useEffect(() => {
		const intervalId = window.setInterval(() => {
			setHeader((currentHeader) => {
				const nextHeader = createTodayHeaderContent(new Date());
				if (
					currentHeader.title === nextHeader.title &&
					currentHeader.subtitle === nextHeader.subtitle &&
					currentHeader.collapsedTitle === nextHeader.collapsedTitle
				) {
					return currentHeader;
				}

				return nextHeader;
			});
		}, todayHeaderRefreshIntervalMs);

		return () => {
			window.clearInterval(intervalId);
		};
	}, []);

	return header;
}

const todayHeaderRefreshIntervalMs = 5 * 60_000;

interface TTodayHeader {
	title: string;
	subtitle: string;
	collapsedTitle: string;
}

function createTodayHeaderContent(date: Date): TTodayHeader {
	const dateLabel = new Intl.DateTimeFormat('en-US', {
		weekday: 'long',
		month: 'long',
		day: 'numeric'
	}).format(date);

	return {
		title: 'Welcome back.',
		subtitle: `It's ${dateLabel}.`,
		collapsedTitle: dateLabel
	};
}
