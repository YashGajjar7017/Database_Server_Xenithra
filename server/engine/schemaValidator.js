/**
 * SchemaValidator - Dynamic schema definition & validation engine
 * Validates documents against collection schemas, applies defaults, and enforces constraints.
 */

function validateType(val, type) {
  if (val === undefined || val === null) return true; // Checked separately by 'required'
  
  switch (type?.toLowerCase()) {
    case 'string':
      return typeof val === 'string';
    case 'number':
      return typeof val === 'number' && !isNaN(val) && isFinite(val);
    case 'boolean':
      return typeof val === 'boolean';
    case 'date':
      if (val instanceof Date) return !isNaN(val.getTime());
      if (typeof val === 'string' || typeof val === 'number') {
        const d = new Date(val);
        return !isNaN(d.getTime());
      }
      return false;
    case 'array':
      return Array.isArray(val);
    case 'object':
      return typeof val === 'object' && val !== null && !Array.isArray(val);
    case 'objectid':
      return typeof val === 'string' && (/^[0-9a-fA-F]{24}$/.test(val) || /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));
    case 'any':
    default:
      return true;
  }
}

/**
 * Validate and apply defaults to a document
 * @param {Object} doc - Document to validate
 * @param {Object} schemaConfig - Schema specification
 * @returns {{ valid: boolean, errors: Array<{ field: string, message: string }>, sanitizedDoc: Object }}
 */
function validateDocument(doc, schemaConfig) {
  if (!schemaConfig || !schemaConfig.fields || schemaConfig.enforcement === 'disabled') {
    return { valid: true, errors: [], sanitizedDoc: { ...doc } };
  }

  const errors = [];
  const sanitized = { ...doc };
  const fields = schemaConfig.fields || {};

  // 1. Process fields defined in schema
  for (const [fieldName, rule] of Object.entries(fields)) {
    let val = sanitized[fieldName];

    // Apply default if undefined
    if (val === undefined && rule.default !== undefined) {
      if (rule.type === 'date' && rule.default === 'now') {
        val = new Date().toISOString();
      } else {
        val = typeof rule.default === 'function' ? rule.default() : JSON.parse(JSON.stringify(rule.default));
      }
      sanitized[fieldName] = val;
    }

    // Required check
    if (rule.required && (val === undefined || val === null || val === '')) {
      errors.push({ field: fieldName, message: `Field '${fieldName}' is required` });
      continue;
    }

    // Skip further checks if field is not provided and not required
    if (val === undefined || val === null) {
      continue;
    }

    // Type check
    if (rule.type && !validateType(val, rule.type)) {
      errors.push({ field: fieldName, message: `Field '${fieldName}' must be of type ${rule.type}, received ${typeof val}` });
      continue;
    }

    // Number min/max
    if (rule.type === 'number') {
      if (rule.min !== undefined && val < rule.min) {
        errors.push({ field: fieldName, message: `Field '${fieldName}' must be >= ${rule.min}` });
      }
      if (rule.max !== undefined && val > rule.max) {
        errors.push({ field: fieldName, message: `Field '${fieldName}' must be <= ${rule.max}` });
      }
    }

    // String min/max length and pattern
    if (rule.type === 'string') {
      if (rule.min !== undefined && val.length < rule.min) {
        errors.push({ field: fieldName, message: `Field '${fieldName}' length must be >= ${rule.min} characters` });
      }
      if (rule.max !== undefined && val.length > rule.max) {
        errors.push({ field: fieldName, message: `Field '${fieldName}' length must be <= ${rule.max} characters` });
      }
      if (rule.pattern) {
        try {
          const reg = new RegExp(rule.pattern);
          if (!reg.test(val)) {
            errors.push({ field: fieldName, message: `Field '${fieldName}' does not match required pattern: ${rule.pattern}` });
          }
        } catch (e) {
          // ignore invalid regex in rule
        }
      }
    }

    // Array min/max length & item type
    if (rule.type === 'array' && Array.isArray(val)) {
      if (rule.min !== undefined && val.length < rule.min) {
        errors.push({ field: fieldName, message: `Field '${fieldName}' must contain at least ${rule.min} items` });
      }
      if (rule.max !== undefined && val.length > rule.max) {
        errors.push({ field: fieldName, message: `Field '${fieldName}' must contain at most ${rule.max} items` });
      }
      if (rule.itemType) {
        const invalidItem = val.find(item => !validateType(item, rule.itemType));
        if (invalidItem !== undefined) {
          errors.push({ field: fieldName, message: `Array items in '${fieldName}' must be of type ${rule.itemType}` });
        }
      }
    }

    // Enum check
    if (Array.isArray(rule.enum) && rule.enum.length > 0) {
      if (!rule.enum.includes(val)) {
        errors.push({ field: fieldName, message: `Field '${fieldName}' must be one of [${rule.enum.join(', ')}]` });
      }
    }
  }

  // 2. Check strict schema (disallow extra fields not in schema, except _id, createdAt, updatedAt)
  if (schemaConfig.strict) {
    const allowedKeys = new Set([...Object.keys(fields), '_id', 'createdAt', 'updatedAt']);
    for (const key of Object.keys(sanitized)) {
      if (!allowedKeys.has(key)) {
        errors.push({ field: key, message: `Field '${key}' is not allowed in strict schema` });
      }
    }
  }

  const valid = errors.length === 0;
  return {
    valid: schemaConfig.enforcement === 'warn' ? true : valid,
    strictValid: valid,
    errors,
    sanitizedDoc: sanitized
  };
}

module.exports = {
  validateType,
  validateDocument
};
