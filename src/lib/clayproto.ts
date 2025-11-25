// ClayProto - High-level SDK for ATProto
// Wraps the low-level SDK with schema builders, validation, and relations.

import {clayprotoSDK, type SchemaField} from './clayproto-sdk'

// Types

export interface FieldConfig {
	required?: boolean
	default?: unknown
	nullable?: boolean
}

export interface RefConfig extends FieldConfig {
	schema: string
}

export interface ArrayConfig extends FieldConfig {
	items: FieldBuilder
}

export type FieldBuilder = {
	_type: 'string' | 'number' | 'boolean' | 'ref' | 'array'
	_config: FieldConfig | RefConfig | ArrayConfig
}

export type SchemaBuilder = Record<string, FieldBuilder>

export interface FieldValidationError {
	field: string
	message: string
}

export interface ValidationResult {
	valid: boolean
	errors: FieldValidationError[]
}

export interface QueryOptions {
	where?: Record<string, unknown> | ((item: Record<string, unknown>) => boolean)
	orderBy?: {[key: string]: 'asc' | 'desc'}
	limit?: number
	include?: Record<string, boolean>
}

// Field builders

const field = (
	type: FieldBuilder['_type'],
	config: FieldConfig | RefConfig | ArrayConfig
): FieldBuilder => ({
	_type: type,
	_config: config
})

export const string = (config: FieldConfig = {}) => field('string', config)
export const number = (config: FieldConfig = {}) => field('number', config)
export const boolean = (config: FieldConfig = {}) => field('boolean', config)

export const ref = (schema: string, config: Omit<RefConfig, 'schema'> = {}) =>
	field('ref', {...config, schema} as RefConfig)

export const array = (items: FieldBuilder, config: Omit<ArrayConfig, 'items'> = {}) =>
	field('array', {...config, items} as ArrayConfig)

// Schema registry

class SchemaRegistry {
	private schemas: Map<string, {builder: SchemaBuilder; rkey?: string}> = new Map()

	register(name: string, builder: SchemaBuilder, rkey?: string) {
		this.schemas.set(name, {builder, rkey})
	}

	get(name: string) {
		return this.schemas.get(name)
	}

	has(name: string) {
		return this.schemas.has(name)
	}

	all() {
		return Array.from(this.schemas.entries()).map(([name, {builder, rkey}]) => ({
			name,
			builder,
			rkey
		}))
	}
}

// Validation

const typeChecks: Record<string, (v: unknown) => string | null> = {
	string: (v) => (typeof v === 'string' ? null : 'Must be a string'),
	number: (v) => (typeof v === 'number' ? null : 'Must be a number'),
	boolean: (v) => (typeof v === 'boolean' ? null : 'Must be a boolean'),
	ref: (v) => (typeof v === 'string' ? null : 'Reference must be a string (rkey)')
}

export function validate<S extends SchemaBuilder>(
	schemaBuilder: S,
	data: Record<string, unknown>
): ValidationResult {
	const errors: FieldValidationError[] = []

	for (const [fieldName, fieldBuilder] of Object.entries(schemaBuilder)) {
		const value = data[fieldName]
		const {required, nullable} = fieldBuilder._config

		if (required && value == null) {
			errors.push({field: fieldName, message: 'Required field'})
			continue
		}

		if (value == null && (nullable || !required)) continue

		if (fieldBuilder._type === 'array') {
			if (!Array.isArray(value)) {
				errors.push({field: fieldName, message: 'Must be an array'})
			} else {
				const arrayConfig = fieldBuilder._config as ArrayConfig
				value.forEach((item, i) => {
					const itemErrors = validate({item: arrayConfig.items}, {item})
					itemErrors.errors.forEach((e) =>
						errors.push({field: `${fieldName}[${i}]`, message: e.message})
					)
				})
			}
		} else {
			const check = typeChecks[fieldBuilder._type]
			const msg = check?.(value)
			if (msg) errors.push({field: fieldName, message: msg})
		}
	}

	return {valid: errors.length === 0, errors}
}

function fieldBuilderToSchemaField(name: string, builder: FieldBuilder): SchemaField {
	const field: SchemaField = {
		name,
		type: builder._type === 'ref' ? 'string' : builder._type,
		required: builder._config.required
	}

	if (builder._type === 'array') {
		const arrayConfig = builder._config as ArrayConfig
		field.type = 'array'
		field.items = arrayConfig.items._type
	}

	return field
}

export class ClayProto {
	private registry = new SchemaRegistry()
	private itemCache = new Map<string, Map<string, unknown>>()

	private cache(schema: string) {
		if (!this.itemCache.has(schema)) this.itemCache.set(schema, new Map())
		return this.itemCache.get(schema)!
	}

	get did() {
		return clayprotoSDK.did
	}

	async defineSchemas(schemas: Record<string, SchemaBuilder>): Promise<Record<string, string>> {
		const rkeys: Record<string, string> = {}

		for (const [name, builder] of Object.entries(schemas)) {
			const fields: SchemaField[] = Object.entries(builder).map(([fieldName, fieldBuilder]) =>
				fieldBuilderToSchemaField(fieldName, fieldBuilder)
			)

			const {rkey} = await clayprotoSDK.createSchema({
				name,
				fields
			})

			rkeys[name] = rkey
			this.registry.register(name, builder, rkey)
		}

		return rkeys
	}

