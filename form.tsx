import { pipe } from "fp-ts/function"
import { D } from "namespaces"
import { FormEvent, useCallback, useEffect, useMemo, useReducer, useState } from "react"
import { useErrorBoundary } from "react-error-boundary"
import { useUpdateEffect } from "react-use"
import { useCustomCompareConstant } from "state-hooks"

function defaultCompare(a: unknown, b: unknown) {
    return D.equals(cleanEmpty(a), cleanEmpty(b))
}
function cleanEmpty(value: unknown): unknown {
    const cleaned = typeof value === "object" && value !== null ? pipe(value, D.mapObjIndexed(cleanEmpty), D.reject(D.isEmpty)) : value
    if (!D.isEmpty(cleaned)) {
        return cleaned
    }
}
function buildSegment<T, V>(parent: FormField<T, T>, lens: D.Lens<T, V>, path: (string | number)[]): FormSegment<V> {
    const subLens = <N,>(lens: D.Lens<V, N>, path: (string | number)[]) => buildSegment(data, lens, path ?? [])
    const data = {
        state: parent.state,
        value: D.view(lens, parent.value),
        setValue: (value: V) => parent.setValue(D.set(lens, value, parent.value)),
        touch: parent.touch,
        focus: parent.focus,
        errors: parent.errors?.filter(_ => D.equals(_.path.slice(0, path.length), path)),
    }
    return {
        ...data,
        lens: subLens,
        prop: prop => subLens(D.lensProp(prop), [prop]),
    }
}

export interface FormField<V, W = V> {
    value: V
    setValue(value: W): void
    touch(): void
    focus(): void
    errors: FormError[]
    state: FormState
}

export interface FormSegment<R> extends FormField<R, R> {
    prop<K extends string & (keyof R)>(key: K): FormSegment<R[K]>
    lens<N>(key: D.Lens<R, N>, path?: (string | number)[]): FormSegment<N>
}

export interface FormState {
    lastInitialized: Date | undefined
    lastFocused: Date | undefined
    lastTouched: Date | undefined
    lastChanged: Date | undefined
    lastSubmitted: Date | undefined
    isDirty: boolean
    isDirtySinceSubmitted: boolean
    hasBeenFocused: boolean
    hasBeenFocusedSinceSubmitted: boolean
    hasBeenTouched: boolean
    hasBeenTouchedSinceSubmitted: boolean
    isCurrentlyFocused: boolean
    isValidating: boolean
    isSubmitting: boolean
    isValid: boolean | undefined
}

export interface FormContext<T> extends FormState, FormSegment<T> {
    initialValue: T
    validate(): void
    submit(event?: FormEvent<unknown>): Promise<boolean>
    initialize(value: T): void
    revert(): void
    revertToSubmitted(): void
}

export type FormError = {
    message: string
    path: (string | number)[]
}

type FormOptions<T> = {
    /**
     * The initial data for the form.
     */
    initialValue: T
    /**
     * Whether or not the form should update if the initialValue property changes (based on a deep comparison - or using the customCompare option).
     */
    autoReinitialize?: boolean
    /**
     * Submission function for the form.
     */
    submit(value: T): Promise<FormError[] | void> | FormError[] | void
    /**
     * Validation function for the form. Should return an array of errors (empty if validation is successful).
     */
    validate?(value: T): Promise<FormError[] | void> | FormError[] | void
    /**
     * Whether or not to run a validation on init.
     */
    validateOnInit?: boolean
    /**
     * Whether or not to run a validation on any change.
     */
    validateOnChange?: boolean
    /**
     * Whether or not to run a validation when a field is touched.
     */
    validateOnTouch?: boolean
    /**
     * A custom comparison function for determining whether or not the data has changed (used for re-initialization as isDirty flag). The default strips out all nulls, undefined, empty arrays, empty objects, zeros, and blank strings before comparing.
     */
    customCompare?(values1: T, values2: T): boolean
}

type FormInternalState<T> = {
    value: T
    valueSource: "change" | "init"
    errors?: FormError[]
    isValid?: boolean
    lastInitialized: Date
    lastFocused?: Date | undefined
    lastTouched?: Date | undefined
    lastChanged?: Date | undefined
    lastSubmitted?: Date | undefined
    initialValue: T
    submittedValue?: T
}

