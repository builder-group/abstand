import { type specta } from '@/environment';

export type TBlockIntention = Omit<specta.Intention, 'behavior'> & {
	behavior: Extract<specta.IntentionBehavior, { type: 'block' }>;
};
