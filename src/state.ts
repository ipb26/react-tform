import { useMemo, useState } from "react"
import { ValueOrFactory, callOrGet } from "value-or-factory"
import { FormError, FormOptions } from "./options"
import { formCompare, useFormCompareConstant } from "./util"

/**
 * A form's internal state.
 */
export interface FormInternalState<T> {

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
    readonly errors: readonly FormError[]

    /**
     * Is the form valid?
     */
    readonly isValid?: boolean | undefined

    /**
     * The most recently submitted value.
     */
    readonly submittedValue?: T | undefined

    /**
     * The number of times the form was successfully submitted.
     */
    readonly submitCount: number

    /**
     * The last exception to occur within submission or validation.
     */
    readonly exception?: unknown

    readonly lastInitialized: Date
    readonly lastBlurred?: Date | undefined
    readonly lastChanged?: Date | undefined
    readonly lastCommitted?: Date | undefined
    readonly lastFocused?: Date | undefined
    readonly lastSubmitRequested?: Date | undefined
    readonly lastSubmitted?: Date | undefined
    readonly lastSubmitAttempted?: Date | undefined//TODO rm
    readonly lastSubmitStarted?: Date | undefined
    readonly lastSubmitCompleted?: Date | undefined
    readonly lastValidateRequested?: Date | undefined
    readonly lastValidateStarted?: Date | undefined
    readonly lastValidateCompleted?: Date | undefined
    readonly lastValidateFailed?: Date | undefined
    readonly lastValidateSucceeded?: Date | undefined

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
        errors: [],
        submitCount: 0,
    }
}

export function useFormState<T>(options: FormOptions<T>) {

    const [state, setState] = useState<FormInternalState<T>>(initialFormState(options.initialValue))

    const canSubmit = state.isValid !== false

    const isDirty = useMemo(() => (state.lastChanged?.getTime() ?? 0) > state.lastInitialized.getTime() && !formCompare(state.value, state.initializedValue), [state.value, state.initializedValue])
    const isDirtySinceSubmitted = useMemo(() => (state.lastChanged?.getTime() ?? 0) > (state.lastSubmitted?.getTime() ?? 0) && !formCompare(state.value, state.submittedValue ?? state.initializedValue), [state.value, state.submittedValue ?? state.initializedValue])

    const hasBeenSubmitted = state.lastSubmitted !== undefined
    const hasBeenValidated = state.lastValidateCompleted !== undefined

    const hasBeenBlurred = state.lastBlurred !== undefined
    const hasBeenChanged = state.lastChanged !== undefined
    const hasBeenCommitted = state.lastCommitted !== undefined
    const hasBeenFocused = state.lastFocused !== undefined

    const hasBeenBlurredSinceSubmitted = (state.lastBlurred?.getTime() ?? 0) > (state.lastSubmitted?.getTime() ?? 0)
    const hasBeenChangedSinceSubmitted = (state.lastChanged?.getTime() ?? 0) > (state.lastSubmitted?.getTime() ?? 0)
    const hasBeenCommittedSinceSubmitted = (state.lastCommitted?.getTime() ?? 0) > (state.lastSubmitted?.getTime() ?? 0)
    const hasBeenFocusedSinceSubmitted = (state.lastFocused?.getTime() ?? 0) > (state.lastSubmitted?.getTime() ?? 0)

    const hasBeenBlurredSinceValidated = (state.lastBlurred?.getTime() ?? 0) > (state.lastValidateCompleted?.getTime() ?? 0)
    const hasBeenChangedSinceValidated = (state.lastChanged?.getTime() ?? 0) > (state.lastValidateCompleted?.getTime() ?? 0)
    const hasBeenCommittedSinceValidated = (state.lastCommitted?.getTime() ?? 0) > (state.lastValidateCompleted?.getTime() ?? 0)
    const hasBeenFocusedSinceValidated = (state.lastFocused?.getTime() ?? 0) > (state.lastValidateCompleted?.getTime() ?? 0)

    const isCurrentlyFocused = (state.lastFocused?.getTime() ?? 0) > (state.lastBlurred?.getTime() ?? 0)
    const isCurrentlyBlurred = (state.lastBlurred?.getTime() ?? 0) > (state.lastFocused?.getTime() ?? 0)
    const isValidating = (state.lastValidateStarted?.getTime() ?? 0) > (state.lastValidateStarted?.getTime() ?? 0)
    const isSubmitting = (state.lastSubmitStarted?.getTime() ?? 0) > (state.lastSubmitCompleted?.getTime() ?? 0)

    //TODO rename to clarify dif between initial vs initilized value?
    const initialValue = useFormCompareConstant(options.initialValue)
    const initialValueDirty = useMemo(() => !formCompare(initialValue, state.initializedValue), [initialValue, state.initializedValue])

    //TODO do we need sinceSubmitted, sinceValidated, etc

    const value = {
        ...state,
        canSubmit,
        initialValue,
        initialValueDirty,
        isDirty,
        isDirtySinceSubmitted,
        hasBeenSubmitted,
        hasBeenValidated,
        hasBeenBlurred,
        hasBeenChanged,
        hasBeenCommitted,
        hasBeenFocused,
        hasBeenBlurredSinceSubmitted,
        hasBeenChangedSinceSubmitted,
        hasBeenCommittedSinceSubmitted,
        hasBeenFocusedSinceSubmitted,
        hasBeenBlurredSinceValidated,
        hasBeenChangedSinceValidated,
        hasBeenCommittedSinceValidated,
        hasBeenFocusedSinceValidated,
        isCurrentlyFocused,
        isCurrentlyBlurred,
        isValidating,
        isSubmitting,
    }

    return {
        value,
        set: setState,
        patch: (partial: ValueOrFactory<Partial<FormInternalState<T>>, [FormInternalState<T>]>) => {
            setState(state => {
                return {
                    ...state,
                    ...callOrGet(partial, state),
                }
            })
        },
    }

}

