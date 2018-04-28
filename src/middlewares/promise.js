var u = require('../tool/util');
var C = require('../tool/constant');

/**
 * promise中间件
 *
 * example1:
 * example2:
 * example3:
 * example4:
 */

function handleAction(action, next, dispatch, getState, extra) {
    action = action || {};
    var promise;
    var type = action.type || '',
        payload = action.payload || {},
        fakeData = payload.data || null, // 支持 Optimistic Updates
        payloadPromise = payload.promise || null; // 支持 Optimistic Updates

    var isPayloadFun = u.isFunction(payload),
        isPayloadPromise = u.isPromise(payload),
        isPayloadValid = isPayloadPromise || isPayloadFun;

    var isPayloadPromiseFun = u.isFunction(payloadPromise),
        isPayloadPromisePromise = u.isPromise(payloadPromise),
        isPayloadPromiseValid = isPayloadPromisePromise || isPayloadPromiseFun;

    // payload, payload.promise 都不符合
    if (!isPayloadValid && !isPayloadPromiseValid) {
        return next(action);
    }

    // 得到 promise，支持async/await函数
    if (isPayloadPromiseFun) {
        promise = payloadPromise.call(action, dispatch, getState, extra);
    }
    if (isPayloadPromisePromise) {
        promise = payloadPromise;
    }
    if (isPayloadFun) {
        promise = payload.call(action, dispatch, getState, extra);
    }
    if (isPayloadPromise) {
        promise = payload;
    }
    if (!u.isPromise(promise)) {
        return;
    }

    // pending
    dispatch(createPendingAction(type,
        (isPayloadPromiseValid && fakeData) ? fakeData : true));

    action.__promise__ = true;
    return promise
        .then(function(res) {
            dispatch(createSuccessAction(type, res || null));
            return Promise.resolve(res);
        })
        ['catch'](function(err) { // eslint-disable-line
            var newAction = createFailAction(type, err || null);
            newAction.error = true;
            dispatch(newAction);
            // 抛出异常让外层捕获
            if(err instanceof Error) {
                throw err;
            }
            return err;
        });
}

function promiseMiddleware(extra) {
    return function(liteStore) {
        var dispatch = liteStore.dispatch,
            getState = liteStore.getState;
        return function(next) {
            return function(action) {
                return handleAction(action, next, dispatch, getState, extra);
            };
        };
    };
}

function createAction(type, payload) {
    return {
        type: type,
        payload: payload
    };
}

function createPendingAction(type, payload) {
    return createAction(type + C.PROMISE_PENDING_SUFFIX, payload);
}

function createSuccessAction(type, payload) {
    return createAction(type + C.PROMISE_FULFILLED_SUFFIX, payload);
}

function createFailAction(type, payload) {
    return createAction(type + C.PROMISE_REJECTED_SUFFIX, payload);
}

var promise = promiseMiddleware();
promise.withExtra = promiseMiddleware;

module.exports = promise;