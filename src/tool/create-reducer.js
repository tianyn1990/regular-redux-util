// var Immutable = require('immutable');
var u = require('./util');
var C = require('./constant');

/**
 * @param {Object} reducerFuncMap 可选，reducer.add 就是在向reducerFuncMap里面添加
 * @param {Object} config 可选，暂时没用
 *
 * @return {Function} reducer 符合redux规范的reducer
 *        {Function} reducer.add 为当前reducer添加一个type（或一个type数组）的处理方法
 */
function createReducer(reducerFuncMap/*, config*/) {
    // config = config || {};
    reducerFuncMap = reducerFuncMap || {};

    function reducer(state, action) {
        // 兼容state非immutable对象的情况
        if (!u.isImmutable(state)) {
            state = state || {};
        }
        action = action || {};

        var type = action.type;

        var reducerFn = reducerFuncMap[type];
        if (reducerFn) {
            return reducerFn(state, action);
        }

        return state;
    }

    /**
     * 为当前reducer添加一个type（或一个type数组）的处理方法
     * @param {String|Array} type action.type
     * @param reducerFn 对应的处理函数，参数为：state, action；需要返回一个新的state对象
     */
    reducer.add = function add(type, reducerFn) {
        var typeString = type;
        if (u.isArray(type)) {
            type.forEach(function(_type) {
                add(_type, reducerFn);
            });
            return;
        }
        if (u.isObject(reducerFn)) {
            C.SHORT_SUFFIX_LIST.forEach(function(_suffix) {
                if (u.isFunction(reducerFn[_suffix])) {
                    typeString = u.action2String(type);
                    add(typeString + C.SHORT_SUFFIX_MAP[_suffix], reducerFn[_suffix]);
                }
            });
            return;
        }
        if (!u.isFunction(reducerFn)) {
            throw new Error('Expected reducerFn in reducer to be a function');
        }
        typeString = u.action2String(type);
        reducerFuncMap[typeString] = reducerFn;
    };

    /**
     * 可以在reducer中，直接调用另一个reducer，方便代码的重用
     * @param {*} type 
     * @param {*} state 
     * @param {*} action 
     * 
     * @example
     * reducer.add(factory.changeSku, (state, action) => {
     *     state = reducer.exec(factory.updateTitle, state, {payload: action.payload});
     *     return state;
     * });
     */
    reducer.exec = function(type, state, action) {
        if (!state) {
            throw new Error('Expected state is not null');
        }
        action = action || {
            payload: null
        };
        var typeString = u.action2String(type);
        var f = reducerFuncMap[typeString];
        if(!u.isFunction(f)) {
            throw new Error('funtion not in reducerFuncMap');
        }
        return f(state, action);
    };
    
    return reducer;
}

module.exports = createReducer;