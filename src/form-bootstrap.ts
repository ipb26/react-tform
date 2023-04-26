import { FormField } from "adapters/form"
import { D } from "namespaces"
import { FormCheckProps, FormControlProps } from "react-bootstrap"

export function bsStringProps(field: FormField<string | undefined | null, string>): FormControlProps {
    return {
        value: field.value ?? "",
        onChange: event => field.setValue(event.currentTarget.value),
        onFocus: field.focus,
        onBlur: field.touch,
        isInvalid: (field.errors?.length ?? 0) !== 0,
    }
}
export function bsNumberProps(field: FormField<number | undefined | null, number | undefined>): FormControlProps {
    return {
        type: "number",
        value: field.value ?? "",
        onChange: event => {
            if (event.currentTarget.value.trim() === "") {
                field.setValue(undefined)
            }
            else {
                const parsed = parseFloat(event.currentTarget.value)
                if (!isNaN(parsed)) {
                    field.setValue(parsed)
                }
            }
        },
        onFocus: field.focus,
        onBlur: field.touch,
        isInvalid: (field.errors?.length ?? 0) !== 0,
    }
}
export function bsCheckProps<V>(field: FormField<V>, trueValue: V, falseValue: V): FormCheckProps {
    return {
        checked: field.value === trueValue,
        onChange: event => field.setValue(event.target.checked ? trueValue : falseValue),
        onFocus: field.focus,
        onBlur: field.touch,
        isInvalid: (field.errors?.length ?? 0) !== 0,
    }
}
export function bsRadioProps<V>(field: FormField<V>, value: V): FormCheckProps {
    return {
        checked: D.equals(field.value, value),
        onChange: event => event.target.checked ? field.setValue(value) : void 0,
        onFocus: field.focus,
        onBlur: field.touch,
        isInvalid: (field.errors?.length ?? 0) !== 0
    }
}
