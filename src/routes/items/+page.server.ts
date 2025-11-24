import {ClayProto} from '$lib/clayproto'
import {redirect} from '@sveltejs/kit'
import type {PageServerLoad} from './$types'

export const load: PageServerLoad = async ({locals}) => {
	if (!locals.session) {
		throw redirect(302, '/')
	}

	const cp = new ClayProto(locals.session)
	await cp.loadSchemas()

	const schemas = cp.listSchemas()
	const items = []

	for (const {name} of schemas) {
		const schemaItems = await cp.query(name, {})
		for (const item of schemaItems) {
			items.push({
				schema: name,
				data: item
			})
		}
	}

	return {items, schemas}
}
