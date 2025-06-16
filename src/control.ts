import { ValueOrFactory } from "value-or-factory"
import { FormError, FormErrorInput } from "./errors"
import { FieldInput } from "./internal"

export interface FieldControl<G, S = G> extends FieldInput<G, S> {

    /**
     * Mark this field or form as blurred or focused.
     */
    toggle(status: "focused" | "blurred"): void

    /**
     * Set a value and immediately mark the change as committed.
     */
    setValueAndCommit(value: ValueOrFactory<S, [G]>, suppressTouch?: boolean | undefined): void

    /**
     * A list of errors associated with this field or form.
     */
    readonly selfErrors?: readonly FormError[] | undefined

    /**
     * Does this field or form have errors?
     */
    readonly hasErrors: boolean

    /**
     * Does this field or form have errors?
     */
    readonly hasSelfErrors: boolean

    /**
     * Add an error to a form.
     */
    readonly attachErrors: (errors: FormErrorInput) => void

}

/*
class MockField<T> implements FieldControl<T> {

    toggle() {
    }
    setValueAndCommit() {
    }
    selfErrors?: readonly FormError[] | undefined
    hasErrors: boolean
    hasSelfErrors: boolean
    attachErrors: (errors: FormErrorInput) => void
    disabled?: boolean | undefined
    blur: () => void
    commit: () => void
    focus: () => void
    touch: () => void
    path: FormErrorPath
    value: T
    setValue: (value: ValueOrFactory<T, [T]>, suppressTouch?: boolean | undefined) => void
    errors?: FormErrors | undefined
    setErrors: (errors: ValueOrFactory<FormErrorInput, [FormErrors]>) => void

}
*/
