import isArray from 'lodash-es/isArray';
import toArray from 'lodash-es/toArray';
import keys from 'lodash-es/keys';
import values from 'lodash-es/values';
import map from 'lodash-es/map';
import flatten from 'lodash-es/flatten';
import reduce from 'lodash-es/reduce';
import concat from 'lodash-es/concat';
import zipObject from 'lodash-es/zipObject';

export function permutations(obj, n) {
  if (typeof obj === 'string') {
    obj = toArray(obj);
  }
  n = n ? n : obj.length;
  // make n copies of keys/indices
  const nInds = [];
  for (let j = 0; j < n; j++) {
    nInds.push(keys(obj));
  }
  // get product of the indices, then filter to remove the same key twice
  // var arrangements = product(nInds).filter(pair=>pair[0]!==pair[1]) // this line only removes duplicates from the first two elements.
  const arrangements = product(nInds);
  const out = [];
  for (let j = 0; j < arrangements.length; j++) {
    const outt = arrangements[j].filter((value, index, self) => {
      return self.indexOf(value) === index;
    });
    if (outt.length === arrangements[j].length) {
      out.push(outt);
    }
  }
  return map(out, (indices) => map(indices, (i) => obj[i]));
}

function product(opts) {
  if (arguments.length === 1 && !isArray(opts)) {
    return _cartesianProductObj(opts);
  } else if (arguments.length === 1) {
    return _cartesianProductOf(opts);
  } else {
    return _cartesianProductOf(arguments);
  }
}

function _cartesianProductObj(optObj) {
  const objectKeys = keys(optObj);
  const opts = values(optObj);
  const combs = _cartesianProductOf(opts);
  return map(combs, function (comb) {
    return zipObject(objectKeys, comb);
  });
}

function _cartesianProductOf(args) {
  if (arguments.length > 1) {
    args = toArray(arguments);
  }
  // strings to arrays of letters
  args = map(args, (opt) => (typeof opt === 'string' ? toArray(opt) : opt));
  return reduce(
    args,
    function (a, b) {
      return flatten(
        map(a, function (x) {
          return map(b, function (y) {
            return concat(x, [y]);
          });
        }),
      );
    },
    [[]],
  );
}
