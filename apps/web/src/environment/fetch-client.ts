import {
	cacheFeature,
	createApiFetchClient,
	retryFeature,
	type TApiFeature,
	type TCacheFeature,
	type TFetchClient,
	type TRetryFeature
} from 'feature-fetch';

export const fetchClient: TFetchClient<[TApiFeature, TCacheFeature, TRetryFeature]> =
	createApiFetchClient().with(
		cacheFeature({ maxAgeMs: 10 * 60 * 1000 }),
		retryFeature({ maxRetries: 3 })
	);
