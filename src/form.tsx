import { Mutex } from "async-mutex"
import { FormEvent, useEffect, useMemo } from "react"
import { ValueOrFactory, callOrGet } from "value-or-factory"
import { FormField, FormFieldImpl } from "./field"
import { FORM_HOOK_KEYS, useFormHook } from "./hooks"
import { FormError, FormOptions } from "./options"
import { FormState, initialFormState, useFormState } from "./state"

//TODO merge schedule and submit?

/**
 * A full form object, including state and mutation methods.
 * @typeParam T The value type.
 */
export interface FormContext<T> extends FormState<T>, FormField<T> {

    /**
     * Validate this form.
     */
    validate: () => void

    /**
     * Submit this form. Returns a boolean for success or failure.
     */
    submit: (event?: FormEvent<unknown> | undefined) => void

    /**
     * Validate this form.
     */
    scheduleValidate: () => void

    /**
     * Submit this form.
     */
    scheduleSubmit: () => void

    /**
     * Reinitialize this form. Clears all state, including errors and submission history.
     */
    initialize: (value: T) => void

    /**
     * Reinitialize this form using its initialValue option. Clears all state, including errors and submission history.
     */
    reinitialize: () => void

    /**
     * Set the form's errors.
     */
    setErrors(errors: ValueOrFactory<readonly FormError[], [readonly FormError[]]>): void

    /**
     * An onKeyUp handler for non-form root elements.
     */
    keyHandler?: ((event: React.KeyboardEvent<HTMLElement>) => void) | undefined

}

/**
 * Generate a form.
 * @typeParam T The value type.
 * @param options Form options.
 * @returns A form context.
 */
export function useForm<T>(initialOptions: FormOptions<T>): FormContext<T> {

    // Build options and state.

    const options = { ...initialOptions, on: { validateRequested: ["validate"], submitRequested: ["submit"], change: ["validate"], ...initialOptions.on } } satisfies FormOptions<T>
    const state = useFormState<T>(options)
    const mutex = useMemo(() => new Mutex(), [])

    // Initialization function. Can be called manually but generally won't be.

    const initialize = (value: T) => state.set(initialFormState(value))
    const reinitialize = () => initialize(state.value.initialValue)

    const disabled = options.disabled ?? false
    const throwErrorIfDisabled = () => {
        if (disabled) {
            state.patch({ exception: new Error("Can not submit a form that is disabled.") })
        }
    }

    // Validate function.

    //TODO what happens if we change a value while validating? it will cause a conflict - could be marked as valid even though the value wouldnt pass
    //resetting it below, but maybe a way to block or delay changes?
    const validate = async () => {
        return await mutex.runExclusive(async () => {
            if (options.validate === undefined) {
                return
            }
            state.patch({ lastValidateStarted: new Date() })
            try {
                const errors = await options.validate(state.value.value) ?? []
                state.patch({
                    lastValidateCompleted: new Date(),
                    value: state.value.value,
                    errors
                })
                if (errors.length === 0) {
                    state.patch({
                        lastValidateSucceeded: new Date(),
                    })
                }
                else {
                    state.patch({
                        lastValidateFailed: new Date(),
                    })
                }
                return errors.length === 0
            }
            catch (exception) {
                state.patch({ exception })
                return false
            }
            finally {
                //state.patch({ lastValidateAttemptCompleted: new Date() })
            }
        })
    }

    // Submit function.

    const submit = async (event?: FormEvent<unknown>) => {
        throwErrorIfDisabled()
        event?.preventDefault()
        return await mutex.runExclusive(async () => {
            state.patch({ lastSubmitStarted: new Date() })
            try {
                const errors = await (async () => {
                    const validate = options.submitValidate ?? options.validate
                    if (validate !== undefined) {
                        const errors = await validate(state.value.value) ?? []
                        if (errors.length > 0) {
                            return errors
                        }
                    }
                    return await options.submit(state.value.value) ?? []
                })()
                state.patch({
                    errors
                })
                if (errors.length === 0) {
                    const date = new Date()
                    state.set(state => {
                        return {
                            ...state,
                            lastSubmitted: date,
                            submitCount: state.submitCount + 1,
                            submittedValue: state.value,
                        }
                    })
                }
                return errors.length === 0
            }
            catch (exception) {
                state.patch({ exception })
                return false
            }
            finally {
                state.patch({ lastSubmitCompleted: new Date() })
            }
        })
    }

    // Automatic reinitalization if initialValue prop changes.

    useEffect(() => {
        if (callOrGet(options.autoReinitialize, state.value)) {
            reinitialize()
        }
    }, [
        state.value.initialValue
    ])

    // Revert to the initial data.

    const scheduleSubmit = () => state.patch({ lastSubmitRequested: new Date() })
    const scheduleValidate = () => state.patch({ lastValidateRequested: new Date() })
    const setErrors = (errors: ValueOrFactory<readonly FormError[], [readonly FormError[]]>) => {
        state.set(state => {
            return {
                ...state,
                errors: callOrGet(errors, state.errors ?? [])
            }
        })
    }
    //const revert = () => initialize(options.initialValue)
    // const revertToSubmitted = () => initialize(state.value.submittedValue ?? options.initialValue)

    // The root form group.

    const group = FormFieldImpl.from({
        path: [],
        value: state.value.value,
        errors: state.value.errors,
        disabled,
        //TODO do we need to reset lastValidateCompleted?
        setValue: (value: ValueOrFactory<T, [T]>) => {
            state.set(state => {
                return {
                    ...state,
                    value: callOrGet(value, state.value),
                    errors: undefined,
                    lastChanged: new Date(),
                    lastValidateCompleted: undefined
                }
            })
        },
        blur: () => state.patch({ lastBlurred: new Date() }),
        commit: () => state.patch({ lastCommitted: new Date() }),
        focus: () => state.patch({ lastFocused: new Date() }),
    })

    const keyHandler = (() => {
        if (disabled) {
            return
        }
        return (event: React.KeyboardEvent<HTMLElement>) => {
            if (event.key !== "Enter") {
                return
            }
            const target = event.target as HTMLElement
            if (target.tagName === "INPUT") {
                submit()
            }
        }
    })()

    const context = {
        ...state.value,
        ...group,
        initialize,
        reinitialize,
        submit,
        validate,
        scheduleSubmit,
        scheduleValidate,
        setErrors,
        keyHandler,
    }

    FORM_HOOK_KEYS.forEach(item => {
        useFormHook(context, item, () => {
            const actions = [options.on?.[item]].flat()
            actions.flat().forEach(action => {
                if (typeof action === "string") {
                    context[action]()
                }
                else {
                    action?.(context)
                }
            })
        })
    })

    if (state.value.exception !== undefined) {
        throw state.value.exception
    }

    return context

}
