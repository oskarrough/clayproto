/**
 * ClayProto - High-level SDK for ATProto
 *
 * An elegant, Rails-like API for building single-prompt apps on ATProto.
 * Wraps the low-level SDK with schema builders, validation, and relations.
 */

import { ClayprotoSDK, type SchemaDefinition, type SchemaField } from '../atproto/sdk'
import type { OAuthSession } from '@atproto/oauth-client-node'

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
	items: FieldBuilder<unknown>
}

export type FieldBuilder<T> = {
	_type: 'string' | 'number' | 'boolean' | 'ref' | 'array'
	_config: FieldConfig | RefConfig | ArrayConfig
	_infer?: T // For type inference
}

export type SchemaBuilder = Record<string, FieldBuilder<unknown>>

export type InferSchemaType<S extends SchemaBuilder> = {
	[K in keyof S]: S[K]['_infer']
}

export interface ValidationError {
	field: string
	message: string
}

export interface ValidationResult {
	valid: boolean
	errors: ValidationError[]
}

export interface QueryOptions<T = unknown> {
	where?: Partial<T> | ((item: T) => boolean)
	orderBy?: { [key: string]: 'asc' | 'desc' }
	limit?: number
	include?: Record<string, boolean>
}

// ============================================================================
// FIELD BUILDERS
// ============================================================================

/**
 * Creates a string field builder
 */
export function string(config: FieldConfig = {}): FieldBuilder<string | null> {
	return {
		_type: 'string',
		_config: config,
		_infer: undefined as unknown as string | null
	}
}

/**
 * Creates a number field builder
 */
export function number(config: FieldConfig = {}): FieldBuilder<number | null> {
	return {
		_type: 'number',
		_config: config,
		_infer: undefined as unknown as number | null
	}
}

/**
 * Creates a boolean field builder
 */
export function boolean(config: FieldConfig = {}): FieldBuilder<boolean | null> {
	return {
		_type: 'boolean',
		_config: config,
		_infer: undefined as unknown as boolean | null
	}
}

/**
 * Creates a reference field builder
 */
export function ref<T = unknown>(
	schema: string,
	config: Omit<RefConfig, 'schema'> = {}
): FieldBuilder<T | null> {
	return {
		_type: 'ref',
		_config: { ...config, schema },
		_infer: undefined as unknown as T | null
	}
}

/**
 * Creates an array field builder
 */
export function array<T>(
	items: FieldBuilder<T>,
	config: Omit<ArrayConfig, 'items'> = {}
): FieldBuilder<T[]> {
	return {
		_type: 'array',
		_config: { ...config, items },
		_infer: undefined as unknown as T[]
	}
}

// ============================================================================
// SCHEMA REGISTRY
// ============================================================================

/**
 * Internal registry of defined schemas
 */
class SchemaRegistry {
	private schemas: Map<string, { builder: SchemaBuilder; rkey?: string }> = new Map()

	register(name: string, builder: SchemaBuilder, rkey?: string) {
		this.schemas.set(name, { builder, rkey })
	}

	get(name: string) {
		return this.schemas.get(name)
	}

	has(name: string) {
		return this.schemas.has(name)
	}

