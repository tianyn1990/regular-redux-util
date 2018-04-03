var u = require('./util');
var C = require('./constant');

function createAction(actionMap) {
    actionMap = actionMap || {};

    var action = {};

    var types = Object.keys(actionMap);
    types.forEach(function(typeString) {
        action[typeString] = createActionFunc(typeString, actionMap[typeString] || u.noop);
    });

    action.add = function(typeString, actionCreator) {
        this[typeString] = createActionFunc(typeString, actionCreator || u.noop);
    };

    return action;
}

function createActionFunc(typeString, actionCreator) {
    if(typeString === 'add') {
        throw new Error('"add" is not allowed in action');
    }
    if (!u.isString(typeString)) {
        throw new Error('Expected action type to be a string');
    }
    actionCreator = actionCreator || u.noop;
    var isObj = u.isObject(actionCreator),
        isFun = u.isFunction(actionCreator);
    if (!isFun && !isObj) {
        throw new Error('Expected actionCreator to be a function or object');
    }

    function actionFn() {
        if (isObj) {
            return actionCreator;
        }
        var args = u.like2Array(arguments);
        var act = actionCreator.apply(null, args);
        if (u.isNull(act)) {
            return;
        }
        act.type = typeString;
        return act;
    }

    // 添加action.*，提供reducer使用
    actionFn.toString = function() {
        return typeString;
    };

    // 添加action.*.fulfilled/rejected/pending，提供reducer使用（promise类型的action）
    actionFn.fulfilled = typeString + C.PROMISE_FULFILLED_SUFFIX;
    actionFn.rejected = typeString + C.PROMISE_REJECTED_SUFFIX;
    actionFn.pending = typeString + C.PROMISE_PENDING_SUFFIX;

    return actionFn;
}

module.exports = createAction;