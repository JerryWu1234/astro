import { AstroJSX, jsx } from '../jsx-runtime/index.js';
import { renderJSX } from '../runtime/server/jsx.js';

const slotName = (str: string) => str.trim().replace(/[-_]([a-z])/g, (_, w) => w.toUpperCase());

export async function check(
	Component: any,
	props: any,
	{ default: children = null, ...slotted } = {}
) {
	if (typeof Component !== 'function') return false;
	const slots: Record<string, any> = {};
	for (const [key, value] of Object.entries(slotted)) {
		const name = slotName(key);
		slots[name] = value;
	}
	try {
		const result = await Component({ ...props, ...slots, children });
		return result[AstroJSX];
	} catch (e) {
		const error = e as Error;
		// if the exception is from an mdx component
		// throw an error
		if (Component[Symbol.for('mdx-component')]) {
			throw createFormattedError({
				message: error.message,
				title: error.name,
				hint: `This issue often occurs when your MDX component encounters runtime errors.`,
				name: error.name,
				stack: error.stack,
			});
		}
	}
	return false;
}

export async function renderToStaticMarkup(
	this: any,
	Component: any,
	props = {},
	{ default: children = null, ...slotted } = {}
) {
	const slots: Record<string, any> = {};
	for (const [key, value] of Object.entries(slotted)) {
		const name = slotName(key);
		slots[name] = value;
	}

	const { result } = this;
	const html = await renderJSX(result, jsx(Component, { ...props, ...slots, children }));
	return { html };
}

type FormatErrorOptions = {
	message: string;
	name: string;
	stack?: string;
	hint: string;
	title: string;
};
// TODO: Remove this function and use `AstroError` when we refactor it to be usable without error codes
function createFormattedError({ message, name, stack, hint }: FormatErrorOptions) {
	const error = new Error(message);
	error.name = name;
	error.stack = stack;
	// @ts-expect-error - hint is not part of the Error interface but it will be picked up by the error overlay
	error.hint = hint;
	return error;
}

export default {
	check,
	renderToStaticMarkup,
};
