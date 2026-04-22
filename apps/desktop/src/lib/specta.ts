import { Err, Ok, type TResult } from 'tuple-result';
import { specta } from '@/environment';

export function toTuple<T, E>(result: specta.Result<T, E>): TResult<T, E> {
	if (result.status === 'ok') {
		return Ok(result.data);
	}
	return Err(result.error);
}
