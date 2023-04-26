import { FormContext } from "adapters/form"
import { useEffect, useState } from "react"

const DEFAULT_AUTO_SAVE_DEBOUNCE_TIME = 0

type FormAutoSaveOptions<T> = {
    form: FormContext<T>
    disabled?: boolean
    onTouch?: boolean | number
    onChange?: boolean | number
}

export type AutoSaveStatus = ReturnType<typeof useAutoSave>

export function useAutoSave<T>(options: FormAutoSaveOptions<T>) {
    const enabled = options.disabled !== true
    const [nextSave, setNextSave] = useState<number>()
    useEffect(() => {
        const onTouch = options.onTouch === true ? 0 : (typeof options.onTouch === "number" ? options.onTouch : undefined)
        if (enabled && onTouch !== undefined && options.form.lastTouched !== undefined && options.form.isDirtySinceSubmitted) {
            setNextSave(Date.now() + onTouch)
        }
    }, [options.form.lastTouched])
    useEffect(() => {
        const onChange = options.onChange === true ? 0 : (typeof options.onChange === "number" ? options.onChange : undefined)
        if (enabled && onChange && options.form.lastChanged !== undefined && options.form.isDirtySinceSubmitted) {
            setNextSave(Date.now() + onChange)
        }
    }, [options.form.lastChanged])
    useEffect(() => {
        if (nextSave === undefined || !enabled) {
            return
        }
        const save = async () => {
            await options.form.submit()
            setNextSave(undefined)
        }
        const timeout = setTimeout(save, Math.max(nextSave - Date.now(), 0))
        return () => {
            clearTimeout(timeout)
        }
    }, [
        enabled,
        nextSave
    ])
    return {
        nextSave
    }
}
