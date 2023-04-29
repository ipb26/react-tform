import { useEffect, useState } from "react"
import { FormContext } from "./form"

/**
 * The autosave options. Note that you MUST set either the onChange or onBlur option (or both), or the autosave will not take effect.
 * @typeParam T The form's value type.
 */
export type AutoSaveOptions<T> = {
    /**
     * The form context.
     */
    form: FormContext<T>
    /**
     * Set this to true to disable autosaving.
     */
    disabled?: boolean
    /**
     * Whether or not to autosave on blur. Can be a boolean or a number. If a number, will be used as the debounce time. Default: false.
     */
    onBlur?: boolean | number
    /**
     * Whether or not to autosave on change. Can be a boolean or a number. If a number, will be used as the debounce time. Default: false.
     */
    onChange?: boolean | number
}

/**
 * The status of a currently activate autosave.
 */
export type AutoSaveStatus = {
    /**
     * Whether or not this autosave is active. Will be false if the disabled option is passed into useAutoSave.
     */
    active: boolean
    /**
     * When the next autosave will fire, millisecond timestamp.
     */
    next: number | undefined
    /**
     * Cancel any pending autosaves.
     */
    cancel(): void
}

/**
 * Attach autosaving functionality to a form.
 * @typeParam T The form's value type.
 * @param options The configuration object.
 * @returns Autosave status.
 */
export function useAutoSave<T>(options: AutoSaveOptions<T>): AutoSaveStatus {
    const active = options.disabled !== true
    const [next, setNext] = useState<number>()
    const blurDelay = options.onBlur === true ? 0 : (typeof options.onBlur === "number" ? options.onBlur : undefined)
    const changeDelay = options.onChange === true ? 1000 : (typeof options.onChange === "number" ? options.onChange : undefined)
    useEffect(() => {
        if (active && blurDelay !== undefined && options.form.lastBlurred !== undefined && options.form.isDirtySinceSubmitted) {
            setNext(Date.now() + blurDelay)
        }
    }, [options.form.lastBlurred])
    useEffect(() => {
        if (active && changeDelay !== undefined && options.form.lastChanged !== undefined && options.form.isDirtySinceSubmitted) {
            setNext(Date.now() + changeDelay)
        }
    }, [options.form.lastChanged])
    useEffect(() => {
        if (active) {
            setNext(undefined)
        }
    }, [options.form.lastSubmitted])
    useEffect(() => {
        if (next === undefined || !active) {
            return
        }
        /*
        const save = async () => {
            await options.form.submit()
            setNext(undefined)
        }*/
        const timeout = setTimeout(options.form.submit, Math.max(next - Date.now(), 0))
        return () => {
            clearTimeout(timeout)
        }
    }, [active, next])
    return {
        active,
        next,
        cancel: () => setNext(undefined)
    }
}
