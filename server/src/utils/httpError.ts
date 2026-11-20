// Thrown inside a db.transaction() callback to roll back and answer with a specific status and body.
export class HttpError extends Error {
    constructor(public status: number, public body: Record<string, unknown>) {
        super(String(body.error ?? body.message ?? 'Request failed'));
    }
}