export interface FormState<T> extends FormInternalState<T> {

    /**
     * The latest initial value passed to the form. Not necessarily the form's initialized value.
     */
    readonly initialValue: T

    /**
     * Whether the latest initial value passed to the form is the same as the form's initialized value.
     */
    readonly initialValueDirty: boolean

    /**
     * Whether or not the form is ready for submission. Either it has been validated, or there is no validator required.
     */
    readonly canSubmit: boolean

    /**
     * Has the form been changed from its initial value?
     */
    readonly isDirty: boolean
    /**
     * Has the form been changed from its last submitted value?
     */
    readonly isDirtySinceSubmitted: boolean

    /**
     * True if the form is focused.
     */
    readonly isCurrentlyFocused: boolean
    /**
     * True if the form is blurred.
     */
    readonly isCurrentlyBlurred: boolean

    /**
     * True if the form is currently validating.
     */
    readonly isValidating: boolean
    /**
     * True if the form is currently submitting.
     */
    readonly isSubmitting: boolean

    /**
     * Has the form been blurred?
     */
    readonly hasBeenBlurred: boolean
    /**
     * Has the form been changed?
     */
    readonly hasBeenChanged: boolean
    /**
     * Has the form been committed?
     */
    readonly hasBeenCommitted: boolean
    /**
     * Has the form been focused?
     */
    readonly hasBeenFocused: boolean
    /**
     * Has the form been submitted?
     */
    readonly hasBeenSubmitted: boolean
    /**
     * Has the form been validated?
     */
    readonly hasBeenValidated: boolean

    /**
     * Has the form been blurred since submitted?
     */
    readonly hasBeenBlurredSinceSubmitted: boolean
    /**
     * Has the form been changed since submitted?
     */
    readonly hasBeenChangedSinceSubmitted: boolean
    /**
     * Has the form been committed since submitted?
     */
    readonly hasBeenCommittedSinceSubmitted: boolean
    /**
     * Has the form been focused since submitted?
     */
    readonly hasBeenFocusedSinceSubmitted: boolean

    /**
     * Has the form been blurred since validated?
     */
    readonly hasBeenBlurredSinceValidated: boolean
    /**
     * Has the form been changed since validated?
     */
    readonly hasBeenChangedSinceValidated: boolean
    /**
     * Has the form been committed since validated?
     */
    readonly hasBeenCommittedSinceValidated: boolean
    /**
     * Has the form been focused since validated?
     */
    readonly hasBeenFocusedSinceValidated: boolean

}
