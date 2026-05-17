import { type TFormFieldStatusValue, type TInvalidFormFieldError } from 'feature-form';

export function getFormFieldStatusErrors(
	status: TFormFieldStatusValue,
	path?: string,
	options: TGetFormFieldStatusErrorsOptions = {}
): TInvalidFormFieldError[] {
	if (status.type !== 'INVALID') {
		return [];
	}
	if (path == null) {
		return status.errors;
	}

	return status.errors.filter((error) => isMatchingFormFieldErrorPath(error, path, options));
}

export function getFirstFormFieldStatusError(
	status: TFormFieldStatusValue,
	path?: string,
	options?: TGetFormFieldStatusErrorsOptions
): TInvalidFormFieldError | undefined {
	return getFormFieldStatusErrors(status, path, options)[0];
}

function isMatchingFormFieldErrorPath(
	error: TInvalidFormFieldError,
	path: string,
	options: TGetFormFieldStatusErrorsOptions
): boolean {
	const { includeNested = false } = options;
	if (error.path === path) {
		return true;
	}
	if (!includeNested) {
		return false;
	}

	return error.path?.startsWith(`${path}.`) ?? false;
}

interface TGetFormFieldStatusErrorsOptions {
	includeNested?: boolean;
}
