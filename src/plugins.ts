import { useEffect, useState } from "react";
import { FormContext } from "./form";

export function useUndoRedoPlugin<T>(form: FormContext<T>) {
    const [redoStack, setRedoStack] = useState<T[]>([])
    const [undoStack, setUndoStack] = useState<T[]>([])
    useEffect(() => {
        setUndoStack(stack => [...stack, form.value])
    }, [
        form.lastChanged
    ])
    const undo = () => {
    }
    const redo = () => {
    }
    return {
        undo,
        redo,
    }
}
