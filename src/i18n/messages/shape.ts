/** Same key structure as `T`, every leaf a string — the type every non-English catalogue must satisfy. */
export type Shape<T> = { readonly [K in keyof T]: T[K] extends string ? string : Shape<T[K]> };
