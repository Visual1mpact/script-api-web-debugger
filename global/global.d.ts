type LogLevel = 'log' | 'warn' | 'info' | 'error'
type LogLevelOrUnknown = 'log' | 'warn' | 'info' | 'error' | 'unknown'

type Replace<A extends object, B extends object> = Omit<A, keyof B> & B
type ReplaceValue<A extends object, K extends keyof A, B> = Omit<A, K> & Record<K, B>
type RequiredSome<O, K extends keyof O> = O & { [X in K]-?: O[X] }
type ArrayOrReadonly<T> = T[] | readonly T[] | []
