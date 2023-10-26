import { FieldInput } from "./internal"
import { FormError } from "./options"

export interface FieldControl<G, S = G> extends FieldInput<G, S> {

    /**
     * Mark this field or form as blurred or focused.
     */
    toggle(status: "focused" | "blurred"): void

    /**
     * A list of errors associated with this field or form.
     */
    readonly selfErrors: readonly FormError[]

    /**
     * Does this field or form have errors?
     */
    readonly hasErrors: boolean

    /**
     * Does this field or form have errors?
     */
    readonly hasSelfErrors: boolean

}
