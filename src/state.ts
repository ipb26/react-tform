import { equals } from "ramda"
import { useMemo, useState } from "react"
import { FormError } from "./errors"
import { FormOptions } from "./options"
import { useDeepCompareConstant } from "./util"

/**
 * A form's internal state.
 */
export interface FormInternalState<T> {

    /**
     * The last exception to occur within submission or validation.
     */
    readonly exception?: unknown

    /**
     * The current value of the form.
     */
    readonly value: T

    /**
     * The initialized value of the form.
     */
    readonly initializedValue: T

    /**
     * The form's errors.
     */
    readonly errors?: readonly FormError[] | undefined

    readonly lastSubmitResult?: boolean | undefined
    
    /**
     * The most recently submitted value.
     */
    readonly submittedValue?: T | undefined

    /**
     * The number of times the form was successfully submitted.
     */
    // readonly submitCount: number

    readonly lastInitialized: Date
    readonly lastBlurred?: Date | undefined
    readonly lastChanged?: Date | undefined
    readonly lastCommitted?: Date | undefined
    readonly lastFocused?: Date | undefined
    readonly lastSubmitRequested?: Date | undefined
    readonly lastSubmitted?: Date | undefined
    readonly lastValidateRequested?: Date | undefined
    readonly lastValidated?: Date | undefined

    //    readonly isSubmitting: boolean
    //  readonly isValidating: boolean

}

/**
 * Build the initial form state.
 * @param initialValue The form's value.
 * @returns An initial form state.
 */
export function initialFormState<T>(initialValue: T) {
    return {
        lastInitialized: new Date(),
        initializedValue: initialValue,
        value: initialValue,
        //submitCount: 0,
        //validateRequests: 0,
        //  isSubmitting: false,
        // isValidating: false,
    }
}

export function useFormState<T>(options: FormOptions<T>) {

    const [state, setState] = useState<FormInternalState<T>>(initialFormState(options.initialValue))

    //TODO this wont be accurate - we need a counter or something
    // const isValidating = state.isValidating// > 0

    const isValidating = (state.lastValidateRequested?.getTime() ?? 0) > (state.lastValidated?.getTime() ?? 0)
    const isSubmitting = (state.lastSubmitRequested?.getTime() ?? 0) > (state.lastSubmitted?.getTime() ?? 0)

    const isValidationCurrent = (state.lastValidated?.getTime() ?? 0) > (state.lastChanged?.getTime() ?? 0)
    const isInvalid = !isValidationCurrent || state.errors === undefined ? undefined : state.errors.length !== 0
    const isValid = !isValidationCurrent || state.errors === undefined ? undefined : state.errors.length === 0
    const canSubmit = (() => {
        return !(state.errors ?? []).some(_ => _.temporary !== true)
        /*
        return valid
        if (valid) {
            return true
            //return !isValidating
        }
        else {
            return false
        }
        */
    })()

    const isDirty = useMemo(() => (state.lastChanged?.getTime() ?? 0) > state.lastInitialized.getTime() && !equals(state.value, state.initializedValue), [state.value, state.initializedValue])
    const isDirtySinceSubmitted = useMemo(() => (state.lastChanged?.getTime() ?? 0) > (state.lastSubmitted?.getTime() ?? 0) && !equals(state.value, state.submittedValue ?? state.initializedValue), [state.value, state.submittedValue ?? state.initializedValue])

    const isFocused = (state.lastFocused?.getTime() ?? 0) > (state.lastBlurred?.getTime() ?? 0)

    //TODO rename to clarify dif between initial vs initilized value?
    const initialValue = useDeepCompareConstant(options.initialValue)

    //TODO do we need sinceSubmitted, sinceValidated, etc

    const value = {
        ...state,
        isValidating,
        isSubmitting,
        canSubmit,
        isValid,
        isInvalid,
        initialValue,
        isDirty,
        isDirtySinceSubmitted,
        isFocused,
    }

    return [value, setState] as const

}

export interface FormState<T> extends FormInternalState<T> {

    /**
     * The latest initial value passed to the form. Not necessarily the form's initialized value.
     */
    readonly initialValue: T

    /**
     * Whether or not the form is ready for submission. Either it has been validated, there is no validator required, or it failed validation but all errors were temporary.
     */
    readonly canSubmit: boolean

    /**
     * Has the form been changed from its initial value?
     */
    readonly isDirty: boolean

    /**
     * Has the form been changed since submission?
     */
    readonly isDirtySinceSubmitted: boolean

    /**
     * True if the form is focused.
     */
    readonly isFocused: boolean

    /**
     * True if the form is currently validating.
     */
    readonly isValidating: boolean

    /**
     * True if the form is currently submitting.
     */
    readonly isSubmitting: boolean

}
