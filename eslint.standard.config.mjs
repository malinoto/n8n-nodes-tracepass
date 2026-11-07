import { standard } from '@tracepass/code-standard/eslint';

// The shared TracePass coding standard. n8n's own lint (`npm run lint`) requires its
// default eslint.config.mjs untouched (n8n Cloud strict mode), so the standard runs as
// a second pass: `npm run lint:standard`.
export default [...standard];
