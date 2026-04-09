export function parseError(e: unknown): { errorCode: string; description?: string } {
    try {
        return JSON.parse((e as Error).message);
    } catch {
        return {errorCode: String((e as Error).message || e)};
    }
}
