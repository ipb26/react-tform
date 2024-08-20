import { FormEvent, SetStateAction, useContext, useEffect } from "react"
import { ValueOrFactory, callOrGet } from "value-or-factory"
import { FormErrorInput, FormErrors, buildErrors } from "./errors"
import { FormField, FormFieldImpl } from "./field"
import { FORM_HOOK_KEYS, useFormHook } from "./hooks"
import { execAction } from "./internal"
import { FormDefaults, FormOptions } from "./options"
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

    //    readonly validateOn: "change" | "blur" | "submit"

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

    const [state, setState] = useFormState<T>(options)
    const defaults = useContext(FormDefaults)

    // Validate function.

    const doValidate = async () => {
        try {
            if (options.validate !== undefined) {
                const errors = buildErrors(await options.validate(state.value))
                setState(state => {
                    return {
                        ...state,
                        lastValidated: new Date(),
                        isValid: errors.length === 0,
                        isInvalid: errors.length > 0,
                        errors
                    }
                })
            }
        }
        catch (exception) {
            setState(state => {
                return {
                    ...state,
                    exception
                }
            })
        }
    }

    // Submit function.

    const doSubmit = async () => {
        if (!state.canSubmit || options.disabled) {
            setState(state => {
                return {
                    ...state,
                    lastSubmitted: new Date(),
                    lastSubmitResult: false,
                }
            })
            return
        }
        try {
            const value = state.value
            const errors = buildErrors(await options.submit(state.value))
            setState(state => {
                return {
                    ...state,
                    lastSubmitted: new Date(),
                    lastSubmitResult: errors.length === 0,
                    submittedValue: value,
                    errors
                }
            })
        }
        catch (exception) {
            setState(state => {
                return {
                    ...state,
                    exception
                }
            })
            return false
        }
    }

    // Initialization function. Can be called manually but generally won't be.

    const initialize = (value: T) => setState(initialFormState(value))

    useDeepCompareEffect(() => {
        initialize(state.initialValue)
    }, [
        state.initialValue
    ])
    useEffect(() => {
        if (state.lastValidateRequested === undefined) {
            return
        }
        doValidate()
    }, [
        state.lastValidateRequested
    ])
    useEffect(() => {
        if (state.lastSubmitRequested === undefined) {
            return
        }
        doSubmit()
    }, [
        state.lastSubmitRequested
    ])

    // Revert to the initial data.

    const submit = (event?: FormEvent<unknown> | undefined) => {
        event?.preventDefault()
        setState(state => {
            return {
                ...state,
                lastSubmitRequested: new Date(),
            }
        })
    }
    const validate = () => {
        setState(state => {
            return {
                ...state,
                lastValidateRequested: new Date(),
            }
        })
    }
    const setValue = (value: SetStateAction<T>) => {
        //TODO we need to separate out "validated" vs "unknown"
        //the LAST validation might be different from the current validation
        //for example, on a non-auto-validating form, if you change a value, a new validation is not triggered - however the form may no longer be valid (we dont know)
        //so we need a "lastValidation" but also a "isValid" - which might be unknown separate
        //this is because we dont want to reset form state, causing flickering, if we re-validate and a new error is generated
        setState(state => {
            return {
                ...state,
                value: callOrGet(value, state.value),
                lastChanged: new Date(),
            }
        })
    }
    const setErrors = (errors: ValueOrFactory<FormErrorInput, [FormErrors]>) => {
        setState(state => {
            return {
                ...state,
                errors: buildErrors(callOrGet(errors, state.errors ?? []))
            }
        })
    }

    // The root form group.

    const group = FormFieldImpl.from({
        path: [],
        value: state.value,
        setValue,
        errors: state.errors,
        setErrors,
        disabled: options.disabled,
        blur: () => setState(state => ({ ...state, lastBlurred: new Date() })),
        commit: () => setState(state => ({ ...state, lastCommitted: new Date() })),
        focus: () => setState(state => ({ ...state, lastFocused: new Date() })),
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
                submit()
            }
        }
    })()

    const context = {
        ...state,
        ...group,
        initialize,
        submit,
        validate,
        setErrors,
        keyHandler,
    }

    const allActions = { ...defaults, ...options.on }
    FORM_HOOK_KEYS.forEach(item => {
        useFormHook(context, item, () => {
            const action = allActions[item]
            if (action === undefined) {
                return
            }
            execAction(context, action)
        })
    })

    if (state.exception !== undefined) {
        throw state.exception
    }

    return context

}
