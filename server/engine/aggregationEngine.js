/**
 * AggregationEngine - MongoDB-compatible aggregation pipeline evaluator
 * Executes pipeline stages: $match, $group, $project, $sort, $limit, $skip, $count, $unwind
 */

const { matchesQuery, getNestedValue, sortDocuments, projectDocument } = require('./queryEngine');

function evaluateExpression(doc, expr) {
  if (expr === null || expr === undefined) return expr;
  if (typeof expr === 'string' && expr.startsWith('$')) {
    return getNestedValue(doc, expr.substring(1));
  }
  return expr;
}

function executePipeline(documents, pipeline) {
  if (!Array.isArray(pipeline) || pipeline.length === 0) {
    return [...documents];
  }

  let currentDocs = documents.map(d => ({ ...d }));

  for (const stage of pipeline) {
    const stageType = Object.keys(stage)[0];
    const stageConfig = stage[stageType];

    switch (stageType) {
      case '$match': {
        currentDocs = currentDocs.filter(doc => matchesQuery(doc, stageConfig));
        break;
      }

      case '$project': {
        currentDocs = currentDocs.map(doc => projectDocument(doc, stageConfig));
        break;
      }

      case '$sort': {
        currentDocs = sortDocuments(currentDocs, stageConfig);
        break;
      }

      case '$limit': {
        const lim = parseInt(stageConfig, 10);
        if (!isNaN(lim) && lim >= 0) {
          currentDocs = currentDocs.slice(0, lim);
        }
        break;
      }

      case '$skip': {
        const sk = parseInt(stageConfig, 10);
        if (!isNaN(sk) && sk >= 0) {
          currentDocs = currentDocs.slice(sk);
        }
        break;
      }

      case '$count': {
        const countFieldName = typeof stageConfig === 'string' ? stageConfig : 'count';
        currentDocs = [{ [countFieldName]: currentDocs.length }];
        break;
      }

      case '$unwind': {
        const path = typeof stageConfig === 'string' 
          ? (stageConfig.startsWith('$') ? stageConfig.slice(1) : stageConfig)
          : (stageConfig.path?.startsWith('$') ? stageConfig.path.slice(1) : stageConfig.path);
        
        const nextDocs = [];
        for (const doc of currentDocs) {
          const arr = getNestedValue(doc, path);
          if (Array.isArray(arr) && arr.length > 0) {
            for (const item of arr) {
              const copy = { ...doc };
              copy[path] = item;
              nextDocs.push(copy);
            }
          } else if (stageConfig.preserveNullAndEmptyArrays) {
            nextDocs.push({ ...doc, [path]: null });
          }
        }
        currentDocs = nextDocs;
        break;
      }

      case '$group': {
        const idExpr = stageConfig._id;
        const accumulatorKeys = Object.keys(stageConfig).filter(k => k !== '_id');
        const groups = new Map();

        for (const doc of currentDocs) {
          let groupKey;
          if (idExpr === null) {
            groupKey = '__single_group__';
          } else if (typeof idExpr === 'string' && idExpr.startsWith('$')) {
            groupKey = getNestedValue(doc, idExpr.substring(1));
          } else {
            groupKey = idExpr;
          }

          const serializedKey = JSON.stringify(groupKey);
          if (!groups.has(serializedKey)) {
            groups.set(serializedKey, {
              groupKeyValue: groupKey,
              docs: []
            });
          }
          groups.get(serializedKey).docs.push(doc);
        }

        const aggregatedResult = [];

        for (const { groupKeyValue, docs } of groups.values()) {
          const groupResult = { _id: groupKeyValue };

          for (const accKey of accumulatorKeys) {
            const accExpr = stageConfig[accKey];
            if (typeof accExpr !== 'object' || accExpr === null) continue;

            const op = Object.keys(accExpr)[0];
            const operand = accExpr[op];

            switch (op) {
              case '$sum': {
                if (typeof operand === 'number') {
                  groupResult[accKey] = docs.length * operand;
                } else if (typeof operand === 'string' && operand.startsWith('$')) {
                  const field = operand.substring(1);
                  groupResult[accKey] = docs.reduce((acc, d) => {
                    const v = getNestedValue(d, field);
                    return acc + (typeof v === 'number' && !isNaN(v) ? v : 0);
                  }, 0);
                } else {
                  groupResult[accKey] = 0;
                }
                break;
              }

              case '$avg': {
                if (typeof operand === 'string' && operand.startsWith('$')) {
                  const field = operand.substring(1);
                  let sum = 0;
                  let count = 0;
                  for (const d of docs) {
                    const v = getNestedValue(d, field);
                    if (typeof v === 'number' && !isNaN(v)) {
                      sum += v;
                      count++;
                    }
                  }
                  groupResult[accKey] = count > 0 ? sum / count : 0;
                } else {
                  groupResult[accKey] = 0;
                }
                break;
              }

              case '$min': {
                if (typeof operand === 'string' && operand.startsWith('$')) {
                  const field = operand.substring(1);
                  let minVal = Infinity;
                  for (const d of docs) {
                    const v = getNestedValue(d, field);
                    if (typeof v === 'number' && v < minVal) minVal = v;
                  }
                  groupResult[accKey] = minVal === Infinity ? null : minVal;
                }
                break;
              }

              case '$max': {
                if (typeof operand === 'string' && operand.startsWith('$')) {
                  const field = operand.substring(1);
                  let maxVal = -Infinity;
                  for (const d of docs) {
                    const v = getNestedValue(d, field);
                    if (typeof v === 'number' && v > maxVal) maxVal = v;
                  }
                  groupResult[accKey] = maxVal === -Infinity ? null : maxVal;
                }
                break;
              }

              case '$first': {
                if (typeof operand === 'string' && operand.startsWith('$')) {
                  const field = operand.substring(1);
                  groupResult[accKey] = docs.length > 0 ? getNestedValue(docs[0], field) : null;
                }
                break;
              }

              case '$last': {
                if (typeof operand === 'string' && operand.startsWith('$')) {
                  const field = operand.substring(1);
                  groupResult[accKey] = docs.length > 0 ? getNestedValue(docs[docs.length - 1], field) : null;
                }
                break;
              }

              case '$push': {
                if (typeof operand === 'string' && operand.startsWith('$')) {
                  const field = operand.substring(1);
                  groupResult[accKey] = docs.map(d => getNestedValue(d, field));
                }
                break;
              }

              case '$addToSet': {
                if (typeof operand === 'string' && operand.startsWith('$')) {
                  const field = operand.substring(1);
                  const set = new Set();
                  for (const d of docs) {
                    const val = getNestedValue(d, field);
                    if (val !== undefined) set.add(JSON.stringify(val));
                  }
                  groupResult[accKey] = Array.from(set).map(s => JSON.parse(s));
                }
                break;
              }

              case '$count': {
                groupResult[accKey] = docs.length;
                break;
              }

              default:
                groupResult[accKey] = null;
            }
          }

          aggregatedResult.push(groupResult);
        }

        currentDocs = aggregatedResult;
        break;
      }

      default:
        // Ignore unrecognized stage
        break;
    }
  }

  return currentDocs;
}

module.exports = {
  executePipeline
};
