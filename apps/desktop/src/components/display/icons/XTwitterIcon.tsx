import React from 'react';
import type { TIconProps } from './types';

export const XTwitterIcon: React.FC<TIconProps> = (props) => {
	const { ref, ...rest } = props;

	return (
		<svg
			ref={ref}
			fill="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
			{...rest}
		>
			<path d="M18.3263 2H21.6998L14.3297 10.4235L23 21.886H16.2112L10.894 14.934L4.80995 21.886H1.43443L9.31743 12.8761L1 2H7.96111L12.7674 8.35433L18.3263 2ZM17.1423 19.8668H19.0116L6.94539 3.91313H4.93946L17.1423 19.8668Z" />
		</svg>
	);
};
