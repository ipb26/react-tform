import { Mutex } from "async-mutex"
import { FormEvent, SetStateAction, useEffect, useMemo } from "react"
import { callOrGet } from "value-or-factory"
import { FormError } from "./errors"
import { FormField, FormFieldImpl } from "./field"
import { FORM_HOOK_KEYS, useFormHook } from "./hooks"
import { execAction } from "./internal"
import { FormOptions } from "./options"
import { FormState, initialFormState, useFormState } from "./state"
import { useDeepCompareEffect } from "./util"

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

    //TODO we need to know if we are PENDING validation or submission - not just if we are currently validating

    // Validate function.

    const doValidate = async (requests: number) => {
        try {
            if (options.validate !== undefined) { //TODO throw an error?
                const errors = await options.validate(state.value.value) ?? []
                state.set(state => {
                    return {
                        ...state,
                        lastValidated: new Date(),
                        errors
                    }
                })
            }
        }
        catch (exception) {
            state.set(state => {
                return {
                    ...state,
                    exception
                }
            })
            return false
        }
        finally {
            state.set(state => {
                return {
                    ...state,
                    validateRequests: state.validateRequests - requests
                }
            })
        }
    }

    // Submit function.

    const doSubmit = () => {
        mutex.runExclusive(async () => {
            try {
                if (options.disabled) {
                    throw new Error("Can not submit a form that is disabled.")
                }
                state.set(state => {
                    return {
                        ...state,
                        isSubmitting: true,
                    }
                })
                const errors = await (async () => {
                    if (options.validate !== undefined) {
                        const errors = await options.validate(state.value.value) ?? []
                        if (errors.length > 0) {
                            return errors
                        }
                    }
                    return await options.submit(state.value.value) ?? []
                })()
                state.set(state => {
                    return {
                        ...state,
                        lastValidated: new Date(),
                        errors
                    }
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
                state.set(state => {
                    return {
                        ...state,
                        exception
                    }
                })
                return false
            }
            finally {
                state.set(state => {
                    return {
                        ...state,
                        isSubmitting: false
                    }
                })
            }
        })
    }

    // Initialization function. Can be called manually but generally won't be.

    const initialize = (value: T) => state.set(initialFormState(value))

    //TODO Shouldn't this be a deep comparison?
    useDeepCompareEffect(() => {
        if (callOrGet(options.autoReinitialize, state.value)) {
            initialize(state.value.initialValue)
        }
    }, [
        state.value.initialValue
    ])
    useEffect(() => {
        if (state.value.lastValidateRequested === undefined) {
            return
        }
        doValidate(state.value.validateRequests)
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
        state.set(state => {
            return {
                ...state,
                lastSubmitRequested: new Date(),
            }
        })
    }
    const validate = () => {
        state.set(state => {
            return {
                ...state,
                lastValidateRequested: new Date(),
                validateRequests: state.validateRequests + 1,
            }
        })
    }
    const setValue = (value: SetStateAction<T>) => {
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
    const setErrors = (errors: SetStateAction<readonly FormError[]>) => {
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
        disabled: options.disabled,
        blur: () => state.set(state => ({ ...state, lastBlurred: new Date() })),
        commit: () => state.set(state => ({ ...state, lastCommitted: new Date() })),
        focus: () => state.set(state => ({ ...state, lastFocused: new Date() })),
    })

    const keyHandler = (() => {
        if (options.disabled) {
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
