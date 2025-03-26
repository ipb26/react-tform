import { isNotNil } from "ramda"
import { FormEvent, SetStateAction, useCallback, useEffect } from "react"
import { ValueOrFactory, callOrGet } from "value-or-factory"
import { FormErrorInput, FormErrors, buildErrors } from "./errors"
import { FormField, FormFieldImpl } from "./field"
import { FORM_HOOK_KEYS, useFormAction } from "./hooks"
import { FormOptions, useFormOptions } from "./options"
import { FormState, initialFormState, useFormState } from "./state"
import { useDeepCompareConstant } from "./util"

export interface FormHandlers {

    readonly onKeyUp: ((event: React.KeyboardEvent<HTMLElement>) => void) | undefined

}

/**
 * A full form object, including state and mutation methods.
 * @typeParam T The value type.
 */
export interface FormContext<T> extends FormState<T>, FormField<T> {

    /**
     * The form's initial value.
     */
    readonly initialValue: T

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
     * Reinitialize this form. Clears all state, including errors and submission history.
     */
    readonly reinitialize: () => void

    /**
     * An onKeyUp handler for non-form root elements. If the form is disabled, this will be undefined.
     */
    readonly handlers: FormHandlers

}

/**
 * Generate a form.
 * @typeParam T The value type.
 * @param options Form options.
 * @returns A form context.
 */
export function useForm<T>(input: FormOptions<T>): FormContext<T> {

    // Build options and state.

    const options = useFormOptions(input)
    const initialValue = useDeepCompareConstant(options.initialValue)

    const [state, setState] = useFormState<T>(options)

    const logException = (exception: unknown) => {
        setState(state => {
            return {
                ...state,
                exception
            }
        })
    }

    // Initialization function. Can be called manually but generally won't be.

    const doReinitialize = useCallback(() => setState(initialFormState(initialValue)), [initialValue])

    // Validate function.

    const doValidate = () => {
        const validate = options.validate
        if (validate === undefined) {
            return
        }
        (async () => {
            try {
                const errors = buildErrors(await validate(state.value))
                setState(state => {
                    const date = new Date()
                    return {
                        ...state,
                        lastValidated: date,
                        lastValidationResult: errors.length === 0,
                        isValid: errors.length === 0,
                        isInvalid: errors.length > 0,
                        errors
                    }
                })
            }
            catch (exception) {
                logException(exception)
            }
        })()
    }

    // Submit function.

    const doSubmit = () => {
        if (!state.canSubmit || options.disabled) {
            throw new Error("This form is disabled or can not be submitted.")
        }
        (async () => {
            try {
                const value = state.value
                const results = await options.submit(state.value)
                const errors = buildErrors(results)
                setState(state => {
                    const date = new Date()
                    return {
                        ...state,
                        lastSubmitted: date,
                        lastSubmitValue: value,
                        lastSubmitResult: errors.length === 0,
                        submitCount: state.submitCount + 1,
                        errors
                    }
                })
            }
            catch (exception) {
                logException(exception)
            }
        })()
    }

    useEffect(doReinitialize, [doReinitialize])
    useEffect(() => {
        if (state.lastInitializeRequested === undefined) {
            return
        }
        doReinitialize()
    }, [
        state.lastInitializeRequested
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

    const initialize = (initialValue: T) => setState(initialFormState(initialValue))
    const reinitialize = () => {
        setState(state => {
            return {
                ...state,
                lastInitializeRequested: new Date(),
            }
        })
    }
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
                isValid: undefined,
                isInvalid: undefined,
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
        value: state.value,
        setValue,
        errors: state.errors,
        setErrors,
        disabled: options.disabled,
        blur: () => setState(state => ({ ...state, lastBlurred: new Date() })),
        commit: () => setState(state => ({ ...state, lastCommitted: new Date() })),
        focus: () => setState(state => ({ ...state, lastFocused: new Date() })),
    })

    const handlers = {
        onKeyUp: (() => {
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
    }

    const context = {
        ...state,
        ...group,
        initialValue,
        initialize,
        reinitialize,
        validate,
        submit,
        setErrors,
        handlers,
    }

    FORM_HOOK_KEYS.forEach(item => {
        useFormAction(context, item, () => {
            const actions = [options.on[item]].flat().filter(isNotNil)
            actions.forEach(action => {
                const exec = typeof action === "string" ? context[action] : action
                exec()
            })
        })
    })
    const validateOn = options.validateOn ?? "change"
    const validateStart = options.validateStart ?? "afterFirstSubmission"
    useFormAction(context, validateOn, () => {
        if (validateStart === "afterFirstSubmission" && !state.hasBeenSubmitted) {

            return
        }
        validate()
    })

    if (state.exception !== undefined) {
        throw state.exception
    }

    return context

}
