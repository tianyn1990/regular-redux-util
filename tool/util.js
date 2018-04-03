var Immutable = require('immutable');
var C = require('./constant');

var toString = Object.prototype.toString,
    slice = Array.prototype.slice;

function isFunction(f) {
    return typeof f === 'function';
}

function isArray(ary) {
    return Array.isArray ? Array.isArray(ary) : (toString.call(ary).toLowerCase() === '[object array]');
}

function isNull(nl) {
    return nl === null || nl === undefined;
}

function isNumber(num) {
    return !isNaN(Number(num));
}

function isObject(obj) {
    return typeof obj === 'object' && !isArray(obj) && obj !== null;
}

function isBool(bool) {
    return typeof bool === 'boolean';
}

function isString(str) {
    return typeof str === 'string';
}

function like2Array(arrayLike) {
    return slice.call(arrayLike, 0);
}

function nextTick(callback) {
    var next = requestAnimationFrame ||
        function(_cb) {
            setTimeout(_cb);
        };
    var num = next(callback);
    return function cancel() {
        cancelAnimationFrame ?
            cancelAnimationFrame(num) :
            clearTimeout(num);
    };
}

function isReduxStore(store) {
    return store &&
        store.getState &&
        store.dispatch &&
        store.subscribe;
}

function isMiddlewares(middlewares) {
    return isFunction(middlewares) || isArray(middlewares);
}

function isPromise(obj) {
    return !!obj && obj.then && isFunction(obj.then);
}

// 是否为开发环境
var LOCAL = /localhost|\d+\.\d+\.\d+\.\d+/.test(location.hostname);
var DEBUG = window.DEBUG || false;

function isDev() {
    return DEBUG || LOCAL;
}

var REG_FULFILLED = new RegExp(C.PROMISE_FULFILLED_SUFFIX + '$');
var REG_REJECTED = new RegExp(C.PROMISE_REJECTED_SUFFIX + '$');
var REG_PENDING = new RegExp(C.PROMISE_PENDING_SUFFIX + '$');

function testActionType(reg, action) {
    action = action || {};
    var type = action.type || '';
    return reg.test(type);
}

function isFulfilledAction(action) {
    return testActionType(REG_FULFILLED, action);
}

function isRejectedAction(action) {
    return testActionType(REG_REJECTED, action);
}

function isPendingAction(action) {
    return testActionType(REG_PENDING, action);
}

// npm的包还不支持 Immutable.isImmutable 方法，github 上的 v4.0 才开始支持
function isImmutable(maybeImmutable) {
    if(isFunction(Immutable.isImmutable)) {
        return Immutable.isImmutable(maybeImmutable);
    }
    return isCollection(maybeImmutable) || isRecord(maybeImmutable);
}
var IS_ITERABLE_SENTINEL = '@@__IMMUTABLE_ITERABLE__@@';
var IS_RECORD_SENTINEL = '@@__IMMUTABLE_RECORD__@@';
function isCollection(maybeCollection) {
    return !!(maybeCollection && maybeCollection[IS_ITERABLE_SENTINEL]);
}
function isRecord(maybeRecord) {
    return !!(maybeRecord && maybeRecord[IS_RECORD_SENTINEL]);
}

function toJS(obj) {
    return isImmutable(obj) ? obj.toJS() : obj;
}

function action2String(action) {
    var actionString = action;
    if (
        (this.isObject(action) || this.isFunction(action)) &&
        this.isFunction(action.toString)
    ) {
        actionString = action.toString();
    }
    if (!this.isString(actionString)) {
        throw new Error('Expected actionString to be a string: ' + actionString);
    }
    return actionString;
}

module.exports = {
    // 数据类型判断
    isFunction: isFunction,
    isArray: isArray,
    isNull: isNull, // 含undefined
    isNumber: isNumber,
    isObject: isObject,
    isBool: isBool,
    isString: isString,

    // 特殊对象类型判断
    isReduxStore: isReduxStore,
    isMiddlewares: isMiddlewares,
    isPromise: isPromise,
    isFulfilledAction: isFulfilledAction,
    isRejectedAction: isRejectedAction,
    isPendingAction: isPendingAction,

    // 常用工具
    like2Array: like2Array, // array-like 转换为 Array
    nextTick: nextTick,
    isDev: isDev, // 是否为开发环境
    toJS: toJS,
    isImmutable: isImmutable,
    action2String: action2String, // 将 action函数 转换为 String 类型

    noop: function() {}
};