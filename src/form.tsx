import { Mutex } from "async-mutex"
import { FormEvent, useEffect, useMemo } from "react"
import { ValueOrFactory, callOrGet } from "value-or-factory"
import { FormError } from "./errors"
import { FormField, FormFieldImpl } from "./field"
import { FORM_HOOK_KEYS, useFormHook } from "./hooks"
import { execAction } from "./internal"
import { FormOptions } from "./options"
import { FormState, initialFormState, useFormState } from "./state"

/**
 * A full form object, including state and mutation methods.
 * @typeParam T The value type.
 */
export interface FormContext<T> extends FormState<T>, FormField<T> {

    /**
     * Validate this form.
     */
    readonly validate: () => void

    /**
     * Submit this form.
     */
    readonly submit: (event?: FormEvent<unknown> | undefined) => void

    /**
     * Reinitialize this form. Clears all state, including errors and submission history.
     */
    readonly initialize: (value: T) => void

    /**
     * Reinitialize this form using its initialValue option. Clears all state, including errors and submission history.
     */
    readonly reinitialize: () => void

    /**
     * An onKeyUp handler for non-form root elements. If the form is disabled, this will be undefined.
     */
    readonly keyHandler: ((event: React.KeyboardEvent<HTMLElement>) => void) | undefined

}

/**
 * Generate a form.
 * @typeParam T The value type.
 * @param options Form options.
 * @returns A form context.
 */
export function useForm<T>(options: FormOptions<T>): FormContext<T> {

    // Build options and state.

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
    const doValidate = () => {
        mutex.runExclusive(async () => {
            if (options.validate === undefined) {
                return
            }
            state.patch({ isValidating: true })
            try {
                const errors = await options.validate(state.value.value) ?? []
                state.patch({
                    lastValidated: new Date(),
                    value: state.value.value,
                    errors
                })
                // return errors.length === 0
            }
            catch (exception) {
                state.patch({ exception })
                return false
            }
            finally {
                state.patch({ isValidating: false })
            }
        })
    }

    // Submit function.

    const doSubmit = () => {
        throwErrorIfDisabled() //TODO wont this be in the background only?
        mutex.runExclusive(async () => {
            state.patch({ isSubmitting: true })
            try {
                const errors = await (async () => {
                    if (options.validate !== undefined) {
                        const errors = await options.validate(state.value.value) ?? []
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
                //return errors.length === 0
            }
            catch (exception) {
                state.patch({ exception })
                return false
            }
            finally {
                state.patch({ isSubmitting: false })
            }
        })
    }

    // Automatic reinitalization if initialValue prop changes.

    //TODO Shouldn't this be a deep comparison?
    useEffect(() => {
        if (callOrGet(options.autoReinitialize, state.value)) {
            reinitialize()
        }
    }, [
        state.value.initialValue
    ])
    useEffect(() => {
        if (state.value.lastValidateRequested === undefined) {
            return
        }
        doValidate()
    }, [
        state.value.lastValidateRequested
    ])
    useEffect(() => {
        if (state.value.lastSubmitRequested === undefined) {
            return
        }
        doSubmit()
    }, [
        state.value.lastSubmitRequested
    ])

    // Revert to the initial data.

    const submit = (event?: FormEvent<unknown> | undefined) => {
        event?.preventDefault()
        state.patch({ lastSubmitRequested: new Date() })
    }
    const validate = () => {
        state.patch({ lastValidateRequested: new Date() })
    }
    const setValue = (value: ValueOrFactory<T, [T]>) => {
        //TODO we need to separate out "validated" vs "unknown"
        //the LAST validation might be different from the current validation
        //for example, on a non-auto-validating form, if you change a value, a new validation is not triggered - however the form may no longer be valid (we dont know)
        //so we need a "lastValidation" but also a "isValid" - which might be unknown separate
        //this is because we dont want to reset form state, causing flickering, if we re-validate and a new error is generated
        state.set(state => {
            return {
                ...state,
                value: callOrGet(value, state.value),
                lastChanged: new Date(),
            }
        })
    }
    const setErrors = (errors: ValueOrFactory<readonly FormError[], [readonly FormError[]]>) => {
        state.set(state => {
            return {
                ...state,
                errors: callOrGet(errors, state.errors ?? [])
            }
        })
    }

    // The root form group.

    const group = FormFieldImpl.from({
        path: [],
        value: state.value.value,
        setValue,
        errors: state.value.errors,
        setErrors,
        disabled,
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
                doSubmit()
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
        setErrors,
        keyHandler,
    }

    FORM_HOOK_KEYS.forEach(item => {
        useFormHook(context, item, form => {
            const actions = [options.on].flat().map(_ => _?.[item]) ?? []
            actions.flat().forEach(action => {
                if (action === undefined) {
                    return
                }
                execAction(form, action)
            })
        })
    })

    if (state.value.exception !== undefined) {
        throw state.value.exception
    }

    return context

}
