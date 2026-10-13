/**
 * QueryEngine - MongoDB-compatible query evaluator built from scratch
 * Supports dot notation, comparison operators, logical operators, regex, and existence checks.
 */

// Helper to get nested value by dot notation e.g. "profile.address.city"
function getNestedValue(obj, path) {
  if (obj == null) return undefined;
  if (!path.includes('.')) return obj[path];
  
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

// Helper to compare two values with deep comparison for arrays/objects
function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

// Compare field value with single operator condition
function evaluateCondition(actualValue, operator, targetValue) {
  switch (operator) {
    case '$eq':
      return deepEqual(actualValue, targetValue);
    case '$ne':
      return !deepEqual(actualValue, targetValue);
    case '$gt':
      return actualValue > targetValue;
    case '$gte':
      return actualValue >= targetValue;
    case '$lt':
      return actualValue < targetValue;
    case '$lte':
      return actualValue <= targetValue;
    case '$in':
      if (!Array.isArray(targetValue)) return false;
      if (Array.isArray(actualValue)) {
        return actualValue.some(v => targetValue.some(t => deepEqual(v, t)));
      }
      return targetValue.some(t => deepEqual(actualValue, t));
    case '$nin':
      if (!Array.isArray(targetValue)) return true;
      if (Array.isArray(actualValue)) {
        return !actualValue.some(v => targetValue.some(t => deepEqual(v, t)));
      }
      return !targetValue.some(t => deepEqual(actualValue, t));
    case '$exists':
      const exists = actualValue !== undefined;
      return targetValue ? exists : !exists;
    case '$regex':
      try {
        const regex = targetValue instanceof RegExp 
          ? targetValue 
          : new RegExp(targetValue, typeof targetValue === 'string' ? '' : 'i');
        return regex.test(String(actualValue ?? ''));
      } catch {
        return false;
      }
    case '$size':
      return Array.isArray(actualValue) && actualValue.length === targetValue;
    case '$all':
      if (!Array.isArray(actualValue) || !Array.isArray(targetValue)) return false;
      return targetValue.every(t => actualValue.some(v => deepEqual(v, t)));
    case '$elemMatch':
      if (!Array.isArray(actualValue)) return false;
      return actualValue.some(item => matchesQuery(item, targetValue));
    default:
      return false;
  }
}

// Match document against a filter object
function matchesQuery(doc, filter) {
  if (!filter || Object.keys(filter).length === 0) return true;

  for (const [key, condition] of Object.entries(filter)) {
    // Logical operators
    if (key === '$and') {
      if (!Array.isArray(condition)) return false;
      const allMatch = condition.every(subFilter => matchesQuery(doc, subFilter));
      if (!allMatch) return false;
      continue;
    }

    if (key === '$or') {
      if (!Array.isArray(condition) || condition.length === 0) return false;
      const someMatch = condition.some(subFilter => matchesQuery(doc, subFilter));
      if (!someMatch) return false;
      continue;
    }

    if (key === '$nor') {
      if (!Array.isArray(condition)) return false;
      const anyMatch = condition.some(subFilter => matchesQuery(doc, subFilter));
      if (anyMatch) return false;
      continue;
    }

    if (key === '$not') {
      if (matchesQuery(doc, condition)) return false;
      continue;
    }

    const docValue = getNestedValue(doc, key);

    // Operator object e.g. { age: { $gt: 20, $lt: 50 } }
    if (condition && typeof condition === 'object' && !Array.isArray(condition) && !(condition instanceof RegExp)) {
      const keys = Object.keys(condition);
      const isOperatorQuery = keys.some(k => k.startsWith('$'));

      if (isOperatorQuery) {
        let regexOptions = condition['$options'] || '';
        for (const [op, val] of Object.entries(condition)) {
          if (op === '$options') continue;
          let actualValToTest = val;
          if (op === '$regex' && typeof val === 'string') {
            try {
              actualValToTest = new RegExp(val, regexOptions);
            } catch {
              actualValToTest = new RegExp(val);
            }
          }
          if (!evaluateCondition(docValue, op, actualValToTest)) {
            return false;
          }
        }
        continue;
      }
    }

    // Direct equality (or Regex directly)
    if (condition instanceof RegExp) {
      if (!condition.test(String(docValue ?? ''))) return false;
    } else if (Array.isArray(docValue) && !Array.isArray(condition)) {
      // If docValue is array and condition is scalar, MongoDB checks if array contains condition
      if (!docValue.some(v => deepEqual(v, condition))) return false;
    } else {
      if (!deepEqual(docValue, condition)) return false;
    }
  }

  return true;
}

// Filter documents array
function filterDocuments(documents, filter) {
  if (!filter || Object.keys(filter).length === 0) {
    return [...documents];
  }
  return documents.filter(doc => matchesQuery(doc, filter));
}

// Apply projection
function projectDocument(doc, projection) {
  if (!projection || Object.keys(projection).length === 0) {
    return { ...doc };
  }

  const keys = Object.keys(projection);
  // Determine if it's inclusion or exclusion projection (except _id)
  const isExclusion = keys.some(k => k !== '_id' && projection[k] === 0);
  const includeId = projection['_id'] !== 0;

  if (isExclusion) {
    const result = { ...doc };
    for (const key of keys) {
      if (projection[key] === 0) {
        delete result[key];
      }
    }
    if (!includeId) delete result['_id'];
    return result;
  } else {
    const result = {};
    if (includeId && doc._id !== undefined) {
      result._id = doc._id;
    }
    for (const key of keys) {
      if (key !== '_id' && projection[key]) {
        const val = getNestedValue(doc, key);
        if (val !== undefined) {
          result[key] = val;
        }
      }
    }
    return result;
  }
}

// Sort documents by spec e.g. { age: -1, name: 1 }
function sortDocuments(documents, sortSpec) {
  if (!sortSpec || Object.keys(sortSpec).length === 0) {
    return documents;
  }

  const entries = Object.entries(sortSpec);
  return [...documents].sort((a, b) => {
    for (const [key, order] of entries) {
      const valA = getNestedValue(a, key);
      const valB = getNestedValue(b, key);
      const direction = order === -1 || order === 'desc' ? -1 : 1;

      if (valA === valB) continue;
      if (valA === undefined) return 1 * direction;
      if (valB === undefined) return -1 * direction;

      if (valA < valB) return -1 * direction;
      if (valA > valB) return 1 * direction;
    }
    return 0;
  });
}

module.exports = {
  getNestedValue,
  deepEqual,
  matchesQuery,
  filterDocuments,
  projectDocument,
  sortDocuments
};
