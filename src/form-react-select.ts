import { FormSegment } from "adapters/form"
import { SelectOption } from "adapters/generic-select"
import { GroupBase, Props } from "react-select"
import { maybe } from "universal"

export function rsProps<A, C extends GroupBase<A>>(field: FormSegment<A | undefined>, disabled?: boolean): Props<A, false, C> {
    return {
        value: field.value ?? null,
        onFocus: field.focus,
        onBlur: field.touch,
        onMenuClose: field.touch,
        onChange: newValue => field.setValue(newValue ?? undefined),
        isDisabled: disabled,
        classNamePrefix: "react-select",
        className: "react-select" + ((field.errors ?? []).length > 0 ? " is-invalid" : ""),
    }
}
export function rsValueProps<A extends string, C extends GroupBase<SelectOption<A, A>>>(field: FormSegment<A | undefined>, disabled?: boolean): Props<SelectOption<A, A>, false, C> {
    return {
        value: maybe(field.value, value => ({ value, label: value }), () => null),
        onFocus: field.focus,
        onBlur: field.touch,
        onMenuClose: field.touch,
        onChange: newValue => field.setValue(newValue?.value ?? undefined),
        isDisabled: disabled,
        classNamePrefix: "react-select",
        className: "react-select" + ((field.errors ?? []).length > 0 ? " is-invalid" : ""),
    }
}
