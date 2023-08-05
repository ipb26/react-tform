import { Lens, equals, identity, lens, lensProp, set, view } from "ramda"
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react"
import { defaultCompare, useCustomCompareEffect, useIsFirstMount } from "./util"

function descend<T, V>(parent: FormField<T, T>, lens: Lens<T, V>, path: (string | number)[]): FormGroup<V> {
    const sub = <N,>(lens: Lens<V, N>, path: (string | number)[]) => descend(data, lens, path ?? [])
    const data = {
        value: view(lens, parent.value),
        setValue: (value: V) => parent.setValue(set(lens, value, parent.value)),
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
    setValue: (value: W,) => void
    /**
     * Mark this field or form as blurred. Call in the onBlur attribute of input elements.
     */
    blur(): void
    /**
     * Mark this field or form as focused. Call in the onFocus attribute of input elements.
     */
    focus(): void
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
    //dispatch(...actions: FormAction<T>[]): void
    /**
     * Reinitialize this form. Clears all state, including errors and submission history.
     */
    initialize(value: T): void
    /**
     * Revert this form's data back to the last initialization data.
     */
    revert(): void
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

export type FormValidationResult = FormError[] | void
export type FormSubmitter<T> = (value: T) => FormValidationResult | Promise<FormValidationResult>
export type FormValidator<T> = (value: T) => FormValidationResult | Promise<FormValidationResult>

/**
 * An event type for the form.
 */
export type FormHook = "init" | "change" | "blur" | "focus"

/**
 * A map of event types to actions.
 */
export type FormHooks<T> = {
    [K in FormHook as `on${Capitalize<K>}`]?: FormAction<T>
}

/**
 * Form setup options.
 * @typeParam T The value type.
 */
export interface FormOptions<T> extends FormHooks<T> {
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

type FormAction<T> = (keyof FormActions) | ((actions: FormContext<T>) => void)

type FormInternalState<T> = {
    value: T
    errors?: FormError[]
    isValid?: boolean | undefined
    lastInitialized: Date
    lastBlurred?: Date | undefined
    lastFocused?: Date | undefined
    lastValidated?: Date | undefined
    lastChanged?: Date | undefined
    lastSubmitted?: Date | undefined
    initialValue: T
    submittedValue?: T | undefined
    exception?: unknown
    // blurAction?: FormAction | undefined
    // focusAction?: FormAction | undefined
}

/**
 * Generate a form.
 * @typeParam T The value type.
 * @param options Form options.
 * @returns A form context.
 */
export function useForm<T>(options: FormOptions<T>): FormContext<T> {

    const [state, setState] = useState<FormInternalState<T>>({
        initialValue: options.initialValue,
        lastInitialized: new Date(),
        value: options.initialValue,
        lastChanged: undefined,
    })
    //const [actions, setActions] = useState<FormAction<T>[]>([options.onInit].filter(isNotNil))

    const compare = options.customCompare ?? defaultCompare

    const { initialValue, value, errors, isValid, lastInitialized, lastFocused, lastBlurred, lastChanged, lastSubmitted, submittedValue, exception } = state

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
        setState(state => {
            return {
                ...state,
                initialValue: value,
                lastInitialized: new Date(),
                value,
                lastChanged: undefined,
            }
        })
        //dispatch(options.onInit)
    }, [])

    // Automatic reinitalization if initialValue prop changes.

    const firstMount = useIsFirstMount()
    useCustomCompareEffect(() => {
        if (firstMount) {
            return
        }
        initialize(options.initialValue)
    }, [
        options.initialValue
    ] as const, (a, b) => {
        return compare(a[0], b[0])
    })

    const [isValidating, setIsValidating] = useState(false)

    const validateWith = async (func: FormValidator<T>) => {
        setIsValidating(true)
        try {
            const errors = await func(value) ?? []
            const date = new Date()
            setState(state => {
                return {
                    ...state,
                    errors,
                    lastValidated: date,
                    isValid: errors.length === 0
                }
            })
        }
        catch (e) {
            setState(state => {
                return {
                    ...state,
                    exception: e
                }
            })
        }
        finally {
            setIsValidating(false)
        }
    }

    const validate = () => {
        if (options.validate !== undefined) {
            validateWith(options.validate)
        }
    }

    const [isSubmitting, setIsSubmitting] = useState(false)

    /**
     * TODO
     * so if you call dispatch within an async, it creates an inf loop
     * what happens is the state update from within the async function goes FIRST
     * it goes BEFORE the clearing of the old actions
     * @param event 
     * @returns 
     */
    const submit = async (event?: FormEvent<unknown>) => {
        event?.preventDefault()
        console.log("Submitting form...")
        try {
            if (options.submitValidate !== false || typeof options.submitValidate === "function") {
                const func = typeof options.submitValidate === "function" ? options.submitValidate : options.validate
                if (func !== undefined) {
                    await validateWith(func)
                }
            }
            setIsSubmitting(true)
            try {
                const submitErrors = await options.submit(value)
                if (submitErrors !== undefined && submitErrors.length > 0) {
                    setState(state => {
                        return {
                            ...state,
                            errors: submitErrors
                        }
                    })
                    return false
                }
                else {
                    const date = new Date()
                    setState(state => {
                        return {
                            ...state,
                            lastSubmitted: date,
                            submittedValue: value,
                        }
                    })
                    return true
                }
            }
            finally {
                setIsSubmitting(false)
            }
        }
        catch (e) {
            setState(state => {
                return {
                    ...state,
                    lastSubmitted: undefined,
                    submittedValue: undefined,
                    exception: e
                }
            })
            return false
        }
    }

    // Revert to the initial data.

    const revert = () => {
        initialize(options.initialValue)
    }

    // Form actions object.

    const dispatch = (...actions: (FormAction<T> | undefined)[]) => {
        /* setActions(oldActions => {
             return [...oldActions, ...actions.filter(isNotNil)]
         })*/
    }

    // Clear valid flag on data change.

    useEffect(() => {
        setState(state => {
            return {
                ...state,
                isValid: undefined,
            }
        })
    }, [
        value
    ])

    const group = {
        value,
        setValue: (value: T) => {
            const date = new Date()
            setState(state => {
                return {
                    ...state,
                    value,
                    lastChanged: date
                }
            })
            /*dispatch(options.onChange ?? (form => {
                form.validate()
            }))*/
        },
        errors: errors ?? [],
        setErrors: (errors: FormError[]) => {
            setState(state => {
                return {
                    ...state,
                    errors
                }
            })
        },
        blur: () => {
            const date = new Date()
            setState(state => {
                return {
                    ...state,
                    lastBlurred: date
                }
            })
            //dispatch(options.onBlur)
        },
        focus: () => {
            const date = new Date()
            setState(state => {
                return {
                    ...state,
                    lastFocused: date
                }
            })
            //dispatch(options.onFocus)
        }
    }

    const segment = descend(group, lens(identity, identity), [])

    const states = {
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

    const context = {
        initialize,
        // dispatch,
        submit,
        validate,
        revert,
        ...states,
        ...segment,
    }

    // Call all actions on the queue.

    const execute = (action: FormAction<T> | undefined) => {
        if (action === undefined) {
            return
        }
        if (typeof action === "string") {
            context[action]()
        }
        else {
            action(context)
        }
    }

    const actionOptions = {
        onChange: options.onChange ?? "validate",
        ...options,
    }
    const actions = [
        { key: "lastInitialized" as const, action: actionOptions.onInit },
        { key: "lastChanged" as const, action: actionOptions.onChange },
        { key: "lastFocused" as const, action: actionOptions.onFocus },
        { key: "lastBlurred" as const, action: actionOptions.onBlur }
    ]
    actions.forEach(item => {
        useEffect(() => {
            if (state[item.key] === undefined) {
                return
            }
            execute(item.action)
        }, [
            state[item.key]
        ])
    })

    if (state.exception !== undefined) {
        throw state.exception
    }

    return context

}
