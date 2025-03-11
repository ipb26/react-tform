import { ValueOrFactory } from "value-or-factory"
import { FormErrorInput, FormErrors } from "./errors"

export interface FieldBehaviors {

    /**
     * Is this field disabled?
     */
    readonly disabled?: boolean | undefined

    /**
     * Mark this field or form as blurred. Call in the onBlur attribute of input elements.
     */
    blur(): void

    /**
     * Mark this field or form as committed. Call after changing the value of a radio button or checkbox etc.
     */
    commit(): void

    /**
     * Mark this field or form as focused. Call in the onFocus attribute of input elements.
     */
    focus(): void

}

export interface PartialFieldBehaviors {

    /**
     * Is this field disabled?
     */
    readonly disabled?: boolean | undefined

    /**
     * Mark this field or form as blurred. Call in the onBlur attribute of input elements.
     */
    blur?: (() => void) | undefined

    /**
     * Mark this field or form as committed. Call after changing the value of a radio button or checkbox etc.
     */
    commit?: (() => void) | undefined

    /**
     * Mark this field or form as focused. Call in the onFocus attribute of input elements.
     */
    focus?: (() => void) | undefined

}

export interface FieldManagement<G, S = G> {

    /**
     * This field or form's value.
     */
    readonly value: G

    /**
     * Set this field or form's value.
     * @param value The value.
     */
    readonly setValue: (value: ValueOrFactory<S, [G]>) => void

    /**
     * A list of errors associated with this field or form and its children.
     */
    readonly errors?: FormErrors | undefined

    /**
     * Set this field's errors.
     * @param errors The errors.
     */
    readonly setErrors: (errors: ValueOrFactory<FormErrorInput, [FormErrors]>) => void

}

export interface FieldInput<G, S = G> extends FieldManagement<G, S>, PartialFieldBehaviors {
}
