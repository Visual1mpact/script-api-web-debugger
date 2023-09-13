type LogLevel = 'log' | 'warn' | 'info' | 'error'
type LogLevelOrUnknown = LogLevel | 'unknown'

/** Replaces property values in object A` that is in object `B` */
type Replace<A extends object, B> = Omit<A, keyof B> & B
/** Replaces property values in object A` by keys `K` to value `V` */
type ReplaceValue<A extends object, K extends keyof A, V> = Omit<A, K> & Record<K, V>

/** Makes some properties in the object readonly */
type ReadonlySome<O extends object, K extends keyof O> = Replace<O, Readonly<Pick<O, K>>>
/** Makes properties in the object modifiable */
type Mutable<O> = { -readonly [K in keyof O]: O[K] }
/** Makes some properties in the object modifiable */
type MutableSome<O extends object, K extends keyof O> = Replace<O, Mutable<Pick<O, K>>>

/** Adds an array as a possible value of the `T` */
type OrArray<T> = T | T[]
/** Adds a readonly array as a possible value of the `T` */
type OrReadonlyArray<T> = T | readonly T[]
/** Adds an iterable as a possible value of the `T` */
type OrIterable<T> = T | Iterable<T>

/** Record but readonly */
type ReadonlyRecord<K extends PropertyKey, V> = { readonly [X in K]: V }
/** Record but can be an interable of key-value pair of the object */
type RecordOrIterable<K extends PropertyKey, V> = Record<K, V> | Iterable<readonly [key: K, value: V]>
/** Readonly record but can be an interable of key-value pair of the object */
type ReadonlyRecordOrIterable<K extends PropertyKey, V> = ReadonlyRecord<K, V> | Iterable<readonly [key: K, value: V]>

/** Values of the object */
type Values<T> = T[keyof T]
