/**
 * 替代 redux.createStore
 * - 默认添加了自己实现的promise中间件（api类似https://github.com/pburtchaell/redux-promise-middleware 5.x版本）
 *        如果需要，也可以在第三参数中添加其他中间件，这样会覆盖掉默认的promise中间件！
 * - 自动封装中间件，入参是中间件函数 or 函数数组
 * - 自动 combineReducers
 * - 开发环境自动添加 logger 中间件
 * - 开发环境支持 chrome 浏览器插件 Redux DevTools
 * - 默认使用immutablejs，可以通过参数关闭
 *
 * example
 * ```
 * createStore(reducerAFn, [middleWareAFn, middleWareBFn]);
 * createStore({aa: reducerAFn, bb: reducerAFn}, {aa: {}, bb: 0}, [middleWareAFn, middleWareBFn]);
 * createStore(reducerAFn, {aa: {}});
 * createStore(reducerAFn, {}, middleWareAFn);
 * ```
 */
var redux = require('redux');
var Immutable = require('immutable');
var u = require('./util');
var logger = require('redux-logger');
var promise = require('../middlewares/promise');


var disableImmutableJS = false;

function addMiddleware(middlewares, isCombineReducer, isDev) {
    middlewares = middlewares || [];
    if (!u.isMiddlewares(middlewares)) {
        throw new Error('Expected middlewares is a function or array');
    }
    if (u.isFunction(middlewares)) {
        middlewares = [middlewares];
    }
    var a = !middlewares;
    if(a) {
        return;
    }

    // 如果没有传中间件，则在序列头部，默认添加自己实现的promise中间件
    if (!middlewares.length) {
        middlewares.splice(0, 0, promise);
    }

    // 开发环境，添加最后一个中间件为 logger
    if (isDev) {
        var loggerConfig = {
            level: 'info',
            logger: console
        };
        // immutable情况下，改造logger
        if (!disableImmutableJS) {
            // reducer类型，详见：https://github.com/evgenyrodionov/redux-logger#transform-immutable-with-combinereducers
            if (isCombineReducer) {
                loggerConfig = {
                    level: 'info',
                    logger: console,
                    stateTransformer: function(state) {
                        var newState = {};
                        for (var i of Object.keys(state)) {
                            if (Immutable.Iterable.isIterable(state[i])) {
                                newState[i] = state[i].toJS();
                            } else {
                                newState[i] = state[i];
                            }
                        };
                        return newState;
                    }
                };
            } else {
                loggerConfig = {
                    stateTransformer: function(state) {
                        return Immutable.Iterable.isIterable(state) ? state.toJS() : state;
                    }
                };
            }
        }
        var loggerMiddleware = logger.createLogger(loggerConfig);
        middlewares.push(loggerMiddleware);
    }

    return redux.applyMiddleware.apply(redux, middlewares);
}

function createReducers(reducerObject) {
    var isFunc = u.isFunction(reducerObject);
    if (!u.isObject(reducerObject) &&
        !isFunc
    ) {
        throw new Error('Expected reducerObject is an object or function');
    }
    return isFunc ?
        reducerObject :
        redux.combineReducers(reducerObject);
}

/**
 * @param {Object} reducerObject
 * @param {Object} initialState
 * @param {Function|Array} middlewares
 * @param {Object} config config.disableImmutableJS 不使用immutable.js(默认使用不可变数据类型)
 * @return {*}
 */
function createStore(reducerObject, initialState, middlewares, config) {
    config = config || {
        disableImmutableJS: false
    };

    // 是否为开发环境
    var isDev = u.isNull(config.isDev) ? u.isDev() : !!config.isDev;

    // 使用浏览器插件 Redux DevTools Extension：http://extension.remotedev.io/
    var devToolCompose = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__;
    var composeEnhancers = (isDev && devToolCompose) ?
        devToolCompose :
        redux.compose;
    var immuObj, reducerKeys;

    initialState = initialState || {};

    if (u.isMiddlewares(initialState)) {
        initialState = {};
        middlewares = initialState;
        config = middlewares || {};
    }

    var isCombineReducer = u.isObject(reducerObject);
    var reducer = createReducers(reducerObject),
        enhancer = composeEnhancers(addMiddleware(middlewares, isCombineReducer, isDev));

    // 不可变数据类型
    disableImmutableJS = !!config.disableImmutableJS;
    if (!disableImmutableJS) {
        immuObj = Immutable.fromJS(initialState || {});
        if (u.isObject(reducerObject)) {
            reducerKeys = Object.keys(reducerObject);
            reducerKeys.forEach(function(_reducerKey) {
                initialState[_reducerKey] = immuObj.get(_reducerKey) || {};
            });
        } else {
            initialState = immuObj;
        }
    }

    return redux.createStore(
        reducer,
        initialState,
        enhancer
    );
}

module.exports = createStore;