import { ZodError } from 'zod';
export function validate(schemas) {
    return (req, res, next) => {
        try {
            if (schemas.body) {
                req.body = schemas.body.parse(req.body);
            }
            if (schemas.query) {
                const parsed = schemas.query.parse(req.query);
                req.query = parsed;
            }
            if (schemas.params) {
                const parsed = schemas.params.parse(req.params);
                req.params = parsed;
            }
            next();
        }
        catch (error) {
            if (error instanceof ZodError) {
                const issues = error.issues.map((issue) => ({
                    field: issue.path.join('.'),
                    message: issue.message,
                    code: issue.code,
                }));
                res.status(400).json({
                    success: false,
                    error: 'Validation failed',
                    code: 'VALIDATION_ERROR',
                    details: issues,
                });
                return;
            }
            next(error);
        }
    };
}
