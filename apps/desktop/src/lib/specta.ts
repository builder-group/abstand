import { Err, Ok, type TResult } from 'tuple-result';

export function toTuple<T, E>(result: TSpectaResult<T, E>): TResult<T, E> {
	if (result.status === 'ok') {
		return Ok(result.data);
	}
	return Err(result.error);
}

type TSpectaResult<T, E> = { status: 'ok'; data: T } | { status: 'error'; error: E };
