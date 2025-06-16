import { isNotNil } from "ramda"
import { FormEvent, SetStateAction, useCallback, useEffect, useMemo } from "react"
import { ValueOrFactory, callOrGet } from "value-or-factory"
import { FormErrorInput, FormErrors, buildErrors } from "./errors"
import { FormField, FormFieldImpl } from "./field"
import { FORM_HOOK_KEYS, useFormAction } from "./hooks"
import { FormOptions } from "./options"
import { FormState, initialFormState, useFormState } from "./state"
import { useDeepCompareConstant, useIsFirstMount } from "./util"

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
    //TODO put back? readonly initialValue: T

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
     * @deprecated
     */
    readonly initialize: (value: T) => void

    /**
     * Reinitialize this form. Clears all state, including errors and submission history.
     * @deprecated
     */
    readonly reinitialize: () => void

    /**
     * Reset to the provided initial values.
     */
    readonly reset: () => void

    /**
     * An onKeyUp handler for non-form root elements. If the form is disabled, this will be undefined.
     */
    readonly handlers: FormHandlers

}

/*
interface ValidateFormEvent {
    readonly type: "validate"
}
interface SubmitFormEvent {
    readonly type: "submit"
}
interface SetErrorsFormEvent {
    readonly type: "setErrors"
}
interface SetValueFormEvent<T> {
    readonly type: "setValue"
    readonly value: T
}
type FormEvent<T> = SetValueFormEvent<T> | SetErrorsFormEvent | SubmitFormEvent | ValidateFormEvent
*/

/**
 * Generate a form.
 * @typeParam T The value type.
 * @param options Form options.
 * @returns A form context.
 */
export function useForm<T>(options: FormOptions<T>): FormContext<T> {

    // Build options and state.

    const [state, setState] = useFormState<T>(options)
    /*
        const reducer = useReducer((state: FormState<T>, action: FormEvent<T>) => {
            if (action.type === "validate") {
                return {
                    ...state,
                }
            }
            else {
                throw new Error("TODO")
            }
        }, state)*/

    const initialValue = useDeepCompareConstant(options.initial?.value ?? options.initialValue!)
    const initialErrors = useDeepCompareConstant(options.initial?.errors ?? options.initialErrors)
    /*const initial = {
        value: initialValue,
        errors: initialErrors,
    }*/
    // Initialization function. Can be called manually but generally won't be.

    const doReinitialize = useCallback(() => setState(initialFormState(initialValue, initialErrors)), [initialValue, initialErrors])
    const doReset = useCallback(() => {
        setValue(initialValue, true)
        setErrors(initialErrors)
    }, [
        initialValue,
        initialErrors,
    ])

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
                setState(state => {
                    return {
                        ...state,
                        exception
                    }
                })
            }
        })()
    }

    // Submit function.

    const doSubmit = () => {
        (async () => {
            try {
                const value = state.value
                const results = await options.submit(value)
                const errors = buildErrors(results).map(error => {
                    return {
                        ...error,
                        temporary: error.temporary ?? true,
                    }
                })
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
                setState(state => {
                    return {
                        ...state,
                        exception
                    }
                })
            }
        })()
    }

    const isFirstMount = useIsFirstMount()
    useEffect(() => {
        if (isFirstMount) {
            return
        }
        if (callOrGet(options.autoUpdate, state)) {
            if (callOrGet(options.reinitializeOnUpdate, state)) {
                doReinitialize()
            }
            else {
                doReset()
            }
        }
    }, [
        doReinitialize,
        doReset,
    ])
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

    const initialize = useCallback((initialValue: T, initialErrors?: FormErrors | undefined) => {
        setState(initialFormState(initialValue, initialErrors))
    }, [
        setState
    ])
    const reinitialize = useCallback(() => {
        setState(state => {
            return {
                ...state,
                lastInitializeRequested: new Date(),
            }
        })
    }, [
        setState
    ])
    const submit = useCallback((event?: FormEvent<unknown> | undefined) => {
        event?.preventDefault()
        setState(state => {
            return {
                ...state,
                lastSubmitRequested: new Date(),
            }
        })
    }, [
        setState
    ])
    const validate = useCallback(() => {
        setState(state => {
            return {
                ...state,
                lastValidateRequested: new Date(),
            }
        })
    }, [
        setState
    ])
    const reset = doReset //TODO dispatch?
    const setValue = useCallback((value: SetStateAction<T>, suppressTouch = false) => {
        setState(state => {
            const validating = options.validate !== undefined
            return {
                ...state,
                value: callOrGet(value, state.value),
                //  valueSource: source,
                lastChanged: new Date(),
                lastTouched: suppressTouch ? state.lastTouched : new Date(),
                //   lastChangedByApi: source === "api" ? new Date() : state.lastChangedByApi,
                //  lastChangedByUserAction: source === "user-action" ? new Date() : state.lastChangedByUserAction,
                isValid: validating ? undefined : true,
                isInvalid: validating ? undefined : false,
            }
        })
    }, [
        setState
    ])
    const setErrors = useCallback((errors: ValueOrFactory<FormErrorInput, [FormErrors]>) => {
        setState(state => {
            return {
                ...state,
                errors: buildErrors(callOrGet(errors, state.errors ?? []))
            }
        })
    }, [
        setState
    ])

    // The root form group.

    const group = FormFieldImpl.from({
        path: [],
        value: state.value,
        setValue,
        errors: state.errors,
        setErrors,
        disabled: options.disabled,
        touch: () => setState(state => ({ ...state, lastTouched: new Date() })),
        blur: () => setState(state => ({ ...state, lastBlurred: new Date() })),
        commit: () => setState(state => ({ ...state, lastCommitted: new Date() })),
        focus: () => setState(state => ({ ...state, lastFocused: new Date() })),
    })

    const handlers = useMemo(() => {
        return {
            onKeyUp: (() => {
                if (options.disabled) {
                    return
                }
                return (event: React.KeyboardEvent<HTMLElement>) => {
                    if (event.target instanceof HTMLInputElement && event.key === "Enter") {
                        submit()
                    }
                }
            })()
        }
    }, [
        submit,
        options.disabled,
    ])

    const context = {
        ...state,
        ...group,
        initialValue,
        initialize,
        reinitialize,
        reset,
        validate,
        submit,
        setErrors,
        handlers,
    }

    FORM_HOOK_KEYS.forEach(item => {
        useFormAction(context, item, () => {
            const actions = [options.on?.[item]].flat().filter(isNotNil)
            actions.forEach(action => {
                typeof action === "string" ? context[action]() : action(context)
            })
        })
    })
    const validateOn = options.validateOn ?? "change"
    const validateStart = options.validateStart ?? "immediate"
    useFormAction(context, validateOn, () => {
        if (options.validate === undefined) {
            return
        }
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