export function useForm<T>(options: FormOptions<T>): FormContext<T> {

    const errorBoundary = useErrorBoundary()
    const validateOnInit = options.validateOnInit ?? false
    const validateOnChange = options.validateOnChange ?? true
    const validateOnTouch = options.validateOnTouch ?? false
    const validateFunc = options.validate ?? (() => [])
    const compare = options.customCompare ?? defaultCompare

    const [internal, updateInternal] = useReducer((state: FormInternalState<T>, newState: Partial<FormInternalState<T>> | ((state: FormInternalState<T>) => FormInternalState<T>)) => {
        if (typeof newState === "function") {
            return newState(state)
        }
        else {
            return {
                ...state,
                ...newState,
            }
        }
    }, {
        value: options.initialValue,
        valueSource: "init",
        initialValue: options.initialValue,
        lastInitialized: new Date(),
    })

    const { initialValue, value, valueSource, errors, isValid, lastInitialized, lastFocused, lastTouched, lastChanged, lastSubmitted, submittedValue } = internal

    const setValue = (value: T) => updateInternal({ value, valueSource: "change", lastChanged: new Date() })
    const revert = () => updateInternal({ value: initialValue })
    const revertToSubmitted = () => updateInternal({ value: submittedValue ?? initialValue })
    // const changed = lastChanged !== undefined && lastChanged.getTime() > lastInitialized?.getTime()
    // const changedAfterSubmitted = lastChanged !== undefined && lastChanged.getTime() > (lastSubmitted?.getTime() ?? 0)

    const isDirty = useMemo(() => (lastChanged?.getTime() ?? 0) > lastInitialized.getTime() && !compare(value, initialValue), [value, lastChanged, lastInitialized, compare])
    const isDirtySinceSubmitted = useMemo(() => (lastChanged?.getTime() ?? 0) > (lastSubmitted?.getTime() ?? 0) && !compare(value, submittedValue ?? initialValue), [value, lastChanged, lastSubmitted, compare])

    const isCurrentlyFocused = (lastFocused?.getTime() ?? 0) > (lastTouched?.getTime() ?? 0)
    const hasBeenFocused = lastFocused !== undefined
    const hasBeenTouched = lastTouched !== undefined
    const hasBeenTouchedSinceSubmitted = (lastTouched?.getTime() ?? 0) > (lastSubmitted?.getTime() ?? 0)
    const hasBeenFocusedSinceSubmitted = (lastFocused?.getTime() ?? 0) > (lastSubmitted?.getTime() ?? 0)

    // Initialization function. Can be called manually but generally won't be.

    const initialize = useCallback((value: T) => {
        console.log("Doing initialization...")
        updateInternal(() => {
            return {
                initialValue: value,
                value,
                valueSource: "init",
                lastInitialized: new Date(),
            }
        })
    }, [])

    // Automatic reinitalization if initialValue prop changes.

    useUpdateEffect(() => {
        if (options.autoReinitialize && !compare(options.initialValue, value)) {
            initialize(options.initialValue)
        }
    }, [
        initialize,
        useCustomCompareConstant(options.initialValue, (a, b) => compare(a[0], b[0])),
        options.autoReinitialize
    ])

    const [isValidating, setIsValidating] = useState(false)

    const validate = useCallback(async () => {
        setIsValidating(true)
        try {
            const errors = await validateFunc(value) ?? []
            updateInternal({
                errors,
                isValid: errors.length === 0
            })
            return errors.length === 0
        }
        finally {
            setIsValidating(false)
        }
    }, [validateFunc])

    const [isSubmitting, setIsSubmitting] = useState(false)

    const submit = async (event?: FormEvent<unknown>) => {
        event?.preventDefault()
        console.log("Submitting form...")
        try {
            if (isValid !== true) {
                const errors = await (async () => {
                    setIsValidating(true)
                    try {
                        return await validateFunc(value) ?? []
                    }
                    finally {
                        setIsValidating(false)
                    }
                })()
                updateInternal({
                    errors,
                    isValid: errors.length === 0
                })
                if (errors.length > 0) {
                    return false
                }
            }
            setIsSubmitting(true)
            try {
                const submitErrors = await options.submit(value)
                if (submitErrors !== undefined && submitErrors.length > 0) {
                    updateInternal({
                        errors: submitErrors
                    })
                    return false
                }
                else {
                    updateInternal({
                        lastSubmitted: new Date(),
                        submittedValue: value,
                    })
                    return true
                }
            }
            finally {
                setIsSubmitting(false)
            }
        }
        catch (e) {
            errorBoundary.showBoundary(e)
            return false
        }
    }

    // If a value changes, set isValid to undefined, pending further validation.

    useEffect(() => {
        if (valueSource === "change") {
            updateInternal({
                isValid: undefined,
            })
        }
    }, [value])

    // Call validate on field change if validateOnChange is true.

    useEffect(() => {
        if (validateOnChange && valueSource === "change") {
            validate()
        }
    }, [value])

    // Call validate on field change if validateOnInit is true.

    useEffect(() => {
        if (validateOnInit && valueSource === "init") {
            validate()
        }
    }, [value])

    // Call validate on field touch if validateOnTouch is true.

    useEffect(() => {
        if (validateOnTouch && lastTouched !== undefined) {
            validate()
        }
    }, [lastTouched])

    const state = {
        lastInitialized,
        lastFocused,
        lastTouched,
        lastChanged,
        lastSubmitted,
        isDirty,
        isDirtySinceSubmitted,
        hasBeenFocused,
        hasBeenTouched,
        hasBeenTouchedSinceSubmitted,
        hasBeenFocusedSinceSubmitted,
        isValidating,
        isSubmitting,
        isValid,
        isCurrentlyFocused,
    }
    const segmentData = {
        state,
        value,
        setValue: setValue,
        errors: errors ?? [],
        touch: () => updateInternal({ lastTouched: new Date() }),
        focus: () => updateInternal({ lastFocused: new Date() }),
    }
    const segment = buildSegment(segmentData, D.lens(D.identity, D.identity), [])
    return {
        ...state,
        ...segment,
        initialValue,
        initialize,
        submit,
        validate,
        revert,
        revertToSubmitted,
    }
}
