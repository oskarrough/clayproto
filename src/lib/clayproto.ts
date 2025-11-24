/**
 * ClayProto - High-level SDK for ATProto
 *
 * An elegant, Rails-like API for building single-prompt apps on ATProto.
 * Wraps the low-level SDK with schema builders, validation, and relations.
 */

import {clayprotoSDK, type SchemaField} from './clayproto-sdk'

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// FIELD BUILDERS
// ============================================================================

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

// ============================================================================
// SCHEMA REGISTRY
// ============================================================================

/**
 * Internal registry of defined schemas
 */
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

// ============================================================================
// VALIDATION
// ============================================================================

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

/**
 * Converts a FieldBuilder to a SchemaField for the low-level SDK
 */
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

// ============================================================================
// CLAYPROTO CLASS
// ============================================================================

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

	/**
	 * Define a collection of schemas
	 */
	async defineSchemas(schemas: Record<string, SchemaBuilder>): Promise<Record<string, string>> {
		const rkeys: Record<string, string> = {}

		for (const [name, builder] of Object.entries(schemas)) {
			// Convert builder to SchemaDefinition
			const fields: SchemaField[] = Object.entries(builder).map(([fieldName, fieldBuilder]) =>
				fieldBuilderToSchemaField(fieldName, fieldBuilder)
			)

			const schemaDefinition = {
				name,
				description: `Schema for ${name}`,
				fields
			}

			// Create schema in PDS
			const {rkey} = await clayprotoSDK.createSchema(schemaDefinition)
			rkeys[name] = rkey

			// Register in local registry
			this.registry.register(name, builder, rkey)
		}

		return rkeys
	}

	/**
	 * Load existing schemas from PDS
	 */
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

	/**
	 * Create a new item
	 */
	async create(
		schemaName: string,
		data: Record<string, unknown>
	): Promise<{rkey: string; data: Record<string, unknown>}> {
		const schema = this.registry.get(schemaName)
		if (!schema) {
			throw new Error(`Schema "${schemaName}" not found. Did you call defineSchemas()?`)
		}

		// Apply defaults
		const finalData: Record<string, unknown> = {...data}
		for (const [fieldName, fieldBuilder] of Object.entries(schema.builder)) {
			if (finalData[fieldName] === undefined && fieldBuilder._config.default !== undefined) {
				finalData[fieldName] = fieldBuilder._config.default
			}
		}

		// Validate
		const validation = validate(schema.builder, finalData as Record<string, unknown>)
		if (!validation.valid) {
			throw new ValidationError('Validation failed', validation.errors)
		}

		// Create in PDS
		const {rkey, record} = await clayprotoSDK.createItem(
			schemaName,
			finalData as Record<string, unknown>
		)

		this.cache(schemaName).set(rkey, {...record.data, _rkey: rkey})
		return {rkey, data: finalData}
	}

	/**
	 * Get a single item by rkey
	 */
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

	/**
	 * Query items with filtering and ordering
	 */
	async query(
		schemaName: string,
		options: QueryOptions = {}
	): Promise<(Record<string, unknown> & {_rkey: string})[]> {
		const schema = this.registry.get(schemaName)
		if (!schema) {
			throw new Error(`Schema "${schemaName}" not found`)
		}

		// Fetch all items from PDS
		const items = await clayprotoSDK.listItems()

		// Filter by schema
		let results: Record<string, unknown>[] = items
			.filter((item) => item.item.schema === schemaName)
			.map((item) => ({...item.item.data, _rkey: item.rkey}))

		// Apply where clause
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

		// Apply ordering
		if (options.orderBy) {
			const [[field, direction]] = Object.entries(options.orderBy)
			results.sort((a, b) => {
				const aVal = a[field] as string | number
				const bVal = b[field] as string | number
				const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
				return direction === 'desc' ? -comparison : comparison
			})
		}

		// Apply limit
		if (options.limit) {
			results = results.slice(0, options.limit)
		}

		// Resolve relations
		const resolved = await Promise.all(
			results.map((item) => this.resolveRelations(schemaName, item, options.include))
		)

		return resolved as (Record<string, unknown> & {_rkey: string})[]
	}

	/**
	 * Update an item
	 */
	async update(
		schemaName: string,
		rkey: string,
		data: Record<string, unknown>
	): Promise<Record<string, unknown>> {
		const schema = this.registry.get(schemaName)
		if (!schema) {
			throw new Error(`Schema "${schemaName}" not found`)
		}

		// Get existing data
		const existing = await this.get(schemaName, rkey)
		if (!existing) {
			throw new Error(`Item not found: ${rkey}`)
		}

		// Merge with updates, stripping _rkey which was added during retrieval
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const {_rkey, ...existingData} = existing
		const updateData = {...existingData, ...data}

		// Validate
		const validation = validate(schema.builder, updateData as Record<string, unknown>)
		if (!validation.valid) {
			throw new ValidationError('Validation failed', validation.errors)
		}

		// Update in PDS
		await clayprotoSDK.updateItem(rkey, schemaName, updateData as Record<string, unknown>)

		this.cache(schemaName).set(rkey, {...updateData, _rkey: rkey})
		return updateData
	}

	async delete(schemaName: string, rkey: string): Promise<void> {
		await clayprotoSDK.deleteItem(rkey)
		this.cache(schemaName).delete(rkey)
	}

	/**
	 * Resolve references in an item
	 */
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

	/**
	 * List all defined schemas
	 */
	listSchemas() {
		return this.registry.all()
	}
}

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

export class ValidationError extends Error {
	constructor(
		message: string,
		public errors: FieldValidationError[]
	) {
		super(message)
		this.name = 'ValidationError'
	}
}

// ============================================================================
// EXPORTS
// ============================================================================

export const clay = {
	string,
	number,
	boolean,
	ref,
	array,
	validate
}

export {ClayProto as default}
