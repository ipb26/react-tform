import { either, equals, isEmpty, isNil, mapObjIndexed, reject } from "ramda"
import { DependencyList, EffectCallback, useEffect, useMemo, useRef, useState } from "react"

/**
 * Deep compare two objects.
 * @param a Object 1.
 * @param b Object 2.
 * @returns Whether the objects are equal.
 */
export function defaultCompare(a: unknown, b: unknown) {
    return equals(cleanEmpty(a), cleanEmpty(b))
}

/**
 * Recursively remove all empty (null, undefined, [], "", 0) values from a value.
 * @param value Value
 * @returns A cleaned value.
 */
export function cleanEmpty(value: unknown): unknown {
    const cleaned = typeof value === "object" && value !== null ? reject(either(isEmpty, isNil), mapObjIndexed(cleanEmpty, value)) : value
    if (!isEmpty(cleaned)) {
        return cleaned
    }
}

export function useIsFirstMount() {
    const isFirst = useRef(true)
    if (isFirst.current) {
        isFirst.current = false
        return true
    }
    return isFirst.current
}

export function useCustomCompareEffect<TDeps extends DependencyList>(effect: EffectCallback, deps: TDeps, depsEqual: (prevDeps: TDeps, nextDeps: TDeps) => boolean = (a, b) => equals(a, b)) {
    const ref = useRef<TDeps | undefined>(undefined)
    if (ref.current === undefined || !depsEqual(deps, ref.current)) {
        ref.current = deps
    }
    return useEffect(effect, ref.current)
}

export function useArray<T>(initialValue: T[] = []) {
    const [value, setValue] = useState(initialValue)
    const shift = () => {
        const first = value.at(0)
        setValue(value.slice(1))
        return first
    }
    const shifts = (count = 1) => {
        const first = value.slice(0, count)
        setValue(value.slice(count))
        return first
    }
    const append = (...append: T[]) => {
        setValue(value => [...value, ...append])
    }
    const prepend = (...prepend: T[]) => {
        setValue(value => [...prepend, ...value])
    }
    const pop = () => {
        const last = value.at(-1)
        setValue(value.slice(0, -1))
        return last
    }
    const pops = (count = 1) => {
        const last = value.slice(-1 * count)
        setValue(value.slice(0, -1 * count))
        return last
    }
    const clear = () => {
        setValue([])
    }
    return useMemo(() => {
        return {
            value,
            setValue,
            append,
            prepend,
            pop,
            pops,
            shift,
            shifts,
            clear
        }
    }, [
        value
    ])
}
