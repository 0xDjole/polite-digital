export { default as errors } from "./errors";
import { z } from "zod";
import { type Result, Ok, Err } from "ts-results-es";
import errorCodes from "./errorCodes";

export type ServerError = {
	error: string;
	reason: string;
	code: string;
	statusCode: number;
	validationErrors: {
		field: string;
		code: string;
	}[];
};

export type ValidationError = {
	field: string;
	message: string;
};

export type RequestError = {
	validationErrors: ValidationError[];
};

export type ValidationResult<T> = Result<T, RequestError>;

export type ZodSchema = z.ZodObject<any>;

export const transformErrors = (zodError: z.ZodError): ValidationError[] => {
	const customErrors = [];

	zodError.issues.forEach((issue) => {
		const field = issue.path.join(".");
		const message = issue.message;

		if (
			!customErrors.some(
				(customError) => customError.field === field && customError.message === message,
			)
		) {
			customErrors.push({ field, message });
		}
	});

	return customErrors;
};

export const validateData = <T>(
	schema: ZodSchema<T>,
	data: any,
	field?: string,
): ValidationResult<T> => {
	const zodSchema = field ? schema.pick({ [field]: true }) : schema;

	try {
		const parsedData = zodSchema.parse(data);
		return Ok(parsedData);
	} catch (e) {
		if (e instanceof z.ZodError) {
			return Err({ validationErrors: transformErrors(e) });
		}
		return Err({
			validationErrors: [],
		});
	}
};

export const convertServerErrorToRequestError = (
	serverError: ServerError,
	renameRules?: { [key: string]: string },
): RequestError => {
	return {
		...serverError,
		validationErrors: serverError.validationErrors.map((validationError) => {
			const field =
				renameRules && renameRules[validationError.field]
					? renameRules[validationError.field]
					: validationError.field;

			return {
				field: field,
				message: errorCodes[validationError.code] || "Unknown error",
			};
		}),
	};
};
