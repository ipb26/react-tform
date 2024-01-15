import { ValueOrFactory } from "value-or-factory"
import { FormError } from "./options"

export interface FieldInput<G, S = G> {

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

    /**
     * This field or form's value.
     */
    readonly value: G

    /**
     * Set this field or form's value.
     * @param value The value.
     */
    setValue: (value: ValueOrFactory<S, [G]>) => void

    /**
     * A list of errors associated with this field or form and its children.
     */
    readonly errors?: readonly FormError[] | undefined

    readonly path: readonly (string | number)[]

}