	all() {
		return Array.from(this.schemas.entries()).map(([name, { builder, rkey }]) => ({
			name,
			builder,
			rkey
		}))
	}
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates data against a schema builder
 */
export function validate<S extends SchemaBuilder>(
	schemaBuilder: S,
	data: Record<string, unknown>
): ValidationResult {
	const errors: ValidationError[] = []

	for (const [fieldName, fieldBuilder] of Object.entries(schemaBuilder)) {
		const value = data[fieldName]
		const config = fieldBuilder._config

		// Check required
		if (config.required && (value === undefined || value === null)) {
			errors.push({
				field: fieldName,
				message: 'Required field'
			})
			continue
		}

		// Skip validation if value is null/undefined and field is nullable/optional
		if ((value === null || value === undefined) && (config.nullable || !config.required)) {
			continue
		}

		// Type validation
		switch (fieldBuilder._type) {
			case 'string':
				if (typeof value !== 'string') {
					errors.push({
						field: fieldName,
						message: 'Must be a string'
					})
				}
				break

			case 'number':
				if (typeof value !== 'number') {
					errors.push({
						field: fieldName,
						message: 'Must be a number'
					})
				}
				break

			case 'boolean':
				if (typeof value !== 'boolean') {
					errors.push({
						field: fieldName,
						message: 'Must be a boolean'
					})
				}
				break

			case 'ref':
				if (typeof value !== 'string') {
					errors.push({
						field: fieldName,
						message: 'Reference must be a string (rkey)'
					})
				}
				break

			case 'array':
				if (!Array.isArray(value)) {
					errors.push({
						field: fieldName,
						message: 'Must be an array'
					})
				} else {
					const arrayConfig = config as ArrayConfig
					// Validate each item
					value.forEach((item, index) => {
						const itemValidation = validate({ item: arrayConfig.items }, { item })
						itemValidation.errors.forEach((err) => {
							errors.push({
								field: `${fieldName}[${index}]`,
								message: err.message
							})
						})
					})
				}
				break
		}
	}

	return {
		valid: errors.length === 0,
		errors
	}
}

/**
 * Converts a FieldBuilder to a SchemaField for the low-level SDK
 */
function fieldBuilderToSchemaField(name: string, builder: FieldBuilder<unknown>): SchemaField {
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

/**
 * High-level ClayProto SDK
 */
export class ClayProto {
	private sdk: ClayprotoSDK
	private registry: SchemaRegistry = new SchemaRegistry()
	private itemCache: Map<string, Map<string, unknown>> = new Map()

	constructor(session: OAuthSession) {
		this.sdk = new ClayprotoSDK(session)
	}

	/**
	 * Get the user's DID
	 */
	get did() {
		return this.sdk.did
	}

	/**
	 * Define a collection of schemas
	 */
	async defineSchemas<T extends Record<string, SchemaBuilder>>(
		schemas: T
	): Promise<Record<keyof T, string>> {
		const rkeys: Record<string, string> = {}

		for (const [name, builder] of Object.entries(schemas)) {
			// Convert builder to SchemaDefinition
			const fields: SchemaField[] = Object.entries(builder).map(([fieldName, fieldBuilder]) =>
				fieldBuilderToSchemaField(fieldName, fieldBuilder)
			)

			const schemaDefinition = {
				nsid: `clay.user.${name}`,
				title: name.charAt(0).toUpperCase() + name.slice(1),
				description: `Schema for ${name}`,
				fields
			}

			// Create schema in PDS
			const { rkey } = await this.sdk.createSchema(schemaDefinition)
			rkeys[name] = rkey

			// Register in local registry
			this.registry.register(name, builder, rkey)
		}

		return rkeys as Record<keyof T, string>
	}

	/**
	 * Load existing schemas from PDS
	 */
	async loadSchemas() {
		const schemas = await this.sdk.listSchemas()

		for (const { rkey, schema } of schemas) {
			// Convert SchemaDefinition back to SchemaBuilder
			const builder: SchemaBuilder = {}

			for (const field of schema.fields) {
				switch (field.type) {
					case 'string':
						builder[field.name] = string({ required: field.required })
						break
					case 'number':
						builder[field.name] = number({ required: field.required })
						break
					case 'boolean':
						builder[field.name] = boolean({ required: field.required })
						break
					case 'array':
						// Simplified array handling - could be enhanced
						builder[field.name] = array(string(), { required: field.required })
						break
				}
			}

			// Extract schema name from NSID (clay.user.{name})
			const name = schema.nsid.split('.').pop() || schema.title.toLowerCase()
			this.registry.register(name, builder, rkey)
		}
	}

	/**
	 * Create a new item
	 */
	async create<S extends SchemaBuilder>(
		schemaName: string,
		data: Partial<InferSchemaType<S>>
	): Promise<{ rkey: string; data: InferSchemaType<S> }> {
		const schema = this.registry.get(schemaName)
		if (!schema) {
			throw new Error(`Schema "${schemaName}" not found. Did you call defineSchemas()?`)
		}

		// Apply defaults
		const finalData = { ...data }
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
		const { rkey, record } = await this.sdk.createItem(
			`clay.user.${schemaName}`,
			finalData as Record<string, unknown>
		)

		// Update cache
		if (!this.itemCache.has(schemaName)) {
			this.itemCache.set(schemaName, new Map())
		}
		this.itemCache.get(schemaName)!.set(rkey, { ...record.data, _rkey: rkey })

		return { rkey, data: finalData as InferSchemaType<S> }
	}

	/**
	 * Get a single item by rkey
	 */
	async get<S extends SchemaBuilder>(
		schemaName: string,
		rkey: string,
		options: { include?: Record<string, boolean> } = {}
	): Promise<(InferSchemaType<S> & { _rkey: string }) | null> {
		// Check cache first
		const cached = this.itemCache.get(schemaName)?.get(rkey)
		if (cached) {
			return this.resolveRelations(schemaName, cached, options.include) as InferSchemaType<S> & {
				_rkey: string
			}
		}

		// Fetch from PDS
		try {
			const item = await this.sdk.getItem(rkey)
			const data = { ...item.data, _rkey: rkey }

			// Update cache
			if (!this.itemCache.has(schemaName)) {
				this.itemCache.set(schemaName, new Map())
			}
			this.itemCache.get(schemaName)!.set(rkey, data)

			return this.resolveRelations(schemaName, data, options.include) as InferSchemaType<S> & {
				_rkey: string
			}
		} catch {
			return null
		}
	}

	/**
	 * Query items with filtering and ordering
	 */
	async query<S extends SchemaBuilder>(
		schemaName: string,
		options: QueryOptions<InferSchemaType<S>> = {}
	): Promise<(InferSchemaType<S> & { _rkey: string })[]> {
		const schema = this.registry.get(schemaName)
		if (!schema) {
			throw new Error(`Schema "${schemaName}" not found`)
		}

		// Fetch all items from PDS
		const items = await this.sdk.listItems()

		// Filter by schema type
		let results = items
			.filter((item) => item.item.schemaType === `clay.user.${schemaName}`)
			.map((item) => ({ ...item.item.data, _rkey: item.rkey }))

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
				const aVal = a[field]
				const bVal = b[field]
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

		return resolved as (InferSchemaType<S> & { _rkey: string })[]
	}

	/**
	 * Update an item
	 */
	async update<S extends SchemaBuilder>(
		schemaName: string,
		rkey: string,
		data: Partial<InferSchemaType<S>>
	): Promise<InferSchemaType<S>> {
		const schema = this.registry.get(schemaName)
		if (!schema) {
			throw new Error(`Schema "${schemaName}" not found`)
		}

		// Get existing data
		const existing = await this.get(schemaName, rkey)
		if (!existing) {
			throw new Error(`Item not found: ${rkey}`)
		}

		// Merge with updates
		const updated = { ...existing, ...data }

		// Remove internal fields
		delete updated._rkey

		// Validate
		const validation = validate(schema.builder, updated as Record<string, unknown>)
		if (!validation.valid) {
			throw new ValidationError('Validation failed', validation.errors)
		}

		// Update in PDS
		await this.sdk.updateItem(rkey, `clay.user.${schemaName}`, updated as Record<string, unknown>)

		// Update cache
		this.itemCache.get(schemaName)?.set(rkey, { ...updated, _rkey: rkey })

		return updated as InferSchemaType<S>
	}

	/**
	 * Delete an item
	 */
	async delete(schemaName: string, rkey: string): Promise<void> {
		await this.sdk.deleteItem(rkey)

		// Remove from cache
		this.itemCache.get(schemaName)?.delete(rkey)
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

		const resolved = { ...item }

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
		public errors: ValidationError[]
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

export { ClayProto as default }
