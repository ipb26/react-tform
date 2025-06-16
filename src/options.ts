import { createContext } from "react"
import { ValueOrFactory } from "value-or-factory"
import { FormErrorInput, FormErrors } from "./errors"
import { FormContext } from "./form"
import { FormHook as FormEvent } from "./hooks"
import { FormState } from "./state"

export type FormValidationResult = FormErrorInput | void | PromiseLike<FormErrorInput | void>
export type FormSubmissionResult = FormErrorInput | void | PromiseLike<FormErrorInput | void>
export type FormValidator<T> = (value: T) => FormValidationResult
export type FormSubmitter<T> = (value: T) => FormSubmissionResult

export interface UniversalFormOptions {

    /**
     * Disable the form.
     */
    readonly disabled?: boolean | undefined

    /**
     * When to start running validation.
     */
    readonly validateStart?: "immediate" | "afterFirstSubmission" | undefined

    /**
     * When to trigger validation.
     */
    readonly validateOn?: "blur" | "change" | "commit" | undefined

}

export interface FormInitial<T> {

    /**
     * The initial data for the form. Memoize this for performance benefits.
     */
    readonly value: T

    readonly errors?: FormErrors | undefined

}

/**
 * Form setup options.
 * @typeParam T The value type.
 */
export interface FormOptions<T> extends UniversalFormOptions {

    /**
     * Specify actions to be executed on form hooks.
     */
    readonly on?: FormActions<T> | undefined

    /**
     * The initial data for the form. Memoize this for performance benefits.
     */
    readonly initialValue?: T

    readonly initialErrors?: FormErrors | undefined

    //TODO remove the above, replace w this
    readonly initial?: FormInitial<T>

    /**
     * Whether or not the form should update if the initial property changes.
     * @defaultValue `false`
     */
    readonly autoUpdate?: ValueOrFactory<boolean, [FormState<T>]> | undefined

    /**
     * Whether or not the form should reinitialize if the initial property changes.
     * @defaultValue `false`
     */
    readonly reinitializeOnUpdate?: ValueOrFactory<boolean, [FormState<T>]> | undefined

    /**
     * Submission function for the form. If this throws an exception, it will be thrown within React. If you want to handle errors, make sure to return a FormError[].
     */
    readonly submit: FormSubmitter<T>

    /**
     * Validation function for the form. Should return an array of errors (empty if validation is successful). If this throws an exception, it will be thrown within React. If you want to handle errors, make sure to return a FormError[].
     */
    readonly validate?: FormValidator<T> | undefined

}

export type FormAction<T> = "submit" | "validate" | ((value: FormContext<T>) => void)

/**
 * A map of event types to actions.
 */
export type FormActions<T> = {

    readonly [K in FormEvent]?: FormAction<T> | readonly FormAction<T>[]

}

export const FormDefaults = createContext<UniversalFormOptions>({})

export function useFormOptions<T>(input: FormOptions<T>) {
    // const defaults = useContext(FormDefaults)
    return {
        //   ...defaults,
        ...input,
        on: {
            //    ...defaults.on,
            ...input.on,
        }
    }
}
