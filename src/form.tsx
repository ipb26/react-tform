import { Lens, equals, identity, lens, lensProp, set, view } from "ramda"
import { FormEvent, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import { defaultCompare } from "./util"

function descend<T, V>(parent: FormField<T, T>, lens: Lens<T, V>, path: (string | number)[]): FormGroup<V> {
    const sub = <N,>(lens: Lens<V, N>, path: (string | number)[]) => descend(data, lens, path ?? [])
    const data = {
        value: view(lens, parent.value),
        setValue: (value: V, action?: FormAction) => parent.setValue(set(lens, value, parent.value), action),
        blur: parent.blur,
        focus: parent.focus,
        errors: parent.errors?.filter(_ => equals(_.path.slice(0, path.length), path)),
        setErrors: (errors: FormError[]) => parent.setErrors(errors.map(error => ({ ...error, path: [...path, ...error.path] }))),
    }
    return {
        ...data,
        lens: sub,
        prop: prop => sub(lensProp(prop), [prop]),
    }
}

/*
class FormField<V> implements FormFieldData<V> {

    readonly value
    readonly setValue
    readonly blur
    readonly focus
    readonly errors
    readonly state

    constructor(data: FormFieldData<V>) {
        this.value = data.value
        this.setValue = data.setValue
        this.blur = data.blur
        this.focus = data.focus
        this.errors = data.errors
        this.state = data.state
        this.lens = this.lens.bind(this)
        this.prop = this.prop.bind(this)
    }

    lens<N>(lens: Lens<V, N>, path: (string | number)[] = []) {
        return new FormFieldImpl<N>({
            state: this.state,
            value: view(lens, this.value),
            setValue: (value: N) => this.setValue(set(lens, value, this.value)),
            blur: this.blur,
            focus: this.focus,
            errors: this.errors?.filter(_ => equals(_.path.slice(0, path.length), path)),
        })
    }
    prop<K extends string & (keyof V)>(prop: K) {
        return this.lens(lensProp(prop), [prop])
    }

}
*/

/**
 * The root interface for accessing and changing form data. All fields and the root form are a descendant of this type.
 * The read and write types are separate in order to allow functions to accept more types of data than they will set.
 * @typeParam R The readable type.
 * @typeParam W The writable type.
 */
export interface FormField<R, W = R> {
    /**
     * This field or form's value.
     */
    value: R
    /**
     * Set this field or form's value.
     * @param value The value.
     */
    setValue: (value: W, action?: FormAction) => void
    /**
     * Mark this field or form as blurred. Call in the onBlur attribute of input elements.
     */
    blur(action?: FormAction): void
    /**
     * Mark this field or form as focused. Call in the onFocus attribute of input elements.
     */
    focus(action?: FormAction): void
    /**
     * A list of errors associated with this field or form.
     */
    errors: FormError[]
    /**
     * A list of errors associated with this field or form.
     */
    setErrors: (errors: FormError[]) => void
}

/**
 * A form field with accessor methods to generate subfield objects. Note that you can create subfields off of the root form, or off of another field using the same methods.
 * @typeParam T The value type.
 */
export interface FormGroup<T> extends FormField<T, T> {

    /**
     * Create a new field using a property of this field as it's value.
     * @typeParam K The subfield's key.
     * @param key Key
     */
    prop<K extends string & (keyof T)>(key: K): FormGroup<T[K]>

    /**
     * Create a new field using a custom lens.
     * @typeParam N The subfield's type.
     * @param key Key
     * @param path The path used for errors.
     */
    lens<N>(key: Lens<T, N>, path?: (string | number)[]): FormGroup<N>

}

/**
 * The state of a form.
 */
export interface FormState {
    /**
     * The last reinitialization timestamp.
     */
    lastInitialized?: Date | undefined
    /**
     * The last time any field in this form was focused.
     */
    lastFocused?: Date | undefined
    /**
     * The last time any field in this form was blurred.
     */
    lastBlurred?: Date | undefined
    /**
     * The last time any value in this form was changed. Note that this does not make an equality check. If data was set, even if it was the same, this timestamp is updated. For a flag that takes equality into account, use isDirty.
     */
    lastChanged?: Date | undefined
    /**
     * The last time this form was successfully submitted.
     */
    lastSubmitted?: Date | undefined
    /**
     * Has this form's data changed since last initialization. Performs a deep equality check by default. See customCompare option to override.
     */
    isDirty: boolean
    /**
     * Has this form's data changed since last submission. Performs a deep equality check by default. See customCompare option to override.
     */
    isDirtySinceSubmitted: boolean
    /**
     * Has this form ever been submitted.
     */
    hasBeenSubmitted: boolean
    /**
     * Has any field on this form been focused since last initialization.
     */
    hasBeenFocused: boolean
    /**
     * Has any field on this form been focused since last submission.
     */
    hasBeenFocusedSinceSubmitted: boolean
    /**
     * Has any field on this form been blurred since last initialization.
     */
    hasBeenBlurred: boolean
    /**
     * Has any field on this form been blurred since last submission.
     */
    hasBeenBlurredSinceSubmitted: boolean
    /**
     * Form is currently validating.
     */
    isValidating: boolean
    /**
     * Form is currently submitting.
     */
    isSubmitting: boolean
    /**
     * Does this form's data pass validation. Will be undefined if data was changed and not validated (ie if validateOnChange option is set to false).
     */
    isValid?: boolean | undefined
    /**
     * Are any of this form's fields currently focused. Determined by comparing lastBlurred to lastFocused timestamp.
     */
    isCurrentlyFocused: boolean
}

export interface FormActions {
    /**
     * Validate this form.
     */
    validate(): void
    /**
     * Submit this form. Returns a boolean for success or failure.
     */
    submit(event?: FormEvent<unknown>): Promise<boolean>
}

/**
 * A full form object, including state and mutation methods.
 * @typeParam T The value type.
 */
export interface FormContext<T> extends FormActions, FormState, FormGroup<T> {
    /**
     * Reinitialize this form. Clears all state, including errors and submission history.
     */
    initialize(value: T): void
    /**
     * Revert this form's data back to the last initialization data.
     */
    // revert(): void
    /**
     * Revert this form's data back to the last submitted data (or the initialization data, if never submitted).
     */
    // revertToSubmitted(): void
}

/**
 * Error object for a form field.
 */
export type FormError = {
    /**
     * The error message.
     */
    message: string
    /**
     * A path for an error. Strings represent properties, numbers represent array indexes.
     */
    path: (string | number)[]
}

export type FormValidationResult = Promise<FormError[] | void> | FormError[] | void
export type FormSubmitter<T> = (value: T) => FormValidationResult
export type FormValidator<T> = (value: T) => FormValidationResult

/**
 * An event type for the form.
 */
export type FormHook = "init" | "change" | "blur" | "focus"

/**
 * A map of event types to actions.
 */
export type FormHooks = {
    [K in FormHook as `on${Capitalize<K>}`]?: FormAction
}

/**
 * Form setup options.
 * @typeParam T The value type.
 */
export interface FormOptions<T> extends FormHooks {
    /**
     * Submission function for the form. If this throws an exception, it will be thrown within React. If you want to handle errors, make sure to return a FormError[].
     */
    submit: FormSubmitter<T>
    /**
     * Validation function for the form. Should return an array of errors (empty if validation is successful). If this throws an exception, it will be thrown within React. If you want to handle errors, make sure to return a FormError[].
     */
    validate?: FormValidator<T>
    /**
     * Whether or not to run a validation before submission. Default `true`. You can also pass a custom validation function.
     * @defaultValue `true`
     */
    submitValidate?: boolean | FormValidator<T>
    /**
     * The initial data for the form. Memoize this for performance benefits.
     */
    initialValue: T
    /**
     * Whether or not the form should update if the initialValue property changes (based on a deep comparison - or using the customCompare option).
     * @defaultValue `false`
     */
    autoReinitialize?: boolean
    /**
     * A custom comparison function for determining whether or not the data has changed (used for re-initialization as isDirty flag). The default strips out all nulls, undefined, empty arrays, empty objects, zeros, and blank strings before comparing.
     */
    customCompare?(values1: T, values2: T): boolean
}

type FormAction = "submit" | "validate" | ((actions: FormActions) => void)

type FormInternalState<T> = {
    value: T
    valueSource: "change" | "init"
    errors?: FormError[]
    isValid?: boolean | undefined
    lastInitialized: Date
    lastBlurred?: Date | undefined
    lastFocused?: Date | undefined
    lastChanged?: Date | undefined
    lastSubmitted?: Date | undefined
    initialValue: T
    submittedValue?: T | undefined
    exception?: unknown
    valueAction?: FormAction | undefined
    blurAction?: FormAction | undefined
    focusAction?: FormAction | undefined
}

/**
 * Generate a form.
 * @typeParam T The value type.
 * @param options Form options.
 * @returns A form context.
 */
export function useForm<T>(options: FormOptions<T>): FormContext<T> {

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

    //const validateOnInit = behaviors.validateOnInit ?? false
    // const validateOnChange = behaviors.validateOnChange ?? true
    // const validateOnBlur = behaviors.validateOnBlur ?? false

    //  const validateOnSubmit = behaviors.submitValidate ?? true
    const compare = options.customCompare ?? defaultCompare

    const { initialValue, value, valueSource, errors, isValid, lastInitialized, lastFocused, lastBlurred, lastChanged, lastSubmitted, submittedValue, exception } = internal

    const isDirty = useMemo(() => (lastChanged?.getTime() ?? 0) > lastInitialized.getTime() && !compare(value, initialValue), [value, initialValue, compare])
    const isDirtySinceSubmitted = useMemo(() => (lastChanged?.getTime() ?? 0) > (lastSubmitted?.getTime() ?? 0) && !compare(value, submittedValue ?? initialValue), [value, submittedValue ?? initialValue, compare])

    const isCurrentlyFocused = (lastFocused?.getTime() ?? 0) > (lastBlurred?.getTime() ?? 0)
    const hasBeenSubmitted = lastSubmitted !== undefined
    const hasBeenFocused = lastFocused !== undefined
    const hasBeenBlurred = lastBlurred !== undefined
    const hasBeenBlurredSinceSubmitted = (lastBlurred?.getTime() ?? 0) > (lastSubmitted?.getTime() ?? 0)
    const hasBeenFocusedSinceSubmitted = (lastFocused?.getTime() ?? 0) > (lastSubmitted?.getTime() ?? 0)

    // Initialization function. Can be called manually but generally won't be.

    const initialize = useCallback((value: T) => {
        console.log("Doing initialization...")
        updateInternal(() => {
            return {
                initialValue: value,
                lastInitialized: new Date(),
                value,
                valueSource: "init",
                lastChanged: undefined,
            }
        })
    }, [])

    // Automatic reinitalization if initialValue prop changes.

    const compareTo = useRef<T | undefined>(undefined)
    if (compareTo.current === undefined || !compare(options.initialValue, compareTo.current)) {
        compareTo.current = options.initialValue
    }

    const isFirst = useRef(true)

    useEffect(() => {
        if (!isFirst.current && options.autoReinitialize && !compare(options.initialValue, value)) {
            initialize(options.initialValue)
        }
    }, [
        compareTo.current
    ])

    if (isFirst.current) {
        isFirst.current = false
    }

    const [isValidating, setIsValidating] = useState(false)

    const validate = async () => {
        setIsValidating(true)
        try {
            const errors = await options.validate?.(value) ?? []
            updateInternal({
                errors,
                isValid: errors.length === 0
            })
        }
        catch (e) {
            updateInternal({
                exception: e
            })
        }
        finally {
            setIsValidating(false)
        }
    }

    const [isSubmitting, setIsSubmitting] = useState(false)

    const submit = async (event?: FormEvent<unknown>) => {
        event?.preventDefault()
        console.log("Submitting form...")
        try {
            if (options.submitValidate !== false || typeof options.submitValidate === "function") {
                const func = typeof options.submitValidate === "function" ? options.submitValidate : options.validate
                const errors = await (async () => {
                    setIsValidating(true)
                    try {
                        return await func?.(value) ?? []
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
            updateInternal({
                exception: e
            })
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

    // Form actions object.

    const actions = {
        submit,
        validate
    }
    const execute = (action: FormAction | undefined) => {
        if (action === undefined) {
            return
        }
        else if (action === "submit") {
            actions.submit()
        }
        else if (action === "validate") {
            actions.validate()
        }
        else {
            action(actions)
        }
    }

    // Call validate on field change if validateOnInit is true.

    useEffect(() => {
        if (internal.valueAction !== undefined) {
            execute(internal.valueAction)
        }
        else if (valueSource === "init") {
            execute(options.onInit)
        }
        else if (valueSource === "change") {
            execute(options.onChange ?? "validate")
        }
    }, [value])

    // Call validate on field blur if validateOnBlur is true.

    useEffect(() => {
        if (lastBlurred !== undefined) {
            execute(internal.blurAction ?? options.onBlur)
        }
    }, [lastBlurred])

    // Call validate on field focus if validateOnFocus is true.

    useEffect(() => {
        if (lastFocused !== undefined) {
            execute(internal.focusAction ?? options.onFocus)
        }
    }, [lastFocused])

    if (exception !== undefined) {
        throw exception
    }

    const state = {
        lastInitialized,
        lastFocused,
        lastBlurred,
        lastChanged,
        lastSubmitted,
        isDirty,
        isDirtySinceSubmitted,
        hasBeenSubmitted,
        hasBeenFocused,
        hasBeenBlurred,
        hasBeenBlurredSinceSubmitted,
        hasBeenFocusedSinceSubmitted,
        isValidating,
        isSubmitting,
        isValid,
        isCurrentlyFocused,
    }

    const group = {
        value,
        setValue: (value: T, valueAction?: FormAction) => {
            updateInternal({
                value,
                valueSource: "change",
                valueAction,
                lastChanged: new Date()
            })
        },
        errors: errors ?? [],
        setErrors: (errors: FormError[]) => updateInternal({ errors }),
        blur: (blurAction?: FormAction) => {
            updateInternal({
                lastBlurred: new Date(),
                blurAction
            })
        },
        focus: (focusAction?: FormAction) => {
            updateInternal({
                lastFocused: new Date(),
                focusAction
            })
        },
    }
    const segment = descend(group, lens(identity, identity), [])
    return {
        ...state,
        ...segment,
        ...actions,
        initialize,
        //revert: () => updateInternal({ value: initialValue, valueSource: "change", lastChanged: undefined }),
        //  revertToSubmitted: () => updateInternal({ value: submittedValue ?? initialValue, valueSource: "change", lastChanged: undefined }),
    }
}