	async loadSchemas() {
		const fieldBuilders: Record<string, (required?: boolean) => FieldBuilder> = {
			string: (r) => string({required: r}),
			number: (r) => number({required: r}),
			boolean: (r) => boolean({required: r}),
			array: (r) => array(string(), {required: r})
		}

		for (const {rkey, schema} of await clayprotoSDK.listSchemas()) {
			const builder: SchemaBuilder = {}
			for (const f of schema.fields) {
				builder[f.name] = fieldBuilders[f.type]?.(f.required) ?? string({required: f.required})
			}
			this.registry.register(schema.name, builder, rkey)
		}
	}

	async create(
		schemaName: string,
		data: Record<string, unknown>
	): Promise<{rkey: string; data: Record<string, unknown>}> {
		const schema = this.registry.get(schemaName)
		if (!schema) {
			throw new Error(`Schema "${schemaName}" not found. Did you call defineSchemas()?`)
		}

		const finalData: Record<string, unknown> = {...data}
		for (const [fieldName, fieldBuilder] of Object.entries(schema.builder)) {
			if (finalData[fieldName] === undefined && fieldBuilder._config.default !== undefined) {
				finalData[fieldName] = fieldBuilder._config.default
			}
		}

		const validation = validate(schema.builder, finalData as Record<string, unknown>)
		if (!validation.valid) {
			throw new ValidationError('Validation failed', validation.errors)
		}

		const {rkey, record} = await clayprotoSDK.createItem(
			schemaName,
			finalData as Record<string, unknown>
		)

		this.cache(schemaName).set(rkey, {...record.data, _rkey: rkey})
		return {rkey, data: finalData}
	}

	async get(
		schemaName: string,
		rkey: string,
		options: {include?: Record<string, boolean>} = {}
	): Promise<(Record<string, unknown> & {_rkey: string}) | null> {
		let data = this.cache(schemaName).get(rkey) as Record<string, unknown> | undefined

		if (!data) {
			try {
				const item = await clayprotoSDK.getItem(rkey)
				data = {...item.data, _rkey: rkey}
				this.cache(schemaName).set(rkey, data)
			} catch {
				return null
			}
		}

		return (await this.resolveRelations(schemaName, data, options.include)) as Record<
			string,
			unknown
		> & {_rkey: string}
	}

	async query(
		schemaName: string,
		options: QueryOptions = {}
	): Promise<(Record<string, unknown> & {_rkey: string})[]> {
		const schema = this.registry.get(schemaName)
		if (!schema) {
			throw new Error(`Schema "${schemaName}" not found`)
		}

		const items = await clayprotoSDK.listItems()

		let results: Record<string, unknown>[] = items
			.filter((item) => item.item.schema === schemaName)
			.map((item) => ({...item.item.data, _rkey: item.rkey}))

		if (options.where) {
			if (typeof options.where === 'function') {
				results = results.filter(options.where as (item: unknown) => boolean)
			} else {
				results = results.filter((item) => {
					return Object.entries(options.where as Record<string, unknown>).every(
						([key, value]) => item[key] === value
					)
				})
			}
		}

		if (options.orderBy) {
			const [[field, direction]] = Object.entries(options.orderBy)
			results.sort((a, b) => {
				const aVal = a[field] as string | number
				const bVal = b[field] as string | number
				const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
				return direction === 'desc' ? -comparison : comparison
			})
		}

		if (options.limit) {
			results = results.slice(0, options.limit)
		}

		const resolved = await Promise.all(
			results.map((item) => this.resolveRelations(schemaName, item, options.include))
		)

		return resolved as (Record<string, unknown> & {_rkey: string})[]
	}

	async update(
		schemaName: string,
		rkey: string,
		data: Record<string, unknown>
	): Promise<Record<string, unknown>> {
		const schema = this.registry.get(schemaName)
		if (!schema) {
			throw new Error(`Schema "${schemaName}" not found`)
		}

		const existing = await this.get(schemaName, rkey)
		if (!existing) {
			throw new Error(`Item not found: ${rkey}`)
		}

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const {_rkey: _, ...existingData} = existing
		const updateData = {...existingData, ...data}

		const validation = validate(schema.builder, updateData as Record<string, unknown>)
		if (!validation.valid) {
			throw new ValidationError('Validation failed', validation.errors)
		}

		await clayprotoSDK.updateItem(rkey, schemaName, updateData as Record<string, unknown>)

		this.cache(schemaName).set(rkey, {...updateData, _rkey: rkey})
		return updateData
	}

	async delete(schemaName: string, rkey: string): Promise<void> {
		await clayprotoSDK.deleteItem(rkey)
		this.cache(schemaName).delete(rkey)
	}

	private async resolveRelations(
		schemaName: string,
		item: Record<string, unknown>,
		include?: Record<string, boolean>
	): Promise<Record<string, unknown>> {
		if (!include) return item

		const schema = this.registry.get(schemaName)
		if (!schema) return item

		const resolved = {...item}

		for (const [fieldName, shouldInclude] of Object.entries(include)) {
			if (!shouldInclude) continue

			const fieldBuilder = schema.builder[fieldName]
			if (!fieldBuilder || fieldBuilder._type !== 'ref') continue

			const refConfig = fieldBuilder._config as RefConfig
			const rkey = item[fieldName]

			if (typeof rkey === 'string') {
				const refData = await this.get(refConfig.schema, rkey)
				if (refData) {
					resolved[fieldName] = refData
				}
			}
		}

		return resolved
	}

	listSchemas() {
		return this.registry.all()
	}
}

export class ValidationError extends Error {
	constructor(
		message: string,
		public errors: FieldValidationError[]
	) {
		super(message)
		this.name = 'ValidationError'
	}
}

export const clay = {
	string,
	number,
	boolean,
	ref,
	array,
	validate
}

export {ClayProto as default}
