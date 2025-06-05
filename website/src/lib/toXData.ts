export const toXData = (map) => {
	const body = Object.entries(map)
		.map(([key, expr]) => `${key}: ${expr}`)
		.join(", ");

	return `{ ${body} }`;
};

export const storeValue = (value) => `$${value}`;

export const stringValue = (value) => `${value}`;
